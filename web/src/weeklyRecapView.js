/**
 * Default GW + mode for the Recap / Preview tab.
 *
 * An unfinished week's look-forward is only a Preview after the FPL lineup
 * deadline (status `live`). Until then the default is last week's Recap.
 * FPL Draft copies last week's XI forward automatically, so a full 11 before
 * the deadline is not "lineups are set".
 */

/** Draft bootstrap stores events as `{ data: [] }` or a bare array. */
export function draftEventsList(bootstrap) {
  const ev = bootstrap?.events
  if (Array.isArray(ev)) return ev
  if (Array.isArray(ev?.data)) return ev.data
  return []
}

/**
 * True once this GW's `deadline_time` has elapsed (XIs locked).
 * @param {object | null | undefined} bootstrap
 * @param {number | null | undefined} gw
 * @param {number} [now]
 */
export function gwDeadlineHasPassed(bootstrap, gw, now = Date.now()) {
  const id = Number(gw)
  if (!Number.isFinite(id)) return false
  const ev = draftEventsList(bootstrap).find((e) => Number(e?.id) === id)
  const t = Date.parse(String(ev?.deadline_time ?? ''))
  return Number.isFinite(t) && Number(now) >= t
}

/** Unfinished-week Preview is valid only while a GW is live (deadline passed). */
export function lineupsAreLocked(status) {
  return status === 'live'
}

/** Fallback label when the Recap tab is not mounted. */
export function recapMenuLabelForStatus(status) {
  return status === 'live' ? 'Preview' : 'Recap'
}

/**
 * Drop the upcoming week's copied-forward preview until lineups lock.
 *
 * @param {Array<{ gw: number, recap?: object | null, preview?: object | null }>} options
 * @param {{ upcomingGw?: number | null, liveStatus?: string | null }} [p]
 */
export function visibleRecapOptions(options, { upcomingGw = null, liveStatus = null } = {}) {
  const locked = lineupsAreLocked(liveStatus)
  return (options || [])
    .map((g) => {
      const upcomingUnfinished = Number(g.gw) === Number(upcomingGw) && !g.recap
      if (upcomingUnfinished && !locked) return { ...g, preview: null }
      return g
    })
    .filter((g) => g.recap || g.preview)
}

/**
 * @param {{
 *   lastFinishedGw?: number | null,
 *   upcomingGw?: number | null,
 *   liveStatus?: 'live' | 'idle' | 'pre-season' | 'unknown' | null,
 *   options?: Array<{ gw: number, recap?: object | null, preview?: object | null }>,
 * }} p
 * @returns {{ gw: number | null, mode: 'preview' | 'recap', menuLabel: 'Preview' | 'Recap' }}
 */
export function defaultRecapView({
  lastFinishedGw = null,
  upcomingGw = null,
  liveStatus = null,
  options = [],
} = {}) {
  const visible = visibleRecapOptions(options, { upcomingGw, liveStatus })
  const byGw = new Map(visible.map((g) => [Number(g.gw), g]))
  const upcoming = byGw.get(Number(upcomingGw))
  const last = byGw.get(Number(lastFinishedGw))

  if (upcoming?.preview && !upcoming.recap) {
    return { gw: upcoming.gw, mode: 'preview', menuLabel: 'Preview' }
  }
  if (upcoming?.recap) {
    return { gw: upcoming.gw, mode: 'recap', menuLabel: 'Recap' }
  }
  if (last?.recap) {
    return { gw: last.gw, mode: 'recap', menuLabel: 'Recap' }
  }
  if (upcoming?.preview) {
    return { gw: upcoming.gw, mode: 'preview', menuLabel: 'Preview' }
  }
  const tail = visible[visible.length - 1]
  if (!tail) {
    return { gw: null, mode: 'recap', menuLabel: recapMenuLabelForStatus(liveStatus) }
  }
  const mode = defaultModeForGw(tail)
  return {
    gw: tail.gw,
    mode,
    menuLabel: mode === 'preview' ? 'Preview' : 'Recap',
  }
}

/** Default mode for a picked GW: unfinished → preview; finished → recap. */
export function defaultModeForGw(option) {
  if (!option) return 'recap'
  if (option.preview && !option.recap) return 'preview'
  if (option.recap) return 'recap'
  return 'preview'
}
