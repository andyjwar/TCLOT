/**
 * Win-probability → traditional UK fractional odds.
 *
 * The conversion is "fair odds": decimal odds are simply 100 / pct (no
 * bookmaker margin), then snapped to the nearest rung of the traditional
 * fractional ladder so prices read like a bookie board — 83% → 1/5,
 * 57% → 3/4, 15% → 11/2, 2% → 50/1 — instead of raw fractions like
 * 100/83. Evens is shown as "Evs".
 */

/** Traditional fractional ladder, ascending decimal odds (num/den + 1). */
const LADDER = [
  [1, 100], [1, 66], [1, 50], [1, 40], [1, 33], [1, 25], [1, 20], [1, 16],
  [1, 14], [1, 12], [1, 10], [1, 9], [1, 8], [1, 7], [1, 6], [2, 11],
  [1, 5], [2, 9], [1, 4], [2, 7], [3, 10], [1, 3], [4, 11], [2, 5],
  [4, 9], [1, 2], [8, 15], [4, 7], [8, 13], [4, 6], [8, 11], [4, 5],
  [5, 6], [10, 11], [1, 1], [21, 20], [11, 10], [6, 5], [5, 4], [11, 8],
  [6, 4], [13, 8], [7, 4], [15, 8], [2, 1], [9, 4], [5, 2], [11, 4],
  [3, 1], [10, 3], [7, 2], [4, 1], [9, 2], [5, 1], [11, 2], [6, 1],
  [13, 2], [7, 1], [15, 2], [8, 1], [17, 2], [9, 1], [10, 1], [11, 1],
  [12, 1], [14, 1], [16, 1], [18, 1], [20, 1], [22, 1], [25, 1], [28, 1],
  [33, 1], [40, 1], [50, 1], [66, 1], [80, 1], [100, 1], [150, 1],
  [200, 1], [250, 1], [500, 1], [1000, 1],
];

/** Nearest ladder rung `[num, den]` for decimal odds. */
function nearestRung(dec) {
  let best = LADDER[0];
  let bestDiff = Infinity;
  for (const [n, d] of LADDER) {
    const diff = Math.abs(n / d + 1 - dec);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [n, d];
    }
  }
  return best;
}

/**
 * Snap decimal odds to the nearest rung of the traditional ladder, returning
 * the rung's exact decimal price (num/den + 1). Used by the bookie market
 * builder so every quoted price sits on the ladder — the fractional display
 * is then exact, not an approximation.
 *
 * @param {number} dec — decimal odds (> 1)
 * @returns {number} ladder decimal odds, e.g. 2.47 → 2.5 (6/4)
 */
export function snapDecimalOdds(dec) {
  const v = Number(dec);
  if (!Number.isFinite(v) || v <= 1) return 1.01;
  const [n, d] = nearestRung(v);
  return Math.round((n / d + 1) * 10000) / 10000;
}

/**
 * Traditional fractional display for decimal odds.
 *
 * @param {number} dec — decimal odds (> 1)
 * @returns {string | null} e.g. 3.5 → `"5/2"`, 2 → `"Evs"` — null if invalid.
 */
export function decimalOddsToFraction(dec) {
  const v = Number(dec);
  if (!Number.isFinite(v) || v <= 1) return null;
  const [n, d] = nearestRung(v);
  return n === 1 && d === 1 ? 'Evs' : `${n}/${d}`;
}

/**
 * Fair fractional odds for a win probability, as display text.
 *
 * @param {number} pct — probability in percent (0–100)
 * @returns {string | null} e.g. `"1/5"`, `"11/2"`, `"Evs"` — or `null` when
 *   the probability is zero/invalid (no meaningful price exists).
 */
export function probToFractionalOdds(pct) {
  const p = Number(pct);
  if (!Number.isFinite(p) || p <= 0) return null;
  if (p >= 99.5) return '1/100';
  return decimalOddsToFraction(100 / p);
}
