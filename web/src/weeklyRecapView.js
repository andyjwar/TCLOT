/**
 * Default GW + mode for the Recap / Preview tab.
 *
 * Looking ahead (live GW, or pre-season with XIs): Preview from starting
 * lineups. Looking back (GW complete / idle): the last finished recap.
 * The FPL Live sub-nav label follows that.
 */

/** @param {'live' | 'idle' | 'pre-season' | 'unknown' | null | undefined} status */
export function recapMenuLabelForStatus(status) {
  return status === 'idle' ? 'Recap' : 'Preview'
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
  const lookingAhead = liveStatus !== 'idle'

  if (lookingAhead && upcoming?.preview) {
    return { gw: upcoming.gw, mode: 'preview', menuLabel: 'Preview' }
  }
  if (last?.recap) {
    return { gw: last.gw, mode: 'recap', menuLabel: 'Recap' }
  }
  if (upcoming?.preview) {
    return { gw: upcoming.gw, mode: 'preview', menuLabel: 'Preview' }
  }
  const tail = options[options.length - 1]
  if (!tail) return { gw: null, mode: 'recap', menuLabel: recapMenuLabelForStatus(liveStatus) }
  const mode = tail.recap && tail.preview ? (lookingAhead ? 'preview' : 'recap') : tail.recap ? 'recap' : 'preview'
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
