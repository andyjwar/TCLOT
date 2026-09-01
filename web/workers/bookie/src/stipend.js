/**
 * Weekly stipend — a cushion for punters who had a ticket that gameweek,
 * not a free roll for sitting out. After every H2H market for a GW settles,
 * anyone who placed a weekly bet (H2H or player special) that GW gets paid
 * once. Season-long tickets do not count as playing the week.
 */

export function sitoutClawbackKey(season) {
  return `stipendClawback:sitouts:${season}`
}

/** entry ids that had a weekly ticket (market.gw = gw) this gameweek. */
export function weeklyBettorIds(bets, gw) {
  const ids = new Set()
  const want = Number(gw)
  if (!Number.isFinite(want)) return ids
  for (const b of Array.isArray(bets) ? bets : []) {
    if (Number(b?.gw) !== want) continue
    const id = Number(b.entry_id)
    if (Number.isFinite(id)) ids.add(id)
  }
  return ids
}

/** Gameweeks whose stipend has already been paid (`stipend:season:gw` meta). */
export function paidStipendGameweeks(metaKeys, season) {
  const prefix = `stipend:${season}:`
  const gws = []
  for (const k of metaKeys ?? []) {
    if (typeof k !== 'string' || !k.startsWith(prefix)) continue
    const gw = Number(k.slice(prefix.length))
    if (Number.isFinite(gw) && gw >= 1) gws.push(gw)
  }
  return gws
}

/**
 * One-shot: debit the stipend from anyone who was paid for a GW they sat
 * out (no weekly ticket). Gated so later tab loads do not charge twice.
 *
 * @returns {Promise<boolean>} true if this call performed the clawback
 */
export async function applySitoutStipendClawback(db, { season, stipend, nowIso, metaGet, metaSet }) {
  if (!season || !Number.isFinite(Number(stipend)) || Number(stipend) <= 0) return false
  const key = sitoutClawbackKey(season)
  if (await metaGet(db, key)) return false
  const paid = await db
    .prepare('SELECT k FROM meta WHERE k LIKE ?')
    .bind(`stipend:${season}:%`)
    .all()
  const gws = paidStipendGameweeks((paid.results ?? []).map((r) => r.k), season)
  for (const gw of gws) {
    await db
      .prepare(
        `UPDATE users SET balance = MAX(0, balance - ?)
         WHERE season = ?
           AND entry_id NOT IN (
             SELECT DISTINCT b.entry_id FROM bets b
             JOIN markets m ON m.id = b.market_id
             WHERE b.season = ? AND m.gw = ?
           )`,
      )
      .bind(stipend, season, season, gw)
      .run()
  }
  await metaSet(db, key, nowIso)
  return true
}
