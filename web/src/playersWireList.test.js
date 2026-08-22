import test from 'node:test'
import assert from 'node:assert/strict'
import {
  elementStatsAreCarryOver,
  formatWireStatValue,
} from './playersWireList.js'

// Pre-season draft bootstrap: current null, nothing finished.
const PRESEASON_BOOT = {
  events: {
    current: null,
    next: 1,
    data: [
      { id: 1, finished: false },
      { id: 2, finished: false },
    ],
  },
}

test('elementStatsAreCarryOver — true pre-season (current null, nothing finished)', () => {
  assert.equal(elementStatsAreCarryOver(PRESEASON_BOOT), true)
})

test('elementStatsAreCarryOver — false once a GW is current', () => {
  assert.equal(
    elementStatsAreCarryOver({
      events: { current: 1, next: 2, data: [{ id: 1, finished: false }] },
    }),
    false,
  )
  assert.equal(
    elementStatsAreCarryOver({
      events: {
        current: null,
        data: [{ id: 1, is_current: true, finished: false }],
      },
    }),
    false,
  )
})

test('elementStatsAreCarryOver — false once any GW finished (between GWs)', () => {
  assert.equal(
    elementStatsAreCarryOver({
      events: { current: null, data: [{ id: 1, finished: true }] },
    }),
    false,
  )
})

test('elementStatsAreCarryOver — false without events (no signal, show data)', () => {
  assert.equal(elementStatsAreCarryOver(null), false)
  assert.equal(elementStatsAreCarryOver({}), false)
})

const EL = {
  id: 7,
  element_type: 3,
  goals_scored: 5,
  assists: 5,
  saves: 9,
  expected_goals: '4.20',
  form: '3.1',
}

test('formatWireStatValue — blankCarryOver blanks element season stats', () => {
  for (const statId of ['goals', 'assists', 'xg', 'form', 'savePts']) {
    assert.equal(
      formatWireStatValue(statId, EL, null, false, { blankCarryOver: true }),
      '—',
      statId,
    )
  }
})

test('formatWireStatValue — blankCarryOver blanks summary stats too', () => {
  const summary = { gamesPlayed: 3, sixtyPlus: 2, defConHits: 1 }
  for (const statId of ['gp', 'sixtyPlus', 'defConHits']) {
    assert.equal(
      formatWireStatValue(statId, EL, summary, false, { blankCarryOver: true }),
      '—',
      statId,
    )
  }
})

test('formatWireStatValue — blankCarryOver keeps the position label', () => {
  assert.equal(
    formatWireStatValue('pos', EL, null, false, { blankCarryOver: true }),
    'MID',
  )
})

test('formatWireStatValue — without blankCarryOver values render as before', () => {
  assert.equal(formatWireStatValue('goals', EL, null, false), '5')
  assert.equal(formatWireStatValue('xg', EL, null, false), '4.2')
  assert.equal(
    formatWireStatValue('gp', EL, { gamesPlayed: 3 }, false),
    '3',
  )
})
