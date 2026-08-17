/**
 * Season-open landing: Moves defaults to Draft until the first GW waivers
 * run, then Waivers. Independent of the retired preseason hub.
 */

function eventsArray(events) {
  if (Array.isArray(events)) return events
  if (events && Array.isArray(events.data)) return events.data
  return []
}

/** Earliest `waivers_time` on the FPL Draft events calendar, as epoch ms. */
export function firstWaiversTimeMs(events) {
  let first = null
  for (const e of eventsArray(events)) {
    const ms = Date.parse(e?.waivers_time)
    if (!Number.isFinite(ms)) continue
    if (first == null || ms < first) first = ms
  }
  return first
}

/**
 * @param {unknown} events draft bootstrap `events` list or `{ data: [] }`
 * @param {Date} [now]
 * @returns {'draft' | 'waivers'}
 */
export function initialMovesTab(events, now = new Date()) {
  const first = firstWaiversTimeMs(events)
  if (first == null) return 'draft'
  return now.getTime() < first ? 'draft' : 'waivers'
}
