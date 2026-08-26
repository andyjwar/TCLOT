import test from 'node:test'
import assert from 'node:assert/strict'
import {
  anytimeScorerProb,
  samplePointsFromPercentiles,
  topPointsWinProbs,
} from './bookiePlayerMarkets.js'

/* samplePointsFromPercentiles — piecewise inverse CDF over p10/p50/p90 */

const pct = { p10: 2, p50: 6, p90: 15 }

test('sampler hits the published percentiles at their quantiles', () => {
  assert.equal(samplePointsFromPercentiles(0.1, pct), 2)
  assert.equal(samplePointsFromPercentiles(0.5, pct), 6)
  // u → 0.9⁻ approaches p90 from below; u = 0.9 starts the tail at exactly p90.
  assert.equal(samplePointsFromPercentiles(0.9, pct), 15)
})

test('sampler interpolates between percentiles and is monotone in u', () => {
  assert.equal(samplePointsFromPercentiles(0.3, pct), 4) // halfway p10 → p50
  assert.equal(samplePointsFromPercentiles(0.7, pct), 11) // rounded halfway p50 → p90
  let prev = -Infinity
  for (let u = 0; u < 1; u += 0.01) {
    const v = samplePointsFromPercentiles(u, pct)
    assert.ok(v >= prev, `not monotone at u=${u}`)
    prev = v
  }
})

test('sampler tail exceeds p90 and the floor never drops below min(0, p10)', () => {
  assert.ok(samplePointsFromPercentiles(0.99, pct) > 15)
  assert.equal(samplePointsFromPercentiles(0, pct), 0)
  assert.ok(samplePointsFromPercentiles(0.05, pct) >= 0)
})

test('sampler survives degenerate/absent percentiles', () => {
  assert.equal(samplePointsFromPercentiles(0.5, null), 0)
  assert.equal(samplePointsFromPercentiles(0.5, { p10: 0, p50: 0, p90: 0 }), 0)
  // Out-of-order percentiles are sanitised to non-decreasing.
  assert.equal(samplePointsFromPercentiles(0.5, { p10: 8, p50: 3, p90: 1 }), 8)
})

/* topPointsWinProbs — Monte Carlo max over a pool, ties credit everyone */

test('a dominant forecast wins far more often than a bench-warmer', () => {
  const probs = topPointsWinProbs(
    [
      { elementId: 1, percentiles: { p10: 3, p50: 8, p90: 18 } },
      { elementId: 2, percentiles: { p10: 1, p50: 3, p90: 8 } },
      { elementId: 3, percentiles: { p10: 0, p50: 1, p90: 3 } },
    ],
    { sims: 4000, seed: 7 },
  )
  assert.ok(probs.get(1) > 0.6, `dominant player only ${probs.get(1)}`)
  assert.ok(probs.get(1) > probs.get(2))
  assert.ok(probs.get(2) > probs.get(3))
  // Ties pay everyone, so the credited probabilities sum to ≥ 1.
  const sum = [...probs.values()].reduce((a, b) => a + b, 0)
  assert.ok(sum >= 1)
})

test('identical forecasts price identically-ish and everyone can win', () => {
  const twin = { p10: 2, p50: 5, p90: 12 }
  const probs = topPointsWinProbs(
    [
      { elementId: 1, percentiles: twin },
      { elementId: 2, percentiles: twin },
    ],
    { sims: 6000, seed: 11 },
  )
  assert.ok(Math.abs(probs.get(1) - probs.get(2)) < 0.05)
  assert.ok(probs.get(1) > 0.4)
})

test('deterministic for a fixed seed, empty pool is safe', () => {
  const pool = [{ elementId: 9, percentiles: pct }]
  assert.deepEqual(
    topPointsWinProbs(pool, { sims: 500, seed: 3 }),
    topPointsWinProbs(pool, { sims: 500, seed: 3 }),
  )
  assert.equal(topPointsWinProbs([], { sims: 100 }).size, 0)
})

/* anytimeScorerProb — clamped forecast goalLikelihood */

test('anytimeScorerProb clamps to a priceable range', () => {
  assert.equal(anytimeScorerProb(0.308), 0.308)
  assert.equal(anytimeScorerProb(1.4), 0.97)
  assert.equal(anytimeScorerProb(-0.2), 0)
  assert.equal(anytimeScorerProb(undefined), 0)
})
