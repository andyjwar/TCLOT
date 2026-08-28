import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  recapMenuLabelForStatus,
  defaultRecapView,
  defaultModeForGw,
  lineupsAreLocked,
  visibleRecapOptions,
  gwDeadlineHasPassed,
} from './weeklyRecapView.js'

const gw1 = { gw: 1, recap: {}, preview: {} }
const gw2 = { gw: 2, recap: null, preview: {} }
const options = [gw1, gw2]

const bootstrap = {
  events: {
    data: [{ id: 2, deadline_time: '2026-08-28T17:30:00Z' }],
  },
}

test('menu label is Recap until the GW is live, then Preview', () => {
  assert.equal(recapMenuLabelForStatus('idle'), 'Recap')
  assert.equal(recapMenuLabelForStatus('pre-season'), 'Recap')
  assert.equal(recapMenuLabelForStatus('unknown'), 'Recap')
  assert.equal(recapMenuLabelForStatus('live'), 'Preview')
})

test('lineupsAreLocked is only true while a GW is live', () => {
  assert.equal(lineupsAreLocked('live'), true)
  assert.equal(lineupsAreLocked('idle'), false)
  assert.equal(lineupsAreLocked('pre-season'), false)
})

test('idle hides the unfinished upcoming preview (copied-forward XIs)', () => {
  assert.deepEqual(
    visibleRecapOptions(options, { upcomingGw: 2, liveStatus: 'idle' }),
    [gw1],
  )
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: 1,
      upcomingGw: 2,
      liveStatus: 'idle',
      options,
    }),
    { gw: 1, mode: 'recap', menuLabel: 'Recap' },
  )
})

test('live (deadline passed) defaults to the upcoming Preview', () => {
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: 1,
      upcomingGw: 2,
      liveStatus: 'live',
      options,
    }),
    { gw: 2, mode: 'preview', menuLabel: 'Preview' },
  )
})

test('upcoming recap written → Recap of that week', () => {
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: 2,
      upcomingGw: 2,
      liveStatus: 'idle',
      options: [{ gw: 2, recap: {}, preview: {} }],
    }),
    { gw: 2, mode: 'recap', menuLabel: 'Recap' },
  )
})

test('no upcoming week uses last finished recap', () => {
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: 1,
      upcomingGw: null,
      liveStatus: 'idle',
      options: [gw1],
    }),
    { gw: 1, mode: 'recap', menuLabel: 'Recap' },
  )
})

test('defaultModeForGw: unfinished is preview, finished is recap', () => {
  assert.equal(defaultModeForGw(gw2), 'preview')
  assert.equal(defaultModeForGw(gw1), 'recap')
  assert.equal(defaultModeForGw(null), 'recap')
})

test('gwDeadlineHasPassed follows bootstrap deadline_time', () => {
  assert.equal(
    gwDeadlineHasPassed(bootstrap, 2, Date.parse('2026-08-28T17:29:59Z')),
    false,
  )
  assert.equal(
    gwDeadlineHasPassed(bootstrap, 2, Date.parse('2026-08-28T17:30:00Z')),
    true,
  )
})
