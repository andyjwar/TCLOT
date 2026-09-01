import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateLeaderboardStats,
  betResultBuckets,
  enrichLeaderboardRows,
  nextLeaderboardSort,
  sortLeaderboardRows,
} from './bookieLeaderboardStats.js'

test('betResultBuckets — open stake is live, won is net, lost is stake', () => {
  assert.deepEqual(betResultBuckets({ status: 'open', stake: 40 }), { won: 0, lost: 0, live: 40 })
  assert.deepEqual(betResultBuckets({ status: 'won', stake: 10, payout: 26 }), {
    won: 16,
    lost: 0,
    live: 0,
  })
  assert.deepEqual(betResultBuckets({ status: 'lost', stake: 25, payout: 0 }), {
    won: 0,
    lost: 25,
    live: 0,
  })
  assert.deepEqual(betResultBuckets({ status: 'void', stake: 10, payout: 10 }), {
    won: 0,
    lost: 0,
    live: 0,
  })
})

test('betResultBuckets — cash-out splits to won or lost by net', () => {
  assert.deepEqual(betResultBuckets({ status: 'cashed_out', stake: 100, payout: 125 }), {
    won: 25,
    lost: 0,
    live: 0,
  })
  assert.deepEqual(betResultBuckets({ status: 'cashed_out', stake: 100, payout: 70 }), {
    won: 0,
    lost: 30,
    live: 0,
  })
})

test('aggregateLeaderboardStats — rolls several tickets per punter', () => {
  const by = aggregateLeaderboardStats([
    { entry_id: 1, status: 'won', stake: 10, payout: 26 },
    { entry_id: 1, status: 'lost', stake: 10 },
    { entry_id: 1, status: 'open', stake: 40 },
    { entry_id: 2, status: 'lost', stake: 50 },
  ])
  assert.deepEqual(by.get(1), { won: 16, lost: 10, live: 40 })
  assert.deepEqual(by.get(2), { won: 0, lost: 50, live: 0 })
})

test('enrichLeaderboardRows — API totals beat the recent-bet rollup', () => {
  const rows = enrichLeaderboardRows(
    [{ entryId: 1, name: 'Regorasu', balance: 1050, won: 0, lost: 0, live: 0 }],
    [{ entry_id: 1, status: 'won', stake: 10, payout: 26 }],
  )
  assert.equal(rows[0].won, 0)
  assert.equal(rows[0].lost, 0)
  assert.equal(rows[0].live, 0)
})

test('enrichLeaderboardRows — derives from bets when the API omits columns', () => {
  const rows = enrichLeaderboardRows(
    [{ entryId: 7, name: 'Rohirrim', balance: 960 }],
    [
      { entry_id: 7, status: 'lost', stake: 50 },
      { entry_id: 7, status: 'open', stake: 10 },
    ],
  )
  assert.deepEqual(rows[0], {
    entryId: 7,
    name: 'Rohirrim',
    balance: 960,
    won: 0,
    lost: 50,
    live: 10,
  })
})

test('sortLeaderboardRows — won / lost / live desc, name tie-break', () => {
  const rows = [
    { name: 'Balrogs', balance: 1000, won: 10, lost: 80, live: 0 },
    { name: 'Regorasu', balance: 1050, won: 0, lost: 0, live: 0 },
    { name: 'Rohirrim', balance: 980, won: 40, lost: 20, live: 100 },
  ]
  assert.deepEqual(
    sortLeaderboardRows(rows, 'won', 'desc').map((r) => r.name),
    ['Rohirrim', 'Balrogs', 'Regorasu'],
  )
  assert.deepEqual(
    sortLeaderboardRows(rows, 'lost', 'desc').map((r) => r.name),
    ['Balrogs', 'Rohirrim', 'Regorasu'],
  )
  assert.deepEqual(
    sortLeaderboardRows(rows, 'live', 'desc').map((r) => r.name),
    ['Rohirrim', 'Balrogs', 'Regorasu'],
  )
  assert.deepEqual(
    sortLeaderboardRows(rows, 'balance', 'desc').map((r) => r.name),
    ['Regorasu', 'Balrogs', 'Rohirrim'],
  )
})

test('nextLeaderboardSort — new column starts desc, same column flips', () => {
  assert.deepEqual(nextLeaderboardSort('balance', 'desc', 'won'), { sortKey: 'won', sortDir: 'desc' })
  assert.deepEqual(nextLeaderboardSort('won', 'desc', 'won'), { sortKey: 'won', sortDir: 'asc' })
  assert.deepEqual(nextLeaderboardSort('lost', 'asc', 'lost'), { sortKey: 'lost', sortDir: 'desc' })
})
