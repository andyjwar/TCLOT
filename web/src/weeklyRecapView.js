/**
 * Default GW + mode for the Recap / Preview tab.
 *
 * If an unfinished week has a starting-XI preview, that is the default
 * (looking ahead). Once that week's recap is written, the default is Recap
 * (looking back). The FPL Live menu label follows the view.
 */

/** Fallback label when the Recap tab is not mounted (always looking ahead). */
export function recapMenuLabelForStatus(_status) {
  return 'Preview'
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
  const byGw = new Map((options || []).map((g) => [Number(g.gw), g]))
  const upcoming = byGw.get(Number(upcomingGw))
  const last = byGw.get(Number(lastFinishedGw))

  // Lineups are set and the recap is not written yet → Preview.
  if (upcoming?.preview && !upcoming.recap) {
    return { gw: upcoming.gw, mode: 'preview', menuLabel: 'Preview' }
  }
  // That week is done (or there is no upcoming) → Recap.
  if (upcoming?.recap) {
    return { gw: upcoming.gw, mode: 'recap', menuLabel: 'Recap' }
  }
  if (last?.recap) {
    return { gw: last.gw, mode: 'recap', menuLabel: 'Recap' }
  }
  if (upcoming?.preview) {
    return { gw: upcoming.gw, mode: 'preview', menuLabel: 'Preview' }
  }
  const tail = options[options.length - 1]
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
