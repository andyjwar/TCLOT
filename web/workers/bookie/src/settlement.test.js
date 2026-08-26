import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  footballComplete,
  h2hResultForMarket,
  championFromMatches,
  ranksFromMatches,
  seasonKindWinners,
} from './settlement.js'

/* footballComplete — effective-finish rule for a Premier League gameweek */

test('footballComplete: all fixtures finished', () => {
  const fixtures = [
    { event: 2, finished: true },
    { event: 2, finished: false, finished_provisional: true },
    { event: 3, finished: false }, // other GW, ignored
  ]
  assert.equal(footballComplete(fixtures, 2), true)
})

test('footballComplete: one fixture still live', () => {
  const fixtures = [
    { event: 2, finished: true },
    { event: 2, finished: false, finished_provisional: false },
  ]
  assert.equal(footballComplete(fixtures, 2), false)
})

test('footballComplete: no fixtures for the GW is not complete', () => {
  assert.equal(footballComplete([{ event: 1, finished: true }], 2), false)
  assert.equal(footballComplete([], 2), false)
  assert.equal(footballComplete(null, 2), false)
})

/* h2hResultForMarket — grade a market against its FPL Draft match row */

const payload = { homeEntryId: 4259, awayEntryId: 4898 }

test('h2hResultForMarket: home win, match stored in market orientation', () => {
  const match = {
    league_entry_1: 4259,
    league_entry_2: 4898,
    league_entry_1_points: 61,
    league_entry_2_points: 44,
  }
  assert.deepEqual(h2hResultForMarket(payload, match), {
    result: 'home',
    home: 61,
    away: 44,
  })
})

test('h2hResultForMarket: match stored in flipped orientation re-orients', () => {
  const match = {
    league_entry_1: 4898,
    league_entry_2: 4259,
    league_entry_1_points: 44,
    league_entry_2_points: 61,
  }
  assert.deepEqual(h2hResultForMarket(payload, match), {
    result: 'home',
    home: 61,
    away: 44,
  })
})

test('h2hResultForMarket: draw', () => {
  const match = {
    league_entry_1: 4259,
    league_entry_2: 4898,
    league_entry_1_points: 50,
    league_entry_2_points: 50,
  }
  assert.equal(h2hResultForMarket(payload, match).result, 'draw')
})

test('h2hResultForMarket: away win', () => {
  const match = {
    league_entry_1: 4259,
    league_entry_2: 4898,
    league_entry_1_points: 30,
    league_entry_2_points: 31,
  }
  assert.equal(h2hResultForMarket(payload, match).result, 'away')
})

test('h2hResultForMarket: non-numeric scores mean no result yet', () => {
  const match = {
    league_entry_1: 4259,
    league_entry_2: 4898,
    league_entry_1_points: null,
    league_entry_2_points: 44,
  }
  assert.equal(h2hResultForMarket(payload, match), null)
})

/* championFromMatches — 3/1/0 points with points-for tiebreak */

const m = (a, b, pa, pb, finished = true) => ({
  league_entry_1: a,
  league_entry_2: b,
  league_entry_1_points: pa,
  league_entry_2_points: pb,
  finished,
})

test('championFromMatches: most H2H points wins', () => {
  // 10 beats 20 twice; 20 beats 30 once; 30 beats 10 once → 10 on 6 pts.
  const matches = [m(10, 20, 50, 40), m(10, 20, 55, 45), m(20, 30, 60, 30), m(30, 10, 70, 20)]
  assert.equal(championFromMatches(matches), 10)
})

test('championFromMatches: points-for breaks an H2H points tie', () => {
  // 10 and 20 both finish on 4 pts (a draw plus a win each), but 20's win
  // was much bigger, so 20 takes the title on points-for.
  const matches = [m(10, 20, 40, 40), m(20, 30, 90, 10), m(10, 30, 50, 10)]
  assert.equal(championFromMatches(matches), 20)
})

test('championFromMatches: null while any match is unfinished', () => {
  const matches = [m(10, 20, 50, 40), m(10, 20, 0, 0, false)]
  assert.equal(championFromMatches(matches), null)
  assert.equal(championFromMatches([]), null)
})

test('ranksFromMatches: 1st / last / titan / minnow on an 8-team table', () => {
  // Eight teams, one pairing each: 1 beats 8 … 4 beats 5 on PF so the
  // order is 1..8. Titan is 1–4, Minnow 5–8, last is 8.
  const matches = [
    m(1, 8, 80, 10),
    m(2, 7, 70, 20),
    m(3, 6, 60, 30),
    m(4, 5, 50, 40),
  ]
  const ranked = ranksFromMatches(matches)
  assert.deepEqual(ranked.order, [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual([...seasonKindWinners('outright', ranked)], ['1'])
  assert.deepEqual([...seasonKindWinners('last', ranked)], ['8'])
  assert.deepEqual([...seasonKindWinners('titan', ranked)].sort(), ['1', '2', '3', '4'])
  assert.deepEqual([...seasonKindWinners('minnow', ranked)].sort(), ['5', '6', '7', '8'])
})
