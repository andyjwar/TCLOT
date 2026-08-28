import assert from 'node:assert/strict'
import test from 'node:test'
import {
  h2hGameweekFullyFinished,
  resolveDefaultWaiverGameweek,
  resolveLiveGameweek,
} from './h2hScheduleGw.js'

const matchesThrough35 = [
  { event: 35, finished: true, league_entry_1: 1, league_entry_2: 2 },
  { event: 36, finished: false, league_entry_1: 1, league_entry_2: 3 },
]

test('h2hGameweekFullyFinished', () => {
  assert.equal(h2hGameweekFullyFinished(matchesThrough35, 35), true)
  assert.equal(h2hGameweekFullyFinished(matchesThrough35, 36), false)
})

test('resolveLiveGameweek — follows FPL current even when H2H GW36 not finished in JSON', () => {
  assert.equal(
    resolveLiveGameweek({
      matches: matchesThrough35,
      bootstrapCurrent: 36,
      fplLiveLandingGw: 36,
      nextEvent: 36,
      previousGameweek: 35,
    }),
    36,
  )
})

test('resolveLiveGameweek — bootstrap alone rolls Live to new GW', () => {
  assert.equal(
    resolveLiveGameweek({
      matches: matchesThrough35,
      bootstrapCurrent: 36,
      previousGameweek: 35,
    }),
    36,
  )
})

test('resolveLiveGameweek — lineup deadline rolls Live to next GW while current lags', () => {
  assert.equal(
    resolveLiveGameweek({
      matches: [
        { event: 1, finished: true, league_entry_1: 1, league_entry_2: 2 },
        { event: 2, finished: false, league_entry_1: 1, league_entry_2: 3 },
      ],
      bootstrapCurrent: 1,
      fplLiveLandingGw: 1,
      nextEvent: 2,
      previousGameweek: 1,
      events: [
        { id: 1, finished: true, deadline_time: '2026-08-21T17:30:00Z' },
        { id: 2, finished: false, deadline_time: '2026-08-28T17:30:00Z' },
      ],
      now: Date.parse('2026-08-28T17:31:00Z'),
    }),
    2,
  )
})

test('resolveLiveGameweek — respects explicit pick', () => {
  assert.equal(
    resolveLiveGameweek({
      matches: matchesThrough35,
      bootstrapCurrent: 36,
      explicitLiveGw: 34,
    }),
    34,
  )
})

test('resolveDefaultWaiverGameweek — no jump to next without waiver rows', () => {
  assert.equal(
    resolveDefaultWaiverGameweek({
      matches: matchesThrough35,
      latestProcessedWaiverGw: 35,
      waiverOutGwRows: [{ gameweek: 35 }],
      bootstrapNext: 36,
      bootstrapCurrent: 36,
      previousGameweek: 35,
    }),
    35,
  )
})

test('resolveDefaultWaiverGameweek — next when analytics exist', () => {
  assert.equal(
    resolveDefaultWaiverGameweek({
      matches: matchesThrough35,
      latestProcessedWaiverGw: 35,
      waiverOutGwRows: [{ gameweek: 36 }],
      bootstrapNext: 36,
    }),
    36,
  )
})
