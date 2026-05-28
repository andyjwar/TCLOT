/**
 * Pulselive (Premier League official) as a Prem lineup source.
 *
 * `footballapi.pulselive.com/football` powers premierleague.com — when clubs submit team
 * sheets to the league at T-75, this is the first feed that publishes them. Pulselive
 * doesn't expose a literal `confirmed: true/false` flag, so we treat "exactly 11 players
 * in `teamLists[].lineup[]` for both sides" as the confirmed signal (mirrors how the PL
 * site decides when to show the team sheet card).
 *
 * Per GW:
 *   1. Hit `fixtures?comps=1&fromDate=…&toDate=…&statuses=U,L,C&pageSize=50&sort=asc` once
 *      to discover Pulselive fixture ids for the GW date range.
 *   2. Build a Pulselive-team-id → FPL-team-id map via `team.club.abbr` (3-letter code
 *      matches FPL `short_name`) with name-based fallback.
 *   3. Pair each FPL fixture with a Pulselive fixture id, then callers fetch `fixtures/{id}`
 *      for the team sheet.
 *
 * Pulselive requires `Origin: https://www.premierleague.com` and `Account: premierleague`
 * headers on most routes — the worker / Vite dev proxy adds these so callers don't worry.
 */

import { pulseliveResourceUrl } from './pulseliveUrl.js';

/** Pulselive comp id for the Premier League. Stable across seasons. */
export const PL_COMP_ID = 1;

/**
 * Pulselive's `fromDate`/`toDate` query params on `/fixtures` are silently ignored —
 * the only date-effective filter is `compSeasons={id}`, which is per-season and changes
 * each year. Discover the current season id via `/competitions/1/compseasons` (sorted
 * latest-first) so we don't pin a stale id in code each August.
 *
 * @param {object} compSeasonsJson — raw `/competitions/1/compseasons` body
 * @param {number | null} [kickoffMs] — optional kickoff timestamp; picks the season whose
 *   label matches the kickoff year (e.g. "2025/26" for an Aug-2025…May-2026 fixture).
 *   Falls back to the first row (latest) when omitted or unmatched.
 * @returns {number | null}
 */
export function pickCurrentCompSeasonId(compSeasonsJson, kickoffMs = null) {
  const content = Array.isArray(compSeasonsJson?.content)
    ? compSeasonsJson.content
    : [];
  if (!content.length) return null;
  if (kickoffMs != null && Number.isFinite(Number(kickoffMs))) {
    const d = new Date(Number(kickoffMs));
    if (!Number.isNaN(d.getTime())) {
      /** PL seasons span Aug → May. Aug-onwards = label "YYYY/YY+1"; before Aug = "YYYY-1/YY". */
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth(); // 0 = Jan, 7 = Aug
      const startYear = m >= 7 ? y : y - 1;
      const label = `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
      const exact = content.find(
        (cs) => typeof cs?.label === 'string' && cs.label === label,
      );
      if (exact && Number.isFinite(Number(exact.id))) return Number(exact.id);
    }
  }
  const first = content[0];
  return Number.isFinite(Number(first?.id)) ? Number(first.id) : null;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function yyyyMmDdUtc(iso) {
  if (typeof iso !== 'string' || !iso.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Earliest/latest UTC date strings (yyyy-mm-dd) across a list of FPL fixtures. */
export function dateRangeFromGwFixtures(gwFixtures) {
  let lo = null;
  let hi = null;
  for (const fx of gwFixtures || []) {
    const d = yyyyMmDdUtc(fx?.kickoff_time);
    if (!d) continue;
    if (lo == null || d < lo) lo = d;
    if (hi == null || d > hi) hi = d;
  }
  return lo && hi ? { fromDate: lo, toDate: hi } : null;
}

export async function fetchPulseliveJson(pathAndQuery) {
  const url = pulseliveResourceUrl(pathAndQuery);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Pulselive ${pathAndQuery} HTTP ${r.status}`);
  return r.json();
}

function normalizeTeamName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[.'`]/g, '')
    .replace(/\b(afc|fc)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pulselive's `club.abbr` is the 3-letter code shown on premierleague.com and almost always
 * matches FPL `short_name`. Keep aliases minimal — only add what we've actually seen.
 */
const PULSELIVE_ABBR_TO_FPL_SHORT = new Map([]);

/**
 * Walk a Pulselive `fixtures` list payload and extract `{ fixtureId, homeId, awayId, kickoffMs }`
 * rows we can later match against FPL fixtures.
 *
 * @returns {Array<{
 *   fixtureId: number,
 *   homeId: number,
 *   awayId: number,
 *   homeAbbr: string,
 *   awayAbbr: string,
 *   kickoffMs: number | null,
 * }>}
 */
export function collectPulseliveFixtures(listJson) {
  const out = [];
  const seen = new Set();
  const content = listJson?.content;
  if (!Array.isArray(content)) return out;
  for (const fx of content) {
    const id = Number(fx?.id);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    const teams = Array.isArray(fx?.teams) ? fx.teams : [];
    if (teams.length !== 2) continue;
    const home = teams[0]?.team;
    const away = teams[1]?.team;
    const hid = Number(home?.id);
    const aid = Number(away?.id);
    if (!Number.isFinite(hid) || !Number.isFinite(aid)) continue;
    seen.add(id);
    const kickoffMs =
      Number.isFinite(Number(fx?.kickoff?.millis))
        ? Number(fx.kickoff.millis)
        : null;
    out.push({
      fixtureId: id,
      homeId: hid,
      awayId: aid,
      homeAbbr: String(home?.club?.abbr || home?.altIds?.opta || '').toUpperCase(),
      awayAbbr: String(away?.club?.abbr || away?.altIds?.opta || '').toUpperCase(),
      kickoffMs,
    });
  }
  return out;
}

/**
 * Harvest team metadata from a Pulselive fixtures list payload — used to build the
 * pulse-team-id → FPL-team-id map.
 *
 * @returns {Array<{ id: number, name: string, shortName: string, abbr: string }>}
 */
export function harvestTeams(listJson) {
  const seen = new Set();
  /** @type {Array<{ id: number, name: string, shortName: string, abbr: string }>} */
  const out = [];
  const content = listJson?.content;
  if (!Array.isArray(content)) return out;
  for (const fx of content) {
    const teams = Array.isArray(fx?.teams) ? fx.teams : [];
    for (const wrap of teams) {
      const t = wrap?.team;
      const id = Number(t?.id);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        name: String(t?.name || ''),
        shortName: String(t?.shortName || ''),
        abbr: String(t?.club?.abbr || '').toUpperCase(),
      });
    }
  }
  return out;
}

/**
 * @param {Record<number, object>} teamById — FPL `teams` keyed by id
 * @param {Array<{ id: number, name: string, shortName: string, abbr: string }>} pulseTeams
 * @returns {Map<number, number>} pulseliveTeamId → fplTeamId
 */
export function mapPulseliveTeamsToFpl(teamById, pulseTeams) {
  const fplByShort = new Map();
  const fplByName = new Map();
  for (const [k, pl] of Object.entries(teamById || {})) {
    const id = Number(k);
    if (!Number.isFinite(id)) continue;
    const sh = String(pl?.short_name || '').toUpperCase();
    if (sh) fplByShort.set(sh, id);
    const nm = normalizeTeamName(pl?.name);
    if (nm) fplByName.set(nm, id);
  }
  const out = new Map();
  for (const t of pulseTeams || []) {
    const pid = Number(t?.id);
    if (!Number.isFinite(pid)) continue;
    let abbr = String(t?.abbr || '').toUpperCase();
    if (PULSELIVE_ABBR_TO_FPL_SHORT.has(abbr)) {
      abbr = PULSELIVE_ABBR_TO_FPL_SHORT.get(abbr);
    }
    const fplFromAbbr = abbr ? fplByShort.get(abbr) : null;
    if (fplFromAbbr != null) {
      out.set(pid, fplFromAbbr);
      continue;
    }
    const fullNorm = normalizeTeamName(t?.name);
    const shortNorm = normalizeTeamName(t?.shortName);
    const fplFromName =
      (fullNorm && fplByName.get(fullNorm)) ||
      (shortNorm && fplByName.get(shortNorm)) ||
      null;
    if (fplFromName != null) {
      out.set(pid, fplFromName);
      continue;
    }
    if (fullNorm) {
      const candidates = [...fplByName.entries()].filter(
        ([name]) => name.includes(fullNorm) || fullNorm.includes(name),
      );
      if (candidates.length === 1) {
        out.set(pid, candidates[0][1]);
      }
    }
  }
  return out;
}

/**
 * Find the Pulselive fixture id for an FPL fixture by matching both team ids.
 */
export function findPulseliveMatchForFixture(fx, pulseToFpl, pulseRows) {
  const th = Number(fx?.team_h);
  const ta = Number(fx?.team_a);
  if (!Number.isFinite(th) || !Number.isFinite(ta)) return null;
  for (const row of pulseRows) {
    const h = pulseToFpl.get(row.homeId);
    const a = pulseToFpl.get(row.awayId);
    if (h === th && a === ta) return row;
    if (h === ta && a === th) return row;
  }
  return null;
}
