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
 *  - Outright league champion: taken straight from season-predictions.json
 *    `current.teams[].titlePct` so the bookie board always agrees with the
 *    Predictions tab.
 *
 * Decimal odds carry a bookmaker overround (the book is intentionally not
 * fair — that's half the fun): ~105% on the 3-way weekly markets, ~110% on
 * the 8-runner outright.
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

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'public/league-data')
const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'))

/** Overround (total implied probability) per market type. */
const H2H_OVERROUND = 1.05
const OUTRIGHT_OVERROUND = 1.1
const H2H_SIMS = 20000

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

/** Decimal odds for a probability under a market-wide overround. */
function decimalOdds(prob, overround, { minProb = 0.005, maxOdds = 500 } = {}) {
  const p = Math.max(minProb, Math.min(0.995, Number(prob) || 0))
  const dec = 1 / (p * overround)
  return Math.min(maxOdds, Math.max(1.01, Math.round(dec * 100) / 100))
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

/* ---- outright: league champion, repriced after every banked GW ---- */
const finalEvent = events.length > 0 ? events[events.length - 1] : null
const outrightTeams =
  seasonPredictions?.current?.teams ??
  (preview.teams ?? []).map((t) => ({
    leagueEntryId: Number(t.leagueEntryId),
    name: t.name,
    titlePct: t.sim?.titlePct,
  }))
const outright = {
  key: `outright:${season ?? 'season'}`,
  asOfGw: seasonPredictions?.asOfGw ?? 0,
  closesAt: finalEvent?.deadline_time ?? null,
  selections: outrightTeams
    .map((t) => ({
      entryId: Number(t.leagueEntryId),
      name: t.name,
      titlePct: Number(t.titlePct) || 0,
      odds: decimalOdds((Number(t.titlePct) || 0) / 100, OUTRIGHT_OVERROUND, {
        minProb: 0.002,
      }),
    }))
    .sort((a, b) => b.titlePct - a.titlePct),
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  season,
  asOfGw: lastFinishedGw,
  method: {
    weekly: `strength-model Monte Carlo (${H2H_SIMS} sims/matchup), ${Math.round((H2H_OVERROUND - 1) * 100)}% overround`,
    outright: `season-predictions titlePct, ${Math.round((OUTRIGHT_OVERROUND - 1) * 100)}% overround`,
  },
  weekly,
  outright,
}

writeFileSync(join(dataDir, 'bookie-markets.json'), JSON.stringify(output, null, 1))
console.log(
  `bookie-markets.json written: weekly=${weekly ? `GW${weekly.gw} (${weekly.matches.length} matchups, closes ${weekly.deadline})` : 'none'}, outright asOfGw=${outright.asOfGw}`,
)
