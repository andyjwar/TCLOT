import { test } from 'node:test'
import assert from 'node:assert/strict'
import { teamRecapSentences, variantIndex, ordinal } from './weeklyRecapText.js'

const base = {
  entryId: 1,
  gw: 3,
  name: 'Mordor S.F.G',
  oppName: 'Seoul Shire',
  points: 61,
  oppPoints: 45,
  result: 'W',
  margin: 16,
  rank: 2,
  prevRank: 4,
  record: { w: 2, d: 0, l: 1 },
  streak: { type: 'W', len: 2 },
  seasonAvg: 52.3,
  isSeasonHigh: false,
  isWeekHigh: false,
}

test('always three sentences, deterministic for same inputs', () => {
  const a = teamRecapSentences(base, { before: 20, after: 28 })
  const b = teamRecapSentences(base, { before: 20, after: 28 })
  assert.equal(a.length, 3)
  assert.deepEqual(a, b)
  for (const s of a) assert.ok(s.length > 10, `sentence too short: "${s}"`)
})

test('result sentence carries the score and both names', () => {
  const [result] = teamRecapSentences(base, null)
  assert.match(result, /61–45/)
  assert.match(result, /Mordor S\.F\.G/)
  assert.match(result, /Seoul Shire/)
})

test('loss sentences keep score in a consistent perspective', () => {
  // Every loss variant must show the score so that the loser's points come
  // right after a "loser first" phrasing or flipped for "winner first".
  for (let entryId = 1; entryId <= 12; entryId++) {
    const f = {
      ...base,
      entryId,
      result: 'L',
      points: 40,
      oppPoints: 52,
      margin: 12,
    }
    const [result] = teamRecapSentences(f, null)
    const nameFirst = result.indexOf('Mordor') < result.indexOf('Seoul')
    if (nameFirst) {
      assert.match(result, /40–52/, `loser-first phrasing must use 40–52: "${result}"`)
    } else {
      assert.match(result, /52–40/, `winner-first phrasing must use 52–40: "${result}"`)
    }
  }
})

test('trend sentence: rank climb to top is called out', () => {
  const f = { ...base, rank: 1, prevRank: 3, streak: { type: 'W', len: 1 } }
  const [, trend] = teamRecapSentences(f, null)
  assert.match(trend, /top/)
})

test('trend sentence: long streaks beat rank moves', () => {
  const f = { ...base, streak: { type: 'L', len: 4 }, result: 'L' }
  const [, trend] = teamRecapSentences(f, null)
  assert.match(trend, /4 straight defeats/)
})

test('model sentence: odds swing when it moved, fallback otherwise', () => {
  const [, , withSwing] = teamRecapSentences(base, { before: 20, after: 31.5 })
  assert.match(withSwing, /20% → 31\.5%/)
  const [, , noSwing] = teamRecapSentences(
    { ...base, points: 52, seasonAvg: 52.0 },
    { before: 20, after: 20.4 },
  )
  assert.doesNotMatch(noSwing, /→/)
})

test('model sentence: season-high beats average talk', () => {
  const f = { ...base, isSeasonHigh: true, points: 80 }
  const [, , model] = teamRecapSentences(f, null)
  assert.match(model, /season-high/)
})

test('variantIndex is stable and in range', () => {
  for (const key of ['a', 'b', 'team-1-gw3', '']) {
    const v = variantIndex(key, 3)
    assert.equal(v, variantIndex(key, 3))
    assert.ok(v >= 0 && v < 3)
  }
})

test('ordinal', () => {
  assert.equal(ordinal(1), '1st')
  assert.equal(ordinal(2), '2nd')
  assert.equal(ordinal(3), '3rd')
  assert.equal(ordinal(4), '4th')
  assert.equal(ordinal(11), '11th')
  assert.equal(ordinal(22), '22nd')
})
