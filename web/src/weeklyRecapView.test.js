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

test('menu label is Recap when idle, Preview otherwise', () => {
  assert.equal(recapMenuLabelForStatus('idle'), 'Recap')
  assert.equal(recapMenuLabelForStatus('live'), 'Preview')
  assert.equal(recapMenuLabelForStatus('pre-season'), 'Preview')
  assert.equal(recapMenuLabelForStatus('unknown'), 'Preview')
  assert.equal(recapMenuLabelForStatus(null), 'Preview')
})

test('live / pre-season default to the upcoming GW preview', () => {
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: 1,
      upcomingGw: 2,
      liveStatus: 'live',
      options,
    }),
    { gw: 2, mode: 'preview', menuLabel: 'Preview' },
  )
  assert.equal(
    defaultRecapView({
      lastFinishedGw: 1,
      upcomingGw: 2,
      liveStatus: 'pre-season',
      options,
    }).mode,
    'preview',
  )
})

test('idle defaults to the last finished recap, not the next preview', () => {
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

test('season complete (no upcoming) uses last recap', () => {
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

test('missing status prefers upcoming preview, not last recap', () => {
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: 1,
      upcomingGw: 2,
      liveStatus: null,
      options,
    }),
    { gw: 2, mode: 'preview', menuLabel: 'Preview' },
  )
})

test('defaultModeForGw: unfinished is preview, finished is recap', () => {
  assert.equal(defaultModeForGw(gw2), 'preview')
  assert.equal(defaultModeForGw(gw1), 'recap')
  assert.equal(defaultModeForGw(null), 'recap')
})
