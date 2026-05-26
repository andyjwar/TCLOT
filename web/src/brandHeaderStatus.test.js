import assert from 'node:assert/strict'
import test from 'node:test'
import {
  deriveBrandHeaderStatus,
  formatDeadlineDate,
  seasonShortLabel,
} from './brandHeaderStatus.js'

test('seasonShortLabel — 2025/26 → 25/26', () => {
  assert.equal(seasonShortLabel('2025/26'), '25/26')
  assert.equal(seasonShortLabel('2026/27'), '26/27')
  assert.equal(seasonShortLabel(''), '')
  assert.equal(seasonShortLabel(null), '')
})

test('formatDeadlineDate — ISO → "Aug 15"', () => {
  assert.equal(formatDeadlineDate('2025-08-15T17:30:00Z'), 'Aug 15')
  assert.equal(formatDeadlineDate(null), null)
  assert.equal(formatDeadlineDate('not-a-date'), null)
})

test('deriveBrandHeaderStatus — live when current event is unfinished and deadline passed', () => {
  const out = deriveBrandHeaderStatus({
    currentEvent: {
      id: 28,
      finished: false,
      deadline_time: '2026-03-08T13:30:00Z',
    },
    nextEvent: { id: 29, deadline_time: '2026-03-15T13:30:00Z' },
    lastFinishedEvent: { id: 27 },
    season: '2025/26',
    now: new Date('2026-03-08T15:00:00Z'),
  })
  assert.equal(out.status, 'live')
  assert.equal(out.liveGw, 28)
  assert.equal(out.seasonShort, '25/26')
})

test('deriveBrandHeaderStatus — idle (between GWs) when last is finished and next deadline future', () => {
  const out = deriveBrandHeaderStatus({
    currentEvent: { id: 28, finished: true, deadline_time: '2026-03-08T13:30:00Z' },
    nextEvent: { id: 29, deadline_time: '2026-03-15T13:30:00Z' },
    lastFinishedEvent: { id: 28 },
    season: '2025/26',
    now: new Date('2026-03-10T10:00:00Z'),
  })
  assert.equal(out.status, 'idle')
  assert.equal(out.lastFinishedGw, 28)
  assert.equal(out.nextGw, 29)
  assert.equal(out.nextDeadlineLabel, 'Mar 15')
})

test('deriveBrandHeaderStatus — pre-season when no event has finished', () => {
  const out = deriveBrandHeaderStatus({
    currentEvent: null,
    nextEvent: { id: 1, deadline_time: '2026-08-14T17:30:00Z' },
    lastFinishedEvent: null,
    season: '2026/27',
    now: new Date('2026-06-01T10:00:00Z'),
  })
  assert.equal(out.status, 'pre-season')
  assert.equal(out.nextGw, 1)
  assert.equal(out.seasonShort, '26/27')
  assert.equal(out.nextDeadlineLabel, 'Aug 14')
})

test('deriveBrandHeaderStatus — unknown when bootstrap not loaded yet', () => {
  const out = deriveBrandHeaderStatus({
    currentEvent: null,
    nextEvent: null,
    lastFinishedEvent: null,
  })
  assert.equal(out.status, 'unknown')
})

test('deriveBrandHeaderStatus — post-season (no events.next) still classified idle; consumer drops the "next" copy', () => {
  const out = deriveBrandHeaderStatus({
    currentEvent: null,
    nextEvent: null,
    lastFinishedEvent: { id: 38 },
    season: '2025/26',
    now: new Date('2026-05-26T10:00:00Z'),
  })
  assert.equal(out.status, 'idle')
  assert.equal(out.lastFinishedGw, 38)
  assert.equal(out.nextGw, null)
  assert.equal(out.nextDeadlineLabel, null)
})

test('deriveBrandHeaderStatus — current event but deadline not yet → falls back to idle/pre-season', () => {
  const out = deriveBrandHeaderStatus({
    currentEvent: {
      id: 29,
      finished: false,
      deadline_time: '2026-03-15T13:30:00Z',
    },
    nextEvent: { id: 30, deadline_time: '2026-03-22T13:30:00Z' },
    lastFinishedEvent: { id: 28 },
    now: new Date('2026-03-12T10:00:00Z'),
  })
  assert.equal(out.status, 'idle')
})
