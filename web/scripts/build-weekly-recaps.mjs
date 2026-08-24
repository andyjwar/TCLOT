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
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  recapFactsForGw,
  findArchivedH2hRow,
  archivedXi,
  sidePlayerFacts,
  h2hSeriesAsOf,
} from '../src/seasonPredictionsModel.js'
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

/* Manager (human) names + the FPL entry-id bridge. details.json league_entries
 * carry both the league id (`id`) and the FPL entry id (`entry_id`) plus the
 * manager's name — transactions key off the FPL entry id, recaps off the
 * league id, so we need the map in both directions. */
const leagueEntries = details.league_entries ?? []
const managerById = new Map()
const leagueIdByFplEntry = new Map()
for (const e of leagueEntries) {
  const leagueId = Number(e.id)
  const fplEntry = Number(e.entry_id)
  const first = (e.player_first_name ?? '').trim()
  const last = (e.player_last_name ?? '').trim()
  const manager = [first, last].filter(Boolean).join(' ') || null
  if (Number.isFinite(leagueId)) managerById.set(leagueId, manager)
  if (Number.isFinite(fplEntry) && Number.isFinite(leagueId)) {
    leagueIdByFplEntry.set(fplEntry, leagueId)
  }
}

/* Successful waiver ('w') / free-agent ('f') pickups, grouped by league id.
 * Each entry records the element added, the GW it landed, and the channel so
 * the recap can say "waiver pickup" vs "free-agent punt". Fail soft: no file
 * or an empty list just means no pickup storylines. */
function loadAcquisitions() {
  let raw
  try {
    raw = read('transactions.json')
  } catch {
    return new Map()
  }
  const txs = Array.isArray(raw?.transactions) ? raw.transactions : []
  const byLeagueId = new Map()
  for (const tx of txs) {
    if (tx.result !== 'a') continue
    const elementIn = tx.element_in == null ? null : Number(tx.element_in)
    if (!Number.isFinite(elementIn)) continue
    const leagueId = leagueIdByFplEntry.get(Number(tx.entry))
    if (!Number.isFinite(leagueId)) continue
    if (!byLeagueId.has(leagueId)) byLeagueId.set(leagueId, [])
    byLeagueId.get(leagueId).push({
      elementIn,
      gw: Number(tx.event) || 0,
      kind: tx.kind === 'f' ? 'f' : 'w',
    })
  }
  return byLeagueId
}
const acquisitionsByLeagueId = loadAcquisitions()

/** The most relevant acquisition for `elementId` on `leagueId` at or before
 * `gw` — latest landing wins (a re-add resets the "recent" clock). Null when
 * the player wasn't picked up off waivers/free agency (e.g. drafted). */
function acquisitionFor(leagueId, elementId, gw) {
  if (elementId == null) return null
  const list = acquisitionsByLeagueId.get(Number(leagueId))
  if (!list) return null
  let best = null
  for (const a of list) {
    if (a.elementIn !== Number(elementId) || a.gw > gw) continue
    if (!best || a.gw > best.gw) best = a
  }
  return best
}

/** Pickup storyline for one side: does its standout (haul/top) or its flop
 * trace back to a waiver/free-agent move? `recent` flags a move made this GW
 * or the one before, when the decision is freshest. */
function sidePickupFacts(side, gw) {
  const players = side.players
  if (!players) return null
  const out = {}
  const star = players.haul ?? players.top
  if (star && star.id != null) {
    const acq = acquisitionFor(side.entryId, star.id, gw)
    if (acq) {
      out.star = {
        name: star.name,
        pts: star.pts,
        kind: acq.kind,
        gw: acq.gw,
        recent: gw - acq.gw <= 1,
        wasHaul: players.haul != null && players.haul.id === star.id,
      }
    }
  }
  if (players.flop && players.flop.id != null) {
    const acq = acquisitionFor(side.entryId, players.flop.id, gw)
    if (acq) {
      out.flop = {
        name: players.flop.name,
        pts: players.flop.pts,
        xp: players.flop.xp,
        kind: acq.kind,
        gw: acq.gw,
        recent: gw - acq.gw <= 1,
      }
    }
  }
  return out.star || out.flop ? out : null
}
const snapshotByGw = new Map(predictions.snapshots.map((s) => [s.asOfGw, s]))
const recordByGw = new Map(
  (predictions.modelRecord?.gameweeks ?? []).map((g) => [g.gw, g]),
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
    manager: managerById.get(facts.entryId) ?? null,
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
  const history = loadHistory(gw)
  const recordRows = new Map(
    (gwRecord?.matches ?? []).map((r) => [`${r.home}-${r.away}`, r]),
  )
  const leagueAvg =
    facts.matches.reduce((s, r) => s + r.homePts + r.awayPts, 0) /
    (facts.matches.length * 2)

  const matchups = facts.matches.map((row) => {
    const home = teamOut(facts.teams.get(row.home), gw)
    const away = teamOut(facts.teams.get(row.away), gw)
    const archRow = findArchivedH2hRow(history, row.home, row.away)
    home.players = sidePlayerFacts(archivedXi(archRow, row.home))
    away.players = sidePlayerFacts(archivedXi(archRow, row.away))
    home.pickup = sidePickupFacts(home, gw)
    away.pickup = sidePickupFacts(away, gw)
    const series = h2hSeriesAsOf(matches, row.home, row.away, gw)
    const h2h = series
      ? {
          games: series.games,
          homeWins: series.aWins,
          awayWins: series.bWins,
          draws: series.draws,
        }
      : null
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
      h2h,
      sentences: matchupRecapSentences({ gw, home, away, odds, leagueAvg, h2h }),
    }
  })

  // Star of the week: the top player score across every archived XI.
  let starPlayer = null
  for (const m of matchups) {
    for (const side of [m.home, m.away]) {
      const top = side.players?.top
      if (top && (!starPlayer || top.pts > starPlayer.pts)) {
        starPlayer = { name: top.name, pts: top.pts, teamName: side.name }
      }
    }
  }

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
      starPlayer,
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
