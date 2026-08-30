/**
 * FPL `event/{gw}/live` `stats.minutes` only ticks on scoring events / periodic
 * flushes. A starter at 36' often still shows 7–9 on the Lineups MIN column.
 *
 * Blend official FPL minutes with the Pulselive / ESPN match clock for players
 * still on the pitch. Never invent minutes for someone FPL has not yet recorded
 * as playing, and never overwrite a player who has already been subbed off
 * or sent off.
 */

import {
  explainBlocksFromLiveElement,
  fixturesForTeamInGw,
  isFixtureFullyDone,
} from './fplBonusFromBps.js';

/**
 * Parse a live clock label into elapsed match minutes (integer).
 *
 * Accepts Pulselive (`36'00`, `45+2'00`), ESPN (`36'`, `1H 36'`, `36:00`),
 * and half-time tokens (`HT`, `Half Time`).
 *
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseLiveClockMinutes(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^(ht|half[\s-]*time)$/i.test(s)) return 45;
  if (/^(ft|full[\s-]*time)$/i.test(s)) return null;

  const stoppage = /(\d+)\s*\+\s*(\d+)/.exec(s);
  if (stoppage) {
    const base = Number(stoppage[1]);
    const extra = Number(stoppage[2]);
    if (Number.isFinite(base) && Number.isFinite(extra)) return base + extra;
  }

  const prime = /(\d+)\s*['′]/.exec(s);
  if (prime) {
    const n = Number(prime[1]);
    return Number.isFinite(n) ? n : null;
  }

  const mmss = /(\d{1,3}):(\d{2})\b/.exec(s);
  if (mmss) {
    const n = Number(mmss[1]);
    return Number.isFinite(n) ? n : null;
  }

  const bare = /^(\d{1,3})$/.exec(s);
  if (bare) return Number(bare[1]);

  return null;
}

/**
 * Best available in-play clock for one fixture: Prem `liveMinute` / status,
 * then FPL classic `fixtures[].minutes`.
 *
 * @param {object | null | undefined} premRow
 * @param {object | null | undefined} fplFixture
 * @returns {number | null}
 */
export function fixtureLiveClockMinutes(premRow, fplFixture) {
  const fromPrem =
    parseLiveClockMinutes(premRow?.score?.liveMinute) ??
    parseLiveClockMinutes(premRow?.score?.statusText);
  if (fromPrem != null) return fromPrem;
  if (/half\s*time/i.test(String(premRow?.score?.statusText || ''))) return 45;
  const m = Number(fplFixture?.minutes);
  if (Number.isFinite(m) && m > 0) return m;
  return null;
}

/**
 * @param {object | null | undefined} premRow
 * @param {number} elementId
 * @returns {{ subbedOff: boolean, cameOnMinute: number | null }}
 */
export function substitutionStateForElement(premRow, elementId) {
  const eid = Number(elementId);
  const empty = { subbedOff: false, cameOnMinute: null };
  if (!Number.isFinite(eid)) return empty;
  const subs = Array.isArray(premRow?.substitutions)
    ? premRow.substitutions
    : [];
  const mine = subs
    .filter((s) => Number(s?.elementId) === eid)
    .slice()
    .sort((a, b) => {
      const am = Number(a?.minute);
      const bm = Number(b?.minute);
      const av = Number.isFinite(am) ? am : 0;
      const bv = Number.isFinite(bm) ? bm : 0;
      if (av !== bv) return av - bv;
      /** OFF before ON at the same minute (replace pair). */
      if (a?.action === b?.action) return 0;
      if (a?.action === 'off') return -1;
      if (b?.action === 'off') return 1;
      return 0;
    });
  if (!mine.length) return empty;

  let subbedOff = false;
  let cameOnMinute = null;
  for (const s of mine) {
    if (s.action === 'on') {
      subbedOff = false;
      const m = Number(s.minute);
      if (Number.isFinite(m)) cameOnMinute = m;
    } else if (s.action === 'off') {
      subbedOff = true;
    }
  }
  return { subbedOff, cameOnMinute };
}

/**
 * @param {{
 *   fplMinutes: number,
 *   clockMinutes: number | null,
 *   fixtureLive: boolean,
 *   matchdayRole?: 'xi' | 'bench' | 'absent' | null,
 *   redCards?: number,
 *   subbedOff?: boolean,
 *   cameOnMinute?: number | null,
 * }} opts
 * @returns {number}
 */
export function blendLivePlayerMinutes({
  fplMinutes,
  clockMinutes,
  fixtureLive,
  matchdayRole = null,
  redCards = 0,
  subbedOff = false,
  cameOnMinute = null,
}) {
  const fpl = Math.max(0, Number(fplMinutes) || 0);
  if (!fixtureLive) return fpl;
  const clock = Number(clockMinutes);
  if (!Number.isFinite(clock) || clock <= 0) return fpl;
  if ((Number(redCards) || 0) > 0) return fpl;
  if (subbedOff) return fpl;
  /** FPL has not recorded them on the pitch — do not invent a start. */
  if (fpl <= 0) return fpl;
  if (matchdayRole === 'absent') return fpl;
  /**
   * Named sub who came on: without an ON event, FPL's cameo minutes are more
   * honest than `clock` (which would treat them as a 0' starter).
   */
  if (matchdayRole === 'bench' && cameOnMinute == null) return fpl;

  const start = Number.isFinite(Number(cameOnMinute)) ? Number(cameOnMinute) : 0;
  const estimated = Math.max(0, Math.min(120, clock - start));
  return Math.max(fpl, estimated);
}

/**
 * Display minutes for one pick: official FPL value, lifted to the live clock
 * when the player is still on the pitch in their one in-play club fixture.
 *
 * Double gameweeks only interpolate the live slice when `explain` can split
 * minutes across fixtures — otherwise the official GW total is kept.
 *
 * @param {{
 *   fplMinutes: number,
 *   liveFullRow?: object | null,
 *   teamId: number | null,
 *   elementId: number,
 *   gwFixtures: object[],
 *   premRows: object[],
 *   matchdayRole?: 'xi' | 'bench' | 'absent' | null,
 *   redCards?: number,
 * }} opts
 * @returns {number}
 */
export function resolveDisplayedMinutes({
  fplMinutes,
  liveFullRow = null,
  teamId,
  elementId,
  gwFixtures,
  premRows,
  matchdayRole = null,
  redCards = 0,
}) {
  const fpl = Math.max(0, Number(fplMinutes) || 0);
  const tid = Number(teamId);
  if (!Number.isFinite(tid)) return fpl;

  const mine = fixturesForTeamInGw(gwFixtures || [], tid);
  const liveFx = mine.filter(
    (f) => f?.started === true && !isFixtureFullyDone(f),
  );
  if (liveFx.length !== 1) return fpl;

  const fx = liveFx[0];
  const done = mine.filter((f) => isFixtureFullyDone(f));
  let fplInLive = fpl;
  let banked = 0;
  if (done.length > 0) {
    const blocks = explainBlocksFromLiveElement(liveFullRow || {});
    if (!blocks.length) return fpl;
    banked = blocks
      .filter((b) => done.some((f) => Number(f.id) === Number(b.fixtureId)))
      .reduce((sum, b) => sum + (Number(b.minutes) || 0), 0);
    const liveBlock = blocks.find(
      (b) => Number(b.fixtureId) === Number(fx.id),
    );
    fplInLive = liveBlock
      ? Number(liveBlock.minutes) || 0
      : Math.max(0, fpl - banked);
  }

  const prem = (premRows || []).find(
    (r) => Number(r?.fplFixture?.id) === Number(fx.id),
  );
  const clock = fixtureLiveClockMinutes(prem, fx);
  const { subbedOff, cameOnMinute } = substitutionStateForElement(
    prem,
    elementId,
  );

  const liveBlended = blendLivePlayerMinutes({
    fplMinutes: fplInLive,
    clockMinutes: clock,
    fixtureLive: true,
    matchdayRole,
    redCards,
    subbedOff,
    cameOnMinute,
  });
  return banked + liveBlended;
}
