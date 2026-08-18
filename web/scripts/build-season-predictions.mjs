#!/usr/bin/env node
/**
 * Living season predictions (web/public/league-data/season-predictions.json).
 *
 * Rebuilt in full every run — the deploy pipeline never commits state back,
 * so all history must be reconstructible from committed/fetched inputs:
 *
 *  - Priors: season-preview.json (draft-based weekly mu/sigma per team).
 *  - Results: details.json matches (every finished GW's actual scores).
 *  - Weekly engine forecasts: projections-history/gw-NN.json archives
 *    (rebuilt by build-projections-history.mjs), used for the model record's
 *    matchup favorites + score errors so they match the live win bars.
 *
 * For each asOfGw 0..lastFinished: strengths are the draft prior updated by
 * the weekly scores seen so far (prior worth ~6 games), banked results stand,
 * and every later match is simulated (2000 runs, seeded per snapshot so
 * output is stable across rebuilds).
 *
 * Run after build-projections-history + build-season-preview inputs exist:
 *   node scripts/build-season-predictions.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  teamWeeklyScores,
  updatedStrength,
  simulateSeasonAsOf,
  ranksAsOf,
  matchFavorite,
  findArchivedH2hRow,
  archivedScoreError,
} from '../src/seasonPredictionsModel.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'public/league-data')
const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'))

/* Fail soft: forks / other leagues may lack a season-preview.json, and a
 * broken deploy is worse than a missing tab (the UI shows "unavailable"). */
let preview
let details
try {
  preview = read('season-preview.json')
  details = read('details.json')
} catch (err) {
  console.warn('build-season-predictions: skip —', err.message)
  process.exit(0)
}
const leagueEntryIds = new Set(
  (details.league_entries ?? []).map((e) => Number(e.id)),
)
if (
  !Array.isArray(preview?.teams) ||
  preview.teams.length === 0 ||
  !preview.teams.every((t) => leagueEntryIds.has(Number(t.leagueEntryId)))
) {
  console.warn(
    'build-season-predictions: skip — season-preview.json does not match details.json league entries',
  )
  process.exit(0)
}

const matches = details.matches ?? []
const entryIds = preview.teams.map((t) => Number(t.leagueEntryId))
const nameById = new Map(preview.teams.map((t) => [Number(t.leagueEntryId), t.name]))
const priors = new Map(
  preview.teams.map((t) => [
    Number(t.leagueEntryId),
    { mu: Number(t.weeklyProjection), sigma: Number(t.weeklySigma) || 11 },
  ]),
)

const lastFinishedGw = matches.reduce(
  (max, m) => (m.finished && Number(m.event) > max ? Number(m.event) : max),
  0,
)

function loadHistory(gw) {
  const p = join(dataDir, 'projections-history', `gw-${String(gw).padStart(2, '0')}.json`)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function strengthsAsOf(gw) {
  const m = new Map()
  for (const id of entryIds) {
    m.set(id, updatedStrength(priors.get(id), teamWeeklyScores(matches, id, gw)))
  }
  return m
}

/* ---- snapshots: what the model said as of each finished GW ---- */
const snapshots = []

// GW0 copies the preview's sim verbatim so the pre-season Preview page and
// the predictions tab always quote identical numbers.
snapshots.push({
  asOfGw: 0,
  teams: preview.teams
    .map((t) => ({
      leagueEntryId: Number(t.leagueEntryId),
      name: t.name,
      titlePct: t.sim.titlePct,
      topHalfPct: t.sim.topHalfPct,
      lastPct: t.sim.lastPct,
      avgFinish: t.sim.avgFinish,
      projPts: t.sim.avgPts,
      projPf: t.sim.avgPf,
      strength: t.weeklyProjection,
      banked: { pts: 0, w: 0, d: 0, l: 0, pf: 0, played: 0, rank: null },
    }))
    .sort((a, b) => a.avgFinish - b.avgFinish),
})

for (let asOf = 1; asOf <= lastFinishedGw; asOf++) {
  const strengths = strengthsAsOf(asOf)
  const sim = simulateSeasonAsOf({
    matches,
    entryIds,
    throughGw: asOf,
    strengths,
    sims: 5000,
    seed: 20262027 + asOf,
  })
  const ranks = ranksAsOf(matches, entryIds, asOf)
  snapshots.push({
    asOfGw: asOf,
    teams: entryIds
      .map((id) => {
        const s = sim.get(id)
        return {
          leagueEntryId: id,
          name: nameById.get(id),
          titlePct: s.titlePct,
          topHalfPct: s.topHalfPct,
          lastPct: s.lastPct,
          avgFinish: s.avgFinish,
          projPts: s.projPts,
          projPf: s.projPf,
          strength: +strengths.get(id).mu.toFixed(1),
          banked: {
            pts: s.banked.pts,
            w: s.banked.w,
            d: s.banked.d,
            l: s.banked.l,
            pf: s.banked.pf,
            played: s.banked.played,
            rank: ranks.get(id),
          },
        }
      })
      .sort((a, b) => a.avgFinish - b.avgFinish),
  })
}

/* ---- model record: favorites + score error per finished GW ---- */
const record = { gameweeks: [], hits: 0, misses: 0, draws: 0 }
let errSum = 0
let errCount = 0
let biggestMiss = null
for (let gw = 1; gw <= lastFinishedGw; gw++) {
  const gwMatches = matches.filter((m) => Number(m.event) === gw && m.finished)
  if (gwMatches.length === 0) continue
  const history = loadHistory(gw)
  // Favorites come from what was knowable BEFORE the GW: engine archive if
  // present, else strengths updated only through gw-1.
  const preStrengths = strengthsAsOf(gw - 1)
  const rows = []
  let hits = 0
  let misses = 0
  let draws = 0
  for (const m of gwMatches) {
    const h = Number(m.league_entry_1)
    const a = Number(m.league_entry_2)
    const hp = Number(m.league_entry_1_points) || 0
    const ap = Number(m.league_entry_2_points) || 0
    const { favorite, source } = matchFavorite(m, history, preStrengths)
    const actual = hp > ap ? h : ap > hp ? a : null
    let outcome
    if (actual == null) {
      outcome = 'draw'
      draws++
    } else if (favorite == null) {
      outcome = 'nocall'
    } else if (favorite === actual) {
      outcome = 'hit'
      hits++
    } else {
      outcome = 'miss'
      misses++
    }
    const archRow = findArchivedH2hRow(history, h, a)
    for (const id of [h, a]) {
      const e = archivedScoreError(archRow, id)
      if (e) {
        errSum += e.absErr
        errCount++
        if (!biggestMiss || e.absErr > biggestMiss.absErr) {
          biggestMiss = { gw, teamName: nameById.get(id), ...e }
        }
      }
    }
    rows.push({
      home: h,
      away: a,
      homePts: hp,
      awayPts: ap,
      favorite,
      favoriteSource: source,
      outcome,
    })
  }
  record.hits += hits
  record.misses += misses
  record.draws += draws
  record.gameweeks.push({ gw, hits, misses, draws, matches: rows })
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  season: preview.season,
  asOfGw: lastFinishedGw,
  method: {
    prior: 'season-preview draft model (worth ~6 games)',
    update: 'strength re-weighted toward actual weekly scores as games accumulate',
    simulations: 2000,
    favorites: 'weekly engine archive when available, strength model otherwise',
  },
  current: snapshots[snapshots.length - 1],
  snapshots,
  modelRecord: {
    ...record,
    avgAbsErr: errCount > 0 ? +(errSum / errCount).toFixed(1) : null,
    scoredTeamWeeks: errCount,
    biggestMiss,
  },
}

writeFileSync(join(dataDir, 'season-predictions.json'), JSON.stringify(output, null, 1))
console.log(
  `season-predictions.json written: asOfGw=${lastFinishedGw}, snapshots=${snapshots.length}, record=${record.hits}-${record.misses}${record.draws ? ` (${record.draws} draws)` : ''}`,
)
