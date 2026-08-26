/**
 * Pure settlement rules for the bookie Worker — separated from index.js so
 * they can be unit-tested with node:test (the Worker runtime itself needs
 * miniflare + live FPL egress, which CI doesn't have).
 */

/**
 * Whether every Premier League fixture for `gw` is finished (or provisionally
 * finished) — the same effective-finish rule as web/src/h2hEffectiveFinished.js,
 * bridging FPL Draft's slow post-GW "data checked" lag.
 */
export function footballComplete(fixtures, gw) {
  const rows = (Array.isArray(fixtures) ? fixtures : []).filter((f) => Number(f?.event) === gw);
  if (rows.length === 0) return false;
  return rows.every((f) => f?.finished === true || f?.finished_provisional === true);
}

/**
 * Grade one H2H market against its FPL Draft match row. The match may be
 * stored in either orientation, so re-orient by the market's home entry.
 * Returns `{ result: 'home'|'draw'|'away', home, away }` or null if the
 * scores aren't numeric yet.
 */
export function h2hResultForMarket(payload, match) {
  const oriented = Number(match.league_entry_1) === Number(payload.homeEntryId);
  // Number(null) is 0, which would silently grade a scoreless match row as a
  // 0-point loss — require an actual numeric value before coercing.
  const score = (v) => (v == null || v === '' ? NaN : Number(v));
  const p1 = score(match.league_entry_1_points);
  const p2 = score(match.league_entry_2_points);
  const home = oriented ? p1 : p2;
  const away = oriented ? p2 : p1;
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  if (home > away) return { result: 'home', home, away };
  if (away > home) return { result: 'away', home, away };
  return { result: 'draw', home, away };
}

/** Titan = top 4; Minnow = bottom 4 (8-team TCLOT table). */
export const TITAN_PLACES = 4
export const MINNOW_PLACES = 4
export const SEASON_MARKET_KINDS = ['outright', 'titan', 'minnow', 'last']

/**
 * Final table from finished matches (3/1/0, PF tiebreak), or null while any
 * row is still open. `order[0]` is the champion; `ranks` is entryId → 1-based rank.
 */
export function ranksFromMatches(matches) {
  const all = Array.isArray(matches) ? matches : [];
  if (all.length === 0 || !all.every((m) => m.finished === true)) return null;
  const table = new Map();
  const row = (id) => {
    if (!table.has(id)) table.set(id, { pts: 0, pf: 0 });
    return table.get(id);
  };
  for (const m of all) {
    const a = row(Number(m.league_entry_1));
    const b = row(Number(m.league_entry_2));
    const pa = Number(m.league_entry_1_points) || 0;
    const pb = Number(m.league_entry_2_points) || 0;
    a.pf += pa;
    b.pf += pb;
    if (pa > pb) a.pts += 3;
    else if (pb > pa) b.pts += 3;
    else {
      a.pts += 1;
      b.pts += 1;
    }
  }
  const order = [...table.entries()]
    .sort((x, y) => y[1].pts - x[1].pts || y[1].pf - x[1].pf)
    .map(([id]) => id);
  if (order.length === 0) return null;
  const ranks = new Map();
  order.forEach((id, i) => ranks.set(id, i + 1));
  return { order, ranks };
}

/** Final league champion from finished matches (3/1/0, PF tiebreak), or null. */
export function championFromMatches(matches) {
  const table = ranksFromMatches(matches);
  return table ? table.order[0] : null;
}

/**
 * Winning selections (entry-id strings) for a season-long place market.
 * Titan pays the top four; Minnow the bottom four; last pays only 8th.
 *
 * @param {'outright' | 'titan' | 'minnow' | 'last'} kind
 * @param {{ order: number[] } | null} ranked
 * @returns {Set<string> | null}
 */
export function seasonKindWinners(kind, ranked) {
  if (!ranked?.order?.length) return null;
  const n = ranked.order.length;
  if (kind === 'outright') return new Set([String(ranked.order[0])]);
  if (kind === 'last') return new Set([String(ranked.order[n - 1])]);
  if (kind === 'titan') {
    return new Set(ranked.order.slice(0, Math.min(TITAN_PLACES, n)).map(String));
  }
  if (kind === 'minnow') {
    return new Set(ranked.order.slice(Math.max(0, n - MINNOW_PLACES)).map(String));
  }
  return null;
}
