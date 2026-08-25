/**
 * "Game week closed" detection for the H2H league.
 *
 * FPL Draft only flips `details.matches[].finished` (and the event-level
 * `finished` / `data_checked` flags) after its post-gameweek "data checked" step,
 * which lags the actual football by many hours — sometimes more than a day. Every
 * results / standings / form / schedule path in the app gates on
 * `m.finished === true`, so in that gap a closed gameweek renders as if nothing
 * happened: no scores, no standings movement, no form update.
 *
 * These helpers bridge that gap. A gameweek's H2H matches are treated as
 * effectively final as soon as all of that GW's Premier League fixtures are
 * complete — `finished` OR `finished_provisional` in the classic `fixtures.json`.
 * At that point every match already carries provisional points (bonus included)
 * in `details.json`, so results and standings can be derived immediately and are
 * re-derived from the confirmed points once FPL sets `finished` for real.
 */

/**
 * GW ids whose Premier League football is complete: the GW has at least one
 * fixture and every fixture for it is finished or provisionally finished.
 *
 * @param {object[] | null | undefined} fixtures Classic `fixtures.json` array.
 * @returns {Set<number>}
 */
export function completedFootballGameweeks(fixtures) {
  const byGw = new Map();
  for (const f of Array.isArray(fixtures) ? fixtures : []) {
    const ev = Number(f?.event);
    if (!Number.isFinite(ev) || ev < 1) continue;
    const done = f?.finished === true || f?.finished_provisional === true;
    const prevAllDone = byGw.get(ev);
    byGw.set(ev, prevAllDone === undefined ? done : prevAllDone && done);
  }
  const out = new Set();
  for (const [ev, allDone] of byGw) {
    if (allDone) out.add(ev);
  }
  return out;
}

/**
 * Whether one H2H match should count as final for results / standings / form.
 *
 * True when FPL already marked it finished, or when its gameweek's football is
 * complete and both sides carry finite points (guards against unplayed rows).
 *
 * @param {object} m A `details.matches[]` row.
 * @param {Set<number>} completedGws Output of {@link completedFootballGameweeks}.
 * @returns {boolean}
 */
export function matchEffectivelyFinished(m, completedGws) {
  if (!m) return false;
  if (m.finished === true) return true;
  if (!(completedGws instanceof Set)) return false;
  if (!completedGws.has(Number(m.event))) return false;
  if (m.started !== true) return false;
  const p1 = Number(m.league_entry_1_points);
  const p2 = Number(m.league_entry_2_points);
  return Number.isFinite(p1) && Number.isFinite(p2);
}

/**
 * Return the matches array with `finished` promoted to `true` for every row whose
 * gameweek has effectively closed. Rows that are already finished (or not yet
 * complete) are returned unchanged, so the result is safe to feed to every
 * existing consumer of `details.matches`.
 *
 * @param {object[] | null | undefined} matches `details.matches` array.
 * @param {object[] | null | undefined} fixtures Classic `fixtures.json` array.
 * @returns {object[]}
 */
export function normalizeMatchesFinished(matches, fixtures) {
  const list = Array.isArray(matches) ? matches : [];
  const completed = completedFootballGameweeks(fixtures);
  if (completed.size === 0) return list;
  return list.map((m) =>
    m && m.finished !== true && matchEffectivelyFinished(m, completed)
      ? { ...m, finished: true }
      : m,
  );
}
