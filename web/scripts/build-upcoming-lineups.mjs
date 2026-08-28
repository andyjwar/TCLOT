#!/usr/bin/env node
/**
 * Snapshot the upcoming GW's selected starting XIs for the Recap look-forward.
 *
 * Only runs after that GW's FPL lineup deadline. Before lock, Draft still
 * serves last week's XI as the default 11 — that is not "lineups are set".
 *
 * Prefers live draft picks (`/entry/{id}/event/{gw}`). When that fetch fails
 * (offline, egress, empty payload), copies last week's archived XI forward and
 * treats leftover owned players as the bench — the same default FPL Draft uses
 * until a manager edits the new week.
 *
 * Writes: public/league-data/gw-lineups/gw-NN.json
 *
 * Run before build-weekly-recaps.mjs. Fail-soft: never break a deploy.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDraftPicks, hasFullXi, lineupFromPriorXi } from '../src/weeklyPreviewLineup.js'
import { archivedXi } from '../src/seasonPredictionsModel.js'
import { gwDeadlineHasPassed } from '../src/weeklyRecapView.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'public/league-data')
const DRAFT_API = 'https://draft.premierleague.com/api'
const UA = 'TCLOT/1.0 (https://tclot.vercel.app; weekly recap XI snapshot)'

function read(name) {
  return JSON.parse(readFileSync(join(dataDir, name), 'utf8'))
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchJson(label, url, attempts = 3) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.json()
    } catch (e) {
      lastErr = e
      await sleep(350 * (i + 1))
    }
  }
  throw new Error(`${label}: ${lastErr?.message || 'fetch failed'}`)
}

function lastFinishedGw(matches) {
  const byEv = new Map()
  for (const m of matches ?? []) {
    const ev = Number(m.event)
    if (!Number.isFinite(ev) || ev < 1) continue
    if (!byEv.has(ev)) byEv.set(ev, [])
    byEv.get(ev).push(m)
  }
  const finished = []
  for (const [ev, arr] of byEv) {
    if (arr.length && arr.every((x) => x.finished === true)) finished.push(ev)
  }
  return finished.length ? Math.max(...finished) : 0
}

function upcomingGw(matches, lastDone) {
  const unfinished = (matches ?? [])
    .map((m) => Number(m.event))
    .filter((ev) => Number.isFinite(ev) && ev > lastDone)
  return unfinished.length ? Math.min(...unfinished) : null
}

function loadHistory(gw) {
  const p = join(dataDir, 'projections-history', `gw-${String(gw).padStart(2, '0')}.json`)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function ownedByLeagueId(details, elementStatus) {
  const leagueByFpl = new Map(
    (details.league_entries ?? []).map((e) => [Number(e.entry_id), Number(e.id)]),
  )
  const owned = new Map()
  for (const row of elementStatus?.element_status ?? []) {
    const leagueId = leagueByFpl.get(Number(row.owner))
    if (!Number.isFinite(leagueId)) continue
    if (!owned.has(leagueId)) owned.set(leagueId, [])
    owned.get(leagueId).push(Number(row.element))
  }
  return owned
}

function priorXiFor(history, leagueId) {
  if (!history) return null
  for (const row of history.h2h ?? []) {
    if (Number(row.league_entry_1) === leagueId || Number(row.league_entry_2) === leagueId) {
      return archivedXi(row, leagueId)
    }
  }
  return null
}

async function main() {
  if (process.env.OFFLINE === '1' || process.env.SKIP_UPCOMING_LINEUPS === '1') {
    console.log('build-upcoming-lineups: skip (OFFLINE / SKIP_UPCOMING_LINEUPS)')
    return
  }

  let details
  try {
    details = read('details.json')
  } catch (err) {
    console.warn('build-upcoming-lineups: skip —', err.message)
    return
  }

  const matches = details.matches ?? []
  const lastDone = lastFinishedGw(matches)
  const gw = upcomingGw(matches, lastDone)
  if (!Number.isFinite(gw)) {
    console.log('build-upcoming-lineups: skip — no upcoming gameweek')
    return
  }

  let bootstrap = null
  try {
    bootstrap = read('bootstrap_draft.json')
  } catch {
    /* deadline unknown */
  }
  if (!gwDeadlineHasPassed(bootstrap, gw)) {
    console.log(`build-upcoming-lineups: skip — GW${gw} lineup deadline has not passed`)
    return
  }

  const entries = details.league_entries ?? []
  let elementStatus = null
  try {
    elementStatus = read('element_status.json')
  } catch {
    /* owned fallback empty */
  }
  const owned = ownedByLeagueId(details, elementStatus)
  const prevHistory = lastDone > 0 ? loadHistory(lastDone) : null

  const skipFetch = process.env.SKIP_LINEUP_FETCH === '1'
  const teams = []
  let fromApi = 0
  let fromPrior = 0

  for (const e of entries) {
    const leagueEntryId = Number(e.id)
    const fplEntryId = Number(e.entry_id)
    let parsed = null
    if (!skipFetch && Number.isFinite(fplEntryId)) {
      try {
        const payload = await fetchJson(
          `picks ${fplEntryId} gw${gw}`,
          `${DRAFT_API}/entry/${fplEntryId}/event/${gw}`,
        )
        parsed = parseDraftPicks(payload)
        await sleep(120)
      } catch (err) {
        console.warn(`build-upcoming-lineups: ${e.entry_name ?? fplEntryId} — ${err.message}`)
      }
    }

    if (hasFullXi(parsed)) {
      teams.push({
        leagueEntryId,
        fplEntryId,
        starters: parsed.starters,
        bench: parsed.bench,
        source: 'draft-api',
      })
      fromApi += 1
      continue
    }

    const fallback = lineupFromPriorXi({
      leagueEntryId,
      fplEntryId,
      priorXi: priorXiFor(prevHistory, leagueEntryId),
      ownedIds: owned.get(leagueEntryId) ?? [],
    })
    if (fallback.starters.length === 11) {
      teams.push(fallback)
      fromPrior += 1
    }
  }

  if (!teams.length) {
    console.warn('build-upcoming-lineups: no XIs resolved — recap will skip lineup-based copy')
    return
  }

  const outDir = join(dataDir, 'gw-lineups')
  mkdirSync(outDir, { recursive: true })
  const fileSource = fromApi && fromPrior ? 'mixed' : fromApi ? 'draft-api' : 'prior-xi'
  const out = {
    schemaVersion: 1,
    gw,
    generatedAt: new Date().toISOString(),
    source: fileSource,
    teams,
  }
  const dest = join(outDir, `gw-${String(gw).padStart(2, '0')}.json`)
  writeFileSync(dest, JSON.stringify(out, null, 2))
  console.log(
    `build-upcoming-lineups: GW${gw} → ${teams.length} team(s) (${fromApi} api, ${fromPrior} prior-xi) → ${dest.split('/').pop()}`,
  )
}

main().catch((err) => {
  console.warn('build-upcoming-lineups: failed —', err.message)
  process.exit(0)
})
