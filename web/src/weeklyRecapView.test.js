import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  recapMenuLabelForStatus,
  defaultRecapView,
  defaultModeForGw,
} from './weeklyRecapView.js'

const gw1 = { gw: 1, recap: {}, preview: {} }
const gw2 = { gw: 2, recap: null, preview: {} }
const options = [gw1, gw2]

test('unmounted menu fallback is Preview (looking ahead until a recap is shown)', () => {
  assert.equal(recapMenuLabelForStatus('idle'), 'Preview')
  assert.equal(recapMenuLabelForStatus('live'), 'Preview')
  assert.equal(recapMenuLabelForStatus('pre-season'), 'Preview')
})

test('unfinished upcoming preview is the default, even when idle between GWs', () => {
  for (const liveStatus of ['idle', 'live', 'pre-season', null]) {
    assert.deepEqual(
      defaultRecapView({
        lastFinishedGw: 1,
        upcomingGw: 2,
        liveStatus,
        options,
      }),
      { gw: 2, mode: 'preview', menuLabel: 'Preview' },
      liveStatus,
    )
  }
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

test('no last recap falls through to upcoming preview', () => {
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: null,
      upcomingGw: 2,
      liveStatus: 'idle',
      options: [gw2],
    }),
    { gw: 2, mode: 'preview', menuLabel: 'Preview' },
  )
})

test('defaultModeForGw: unfinished is preview, finished is recap', () => {
  assert.equal(defaultModeForGw(gw2), 'preview')
  assert.equal(defaultModeForGw(gw1), 'recap')
  assert.equal(defaultModeForGw(null), 'recap')
})
