/**
 * Cash-out pricing — pure rules, unit-tested with node:test (see
 * cashout.test.js). index.js supplies the data (bet, market payload, live
 * FPL scores); everything here is deterministic maths.
 *
 * The offer is the classic bookie tease: the bet's current win probability
 * times its potential payout, shaved by a house margin. Take it and you
 * bank a guaranteed profit — the house banks the shave. Before kickoff the
 * probability is the model price the market opened with; once the gameweek
 * is underway it is re-priced live from the actual score margin, so a
 * punter whose long shot is suddenly 20 points up gets a genuinely tempting
 * number dangled in front of them.
 */

/** Fraction of fair value the house keeps on every cash-out. */
export const CASHOUT_MARGIN = 0.08;

/**
 * The Clotcoin offer for cashing out now, or 0 when the position is
 * worthless. Never exceeds what the ticket would pay if it just won.
 *
 * @param {{ stake: number, odds: number, pNow: number, margin?: number }} args
 * @returns {number} whole Clotcoins
 */
export function cashoutValue({ stake, odds, pNow, margin = CASHOUT_MARGIN }) {
  const s = Number(stake);
  const o = Number(odds);
  const p = Number(pNow);
  if (!Number.isFinite(s) || !Number.isFinite(o) || !Number.isFinite(p)) return 0;
  if (s <= 0 || o < 1 || p <= 0) return 0;
  const payout = Math.round(s * o);
  const offer = Math.floor(s * o * Math.min(1, p) * (1 - margin));
  return Math.max(0, Math.min(offer, payout));
}

/**
 * Fraction of the gameweek's Premier League football still to be played:
 * 1 before a ball is kicked, 0 once every fixture is (provisionally)
 * finished. Same fixture feed and finish rule as settlement.js.
 */
export function remainingFraction(fixtures, gw) {
  const rows = (Array.isArray(fixtures) ? fixtures : []).filter(
    (f) => Number(f?.event) === Number(gw),
  );
  if (rows.length === 0) return 1;
  const done = rows.filter(
    (f) => f?.finished === true || f?.finished_provisional === true,
  ).length;
  return (rows.length - done) / rows.length;
}

/**
 * Live H2H outcome probabilities from the current score margin, blended
 * with the market's opening (model) prices.
 *
 * The live component treats the remaining swing between two FPL squads as
 * a logistic around the current margin whose scale shrinks with the square
 * root of the football left (~20 points across a full GW, floored at 3 so
 * nothing is a dead cert until the whistle). The exact-tie (draw) chance
 * starts tiny and grows as the GW runs out with the scores level. The
 * opening prices are blended back in with weight = remaining² — full say
 * pre-kickoff, fading fast once real scores exist, gone by the last match.
 *
 * @param {{ home: number, draw: number, away: number }} prior opening probs
 * @param {number} homePts current live points for the market's home side
 * @param {number} awayPts current live points for the market's away side
 * @param {number} remainingFrac 0..1 football left (remainingFraction())
 * @returns {{ home: number, draw: number, away: number }}
 */
export function liveH2hProbs(prior, homePts, awayPts, remainingFrac) {
  const rem = Math.min(1, Math.max(0, Number(remainingFrac)));
  const d = (Number(homePts) || 0) - (Number(awayPts) || 0);

  let live;
  if (rem <= 0.0001) {
    live =
      d > 0
        ? { home: 1, draw: 0, away: 0 }
        : d < 0
          ? { home: 0, draw: 0, away: 1 }
          : { home: 0, draw: 1, away: 0 };
  } else {
    const scale = Math.max(3, 20 * Math.sqrt(rem));
    // Exact-tie chance: negligible with lots of football left, meaningful
    // only late with the scores close.
    const draw = (0.04 + 0.55 * (1 - rem) ** 4) * Math.exp(-Math.abs(d) / scale);
    const homeShare = 1 / (1 + Math.exp(-d / scale));
    live = {
      home: (1 - draw) * homeShare,
      draw,
      away: (1 - draw) * (1 - homeShare),
    };
  }

  const pr = {
    home: Math.max(0, Number(prior?.home) || 0),
    draw: Math.max(0, Number(prior?.draw) || 0),
    away: Math.max(0, Number(prior?.away) || 0),
  };
  const priorSum = pr.home + pr.draw + pr.away;
  if (priorSum <= 0) return live;

  const w = rem * rem; // opening prices fade out fast once real scores exist
  const blend = {
    home: (w * pr.home) / priorSum + (1 - w) * live.home,
    draw: (w * pr.draw) / priorSum + (1 - w) * live.draw,
    away: (w * pr.away) / priorSum + (1 - w) * live.away,
  };
  const sum = blend.home + blend.draw + blend.away;
  return { home: blend.home / sum, draw: blend.draw / sum, away: blend.away / sum };
}
