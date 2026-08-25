/**
 * Cache-bust static `league-data/*.json` fetches after each deploy.
 *
 * Vite may bake `VITE_LEAGUE_DATA_REVISION` at build time; otherwise we read
 * `revision.json` (written by write-league-data-revision.mjs) with `no-store`
 * and append `?v=` so browsers/CDNs cannot keep a pre-gameweek-close snapshot
 * of weekly-recaps / season-predictions / etc.
 */
import { leagueDataBase } from './seasonArchive.js'

const DATA_BASE = leagueDataBase()
const BUILD_LEAGUE_DATA_V = String(import.meta.env.VITE_LEAGUE_DATA_REVISION || '').trim()

/**
 * @returns {Promise<{ v: string, builtAt: string | null }>}
 */
export async function fetchLeagueDataRevision() {
  if (BUILD_LEAGUE_DATA_V) {
    return { v: BUILD_LEAGUE_DATA_V, builtAt: null }
  }
  try {
    const r = await fetch(`${DATA_BASE}/revision.json`, { cache: 'no-store' })
    if (!r.ok) return { v: '', builtAt: null }
    const j = await r.json()
    return {
      v: j?.v != null ? String(j.v) : '',
      builtAt: typeof j?.builtAt === 'string' ? j.builtAt : null,
    }
  } catch {
    return { v: '', builtAt: null }
  }
}

/**
 * @param {string} path Relative under league-data/ (e.g. `weekly-recaps.json`)
 * @param {string} [cacheKey]
 */
export function leagueDataUrl(path, cacheKey = '') {
  const base = `${DATA_BASE}/${path}`
  if (!cacheKey) return base
  return `${base}${base.includes('?') ? '&' : '?'}v=${encodeURIComponent(cacheKey)}`
}

/**
 * @param {string} path
 * @returns {Promise<any>}
 */
export async function fetchLeagueDataJson(path) {
  const { v } = await fetchLeagueDataRevision()
  const url = leagueDataUrl(path, v)
  const res = await fetch(url, v ? { cache: 'no-store' } : undefined)
  if (!res.ok) throw new Error(`${path} (${res.status})`)
  return res.json()
}

/**
 * Like {@link fetchLeagueDataJson} but returns `null` on any failure.
 * @param {string} path
 * @returns {Promise<any | null>}
 */
export async function fetchLeagueDataJsonOptional(path) {
  try {
    return await fetchLeagueDataJson(path)
  } catch {
    return null
  }
}
