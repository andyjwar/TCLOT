import { defensiveContributionPointsFromLiveRow } from './fplBonusFromBps.js';

/** FPL element_type id for goalkeepers */
const ELEMENT_TYPE_GKP = 1;

/**
 * Fantasy points from saves (1 pt per 3 saves) — goalkeepers only.
 * @param {number | null | undefined} saves
 * @param {number | null | undefined} elementTypeId
 */
export function saveFantasyPointsFromSaves(saves, elementTypeId) {
  if (Number(elementTypeId) !== ELEMENT_TYPE_GKP) return 0;
  const s = Number(saves) || 0;
  return Math.floor(s / 3);
}

function statsOf(liveRow) {
  return liveRow?.stats || {};
}

/**
 * Draft `explain`: `[ [ stats[], fixtureId ], … ]`; classic: `[ { fixture, stats }, … ]`.
 * @param {object | null | undefined} raw — full live element row
 * @returns {number[]}
 */
export function explainFixtureIdsFromLiveRow(raw) {
  const ex = raw?.explain;
  if (!Array.isArray(ex) || !ex.length) return [];
  const first = ex[0];
  if (Array.isArray(first) && first.length === 2 && typeof first[1] === 'number') {
    return ex.map((pair) => Number(pair[1])).filter((n) => Number.isFinite(n));
  }
  if (first && first.fixture != null) {
    return ex.map((b) => Number(b.fixture)).filter((n) => Number.isFinite(n));
  }
  return [];
}

function teamPlaysFixture(teamId, fx) {
  const t = Number(teamId);
  return Number(fx.team_h) === t || Number(fx.team_a) === t;
}

/**
 * Fixture row for this player’s GW appearance (explain when possible; else sole team fixture).
 * @param {object} nextRow — full `event/live` element
 * @param {number | null | undefined} teamId — `elements[].team`
 * @param {object[]} gwFixtures — classic `fixtures?event=…`
 */
export function primaryFixtureForContribution(nextRow, teamId, gwFixtures) {
  const list = gwFixtures || [];
  const t = Number(teamId);
  if (!Number.isFinite(t)) return null;
  for (const fid of explainFixtureIdsFromLiveRow(nextRow)) {
    const fx = list.find((f) => Number(f.id) === fid && teamPlaysFixture(t, f));
    if (fx) return fx;
  }
  const mine = list.filter((f) => teamPlaysFixture(t, f));
  if (mine.length === 1) return mine[0];
  if (mine.length > 1) {
    return [...mine].sort((a, b) =>
      String(a.kickoff_time || '').localeCompare(String(b.kickoff_time || ''))
    )[0];
  }
  return null;
}

/** Tie-break when clock is identical (not a real timeline, just stable ordering). */
const KIND_ORDER = {
  goal: 50,
  assist: 49,
  dc_points: 35,
  save_points: 34,
  yellow_card: 10,
  red_card: 9,
};

/**
 * Approximate real-world ordering: kickoff + official fixture clock + player minutes.
 * FPL does not expose exact goal minutes in `event/live`; this uses the same fixtures feed as Live.
 * @returns {number} 0 → unknown; caller should fall back to `recordedAt`.
 */
export function contributionApproxTimelineSortKey(nextRow, element, kind, gwFixtures) {
  const fx = primaryFixtureForContribution(nextRow, element?.team, gwFixtures);
  const kickMs = fx?.kickoff_time ? Date.parse(String(fx.kickoff_time)) : NaN;
  if (!Number.isFinite(kickMs) || kickMs <= 0) return 0;
  const fixtureClock =
    Number.isFinite(Number(fx?.minutes)) && Number(fx.minutes) >= 0
      ? Number(fx.minutes)
      : Number(statsOf(nextRow).minutes) || 0;
  const playerMin = Number(statsOf(nextRow).minutes) || 0;
  const ko = KIND_ORDER[kind] ?? 0;
  return kickMs + fixtureClock * 60_000 + playerMin * 100 + ko;
}

/** Latest real-world approx first; then detection time; then stable id. */
export function compareContributionEventsDesc(a, b) {
  const ka = Number(a?.sortKey);
  const kb = Number(b?.sortKey);
  const aOk = Number.isFinite(ka) && ka > 0;
  const bOk = Number.isFinite(kb) && kb > 0;
  if (aOk && bOk && ka !== kb) return kb - ka;
  if (aOk && !bOk) return -1;
  if (!aOk && bOk) return 1;
  const t = String(b?.recordedAt || '').localeCompare(String(a?.recordedAt || ''));
  if (t !== 0) return t;
  return String(b?.stableId || '').localeCompare(String(a?.stableId || ''));
}

/**
 * Element ids on all squads (starters ∪ bench).
 * @param {object[]} squads
 * @returns {Set<number>}
 */
export function elementIdsFromSquads(squads) {
  const s = new Set();
  for (const q of squads || []) {
    for (const r of q?.starters || []) {
      if (r?.element != null) s.add(Number(r.element));
    }
    for (const r of q?.bench || []) {
      if (r?.element != null) s.add(Number(r.element));
    }
  }
  return s;
}

/**
 * `element_out` from waiver / FA rows (players who left a roster).
 * @param {object[]} waiverOutGwRows
 * @returns {Set<number>}
 */
export function elementIdsFromWaiverDrops(waiverOutGwRows) {
  const s = new Set();
  for (const r of waiverOutGwRows || []) {
    const o = r?.element_out;
    if (o != null && Number.isFinite(Number(o))) s.add(Number(o));
  }
  return s;
}

/**
 * Tracked players: anyone rostered this GW or ever listed as dropped in waiver/FA feed.
 * @param {object[]} squads
 * @param {object[]} waiverOutGwRows
 */
export function buildTrackedElementIdSet(squads, waiverOutGwRows) {
  const s = elementIdsFromSquads(squads);
  for (const id of elementIdsFromWaiverDrops(waiverOutGwRows)) s.add(id);
  return s;
}

/**
 * Every draft element whose PL club plays this gameweek (from classic fixtures).
 * Ensures e.g. goals in MUN–LEE appear even if no fantasy manager owns the scorer.
 * @param {Record<number, object>} elementById
 * @param {number[] | null | undefined} gwTeamIds — FPL `team` ids with a fixture this GW
 */
export function elementIdsFromGwFixtureTeams(elementById, gwTeamIds) {
  const s = new Set();
  const teams = new Set(
    (gwTeamIds || [])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n))
  );
  if (!teams.size) return s;
  for (const el of Object.values(elementById || {})) {
    const tid = Number(el?.team);
    if (!Number.isFinite(tid) || !teams.has(tid)) continue;
    const id = Number(el.id);
    if (Number.isFinite(id)) s.add(id);
  }
  return s;
}

/**
 * Roster + waiver drops + all players on clubs with a GW fixture.
 */
export function buildTrackedElementIdSetWithFixtures(
  squads,
  waiverOutGwRows,
  elementById,
  gwTeamIds
) {
  const s = buildTrackedElementIdSet(squads, waiverOutGwRows);
  for (const id of elementIdsFromGwFixtureTeams(elementById, gwTeamIds)) {
    s.add(id);
  }
  return s;
}

/**
 * @param {object[]} squads
 * @returns {Map<number, { leagueEntryId: number, teamName: string }>}
 */
export function buildOwnerByElementId(squads) {
  const m = new Map();
  for (const q of squads || []) {
    if (q?.error) continue;
    const lid = Number(q.leagueEntryId);
    const name = String(q.teamName ?? '').trim() || `Team ${lid}`;
    for (const r of [...(q.starters || []), ...(q.bench || [])]) {
      const e = r?.element;
      if (e == null || !Number.isFinite(Number(e))) continue;
      const id = Number(e);
      if (!m.has(id)) m.set(id, { leagueEntryId: lid, teamName: name });
    }
  }
  return m;
}

/**
 * Latest drop (by GW desc, then transactionId desc) per element_out.
 * @param {object[]} waiverOutGwRows
 * @returns {Map<number, { teamName: string, gameweek: number }>}
 */
export function buildLatestDropByElementOut(waiverOutGwRows) {
  const rows = [...(waiverOutGwRows || [])].filter(
    (r) => r?.element_out != null && r?.entry != null
  );
  rows.sort((a, b) => {
    const g = Number(b.gameweek) - Number(a.gameweek);
    if (g !== 0) return g;
    return Number(b.transactionId) - Number(a.transactionId);
  });
  const m = new Map();
  for (const r of rows) {
    const el = Number(r.element_out);
    if (!Number.isFinite(el) || m.has(el)) continue;
    m.set(el, {
      teamName: String(r.teamName ?? `Team ${r.entry}`).trim(),
      gameweek: Number(r.gameweek) || 0,
    });
  }
  return m;
}

/**
 * Compare two live snapshots; emit positive deltas only. First snapshot (prev null) yields [].
 *
 * @param {{
 *   prevLiveByElementId: Record<number, object> | null,
 *   nextLiveByElementId: Record<number, object> | null,
 *   elementById: Record<number, object>,
 *   trackedElementIds: Set<number>,
 *   gameweek: number,
 *   nowIso: string,
 *   gwFixtures?: object[],
 *   omitKinds?: Set<string> | null — when FotMob supplies ordered goal/card/assist rows, skip these kinds from FPL diffs
 * }} p
 * @returns {object[]}
 */
export function diffContributionEvents({
  prevLiveByElementId,
  nextLiveByElementId,
  elementById,
  trackedElementIds,
  gameweek,
  nowIso,
  gwFixtures = [],
  omitKinds = null,
}) {
  /** @type {ReturnType<typeof diffContributionEvents> extends (infer U)[] ? U : never} */
  const out = [];
  if (!nextLiveByElementId || !trackedElementIds || trackedElementIds.size === 0) {
    return out;
  }

  const gw = Number(gameweek);
  if (!Number.isFinite(gw)) return out;

  /** First live tick after mount: treat missing prev as zero baseline for totals (goals/assists/saves/dc). Cards still need a delta vs prior tick to avoid double-counting with FotMob. */
  const bootstrap = prevLiveByElementId == null;

  const ids = [...trackedElementIds].filter((n) => Number.isFinite(Number(n))).sort((a, b) => a - b);

  for (const elid of ids) {
    const prevRow = bootstrap ? null : prevLiveByElementId[elid];
    const nextRow = nextLiveByElementId[elid];
    if (!nextRow) continue;
    const el = elementById?.[elid];
    const et = el?.element_type;

    const ps = statsOf(prevRow);
    const ns = statsOf(nextRow);

    const g0 = Number(ps.goals_scored) || 0;
    const g1 = Number(ns.goals_scored) || 0;
    if (!omitKinds?.has('goal') && g1 > g0) {
      const d = g1 - g0;
      out.push({
        stableId: `${gw}:${elid}:goal:tot${g1}`,
        kind: 'goal',
        elementId: elid,
        gameweek: gw,
        delta: d,
        recordedAt: nowIso,
        sortKey: contributionApproxTimelineSortKey(nextRow, el, 'goal', gwFixtures),
        source: 'fpl',
      });
    }

    const a0 = Number(ps.assists) || 0;
    const a1 = Number(ns.assists) || 0;
    if (!omitKinds?.has('assist') && a1 > a0) {
      out.push({
        stableId: `${gw}:${elid}:assist:tot${a1}`,
        kind: 'assist',
        elementId: elid,
        gameweek: gw,
        delta: a1 - a0,
        recordedAt: nowIso,
        sortKey: contributionApproxTimelineSortKey(nextRow, el, 'assist', gwFixtures),
        source: 'fpl',
      });
    }

    const dc0 = defensiveContributionPointsFromLiveRow(prevRow);
    const dc1 = defensiveContributionPointsFromLiveRow(nextRow);
    if (dc1 > dc0) {
      out.push({
        stableId: `${gw}:${elid}:dc_points:tot${dc1}`,
        kind: 'dc_points',
        elementId: elid,
        gameweek: gw,
        delta: dc1 - dc0,
        recordedAt: nowIso,
        sortKey: contributionApproxTimelineSortKey(nextRow, el, 'dc_points', gwFixtures),
        source: 'fpl',
      });
    }

    const s0 = saveFantasyPointsFromSaves(ps.saves, et);
    const s1 = saveFantasyPointsFromSaves(ns.saves, et);
    if (s1 > s0) {
      out.push({
        stableId: `${gw}:${elid}:save_points:tot${s1}`,
        kind: 'save_points',
        elementId: elid,
        gameweek: gw,
        delta: s1 - s0,
        recordedAt: nowIso,
        sortKey: contributionApproxTimelineSortKey(nextRow, el, 'save_points', gwFixtures),
        source: 'fpl',
      });
    }

    const y0 = Number(ps.yellow_cards) || 0;
    const y1 = Number(ns.yellow_cards) || 0;
    if (!bootstrap && !omitKinds?.has('yellow_card') && y1 > y0) {
      out.push({
        stableId: `${gw}:${elid}:yellow_card:tot${y1}`,
        kind: 'yellow_card',
        elementId: elid,
        gameweek: gw,
        delta: y1 - y0,
        recordedAt: nowIso,
        sortKey: contributionApproxTimelineSortKey(nextRow, el, 'yellow_card', gwFixtures),
        source: 'fpl',
      });
    }

    const rc0 = Number(ps.red_cards) || 0;
    const rc1 = Number(ns.red_cards) || 0;
    if (!bootstrap && !omitKinds?.has('red_card') && rc1 > rc0) {
      out.push({
        stableId: `${gw}:${elid}:red_card:tot${rc1}`,
        kind: 'red_card',
        elementId: elid,
        gameweek: gw,
        delta: rc1 - rc0,
        recordedAt: nowIso,
        sortKey: contributionApproxTimelineSortKey(nextRow, el, 'red_card', gwFixtures),
        source: 'fpl',
      });
    }
  }

  return out;
}
