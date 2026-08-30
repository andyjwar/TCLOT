/**
 * FPL `event/{gw}/live` `total_points` / `goals_scored` stall the same way
 * minutes do. Pulselive / ESPN already publish the fixture event log
 * (Calvert-Lewin + Schade on the board while the headline stays 0–0).
 *
 * Lift Lineups G / A / cards / PTS from that log. Never invent a goal for
 * someone FPL has not recorded as playing, and never step backwards from
 * official FPL totals.
 */

import { defensiveContributionPointsFromLiveRow } from './fplBonusFromBps.js';

const DEFAULT_SCORING = {
  long_play_limit: 60,
  short_play: 1,
  long_play: 2,
  concede_limit: 2,
  goals_conceded_GKP: -1,
  goals_conceded_DEF: -1,
  goals_conceded_MID: 0,
  goals_conceded_FWD: 0,
  saves_limit: 3,
  saves: 1,
  goals_scored_GKP: 10,
  goals_scored_DEF: 6,
  goals_scored_MID: 5,
  goals_scored_FWD: 4,
  assists: 3,
  clean_sheets_GKP: 4,
  clean_sheets_DEF: 4,
  clean_sheets_MID: 1,
  clean_sheets_FWD: 0,
  yellow_cards: -1,
  red_cards: -3,
  own_goals: -2,
};

function scoringNum(scoring, key, fallback) {
  const n = Number(scoring?.[key]);
  return Number.isFinite(n) ? n : fallback;
}

export function pointsPerGoal(scoring, elementTypeId) {
  const et = Number(elementTypeId);
  if (et === 1) return scoringNum(scoring, 'goals_scored_GKP', 10);
  if (et === 2) return scoringNum(scoring, 'goals_scored_DEF', 6);
  if (et === 3) return scoringNum(scoring, 'goals_scored_MID', 5);
  if (et === 4) return scoringNum(scoring, 'goals_scored_FWD', 4);
  return scoringNum(scoring, 'goals_scored_FWD', 4);
}

function normalizeEventKind(kind) {
  const k = String(kind || '');
  if (k === 'goal' || k === 'assist') return k;
  if (k === 'yellow' || k === 'yellow_card') return 'yellow';
  if (k === 'red' || k === 'red_card') return 'red';
  return null;
}

/**
 * Count Prem events for one FPL element. ESPN uses `yellow_card` / `red_card`;
 * Pulselive uses `yellow` / `red`.
 *
 * @param {object[] | null | undefined} premRows
 * @param {number} elementId
 * @returns {{ goals: number, assists: number, yellows: number, reds: number, ownGoals: number }}
 */
export function tallyPremEventsForElement(premRows, elementId) {
  const eid = Number(elementId);
  const out = { goals: 0, assists: 0, yellows: 0, reds: 0, ownGoals: 0 };
  if (!Number.isFinite(eid)) return out;
  for (const row of premRows || []) {
    for (const ev of row?.events || []) {
      if (Number(ev?.elementId) !== eid) continue;
      const kind = normalizeEventKind(ev?.kind);
      if (kind === 'goal' && ev?.isOwnGoal) out.ownGoals += 1;
      else if (kind === 'goal') out.goals += 1;
      else if (kind === 'assist') out.assists += 1;
      else if (kind === 'yellow') out.yellows += 1;
      else if (kind === 'red') out.reds += 1;
    }
  }
  return out;
}

/**
 * Match score implied by Prem goal events (own goals credit the other side).
 *
 * @param {object[] | null | undefined} events
 * @returns {{ homeScore: number, awayScore: number }}
 */
export function scoreFromPremEvents(events) {
  let home = 0;
  let away = 0;
  for (const ev of events || []) {
    if (normalizeEventKind(ev?.kind) !== 'goal') continue;
    const side = ev?.teamSide;
    if (ev?.isOwnGoal) {
      if (side === 'home') away += 1;
      else if (side === 'away') home += 1;
    } else if (side === 'home') home += 1;
    else if (side === 'away') away += 1;
  }
  return { homeScore: home, awayScore: away };
}

/**
 * Prefer the higher of a reported Prem/FPL score and the event-log score
 * (Leeds–Brentford headline 0–0 while Calvert-Lewin + Schade are already
 * in the log).
 *
 * @param {object | null | undefined} score
 * @param {object[] | null | undefined} events
 * @returns {object | null | undefined}
 */
export function liftScoreFromEvents(score, events) {
  const fromEvents = scoreFromPremEvents(events);
  if (fromEvents.homeScore === 0 && fromEvents.awayScore === 0) {
    return score;
  }
  const rh = Number(score?.homeScore);
  const ra = Number(score?.awayScore);
  const home = Math.max(Number.isFinite(rh) ? rh : 0, fromEvents.homeScore);
  const away = Math.max(Number.isFinite(ra) ? ra : 0, fromEvents.awayScore);
  if (!score) {
    return { homeScore: home, awayScore: away, started: true };
  }
  if (home === (Number.isFinite(rh) ? rh : 0) && away === (Number.isFinite(ra) ? ra : 0)) {
    return score;
  }
  return { ...score, homeScore: home, awayScore: away };
}

/**
 * Goals this club conceded in Prem rows this GW, after lifting 0–0 scores
 * from the event log. Null when no Prem score/events cover the club.
 *
 * @param {object[] | null | undefined} premRows
 * @param {number | null | undefined} teamId
 * @returns {number | null}
 */
export function premGoalsConcededForTeam(premRows, teamId) {
  const tid = Number(teamId);
  if (!Number.isFinite(tid)) return null;
  let total = 0;
  let saw = false;
  for (const row of premRows || []) {
    const th = Number(row?.fplFixture?.team_h);
    const ta = Number(row?.fplFixture?.team_a);
    if (tid !== th && tid !== ta) continue;
    const lifted = liftScoreFromEvents(row?.score, row?.events);
    const hs = Number(lifted?.homeScore);
    const as = Number(lifted?.awayScore);
    if (!Number.isFinite(hs) && !Number.isFinite(as)) continue;
    saw = true;
    total += tid === th ? (Number.isFinite(as) ? as : 0) : Number.isFinite(hs) ? hs : 0;
  }
  return saw ? total : null;
}

function appearancePoints(minutes, scoring) {
  const m = Number(minutes) || 0;
  if (m <= 0) return 0;
  const limit = scoringNum(scoring, 'long_play_limit', DEFAULT_SCORING.long_play_limit);
  const shortP = scoringNum(scoring, 'short_play', DEFAULT_SCORING.short_play);
  const longP = scoringNum(scoring, 'long_play', DEFAULT_SCORING.long_play);
  return m >= limit ? longP : shortP;
}

function cleanSheetPoints(minutes, conceded, elementTypeId, scoring) {
  const m = Number(minutes) || 0;
  const limit = scoringNum(scoring, 'long_play_limit', DEFAULT_SCORING.long_play_limit);
  if (m < limit || (Number(conceded) || 0) > 0) return 0;
  const et = Number(elementTypeId);
  if (et === 1) return scoringNum(scoring, 'clean_sheets_GKP', 4);
  if (et === 2) return scoringNum(scoring, 'clean_sheets_DEF', 4);
  if (et === 3) return scoringNum(scoring, 'clean_sheets_MID', 1);
  return 0;
}

function goalsConcededPoints(conceded, elementTypeId, scoring) {
  const n = Number(conceded) || 0;
  const limit = scoringNum(scoring, 'concede_limit', 2);
  if (n < limit) return 0;
  const et = Number(elementTypeId);
  const per =
    et === 1
      ? scoringNum(scoring, 'goals_conceded_GKP', -1)
      : et === 2
        ? scoringNum(scoring, 'goals_conceded_DEF', -1)
        : 0;
  return Math.floor(n / limit) * per;
}

function savePoints(saves, elementTypeId, scoring) {
  if (Number(elementTypeId) !== 1) return 0;
  const s = Number(saves) || 0;
  const limit = scoringNum(scoring, 'saves_limit', 3);
  const per = scoringNum(scoring, 'saves', 1);
  if (limit <= 0) return 0;
  return Math.floor(s / limit) * per;
}

/**
 * @param {{
 *   fpl: {
 *     minutes?: number,
 *     goals?: number,
 *     assists?: number,
 *     yellows?: number,
 *     reds?: number,
 *     ownGoals?: number,
 *     cleanSheets?: number,
 *     goalsConceded?: number,
 *     saves?: number,
 *     totalPoints?: number,
 *     bonusApi?: number,
 *   },
 *   displayedMinutes: number,
 *   elementId: number,
 *   elementTypeId?: number | null,
 *   teamId?: number | null,
 *   premRows?: object[],
 *   liveFullRow?: object | null,
 *   scoring?: object | null,
 * }} opts
 * @returns {{
 *   goalsScored: number,
 *   assists: number,
 *   yellowCards: number,
 *   redCards: number,
 *   cleanSheets: number,
 *   goalsConceded: number,
 *   total_points: number,
 * }}
 */
export function resolveDisplayedPoints({
  fpl = {},
  displayedMinutes,
  elementId,
  elementTypeId = null,
  teamId = null,
  premRows = [],
  liveFullRow = null,
  scoring = null,
}) {
  const rules = scoring || DEFAULT_SCORING;
  const fplGoals = Math.max(0, Number(fpl.goals) || 0);
  const fplAssists = Math.max(0, Number(fpl.assists) || 0);
  const fplYellows = Math.max(0, Number(fpl.yellows) || 0);
  const fplReds = Math.max(0, Number(fpl.reds) || 0);
  const fplOg = Math.max(0, Number(fpl.ownGoals) || 0);
  const fplCs = Math.max(0, Number(fpl.cleanSheets) || 0);
  const fplGc = Math.max(0, Number(fpl.goalsConceded) || 0);
  const fplSaves = Math.max(0, Number(fpl.saves) || 0);
  const fplTotal = Number(fpl.totalPoints);
  const fplPts = Number.isFinite(fplTotal) ? fplTotal : 0;
  const bonusApi = Math.max(0, Number(fpl.bonusApi) || 0);
  const mins = Math.max(0, Number(displayedMinutes) || Number(fpl.minutes) || 0);

  const prem = tallyPremEventsForElement(premRows, elementId);
  /** Do not credit Prem events to someone FPL has not put on the pitch. */
  const onPitch = mins > 0 || (Number(fpl.minutes) || 0) > 0;
  const goals = onPitch ? Math.max(fplGoals, prem.goals) : fplGoals;
  const assists = onPitch ? Math.max(fplAssists, prem.assists) : fplAssists;
  const yellows = onPitch ? Math.max(fplYellows, prem.yellows) : fplYellows;
  const reds = onPitch ? Math.max(fplReds, prem.reds) : fplReds;
  const ownGoals = onPitch ? Math.max(fplOg, prem.ownGoals) : fplOg;

  const premGc = premGoalsConcededForTeam(premRows, teamId);
  const conceded = premGc != null ? Math.max(fplGc, premGc) : fplGc;
  const longLimit = scoringNum(rules, 'long_play_limit', 60);
  let cs = fplCs;
  if (premGc != null) {
    cs = conceded > 0 ? 0 : mins >= longLimit ? Math.max(fplCs, 1) : fplCs;
  }

  const dcPts = defensiveContributionPointsFromLiveRow(liveFullRow || {}) || 0;
  const floor =
    appearancePoints(mins, rules) +
    goals * pointsPerGoal(rules, elementTypeId) +
    assists * scoringNum(rules, 'assists', 3) +
    yellows * scoringNum(rules, 'yellow_cards', -1) +
    reds * scoringNum(rules, 'red_cards', -3) +
    ownGoals * scoringNum(rules, 'own_goals', -2) +
    (cs > 0 ? cleanSheetPoints(mins, 0, elementTypeId, rules) : 0) +
    goalsConcededPoints(conceded, elementTypeId, rules) +
    savePoints(fplSaves, elementTypeId, rules) +
    dcPts;

  return {
    goalsScored: goals,
    assists,
    yellowCards: yellows,
    redCards: reds,
    cleanSheets: cs,
    goalsConceded: conceded,
    total_points: Math.max(fplPts, floor + bonusApi),
  };
}

/**
 * Recompute G/A/cards/PTS after a minutes retick (60' appearance / CS).
 *
 * @param {object} row
 * @param {{
 *   premRows?: object[],
 *   liveFullByElementId?: Record<number, object>,
 *   scoring?: object | null,
 * }} ctx
 * @returns {object}
 */
export function retickRowPoints(row, ctx = {}) {
  if (!row || row.teamId == null) return row;
  const blended = resolveDisplayedPoints({
    fpl: {
      minutes: row.fplMinutes,
      goals: row.fplGoals,
      assists: row.fplAssists,
      yellows: row.fplYellows,
      reds: row.fplReds,
      ownGoals: row.fplOwnGoals,
      cleanSheets: row.fplCleanSheets,
      goalsConceded: row.fplGoalsConceded,
      saves: row.fplSaves,
      totalPoints: row.fplTotalPoints,
      bonusApi: row.bonusApi,
    },
    displayedMinutes: row.minutes,
    elementId: row.element,
    elementTypeId: row.elementTypeId,
    teamId: row.teamId,
    premRows: ctx.premRows || [],
    liveFullRow: ctx.liveFullByElementId?.[row.element] ?? null,
    scoring: ctx.scoring,
  });
  return { ...row, ...blended };
}
