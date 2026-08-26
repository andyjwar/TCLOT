#!/usr/bin/env node
/**
 * Bookie market sheet (web/public/league-data/bookie-markets.json).
 *
 * Prices the fake-money betting markets from the same model that drives the
 * Season Predictions tab — no external odds feed:
 *
 *  - Weekly H2H (home / draw / away) for the next gameweek whose deadline is
 *    still in the future: each matchup is Monte Carlo'd from the two sides'
 *    strength estimates (draft prior updated by xP-blended weekly scores —
 *    identical machinery to build-season-predictions.mjs).
 *  - Outright / Titan / Minnow / last place: taken from season-predictions.json
 *    titlePct, topHalfPct (top 4), 100−topHalfPct (bottom 4), and lastPct.
 *  - Player specials per matchup — "anytime goalscorer" (from each pooled
 *    player's forecast goalLikelihood in predictions.json) and "top point
 *    scorer" (Monte Carlo over each player's forecast percentiles). Only
 *    printed when predictions.json targets the same gameweek as the weekly
 *    board — mid-gameweek deploys still forecast the running GW, so the
 *    player boards open on the first deploy after the previous GW banks.
 *
 * Decimal odds carry a bookmaker overround (the book is intentionally not
 * fair — that's half the fun): ~105% on the 3-way weekly markets, ~110% on
 * the 8-runner outright. Prices are then snapped to the traditional
 * fractional ladder, so every quote reads like a real board ("6/4", "11/2").
 *
 * The Cloudflare bookie Worker (web/workers/bookie/) ingests this file from
 * the deployed site to open markets in D1; bets lock the odds at bet time,
 * so a later rebuild repricing this sheet never rewrites an existing ticket.
 *
 * Run after build-season-predictions.mjs:
 *   node scripts/build-bookie-markets.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  makeRng,
  teamWeeklyScores,
  updatedStrength,
  STRENGTH_PRIOR_WEIGHT,
  blendedWeeklyScoresByEntry,
} from '../src/seasonPredictionsModel.js'
import { snapDecimalOdds } from '../src/oddsFormat.js'
import { anytimeScorerProb, topPointsWinProbs } from '../src/bookiePlayerMarkets.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'public/league-data')
const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'))

/** Overround (total implied probability) per market type. */
const H2H_OVERROUND = 1.05
const OUTRIGHT_OVERROUND = 1.1
const H2H_SIMS = 20000
/* Player specials: scorer margin applies per yes/no selection; top point
 * scorer is a many-runner board like the outright. Prices cap at 200/1 so
 * the bottom of a 30-man board still reads like a bookie sheet. */
const SCORER_OVERROUND = 1.08
const TOPPOINTS_OVERROUND = 1.1
const TOPPOINTS_SIMS = 10000
const PLAYER_MAX_ODDS = 201

/* Fail soft: forks / other leagues may lack the model inputs, and a broken
 * deploy is worse than a missing bookie sheet (the Worker just keeps the
 * previous markets). */
let details
let preview
let bootstrap
try {
  details = read('details.json')
  preview = read('season-preview.json')
  bootstrap = read('bootstrap_draft.json')
} catch (err) {
  console.warn('build-bookie-markets: skip —', err.message)
  process.exit(0)
}

let seasonPredictions = null
try {
  seasonPredictions = read('season-predictions.json')
} catch {
  /* pre-GW1 the outright prices fall back to the preview sim below */
}

const matches = details.matches ?? []
const entryIds = (details.league_entries ?? []).map((e) => Number(e.id))
const nameById = new Map(
  (details.league_entries ?? []).map((e) => [Number(e.id), e.entry_name]),
)
if (entryIds.length === 0) {
  console.warn('build-bookie-markets: skip — no league entries')
  process.exit(0)
}

const priorByEntry = new Map(
  (preview.teams ?? []).map((t) => [
    Number(t.leagueEntryId),
    { mu: Number(t.weeklyProjection), sigma: Number(t.weeklySigma) || 11 },
  ]),
)
if (!entryIds.every((id) => priorByEntry.has(id))) {
  console.warn('build-bookie-markets: skip — season-preview priors do not cover league entries')
  process.exit(0)
}

const season = seasonPredictions?.season ?? preview.season ?? null
const lastFinishedGw = matches.reduce(
  (max, m) => (m.finished && Number(m.event) > max ? Number(m.event) : max),
  0,
)

/* ---- strengths as of the last banked GW (same recipe as season predictions) ---- */
const historyByGw = new Map()
for (let gw = 1; gw <= lastFinishedGw; gw++) {
  const p = join(dataDir, 'projections-history', `gw-${String(gw).padStart(2, '0')}.json`)
  if (!existsSync(p)) continue
  try {
    historyByGw.set(gw, JSON.parse(readFileSync(p, 'utf8')))
  } catch {
    /* ignore an unreadable archive week */
  }
}
const blended = blendedWeeklyScoresByEntry(matches, entryIds, lastFinishedGw, historyByGw, 0.7)
const strengths = new Map()
for (const id of entryIds) {
  const actuals = teamWeeklyScores(matches, id, lastFinishedGw)
  strengths.set(
    id,
    updatedStrength(priorByEntry.get(id), actuals, STRENGTH_PRIOR_WEIGHT, blended.get(id)),
  )
}

function gaussFrom(rng) {
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * Monte Carlo home/draw/away probabilities for one H2H matchup: each
 * iteration re-draws both sides' "true" strength around its estimate (se)
 * then samples a rounded weekly score (sigma) — the exact score generator
 * `simulateSeasonAsOf` uses, so a matchup's price here matches its share of
 * the season sim.
 */
function h2hProbs(homeId, awayId, seed) {
  const h = strengths.get(homeId)
  const a = strengths.get(awayId)
  const rng = makeRng(seed)
  let hw = 0
  let dr = 0
  for (let i = 0; i < H2H_SIMS; i++) {
    const muH = h.mu + (h.se ?? 0) * gaussFrom(rng)
    const muA = a.mu + (a.se ?? 0) * gaussFrom(rng)
    const sh = Math.max(0, Math.round(muH + h.sigma * gaussFrom(rng)))
    const sa = Math.max(0, Math.round(muA + a.sigma * gaussFrom(rng)))
    if (sh > sa) hw++
    else if (sh === sa) dr++
  }
  return {
    home: hw / H2H_SIMS,
    draw: dr / H2H_SIMS,
    away: (H2H_SIMS - hw - dr) / H2H_SIMS,
  }
}

/**
 * Decimal odds for a probability under a market-wide overround, snapped to
 * the traditional fractional ladder (oddsFormat.js) so the board quotes real
 * bookie prices — "6/4", "11/2" — and the UI's fractional display is exact.
 */
function decimalOdds(prob, overround, { minProb = 0.005, maxOdds = 500 } = {}) {
  const p = Math.max(minProb, Math.min(0.995, Number(prob) || 0))
  const dec = 1 / (p * overround)
  return snapDecimalOdds(Math.min(maxOdds, Math.max(1.01, dec)))
}

/* ---- weekly market: first gameweek whose deadline is still ahead ---- */
const events = Array.isArray(bootstrap?.events?.data) ? bootstrap.events.data : []
const now = Date.now()
const nextEvent = events.find((e) => {
  const t = Date.parse(e?.deadline_time ?? '')
  return Number.isFinite(t) && t > now
})

let weekly = null
if (nextEvent) {
  const gw = Number(nextEvent.id)
  const gwMatches = matches.filter((m) => Number(m.event) === gw)
  const rows = []
  for (const m of gwMatches) {
    const homeId = Number(m.league_entry_1)
    const awayId = Number(m.league_entry_2)
    if (!strengths.has(homeId) || !strengths.has(awayId)) continue
    const probs = h2hProbs(homeId, awayId, 47_000 + gw * 101 + homeId)
    rows.push({
      key: `gw${gw}:${homeId}-${awayId}`,
      gw,
      homeEntryId: homeId,
      awayEntryId: awayId,
      homeName: nameById.get(homeId) ?? String(homeId),
      awayName: nameById.get(awayId) ?? String(awayId),
      probs: {
        home: +probs.home.toFixed(4),
        draw: +probs.draw.toFixed(4),
        away: +probs.away.toFixed(4),
      },
      odds: {
        home: decimalOdds(probs.home, H2H_OVERROUND),
        draw: decimalOdds(probs.draw, H2H_OVERROUND),
        away: decimalOdds(probs.away, H2H_OVERROUND),
      },
    })
  }
  if (rows.length > 0) {
    weekly = { gw, deadline: nextEvent.deadline_time, matches: rows }
  }
}

/* ---- player specials: anytime scorer + top point scorer per matchup ---- */
let players = null
if (weekly) {
  let predictions = null
  let elementStatus = null
  try {
    predictions = read('predictions.json')
    elementStatus = read('element_status.json')
  } catch (err) {
    console.warn('build-bookie-markets: player markets skipped —', err.message)
  }
  const predGw = Number(predictions?.gameweek)
  if (predictions && elementStatus && predGw !== weekly.gw) {
    console.warn(
      `build-bookie-markets: player markets skipped — predictions target GW${predGw}, weekly board is GW${weekly.gw}`,
    )
  } else if (predictions && elementStatus) {
    // element_status.owner is the FPL *entry* id; markets key on league_entry ids.
    const leagueEntryByEntry = new Map(
      (details.league_entries ?? []).map((e) => [Number(e.entry_id), Number(e.id)]),
    )
    const ownedByLeagueEntry = new Map()
    for (const row of elementStatus.element_status ?? []) {
      const owner = leagueEntryByEntry.get(Number(row.owner))
      if (owner == null) continue
      if (!ownedByLeagueEntry.has(owner)) ownedByLeagueEntry.set(owner, [])
      ownedByLeagueEntry.get(owner).push(Number(row.element))
    }
    const predById = new Map((predictions.players ?? []).map((p) => [Number(p.id), p]))
    const webNameById = new Map(
      (Array.isArray(bootstrap?.elements) ? bootstrap.elements : []).map((e) => [
        Number(e.id),
        e.web_name,
      ]),
    )

    /* A squad's priceable players: those with a forecast row that projects
     * any football at all (p90 > 0). No forecast → no price → off the board. */
    const poolFor = (leagueEntryId) =>
      (ownedByLeagueEntry.get(leagueEntryId) ?? [])
        .map((elementId) => {
          const pred = predById.get(elementId)
          const pct = pred?.forecast?.percentiles
          if (!pred || !(Number(pct?.p90) > 0)) return null
          return {
            elementId,
            name: webNameById.get(elementId) ?? pred.name ?? String(elementId),
            club: pred.teamShortName ?? '',
            position: pred.position ?? '',
            ownerEntryId: leagueEntryId,
            goalProb: Number(pred.forecast?.probabilities?.goalLikelihood) || 0,
            percentiles: pct,
          }
        })
        .filter(Boolean)

    const selectionBase = (p, prob, overround, minProb) => ({
      elementId: p.elementId,
      name: p.name,
      club: p.club,
      position: p.position,
      ownerEntryId: p.ownerEntryId,
      prob: +prob.toFixed(4),
      odds: decimalOdds(prob, overround, { minProb, maxOdds: PLAYER_MAX_ODDS }),
    })

    const playerRows = []
    for (const row of weekly.matches) {
      const pool = [...poolFor(row.homeEntryId), ...poolFor(row.awayEntryId)]
      if (pool.length < 4) continue
      const matchupOf = (kind) => ({
        key: `gw${weekly.gw}:${kind}:${row.homeEntryId}-${row.awayEntryId}`,
        kind,
        gw: weekly.gw,
        homeEntryId: row.homeEntryId,
        awayEntryId: row.awayEntryId,
        homeName: row.homeName,
        awayName: row.awayName,
      })

      // Anytime goalscorer: outfielders only (bookie convention — no keepers).
      const scorerSelections = pool
        .filter((p) => p.position !== 'GK' && p.position !== 'GKP')
        .map((p) => selectionBase(p, anytimeScorerProb(p.goalProb), SCORER_OVERROUND, 0.005))
        .sort((a, b) => b.prob - a.prob)
      if (scorerSelections.length >= 4) {
        playerRows.push({ ...matchupOf('scorer'), selections: scorerSelections })
      }

      // Top point scorer of the pool: keepers included, ties all pay.
      const winProbs = topPointsWinProbs(pool, {
        sims: TOPPOINTS_SIMS,
        seed: 91_000 + weekly.gw * 101 + row.homeEntryId,
      })
      const topSelections = pool
        .map((p) =>
          selectionBase(p, winProbs.get(p.elementId) ?? 0, TOPPOINTS_OVERROUND, 0.002),
        )
        .sort((a, b) => b.prob - a.prob)
      if (topSelections.length >= 4) {
        playerRows.push({ ...matchupOf('toppoints'), selections: topSelections })
      }
    }
    if (playerRows.length > 0) {
      players = { gw: weekly.gw, deadline: weekly.deadline, markets: playerRows }
    }
  }
}

/* ---- season-long: champion, titan (top 4), minnow (bottom 4), last ---- */
const finalEvent = events.length > 0 ? events[events.length - 1] : null
const placeTeams =
  seasonPredictions?.current?.teams ??
  (preview.teams ?? []).map((t) => ({
    leagueEntryId: Number(t.leagueEntryId),
    name: t.name,
    titlePct: t.sim?.titlePct,
    topHalfPct: t.sim?.topHalfPct,
    lastPct: t.sim?.lastPct,
  }))

function placeSelections(pctOf) {
  return placeTeams
    .map((t) => {
      const pct = Number(pctOf(t)) || 0
      return {
        entryId: Number(t.leagueEntryId),
        name: t.name,
        pct,
        titlePct: pct,
        odds: decimalOdds(pct / 100, OUTRIGHT_OVERROUND, { minProb: 0.002 }),
      }
    })
    .sort((a, b) => b.pct - a.pct)
}

const asOfGw = seasonPredictions?.asOfGw ?? 0
const closesAt = finalEvent?.deadline_time ?? null
const outright = {
  key: `outright:${season ?? 'season'}`,
  asOfGw,
  closesAt,
  selections: placeSelections((t) => t.titlePct),
}
const titan = {
  key: `titan:${season ?? 'season'}`,
  asOfGw,
  closesAt,
  selections: placeSelections((t) => t.topHalfPct ?? t.titlePct),
}
const minnow = {
  key: `minnow:${season ?? 'season'}`,
  asOfGw,
  closesAt,
  selections: placeSelections((t) => {
    const top = Number(t.topHalfPct)
    if (Number.isFinite(top)) return Math.max(0, +(100 - top).toFixed(1))
    return t.lastPct
  }),
}
const last = {
  key: `last:${season ?? 'season'}`,
  asOfGw,
  closesAt,
  selections: placeSelections((t) => t.lastPct),
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  season,
  asOfGw: lastFinishedGw,
  method: {
    weekly: `strength-model Monte Carlo (${H2H_SIMS} sims/matchup), ${Math.round((H2H_OVERROUND - 1) * 100)}% overround`,
    scorer: `forecast goalLikelihood per pooled outfielder, ${Math.round((SCORER_OVERROUND - 1) * 100)}% margin per selection; no play = void`,
    toppoints: `forecast-percentile Monte Carlo (${TOPPOINTS_SIMS} sims/matchup pool), ${Math.round((TOPPOINTS_OVERROUND - 1) * 100)}% overround; ties all pay, no play = void`,
    outright: `season-predictions titlePct, ${Math.round((OUTRIGHT_OVERROUND - 1) * 100)}% overround`,
    titan: `season-predictions topHalfPct (top 4), ${Math.round((OUTRIGHT_OVERROUND - 1) * 100)}% overround`,
    minnow: `100 − topHalfPct (bottom 4), ${Math.round((OUTRIGHT_OVERROUND - 1) * 100)}% overround`,
    last: `season-predictions lastPct, ${Math.round((OUTRIGHT_OVERROUND - 1) * 100)}% overround`,
  },
  weekly,
  players,
  outright,
  titan,
  minnow,
  last,
}

writeFileSync(join(dataDir, 'bookie-markets.json'), JSON.stringify(output, null, 1))
console.log(
  `bookie-markets.json written: weekly=${weekly ? `GW${weekly.gw} (${weekly.matches.length} matchups, closes ${weekly.deadline})` : 'none'}, players=${players ? `${players.markets.length} boards` : 'none'}, place asOfGw=${asOfGw}`,
)
