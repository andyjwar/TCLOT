import { useEffect, useState } from 'react'
import { fetchLeagueData, leagueDataCacheKey } from './leagueDataClient.js'

/**
 * Loads `bench-points.json` (legal best XI vs official totals) for the
 * Standings → Stats bench section. Missing artifact resolves to null.
 *
 * @param {boolean} [enabled]
 */
export function useBenchPoints(enabled = true) {
  const [state, setState] = useState({
    report: null,
    loading: Boolean(enabled),
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const v = await leagueDataCacheKey()
        if (cancelled) return
        if (!enabled) {
          setState({ report: null, loading: false })
          return
        }
        const report = await fetchLeagueData('bench-points.json', v)
        if (!cancelled) setState({ report, loading: false })
      } catch {
        if (!cancelled) setState({ report: null, loading: false })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return state
}
