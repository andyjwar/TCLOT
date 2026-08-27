import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_WIRE_STAT_IDS,
  POS_FILTER_ALL,
  WIRE_STAT_CATALOG,
  elementStatsAreCarryOver,
  formatWireStatValue,
  visibleWireColumns,
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

test('formatWireStatValue — DC (total) reads defensive_contribution', () => {
  assert.equal(
    formatWireStatValue(
      'defConTotal',
      { ...EL, defensive_contribution: 21 },
      null,
      false,
    ),
    '21',
  )
})

test('default All tab is GP, 60+, G, A, DC (FPL)', () => {
  assert.deepEqual(DEFAULT_WIRE_STAT_IDS, [
    'gp',
    'sixtyPlus',
    'goals',
    'assists',
    'defConHits',
  ])
  assert.equal(WIRE_STAT_CATALOG.defConHits.label, 'DC (FPL)')
  assert.equal(WIRE_STAT_CATALOG.defConTotal.label, 'DC (total)')
})

test('desktop wire inserts a gap so Pts and stats sit to the right of POS', () => {
  const cols = visibleWireColumns(POS_FILTER_ALL, DEFAULT_WIRE_STAT_IDS)
  const ids = cols.map((c) => c.id)
  const pos = ids.indexOf('pos')
  const gap = ids.indexOf('gap')
  const pts = ids.indexOf('pts')
  assert.equal(ids[0], 'player')
  assert.ok(pos >= 0 && gap === pos + 1 && pts === gap + 1)
  assert.ok(ids.includes('sixtyPlus'))
  assert.ok(ids.includes('defConHits'))
  assert.ok(!ids.includes('defConTotal'))
  assert.equal(ids[ids.length - 1], 'next3')
})

test('portrait wire has no gap column', () => {
  const cols = visibleWireColumns(POS_FILTER_ALL, DEFAULT_WIRE_STAT_IDS, {
    portrait: true,
  })
  assert.ok(!cols.some((c) => c.id === 'gap'))
  assert.equal(cols[0].id, 'player')
})
