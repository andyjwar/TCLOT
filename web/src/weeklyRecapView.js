import { recapFactsForGw } from './seasonPredictionsModel.js'
import { matchupRecapSentences, recapWeekWrapSentences } from './weeklyRecapText.js'
import { namedFixtureFor } from './leagueLore.js'

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

/**
 * Pair baked recaps/previews. Used by the Recap tab and tests.
 *
 * @param {{ gameweeks?: object[], previews?: object[] } | null | undefined} data
 */
export function mergeRecapJsonOptions(data) {
  if (!data) return []
  const recapByGw = new Map((data.gameweeks ?? []).map((g) => [g.gw, g]))
  const previewByGw = new Map((data.previews ?? []).map((g) => [g.gw, g]))
  const gws = new Set([...recapByGw.keys(), ...previewByGw.keys()])
  return [...gws]
    .sort((a, b) => a - b)
    .map((gw) => ({
      gw,
      recap: recapByGw.get(gw) ?? null,
      preview: previewByGw.get(gw) ?? null,
    }))
}

/**
 * Build a results recap from finished H2H rows when `weekly-recaps.json` still
 * thinks the week is upcoming (stale Vercel build, FPL `matches[].finished` lag).
 *
 * @param {object[]} matches Normalized `details.matches` (effective `finished`).
 * @param {object[]} leagueEntries
 * @param {number} gw
 */
export function provisionalRecapFromMatches(matches, leagueEntries, gw) {
  const id = Number(gw)
  if (!Number.isFinite(id) || id < 1) return null
  const entries = Array.isArray(leagueEntries) ? leagueEntries : []
  const entryIds = entries.map((e) => Number(e.id)).filter((n) => Number.isFinite(n))
  const nameById = new Map(
    entries.map((e) => [Number(e.id), e.entry_name || e.entryName || `Team ${e.id}`]),
  )
  const managerById = new Map(
    entries.map((e) => {
      const first = (e.player_first_name ?? '').trim()
      const last = (e.player_last_name ?? '').trim()
      return [Number(e.id), [first, last].filter(Boolean).join(' ') || null]
    }),
  )
  let facts
  try {
    facts = recapFactsForGw(matches, entryIds, nameById, id)
  } catch {
    return null
  }
  if (!facts?.matches?.length) return null

  const teamOut = (t) =>
    t
      ? {
          entryId: t.entryId,
          name: t.name,
          manager: managerById.get(t.entryId) ?? null,
          points: t.points,
          rank: t.rank,
          prevRank: t.prevRank,
          record: t.record,
          streak: t.streak,
          seasonAvg: t.seasonAvg,
          isSeasonHigh: t.isSeasonHigh,
          isWeekHigh: t.isWeekHigh,
          titleOdds: null,
          players: null,
          pickup: null,
        }
      : null

  const matchups = facts.matches.map((row) => {
    const home = teamOut(facts.teams.get(row.home))
    const away = teamOut(facts.teams.get(row.away))
    const winner =
      row.homePts > row.awayPts ? home.entryId : row.awayPts > row.homePts ? away.entryId : null
    const m = {
      gw: id,
      home,
      away,
      winner,
      margin: row.margin,
      odds: null,
      predicted: null,
      h2h: null,
      derby: namedFixtureFor(home.manager, away.manager),
    }
    m.sentences = matchupRecapSentences(m)
    return m
  })

  const weekHigh = facts.superlatives.weekHigh
  const closest = facts.superlatives.closest
  return {
    gw: id,
    provisional: true,
    model: { hits: 0, misses: 0, draws: 0, avgAbsErr: null, upset: null, calls: [] },
    superlatives: {
      weekHigh: weekHigh ? { name: weekHigh.name, points: weekHigh.points } : null,
      closest: closest
        ? {
            homeName: nameById.get(closest.home) ?? String(closest.home),
            awayName: nameById.get(closest.away) ?? String(closest.away),
            margin: closest.margin,
          }
        : null,
      starPlayer: null,
      bestWaiver: null,
      dud: null,
    },
    matchups,
    wrap: recapWeekWrapSentences({ gw: id, matchups }),
  }
}

/**
 * JSON recaps plus any finished GWs the baked file missed.
 *
 * @param {{ gameweeks?: object[], previews?: object[], lastFinishedGw?: number } | null | undefined} data
 * @param {{
 *   matches?: object[],
 *   leagueEntries?: object[],
 *   lastFinishedGw?: number | null,
 * }} [live]
 */
export function mergeRecapOptions(data, live = {}) {
  const options = mergeRecapJsonOptions(data)
  const byGw = new Map(options.map((g) => [Number(g.gw), { ...g }]))
  const matches = live.matches || []
  const entries = live.leagueEntries || []
  const fromMatches = matches
    .filter((m) => m?.finished)
    .map((m) => Number(m.event))
    .filter((n) => Number.isFinite(n) && n >= 1)
  const last = Math.max(
    0,
    Number(data?.lastFinishedGw) || 0,
    Number(live.lastFinishedGw) || 0,
    fromMatches.length ? Math.max(...fromMatches) : 0,
  )
  for (let gw = 1; gw <= last; gw++) {
    const cur = byGw.get(gw) ?? { gw, recap: null, preview: null }
    if (!cur.recap) {
      cur.recap = provisionalRecapFromMatches(matches, entries, gw)
    }
    if (cur.recap || cur.preview) byGw.set(gw, cur)
  }
  return [...byGw.values()].sort((a, b) => a.gw - b.gw)
}
