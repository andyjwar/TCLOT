/**
 * Rebuild draft pick order from GW1 squads + snake order.
 *
 * `waiver_pick` on league entries tracks **current** waiver priority and (after the season starts)
 * aligns with **league standing**, not the original round-1 draft order. Never use it for snake
 * slot 1. Prefer `round1FplEntryIds` / `draft_round1_order.json` for the real order.
 *
 * Within each team, players are ordered by pre-draft `draft_rank` (lower = earlier off the board).
 * That can mis-order reaches vs steals but is the best signal without a pick log.
 */

/**
 * Last-resort round-1 order when `draft_round1_order.json` is absent.
 * Sorted by FPL `entry_id` ascending — not the real draft slot order, but avoids mirroring
 * league position (which `waiver_pick`-based ordering does mid-season).
 */
/** @param {{ entry_id: number }[]} leagueEntries */
export function fallbackRoundOneOrderByEntryId(leagueEntries) {
  const entries = [...(leagueEntries || [])].filter((e) => e?.entry_id != null)
  entries.sort((a, b) => Number(a.entry_id) - Number(b.entry_id))
  return entries
}

/**
 * @param {{ entry_id: number }[]} leagueEntries
 * @param {number[]} fplEntryIds FPL `entry_id` values in round-1 pick order (length must match entries)
 */
function orderEntriesByRound1Ids(leagueEntries, fplEntryIds) {
  const byId = new Map((leagueEntries || []).map((e) => [e.entry_id, e]))
  return fplEntryIds.map((id) => byId.get(id)).filter(Boolean)
}

const POS_SHORT = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' }

/**
 * Undo waiver/free-agent moves from GW-`startGw` squads so reconstruction sees
 * the squads as drafted. Without this, a player waived in before the first
 * deadline (e.g. Schade in for M.Fernandes, GW1) is attributed a draft slot he
 * never held. Each accepted transaction with `event <= startGw` is reversed
 * newest-first: drop `element_in`, restore `element_out`.
 *
 * Trades are not handled here (a pre-GW1 trade would still swap draft
 * attribution) — acceptable because the true `/choices` pick log is preferred
 * and this fallback only runs when that log is unavailable.
 *
 * @param {Map<number, number[]>} picksByFplEntryId element ids per FPL entry (mutated copy returned)
 * @param {object[]} transactions draft API league transactions (kind w/f rows)
 * @param {number} startGw the GW whose squads were fetched
 * @returns {Map<number, number[]>}
 */
export function rewindSquadsToDraft(picksByFplEntryId, transactions, startGw) {
  const out = new Map(
    [...picksByFplEntryId.entries()].map(([k, v]) => [Number(k), [...(v || [])]]),
  )
  const applied = (transactions || [])
    .filter(
      (t) =>
        t?.result === 'a' &&
        Number(t?.event) >= 1 &&
        Number(t.event) <= Number(startGw) &&
        t.element_in != null,
    )
    // Newest first so chained moves (A→B then B→C) unwind correctly.
    .sort((a, b) => {
      const ta = Date.parse(a?.added ?? '') || 0
      const tb = Date.parse(b?.added ?? '') || 0
      return tb - ta || Number(b?.id ?? 0) - Number(a?.id ?? 0)
    })
  for (const t of applied) {
    const squad = out.get(Number(t.entry))
    if (!squad) continue
    const i = squad.indexOf(Number(t.element_in))
    if (i < 0) continue
    if (t.element_out != null) squad.splice(i, 1, Number(t.element_out))
    else squad.splice(i, 1)
  }
  return out
}

/**
 * @param {object[]} leagueEntries from details.json
 * @param {Map<number, number[]>} picksByFplEntryId element ids per FPL entry (GW1 squad order irrelevant)
 * @param {Map<number, object>} elementById bootstrap_draft.elements by id
 * @param {Map<number, object>} [teamById] bootstrap teams by id
 * @param {number} [squadSize] default 15
 * @param {{ round1FplEntryIds?: number[] }} [options] when `round1FplEntryIds` has one id per team, use as round-1 snake order
 */
export function reconstructDraftPicks(
  leagueEntries,
  picksByFplEntryId,
  elementById,
  teamById = new Map(),
  squadSize = 15,
  options = {},
) {
  const n = leagueEntries.length
  if (n === 0) return []

  const ids = options.round1FplEntryIds
  let round1Order = fallbackRoundOneOrderByEntryId(leagueEntries)
  if (
    Array.isArray(ids) &&
    ids.length === n &&
    new Set(ids).size === n &&
    ids.every((x) => Number.isFinite(x))
  ) {
    const ordered = orderEntriesByRound1Ids(leagueEntries, ids)
    if (ordered.length === n) round1Order = ordered
  }
  const queues = new Map()
  for (const e of leagueEntries) {
    const raw = picksByFplEntryId.get(e.entry_id) ?? []
    const sorted = [...raw].sort((a, b) => {
      const ra = elementById.get(a)?.draft_rank ?? 9999
      const rb = elementById.get(b)?.draft_rank ?? 9999
      return ra - rb || a - b
    })
    queues.set(e.entry_id, sorted)
  }

  const out = []
  for (let overall = 1; overall <= n * squadSize; overall++) {
    const round = Math.ceil(overall / n)
    const slot = (overall - 1) % n
    const order = round % 2 === 1 ? round1Order : [...round1Order].reverse()
    const entry = order[slot]
    const q = queues.get(entry.entry_id)
    const elementId = q?.shift()
    if (elementId == null) break

    const el = elementById.get(elementId)
    const tm = teamById.get(el?.team)
    out.push({
      overallPick: overall,
      round,
      pickInRound: slot + 1,
      entryId: entry.entry_id,
      leagueEntryId: entry.id,
      teamName: String(entry.entry_name ?? '').trim() || `Team ${entry.entry_id}`,
      element: elementId,
      playerName: el?.web_name ?? `Player #${elementId}`,
      teamShort: tm?.short_name ?? '—',
      pos: POS_SHORT[el?.element_type] ?? '—',
    })
  }
  return out
}
