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
 * Wall-clock stand-in when Pulselive/ESPN/FPL all stall on the same 7–9'
 * flush. Models a 45' half + 15' interval; ignores first-half stoppage
 * (reads 45 from HT until the second half starts).
 *
 * Returns null outside a plausible live window (before kickoff, or more
 * than 3 hours after) so a stale unfinished fixture cannot mint 90+ mins
 * the next morning.
 *
 * @param {unknown} kickoffIso
 * @param {number} [nowMs]
 * @returns {number | null}
 */
export function elapsedMatchMinutesFromKickoff(kickoffIso, nowMs = Date.now()) {
  const ko = Date.parse(String(kickoffIso || ''));
  if (!Number.isFinite(ko)) return null;
  const wall = (Number(nowMs) - ko) / 60_000;
  if (!Number.isFinite(wall) || wall < 0 || wall > 180) return null;
  if (wall <= 45) return Math.floor(wall);
  if (wall <= 60) return 45;
  return Math.min(120, Math.floor(45 + (wall - 60)));
}

/**
 * True when this classic fixture should be treated as in-play for minute
 * blending. FPL's `started` flag (and `fixtures[].minutes`) lag the same
 * way player minutes do, so kickoff-in-the-past is enough.
 *
 * @param {object | null | undefined} f
 * @param {number} [nowMs]
 * @returns {boolean}
 */
export function isFixtureInPlay(f, nowMs = Date.now()) {
  if (f == null || isFixtureFullyDone(f)) return false;
  if (f.started === true) return true;
  if (Number(f.minutes) > 0) return true;
  const ko = Date.parse(String(f.kickoff_time || ''));
  if (!Number.isFinite(ko)) return false;
  const wall = (Number(nowMs) - ko) / 60_000;
  return Number.isFinite(wall) && wall >= 0 && wall <= 180;
}

/**
 * Best available in-play clock for one fixture: Prem `liveMinute` / status,
 * then the later of FPL classic `fixtures[].minutes` and elapsed kickoff
 * time. FPL's fixture minute counter stalls on the same 7–9' flush as
 * player minutes, so it cannot be the only clock.
 *
 * @param {object | null | undefined} premRow
 * @param {object | null | undefined} fplFixture
 * @param {number} [nowMs]
 * @returns {number | null}
 */
export function fixtureLiveClockMinutes(premRow, fplFixture, nowMs = Date.now()) {
  const fromPrem =
    parseLiveClockMinutes(premRow?.score?.liveMinute) ??
    parseLiveClockMinutes(premRow?.score?.statusText);
  if (fromPrem != null) return fromPrem;
  if (/half\s*time/i.test(String(premRow?.score?.statusText || ''))) return 45;
  const m = Number(fplFixture?.minutes);
  const fromFpl = Number.isFinite(m) && m > 0 ? m : null;
  const kickoffIso =
    premRow?.score?.kickoffIso || fplFixture?.kickoff_time || null;
  const fromKick = elapsedMatchMinutesFromKickoff(kickoffIso, nowMs);
  if (fromFpl != null && fromKick != null) return Math.max(fromFpl, fromKick);
  if (fromKick != null) return fromKick;
  if (fromFpl != null) return fromFpl;
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
  /**
   * FPL has not recorded them on the pitch — do not invent a start.
   * `absent` is only an ESPN name-match hint for autosub; once FPL has
   * minutes they are on the pitch and the clock may lift them.
   */
  if (fpl <= 0) return fpl;
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
 *   nowMs?: number,
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
  nowMs = Date.now(),
}) {
  const fpl = Math.max(0, Number(fplMinutes) || 0);
  const tid = Number(teamId);
  if (!Number.isFinite(tid)) return fpl;

  const mine = fixturesForTeamInGw(gwFixtures || [], tid);
  const liveFx = mine.filter((f) => isFixtureInPlay(f, nowMs));
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
  const clock = fixtureLiveClockMinutes(prem, fx, nowMs);
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

/**
 * Recompute one pick row's displayed minutes from stored official FPL
 * minutes + the current Prem/kickoff clock. Used to tick the Lineups MIN
 * column between 90s live polls.
 *
 * @param {object} row
 * @param {{
 *   gwFixtures?: object[],
 *   premRows?: object[],
 *   liveFullByElementId?: Record<number, object>,
 *   nowMs?: number,
 * }} ctx
 * @returns {object}
 */
export function retickRowMinutes(row, ctx = {}) {
  if (!row || row.teamId == null) return row;
  return {
    ...row,
    minutes: resolveDisplayedMinutes({
      fplMinutes: row.fplMinutes ?? 0,
      liveFullRow: ctx.liveFullByElementId?.[row.element] ?? null,
      teamId: row.teamId,
      elementId: row.element,
      gwFixtures: ctx.gwFixtures || [],
      premRows: ctx.premRows || [],
      matchdayRole: row.espnMatchdayRole,
      redCards: row.redCards,
      nowMs: ctx.nowMs,
    }),
  };
}
