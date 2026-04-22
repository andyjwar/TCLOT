/**
 * PremWindow: turn a FotMob `matchDetails?matchId=…` payload into the bits the UI needs —
 *   - scoreline + status
 *   - significant events (goal / assist / yellow / red)
 *   - lineups + bench, with `confirmed` flag
 *
 * FotMob's schema shifts between route versions and locales, so every extractor walks the
 * JSON defensively instead of relying on fixed keys. This mirrors the style in
 * `fotmobPremTimeline.js` (`collectDayMatches`, `extractLeagueTeams`).
 */

import { fotmobResourceUrl } from './fotmobUrl.js';
import {
  matchFplElementId,
  parseFotmobEventMinute,
} from './fotmobPremTimeline.js';

/**
 * Lowercase, strip diacritics, drop the "FC" / "AFC" prefixes/suffixes and punctuation.
 * Lets us compare "AFC Bournemouth" ↔ "Bournemouth" and "Newcastle" ↔ "Newcastle United"
 * without false positives ("Manchester" would be ambiguous; see mapTeamsByName below).
 */
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
 * Map each FPL team id → FotMob team id by name. Unlike `mapFplTeamsToFotmob` (which expects the
 * retired `tab=table` payload's 3-letter codes), this takes the full `{ id, name, shortName }`
 * rows from the season feed and matches both fields against FPL's `name` + `short_name`.
 *
 * Uses exact-normalized match first, then unique-substring fallback so "Bournemouth" matches
 * "AFC Bournemouth" — only one FotMob team has that substring, so no ambiguity. Rejects
 * candidates that match more than one FotMob team (e.g. "Manchester" → City + United).
 *
 * @param {Record<number, object>} teamById — FPL `teams` keyed by id
 * @param {Array<{ id: number, shortName: string, name: string }>} fotmobTeams
 * @returns {Map<number, number>} fplTeamId → fotmobTeamId
 */
function mapTeamsByName(teamById, fotmobTeams) {
  const fmRows = fotmobTeams.map((t) => ({
    id: t.id,
    name: normalizeTeamName(t.name),
    shortName: normalizeTeamName(t.shortName),
  }));
  const out = new Map();
  for (const [k, pl] of Object.entries(teamById || {})) {
    const fplId = Number(k);
    if (!Number.isFinite(fplId)) continue;
    const fplName = normalizeTeamName(pl.name);
    const fplShort = normalizeTeamName(pl.short_name);

    const exact = fmRows.find(
      (f) => f.name === fplName || f.shortName === fplName || f.shortName === fplShort,
    );
    if (exact) {
      out.set(fplId, exact.id);
      continue;
    }
    /**
     * Unique-substring match: either side contains the other. Only accept when exactly one
     * candidate matches so "Manchester" never silently resolves to City instead of United.
     */
    const subs = fmRows.filter(
      (f) =>
        (fplName && (f.name.includes(fplName) || fplName.includes(f.name))) ||
        (fplName && (f.shortName.includes(fplName) || fplName.includes(f.shortName))),
    );
    if (subs.length === 1) {
      out.set(fplId, subs[0].id);
    }
  }
  return out;
}

const PL_LEAGUE_ID = 47;

/**
 * Error subclass so callers can tell a Turnstile/verification wall apart from ordinary network
 * failures — used to flip a session-wide kill switch so we don't hammer the gated endpoint.
 */
class FotmobVerificationRequired extends Error {
  constructor(path) {
    super(`FotMob verification required for ${path}`);
    this.name = 'FotmobVerificationRequired';
  }
}

async function fetchFotmob(pathWithQuery) {
  const url = fotmobResourceUrl(pathWithQuery);
  const r = await fetch(url);
  if (r.status === 403) {
    /**
     * As of Apr 2026 FotMob gates `data/matchDetails` behind a Cloudflare Turnstile token. Treat
     * any 403 as the verification wall; body is `{"error":"Verification required","code":"TURNSTILE_REQUIRED"}`.
     */
    throw new FotmobVerificationRequired(pathWithQuery);
  }
  if (!r.ok) throw new Error(`FotMob ${pathWithQuery} HTTP ${r.status}`);
  return r.json();
}

/**
 * Minute label used everywhere in the UI: e.g. `23'`, `45+2'`, or `—` when unparseable.
 * @param {{ minute: number | null, stoppage: number }} mm
 */
function formatMinuteLabel(mm) {
  if (!mm || !Number.isFinite(mm.minute)) return '—';
  const stop = Number.isFinite(mm.stoppage) ? Number(mm.stoppage) : 0;
  return stop > 0 ? `${mm.minute}+${stop}'` : `${mm.minute}'`;
}

/** Find the first object in `o` that matches `predicate` using a bounded DFS. */
function findFirst(o, predicate, depth = 0) {
  if (depth > 20 || o == null) return null;
  if (typeof o === 'object') {
    if (predicate(o)) return o;
    const values = Array.isArray(o) ? o : Object.values(o);
    for (const v of values) {
      const hit = findFirst(v, predicate, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

function findAll(o, predicate, out = [], depth = 0) {
  if (depth > 20 || o == null) return out;
  if (typeof o === 'object') {
    if (predicate(o)) out.push(o);
    const values = Array.isArray(o) ? o : Object.values(o);
    for (const v of values) findAll(v, predicate, out, depth + 1);
  }
  return out;
}

function coerceInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function playerDisplayName(p) {
  if (!p) return null;
  if (typeof p.name === 'string') return p.name.trim() || null;
  const n = p.name;
  if (n && typeof n === 'object') {
    if (typeof n.fullName === 'string' && n.fullName.trim()) return n.fullName.trim();
    const parts = [n.firstName, n.lastName].filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  if (typeof p.fullName === 'string' && p.fullName.trim()) return p.fullName.trim();
  return null;
}

/**
 * Parse scoreline + status from a FotMob `matchDetails` payload.
 * Looks in `general` (canonical) then `header` (older route). Returns nullish fields when unknown.
 *
 * @returns {{
 *   started: boolean | null,
 *   finished: boolean | null,
 *   statusText: string | null,
 *   liveMinute: string | null,
 *   homeScore: number | null,
 *   awayScore: number | null,
 *   kickoffIso: string | null,
 * }}
 */
export function parseScore(mj) {
  const general = mj?.general || {};
  const header = mj?.header || {};
  const status = header?.status || general?.status || {};

  const started =
    typeof status.started === 'boolean'
      ? status.started
      : typeof general.started === 'boolean'
        ? general.started
        : null;
  const finished =
    typeof status.finished === 'boolean'
      ? status.finished
      : typeof general.finished === 'boolean'
        ? general.finished
        : null;

  const statusText =
    (typeof status.reason?.short === 'string' && status.reason.short) ||
    (typeof status.reason?.long === 'string' && status.reason.long) ||
    (typeof status.longStatus === 'string' && status.longStatus) ||
    null;
  const liveMinute =
    (typeof status.liveTime?.short === 'string' && status.liveTime.short) ||
    (typeof status.liveTime?.long === 'string' && status.liveTime.long) ||
    null;

  let homeScore = null;
  let awayScore = null;

  const teamsArr = Array.isArray(header?.teams) ? header.teams : [];
  if (teamsArr.length >= 2) {
    homeScore = coerceInt(teamsArr[0]?.score);
    awayScore = coerceInt(teamsArr[1]?.score);
  }
  if (homeScore == null || awayScore == null) {
    const ht = general?.homeTeam;
    const at = general?.awayTeam;
    if (ht && at) {
      homeScore ??= coerceInt(ht.score);
      awayScore ??= coerceInt(at.score);
    }
  }

  const kickoffIso =
    (typeof general.matchTimeUTCDate === 'string' && general.matchTimeUTCDate) ||
    (typeof general.matchTimeUTC === 'string' && general.matchTimeUTC) ||
    null;

  return {
    started,
    finished,
    statusText,
    liveMinute,
    homeScore,
    awayScore,
    kickoffIso,
  };
}

/**
 * Normalize the FotMob events list into just the kinds the UI shows: goal (with optional assist),
 * yellow/red cards. Ordered by minute, then stoppage, then `eventId`.
 *
 * Produces one row per event; goals that include an assister emit a second `assist` row with the
 * same sortKey + 1 so both show up under the same minute.
 */
export function parseEvents(mj) {
  const raw =
    mj?.content?.matchFacts?.events?.events ||
    mj?.content?.matchFacts?.events ||
    mj?.content?.events?.events ||
    mj?.content?.events ||
    [];
  if (!Array.isArray(raw)) return [];

  /** @type {Array<{kind: string, teamSide: 'home' | 'away' | null, minuteLabel: string, minute: number | null, stoppage: number, playerName: string | null, assistName: string | null, isOwnGoal: boolean, isPenalty: boolean, eventId: number | null, raw: object}>} */
  const normalized = [];
  for (const ev of raw) {
    const typeStr = String(ev?.type || '').toLowerCase();
    const nameStr = String(ev?.nameStr || ev?.name || '');
    const card = String(ev?.card || '').toLowerCase();
    let kind = null;
    if (typeStr === 'card' || card) {
      kind = card.includes('red') || typeStr.includes('red') ? 'red_card' : 'yellow_card';
    } else if (typeStr.includes('goal') || /\bgoal\b/i.test(nameStr)) {
      kind = 'goal';
    }
    if (!kind) continue;

    const mm = parseFotmobEventMinute(ev);
    const teamSide =
      ev.isHome === true ? 'home' : ev.isHome === false ? 'away' : null;
    const playerName = playerDisplayName(ev?.player);
    const assistFromText = (() => {
      const m = String(nameStr).match(/assist(?:ed)?\s+by\s+([^·,(\n]+)/i);
      if (!m) return null;
      return m[1].trim().replace(/[.\s]+$/, '');
    })();
    const swapLast = Array.isArray(ev?.swap) && ev.swap.length
      ? ev.swap[ev.swap.length - 1]
      : null;
    const assistFromSwap =
      swapLast?.name && /\bassist/i.test(nameStr) ? String(swapLast.name) : null;
    const assistName = assistFromText || assistFromSwap || null;

    const isOwnGoal =
      /own\s*goal/i.test(nameStr) ||
      (typeof ev?.goalDescription === 'string' && /own/i.test(ev.goalDescription)) ||
      ev?.ownGoal === true;
    const isPenalty =
      /\bpenalty\b/i.test(nameStr) ||
      (typeof ev?.goalDescription === 'string' && /penalt/i.test(ev.goalDescription)) ||
      ev?.penalty === true;

    normalized.push({
      kind,
      teamSide,
      minuteLabel: formatMinuteLabel(mm),
      minute: mm.minute,
      stoppage: mm.stoppage,
      playerName,
      assistName,
      isOwnGoal,
      isPenalty,
      eventId: Number.isFinite(Number(ev?.eventId)) ? Number(ev.eventId) : null,
      raw: ev,
    });
  }

  normalized.sort((a, b) => {
    const am = Number.isFinite(a.minute) ? a.minute : Number.POSITIVE_INFINITY;
    const bm = Number.isFinite(b.minute) ? b.minute : Number.POSITIVE_INFINITY;
    if (am !== bm) return am - bm;
    if (a.stoppage !== b.stoppage) return a.stoppage - b.stoppage;
    const ae = a.eventId ?? 0;
    const be = b.eventId ?? 0;
    return ae - be;
  });

  const flat = [];
  for (const row of normalized) {
    flat.push({
      kind: row.kind,
      teamSide: row.teamSide,
      minuteLabel: row.minuteLabel,
      minute: row.minute,
      stoppage: row.stoppage,
      playerName: row.playerName,
      isOwnGoal: row.isOwnGoal,
      isPenalty: row.isPenalty,
      eventId: row.eventId,
    });
    if (row.kind === 'goal' && row.assistName) {
      flat.push({
        kind: 'assist',
        teamSide: row.teamSide,
        minuteLabel: row.minuteLabel,
        minute: row.minute,
        stoppage: row.stoppage,
        playerName: row.assistName,
        isOwnGoal: false,
        isPenalty: false,
        eventId: row.eventId,
      });
    }
  }
  return flat;
}

/**
 * Flatten a FotMob formation matrix. FotMob's confirmed lineup looks like
 * `lineup[teamIndex].lineup[]` where each inner entry is either a *row* of players (array-of-rows
 * case) OR a single player row. We accept both shapes.
 */
function flattenFormationPlayers(lineupField) {
  if (!Array.isArray(lineupField)) return [];
  const out = [];
  for (const row of lineupField) {
    if (Array.isArray(row)) {
      for (const p of row) if (p && typeof p === 'object') out.push(p);
    } else if (row && typeof row === 'object') {
      out.push(row);
    }
  }
  return out;
}

function normalizePlayerRow(p) {
  const id = coerceInt(p?.id) ?? coerceInt(p?.playerId);
  const name = playerDisplayName(p);
  const shirt =
    coerceInt(p?.shirt) ?? coerceInt(p?.shirtNumber) ?? coerceInt(p?.number);
  const pos =
    (typeof p?.usualPosition === 'string' && p.usualPosition) ||
    (typeof p?.position === 'string' && p.position) ||
    (typeof p?.positionStringShort === 'string' && p.positionStringShort) ||
    null;
  return {
    fotmobPlayerId: id,
    name,
    shirt,
    usualPosition: pos,
  };
}

/**
 * Best-effort extraction of a single team's lineup + bench from a FotMob team-lineup node.
 *
 * @param {object} node — object with at least `{ teamId, lineup | players, bench? }`
 */
function parseTeamLineupNode(node) {
  if (!node || typeof node !== 'object') return null;
  const teamId = coerceInt(node.teamId) ?? coerceInt(node.id);
  const formation =
    (typeof node.formation === 'string' && node.formation) ||
    (typeof node.lineupType === 'string' && node.lineupType) ||
    null;
  const confirmed =
    typeof node.lineupConfirmed === 'boolean'
      ? node.lineupConfirmed
      : typeof node.isLineupConfirmed === 'boolean'
        ? node.isLineupConfirmed
        : null;

  const xiField = node.lineup ?? node.players ?? node.starters;
  const xi = flattenFormationPlayers(xiField).map(normalizePlayerRow);
  const benchField = Array.isArray(node.bench) ? node.bench : [];
  const bench = benchField
    .map((p) => (p && typeof p === 'object' ? p : null))
    .filter(Boolean)
    .map(normalizePlayerRow);

  const coaches = Array.isArray(node.coach) ? node.coach : [];
  const coach = coaches.length
    ? playerDisplayName(coaches[0]) || coaches[0]?.name || null
    : null;

  return {
    teamId,
    formation,
    confirmed,
    coach: typeof coach === 'string' ? coach : null,
    xi,
    bench,
  };
}

/**
 * Walk a matchDetails payload and return `{ home, away }` lineups, or `null` when no lineup
 * node is present. Team-side assignment uses `teamId` vs the caller-provided
 * `{ homeFotmobId, awayFotmobId }` when available; falls back to the order FotMob returned.
 *
 * @param {object} mj
 * @param {{ homeFotmobId?: number | null, awayFotmobId?: number | null }} [opts]
 */
export function parseLineups(mj, opts = {}) {
  const homeFotmobId = coerceInt(opts.homeFotmobId);
  const awayFotmobId = coerceInt(opts.awayFotmobId);

  const candidates = [];
  /** FotMob has used `content.lineup.lineup[]` and `content.lineup2.lineup[]`. */
  const rootLineup =
    findFirst(mj?.content, (o) => Array.isArray(o?.lineup) && o.lineup.length === 2 && o.lineup.every((x) => x && typeof x === 'object' && ('lineup' in x || 'players' in x || 'starters' in x))) ||
    null;
  if (rootLineup) candidates.push(...rootLineup.lineup);

  if (!candidates.length) {
    /** Some routes use `teamSquad` / `formation` nested nodes per team. */
    const altNodes = findAll(mj, (o) => {
      if (!o || typeof o !== 'object') return false;
      const hasTeamId = Number.isFinite(Number(o.teamId));
      const hasLineupArr = Array.isArray(o.lineup) || Array.isArray(o.players) || Array.isArray(o.starters);
      return hasTeamId && hasLineupArr && !Array.isArray(o);
    });
    for (const n of altNodes.slice(0, 2)) candidates.push(n);
  }
  if (candidates.length < 2) return null;

  const parsed = candidates.slice(0, 2).map(parseTeamLineupNode).filter(Boolean);
  if (parsed.length < 2) return null;

  let [a, b] = parsed;
  if (homeFotmobId != null && awayFotmobId != null) {
    if (a.teamId === awayFotmobId && b.teamId === homeFotmobId) {
      [a, b] = [b, a];
    }
  }
  return { home: a, away: b };
}

/**
 * Pull the 20 PL teams out of the new `data/leagues?id=47` payload. The season-level
 * `fixtures.allMatches[]` rows embed `{ id, name, shortName }` on both sides, so we can
 * derive the full team list without hitting the table endpoint (which was retired Apr 2026).
 *
 * @param {object} leagueJson
 * @returns {Array<{ id: number, shortName: string, name: string }>}
 */
function extractSeasonTeams(leagueJson) {
  const all = leagueJson?.fixtures?.allMatches;
  if (!Array.isArray(all)) return [];
  const byId = new Map();
  for (const m of all) {
    for (const side of [m?.home, m?.away]) {
      const id = coerceInt(side?.id);
      const name = typeof side?.name === 'string' ? side.name : null;
      const shortName = typeof side?.shortName === 'string' ? side.shortName : null;
      if (id == null || !name) continue;
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          shortName: String(shortName || name).toUpperCase(),
          name,
        });
      }
    }
  }
  return [...byId.values()];
}

/**
 * Parse a `fixtures.allMatches[i].status` row into the same shape `parseScore` returns, so the
 * UI layer doesn't need to care whether the scoreline came from `data/leagues` or `matchDetails`.
 *
 * @param {object} statusNode
 * @returns {ReturnType<typeof parseScore>}
 */
function parseStatusFromSeasonRow(statusNode) {
  const st = statusNode || {};
  const started = typeof st.started === 'boolean' ? st.started : null;
  const finished = typeof st.finished === 'boolean' ? st.finished : null;
  const statusText =
    (typeof st.reason?.short === 'string' && st.reason.short) ||
    (typeof st.reason?.long === 'string' && st.reason.long) ||
    null;
  const liveMinute =
    (typeof st.liveTime?.short === 'string' && st.liveTime.short) ||
    (typeof st.liveTime?.long === 'string' && st.liveTime.long) ||
    null;

  let homeScore = null;
  let awayScore = null;
  if (typeof st.scoreStr === 'string') {
    /** Season feed encodes scores as `"4 - 2"` or `"0 - 0"`; split defensively. */
    const m = st.scoreStr.match(/(-?\d+)\s*[-–]\s*(-?\d+)/);
    if (m) {
      homeScore = coerceInt(m[1]);
      awayScore = coerceInt(m[2]);
    }
  }

  return {
    started,
    finished,
    statusText,
    liveMinute,
    homeScore,
    awayScore,
    kickoffIso: typeof st.utcTime === 'string' ? st.utcTime : null,
  };
}

/**
 * Resolve each FPL fixture in a GW to a FotMob matchId by filtering the season-wide
 * `fixtures.allMatches` list. Also carries a pre-parsed scoreline so the caller doesn't need to
 * hit a second endpoint just to render the headline — `data/matchDetails` is Turnstile-gated
 * and so is only attempted for events/lineups.
 *
 * @param {{ gwFixtures: object[], teamById: Record<number, object> }} args
 * @returns {Promise<Map<number, {
 *   matchId: number,
 *   homeFotmobId: number,
 *   awayFotmobId: number,
 *   score: ReturnType<typeof parseScore>,
 * }>>}
 */
export async function buildFplToFotmobFixtureMap({ gwFixtures, teamById }) {
  const result = new Map();
  if (!Array.isArray(gwFixtures) || !gwFixtures.length) return result;

  let leagueJson;
  try {
    leagueJson = await fetchFotmob(`data/leagues?id=${PL_LEAGUE_ID}`);
  } catch {
    return result;
  }

  const fotmobTeams = extractSeasonTeams(leagueJson);
  const fplToFm = mapTeamsByName(teamById, fotmobTeams);
  if (!fplToFm.size) return result;

  const allMatches = Array.isArray(leagueJson?.fixtures?.allMatches)
    ? leagueJson.fixtures.allMatches
    : [];

  /** Index by `"homeFid|awayFid"` so fixture lookups are O(1). */
  const byPair = new Map();
  for (const m of allMatches) {
    const hid = coerceInt(m?.home?.id);
    const aid = coerceInt(m?.away?.id);
    const mid = coerceInt(m?.id);
    if (hid == null || aid == null || mid == null) continue;
    byPair.set(`${hid}|${aid}`, { matchId: mid, homeFotmobId: hid, awayFotmobId: aid, raw: m });
  }

  for (const fx of gwFixtures) {
    const fxId = coerceInt(fx.id);
    if (fxId == null) continue;
    const fh = fplToFm.get(Number(fx.team_h));
    const fa = fplToFm.get(Number(fx.team_a));
    if (!Number.isFinite(fh) || !Number.isFinite(fa)) continue;
    const hit = byPair.get(`${fh}|${fa}`) || byPair.get(`${fa}|${fh}`);
    if (!hit) continue;
    /** Swap home/away so the stored ids line up with the FPL fixture, not FotMob's order. */
    const isSwapped = hit.homeFotmobId === fa && hit.awayFotmobId === fh;
    result.set(fxId, {
      matchId: hit.matchId,
      homeFotmobId: isSwapped ? fa : hit.homeFotmobId,
      awayFotmobId: isSwapped ? fh : hit.awayFotmobId,
      score: parseStatusFromSeasonRow(hit.raw?.status),
    });
  }

  return result;
}

/**
 * Attach FPL element ids to both events (when name resolves against the scoring team) and lineup
 * rows (when name resolves against the team's FPL id).
 *
 * @param {{
 *   fplFixture: object,
 *   score: ReturnType<typeof parseScore>,
 *   events: ReturnType<typeof parseEvents>,
 *   lineups: ReturnType<typeof parseLineups>,
 *   elementById: Record<number, object>,
 * }} args
 */
/** FPL `element_type` → label used after player name, e.g. `(D)`. */
function fplElementTypeToPosLabel(elementType) {
  const et = Number(elementType);
  if (et === 1) return 'GK';
  if (et === 2) return 'D';
  if (et === 3) return 'M';
  if (et === 4) return 'F';
  return null;
}

export function enrichWithFplElements({ fplFixture, events, lineups, elementById }) {
  const homeFpl = coerceInt(fplFixture?.team_h);
  const awayFpl = coerceInt(fplFixture?.team_a);

  const evOut = (events || []).map((e) => {
    if (!e.playerName || !e.teamSide) return { ...e, elementId: null };
    const teamFpl = e.teamSide === 'home' ? homeFpl : awayFpl;
    if (teamFpl == null) return { ...e, elementId: null };
    const elid = matchFplElementId(teamFpl, e.playerName, elementById);
    return { ...e, elementId: elid };
  });

  const enrichSide = (side, teamFpl) => {
    if (!side || teamFpl == null) return side;
    const enrichPlayer = (player) => {
      const elementId = player?.name
        ? matchFplElementId(teamFpl, player.name, elementById)
        : null;
      const el =
        elementId != null && elementById ? elementById[elementId] : null;
      const fplWebName =
        el && typeof el.web_name === 'string' && el.web_name.trim()
          ? el.web_name.trim()
          : null;
      const fplPos = el ? fplElementTypeToPosLabel(el.element_type) : null;
      return { ...player, elementId, fplWebName, fplPos };
    };
    return {
      ...side,
      xi: side.xi.map(enrichPlayer),
      bench: side.bench.map(enrichPlayer),
    };
  };

  const lineupsOut = lineups
    ? {
        home: enrichSide(lineups.home, homeFpl),
        away: enrichSide(lineups.away, awayFpl),
      }
    : null;

  return { events: evOut, lineups: lineupsOut };
}

/**
 * One-shot fetch for the whole GW: for every FPL fixture with a resolvable FotMob matchId,
 * return score + events + lineups, all enriched with FPL element ids.
 *
 * @param {{
 *   gwFixtures: object[],
 *   teamById: Record<number, object>,
 *   elementById: Record<number, object>,
 *   signal?: AbortSignal,
 * }} args
 * @returns {Promise<Array<{
 *   fplFixture: object,
 *   matchId: number | null,
 *   homeFotmobId: number | null,
 *   awayFotmobId: number | null,
 *   score: ReturnType<typeof parseScore> | null,
 *   events: Array<ReturnType<typeof parseEvents>[number] & { elementId: number | null }>,
 *   lineups: ReturnType<typeof parseLineups> | null,
 *   fetchError: string | null,
 * }>>}
 */
export async function fetchPremWindow({ gwFixtures, teamById, elementById, signal }) {
  const fxList = Array.isArray(gwFixtures) ? gwFixtures : [];
  if (!fxList.length) return [];

  const matchMap = await buildFplToFotmobFixtureMap({ gwFixtures: fxList, teamById });

  /**
   * `data/matchDetails` is Turnstile-gated (403) as of Apr 2026. Try once per GW fetch — if the
   * wall fires we record it and skip the remaining detail calls so we don't waste requests.
   */
  let detailsBlocked = false;
  let detailsBlockedReason = null;

  /**
   * Sequential, not parallel: FotMob's unofficial API chokes on bursts. The GW has ≤10 fixtures;
   * serial fetches keep us well within typical rate limits.
   */
  const out = [];
  for (const fx of fxList) {
    if (signal?.aborted) break;
    const mapped = matchMap.get(coerceInt(fx.id));
    if (!mapped) {
      out.push({
        fplFixture: fx,
        matchId: null,
        homeFotmobId: null,
        awayFotmobId: null,
        score: null,
        events: [],
        lineups: null,
        fetchError: null,
        detailsBlockedReason: null,
      });
      continue;
    }

    /** Pre-populated score from the season feed — good enough for pre-match + finished. */
    let score = mapped.score;
    let events = [];
    let lineups = null;
    let fetchError = null;

    if (!detailsBlocked) {
      try {
        const mj = await fetchFotmob(`matchDetails?matchId=${mapped.matchId}`);
        const mdScore = parseScore(mj);
        /**
         * Prefer matchDetails score when it has numbers — it's fresher for live matches and
         * includes the live minute. Falls back to the season feed otherwise.
         */
        if (
          Number.isFinite(Number(mdScore.homeScore)) &&
          Number.isFinite(Number(mdScore.awayScore))
        ) {
          score = mdScore;
        }
        events = parseEvents(mj);
        lineups = parseLineups(mj, {
          homeFotmobId: mapped.homeFotmobId,
          awayFotmobId: mapped.awayFotmobId,
        });
      } catch (err) {
        if (err instanceof FotmobVerificationRequired) {
          detailsBlocked = true;
          detailsBlockedReason =
            'FotMob match details are temporarily gated (Cloudflare Turnstile); score + status still update from the season feed.';
        } else {
          fetchError = err?.message || String(err);
        }
      }
    }

    const enriched = enrichWithFplElements({
      fplFixture: fx,
      score,
      events,
      lineups,
      elementById,
    });

    out.push({
      fplFixture: fx,
      matchId: mapped.matchId,
      homeFotmobId: mapped.homeFotmobId,
      awayFotmobId: mapped.awayFotmobId,
      score,
      events: enriched.events,
      lineups: enriched.lineups,
      fetchError,
      detailsBlockedReason: detailsBlocked ? detailsBlockedReason : null,
    });
  }

  return out;
}
