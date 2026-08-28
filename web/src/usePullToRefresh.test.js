import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PTR_AT_TOP_EPSILON,
  isScrollAtTop,
  pullMoveDecision,
} from './usePullToRefresh.js'
import { requestTclotRefresh, subscribeTclotRefresh } from './tclotRefresh.js'
import { fetchFplJsonCached } from './fplFetchCache.js'

test('isScrollAtTop treats iOS leftover scrollY as the top', () => {
  assert.equal(isScrollAtTop(0), true)
  assert.equal(isScrollAtTop(0.5), true)
  assert.equal(isScrollAtTop(1.9), true)
  assert.equal(isScrollAtTop(PTR_AT_TOP_EPSILON), true)
  assert.equal(isScrollAtTop(PTR_AT_TOP_EPSILON + 0.1), false)
  assert.equal(isScrollAtTop(48), false)
})

test('pullMoveDecision claims a downward pull on the first move so iOS cannot steal it', () => {
  const firstDown = pullMoveDecision({ dx: 0, dy: 4, engaged: false, slop: 10 })
  assert.equal(firstDown.tracking, true)
  assert.equal(firstDown.engaged, false)
  assert.equal(firstDown.preventDefault, true)

  const engage = pullMoveDecision({ dx: 2, dy: 12, engaged: false, slop: 10 })
  assert.equal(engage.tracking, true)
  assert.equal(engage.engaged, true)
  assert.equal(engage.preventDefault, true)

  const scrollUp = pullMoveDecision({ dx: 0, dy: -8, engaged: false })
  assert.equal(scrollUp.tracking, false)
  assert.equal(scrollUp.preventDefault, false)

  const swipe = pullMoveDecision({ dx: 30, dy: 4, engaged: false })
  assert.equal(swipe.tracking, false)
  assert.equal(swipe.preventDefault, false)
})

test('requestTclotRefresh busts the FPL cache and notifies subscribers', async () => {
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  let fetchCount = 0
  globalThis.fetch = async () => {
    fetchCount += 1
    return {
      ok: true,
      json: async () => ({ n: fetchCount }),
    }
  }
  globalThis.window = new EventTarget()

  try {
    const url = 'https://example.test/api/event/2/live'
    await fetchFplJsonCached(url, { ttlMs: 60_000 })
    await fetchFplJsonCached(url, { ttlMs: 60_000 })
    assert.equal(fetchCount, 1, 'TTL cache should serve the second call')

    let noticed = 0
    const unsub = subscribeTclotRefresh(() => {
      noticed += 1
    })
    requestTclotRefresh()
    assert.equal(noticed, 1)

    await fetchFplJsonCached(url, { ttlMs: 60_000 })
    assert.equal(fetchCount, 2, 'refresh should bust the cache so the next load hits the network')
    unsub()
  } finally {
    globalThis.fetch = originalFetch
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})
