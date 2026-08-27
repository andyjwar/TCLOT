import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TRADE_MIN_STATS,
  TRADE_MAX_STATS,
  TRADE_MAX_PLAYERS_PER_SIDE,
  DEFAULT_TRADE_STAT_IDS,
  seasonShortLabel,
  normalizeTradeStatSelection,
  readTradeStat,
  indexElementsByCode,
  joinPriorByCode,
  seasonStatValue,
  aggregateSideStats,
  normalizeRadarPair,
  buildRadarAxes,
  radarVertex,
  polygonPath,
  formatTradeStat,
  toggleTradeStat,
  lockedTradePosition,
  filterSquadForTrade,
  applyTradePick,
  encodeTradeSource,
  parseTradeSource,
} from './tradeToolStats.js'

const CURRENT = {
  id: 10,
  code: 111,
  total_points: 24,
  goals_scored: 3,
  assists: 1,
  clean_sheets: 0,
  bonus: 4,
  expected_goals: '2.4',
  minutes: 270,
  saves: 0,
}

const PRIOR = {
  id: 77,
  code: 111,
  total_points: 180,
  goals_scored: 18,
  assists: 8,
  clean_sheets: 2,
  bonus: 12,
  expected_goals: '16.1',
  minutes: 3100,
  saves: 0,
}

test('seasonShortLabel — 2026-27 → 26/27', () => {
  assert.equal(seasonShortLabel('2026-27'), '26/27')
  assert.equal(seasonShortLabel('2025-26'), '25/26')
  assert.equal(seasonShortLabel(''), '')
})

test('normalizeTradeStatSelection — fills to min, caps at max, drops unknown', () => {
  assert.deepEqual(normalizeTradeStatSelection([]), DEFAULT_TRADE_STAT_IDS.slice(0, TRADE_MIN_STATS))
  assert.equal(normalizeTradeStatSelection(['pts', 'bogus', 'goals']).length >= TRADE_MIN_STATS, true)
  const tooMany = ['pts', 'goals', 'assists', 'cs', 'bonus', 'xg', 'xa', 'minutes', 'starts']
  assert.equal(normalizeTradeStatSelection(tooMany).length, TRADE_MAX_STATS)
})

test('readTradeStat — element fields, decimals, summary, save points', () => {
  assert.equal(readTradeStat(CURRENT, null, 'pts'), 24)
  assert.equal(readTradeStat(CURRENT, null, 'xg'), 2.4)
  assert.equal(readTradeStat(CURRENT, { gamesPlayed: 5, sixtyPlus: 4, defConHits: 1 }, 'gp'), 5)
  assert.equal(readTradeStat({ saves: 10 }, null, 'savePts'), 3)
  assert.equal(readTradeStat(null, null, 'pts'), 0)
})

test('joinPriorByCode — Opta code match, miss returns null', () => {
  const byCode = indexElementsByCode([PRIOR, { id: 1, code: 222, total_points: 9 }])
  assert.equal(joinPriorByCode(CURRENT, byCode), PRIOR)
  assert.equal(joinPriorByCode({ code: 999 }, byCode), null)
  assert.equal(joinPriorByCode({}, byCode), null)
})

test('seasonStatValue — current / prior / combined', () => {
  const cur = seasonStatValue(CURRENT, PRIOR, null, null, 'pts', 'current')
  assert.equal(cur.value, 24)
  const prior = seasonStatValue(CURRENT, PRIOR, null, null, 'pts', 'prior')
  assert.equal(prior.value, 180)
  const both = seasonStatValue(CURRENT, PRIOR, null, null, 'pts', 'combined')
  assert.equal(both.value, 204)
  const noPrior = seasonStatValue(CURRENT, null, null, null, 'pts', 'combined')
  assert.equal(noPrior.value, 24)
  assert.equal(noPrior.hasPrior, false)
  const priorMissing = seasonStatValue(CURRENT, null, null, null, 'pts', 'prior')
  assert.equal(priorMissing.value, 0)
})

test('aggregateSideStats — sums two players; missing prior skipped in prior mode', () => {
  const a = {
    currentEl: CURRENT,
    priorEl: PRIOR,
  }
  const b = {
    currentEl: { ...CURRENT, id: 11, code: 333, total_points: 10, goals_scored: 2 },
    priorEl: null,
  }
  const current = aggregateSideStats([a, b], ['pts', 'goals', 'assists'], 'current')
  assert.equal(current.pts, 34)
  assert.equal(current.goals, 5)
  const prior = aggregateSideStats([a, b], ['pts', 'goals', 'assists'], 'prior')
  assert.equal(prior.pts, 180)
  assert.equal(prior.goals, 18)
  const combined = aggregateSideStats([a, b], ['pts'], 'combined')
  assert.equal(combined.pts, 24 + 180 + 10)
})

test('normalizeRadarPair — leader on the rim; lower-is-better inverts', () => {
  assert.deepEqual(normalizeRadarPair(10, 5), { aNorm: 1, bNorm: 0.5 })
  assert.deepEqual(normalizeRadarPair(0, 0), { aNorm: 0, bNorm: 0 })
  const gc = normalizeRadarPair(2, 10, { lowerIsBetter: true })
  assert.ok(gc.aNorm > gc.bNorm)
  assert.equal(gc.bNorm, 0)
})

test('buildRadarAxes — delta positive when A leads; GC delta flips', () => {
  const axes = buildRadarAxes(
    ['pts', 'gc'],
    { pts: 40, gc: 2 },
    { pts: 10, gc: 8 },
  )
  const pts = axes.find((x) => x.id === 'pts')
  const gc = axes.find((x) => x.id === 'gc')
  assert.equal(pts.delta, 30)
  assert.equal(gc.lowerIsBetter, true)
  assert.equal(gc.delta, 6)
  assert.ok(pts.aNorm > pts.bNorm)
  assert.ok(gc.aNorm > gc.bNorm)
})

test('radarVertex — first axis is straight up; polygonPath closes', () => {
  const [x, y] = radarVertex(0, 6, 1, 200, 200, 100)
  assert.ok(Math.abs(x - 200) < 1e-6)
  assert.ok(Math.abs(y - 100) < 1e-6)
  const pts = [
    radarVertex(0, 4, 1, 0, 0, 10),
    radarVertex(1, 4, 1, 0, 0, 10),
    radarVertex(2, 4, 1, 0, 0, 10),
    radarVertex(3, 4, 1, 0, 0, 10),
  ]
  const d = polygonPath(pts)
  assert.match(d, /^M/)
  assert.match(d, /Z$/)
  assert.equal(polygonPath([]), '')
})

test('formatTradeStat — int vs one-decimal xG', () => {
  assert.equal(formatTradeStat('pts', 24), '24')
  assert.equal(formatTradeStat('xg', 2.41), '2.4')
  assert.equal(formatTradeStat('pts', Number.NaN), '—')
})

test('toggleTradeStat — respects min and max', () => {
  const minned = DEFAULT_TRADE_STAT_IDS.slice(0, TRADE_MIN_STATS)
  assert.deepEqual(toggleTradeStat(minned, minned[0]), minned)
  const added = toggleTradeStat(minned, 'xa')
  assert.ok(added.includes('xa'))
  const atMax = ['pts', 'goals', 'assists', 'cs', 'bonus', 'xg', 'xa', 'minutes']
  assert.equal(toggleTradeStat(atMax, 'starts').length, TRADE_MAX_STATS)
})

test('TRADE_MAX_PLAYERS_PER_SIDE is one-for-one', () => {
  assert.equal(TRADE_MAX_PLAYERS_PER_SIDE, 1)
})

test('lockedTradePosition — first pick on either side locks the position', () => {
  assert.equal(lockedTradePosition([], []), null)
  assert.equal(lockedTradePosition([{ positionType: 1 }], []), 1)
  assert.equal(lockedTradePosition([], [{ positionType: 3 }]), 3)
  assert.equal(lockedTradePosition([{ positionType: 2 }], [{ positionType: 2 }]), 2)
})

test('filterSquadForTrade — locked position hides every other slot', () => {
  const squad = [
    { element: 1, positionType: 1 },
    { element: 2, positionType: 2 },
    { element: 3, positionType: 1 },
  ]
  assert.deepEqual(filterSquadForTrade(squad, null), squad)
  assert.deepEqual(
    filterSquadForTrade(squad, 1).map((p) => p.element),
    [1, 3],
  )
})

test('applyTradePick — one per side, same-position, replace, deselect', () => {
  const gkA = { element: 10, positionType: 1 }
  const defA = { element: 11, positionType: 2 }
  const gkB = { element: 20, positionType: 1 }
  const midB = { element: 21, positionType: 3 }
  const squadA = [gkA, defA]
  const squadB = [gkB, midB]

  const pickGkA = applyTradePick({
    idsA: [],
    idsB: [],
    squadA,
    squadB,
    side: 'a',
    elementId: 10,
  })
  assert.deepEqual(pickGkA, { idsA: [10], idsB: [] })

  const pickGkB = applyTradePick({
    ...pickGkA,
    squadA,
    squadB,
    side: 'b',
    elementId: 20,
  })
  assert.deepEqual(pickGkB, { idsA: [10], idsB: [20] })

  const rejectMid = applyTradePick({
    ...pickGkB,
    squadA,
    squadB,
    side: 'b',
    elementId: 21,
  })
  assert.deepEqual(rejectMid, { idsA: [10], idsB: [20] })

  const replaceSamePos = applyTradePick({
    idsA: [10],
    idsB: [],
    squadA,
    squadB,
    side: 'a',
    elementId: 11,
  })
  assert.deepEqual(replaceSamePos, { idsA: [11], idsB: [] })

  const deselect = applyTradePick({
    idsA: [10],
    idsB: [20],
    squadA,
    squadB,
    side: 'a',
    elementId: 10,
  })
  assert.deepEqual(deselect, { idsA: [], idsB: [20] })

  const swapSamePos = applyTradePick({
    idsA: [10],
    idsB: [20],
    squadA: [...squadA, { element: 12, positionType: 1 }],
    squadB,
    side: 'a',
    elementId: 12,
  })
  assert.deepEqual(swapSamePos, { idsA: [12], idsB: [20] })
})

test('encodeTradeSource / parseTradeSource — entry vs club keys', () => {
  assert.equal(encodeTradeSource('entry', 42), 'entry:42')
  assert.equal(encodeTradeSource('club', 14), 'club:14')
  assert.equal(encodeTradeSource('club', Number.NaN), '')
  assert.deepEqual(parseTradeSource('entry:42'), { kind: 'entry', id: 42 })
  assert.deepEqual(parseTradeSource('club:14'), { kind: 'club', id: 14 })
  assert.equal(parseTradeSource('42'), null)
  assert.equal(parseTradeSource(''), null)
})

test('applyTradePick — same element cannot sit on both sides', () => {
  const gk = { element: 10, positionType: 1 }
  const next = applyTradePick({
    idsA: [10],
    idsB: [],
    squadA: [gk],
    squadB: [gk],
    side: 'b',
    elementId: 10,
  })
  assert.deepEqual(next, { idsA: [10], idsB: [] })
})
