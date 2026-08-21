import { useEffect, useRef, useState } from 'react'

/* Pull-to-refresh gesture for the installed (home-screen / standalone PWA)
 * app. In standalone display mode the browser provides no native
 * pull-to-refresh, so we reimplement it: drag down from the very top of the
 * page and release past the threshold to reload. In a regular mobile browser
 * tab the hook stays disabled — iOS Safari and Android Chrome already ship a
 * native pull-to-refresh there, and a custom one would fight it. */

/** Pull distance (px, after resistance damping) that arms the refresh. */
const TRIGGER_DISTANCE = 70
/** Hard cap on indicator travel. */
const MAX_DISTANCE = 110
/** Finger travel is damped so the indicator lags the finger (feels weighty). */
const RESISTANCE = 0.45
/** Finger must move this far down before we claim the gesture, so taps and
 * tiny wobbles never engage it. */
const ENGAGE_SLOP = 10

function isStandaloneApp() {
  if (typeof window === 'undefined') return false
  // iOS Safari home-screen apps expose navigator.standalone; other platforms
  // resolve the manifest display mode via the media query.
  if (window.navigator.standalone === true) return true
  return window.matchMedia?.('(display-mode: standalone)')?.matches ?? false
}

/** True when the touch began inside an element that is itself scrolled down
 * (e.g. the player-detail overlay's inner scroller). Pulling there should
 * scroll that element, not trigger a page refresh. */
function hasScrolledAncestor(node) {
  let el = node instanceof Element ? node : null
  while (el && el !== document.body) {
    if (el.scrollTop > 0) return true
    el = el.parentElement
  }
  return false
}

/**
 * @param {{ onRefresh?: () => void }} [options]
 * @returns {{ enabled: boolean, distance: number, refreshing: boolean,
 *   armed: boolean, progress: number }}
 */
export function usePullToRefresh({ onRefresh } = {}) {
  const [enabled] = useState(
    () =>
      isStandaloneApp() &&
      (window.matchMedia?.('(pointer: coarse)')?.matches ?? false),
  )
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (!enabled || refreshing) return undefined
    let startX = 0
    let startY = 0
    /** Touch began at page top — candidate for a pull. */
    let tracking = false
    /** Vertical pull confirmed — we own the gesture until touchend. */
    let engaged = false
    let dist = 0

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return
      const scroller = document.scrollingElement || document.documentElement
      if (scroller.scrollTop > 0) return
      if (hasScrolledAncestor(e.target)) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      tracking = true
      engaged = false
    }

    const onTouchMove = (e) => {
      if (!tracking) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (!engaged) {
        if (dy < 0 || Math.abs(dx) > Math.abs(dy)) {
          // Upward scroll or horizontal swipe (carousels, table pans) —
          // hand the gesture back to the page for this touch.
          tracking = false
          return
        }
        if (dy < ENGAGE_SLOP) return
        engaged = true
      }
      // Suppress iOS rubber-banding while we drive the indicator.
      if (e.cancelable) e.preventDefault()
      dist = Math.min(MAX_DISTANCE, Math.max(0, dy * RESISTANCE))
      setDistance(dist)
    }

    const onTouchEnd = () => {
      if (!tracking) return
      tracking = false
      if (!engaged) return
      engaged = false
      if (dist >= TRIGGER_DISTANCE) {
        setRefreshing(true)
        const refresh =
          onRefreshRef.current ?? (() => window.location.reload())
        // Give the spinner a frame to paint before a sync reload freezes it.
        window.setTimeout(refresh, 80)
      } else {
        setDistance(0)
      }
      dist = 0
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [enabled, refreshing])

  return {
    enabled,
    distance,
    refreshing,
    armed: refreshing || distance >= TRIGGER_DISTANCE,
    progress: Math.min(1, distance / TRIGGER_DISTANCE),
  }
}
