import { fixturesForTeamInGw } from './fplBonusFromBps.js';

/**
 * Minimum number of ESPN lineup rows (home or away) with a resolved FPL `elementId` before we
 * treat “not listed on xi or bench” as **absent** (not in the matchday squad). Below this we
 * assume name-matching gaps and return `null` (unknown).
 */
const MIN_RESOLVED_IDS_FOR_ABSENT = 16;

/**
 * ESPN Prem lineups (enriched with `elementId`) classify FPL draft picks for live **projected**
 * autosub: `xi` / `bench` / `absent` / `null` (unknown or DGW / no data).
 *
 * Only used when the club has **exactly one** PL fixture this GW (single-gameweek); for doubles
 * we return `null` so we do not guess across two matchday squads.
 *
 * @param {Array<{ fplFixture: object, lineups: { home: object, away: object } | null }>} espnPremRows
 * @param {object[]} gwFixtures — classic GW fixtures for this event
 * @param {number} elementId — FPL element id
 * @param {number | null} teamId — FPL team id from bootstrap
 * @returns {'xi' | 'bench' | 'absent' | null}
 */
export function computeEspnMatchdayRole(espnPremRows, gwFixtures, elementId, teamId) {
  const eid = Number(elementId);
  const tid = Number(teamId);
  if (!Number.isFinite(eid) || !Number.isFinite(tid)) return null;
  const mine = fixturesForTeamInGw(gwFixtures || [], tid);
  if (mine.length !== 1) return null;
  const fplFxId = Number(mine[0].id);
  if (!Number.isFinite(fplFxId)) return null;
  const row = (espnPremRows || []).find((r) => Number(r?.fplFixture?.id) === fplFxId);
  const lu = row?.lineups;
  if (!lu?.home || !lu?.away) return null;
  if (!lu.home.confirmed || !lu.away.confirmed) return null;

  const th = Number(row.fplFixture?.team_h);
  const ta = Number(row.fplFixture?.team_a);
  const side = tid === th ? lu.home : tid === ta ? lu.away : null;
  if (!side) return null;

  const xi = Array.isArray(side.xi) ? side.xi : [];
  const bench = Array.isArray(side.bench) ? side.bench : [];

  if (xi.some((p) => Number(p?.elementId) === eid)) return 'xi';
  if (bench.some((p) => Number(p?.elementId) === eid)) return 'bench';

  const resolved = [...xi, ...bench].filter((p) =>
    Number.isFinite(Number(p?.elementId))
  ).length;
  if (resolved >= MIN_RESOLVED_IDS_FOR_ABSENT) return 'absent';
  return null;
}
