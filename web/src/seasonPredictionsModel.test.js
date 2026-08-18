import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  teamWeeklyScores,
  updatedStrength,
  bankedTable,
  simulateSeasonAsOf,
  ranksAsOf,
  streakAsOf,
  recapFactsForGw,
  matchFavorite,
  findArchivedH2hRow,
  archivedScoreError,
} from './seasonPredictionsModel.js'

const IDS = [1, 2, 3, 4]

/** Round-robin-ish fixture list: GW1-3 finished, GW4 not. */
function fixtureSet() {
  const m = (event, a, b, pa, pb, finished = true) => ({
    event,
    league_entry_1: a,
    league_entry_2: b,
    league_entry_1_points: pa,
    league_entry_2_points: pb,
    finished,
    started: finished,
  })
  return [
    m(1, 1, 2, 50, 40),
    m(1, 3, 4, 30, 60),
    m(2, 1, 3, 45, 45),
    m(2, 2, 4, 55, 35),
    m(3, 1, 4, 70, 20),
    m(3, 2, 3, 41, 42),
    m(4, 2, 1, 0, 0, false),
    m(4, 4, 3, 0, 0, false),
  ]
}

test('teamWeeklyScores respects throughGw and finished flag', () => {
  const matches = fixtureSet()
  assert.deepEqual(teamWeeklyScores(matches, 1, 3), [50, 45, 70])
  assert.deepEqual(teamWeeklyScores(matches, 1, 1), [50])
  // GW4 not finished — never counted even when throughGw includes it
  assert.deepEqual(teamWeeklyScores(matches, 1, 4), [50, 45, 70])
})

test('updatedStrength: no games returns the prior, se shrinks with games', () => {
  const prior = { mu: 50, sigma: 10 }
  const none = updatedStrength(prior, [])
  assert.equal(none.mu, 50)
  assert.equal(none.sigma, 10)
  const one = updatedStrength(prior, [29], 6)
  // (6*50 + 29) / 7 = 47
  assert.equal(one.mu, 47)
  assert.ok(one.se < none.se, 'standard error shrinks as games accumulate')
})

test('updatedStrength moves toward the observed mean with more games', () => {
  const prior = { mu: 50, sigma: 10 }
  const few = updatedStrength(prior, [70, 70], 6)
  const many = updatedStrength(prior, [70, 70, 70, 70, 70, 70, 70, 70], 6)
  assert.ok(few.mu > prior.mu)
  assert.ok(many.mu > few.mu, 'more evidence pulls harder')
  assert.ok(many.mu < 70, 'prior still counts')
})

test('bankedTable scores 3/1/0 with points-for', () => {
  const t = bankedTable(fixtureSet(), IDS, 3)
  assert.deepEqual(t.get(1), { pts: 7, w: 2, d: 1, l: 0, pf: 165, played: 3 })
  assert.deepEqual(t.get(4), { pts: 3, w: 1, d: 0, l: 2, pf: 115, played: 3 })
})

test('ranksAsOf orders by points then points-for', () => {
  const ranks = ranksAsOf(fixtureSet(), IDS, 3)
  assert.equal(ranks.get(1), 1) // 7 pts
  assert.equal(ranks.get(3), 2) // 4 pts (L, D, W)
  // 2 and 4 both on 3 pts: 2 has pf 136, 4 has pf 115
  assert.equal(ranks.get(2), 3)
  assert.equal(ranks.get(4), 4)
})

test('streakAsOf finds current run', () => {
  const matches = fixtureSet()
  assert.deepEqual(streakAsOf(matches, 4, 3), { type: 'L', len: 2 })
  assert.deepEqual(streakAsOf(matches, 1, 1), { type: 'W', len: 1 })
  assert.equal(streakAsOf(matches, 1, 0), null)
})

test('simulateSeasonAsOf banks finished results and is deterministic', () => {
  const matches = fixtureSet()
  const strengths = new Map(IDS.map((id) => [id, { mu: 50, sigma: 8, se: 2 }]))
  const args = { matches, entryIds: IDS, throughGw: 3, strengths, sims: 500, seed: 7 }
  const a = simulateSeasonAsOf(args)
  const b = simulateSeasonAsOf(args)
  assert.deepEqual(a.get(1), b.get(1), 'same seed → same output')
  // Team 1 leads by 3 pts with one equal-strength game left: heavy favorite
  assert.ok(a.get(1).titlePct > 60)
  const total = IDS.reduce((s, id) => s + a.get(id).titlePct, 0)
  assert.ok(Math.abs(total - 100) < 1.5, `title odds sum ≈ 100, got ${total}`)
  // Banked points carried into projections
  assert.ok(a.get(1).projPts >= 7)
})

test('simulateSeasonAsOf at throughGw 0 ignores finished results', () => {
  const matches = fixtureSet()
  const strengths = new Map(IDS.map((id) => [id, { mu: 50, sigma: 8, se: 2 }]))
  const sim = simulateSeasonAsOf({ matches, entryIds: IDS, throughGw: 0, strengths, sims: 500, seed: 7 })
  for (const id of IDS) {
    assert.equal(sim.get(id).banked.pts, 0)
    // Equal strengths → nobody dominates
    assert.ok(sim.get(id).titlePct > 10 && sim.get(id).titlePct < 40)
  }
})

test('recapFactsForGw computes results, ranks, streaks and superlatives', () => {
  const matches = fixtureSet()
  const names = new Map(IDS.map((id) => [id, `Team ${id}`]))
  const facts = recapFactsForGw(matches, IDS, names, 3)
  assert.equal(facts.gw, 3)
  const t1 = facts.teams.get(1)
  assert.equal(t1.result, 'W')
  assert.equal(t1.points, 70)
  assert.equal(t1.oppName, 'Team 4')
  assert.equal(t1.rank, 1)
  assert.ok(t1.isSeasonHigh)
  assert.ok(t1.isWeekHigh)
  assert.deepEqual(t1.record, { w: 2, d: 1, l: 0 })
  assert.equal(facts.superlatives.weekHigh.name, 'Team 1')
  assert.equal(facts.superlatives.closest.margin, 1)
  assert.equal(facts.superlatives.blowout.margin, 50)
  assert.equal(recapFactsForGw(matches, IDS, names, 4), null, 'unfinished GW → null')
})

test('matchFavorite prefers the archived engine odds over strengths', () => {
  const match = { league_entry_1: 1, league_entry_2: 2 }
  const history = {
    h2h: [
      {
        league_entry_1: 1,
        league_entry_2: 2,
        xPtsMc: { homeWinPct: 30, drawPct: 10, awayWinPct: 60 },
      },
    ],
  }
  // Strength model would pick 1; the archive says 2.
  const strengths = new Map([
    [1, { mu: 60, sigma: 8 }],
    [2, { mu: 40, sigma: 8 }],
  ])
  assert.deepEqual(matchFavorite(match, history, strengths), {
    favorite: 2,
    source: 'engine',
  })
  assert.deepEqual(matchFavorite(match, null, strengths), {
    favorite: 1,
    source: 'strength',
  })
  assert.equal(matchFavorite(match, null, null).favorite, null)
})

test('matchFavorite handles reversed archive orientation', () => {
  const match = { league_entry_1: 1, league_entry_2: 2 }
  const history = {
    h2h: [
      {
        league_entry_1: 2,
        league_entry_2: 1,
        xPtsMc: { homeWinPct: 70, drawPct: 10, awayWinPct: 20 },
      },
    ],
  }
  assert.equal(matchFavorite(match, history, null).favorite, 2)
})

test('archivedScoreError orients by entry id', () => {
  const row = {
    league_entry_1: 1,
    league_entry_2: 2,
    xPtsXi1: 48.2,
    xPtsXi2: 41.0,
    actualH2hPts1: 55,
    actualH2hPts2: 39,
  }
  assert.equal(findArchivedH2hRow({ h2h: [row] }, 2, 1), row)
  assert.deepEqual(archivedScoreError(row, 1), {
    predicted: 48.2,
    actual: 55,
    absErr: 6.8,
  })
  assert.deepEqual(archivedScoreError(row, 2), {
    predicted: 41,
    actual: 39,
    absErr: 2,
  })
  assert.equal(archivedScoreError(null, 1), null)
})
