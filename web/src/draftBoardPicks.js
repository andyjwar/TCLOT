/**
 * Rebuild draft pick order from GW1 squads + snake order.
 *
 * `waiver_pick` on league entries is **current** waiver priority (it moves all season), not the
 * original draft slot. Prefer `round1FplEntryIds` when you have the real round-1 order.
 *
 * Within each team, players are ordered by pre-draft `draft_rank` (lower = earlier off the board).
 * That can mis-order reaches vs steals but is the best signal without a pick log.
 */

/** @param {{ waiver_pick?: number }[]} leagueEntries */
export function snakeRoundOneOrder(leagueEntries) {
  const entries = [...(leagueEntries || [])].filter((e) => e?.entry_id != null)
  entries.sort((a, b) => (a.waiver_pick ?? 0) - (b.waiver_pick ?? 0))
  return entries.reverse()
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
  let round1Order = snakeRoundOneOrder(leagueEntries)
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
