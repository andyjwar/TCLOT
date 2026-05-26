/**
 * Brand-header status strip helpers — derive the `live` / `idle` / `pre-season` state
 * plus the human-readable copy from data already in `App.jsx` (draft bootstrap events
 * + locally-ingested H2H matches). No new network calls.
 *
 * Spec source: variant 4 of the HEADER · POST-PR-#2 EVOLUTION mockup showcase
 * (`Mockup.jsx#HeroVariantBSeasonAndCrests` + `HeroVariantBStatusStrip`).
 */

/**
 * Compact season label for the status strip — `25/26` for the 2025/26 season.
 * The brand header itself shows the wider `2025/26` form; the strip uses the
 * tighter `25/26` form (matches the mockup copy "GW 1 of 25/26 starts …").
 *
 * @param {string | null | undefined} season Like `2025/26`.
 * @returns {string}
 */
export function seasonShortLabel(season) {
  if (typeof season !== 'string') return ''
  const m = season.match(/^(\d{2})(\d{2})\/(\d{2})$/)
  if (m) return `${m[2]}/${m[3]}`
  return season
}

/**
 * Format an ISO deadline ('2025-08-15T18:30:00Z') as `Aug 15`. Returns null on bad input.
 * @param {string | null | undefined} iso
 * @returns {string | null}
 */
export function formatDeadlineDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(d)
  } catch {
    return null
  }
}

/**
 * Derive the brand-header status strip state purely from bootstrap-derived data.
 *
 * Status definitions (locked for PR #3.7):
 * - `live`: `events.current` exists, its deadline has passed, and `finished === false`.
 *           Live count + minute are not piped through `App.jsx` today; the strip
 *           degrades to `● GW {N} live` and the consumer fills in `liveCount` /
 *           `minute` once a thinner fixtures fetch is wired (out of scope for #3.7).
 * - `idle`: `events.current` is finished (between GWs). Copy: `GW {last} complete ·
 *           GW {next} of {seasonShort} starts {date}`.
 * - `pre-season`: no event has finished yet. Copy: `Pre-season · GW 1 of {seasonShort}
 *           starts {date}`.
 *
 * @param {{
 *   currentEvent?: object | null,
 *   nextEvent?: object | null,
 *   lastFinishedEvent?: object | null,
 *   season?: string,
 *   now?: Date,
 * }} p
 * @returns {{
 *   status: 'live' | 'idle' | 'pre-season' | 'unknown',
 *   liveGw: number | null,
 *   lastFinishedGw: number | null,
 *   nextGw: number | null,
 *   nextDeadlineLabel: string | null,
 *   seasonShort: string,
 * }}
 */
export function deriveBrandHeaderStatus({
  currentEvent,
  nextEvent,
  lastFinishedEvent,
  season = '2025/26',
  now = new Date(),
}) {
  const seasonShort = seasonShortLabel(season)
  const lastFinishedGw =
    lastFinishedEvent?.id != null ? Number(lastFinishedEvent.id) : null
  const nextGw = nextEvent?.id != null ? Number(nextEvent.id) : null

  if (!currentEvent && !nextEvent && !lastFinishedEvent) {
    return {
      status: 'unknown',
      liveGw: null,
      lastFinishedGw: null,
      nextGw: null,
      nextDeadlineLabel: null,
      seasonShort,
    }
  }

  if (currentEvent && currentEvent.finished !== true) {
    const deadline = currentEvent.deadline_time
      ? new Date(currentEvent.deadline_time)
      : null
    const deadlinePassed =
      deadline && !Number.isNaN(deadline.getTime()) && deadline.getTime() <= now.getTime()
    if (deadlinePassed) {
      return {
        status: 'live',
        liveGw: Number(currentEvent.id),
        lastFinishedGw,
        nextGw,
        nextDeadlineLabel: formatDeadlineDate(nextEvent?.deadline_time),
        seasonShort,
      }
    }
  }

  if (lastFinishedEvent) {
    return {
      status: 'idle',
      liveGw: null,
      lastFinishedGw,
      nextGw,
      nextDeadlineLabel: formatDeadlineDate(nextEvent?.deadline_time),
      seasonShort,
    }
  }

  return {
    status: 'pre-season',
    liveGw: null,
    lastFinishedGw: null,
    nextGw: nextGw ?? 1,
    nextDeadlineLabel: formatDeadlineDate(nextEvent?.deadline_time),
    seasonShort,
  }
}
