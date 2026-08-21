import { useEffect, useRef, useState } from 'react'

/* Pull-to-refresh gesture for the installed (home-screen / standalone PWA)
 * app. In standalone display mode the browser provides no native
 * pull-to-refresh, so we reimplement it: drag down from the very top of the
 * page and release past the threshold to re-fetch league data in place (no
 * page reload). In a regular mobile browser tab the hook stays disabled —
 * iOS Safari and Android Chrome already ship a native pull-to-refresh there,
 * and a custom one would fight it. Append `?ptr=1` to force-enable for
 * testing in any browser (e.g. desktop DevTools touch emulation). */

/** Pull distance (px, after resistance damping) that arms the refresh. */
const TRIGGER_DISTANCE = 64
/** Hard cap on indicator travel. */
const MAX_DISTANCE = 100
/** Finger must move this far down before we claim the gesture, so taps and
 * tiny wobbles never engage it. */
const ENGAGE_SLOP = 10
/** The spinner shows at least this long so a fast refresh doesn't blink. */
const MIN_SPIN_MS = 600

/** Two-stage damping: tracks the finger at half speed up to the trigger
 * point, then goes heavy — the classic native rubber-band feel. */
function dampen(dy) {
  const linear = dy * 0.5
  if (linear <= TRIGGER_DISTANCE) return Math.max(0, linear)
  return Math.min(
    MAX_DISTANCE,
    TRIGGER_DISTANCE + (linear - TRIGGER_DISTANCE) * 0.3,
  )
}

function isStandaloneApp() {
  if (typeof window === 'undefined') return false
  // iOS Safari home-screen apps expose navigator.standalone; other platforms
  // resolve the manifest display mode via the media query.
  if (window.navigator.standalone === true) return true
  return window.matchMedia?.('(display-mode: standalone)')?.matches ?? false
}

function ptrDebugForced() {
  try {
    return new URLSearchParams(window.location.search).get('ptr') === '1'
  } catch {
    return false
  }
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
 * @param {{ onRefresh?: () => (void | Promise<unknown>) }} [options]
 *   `onRefresh` — async in-place data refresh; the spinner spins until it
 *   settles. Falls back to a full page reload when omitted.
 * @returns {{ enabled: boolean, distance: number, pulling: boolean,
 *   refreshing: boolean, armed: boolean, progress: number }}
 */
export function usePullToRefresh({ onRefresh } = {}) {
  const [enabled] = useState(() => {
    if (typeof window === 'undefined') return false
    if (ptrDebugForced()) return true
    return (
      isStandaloneApp() &&
      (window.matchMedia?.('(pointer: coarse)')?.matches ?? false)
    )
  })
  const [distance, setDistance] = useState(0)
  /** Finger is down and we own the gesture (drives transition suppression). */
  const [pulling, setPulling] = useState(false)
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
    let buzzed = false

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return
      const scroller = document.scrollingElement || document.documentElement
      if (scroller.scrollTop > 0) return
      if (hasScrolledAncestor(e.target)) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      tracking = true
      engaged = false
      buzzed = false
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
        setPulling(true)
      }
      // Suppress iOS rubber-banding while we drive the indicator.
      if (e.cancelable) e.preventDefault()
      dist = dampen(dy)
      if (!buzzed && dist >= TRIGGER_DISTANCE) {
        buzzed = true
        // Tiny haptic tick when the refresh arms (Android; iOS ignores).
        navigator.vibrate?.(8)
      }
      setDistance(dist)
    }

    const onTouchEnd = () => {
      if (!tracking) return
      tracking = false
      if (!engaged) return
      engaged = false
      setPulling(false)
      if (dist >= TRIGGER_DISTANCE) {
        setRefreshing(true)
        // Park the spinner at the trigger line while the refresh runs.
        setDistance(TRIGGER_DISTANCE)
        const fn = onRefreshRef.current
        if (typeof fn === 'function') {
          const started = Date.now()
          Promise.resolve()
            .then(fn)
            .catch(() => {})
            .then(() => {
              const wait = Math.max(0, MIN_SPIN_MS - (Date.now() - started))
              window.setTimeout(() => {
                setRefreshing(false)
                setDistance(0)
              }, wait)
            })
        } else {
          // No in-app refresh wired up — fall back to a full reload after
          // the spinner has a frame to paint.
          window.setTimeout(() => window.location.reload(), 80)
        }
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
    pulling,
    refreshing,
    armed: refreshing || distance >= TRIGGER_DISTANCE,
    progress: Math.min(1, distance / TRIGGER_DISTANCE),
  }
}
