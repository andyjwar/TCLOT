import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { draftResourceUrl } from './fplDraftUrl.js'
import { bustFplLiveCache, fetchFplJsonCached } from './fplFetchCache.js'
import {
  LIVE_WAIVER_POLL_FAST_MS,
  LIVE_WAIVER_POLL_SLOW_MS,
  decorateWaiverSwapRows,
  rowsCoverGameweek,
  shouldPollLiveWaivers,
  waiverOutRowsFromTransactions,
} from './liveWaiverMoves.js'

/**
 * While static `drops-gw-live` lags FPL after `waivers_time`, poll the draft
 * transactions feed and return decorated swap rows for the Waivers tab.
 *
 * @param {{
 *   leagueId?: number | null,
 *   leagueEntries?: object[],
 *   archiveView?: boolean,
 *   targetGw?: number | null,
 *   staticHasTargetGw?: boolean,
 * }} opts
 */
export function useLiveWaiverMoves({
  leagueId,
  leagueEntries = [],
  archiveView = false,
  targetGw = null,
  staticHasTargetGw = false,
} = {}) {
  const enabled = shouldPollLiveWaivers({
    archiveView,
    leagueId,
    targetGw,
    staticHasTargetGw,
  })

  const [rows, setRows] = useState([])
  const [status, setStatus] = useState(/** @type {'off' | 'loading' | 'ready' | 'error'} */ ('off'))
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const leagueEntriesRef = useRef(leagueEntries)
  leagueEntriesRef.current = leagueEntries

  const load = useCallback(async () => {
    if (!enabled) return
    const id = Number(leagueId)
    setStatus((prev) => (prev === 'ready' ? prev : 'loading'))
    try {
      const [txPayload, boot] = await Promise.all([
        fetchFplJsonCached(draftResourceUrl(`draft/league/${id}/transactions`), {
          label: 'draft league transactions',
        }),
        fetchFplJsonCached(draftResourceUrl('bootstrap-static'), {
          label: 'draft bootstrap-static',
        }).catch(() => null),
      ])
      const raw = waiverOutRowsFromTransactions(txPayload?.transactions)
      const decorated = decorateWaiverSwapRows(raw, {
        leagueEntries: leagueEntriesRef.current,
        elements: boot?.elements,
        plTeams: boot?.teams,
      })
      setRows(decorated)
      setError(null)
      setStatus('ready')
    } catch (e) {
      setError(e?.message || String(e))
      setStatus('error')
    }
  }, [enabled, leagueId])

  useEffect(() => {
    if (!enabled) {
      setRows([])
      setStatus('off')
      setError(null)
      return undefined
    }
    void load()
    return undefined
  }, [enabled, load])

  const hasTargetMoves = rowsCoverGameweek(rows, targetGw)
  const pollMs = hasTargetMoves
    ? LIVE_WAIVER_POLL_SLOW_MS
    : LIVE_WAIVER_POLL_FAST_MS

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined
    const id = window.setInterval(() => void load(), pollMs)
    return () => window.clearInterval(id)
  }, [enabled, load, pollMs])

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return undefined
    const onVis = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [enabled, load])

  const refetch = useCallback(async () => {
    bustFplLiveCache()
    await load()
  }, [load])

  return useMemo(
    () => ({
      enabled,
      status: enabled && status === 'off' ? 'loading' : status,
      error,
      rows,
      hasTargetMoves,
      refetch,
    }),
    [enabled, status, error, rows, hasTargetMoves, refetch],
  )
}
