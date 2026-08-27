import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decorateWaiverSwapRows,
  isSuccessfulSwap,
  liveWaiverPollTarget,
  mergeWaiverOutGwRows,
  shouldPollLiveWaivers,
  transactionToWaiverOutRow,
  waiverOutRowsFromTransactions,
} from './liveWaiverMoves.js'

const WT2 = '2026-08-27T17:30:00Z'

const TX_GW2 = {
  id: 9001,
  entry: 10168,
  event: 2,
  kind: 'w',
  result: 'a',
  priority: 1,
  index: 3,
  element_in: 415,
  element_out: 404,
  added: '2026-08-27T17:41:00Z',
}

test('liveWaiverPollTarget — starts at waivers_time, not after ingest grace', () => {
  const events = [
    { id: 1, waivers_time: '2026-08-20T17:30:00Z' },
    { id: 2, waivers_time: WT2 },
  ]
  const atDeadline = Date.parse(WT2)
  assert.equal(liveWaiverPollTarget(events, atDeadline)?.id, 2)
  assert.equal(liveWaiverPollTarget(events, atDeadline + 5 * 60_000)?.id, 2)
  assert.equal(liveWaiverPollTarget(events, atDeadline - 1000), null)
})

test('liveWaiverPollTarget — expires after 36h', () => {
  const events = [{ id: 2, waivers_time: WT2 }]
  const end = Date.parse(WT2) + 36 * 60 * 60 * 1000
  assert.equal(liveWaiverPollTarget(events, end - 1000)?.id, 2)
  assert.equal(liveWaiverPollTarget(events, end), null)
})

test('shouldPollLiveWaivers — requires league, target GW, and a static gap', () => {
  assert.equal(
    shouldPollLiveWaivers({
      leagueId: 1577,
      targetGw: 2,
      staticHasTargetGw: false,
    }),
    true,
  )
  assert.equal(
    shouldPollLiveWaivers({
      leagueId: 1577,
      targetGw: 2,
      staticHasTargetGw: true,
    }),
    false,
  )
  assert.equal(
    shouldPollLiveWaivers({ archiveView: true, leagueId: 1577, targetGw: 2 }),
    false,
  )
  assert.equal(shouldPollLiveWaivers({ leagueId: 1577, targetGw: null }), false)
})

test('isSuccessfulSwap — accepted w/f with a drop only', () => {
  assert.equal(isSuccessfulSwap(TX_GW2), true)
  assert.equal(isSuccessfulSwap({ ...TX_GW2, kind: 'f' }), true)
  assert.equal(isSuccessfulSwap({ ...TX_GW2, result: 'do' }), false)
  assert.equal(isSuccessfulSwap({ ...TX_GW2, result: 'p' }), false)
  assert.equal(isSuccessfulSwap({ ...TX_GW2, element_out: null }), false)
})

test('transactionToWaiverOutRow — matches drops-gw-live keys, points null', () => {
  const row = transactionToWaiverOutRow(TX_GW2)
  assert.equal(row.transactionId, 9001)
  assert.equal(row.gameweek, 2)
  assert.equal(row.transactionKind, 'w')
  assert.equal(row.waiverPriority, 1)
  assert.equal(row.waiverWireIndex, 3)
  assert.equal(row.droppedPlayerGwPoints, null)
  assert.equal(row.pickedUpPlayerGwPoints, null)
  assert.equal(row.liveFromFpl, true)
})

test('waiverOutRowsFromTransactions — keeps successful swaps only', () => {
  const rows = waiverOutRowsFromTransactions([
    TX_GW2,
    { ...TX_GW2, id: 9002, result: 'do' },
    { ...TX_GW2, id: 9003, kind: 'f', priority: null, index: null },
  ])
  assert.equal(rows.length, 2)
  assert.deepEqual(
    rows.map((r) => r.transactionId),
    [9001, 9003],
  )
})

test('mergeWaiverOutGwRows — static wins on id; live fills gaps', () => {
  const staticRows = [
    {
      transactionId: 770283,
      gameweek: 1,
      pickedUpPlayerGwPoints: 2,
    },
  ]
  const liveRows = [
    { transactionId: 770283, gameweek: 1, liveFromFpl: true },
    { transactionId: 9001, gameweek: 2, liveFromFpl: true },
  ]
  const merged = mergeWaiverOutGwRows(staticRows, liveRows)
  assert.equal(merged.length, 2)
  assert.equal(merged[0].pickedUpPlayerGwPoints, 2)
  assert.equal(merged[1].transactionId, 9001)
})

test('decorateWaiverSwapRows — names from league entries + bootstrap', () => {
  const rows = decorateWaiverSwapRows([transactionToWaiverOutRow(TX_GW2)], {
    leagueEntries: [
      { id: 42, entry_id: 10168, entry_name: 'Hackney Rohirrim' },
    ],
    elements: [
      { id: 415, web_name: 'Dorgu', element_type: 3, team: 14 },
      { id: 404, web_name: 'Reijnders', element_type: 3, team: 13 },
    ],
    plTeams: [
      { id: 14, short_name: 'MUN', code: 1 },
      { id: 13, short_name: 'MCI', code: 43 },
    ],
  })
  assert.equal(rows[0].teamName, 'Hackney Rohirrim')
  assert.equal(rows[0].pickedName, 'Dorgu')
  assert.equal(rows[0].droppedName, 'Reijnders')
  assert.equal(rows[0].pickedPos, 'MID')
  assert.equal(rows[0].pickedTeamShort, 'MUN')
  assert.match(rows[0].pickedBadgeUrl, /t1\.png/)
})
