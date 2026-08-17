import assert from 'node:assert/strict'
import { test } from 'node:test'
import { firstWaiversTimeMs, initialMovesTab } from './seasonOpenLanding.js'

const events = [
  { id: 1, waivers_time: '2026-08-20T17:30:00Z', deadline_time: '2026-08-21T17:30:00Z' },
  { id: 2, waivers_time: '2026-08-27T17:30:00Z', deadline_time: '2026-08-28T17:30:00Z' },
]

test('firstWaiversTimeMs is GW1, not a later week', () => {
  assert.equal(firstWaiversTimeMs(events), Date.parse('2026-08-20T17:30:00Z'))
  assert.equal(firstWaiversTimeMs({ data: events }), Date.parse('2026-08-20T17:30:00Z'))
})

test('Moves lands on Draft until the first Thursday waivers', () => {
  assert.equal(initialMovesTab(events, new Date('2026-08-17T19:00:00Z')), 'draft')
  assert.equal(initialMovesTab(events, new Date('2026-08-20T17:29:59Z')), 'draft')
})

test('Moves lands on Waivers once the first waivers_time has passed', () => {
  assert.equal(initialMovesTab(events, new Date('2026-08-20T17:30:00Z')), 'waivers')
  assert.equal(initialMovesTab(events, new Date('2026-09-01T00:00:00Z')), 'waivers')
})

test('no calendar yet → Draft (post-draft squads live there)', () => {
  assert.equal(initialMovesTab(null), 'draft')
  assert.equal(initialMovesTab([]), 'draft')
})
