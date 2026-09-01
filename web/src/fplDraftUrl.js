import { viteSameOriginProxyHost } from './viteSameOriginProxyHost.js'

/** Same-origin proxy / direct draft host as Live tab (`useLiveScores`). */
const FPL_DIRECT = 'https://fantasy.premierleague.com/api'
const DRAFT_DIRECT = 'https://draft.premierleague.com/api'

export function fplApiBase() {
  const raw = import.meta.env.VITE_FPL_PROXY_URL
  const trimmed = raw != null ? String(raw).trim() : ''
  if (trimmed !== '') return trimmed.replace(/\/$/, '')
  if (import.meta.env.DEV) return '/__fpl'
  /** `vite preview` (PROD bundle) on loopback — same proxy rules as dev (see `vite.config.js`). */
  if (viteSameOriginProxyHost()) return '/__fpl'
  return FPL_DIRECT
}

/**
 * Resource path under draft.premierleague.com/api — no leading slash.
 */
export function draftResourceUrl(path) {
  const p = String(path).replace(/^\/+/, '')
  const base = fplApiBase()
  if (base !== FPL_DIRECT) {
    return `${base}/draft/${p}`
  }
  if (import.meta.env.DEV) {
    return `/__fpl/draft/${p}`
  }
  return `${DRAFT_DIRECT}/${p}`
}

/** True pick log for a draft: `/draft/{draftId}/choices` (real order, auto-picks included). */
export function draftChoicesUrl(draftId) {
  return draftResourceUrl(`${draftId}/choices`)
}

/** FPL `entry_id` (not internal league_entry id) + GW for squad picks JSON. */
export function draftEntryEventUrl(entryId, gameweek) {
  const base = fplApiBase()
  if (base !== FPL_DIRECT) {
    return `${base}/draft/entry/${entryId}/event/${gameweek}`
  }
  if (import.meta.env.DEV) {
    return `/__fpl/draft/entry/${entryId}/event/${gameweek}`
  }
  return `${DRAFT_DIRECT}/entry/${entryId}/event/${gameweek}`
}

/** Classic `fantasy.premierleague.com/api` path + query (fixtures, bootstrap-static). */
export function classicResourceUrl(pathAndQuery) {
  const pq = String(pathAndQuery).replace(/^\/+/, '')
  const base = fplApiBase()
  if (base !== FPL_DIRECT) {
    return `${base.replace(/\/$/, '')}/${pq}`
  }
  if (import.meta.env.DEV) {
    return `/__fpl/${pq}`
  }
  return `${FPL_DIRECT}/${pq}`
}

export { FPL_DIRECT, DRAFT_DIRECT }
