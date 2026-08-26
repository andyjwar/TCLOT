import { useEffect, useMemo, useState } from 'react'
import { leagueDataBase } from './seasonArchive.js'
import { waiverHistoryForElement } from './playerWaiverHistory.js'

/**
 * Data for the player card's "Waivers" section: the committed
 * `transactions.json` (draft API waiver/free-agent log) joined with
 * `details.json` (FPL entry → manager team name / league-entry id) and
 * `fpl-mini.json` (element id → name, for the swapped player). All three are
 * small static build artifacts, so one module-cached fetch serves every
 * slide-over open — same pattern as `useDraftPickForElement`. Any file
 * missing → fail quiet (`unavailable`) and the caller hides the section.
 */
let waiverBundlePromise = null

function fetchOptionalJson(name) {
  return fetch(`${leagueDataBase()}/${name}`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
}

function fetchWaiverBundleOnce() {
  if (!waiverBundlePromise) {
    waiverBundlePromise = Promise.all([
      fetchOptionalJson('transactions.json'),
      fetchOptionalJson('details.json'),
      fetchOptionalJson('fpl-mini.json'),
    ]).then(([tx, details, fplMini]) => {
      const transactions = Array.isArray(tx?.transactions) ? tx.transactions : null
      if (!transactions) return null
      const managerByEntry = new Map(
        (details?.league_entries || [])
          .filter((e) => e?.entry_id != null)
          .map((e) => [
            Number(e.entry_id),
            {
              leagueEntryId: e.id != null ? Number(e.id) : null,
              teamName: String(e.entry_name ?? '').trim() || `Team ${e.entry_id}`,
            },
          ]),
      )
      const elementById = new Map(
        (fplMini?.elements || []).map((el) => [Number(el.id), el]),
      )
      return { transactions, managerByEntry, elementById }
    })
  }
  return waiverBundlePromise
}

/** Test-only escape hatch to reset the module cache. */
export function __clearWaiverHistoryCache() {
  waiverBundlePromise = null
}

/**
 * @param {number | string | null | undefined} elementId
 * @returns {{
 *   status: 'loading' | 'ready' | 'unavailable',
 *   events: Array<import('./playerWaiverHistory.js') extends never ? never : {
 *     type: 'in' | 'out',
 *     txId: number,
 *     gw: number,
 *     kind: 'w' | 'f',
 *     endGw?: number | null,
 *     manager: { leagueEntryId: number | null, teamName: string },
 *     otherElement: object | null,
 *     otherElementId: number | null,
 *   }>,
 *   failedClaims: Array<{ gw: number, manager: { leagueEntryId: number | null, teamName: string } }>,
 * }} `status: 'ready', events: []` = the log loaded and this player has no
 *   accepted moves (drafted and never moved, or never owned).
 */
export function useWaiverHistoryForElement(elementId) {
  /** `undefined` = fetch in flight, `null` = unavailable, object = loaded. */
  const [bundle, setBundle] = useState(
    /** @type {object | null | undefined} */ (undefined),
  )

  useEffect(() => {
    let cancel = false
    void fetchWaiverBundleOnce().then((b) => {
      if (!cancel) setBundle(b)
    })
    return () => {
      cancel = true
    }
  }, [])

  return useMemo(() => {
    const id = Number(elementId)
    if (!Number.isFinite(id) || bundle === null) {
      return { status: 'unavailable', events: [], failedClaims: [] }
    }
    if (bundle === undefined) {
      return { status: 'loading', events: [], failedClaims: [] }
    }
    const { transactions, managerByEntry, elementById } = bundle
    const managerFor = (entry) =>
      managerByEntry.get(Number(entry)) ?? {
        leagueEntryId: null,
        teamName: `Team ${entry}`,
      }
    const { events, failedClaims } = waiverHistoryForElement(transactions, id)
    return {
      status: 'ready',
      events: events.map((e) => ({
        ...e,
        manager: managerFor(e.entry),
        otherElementId: e.otherElement,
        otherElement:
          e.otherElement != null ? (elementById.get(e.otherElement) ?? null) : null,
      })),
      failedClaims: failedClaims.map((c) => ({
        gw: c.gw,
        manager: managerFor(c.entry),
      })),
    }
  }, [bundle, elementId])
}
