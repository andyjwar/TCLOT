#!/usr/bin/env node
/**
 * Empirical variance calibration for the H2H win-probability model
 * (public/league-data/model-calibration.json).
 *
 * The win bars convert a point-differential edge into a probability via a
 * normal CDF whose sd comes from summing per-player forecast variances in
 * quadrature (teamForecastDistribution / teamProjection). That independence
 * assumption understates the true team-week spread — teammates share clean
 * sheets and team goals — so small mu edges were converted into overly
 * extreme percentages.
 *
 * This script measures the mismatch directly from the projections-history
 * archive: for every finished match it compares the realized differential
 * residual, (actual1 − xP1) − (actual2 − xP2), against the variance the
 * model would claim for that match (each archived XI's players priced with
 * the current forecast spreads). The ratio of empirical to modeled spread is
 * the inflation factor consumers pass to h2hWinProbs as `sigmaScale`.
 *
 * Small-sample handling: the raw ratio is regressed toward 1 with a
 * credibility weight (matches / (matches + 12)), needs at least 4 scored
 * matches to move at all, and is clamped to [1, 1.75] — we never deflate
 * below 1 because the independence assumption can only understate variance.
 *
 * Run after build-predictions + build-projections-history:
 *   node scripts/build-model-calibration.mjs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'public/league-data')
const historyDir = join(dataDir, 'projections-history')
const outPath = join(dataDir, 'model-calibration.json')

const MIN_MATCHES = 4
const CREDIBILITY_K = 12
const MIN_INFLATION = 1
const MAX_INFLATION = 1.75
/** p90 − p10 spans ~2.563σ of a normal (matches forecastHelpers/liveBlend). */
const PCTL_TO_SD = 2.563
/** Need most of an XI priced with current spreads to trust the reconstruction. */
const MIN_MATCHED_XI = 8

function writeOut(payload) {
  writeFileSync(outPath, JSON.stringify(payload, null, 1))
}

function fallback(reason) {
  writeOut({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sigmaInflation: 1,
    applied: false,
    reason,
    matchCount: 0,
  })
  console.log(`model-calibration.json written: sigmaInflation=1 (not applied — ${reason})`)
}

let predictions
try {
  predictions = JSON.parse(readFileSync(join(dataDir, 'predictions.json'), 'utf8'))
} catch (err) {
  fallback(`predictions.json unavailable: ${err.message}`)
  process.exit(0)
}

/** Current per-player forecast sd by element id. */
const sdById = new Map()
for (const p of predictions?.players ?? []) {
  const p10 = Number(p?.forecast?.percentiles?.p10)
  const p90 = Number(p?.forecast?.percentiles?.p90)
  if (Number.isFinite(p10) && Number.isFinite(p90)) {
    sdById.set(Number(p.id), Math.max(0, (p90 - p10) / PCTL_TO_SD))
  }
}
if (sdById.size === 0) {
  fallback('predictions.json has no player percentiles')
  process.exit(0)
}

/** Modeled variance for one archived XI, priced with current player spreads. */
function xiModelVariance(xi) {
  if (!Array.isArray(xi) || xi.length === 0) return null
  let variance = 0
  let matched = 0
  for (const row of xi) {
    const sd = sdById.get(Number(row?.id))
    if (sd == null) continue
    variance += sd * sd
    matched += 1
  }
  if (matched < MIN_MATCHED_XI) return null
  // Scale up for the few unmatched players (transfers out of the pool).
  return variance * (xi.length / matched)
}

const gwFiles = existsSync(historyDir)
  ? readdirSync(historyDir).filter((f) => /^gw-\d+\.json$/.test(f)).sort()
  : []

let sumSqResid = 0
let sumModelVar = 0
let matchCount = 0
const perGw = []
for (const file of gwFiles) {
  let history
  try {
    history = JSON.parse(readFileSync(join(historyDir, file), 'utf8'))
  } catch {
    continue
  }
  let gwMatches = 0
  for (const row of history?.h2h ?? []) {
    const a1 = Number(row.actualH2hPts1)
    const a2 = Number(row.actualH2hPts2)
    const x1 = Number(row.xPtsXi1)
    const x2 = Number(row.xPtsXi2)
    if (![a1, a2, x1, x2].every(Number.isFinite)) continue
    const modelVar = (xiModelVariance(row.xi1) ?? NaN) + (xiModelVariance(row.xi2) ?? NaN)
    if (!Number.isFinite(modelVar) || modelVar <= 0) continue
    const resid = a1 - x1 - (a2 - x2)
    sumSqResid += resid * resid
    sumModelVar += modelVar
    matchCount += 1
    gwMatches += 1
  }
  if (gwMatches > 0) perGw.push({ gw: Number(history.gameweek), matches: gwMatches })
}

if (matchCount === 0) {
  fallback('no scorable matches in projections-history')
  process.exit(0)
}

const empiricalMatchSd = Math.sqrt(sumSqResid / matchCount)
const modelMatchSd = Math.sqrt(sumModelVar / matchCount)
const rawRatio = empiricalMatchSd / modelMatchSd
const credibility = matchCount / (matchCount + CREDIBILITY_K)
const shrunk = 1 + credibility * (rawRatio - 1)
const applied = matchCount >= MIN_MATCHES
const sigmaInflation = applied
  ? +Math.min(MAX_INFLATION, Math.max(MIN_INFLATION, shrunk)).toFixed(3)
  : 1

writeOut({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sigmaInflation,
  applied,
  matchCount,
  empiricalMatchSd: +empiricalMatchSd.toFixed(2),
  modelMatchSd: +modelMatchSd.toFixed(2),
  rawRatio: +rawRatio.toFixed(3),
  credibility: +credibility.toFixed(3),
  gameweeks: perGw,
  method:
    'sd of per-match differential residuals (actual − xPtsXi) vs CLT model sd of the archived XIs; credibility-shrunk toward 1, clamped [1, 1.75]',
})
console.log(
  `model-calibration.json written: sigmaInflation=${sigmaInflation} ` +
    `(raw=${rawRatio.toFixed(3)}, matches=${matchCount}, empirical sd=${empiricalMatchSd.toFixed(1)}, model sd=${modelMatchSd.toFixed(1)})`,
)
