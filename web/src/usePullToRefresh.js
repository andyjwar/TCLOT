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
/** Don't leave the spinner up forever if a refetch hangs. */
const REFRESH_TIMEOUT_MS = 10_000
/** iOS often reports a fractional leftover scrollY at visual top, especially
 * with viewport-fit=cover. Treat anything this small as "at the top". */
export const PTR_AT_TOP_EPSILON = 2

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

export function isScrollAtTop(scrollTop, epsilon = PTR_AT_TOP_EPSILON) {
  return Number(scrollTop) <= epsilon
}

/**
 * Decide how a touchmove at page-top should proceed.
 * `preventDefault` must be true on the first downward move — iOS Safari
 * marks later touchmoves non-cancelable once it has taken them as a scroll.
 *
 * @returns {{ tracking: boolean, engaged: boolean, preventDefault: boolean }}
 */
export function pullMoveDecision({ dx, dy, engaged, slop = ENGAGE_SLOP }) {
  const downward = dy > 0 && Math.abs(dy) >= Math.abs(dx)
  if (!engaged) {
    if (dy < 0 || Math.abs(dx) > Math.abs(dy)) {
      return { tracking: false, engaged: false, preventDefault: false }
    }
    if (dy < slop) {
      return { tracking: true, engaged: false, preventDefault: downward }
    }
    return { tracking: true, engaged: true, preventDefault: downward }
  }
  return { tracking: true, engaged: true, preventDefault: downward }
}

export function pageScrollTop() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0
  const se = document.scrollingElement
  return Math.max(
    window.scrollY || 0,
    window.pageYOffset || 0,
    document.documentElement?.scrollTop || 0,
    document.body?.scrollTop || 0,
    se?.scrollTop || 0,
  )
}

function overflowYOf(el) {
  if (typeof window === 'undefined' || !el) return ''
  try {
    return window.getComputedStyle(el).overflowY
  } catch {
    return ''
  }
}

function isYScrollContainer(el) {
  const oy = overflowYOf(el)
  if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') return false
  return el.scrollHeight > el.clientHeight + 1
}

/** True when the touch began inside a vertical scroller that is not at top. */
export function hasScrolledAncestor(node, epsilon = PTR_AT_TOP_EPSILON) {
  let el = node instanceof Element ? node : null
  while (el && el !== document.body) {
    if (isYScrollContainer(el) && !isScrollAtTop(el.scrollTop, epsilon)) return true
    el = el.parentElement
  }
  return false
}

function isStandaloneApp() {
  if (typeof window === 'undefined') return false
  // iOS Safari home-screen apps expose navigator.standalone; other platforms
  // resolve the manifest display mode via the media query. fullscreen /
  // minimal-ui also have no native PTR.
  if (window.navigator.standalone === true) return true
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.matchMedia?.('(display-mode: fullscreen)')?.matches ||
    window.matchMedia?.('(display-mode: minimal-ui)')?.matches ||
    false
  )
}

function ptrDebugForced() {
  try {
    return new URLSearchParams(window.location.search).get('ptr') === '1'
  } catch {
    return false
  }
}

function ptrShouldEnable() {
  if (typeof window === 'undefined') return false
  if (ptrDebugForced()) return true
  // Do not AND with (pointer: coarse): iPad + Magic Keyboard reports
  // pointer:fine while the user is still pulling with a finger.
  return isStandaloneApp()
}

function settleAfter(fn) {
  const started = Date.now()
  const timeout = new Promise((resolve) => {
    window.setTimeout(resolve, REFRESH_TIMEOUT_MS)
  })
  return Promise.race([Promise.resolve().then(fn).catch(() => {}), timeout]).then(
    () => Math.max(0, MIN_SPIN_MS - (Date.now() - started)),
  )
}

/**
 * @param {{ onRefresh?: () => (void | Promise<unknown>) }} [options]
 *   `onRefresh` — async in-place data refresh; the spinner spins until it
 *   settles. Falls back to a full page reload when omitted.
 * @returns {{ enabled: boolean, distance: number, pulling: boolean,
 *   refreshing: boolean, armed: boolean, progress: number }}
 */
export function usePullToRefresh({ onRefresh } = {}) {
  const [enabled, setEnabled] = useState(() => ptrShouldEnable())
  const [distance, setDistance] = useState(0)
  /** Finger is down and we own the gesture (drives transition suppression). */
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const onRefreshRef = useRef(onRefresh)
  const refreshingRef = useRef(false)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])
  useEffect(() => {
    refreshingRef.current = refreshing
  }, [refreshing])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }
    const queries = [
      window.matchMedia('(display-mode: standalone)'),
      window.matchMedia('(display-mode: fullscreen)'),
      window.matchMedia('(display-mode: minimal-ui)'),
    ]
    const sync = () => setEnabled(ptrShouldEnable())
    for (const q of queries) {
      q.addEventListener?.('change', sync)
    }
    sync()
    return () => {
      for (const q of queries) {
        q.removeEventListener?.('change', sync)
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    let startX = 0
    let startY = 0
    /** Touch began at page top — candidate for a pull. */
    let tracking = false
    /** Vertical pull confirmed — we own the gesture until touchend. */
    let engaged = false
    let dist = 0
    let buzzed = false

    const onTouchStart = (e) => {
      if (refreshingRef.current) return
      if (e.touches.length !== 1) return
      if (!isScrollAtTop(pageScrollTop())) return
      if (hasScrolledAncestor(e.target)) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      tracking = true
      engaged = false
      buzzed = false
    }

    const onTouchMove = (e) => {
      if (!tracking || refreshingRef.current) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      const next = pullMoveDecision({ dx, dy, engaged })
      if (next.preventDefault && e.cancelable) e.preventDefault()
      if (!next.tracking) {
        tracking = false
        return
      }
      if (next.engaged && !engaged) {
        engaged = true
        setPulling(true)
      }
      if (!engaged) return
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
          settleAfter(fn).then((wait) => {
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
  }, [enabled])

  return {
    enabled,
    distance,
    pulling,
    refreshing,
    armed: refreshing || distance >= TRIGGER_DISTANCE,
    progress: Math.min(1, distance / TRIGGER_DISTANCE),
  }
}
