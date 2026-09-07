import { useEffect, useState } from 'react'
import { fetchLeagueData, leagueDataCacheKey } from './leagueDataClient.js'
import { clubBadgeIndexFromBootstrap } from './playerClubBadge.js'

/**
 * Club crests for leftover bench sit-outs (and any other element id).
 *
 * @param {boolean} [enabled]
 */
export function usePlayerClubBadges(enabled = true) {
  const [index, setIndex] = useState(
    () => /** @type {Map<number, { badgeUrl: string | null, teamShort: string }>} */ (new Map()),
  )

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const v = await leagueDataCacheKey()
        if (cancelled) return
        const boot = await fetchLeagueData('bootstrap_draft.json', v)
        if (!cancelled) setIndex(clubBadgeIndexFromBootstrap(boot))
      } catch {
        if (!cancelled) setIndex(new Map())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  return index
}
