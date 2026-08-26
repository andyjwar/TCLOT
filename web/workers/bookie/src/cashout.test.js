import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CASHOUT_MARGIN,
  cashoutValue,
  remainingFraction,
  liveH2hProbs,
} from './cashout.js';

/* ------------------------------------------------------------------ */
/* cashoutValue                                                         */
/* ------------------------------------------------------------------ */

test('cashoutValue: fair value shaved by the house margin', () => {
  // 100 @ 2.5 with a 40% chance: fair 100, offered 92 at the default 8%.
  assert.equal(cashoutValue({ stake: 100, odds: 2.5, pNow: 0.4 }), 92);
});

test('cashoutValue: near-certain winner offers just under full payout', () => {
  const v = cashoutValue({ stake: 100, odds: 2.5, pNow: 1 });
  assert.equal(v, Math.floor(250 * (1 - CASHOUT_MARGIN)));
  assert.ok(v < 250);
});

test('cashoutValue: never exceeds the winning payout even at pNow > 1', () => {
  assert.ok(cashoutValue({ stake: 100, odds: 2, pNow: 5 }) <= 200);
});

test('cashoutValue: dead position offers nothing', () => {
  assert.equal(cashoutValue({ stake: 100, odds: 2.5, pNow: 0 }), 0);
  assert.equal(cashoutValue({ stake: 100, odds: 2.5, pNow: -1 }), 0);
});

test('cashoutValue: garbage in, zero out', () => {
  assert.equal(cashoutValue({ stake: NaN, odds: 2, pNow: 0.5 }), 0);
  assert.equal(cashoutValue({ stake: 100, odds: 0.5, pNow: 0.5 }), 0);
  assert.equal(cashoutValue({ stake: 0, odds: 2, pNow: 0.5 }), 0);
});

test('cashoutValue: pre-kickoff exit costs vig plus margin, not more', () => {
  // Market priced at p=0.4 with ~4% overround → odds 2.4. Cashing straight
  // out returns most of the stake but never all of it.
  const v = cashoutValue({ stake: 100, odds: 2.4, pNow: 0.4 });
  assert.ok(v >= 80 && v < 100, `expected 80..99, got ${v}`);
});

/* ------------------------------------------------------------------ */
/* remainingFraction                                                    */
/* ------------------------------------------------------------------ */

const fx = (event, finished) => ({ event, finished, finished_provisional: finished });

test('remainingFraction: 1 before kickoff, 0 when all finished', () => {
  assert.equal(remainingFraction([fx(2, false), fx(2, false)], 2), 1);
  assert.equal(remainingFraction([fx(2, true), fx(2, true)], 2), 0);
});

test('remainingFraction: partial gameweek, other GWs ignored', () => {
  const fixtures = [fx(2, true), fx(2, true), fx(2, false), fx(2, false), fx(3, false)];
  assert.equal(remainingFraction(fixtures, 2), 0.5);
});

test('remainingFraction: unknown gameweek counts as everything left', () => {
  assert.equal(remainingFraction([], 7), 1);
  assert.equal(remainingFraction(null, 7), 1);
});

test('remainingFraction: provisional finish counts as finished', () => {
  const fixtures = [
    { event: 2, finished: false, finished_provisional: true },
    { event: 2, finished: false, finished_provisional: false },
  ];
  assert.equal(remainingFraction(fixtures, 2), 0.5);
});

/* ------------------------------------------------------------------ */
/* liveH2hProbs                                                         */
/* ------------------------------------------------------------------ */

const prior = { home: 0.39, draw: 0.02, away: 0.59 };

function assertSumsToOne(p) {
  assert.ok(Math.abs(p.home + p.draw + p.away - 1) < 1e-9);
}

test('liveH2hProbs: before kickoff the opening prices stand', () => {
  const p = liveH2hProbs(prior, 0, 0, 1);
  assertSumsToOne(p);
  assert.ok(Math.abs(p.home - 0.39) < 0.001);
  assert.ok(Math.abs(p.away - 0.59) < 0.001);
});

test('liveH2hProbs: a big lead mid-gameweek beats the opening price', () => {
  const p = liveH2hProbs(prior, 45, 20, 0.5);
  assertSumsToOne(p);
  assert.ok(p.home > 0.7, `expected the leader well clear, got ${p.home}`);
  assert.ok(p.home > p.away);
});

test('liveH2hProbs: same lead is worth more with less football left', () => {
  const early = liveH2hProbs(prior, 30, 20, 0.9);
  const late = liveH2hProbs(prior, 30, 20, 0.1);
  assert.ok(late.home > early.home);
});

test('liveH2hProbs: level late means the draw is live', () => {
  const p = liveH2hProbs(prior, 40, 40, 0.05);
  assertSumsToOne(p);
  assert.ok(p.draw > 0.3, `expected a live draw, got ${p.draw}`);
});

test('liveH2hProbs: football over, scoreboard is destiny', () => {
  assert.deepEqual(liveH2hProbs(prior, 50, 40, 0), { home: 1, draw: 0, away: 0 });
  assert.deepEqual(liveH2hProbs(prior, 40, 50, 0), { home: 0, draw: 0, away: 1 });
  assert.deepEqual(liveH2hProbs(prior, 40, 40, 0), { home: 0, draw: 1, away: 0 });
});

test('liveH2hProbs: missing prior falls back to the live model alone', () => {
  const p = liveH2hProbs(null, 30, 10, 0.5);
  assertSumsToOne(p);
  assert.ok(p.home > 0.7);
});
