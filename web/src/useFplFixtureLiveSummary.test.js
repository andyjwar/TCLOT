import assert from 'node:assert/strict'
import test from 'node:test'
import { deriveLiveSummary } from './useFplFixtureLiveSummary.js'

test('deriveLiveSummary — empty / non-array → null fields', () => {
  assert.deepEqual(deriveLiveSummary([]), { liveFixtureCount: null, minute: null })
  assert.deepEqual(deriveLiveSummary(null), { liveFixtureCount: null, minute: null })
  assert.deepEqual(deriveLiveSummary(undefined), {
    liveFixtureCount: null,
    minute: null,
  })
})

test('deriveLiveSummary — 4 unstarted fixtures → null (pre-kickoff)', () => {
  const fx = [
    { started: false, finished: false, finished_provisional: false, minutes: 0 },
    { started: false, finished: false, finished_provisional: false, minutes: 0 },
    { started: false, finished: false, finished_provisional: false, minutes: 0 },
    { started: false, finished: false, finished_provisional: false, minutes: 0 },
  ]
  assert.deepEqual(deriveLiveSummary(fx), {
    liveFixtureCount: null,
    minute: null,
  })
})

test('deriveLiveSummary — synchronized 4 live at 47\u2032 → count 4, minute 47', () => {
  const fx = [
    { started: true, finished: false, finished_provisional: false, minutes: 47 },
    { started: true, finished: false, finished_provisional: false, minutes: 47 },
    { started: true, finished: false, finished_provisional: false, minutes: 47 },
    { started: true, finished: false, finished_provisional: false, minutes: 47 },
  ]
  assert.deepEqual(deriveLiveSummary(fx), {
    liveFixtureCount: 4,
    minute: 47,
  })
})

test('deriveLiveSummary — staggered minutes → max wins (earliest-kickoff fixture)', () => {
  const fx = [
    { started: true, finished: false, finished_provisional: false, minutes: 80 },
    { started: true, finished: false, finished_provisional: false, minutes: 35 },
    { started: false, finished: false, finished_provisional: false, minutes: 0 },
  ]
  assert.deepEqual(deriveLiveSummary(fx), {
    liveFixtureCount: 2,
    minute: 80,
  })
})

test('deriveLiveSummary — finished + finished_provisional skipped', () => {
  const fx = [
    { started: true, finished: true, finished_provisional: true, minutes: 90 },
    { started: true, finished: false, finished_provisional: true, minutes: 90 },
    { started: true, finished: false, finished_provisional: false, minutes: 22 },
  ]
  assert.deepEqual(deriveLiveSummary(fx), {
    liveFixtureCount: 1,
    minute: 22,
  })
})

test('deriveLiveSummary — between fixture windows (all 4 finished) → null (strip falls back to "· Live")', () => {
  const fx = [
    { started: true, finished: true, finished_provisional: true, minutes: 90 },
    { started: true, finished: true, finished_provisional: true, minutes: 92 },
  ]
  assert.deepEqual(deriveLiveSummary(fx), {
    liveFixtureCount: null,
    minute: null,
  })
})

test('deriveLiveSummary — started but no minute number yet → count w/ null minute', () => {
  const fx = [
    { started: true, finished: false, finished_provisional: false, minutes: null },
    { started: true, finished: false, finished_provisional: false, minutes: undefined },
  ]
  assert.deepEqual(deriveLiveSummary(fx), {
    liveFixtureCount: 2,
    minute: null,
  })
})
