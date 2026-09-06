#!/usr/bin/env node
/**
 * Per-team leftover bench points: legal best XI vs the official GW total.
 *
 * Reads:  public/league-data/details.json, bootstrap_draft.json
 * Writes: public/league-data/bench-points.json
 *
 * Fetches draft event/live + per-entry picks for every finished H2H gameweek.
 * Fail-soft: never break a deploy. OFFLINE=1 / SKIP_BENCH_POINTS=1 skips.
 *
 * Run after copy-data.js so details.json is the ingested league.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBenchPointsReport } from '../src/benchPoints.js'
import { reconstructWeekSquads } from '../src/benchPointsLocal.js'
import { effectiveXiIds } from '../src/bestXi.js'
import { resolveSeasonFromBootstrap } from '../src/seasonString.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'public/league-data')
const DRAFT_API = 'https://draft.premierleague.com/api'
const UA = 'TCLOT/1.0 (https://tclot.vercel.app; bench points)'
const POS_MAP = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' }

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
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.json()
    } catch (e) {
      lastErr = e
      await sleep(350 * (i + 1))
    }
  }
  throw new Error(`${label}: ${lastErr?.message || 'fetch failed'}`)
}

function finishedGameweeks(matches) {
  const byEv = new Map()
  for (const m of matches ?? []) {
    const ev = Number(m.event)
    if (!Number.isFinite(ev) || ev < 1) continue
    if (!byEv.has(ev)) byEv.set(ev, [])
    byEv.get(ev).push(m)
  }
  const out = []
  for (const [ev, arr] of byEv) {
    if (arr.length && arr.every((x) => x.finished === true)) out.push(ev)
  }
  return out.sort((a, b) => a - b)
}

function livePtsByElement(liveJson) {
  const raw = liveJson?.elements
  const out = {}
  const take = (id, row) => {
    const pts = row?.stats?.total_points
    out[id] = typeof pts === 'number' ? pts : Number(pts) || 0
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      const id = Number(k)
      if (Number.isFinite(id)) take(id, v)
    }
    return out
  }
  if (Array.isArray(raw)) {
    for (const row of raw) {
      const id = Number(row?.id)
      if (Number.isFinite(id)) take(id, row)
    }
  }
  return out
}

function readOptional(name) {
  const p = join(dataDir, name)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function historyH2hForGw(gw) {
  const p = join(dataDir, 'projections-history', `gw-${String(gw).padStart(2, '0')}.json`)
  if (!existsSync(p)) return []
  try {
    const j = JSON.parse(readFileSync(p, 'utf8'))
    return Array.isArray(j?.h2h) ? j.h2h : []
  } catch {
    return []
  }
}

function reconstructWeek(gw, teams, matches, boot) {
  const draftPicks = readOptional('draft_picks.json')
  const transactions = readOptional('transactions.json')
  const tradesDoc = readOptional('trades.json')
  return reconstructWeekSquads({
    gw,
    teams,
    matches,
    boot,
    draftPicks: Array.isArray(draftPicks?.picks) ? draftPicks.picks : [],
    transactions: Array.isArray(transactions?.transactions) ? transactions.transactions : [],
    trades: Array.isArray(tradesDoc?.trades) ? tradesDoc.trades : [],
    historyH2h: historyH2hForGw(gw),
  })
}

function keepExisting(reason) {
  const dest = join(dataDir, 'bench-points.json')
  if (existsSync(dest)) {
    console.warn(`build-bench-points: ${reason} — keeping existing bench-points.json`)
  } else {
    console.warn(`build-bench-points: ${reason} — no existing file to keep`)
  }
}

async function main() {
  if (process.env.OFFLINE === '1' || process.env.SKIP_BENCH_POINTS === '1') {
    console.log('build-bench-points: skip (OFFLINE / SKIP_BENCH_POINTS)')
    return
  }

  let details
  let boot
  try {
    details = read('details.json')
    boot = read('bootstrap_draft.json')
  } catch (err) {
    keepExisting(err.message)
    return
  }

  const entries = details.league_entries || []
  const matches = details.matches || []
  const gws = finishedGameweeks(matches)
  if (!entries.length || !gws.length) {
    const empty = buildBenchPointsReport({
      teams: entries.map((e) => ({
        leagueEntryId: Number(e.id),
        fplEntryId: e.entry_id != null ? Number(e.entry_id) : null,
        teamName: e.entry_name || `Team ${e.id}`,
      })),
      weeks: [],
    })
    const season = resolveSeasonFromBootstrap(boot)
    const out = {
      ...empty,
      generatedAt: new Date().toISOString(),
      season: season?.label ?? season?.string ?? null,
      leagueId: Number(details.league?.id) || null,
    }
    writeFileSync(join(dataDir, 'bench-points.json'), JSON.stringify(out, null, 2))
    console.log('build-bench-points: no finished gameweeks — wrote empty report')
    return
  }

  const elementById = Object.fromEntries(
    (boot.elements || []).map((e) => [Number(e.id), e]),
  )
  const teams = entries.map((e) => ({
    leagueEntryId: Number(e.id),
    fplEntryId: e.entry_id != null ? Number(e.entry_id) : null,
    teamName: e.entry_name || `Team ${e.id}`,
  }))
  const entryByLeagueId = new Map(entries.map((e) => [Number(e.id), e]))

  const weeks = []
  const picksCache = new Map()

  const loadPicks = async (fplEid, gw) => {
    const key = `${fplEid}-${gw}`
    if (!picksCache.has(key)) {
      await sleep(80)
      picksCache.set(
        key,
        fetchJson(`picks ${fplEid} gw${gw}`, `${DRAFT_API}/entry/${fplEid}/event/${gw}`),
      )
    }
    return picksCache.get(key)
  }

  for (const gw of gws) {
    let liveJson
    try {
      liveJson = await fetchJson(`event/live gw${gw}`, `${DRAFT_API}/event/${gw}/live`)
    } catch (e) {
      console.warn(`build-bench-points: GW${gw} live —`, e.message)
      const localSquads = reconstructWeek(gw, teams, matches, boot)
      if (!localSquads) continue
      console.warn(`build-bench-points: GW${gw} using local draft/waiver reconstruction`)
      weeks.push({
        gw,
        squads: localSquads,
        fixtures: matches
          .filter((m) => Number(m.event) === gw && m.finished === true)
          .map((m) => {
            const homeId = Number(m.league_entry_1)
            const awayId = Number(m.league_entry_2)
            return {
              homeId,
              awayId,
              homeName: entryByLeagueId.get(homeId)?.entry_name,
              awayName: entryByLeagueId.get(awayId)?.entry_name,
              homePts: Number(m.league_entry_1_points),
              awayPts: Number(m.league_entry_2_points),
            }
          }),
      })
      continue
    }
    const livePts = livePtsByElement(liveJson)
    const gwMatches = matches.filter((m) => Number(m.event) === gw && m.finished === true)
    const squads = {}

    for (const t of teams) {
      if (t.fplEntryId == null) continue
      let payload
      try {
        payload = await loadPicks(t.fplEntryId, gw)
      } catch (e) {
        console.warn(`build-bench-points: GW${gw} ${t.teamName} —`, e.message)
        continue
      }
      const picks = payload?.picks || []
      const autoSubs = payload?.automatic_subs ?? payload?.subs ?? []
      const players = picks
        .map((p) => {
          const id = Number(p.element)
          if (!Number.isFinite(id) || id <= 0) return null
          const el = elementById[id]
          return {
            id,
            pos: POS_MAP[Number(el?.element_type)] ?? 'MID',
            pts: livePts[id] ?? 0,
            name: el?.web_name ?? String(id),
          }
        })
        .filter(Boolean)
      const fx = gwMatches.find(
        (m) => Number(m.league_entry_1) === t.leagueEntryId || Number(m.league_entry_2) === t.leagueEntryId,
      )
      const actualPts =
        fx == null
          ? null
          : Number(fx.league_entry_1) === t.leagueEntryId
            ? Number(fx.league_entry_1_points)
            : Number(fx.league_entry_2_points)
      if (actualPts == null || !Number.isFinite(actualPts)) continue
      const eh = payload?.entry_history
      squads[t.leagueEntryId] = {
        players,
        actualXiIds: effectiveXiIds(picks, autoSubs),
        actualPts,
        officialBenchPts:
          eh && typeof eh.points_on_bench === 'number' ? eh.points_on_bench : null,
      }
    }

    weeks.push({
      gw,
      squads,
      fixtures: gwMatches.map((m) => {
        const homeId = Number(m.league_entry_1)
        const awayId = Number(m.league_entry_2)
        return {
          homeId,
          awayId,
          homeName: entryByLeagueId.get(homeId)?.entry_name,
          awayName: entryByLeagueId.get(awayId)?.entry_name,
          homePts: Number(m.league_entry_1_points),
          awayPts: Number(m.league_entry_2_points),
        }
      }),
    })
  }

  if (!weeks.length) {
    keepExisting('no gameweeks could be scored')
    return
  }

  const report = buildBenchPointsReport({ teams, weeks })
  const season = resolveSeasonFromBootstrap(boot)
  const out = {
    ...report,
    generatedAt: new Date().toISOString(),
    season: season?.label ?? season?.string ?? null,
    leagueId: Number(details.league?.id) || null,
  }
  writeFileSync(join(dataDir, 'bench-points.json'), `${JSON.stringify(out, null, 2)}\n`)
  const worst = report.teams[0]
  console.log(
    `build-bench-points: ${report.gameweeks.length} GW(s), ${report.teams.length} teams` +
      (worst
        ? ` — most left on bench: ${worst.teamName} (${worst.benchLeft})`
        : ''),
  )
}

main().catch((e) => {
  console.error('build-bench-points FAILED:', e)
  keepExisting(e?.message || 'fatal')
})
