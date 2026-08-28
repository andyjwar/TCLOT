import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TCLOT_VIEW_STORAGE_KEY,
  emptyTclotViewState,
  parseTclotViewState,
  readTclotViewState,
  patchTclotViewState,
  fixtureIndexFromViewState,
  fixtureTabIndexFromId,
} from './tclotViewState.js'

test('parseTclotViewState keeps a live scorecard and drops junk', () => {
  const ok = parseTclotViewState({
    dashboardView: 'fplLive',
    fplLiveTab: 'live',
    liveGw: 2,
    fixture: { homeId: 10, awayId: 20, gameweek: 2 },
    fixtureTab: 'match',
  })
  assert.deepEqual(ok, {
    dashboardView: 'fplLive',
    fplLiveTab: 'live',
    liveGw: 2,
    fixture: { homeId: 10, awayId: 20, gameweek: 2 },
    fixtureTab: 'match',
  })

  const junk = parseTclotViewState({
    dashboardView: 'preseason',
    fplLiveTab: 'vibes',
    liveGw: 99,
    fixture: { homeId: 'x', awayId: 2, gameweek: 1 },
    fixtureTab: 'gossip',
  })
  assert.deepEqual(junk, emptyTclotViewState())
})

test('fixtureIndexFromViewState finds the pairing on the same GW only', () => {
  const fixtures = [
    { homeId: 1, awayId: 2 },
    { homeId: 10, awayId: 20 },
  ]
  assert.equal(
    fixtureIndexFromViewState(
      fixtures,
      { homeId: 10, awayId: 20, gameweek: 2 },
      2,
    ),
    1,
  )
  assert.equal(
    fixtureIndexFromViewState(
      fixtures,
      { homeId: 10, awayId: 20, gameweek: 1 },
      2,
    ),
    null,
  )
  assert.equal(
    fixtureIndexFromViewState(
      fixtures,
      { homeId: 99, awayId: 20, gameweek: 2 },
      2,
    ),
    null,
  )
})

test('fixtureTabIndexFromId maps Match / Lineups and falls back to Match', () => {
  assert.equal(fixtureTabIndexFromId('match'), 0)
  assert.equal(fixtureTabIndexFromId('lineups'), 1)
  assert.equal(fixtureTabIndexFromId('odds'), 3)
  assert.equal(fixtureTabIndexFromId('nope'), 0)
  assert.equal(fixtureTabIndexFromId(null), 0)
})

test('patchTclotViewState merges and can clear the open fixture', () => {
  const store = new Map()
  const original = globalThis.window
  globalThis.window = {
    sessionStorage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v)
      },
    },
  }
  try {
    patchTclotViewState({
      dashboardView: 'fplLive',
      fplLiveTab: 'live',
      liveGw: 2,
      fixture: { homeId: 10, awayId: 20, gameweek: 2 },
      fixtureTab: 'stats',
    })
    assert.deepEqual(readTclotViewState().fixture, {
      homeId: 10,
      awayId: 20,
      gameweek: 2,
    })
    patchTclotViewState({ fixture: null, fixtureTab: null })
    const after = readTclotViewState()
    assert.equal(after.dashboardView, 'fplLive')
    assert.equal(after.fplLiveTab, 'live')
    assert.equal(after.fixture, null)
    assert.equal(after.fixtureTab, null)
    assert.ok(store.get(TCLOT_VIEW_STORAGE_KEY))
  } finally {
    if (original === undefined) delete globalThis.window
    else globalThis.window = original
  }
})
