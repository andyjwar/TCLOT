#!/usr/bin/env node
/**
 * Weekly recaps (web/public/league-data/weekly-recaps.json).
 *
 * One entry per finished gameweek: match results, superlatives, and a
 * three-sentence template recap per team (result / trend / model odds swing).
 * Fully regenerated each build from details.json + season-predictions.json —
 * deterministic, so historical recaps never change once a GW is done.
 *
 * Run AFTER build-season-predictions.mjs (odds swings read its snapshots):
 *   node scripts/build-weekly-recaps.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { recapFactsForGw } from '../src/seasonPredictionsModel.js'
import { teamRecapSentences } from '../src/weeklyRecapText.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'public/league-data')
const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'))

/* Fail soft, same reasoning as build-season-predictions: no inputs → no tab,
 * but never a broken deploy. */
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

function titleOddsAt(asOfGw, entryId) {
  const snap = snapshotByGw.get(asOfGw)
  const row = snap?.teams.find((t) => Number(t.leagueEntryId) === Number(entryId))
  return row ? Number(row.titlePct) : null
}

const lastFinishedGw = matches.reduce(
  (max, m) => (m.finished && Number(m.event) > max ? Number(m.event) : max),
  0,
)

const gameweeks = []
for (let gw = 1; gw <= lastFinishedGw; gw++) {
  const facts = recapFactsForGw(matches, entryIds, nameById, gw)
  if (!facts) continue

  const teams = [...facts.teams.values()].map((f) => {
    const before = titleOddsAt(gw - 1, f.entryId)
    const after = titleOddsAt(gw, f.entryId)
    const odds =
      Number.isFinite(before) && Number.isFinite(after) ? { before, after } : null
    return {
      ...f,
      titleOdds: odds,
      sentences: teamRecapSentences({ ...f, gw }, odds),
    }
  })
  // Present in table order after the GW.
  teams.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))

  gameweeks.push({
    gw,
    matches: facts.matches.map((m) => ({
      ...m,
      homeName: nameById.get(m.home),
      awayName: nameById.get(m.away),
    })),
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
      blowout: facts.superlatives.blowout
        ? {
            homeName: nameById.get(facts.superlatives.blowout.home),
            awayName: nameById.get(facts.superlatives.blowout.away),
            margin: facts.superlatives.blowout.margin,
          }
        : null,
    },
    teams,
  })
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  season: predictions.season,
  lastFinishedGw,
  gameweeks,
}

writeFileSync(join(dataDir, 'weekly-recaps.json'), JSON.stringify(output, null, 1))
console.log(`weekly-recaps.json written: ${gameweeks.length} gameweek(s)`)
