import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchupRecapSentences, variantIndex, ordinal } from './weeklyRecapText.js'

const team = (over = {}) => ({
  entryId: 1,
  name: 'Mordor S.F.G',
  points: 61,
  rank: 2,
  prevRank: 4,
  record: { w: 2, d: 0, l: 1 },
  streak: { type: 'W', len: 2 },
  seasonAvg: 52.3,
  isSeasonHigh: false,
  isWeekHigh: false,
  titleOdds: null,
  ...over,
})

const base = {
  gw: 3,
  home: team(),
  away: team({
    entryId: 2,
    name: 'Seoul Shire',
    points: 45,
    rank: 7,
    prevRank: 6,
    record: { w: 1, d: 0, l: 2 },
    streak: { type: 'L', len: 1 },
    seasonAvg: 47.0,
  }),
  odds: { favoriteSide: 'home', favoritePct: 62 },
  leagueAvg: 52,
}

test('four sentences with a model call, deterministic for same inputs', () => {
  const a = matchupRecapSentences(base)
  const b = matchupRecapSentences(base)
  assert.equal(a.length, 4)
  assert.deepEqual(a, b)
  for (const s of a) assert.ok(s.length > 10, `sentence too short: "${s}"`)
})

test('three sentences when no pre-match call exists', () => {
  const out = matchupRecapSentences({ ...base, odds: null })
  assert.equal(out.length, 3)
})

test('result sentence: winner first with winner-first score', () => {
  const [result] = matchupRecapSentences(base)
  assert.match(result, /61–45/)
  assert.ok(
    result.indexOf('Mordor') < result.indexOf('Seoul'),
    `winner named first: "${result}"`,
  )
  // Away winner flips both order and score
  const flipped = matchupRecapSentences({
    ...base,
    home: team({ points: 45 }),
    away: { ...base.away, points: 61 },
    odds: null,
  })
  assert.match(flipped[0], /61–45/)
  assert.ok(flipped[0].indexOf('Seoul') < flipped[0].indexOf('Mordor'))
})

test('odds sentence: favorite winning is called chalk/lean, upset flagged', () => {
  const [, chalk] = matchupRecapSentences({
    ...base,
    odds: { favoriteSide: 'home', favoritePct: 71 },
  })
  assert.match(chalk, /71%/)
  const [, upset] = matchupRecapSentences({
    ...base,
    odds: { favoriteSide: 'away', favoritePct: 70 },
  })
  assert.match(upset, /upset|script/i)
})

test('draw: stalemate result and no-side odds sentence', () => {
  const drawn = matchupRecapSentences({
    ...base,
    home: team({ points: 50 }),
    away: { ...base.away, points: 50 },
  })
  assert.match(drawn[0], /50–50/)
  assert.match(drawn[1], /refused to pick a side/)
})

test('context sentence covers both teams with ranks and records', () => {
  const out = matchupRecapSentences(base)
  const context = out[2]
  assert.match(context, /2-0-1/)
  assert.match(context, /1-0-2/)
  assert.match(context, /2nd/)
  assert.match(context, /7th/)
})

test('fun fact priority: season-high wins (from GW3), title swing next', () => {
  const [, , , seasonHigh] = matchupRecapSentences({
    ...base,
    home: team({ isSeasonHigh: true, points: 80 }),
  })
  assert.match(seasonHigh, /best week of the season/)
  // GW2 season-highs are too trivial to mention
  const gw2 = matchupRecapSentences({
    ...base,
    gw: 2,
    home: team({ isSeasonHigh: true, points: 80, titleOdds: { before: 20, after: 31 } }),
  })
  assert.doesNotMatch(gw2[3], /best week/)
  assert.match(gw2[3], /title odds/)
})

test('fun fact: long losing streak raises alarm bells', () => {
  const out = matchupRecapSentences({
    ...base,
    away: { ...base.away, streak: { type: 'L', len: 4 } },
  })
  assert.match(out[3], /4 defeats on the spin/)
})

test('fun fact: heavyweight fixture when combined points run high', () => {
  const out = matchupRecapSentences({
    ...base,
    home: team({ points: 78 }),
    away: { ...base.away, points: 70 },
    leagueAvg: 50,
  })
  assert.match(out[3], /148 combined points/)
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
