/**
 * App-wide "user asked for a refresh" bus.
 *
 * Pull-to-refresh lives in App, but live FPL hooks (scores, lineups, waivers)
 * are mounted deeper. Bust the in-memory FPL cache once, then let those
 * hooks refetch. Same event also covers a future explicit refresh button.
 */

import { bustFplLiveCache } from './fplFetchCache.js'

export const TCLOT_REFRESH_EVENT = 'tclot:refresh'

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
