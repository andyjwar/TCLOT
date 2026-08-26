/**
 * Pure pricing maths for the bookie's per-matchup player specials —
 * "anytime goalscorer" and "top point scorer" boards built from the same
 * per-player forecasts that drive the Players tab (predictions.json).
 *
 * Kept free of file/IO so node:test can cover it; the market builder
 * (scripts/build-bookie-markets.mjs) supplies the data and turns the
 * probabilities returned here into ladder odds.
 */
import { makeRng } from './seasonPredictionsModel.js'

/** Market kinds priced from the per-player forecast. */
export const PLAYER_MARKET_KINDS = ['scorer', 'toppoints']

/**
 * One FPL-points sample from a player's forecast percentiles (p10/p50/p90),
 * via a piecewise-linear inverse CDF with an exponential right tail — FPL
 * scores are blank-heavy with occasional hauls, and three percentiles are
 * all the forecast publishes.
 *
 *  - u < 0.1  : lerp from min(0, p10) up to p10 (blanks / early hooks)
 *  - u < 0.5  : lerp p10 → p50
 *  - u < 0.9  : lerp p50 → p90
 *  - u ≥ 0.9  : p90 + Exp tail (haul weeks), scale ~0.8 × (p90 − p50)
 *
 * @param {number} u uniform draw in [0, 1)
 * @param {{ p10?: number, p50?: number, p90?: number } | null} pct
 * @returns {number} integer FPL points
 */
export function samplePointsFromPercentiles(u, pct) {
  const p10 = Number(pct?.p10) || 0
  const p50 = Math.max(p10, Number(pct?.p50) || 0)
  const p90 = Math.max(p50, Number(pct?.p90) || 0)
  const v = Math.min(0.9999, Math.max(0, Number(u) || 0))
  if (v < 0.1) {
    const floor = Math.min(0, p10)
    return Math.round(floor + (p10 - floor) * (v / 0.1))
  }
  if (v < 0.5) return Math.round(p10 + (p50 - p10) * ((v - 0.1) / 0.4))
  if (v < 0.9) return Math.round(p50 + (p90 - p50) * ((v - 0.5) / 0.4))
  const tail = Math.max(2, 0.8 * (p90 - p50))
  return Math.round(p90 + tail * Math.log(0.1 / (1 - v)))
}

/**
 * Monte Carlo win probability per player for "top point scorer of the
 * matchup pool". Every simulated week scores all players from their
 * percentile distributions and credits the max — ties credit every tied
 * player in full, matching the market's settlement rule (dead heats all
 * pay), so the probabilities intentionally sum to slightly over 1.
 *
 * @param {Array<{ elementId: number, percentiles: object | null }>} players
 * @param {{ sims?: number, seed?: number }} [opts]
 * @returns {Map<number, number>} elementId → win probability
 */
export function topPointsWinProbs(players, { sims = 10000, seed = 1 } = {}) {
  const pool = Array.isArray(players) ? players : []
  const wins = new Map(pool.map((p) => [Number(p.elementId), 0]))
  if (pool.length === 0 || sims <= 0) return wins
  const rng = makeRng(seed)
  for (let i = 0; i < sims; i++) {
    let top = -Infinity
    const scores = new Array(pool.length)
    for (let j = 0; j < pool.length; j++) {
      const s = samplePointsFromPercentiles(rng(), pool[j].percentiles)
      scores[j] = s
      if (s > top) top = s
    }
    for (let j = 0; j < pool.length; j++) {
      if (scores[j] === top) {
        const id = Number(pool[j].elementId)
        wins.set(id, wins.get(id) + 1)
      }
    }
  }
  for (const [id, n] of wins) wins.set(id, n / sims)
  return wins
}

/**
 * Fair "scores anytime this gameweek" probability from the forecast's
 * goalLikelihood, clamped to a priceable range.
 *
 * @param {number} goalLikelihood P(≥1 goal) from predictions.json
 * @returns {number}
 */
export function anytimeScorerProb(goalLikelihood) {
  const p = Number(goalLikelihood)
  if (!Number.isFinite(p)) return 0
  return Math.min(0.97, Math.max(0, p))
}
