/**
 * Offline reconstruction of GW squads from committed league-data.
 * Used when the Draft API is unreachable (local/cloud sandbox) so
 * bench-points.json can still be built for finished gameweeks.
 *
 * Ownership: draft_picks.json + accepted waivers/FA/trades with event ≤ GW.
 * Points: projections-history XI rows first, then bootstrap `event_points`
 * when that file is still on the same gameweek.
 */

const POS_MAP = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' }

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {object} boot bootstrap_draft.json
 */
export function bootstrapCurrentGw(boot) {
  const events = boot?.events
  const cur = events?.current ?? events?.data?.current
  const n = Number(cur)
  return Number.isFinite(n) && n >= 1 ? n : null
}

/**
 * @param {object} boot
 * @param {number} elementId
 */
export function playerMeta(boot, elementId) {
  const el = (boot?.elements || []).find((e) => Number(e.id) === Number(elementId))
  if (!el) {
    return { name: String(elementId), pos: 'MID', eventPts: 0 }
  }
  return {
    name: el.web_name || String(elementId),
    pos: POS_MAP[Number(el.element_type)] ?? 'MID',
    eventPts: Number(el.event_points) || 0,
  }
}

/**
 * Owned element IDs for one team after draft + accepted moves through `gw`.
 *
 * @param {{
 *   leagueEntryId: number,
 *   fplEntryId: number,
 *   gw: number,
 *   draftPicks?: { leagueEntryId?: number, element?: number }[],
 *   transactions?: object[],
 *   trades?: object[],
 * }} args
 * @returns {Set<number>}
 */
export function ownedIdsAtGw({
  leagueEntryId,
  fplEntryId,
  gw,
  draftPicks = [],
  transactions = [],
  trades = [],
}) {
  const owned = new Set()
  for (const p of draftPicks) {
    if (Number(p.leagueEntryId) !== Number(leagueEntryId)) continue
    const id = num(p.element)
    if (id) owned.add(id)
  }

  const txs = [...(transactions || [])]
    .filter((t) => t && t.result === 'a' && Number(t.event) <= Number(gw))
    .sort((a, b) => {
      const ia = Number(a.index)
      const ib = Number(b.index)
      if (Number.isFinite(ia) && Number.isFinite(ib) && ia !== ib) return ia - ib
      return (Number(a.id) || 0) - (Number(b.id) || 0)
    })
  for (const t of txs) {
    if (Number(t.entry) !== Number(fplEntryId)) continue
    const out = num(t.element_out)
    const inn = num(t.element_in)
    if (out) owned.delete(out)
    if (inn) owned.add(inn)
  }

  for (const tr of trades || []) {
    const ev = Number(tr.event ?? tr.gw)
    if (Number.isFinite(ev) && ev > Number(gw)) continue
    const state = String(tr.state ?? tr.result ?? tr.status ?? '').toLowerCase()
    if (state && state !== 'a' && state !== 'accepted' && state !== 'executed') {
      continue
    }
    const sides = [
      { entry: tr.entry_1 ?? tr.offer_entry, adds: tr.entry_1_in, drops: tr.entry_1_out },
      { entry: tr.entry_2 ?? tr.counter_entry, adds: tr.entry_2_in, drops: tr.entry_2_out },
    ]
    for (const side of sides) {
      if (Number(side.entry) !== Number(fplEntryId)) continue
      for (const id of side.drops || []) {
        const n = num(id)
        if (n) owned.delete(n)
      }
      for (const id of side.adds || []) {
        const n = num(id)
        if (n) owned.add(n)
      }
    }
  }

  return owned
}

/**
 * @param {object} historyRow projections-history h2h fixture
 * @param {number} leagueEntryId
 */
export function xiFromHistory(historyRow, leagueEntryId) {
  if (!historyRow) return []
  const home = Number(historyRow.league_entry_1) === Number(leagueEntryId)
  const away = Number(historyRow.league_entry_2) === Number(leagueEntryId)
  const rows = home ? historyRow.xi1 : away ? historyRow.xi2 : null
  return Array.isArray(rows) ? rows : []
}

/**
 * Build one week's squad map from local artifacts (no network).
 *
 * @returns {Record<number, {
 *   players: { id: number, pos: string, pts: number, name?: string }[],
 *   actualXiIds: number[],
 *   actualPts: number,
 *   officialBenchPts: null,
 * }> | null}
 */
export function reconstructWeekSquads({
  gw,
  teams,
  matches,
  boot,
  draftPicks,
  transactions,
  trades,
  historyH2h,
}) {
  const current = bootstrapCurrentGw(boot)
  const canUseEventPts = current == null || current === gw
  const byLeague = new Map()
  for (const t of teams) byLeague.set(Number(t.leagueEntryId), t)

  const squads = {}
  for (const t of teams) {
    const leagueEntryId = Number(t.leagueEntryId)
    const fplEntryId = t.fplEntryId != null ? Number(t.fplEntryId) : null
    if (!Number.isFinite(fplEntryId)) continue
    const fx = (matches || []).find(
      (m) =>
        Number(m.event) === Number(gw) &&
        (Number(m.league_entry_1) === leagueEntryId ||
          Number(m.league_entry_2) === leagueEntryId),
    )
    if (!fx) continue
    const actualPts =
      Number(fx.league_entry_1) === leagueEntryId
        ? Number(fx.league_entry_1_points)
        : Number(fx.league_entry_2_points)
    if (!Number.isFinite(actualPts)) continue

    const hist = (historyH2h || []).find(
      (row) =>
        Number(row.league_entry_1) === leagueEntryId ||
        Number(row.league_entry_2) === leagueEntryId,
    )
    const xiRows = xiFromHistory(hist, leagueEntryId)
    const xiPts = new Map(xiRows.map((p) => [Number(p.id), Number(p.pts) || 0]))
    const owned = ownedIdsAtGw({
      leagueEntryId,
      fplEntryId,
      gw,
      draftPicks,
      transactions,
      trades,
    })
    for (const id of xiPts.keys()) owned.add(id)

    const players = [...owned].map((id) => {
      const meta = playerMeta(boot, id)
      const pts = xiPts.has(id)
        ? xiPts.get(id)
        : canUseEventPts
          ? meta.eventPts
          : 0
      return {
        id,
        pos: xiRows.find((p) => Number(p.id) === id)?.pos || meta.pos,
        pts,
        name: xiRows.find((p) => Number(p.id) === id)?.name || meta.name,
      }
    })

    if (players.length < 11) continue

    squads[leagueEntryId] = {
      players,
      actualXiIds: xiRows.length === 11 ? xiRows.map((p) => Number(p.id)) : [],
      actualPts,
      officialBenchPts: null,
    }
  }

  return Object.keys(squads).length ? squads : null
}
