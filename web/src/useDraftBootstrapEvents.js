import { useEffect, useState } from 'react'
import { draftResourceUrl } from './fplDraftUrl.js'

/**
 * Draft `bootstrap-static` → `events.current` / `events.next` for UI that must not depend on
 * opening the Live tab (e.g. waiver GW picker defaulting to the upcoming processed gameweek).
 */
export function useDraftBootstrapEvents() {
  const [current, setCurrent] = useState(null)
  const [next, setNext] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(draftResourceUrl('bootstrap-static'))
        if (!r.ok || cancelled) return
        const j = await r.json()
        const ev = j?.events
        const c = ev?.current != null ? Number(ev.current) : null
        const n = ev?.next != null ? Number(ev.next) : null
        if (cancelled) return
        setCurrent(Number.isFinite(c) && c >= 1 && c <= 38 ? c : null)
        setNext(Number.isFinite(n) && n >= 1 && n <= 38 ? n : null)
      } catch {
        /* ignore — static waiver JSON still works */
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { current, next }
}
