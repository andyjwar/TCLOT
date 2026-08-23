import { useEffect, useMemo, useState } from 'react'
import { leagueDataBase } from './seasonArchive.js'

/**
 * Module-level cache: the player slide-over can open many times per session
 * and `draft_picks.json` is a static ~120-row build artifact, so one fetch
 * serves every lookup. `null` result = file missing/unusable (fail quiet —
 * the caller hides the draft line rather than erroring the overlay).
 */
let draftPicksPromise = null

function fetchDraftPicksOnce() {
  if (!draftPicksPromise) {
    draftPicksPromise = fetch(`${leagueDataBase()}/draft_picks.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (Array.isArray(j?.picks) && j.picks.length ? j.picks : null))
      .catch(() => null)
  }
  return draftPicksPromise
}

/** Test-only escape hatch to reset the module cache. */
export function __clearDraftPickCache() {
  draftPicksPromise = null
}

/**
 * The original draft-day pick for one FPL element, from the committed
 * `draft_picks.json` (same source as the Draft Board; trades/waivers never
 * rewrite it, so "drafted by" stays a historical fact).
 *
 * @param {number | string | null | undefined} elementId
 * @returns {{
 *   status: 'loading' | 'ready' | 'unavailable',
 *   pick: {
 *     overallPick: number,
 *     round: number,
 *     pickInRound: number,
 *     leagueEntryId: number | null,
 *     teamName: string,
 *   } | null,
 * }} `status: 'ready', pick: null` = the file loaded and this player was
 *   never drafted (waiver/free-agent signing).
 */
export function useDraftPickForElement(elementId) {
  /** `undefined` = fetch in flight, `null` = unavailable, array = loaded. */
  const [picks, setPicks] = useState(
    /** @type {object[] | null | undefined} */ (undefined),
  )

  useEffect(() => {
    let cancel = false
    void fetchDraftPicksOnce().then((list) => {
      if (!cancel) setPicks(list)
    })
    return () => {
      cancel = true
    }
  }, [])

  return useMemo(() => {
    const id = Number(elementId)
    if (!Number.isFinite(id) || picks === null) {
      return { status: 'unavailable', pick: null }
    }
    if (picks === undefined) return { status: 'loading', pick: null }
    const p = picks.find((row) => Number(row?.element) === id)
    return {
      status: 'ready',
      pick: p
        ? {
            overallPick: Number(p.overallPick),
            round: Number(p.round),
            pickInRound: Number(p.pickInRound),
            leagueEntryId: p.leagueEntryId != null ? Number(p.leagueEntryId) : null,
            teamName: p.teamName ?? '—',
          }
        : null,
    }
  }, [picks, elementId])
}
