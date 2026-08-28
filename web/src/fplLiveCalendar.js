/**
 * Live-GW calendar helpers.
 *
 * FPL Draft `events.current` often stays on last week until some time after
 * the next lineup deadline (and the proxy caches bootstrap-static ~10 min).
 * UI that should go live the moment XIs lock must key off `deadline_time`
 * on the events list, not the lagging current flag.
 */

/**
 * @param {unknown} events draft `{ data: [] }`, a bare array, or null
 * @returns {object[]}
 */
export function fplEventList(events) {
  if (Array.isArray(events)) return events
  if (events && Array.isArray(events.data)) return events.data
  return []
}

/**
 * Highest unfinished event whose lineup deadline has already passed.
 * That is the GW that should be Live / Preview, even when FPL still has
 * `events.current` on a finished (or still-unchecked) previous week.
 *
 * @param {unknown} events
 * @param {Date | number} [now]
 * @returns {object | null}
 */
export function pickDeadlinePassedLiveEvent(events, now = new Date()) {
  const list = fplEventList(events)
  const nowMs = now instanceof Date ? now.getTime() : Number(now)
  if (!Number.isFinite(nowMs)) return null

  let best = null
  for (const e of list) {
    if (!e || e.finished === true) continue
    const id = Number(e.id)
    if (!Number.isFinite(id) || id < 1) continue
    const deadlineMs = Date.parse(String(e.deadline_time ?? ''))
    if (!Number.isFinite(deadlineMs) || deadlineMs > nowMs) continue
    if (!best || id > Number(best.id)) best = e
  }
  return best
}

/**
 * Numeric GW id for {@link pickDeadlinePassedLiveEvent}, or null.
 *
 * @param {unknown} events
 * @param {Date | number} [now]
 * @returns {number | null}
 */
export function pickDeadlinePassedLiveGw(events, now = new Date()) {
  const ev = pickDeadlinePassedLiveEvent(events, now)
  const id = Number(ev?.id)
  return Number.isFinite(id) && id >= 1 ? id : null
}
