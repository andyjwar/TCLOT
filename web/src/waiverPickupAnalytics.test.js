import assert from 'node:assert/strict'
import test from 'node:test'
import {
  aggregatePickupTenure,
  isSuccessfulPickup,
  lastGwFromFixtures,
  resolveWaiverAnalyticsLastGw,
} from './waiverPickupAnalytics.js'

const w = (over) => ({
  added: '2026-08-20T13:00:00Z',
  element_in: 94,
  element_out: 1,
  entry: 4895,
  event: 1,
  id: 1,
  kind: 'w',
  result: 'a',
  ...over,
})

const f = (over) => w({ kind: 'f', priority: null, index: null, ...over })

test('isSuccessfulPickup includes waivers and free agents', () => {
  assert.equal(isSuccessfulPickup(w()), true)
  assert.equal(isSuccessfulPickup(f({ id: 2, element_in: 249 })), true)
  assert.equal(isSuccessfulPickup(w({ result: 'do' })), false)
  assert.equal(isSuccessfulPickup(w({ kind: 'd' })), false)
})

test('aggregatePickupTenure ranks free-agent adds with waiver adds', () => {
  const txs = [
    w({ id: 1, element_in: 94, entry: 4895 }),
    f({
      id: 2,
      added: '2026-08-21T08:51:59Z',
      element_in: 249,
      element_out: 166,
      entry: 44841,
    }),
    f({
      id: 3,
      added: '2026-08-21T15:54:16Z',
      element_in: 233,
      element_out: 503,
      entry: 5217,
    }),
  ]
  const cache = {
    1: { 94: 3, 249: 8, 233: 6 },
  }
  const { rows, teamWaiverInTotals } = aggregatePickupTenure(txs, 1, cache)
  assert.equal(rows[0].elementId, 249)
  assert.equal(rows[0].totalPointsForTeam, 8)
  assert.equal(rows[0].freeAgentStints, 1)
  assert.equal(rows[1].elementId, 233)
  assert.equal(rows[1].totalPointsForTeam, 6)
  assert.equal(rows[2].elementId, 94)
  assert.equal(rows[2].totalPointsForTeam, 3)
  assert.equal(rows[2].freeAgentStints, 0)

  const faTeam = teamWaiverInTotals.find((t) => t.entry === 44841)
  assert.equal(faTeam.waiverInCount, 1)
  assert.equal(faTeam.totalWaiverInPoints, 8)
})

test('same-GW drop is never-fielded and omitted from best pickups', () => {
  const txs = [
    w({ id: 10, element_in: 166, element_out: 380, entry: 44841 }),
    f({
      id: 11,
      added: '2026-08-21T08:51:59Z',
      element_in: 249,
      element_out: 166,
      entry: 44841,
    }),
  ]
  const cache = { 1: { 166: 0, 249: 8 } }
  const { rows, teamWaiverInTotals } = aggregatePickupTenure(txs, 1, cache)
  assert.equal(
    rows.find((r) => r.elementId === 166),
    undefined,
  )
  assert.equal(rows[0].elementId, 249)
  assert.equal(teamWaiverInTotals[0].waiverInCount, 1)
  assert.equal(teamWaiverInTotals[0].distinctPlayers, 1)
})

test('lastGwFromFixtures follows started football, not H2H finished', () => {
  const fixtures = [
    { event: 1, finished: true, finished_provisional: true, started: true },
    { event: 2, finished: false, finished_provisional: false, started: true },
    { event: 3, finished: false, finished_provisional: false, started: false },
  ]
  assert.equal(lastGwFromFixtures(fixtures), 2)
})

test('resolveWaiverAnalyticsLastGw uses fixtures when H2H is still open', () => {
  const lastGw = resolveWaiverAnalyticsLastGw({
    details: {
      matches: [
        { event: 1, finished: true },
        { event: 2, finished: false, started: false },
      ],
    },
    fixtures: [
      { event: 1, finished: true, started: true },
      { event: 2, finished: true, finished_provisional: true, started: true },
    ],
    transactions: [{ event: 1 }],
    trades: [],
  })
  assert.equal(lastGw, 2)
})
