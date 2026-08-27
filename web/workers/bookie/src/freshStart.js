/**
 * One-shot season restart: wipe the ticket ledger and put every bankroll
 * back at the starting pile. Gated by a meta key so later deploys / tab
 * loads do not erase new bets.
 *
 * Bump FRESH_START_KEY if you ever need to do this again.
 */
export const FRESH_START_KEY = 'freshStart:2026-08-27';

export async function applyFreshStart(db, { startingBalance, nowIso, metaGet, metaSet }) {
  if (await metaGet(db, FRESH_START_KEY)) return false;
  await db.batch([
    db.prepare('DELETE FROM bets'),
    db.prepare('UPDATE users SET balance = ?').bind(startingBalance),
  ]);
  await metaSet(db, FRESH_START_KEY, nowIso);
  return true;
}
