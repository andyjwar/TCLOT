#!/usr/bin/env node
/**
 * Weekly recaps (web/public/league-data/weekly-recaps.json), matchup-centric.
 *
 * One entry per finished gameweek:
 *  - `model`: odds vs reality for the week — each pre-match call scored
 *    against the actual result (hits/misses, the biggest upset, avg points
 *    miss when the engine archive has one).
 *  - `matchups`: one card per fixture with both teams' facts (score, rank +
 *    move, record, streak, season avg, title-odds swing), the pre-match call,
 *    the engine's points call when archived, and a template recap paragraph
 *    (result / odds vs reality / table context / fun fact).
 *  - `superlatives`: week high & closest match.
 *
 * Fully regenerated each build from details.json + season-predictions.json —
 * deterministic, so historical recaps never change once a GW is done.
 *
 * Run AFTER build-season-predictions.mjs (odds + model record come from it):
 *   node scripts/build-weekly-recaps.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { recapFactsForGw } from '../src/seasonPredictionsModel.js'
import { matchupRecapSentences } from '../src/weeklyRecapText.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'public/league-data')
const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'))

/* Fail soft: no inputs → no tab, but never a broken deploy. */
let details
let predictions
try {
  details = read('details.json')
  predictions = read('season-predictions.json')
} catch (err) {
  console.warn('build-weekly-recaps: skip —', err.message)
  process.exit(0)
}
if (!predictions?.current?.teams?.length) {
  console.warn('build-weekly-recaps: skip — season-predictions.json has no teams')
  process.exit(0)
}

const matches = details.matches ?? []
const entryIds = predictions.current.teams.map((t) => Number(t.leagueEntryId))
const nameById = new Map(
  predictions.current.teams.map((t) => [Number(t.leagueEntryId), t.name]),
)
const snapshotByGw = new Map(predictions.snapshots.map((s) => [s.asOfGw, s]))
const recordByGw = new Map(
  (predictions.modelRecord?.gameweeks ?? []).map((g) => [g.gw, g]),
)

function titleOddsAt(asOfGw, entryId) {
  const snap = snapshotByGw.get(asOfGw)
  const row = snap?.teams.find((t) => Number(t.leagueEntryId) === Number(entryId))
  return row ? Number(row.titlePct) : null
}

function teamOut(facts, gw) {
  const before = titleOddsAt(gw - 1, facts.entryId)
  const after = titleOddsAt(gw, facts.entryId)
  return {
    entryId: facts.entryId,
    name: facts.name,
    points: facts.points,
    rank: facts.rank,
    prevRank: facts.prevRank,
    record: facts.record,
    streak: facts.streak,
    seasonAvg: facts.seasonAvg,
    isSeasonHigh: facts.isSeasonHigh,
    isWeekHigh: facts.isWeekHigh,
    titleOdds:
      Number.isFinite(before) && Number.isFinite(after) ? { before, after } : null,
  }
}

const lastFinishedGw = matches.reduce(
  (max, m) => (m.finished && Number(m.event) > max ? Number(m.event) : max),
  0,
)

const gameweeks = []
for (let gw = 1; gw <= lastFinishedGw; gw++) {
  const facts = recapFactsForGw(matches, entryIds, nameById, gw)
  if (!facts) continue
  const gwRecord = recordByGw.get(gw)
  const recordRows = new Map(
    (gwRecord?.matches ?? []).map((r) => [`${r.home}-${r.away}`, r]),
  )
  const leagueAvg =
    facts.matches.reduce((s, r) => s + r.homePts + r.awayPts, 0) /
    (facts.matches.length * 2)

  const matchups = facts.matches.map((row) => {
    const home = teamOut(facts.teams.get(row.home), gw)
    const away = teamOut(facts.teams.get(row.away), gw)
    const rec = recordRows.get(`${row.home}-${row.away}`)
    const odds =
      rec && Number.isFinite(rec.homeWinPct) && rec.favorite != null
        ? {
            favoriteSide: rec.favorite === row.home ? 'home' : 'away',
            favoritePct: rec.favorite === row.home ? rec.homeWinPct : rec.awayWinPct,
            source: rec.favoriteSource,
            outcome: rec.outcome,
          }
        : null
    const predicted =
      rec && Number.isFinite(rec.predHome) && Number.isFinite(rec.predAway)
        ? { home: rec.predHome, away: rec.predAway }
        : null
    return {
      home,
      away,
      winner:
        home.points > away.points
          ? home.entryId
          : away.points > home.points
            ? away.entryId
            : null,
      margin: Math.abs(home.points - away.points),
      odds,
      predicted,
      sentences: matchupRecapSentences({ gw, home, away, odds, leagueAvg }),
    }
  })

  // Odds vs reality summary: every decided pre-match call, plus the upset the
  // model rated least likely.
  const calls = matchups
    .filter((m) => m.odds)
    .map((m) => {
      const fav = m.odds.favoriteSide === 'home' ? m.home : m.away
      return {
        homeName: m.home.name,
        awayName: m.away.name,
        favoriteName: fav.name,
        favoritePct: Math.round(m.odds.favoritePct),
        outcome: m.odds.outcome,
      }
    })
  let upset = null
  for (const m of matchups) {
    if (!m.odds || m.odds.outcome !== 'miss' || m.winner == null) continue
    const winnerSide = m.winner === m.home.entryId ? m.home : m.away
    const winnerPct = Math.round(
      100 - (Number.isFinite(m.odds.favoritePct) ? m.odds.favoritePct : 50),
    )
    if (!upset || winnerPct < upset.winnerPct) {
      upset = {
        winnerName: winnerSide.name,
        loserName: (m.winner === m.home.entryId ? m.away : m.home).name,
        winnerPct,
      }
    }
  }

  gameweeks.push({
    gw,
    model: {
      hits: gwRecord?.hits ?? 0,
      misses: gwRecord?.misses ?? 0,
      draws: gwRecord?.draws ?? 0,
      avgAbsErr: gwRecord?.avgAbsErr ?? null,
      upset,
      calls,
    },
    superlatives: {
      weekHigh: facts.superlatives.weekHigh
        ? {
            name: facts.superlatives.weekHigh.name,
            points: facts.superlatives.weekHigh.points,
          }
        : null,
      closest: facts.superlatives.closest
        ? {
            homeName: nameById.get(facts.superlatives.closest.home),
            awayName: nameById.get(facts.superlatives.closest.away),
            margin: facts.superlatives.closest.margin,
          }
        : null,
    },
    matchups,
  })
}

const output = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  season: predictions.season,
  lastFinishedGw,
  gameweeks,
}

writeFileSync(join(dataDir, 'weekly-recaps.json'), JSON.stringify(output, null, 1))
console.log(`weekly-recaps.json written: ${gameweeks.length} gameweek(s)`)
