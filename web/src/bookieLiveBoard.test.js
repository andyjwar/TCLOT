import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isLiveBoardBet,
  liveBoardBets,
  nextWeeklyDeadlineMs,
} from './bookieLiveBoard.js'

const GW2_DEADLINE = Date.parse('2026-08-28T17:30:00Z')
const GW3_DEADLINE = Date.parse('2026-09-04T17:30:00Z')

const markets = [
  { kind: 'h2h', gw: 2, closesAt: '2026-08-28T17:30:00Z' },
  { kind: 'h2h', gw: 3, closesAt: '2026-09-04T17:30:00Z' },
  { kind: 'last', closesAt: '2027-05-30T13:30:00Z' },
]

test('nextWeeklyDeadlineMs: first later H2H board, ignore season markets', () => {
  assert.equal(nextWeeklyDeadlineMs(markets, 2), GW3_DEADLINE)
  assert.equal(nextWeeklyDeadlineMs(markets, 3), null)
  assert.equal(nextWeeklyDeadlineMs(markets, 1), GW2_DEADLINE)
})

test('isLiveBoardBet: open tickets always stay, including season boards', () => {
  assert.equal(
    isLiveBoardBet({ status: 'open', kind: 'last', gw: null }, markets, GW3_DEADLINE - 1),
    true,
  )
  assert.equal(
    isLiveBoardBet({ status: 'open', kind: 'h2h', gw: 3 }, markets, GW3_DEADLINE + 1),
    true,
  )
})

test('isLiveBoardBet: settled weekly tickets stay until the next GW deadline', () => {
  const won = { status: 'won', kind: 'h2h', gw: 2 }
  assert.equal(isLiveBoardBet(won, markets, GW3_DEADLINE - 1), true)
  assert.equal(isLiveBoardBet(won, markets, GW3_DEADLINE), false)
  assert.equal(isLiveBoardBet({ status: 'lost', kind: 'h2h', gw: 2 }, markets, GW3_DEADLINE - 60_000), true)
  assert.equal(isLiveBoardBet({ status: 'void', kind: 'scorer', gw: 2 }, markets, GW3_DEADLINE - 1), true)
})

test('isLiveBoardBet: settled weekly tickets stay while no later week exists', () => {
  const onlyGw2 = [{ kind: 'h2h', gw: 2, closesAt: '2026-08-28T17:30:00Z' }]
  assert.equal(
    isLiveBoardBet({ status: 'won', kind: 'h2h', gw: 2 }, onlyGw2, Date.parse('2026-09-10T00:00:00Z')),
    true,
  )
})

test('isLiveBoardBet: settled season tickets never linger on the live board', () => {
  assert.equal(
    isLiveBoardBet({ status: 'won', kind: 'last', gw: null }, markets, GW3_DEADLINE - 1),
    false,
  )
})

test('liveBoardBets: mixes open + this-week settled, drops last week after next deadline', () => {
  const openBets = [
    { id: 10, status: 'open', kind: 'last', gw: null },
    { id: 9, status: 'open', kind: 'h2h', gw: 3 },
  ]
  const closedBets = [
    { id: 8, status: 'won', kind: 'h2h', gw: 2 },
    { id: 7, status: 'lost', kind: 'h2h', gw: 2 },
    { id: 6, status: 'won', kind: 'h2h', gw: 1 },
  ]
  const midweek = liveBoardBets({
    openBets,
    closedBets,
    markets,
    nowMs: Date.parse('2026-09-01T12:00:00Z'),
  })
  assert.deepEqual(
    midweek.map((b) => b.id),
    [10, 9, 8, 7],
  )

  const afterGw3 = liveBoardBets({
    openBets,
    closedBets,
    markets,
    nowMs: GW3_DEADLINE,
  })
  assert.deepEqual(
    afterGw3.map((b) => b.id),
    [10, 9],
  )
})
