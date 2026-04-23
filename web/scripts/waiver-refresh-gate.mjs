#!/usr/bin/env node
/**
 * GitHub Actions scheduled deploy gate: only "proceed" when a full ingest/build is worth
 * doing — i.e. soon after a gameweek's FPL `waivers_time` (so transactions land in
 * `drops-gw-live` after build-waiver-gw-analytics) or at the daily UTC catch-all.
 *
 * Not invoked for push / workflow_dispatch (the workflow skips this logic there).
 * Data: draft bootstrap-static { events: { data: [{ id, waivers_time }, ...] } }.
 */
import process from 'node:process'

const DRAFT_BOOTSTRAP = 'https://draft.premierleague.com/api/bootstrap-static'
/** FPL usually exposes successful waiver rows a short time after this timestamp */
const WAIVER_GRACE_START_MS = 20 * 60 * 1000
/** Re-run builds at most this long after each `waivers_time` to pick up stragglers */
const WAIVER_FRESH_WINDOW_MS = 36 * 60 * 60 * 1000
/**
 * When the daily cron `30 5 * * *` fires (~05:30 UTC), always allow full refresh
 * (also covers missed windows). Accept a few minutes' drift.
 */
const DAILY_UTC = { startMin: 5 * 60 + 26, endMin: 5 * 60 + 45 } // 05:26–05:45

function minuteOfDayUtc(d) {
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

function inDailyCatchAllWindow() {
  const m = minuteOfDayUtc(new Date())
  return m >= DAILY_UTC.startMin && m <= DAILY_UTC.endMin
}

async function main() {
  if (inDailyCatchAllWindow()) {
    console.log(
      'waiver-refresh-gate: in daily 05:26–05:45 UTC window — run full deploy',
    )
    process.exit(0)
  }

  const r = await fetch(DRAFT_BOOTSTRAP, {
    headers: { Accept: 'application/json' },
  })
  if (!r.ok) {
    console.error(`waiver-refresh-gate: bootstrap HTTP ${r.status} — skip deploy`)
    process.exit(1)
  }
  const j = await r.json()
  const list = j?.events?.data
  if (!Array.isArray(list)) {
    console.error('waiver-refresh-gate: no events.data — skip')
    process.exit(1)
  }

  const now = Date.now()
  for (const e of list) {
    const raw = e?.waivers_time
    if (typeof raw !== 'string' || !raw) continue
    const wt = Date.parse(raw)
    if (!Number.isFinite(wt)) continue
    const start = wt + WAIVER_GRACE_START_MS
    const end = wt + WAIVER_FRESH_WINDOW_MS
    if (now > start && now < end) {
      console.log(
        `waiver-refresh-gate: inside post-waivers window for GW${e.id} (waivers_time ${raw}) — run deploy`,
      )
      process.exit(0)
    }
  }

  console.log(
    'waiver-refresh-gate: not in post-waivers window (or daily window) — skip deploy',
  )
  process.exit(1)
}

main().catch((e) => {
  console.error('waiver-refresh-gate:', e)
  process.exit(1)
})
