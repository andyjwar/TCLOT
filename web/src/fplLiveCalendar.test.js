import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  fplEventList,
  pickDeadlinePassedLiveEvent,
  pickDeadlinePassedLiveGw,
} from './fplLiveCalendar.js'

const gw1Finished = {
  id: 1,
  finished: true,
  deadline_time: '2026-08-21T17:30:00Z',
}
const gw2 = {
  id: 2,
  finished: false,
  deadline_time: '2026-08-28T17:30:00Z',
}
const gw3 = {
  id: 3,
  finished: false,
  deadline_time: '2026-09-04T17:30:00Z',
}
const events = [gw1Finished, gw2, gw3]
const justAfterGw2 = new Date('2026-08-28T17:30:00Z')
const beforeGw2 = new Date('2026-08-28T17:29:59Z')

test('fplEventList reads draft `{ data }` and a bare array', () => {
  assert.deepEqual(fplEventList({ data: events }), events)
  assert.deepEqual(fplEventList(events), events)
  assert.deepEqual(fplEventList(null), [])
})

test('pickDeadlinePassedLiveEvent — GW2 deadline flips live off finished GW1', () => {
  // FPL still has events.current = 1 after GW1 finished; next = 2 just locked.
  assert.equal(pickDeadlinePassedLiveGw(events, justAfterGw2), 2)
  assert.equal(pickDeadlinePassedLiveEvent(events, justAfterGw2)?.id, 2)
})

test('pickDeadlinePassedLiveEvent — before the next deadline stays idle', () => {
  assert.equal(pickDeadlinePassedLiveGw(events, beforeGw2), null)
  assert.equal(pickDeadlinePassedLiveEvent(events, beforeGw2), null)
})

test('pickDeadlinePassedLiveEvent — prefers the later locked GW if last week is still unfinished', () => {
  const lagging = [
    { id: 1, finished: false, deadline_time: '2026-08-21T17:30:00Z' },
    gw2,
    gw3,
  ]
  assert.equal(pickDeadlinePassedLiveGw(lagging, justAfterGw2), 2)
})

test('pickDeadlinePassedLiveEvent — wrapped `{ data }` shape', () => {
  assert.equal(
    pickDeadlinePassedLiveGw({ current: 1, next: 2, data: events }, justAfterGw2),
    2,
  )
})

test('pickDeadlinePassedLiveEvent — ignores bad rows', () => {
  assert.equal(pickDeadlinePassedLiveGw([], justAfterGw2), null)
  assert.equal(pickDeadlinePassedLiveGw(null, justAfterGw2), null)
  assert.equal(
    pickDeadlinePassedLiveGw(
      [{ id: 2, finished: false, deadline_time: 'not-a-date' }],
      justAfterGw2,
    ),
    null,
  )
})
