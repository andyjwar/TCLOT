/**
 * Waivers tab freshness copy — explains lag after `waivers_time`.
 * The tab polls FPL Draft transactions live while static ingest JSON is behind;
 * a gated GitHub Actions deploy still ships the durable `drops-gw-live` file.
 */

import {
  WAIVER_BURST_WINDOW_MS,
  WAIVER_FRESH_WINDOW_MS,
  WAIVER_GRACE_START_MS,
  msUntilNextHourlyCron,
  msUntilNextQuarterHour,
  postWaiverRefreshEvent,
  waiversTimeForGameweek,
} from './waiverRefreshSchedule.js'

/**
 * @param {number} builtAtMs
 * @param {number} nowMs
 * @returns {string | null}
 */
export function formatLeagueDataBuiltAgo(builtAtMs, nowMs = Date.now()) {
  if (!Number.isFinite(builtAtMs) || !Number.isFinite(nowMs)) return null
  const deltaMs = Math.max(0, nowMs - builtAtMs)
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

/**
 * @param {{
 *   draftEvents?: object[] | null,
 *   leagueDataBuiltAt?: string | null,
 *   selectedGw?: number | null,
 *   hasMovesForSelectedGw?: boolean,
 *   isGwInProcessedList?: boolean,
 *   liveFetchStatus?: 'off' | 'loading' | 'ready' | 'error',
 *   hasLiveMovesForSelectedGw?: boolean,
 *   now?: Date,
 * }} input
 * @returns {{ kind: 'grace' | 'awaiting-deploy' | 'stale' | 'live' | 'polling', title: string, message: string } | null}
 */
export function deriveWaiverFreshnessNotice({
  draftEvents,
  leagueDataBuiltAt,
  selectedGw,
  hasMovesForSelectedGw = false,
  isGwInProcessedList = false,
  liveFetchStatus = 'off',
  hasLiveMovesForSelectedGw = false,
  now = new Date(),
}) {
  if (!Array.isArray(draftEvents) || !draftEvents.length) return null
  const gw = Number(selectedGw)
  if (!Number.isFinite(gw) || gw < 1) return null

  const waiversTimeRaw = waiversTimeForGameweek(draftEvents, gw)
  if (!waiversTimeRaw) return null
  const waiversTimeMs = Date.parse(waiversTimeRaw)
  if (!Number.isFinite(waiversTimeMs)) return null

  const nowMs = now.getTime()
  if (nowMs < waiversTimeMs) return null

  const builtAtMs = leagueDataBuiltAt ? Date.parse(leagueDataBuiltAt) : NaN
  const graceEndMs = waiversTimeMs + WAIVER_GRACE_START_MS
  const freshWindowEndMs = waiversTimeMs + WAIVER_FRESH_WINDOW_MS
  const inPostWaiverWindow = nowMs > graceEndMs && nowMs < freshWindowEndMs
  const dataBuiltAfterGrace = Number.isFinite(builtAtMs) && builtAtMs >= graceEndMs
  const gwPresentInBuild = isGwInProcessedList || hasMovesForSelectedGw
  const showingLiveMoves = hasLiveMovesForSelectedGw === true

  if (dataBuiltAfterGrace && gwPresentInBuild && !showingLiveMoves) return null

  if (showingLiveMoves) {
    return {
      kind: 'live',
      title: 'Live FPL results',
      message:
        'Showing processed claims from FPL. Player GW points appear after the next site deploy.',
    }
  }

  if (nowMs < graceEndMs) {
    const polling =
      liveFetchStatus === 'loading' || liveFetchStatus === 'ready'
    return {
      kind: 'grace',
      title: 'Waiver results pending',
      message: polling
        ? 'FPL usually publishes successful claims within ~10 minutes of waivers running. This page checks FPL every 30 seconds.'
        : 'FPL usually publishes successful claims within ~10 minutes of waivers running. This site starts refreshing about 10 minutes after waivers.',
    }
  }

  if (inPostWaiverWindow) {
    if (liveFetchStatus === 'loading' || liveFetchStatus === 'ready') {
      return {
        kind: 'polling',
        title: 'Checking FPL for waiver results',
        message:
          'This page asks FPL every 30 seconds. Results usually appear within ~10 minutes of waivers running. You do not need to wait for a site redeploy.',
      }
    }
    const inBurst = nowMs < waiversTimeMs + WAIVER_BURST_WINDOW_MS
    const msToNext = inBurst ? msUntilNextQuarterHour(nowMs) : msUntilNextHourlyCron(nowMs)
    const minsToNext = Math.max(1, Math.ceil(msToNext / 60_000))
    const builtAgo = formatLeagueDataBuiltAgo(builtAtMs, nowMs)
    const builtPart = builtAgo ? ` Site data last built ${builtAgo}.` : ''
    const cadence = inBurst
      ? 'Moves appear after the site redeploys (every ~15 min for the first 90 min after waivers). Typical total delay is 15–35 minutes.'
      : 'Moves appear after the site redeploys (hourly for ~36h after waivers).'
    return {
      kind: 'awaiting-deploy',
      title: 'Waivers not in this build yet',
      message: `${cadence} Next automatic refresh in ~${minsToNext} min.${builtPart} Reload after deploy — refreshing alone won't fetch new moves.`,
    }
  }

  if (!gwPresentInBuild && nowMs >= waiversTimeMs) {
    const builtAgo = formatLeagueDataBuiltAgo(builtAtMs, nowMs)
    const builtPart = builtAgo ? ` Site data last built ${builtAgo}.` : ''
    return {
      kind: 'stale',
      title: 'Waivers may be missing',
      message: `This gameweek is not in the deployed waiver data yet.${builtPart} Run Actions → Deploy site to Pages → Run workflow (or push to main) to refresh.`,
    }
  }

  return null
}

/**
 * Whether the selected GW is inside the post-waiver refresh window (for tests / diagnostics).
 *
 * @param {object[] | null | undefined} draftEvents
 * @param {number} gameweek
 * @param {number} [nowMs]
 */
export function isInPostWaiverRefreshWindow(draftEvents, gameweek, nowMs = Date.now()) {
  const hit = postWaiverRefreshEvent(draftEvents, nowMs)
  return hit != null && Number(hit.id) === Number(gameweek)
}
