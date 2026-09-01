import test from 'node:test'
import assert from 'node:assert/strict'
import {
  highlightSettledOnLiveBoard,
  isSettledBetStatus,
  isWeeklyBetKind,
  liveBoardGameweek,
  liveBoardTickets,
} from './bookieLiveBoard.js'

test('isWeeklyBetKind — H2H and player specials only', () => {
  assert.equal(isWeeklyBetKind('h2h'), true)
  assert.equal(isWeeklyBetKind('scorer'), true)
  assert.equal(isWeeklyBetKind('toppoints'), true)
  assert.equal(isWeeklyBetKind('last'), false)
  assert.equal(isWeeklyBetKind('outright'), false)
})

test('isSettledBetStatus — anything but open', () => {
  assert.equal(isSettledBetStatus('open'), false)
  assert.equal(isSettledBetStatus(null), false)
  assert.equal(isSettledBetStatus('won'), true)
  assert.equal(isSettledBetStatus('lost'), true)
  assert.equal(isSettledBetStatus('void'), true)
  assert.equal(isSettledBetStatus('cashed_out'), true)
})

test('liveBoardGameweek — open weekly market wins even if an older GW exists', () => {
  const markets = [
    { kind: 'h2h', gw: 2, open: false },
    { kind: 'h2h', gw: 3, open: true },
    { kind: 'last', gw: null, open: true },
  ]
  assert.equal(liveBoardGameweek(markets), 3)
})

test('liveBoardGameweek — after the deadline, keep the newest weekly board', () => {
  const markets = [
    { kind: 'h2h', gw: 1, open: false },
    { kind: 'scorer', gw: 2, open: false },
    { kind: 'h2h', gw: 2, open: false },
    { kind: 'last', open: true },
  ]
  assert.equal(liveBoardGameweek(markets), 2)
})

test('liveBoardGameweek — empty / no weekly markets', () => {
  assert.equal(liveBoardGameweek([]), null)
  assert.equal(liveBoardGameweek([{ kind: 'outright', open: true }]), null)
  assert.equal(liveBoardGameweek(null), null)
})

test('highlightSettledOnLiveBoard — this week only', () => {
  assert.equal(
    highlightSettledOnLiveBoard({ status: 'lost', kind: 'h2h', gw: 2 }, 2),
    true,
  )
  assert.equal(
    highlightSettledOnLiveBoard({ status: 'won', kind: 'h2h', gw: 1 }, 2),
    false,
  )
  assert.equal(
    highlightSettledOnLiveBoard({ status: 'open', kind: 'h2h', gw: 2 }, 2),
    false,
  )
  assert.equal(
    highlightSettledOnLiveBoard({ status: 'won', kind: 'last', gw: null }, 2),
    false,
  )
})

test('liveBoardTickets — open tickets plus this week\'s settled weekly ones', () => {
  const state = {
    markets: [
      { kind: 'h2h', gw: 2, open: false },
      { kind: 'last', open: true },
    ],
    openBets: [
      { id: 1, status: 'open', kind: 'last', gw: null },
      { id: 2, status: 'open', kind: 'h2h', gw: 2 },
    ],
    closedBets: [
      { id: 3, status: 'lost', kind: 'h2h', gw: 2 },
      { id: 4, status: 'won', kind: 'h2h', gw: 1 },
      { id: 5, status: 'won', kind: 'scorer', gw: 2 },
    ],
  }
  assert.deepEqual(
    liveBoardTickets(state).map((b) => b.id),
    [1, 2, 3, 5],
  )
})

test('liveBoardTickets — next GW markets drop last week\'s settled tickets', () => {
  const state = {
    markets: [{ kind: 'h2h', gw: 3, open: true }],
    openBets: [{ id: 10, status: 'open', kind: 'h2h', gw: 3 }],
    closedBets: [{ id: 3, status: 'lost', kind: 'h2h', gw: 2 }],
  }
  assert.deepEqual(
    liveBoardTickets(state).map((b) => b.id),
    [10],
  )
})
