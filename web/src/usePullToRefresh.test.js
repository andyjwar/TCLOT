import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PTR_AT_TOP_EPSILON,
  isScrollAtTop,
  pullMoveDecision,
} from './usePullToRefresh.js'
import {
  RELOAD_QUERY_PARAM,
  reloadAppUrl,
  reloadStandaloneApp,
  requestTclotRefresh,
  stripReloadQuery,
  subscribeTclotRefresh,
  urlWithoutReloadParam,
} from './tclotRefresh.js'
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

test('reloadAppUrl stamps a fresh _r without stacking or dropping other params', () => {
  const stamped = reloadAppUrl('https://tclot.vercel.app/?ptr=1#/players', 1700000000000)
  assert.equal(stamped, `/?ptr=1&${RELOAD_QUERY_PARAM}=1700000000000#/players`)

  const replaced = reloadAppUrl(
    `https://tclot.vercel.app/TCLOT/?${RELOAD_QUERY_PARAM}=old&ptr=1`,
    99,
  )
  assert.equal(replaced, `/TCLOT/?ptr=1&${RELOAD_QUERY_PARAM}=99`)
})

test('urlWithoutReloadParam strips _r or returns null when it is absent', () => {
  assert.equal(urlWithoutReloadParam('https://tclot.vercel.app/'), null)
  assert.equal(
    urlWithoutReloadParam(`https://tclot.vercel.app/?ptr=1&${RELOAD_QUERY_PARAM}=9#h`),
    '/?ptr=1#h',
  )
  assert.equal(
    urlWithoutReloadParam(`https://tclot.vercel.app/?${RELOAD_QUERY_PARAM}=1`),
    '/',
  )
})

test('stripReloadQuery replaceStates the URL without the cache-buster', () => {
  const originalWindow = globalThis.window
  const replaced = []
  globalThis.window = {
    location: { href: `https://tclot.vercel.app/?ptr=1&${RELOAD_QUERY_PARAM}=abc` },
    history: {
      state: { tab: 'live' },
      replaceState(state, _title, url) {
        replaced.push({ state, url })
      },
    },
  }
  try {
    stripReloadQuery()
    assert.equal(replaced.length, 1)
    assert.equal(replaced[0].url, '/?ptr=1')
    assert.equal(replaced[0].state.tab, 'live')
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})

test('reloadStandaloneApp clears Cache Storage then replace()s a cache-busted URL', async () => {
  const originalCaches = globalThis.caches
  const deleted = []
  globalThis.caches = {
    keys: async () => ['tclot-shell', 'other'],
    delete: async (key) => {
      deleted.push(key)
      return true
    },
  }
  const replaced = []
  const locationLike = {
    href: 'https://tclot.vercel.app/?ptr=1',
    replace(url) {
      replaced.push(url)
    },
  }
  try {
    await reloadStandaloneApp(locationLike)
    assert.deepEqual(deleted, ['tclot-shell', 'other'])
    assert.equal(replaced.length, 1)
    assert.match(replaced[0], /^\?ptr=1&_r=\d+$|^\/\?ptr=1&_r=\d+$/)
    const url = new URL(replaced[0], 'https://tclot.vercel.app')
    assert.equal(url.searchParams.get('ptr'), '1')
    assert.ok(url.searchParams.get(RELOAD_QUERY_PARAM))
  } finally {
    if (originalCaches === undefined) delete globalThis.caches
    else globalThis.caches = originalCaches
  }
})

test('reloadStandaloneApp falls back to assigning href when replace throws', async () => {
  const originalCaches = globalThis.caches
  globalThis.caches = {
    keys: async () => [],
    delete: async () => true,
  }
  const locationLike = {
    href: 'https://tclot.vercel.app/',
    replace() {
      throw new Error('replace blocked')
    },
  }
  try {
    await reloadStandaloneApp(locationLike)
    assert.match(locationLike.href, /^\/\?_r=\d+$/)
  } finally {
    if (originalCaches === undefined) delete globalThis.caches
    else globalThis.caches = originalCaches
  }
})
