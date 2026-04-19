import { useEffect } from 'react'
import { teamLogoSrcList } from './TeamAvatar'

const DEFAULT_ICON = `${import.meta.env.BASE_URL}favicon.svg`

function inferIconType(url) {
  const u = String(url).toLowerCase()
  if (u.endsWith('.svg')) return 'image/svg+xml'
  if (u.endsWith('.webp')) return 'image/webp'
  if (u.endsWith('.png')) return 'image/png'
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg'
  return 'image/png'
}

/**
 * Sets `document` favicon to the league leader's team logo when `leagueEntryId` is set;
 * otherwise restores the default bolt SVG.
 * @param {number | null | undefined} leagueEntryId — `league_entries.id` for rank #1
 * @param {Record<string, string>} logoMap
 */
export function useLeagueLeaderFavicon(leagueEntryId, logoMap) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    let link = document.querySelector("link[rel='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }

    const applyDefault = () => {
      link.href = DEFAULT_ICON
      link.type = 'image/svg+xml'
      link.removeAttribute('sizes')
    }

    if (leagueEntryId == null || !Number.isFinite(Number(leagueEntryId))) {
      applyDefault()
      return undefined
    }

    const urls = teamLogoSrcList(leagueEntryId, logoMap, false)
    if (!urls.length) {
      applyDefault()
      return undefined
    }

    let cancelled = false

    const tryIdx = (i) => {
      if (cancelled) return
      if (i >= urls.length) {
        applyDefault()
        return
      }
      const u = urls[i]
      const img = new Image()
      img.onload = () => {
        if (cancelled) return
        link.href = u
        link.type = inferIconType(u)
        link.removeAttribute('sizes')
      }
      img.onerror = () => tryIdx(i + 1)
      img.src = u
    }

    tryIdx(0)
    return () => {
      cancelled = true
    }
  }, [leagueEntryId, logoMap])
}
