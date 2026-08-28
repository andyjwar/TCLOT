/**
 * App-wide refresh helpers.
 *
 * Pull-to-refresh lives in App. Live FPL hooks (scores, lineups, waivers)
 * subscribe to `tclot:refresh` for in-place refetches. The installed PWA
 * also needs a real document reload: iOS home-screen apps freeze the
 * start URL until the process is killed, so `location.reload()` on the
 * same URL is a no-op. We navigate to a cache-busted URL instead.
 */

import { bustFplLiveCache } from './fplFetchCache.js'

export const TCLOT_REFRESH_EVENT = 'tclot:refresh'
export const RELOAD_QUERY_PARAM = '_r'

/** Drop cached FPL live payloads and notify mounted hooks to refetch. */
export function requestTclotRefresh() {
  bustFplLiveCache()
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(TCLOT_REFRESH_EVENT))
}

/**
 * @param {() => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribeTclotRefresh(fn) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(TCLOT_REFRESH_EVENT, fn)
  return () => window.removeEventListener(TCLOT_REFRESH_EVENT, fn)
}

/**
 * Same path/query/hash with a fresh `_r` cache-buster. iOS standalone PWAs
 * key their frozen document on the URL, so the query must change.
 *
 * @param {string} href absolute URL
 * @param {number} [now]
 */
export function reloadAppUrl(href, now = Date.now()) {
  const url = new URL(href)
  url.searchParams.delete(RELOAD_QUERY_PARAM)
  url.searchParams.set(RELOAD_QUERY_PARAM, String(now))
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Path+search+hash with `_r` removed, or null when it was not present.
 *
 * @param {string} href absolute URL
 */
export function urlWithoutReloadParam(href) {
  const url = new URL(href)
  if (!url.searchParams.has(RELOAD_QUERY_PARAM)) return null
  url.searchParams.delete(RELOAD_QUERY_PARAM)
  return `${url.pathname}${url.search}${url.hash}`
}

/** After a cache-busted reload, drop `_r` so the visible URL stays clean. */
export function stripReloadQuery() {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  const next = urlWithoutReloadParam(window.location.href)
  if (next == null) return
  window.history.replaceState(window.history.state, '', next)
}

/**
 * Reload the installed app the way force-quitting does: drop Cache Storage,
 * then navigate to a new URL so iOS cannot reuse the frozen document.
 */
export async function reloadStandaloneApp(locationLike = typeof window === 'undefined' ? null : window.location) {
  if (!locationLike) return
  try {
    if (typeof caches !== 'undefined' && caches?.keys) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    /* Cache Storage is optional */
  }
  const next = reloadAppUrl(locationLike.href)
  try {
    locationLike.replace(next)
  } catch {
    locationLike.href = next
  }
}
