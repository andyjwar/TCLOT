/**
 * Waiver/free-agent history for one player — powers the "Waivers" section on
 * the player card.
 *
 * Built from the draft API league transactions feed (committed
 * `transactions.json`): kind `w` (waivers) / `f` (free agency), result `a` =
 * accepted. Every accepted transaction the element appears in becomes an
 * event row:
 *
 *  - `in`  (element is `element_in`): a manager signed him, dropping
 *    `element_out` to make room. Carries the stint that signing started —
 *    `[gw .. endGw]` where `endGw` = the GW before the same entry dropped him
 *    again, or `null` while he is still on that squad. Same convention as
 *    build-waiver-gw-analytics' pickups-tenure ("pts through GW before drop").
 *  - `out` (element is `element_out`): a manager dropped him, signing
 *    `element_in` as the replacement. For a drafted-then-dropped player this
 *    is his only row (there is no preceding `in`).
 *
 * Stints ended by a trade rather than a drop are not detected (trades live on
 * a separate feed); such a stint reads as ongoing until the next drop. Same
 * limitation as the existing waiver analytics.
 */

/** Stable transaction order: GW, then processing time, then id. */
function compareTx(a, b) {
  const evDiff = (Number(a.event) || 0) - (Number(b.event) || 0)
  if (evDiff !== 0) return evDiff
  const ta = Date.parse(a?.added ?? '') || 0
  const tb = Date.parse(b?.added ?? '') || 0
  if (ta !== tb) return ta - tb
  return (Number(a.id) || 0) - (Number(b.id) || 0)
}

/**
 * @param {object[] | null | undefined} transactions draft API league transactions
 * @param {number} elementId
 * @returns {{
 *   events: Array<{
 *     type: 'in' | 'out',
 *     txId: number,
 *     gw: number,
 *     kind: 'w' | 'f',
 *     entry: number,
 *     otherElement: number | null,
 *     endGw?: number | null,
 *   }>,
 *   failedClaims: Array<{ gw: number, entry: number }>,
 * }} `events` chronological (oldest first). `otherElement` = the player dropped
 *   to make room (`in`) or signed as the replacement (`out`). `endGw` only on
 *   `in` rows; `null` = still on that squad as far as the transactions show.
 */
export function waiverHistoryForElement(transactions, elementId) {
  const id = Number(elementId)
  if (!Array.isArray(transactions) || !Number.isFinite(id)) {
    return { events: [], failedClaims: [] }
  }
  const sorted = [...transactions].sort(compareTx)

  const events = []
  const failedClaims = []
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i]
    const gw = Number(t?.event)
    if (!Number.isFinite(gw) || gw < 1) continue
    const isIn = Number(t.element_in) === id
    const isOut = Number(t.element_out) === id
    if (!isIn && !isOut) continue

    if (t.result !== 'a') {
      // Unsuccessful waiver claims for this player (outbid / invalid).
      if (isIn) failedClaims.push({ gw, entry: Number(t.entry) })
      continue
    }

    const base = {
      txId: Number(t.id),
      gw,
      kind: t.kind === 'f' ? 'f' : 'w',
      entry: Number(t.entry),
    }
    if (isIn) {
      // Stint ends the GW before the same entry drops him again.
      let endGw = null
      for (let j = i + 1; j < sorted.length; j++) {
        const d = sorted[j]
        if (
          d.result === 'a' &&
          Number(d.entry) === base.entry &&
          Number(d.element_out) === id
        ) {
          endGw = Number(d.event) - 1
          break
        }
      }
      events.push({
        type: 'in',
        ...base,
        otherElement: t.element_out != null ? Number(t.element_out) : null,
        endGw,
      })
    }
    if (isOut) {
      events.push({
        type: 'out',
        ...base,
        otherElement: t.element_in != null ? Number(t.element_in) : null,
      })
    }
  }
  return { events, failedClaims }
}

/**
 * FPL points the player scored across a stint, from his element-summary
 * per-GW history (the payload the player card already fetched). Raw player
 * points while on the squad — bench weeks count, matching pickups-tenure.
 * DGWs contribute every row for the event. `endGw == null` = ongoing → sum
 * through the last finished GW in the history.
 *
 * @param {Array<{ event?: number, total_points?: number }> | null | undefined} history
 * @param {number} startGw
 * @param {number | null | undefined} endGw
 * @returns {number | null} null when the history is not loaded (hide the
 *   figure rather than showing a false 0).
 */
export function stintPointsFromHistory(history, startGw, endGw) {
  if (!Array.isArray(history)) return null
  const from = Number(startGw)
  const to = endGw == null ? Infinity : Number(endGw)
  let pts = 0
  for (const row of history) {
    const ev = Number(row?.event)
    if (!Number.isFinite(ev) || ev < from || ev > to) continue
    pts += Number(row?.total_points) || 0
  }
  return pts
}

/**
 * "GW1–GW12 · 12 GWs" | "Since GW8" | "Never fielded" (dropped again before
 * his first GW with the squad, e.g. signed and re-dropped pre-deadline).
 *
 * @param {number} startGw
 * @param {number | null | undefined} endGw
 */
export function stintRangeLabel(startGw, endGw) {
  if (endGw == null) return `Since GW${startGw}`
  if (endGw < startGw) return 'Never fielded'
  const n = endGw - startGw + 1
  return `GW${startGw}–GW${endGw} · ${n} GW${n === 1 ? '' : 's'}`
}
