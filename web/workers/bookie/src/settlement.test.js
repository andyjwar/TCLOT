import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  footballComplete,
  footballOfficial,
  h2hResultForMarket,
  championFromMatches,
  playerMarketOutcome,
  ranksFromMatches,
  seasonKindWinners,
  desiredBetGrade,
  creditedPayout,
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

test('footballOfficial: provisional finish is not official', () => {
  const fixtures = [
    { event: 2, finished: true },
    { event: 2, finished: false, finished_provisional: true },
  ]
  assert.equal(footballComplete(fixtures, 2), true)
  assert.equal(footballOfficial(fixtures, 2), false)
  assert.equal(footballOfficial([{ event: 2, finished: true }], 2), true)
  assert.equal(footballOfficial([], 2), false)
})

test('desiredBetGrade: win / lose / void-no-play / void-no-result', () => {
  const bet = { selection: 'away', stake: 10, odds: 2.1 }
  assert.deepEqual(desiredBetGrade(bet, new Set(['away'])), { status: 'won', payout: 21 })
  assert.deepEqual(desiredBetGrade(bet, new Set(['home'])), { status: 'lost', payout: 0 })
  assert.deepEqual(desiredBetGrade({ selection: '4', stake: 10, odds: 8 }, new Set(['1']), new Set(['4'])), {
    status: 'void',
    payout: 10,
  })
  assert.deepEqual(desiredBetGrade(bet, null), { status: 'void', payout: 10 })
})

test('creditedPayout: only terminal paying statuses return coins', () => {
  assert.equal(creditedPayout({ status: 'open', payout: 21 }), 0)
  assert.equal(creditedPayout({ status: 'lost', payout: 0 }), 0)
  assert.equal(creditedPayout({ status: 'won', payout: 21 }), 21)
  assert.equal(creditedPayout({ status: 'void', payout: 10 }), 10)
  assert.equal(creditedPayout({ status: 'cashed_out', payout: 12 }), 12)
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

test('h2hResultForMarket: one-point away win (Balrogs 46–45 Sméagol)', () => {
  const smeagolHome = { homeEntryId: 5220, awayEntryId: 44904 }
  const match = {
    league_entry_1: 5220,
    league_entry_2: 44904,
    league_entry_1_points: 45,
    league_entry_2_points: 46,
  }
  assert.equal(h2hResultForMarket(smeagolHome, match).result, 'away')
  const bet = { selection: 'away', stake: 10, odds: 2.1 }
  assert.deepEqual(desiredBetGrade(bet, new Set(['away'])), { status: 'won', payout: 21 })
  assert.equal(creditedPayout({ status: 'lost', payout: 0 }), 0)
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

/* playerMarketOutcome — player specials graded from draft event/{gw}/live */

const sels = (...ids) => ids.map((elementId) => ({ elementId }))

const live = (byId) =>
  Object.fromEntries(Object.entries(byId).map(([id, stats]) => [id, { stats }]))

test('playerMarketOutcome scorer: every scorer wins, no-shows void, the rest lose', () => {
  const elements = live({
    1: { minutes: 90, goals_scored: 2, total_points: 13 },
    2: { minutes: 78, goals_scored: 1, total_points: 7 },
    3: { minutes: 90, goals_scored: 0, total_points: 2 },
    4: { minutes: 0, goals_scored: 0, total_points: 0 }, // benched → void
    // element 5 missing from the feed entirely (left the league) → void
  })
  const out = playerMarketOutcome('scorer', sels(1, 2, 3, 4, 5), elements)
  assert.deepEqual([...out.winners].sort(), ['1', '2'])
  assert.deepEqual([...out.voided].sort(), ['4', '5'])
})

test('playerMarketOutcome scorer: nobody scoring is a valid all-lose result', () => {
  const elements = live({
    1: { minutes: 90, goals_scored: 0 },
    2: { minutes: 45, goals_scored: 0 },
  })
  const out = playerMarketOutcome('scorer', sels(1, 2), elements)
  assert.equal(out.winners.size, 0)
  assert.equal(out.voided.size, 0)
})

test('playerMarketOutcome toppoints: highest points wins, dead heats all pay', () => {
  const elements = live({
    1: { minutes: 90, total_points: 12 },
    2: { minutes: 90, total_points: 12 },
    3: { minutes: 90, total_points: 9 },
    4: { minutes: 0, total_points: 0 },
  })
  const out = playerMarketOutcome('toppoints', sels(1, 2, 3, 4), elements)
  assert.deepEqual([...out.winners].sort(), ['1', '2'])
  assert.deepEqual([...out.voided], ['4'])
  assert.equal(out.topScore, 12)
})

test('playerMarketOutcome toppoints: negative points can still top a grim pool', () => {
  const elements = live({
    1: { minutes: 90, total_points: -1 },
    2: { minutes: 90, total_points: -3 },
  })
  const out = playerMarketOutcome('toppoints', sels(1, 2), elements)
  assert.deepEqual([...out.winners], ['1'])
  assert.equal(out.topScore, -1)
})

test('playerMarketOutcome: unusable feed or empty pool returns null (retry later)', () => {
  assert.equal(playerMarketOutcome('scorer', sels(1, 2), {}), null)
  assert.equal(playerMarketOutcome('scorer', sels(1, 2), null), null)
  assert.equal(playerMarketOutcome('scorer', [], live({ 1: { minutes: 1 } })), null)
  // toppoints where nobody in the pool played: no result can be derived yet.
  const nobodyPlayed = live({ 1: { minutes: 0 }, 2: { minutes: 0 } })
  assert.equal(playerMarketOutcome('toppoints', sels(1, 2), nobodyPlayed), null)
  assert.equal(playerMarketOutcome('h2h', sels(1), live({ 1: { minutes: 1 } })), null)
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
