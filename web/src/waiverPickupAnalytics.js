/**
 * Pickup tenure (waiver + free-agent) and the last GW to score through.
 * Shared by build-waiver-gw-analytics.mjs and unit tests.
 *
 * FPL Draft `kind`: `w` = waiver claim, `f` = free-agent add. Both are
 * squad-in moves; Best pickups / team totals must count them the same way.
 */

export function compareTx(a, b) {
  const ta = a?.added ? Date.parse(a.added) : 0
  const tb = b?.added ? Date.parse(b.added) : 0
  if (ta !== tb) return ta - tb
  return (a?.id ?? 0) - (b?.id ?? 0)
}

export function isSuccessfulSwap(t) {
  return (
    t?.result === 'a' &&
    t?.element_out != null &&
    Number(t.event) > 0
  )
}

/** Successful waiver or free-agent add (has an incoming player). */
export function isSuccessfulPickup(t) {
  return (
    (t?.kind === 'w' || t?.kind === 'f') &&
    t?.result === 'a' &&
    t?.element_in != null &&
    Number(t.event) > 0
  )
}

export function lastFinishedGwFromDetails(details) {
  let max = 0
  for (const m of details?.matches || []) {
    if (m.finished && Number(m.event) > max) max = Number(m.event)
  }
  return max
}

/**
 * Highest GW that has actually started (or finished) on the classic fixture
 * list. Used so pickup points roll forward when H2H `details.matches[].finished`
 * still lags, and so an in-progress GW is included once football has kicked off.
 *
 * @param {object[] | null | undefined} fixtures
 */
export function lastGwFromFixtures(fixtures) {
  let max = 0
  for (const f of Array.isArray(fixtures) ? fixtures : []) {
    const ev = Number(f?.event)
    if (!Number.isFinite(ev) || ev < 1) continue
    if (
      f.finished === true ||
      f.finished_provisional === true ||
      f.started === true
    ) {
      if (ev > max) max = ev
    }
  }
  return max
}

/**
 * Last GW to sum FPL points through for pickup tenure.
 * Max of finished H2H, started/finished PL football, and transaction/trade events.
 *
 * @param {{
 *   details?: object,
 *   fixtures?: object[],
 *   transactions?: object[],
 *   trades?: object[],
 * }} p
 */
export function resolveWaiverAnalyticsLastGw({
  details,
  fixtures,
  transactions = [],
  trades = [],
} = {}) {
  const eventCandidates = [
    ...(transactions || []).map((t) => Number(t.event) || 0),
    ...(trades || []).map((t) => Number(t.event) || 0),
  ]
  const maxEventGw = eventCandidates.length ? Math.max(...eventCandidates) : 0
  const finishedGw = lastFinishedGwFromDetails(details)
  const footballGw = lastGwFromFixtures(fixtures)
  let lastGw = Math.max(
    finishedGw >= 1 ? finishedGw : 0,
    footballGw >= 1 ? footballGw : 0,
    maxEventGw,
    1,
  )
  return Math.min(lastGw, 38)
}

export function sumPlayerRange(cache, elementId, startGw, endGw) {
  let s = 0
  const pid = Number(elementId)
  for (let g = startGw; g <= endGw; g++) {
    const m = cache?.[g]
    if (m && typeof m[pid] === 'number') s += m[pid]
  }
  return s
}

function findNextDrop(sorted, pickup) {
  const i = sorted.findIndex((t) => t.id === pickup.id)
  if (i < 0) return null
  const entry = Number(pickup.entry)
  const pid = Number(pickup.element_in)
  for (let j = i + 1; j < sorted.length; j++) {
    const t = sorted[j]
    if (Number(t.entry) !== entry) continue
    if (t.result !== 'a') continue
    if (t.element_out != null && Number(t.element_out) === pid) return t
  }
  return null
}

/**
 * Aggregate successful waiver + free-agent adds into per (entry, player) stints.
 *
 * @param {object[]} transactions
 * @param {number} lastGw
 * @param {Record<number, Record<number, number>>} cache event → elementId → pts
 * @returns {{
 *   rows: object[],
 *   teamWaiverInTotals: object[],
 * }}
 */
export function aggregatePickupTenure(transactions, lastGw, cache) {
  const sorted = [...(transactions || [])].sort(compareTx)
  const pickups = sorted.filter(isSuccessfulPickup)
  /** @type {Map<string, {
   *   entry: number,
   *   elementId: number,
   *   totalPointsForTeam: number,
   *   waiverStints: number,
   *   freeAgentStints: number,
   *   firstGw: number,
   *   lastGw: number,
   * }>} */
  const agg = new Map()

  for (const w of pickups) {
    const startGw = Number(w.event)
    const elementId = Number(w.element_in)
    const entry = Number(w.entry)
    const drop = findNextDrop(sorted, w)
    let endGw = lastGw
    if (drop) {
      endGw = Math.min(Number(drop.event) - 1, lastGw)
    }
    let stintPts = 0
    if (endGw >= startGw) {
      stintPts = sumPlayerRange(cache, elementId, startGw, endGw)
    }
    const key = `${entry}|${elementId}`
    const cur = agg.get(key) || {
      entry,
      elementId,
      totalPointsForTeam: 0,
      waiverStints: 0,
      freeAgentStints: 0,
      firstGw: startGw,
      lastGw: endGw,
    }
    cur.totalPointsForTeam += stintPts
    cur.waiverStints += 1
    if (w.kind === 'f') cur.freeAgentStints += 1
    cur.firstGw = Math.min(cur.firstGw, startGw)
    cur.lastGw = Math.max(cur.lastGw, endGw)
    agg.set(key, cur)
  }

  /* Skip never-fielded stints (signed and dropped again before they played). */
  const fielded = [...agg.values()].filter((r) => r.lastGw >= r.firstGw)
  const rows = fielded
    .sort((a, b) => {
      const d = b.totalPointsForTeam - a.totalPointsForTeam
      if (d !== 0) return d
      return b.waiverStints - a.waiverStints
    })
    .slice(0, 10)
    .map((r, idx) => ({ rank: idx + 1, ...r }))

  const byEntryTeam = new Map()
  for (const v of fielded) {
    if (!byEntryTeam.has(v.entry)) {
      byEntryTeam.set(v.entry, {
        entry: v.entry,
        totalWaiverInPoints: 0,
        distinctPlayers: 0,
        waiverInCount: 0,
      })
    }
    const t = byEntryTeam.get(v.entry)
    t.totalWaiverInPoints += v.totalPointsForTeam
    t.distinctPlayers += 1
    t.waiverInCount += v.waiverStints
  }
  const teamWaiverInTotals = [...byEntryTeam.values()].sort(
    (a, b) => b.totalWaiverInPoints - a.totalWaiverInPoints || a.entry - b.entry,
  )

  return { rows, teamWaiverInTotals }
}
