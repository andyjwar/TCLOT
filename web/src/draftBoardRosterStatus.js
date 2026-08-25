/**
 * Current squad + first gameweek a drafted player left a manager (waiver/free agent or trade).
 */

/** @param {object} boot draft `bootstrap-static` JSON */
export function draftCurrentGameweek(boot) {
  const ev = boot?.events
  if (ev == null) return 1
  if (typeof ev.current === 'number' && ev.current >= 1) return ev.current
  const data = ev.data
  if (Array.isArray(data) && data.length) {
    const cur = data.find((x) => x.is_current === true)
    if (cur?.id >= 1) return cur.id
    const finished = data.filter((x) => x.finished)
    if (finished.length) return finished[finished.length - 1].id
    return data[0].id
  }
  return 1
}

/**
 * @returns {Map<string, { gw: number, kind: 'trade' | 'transfer' }>} key `${fplEntryId}:${elementId}`
 */
export function buildFirstLeftGameweekMap(transactionsPayload, tradesPayload) {
  const m = new Map()

  function consider(key, gw, kind) {
    if (key == null || gw == null || !Number.isFinite(gw)) return
    const prev = m.get(key)
    if (prev == null || gw < prev.gw) m.set(key, { gw, kind })
  }

  for (const t of transactionsPayload?.transactions || []) {
    if ((t.kind !== 'w' && t.kind !== 'f') || t.result !== 'a') continue
    const out = t.element_out
    const ent = t.entry
    const ev = t.event
    if (out == null || ent == null || ev == null) continue
    consider(`${ent}:${out}`, ev, 'transfer')
  }

  for (const tr of tradesPayload?.trades || []) {
    if (tr.state !== 'p') continue
    const ev = tr.event
    const off = tr.offered_entry
    const rec = tr.received_entry
    if (ev == null) continue
    for (const row of tr.tradeitem_set || []) {
      if (row?.element_out != null && off != null) consider(`${off}:${row.element_out}`, ev, 'trade')
      if (row?.element_in != null && rec != null) consider(`${rec}:${row.element_in}`, ev, 'trade')
    }
  }

  return m
}

/**
 * Gameweek a currently-owned player *joined* a manager's squad (their current
 * stint start). Used for the "time on squad" column in the manager card.
 *
 * Rules:
 *   - Draft picks seed every drafted player at `startGw` (the draft, GW1 by
 *     default) for the entry that drafted them.
 *   - Accepted waiver / free-agent moves (`kind` `w`/`f`, `result` `a`) set the
 *     join gw for `element_in` to that transaction's event — the *latest* such
 *     event wins, so a player dropped and re-added shows their most recent stint.
 *   - Accepted trades set the join gw for the received side.
 *
 * Key format `${fplEntryId}:${elementId}`.
 *
 * @param {object} transactionsPayload transactions.json
 * @param {object} tradesPayload trades.json
 * @param {object} [draftPicksPayload] draft_picks.json (initial ownership)
 * @returns {Map<string, { gw: number, kind: 'draft' | 'transfer' | 'trade' }>}
 */
export function buildJoinedGameweekMap(
  transactionsPayload,
  tradesPayload,
  draftPicksPayload,
) {
  const m = new Map()
  const startGw = Number(draftPicksPayload?._meta?.startGw) || 1

  /** Latest gw wins — a later acquisition is the current stint start. */
  function consider(key, gw, kind) {
    if (key == null || gw == null || !Number.isFinite(gw)) return
    const prev = m.get(key)
    if (prev == null || gw >= prev.gw) m.set(key, { gw, kind })
  }

  for (const p of draftPicksPayload?.picks || []) {
    const ent = Number(p?.entryId)
    const el = Number(p?.element)
    if (!Number.isFinite(ent) || !Number.isFinite(el)) continue
    consider(`${ent}:${el}`, startGw, 'draft')
  }

  for (const t of transactionsPayload?.transactions || []) {
    if ((t.kind !== 'w' && t.kind !== 'f') || t.result !== 'a') continue
    const inEl = t.element_in
    const ent = t.entry
    const ev = t.event
    if (inEl == null || ent == null || ev == null) continue
    consider(`${ent}:${inEl}`, Number(ev), 'transfer')
  }

  for (const tr of tradesPayload?.trades || []) {
    if (tr.state !== 'p') continue
    const ev = tr.event
    const off = tr.offered_entry
    const rec = tr.received_entry
    if (ev == null) continue
    for (const row of tr.tradeitem_set || []) {
      // Offering entry receives `element_in`; receiving entry receives `element_out`.
      if (row?.element_in != null && off != null)
        consider(`${off}:${row.element_in}`, Number(ev), 'trade')
      if (row?.element_out != null && rec != null)
        consider(`${rec}:${row.element_out}`, Number(ev), 'trade')
    }
  }

  return m
}

/**
 * @param {object[]} picks draft picks with entryId, element
 * @param {Map<number, Set<number>|null|undefined>} squadElementsByFplEntryId
 * @param {Map<string, { gw: number, kind: string }>} firstLeftMap
 */
export function mergeRosterStatusIntoPicks(picks, squadElementsByFplEntryId, firstLeftMap) {
  return picks.map((p) => {
    const set = squadElementsByFplEntryId.get(p.entryId)
    const onSquad = set ? set.has(p.element) : null
    const left = firstLeftMap.get(`${p.entryId}:${p.element}`)
    return {
      ...p,
      rosterOnSquad: onSquad,
      rosterLeftGameweek: left?.gw ?? null,
      rosterLeftKind: left?.kind ?? null,
    }
  })
}
