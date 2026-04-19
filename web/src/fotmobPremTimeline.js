import { fotmobResourceUrl } from './fotmobUrl.js';

const PL_LEAGUE_ID = 47;

function normClub(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+fc\s*$/i, '')
    .replace(/\./g, '')
    .trim();
}

function yyyymmddUtc(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${mo}${day}`;
}

async function fetchFotmob(pathWithQuery) {
  const url = fotmobResourceUrl(pathWithQuery);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`FotMob ${pathWithQuery} HTTP ${r.status}`);
  return r.json();
}

/**
 * Collect `{ id, homeId, awayId }` from FotMob `matches?date=` payload (shape varies).
 * @param {object} matchesJson
 * @returns {Array<{ matchId: number, homeId: number, awayId: number }>}
 */
export function collectDayMatches(matchesJson) {
  const out = [];
  const seen = new Set();

  function consider(o) {
    if (!o || typeof o !== 'object') return;
    const idRaw = o.id;
    const id = Number(idRaw);
    const h = o.home;
    const a = o.away;
    if (!Number.isFinite(id) || !h || !a) return;
    const hid = Number(h.id);
    const aid = Number(a.id);
    if (!Number.isFinite(hid) || !Number.isFinite(aid)) return;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ matchId: id, homeId: hid, awayId: aid });
  }

  function walk(o, depth) {
    if (depth > 18 || o == null) return;
    if (Array.isArray(o)) {
      for (const x of o) walk(x, depth + 1);
      return;
    }
    if (typeof o === 'object') {
      consider(o);
      for (const v of Object.values(o)) walk(v, depth + 1);
    }
  }

  walk(matchesJson, 0);
  return out;
}

/**
 * Table / overview teams from `leagues?id=47&tab=table|overview`.
 * @param {object} leagueJson
 * @returns {Array<{ id: number, shortName: string, name: string }>}
 */
export function extractLeagueTeams(leagueJson) {
  const raw = [];
  function walk(o, depth) {
    if (depth > 22 || !o || typeof o !== 'object') return;
    if (
      typeof o.id === 'number' &&
      typeof o.shortName === 'string' &&
      typeof o.name === 'string' &&
      o.shortName.length >= 2 &&
      o.shortName.length <= 6
    ) {
      raw.push({
        id: o.id,
        shortName: String(o.shortName).toUpperCase(),
        name: String(o.name),
      });
    }
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) {
        for (const x of v) walk(x, depth + 1);
      } else if (v && typeof v === 'object') walk(v, depth + 1);
    }
  }
  walk(leagueJson, 0);
  const byId = new Map();
  for (const t of raw) {
    if (!byId.has(t.id)) byId.set(t.id, t);
  }
  return [...byId.values()];
}

/**
 * @param {Record<number, object>} teamById — FPL `teams` keyed by id
 * @param {Array<{ id: number, shortName: string, name: string }>} fotmobTeams
 * @returns {Map<number, number>} fplTeamId → fotmobTeamId
 */
export function mapFplTeamsToFotmob(teamById, fotmobTeams) {
  const byShort = new Map();
  const byName = new Map();
  for (const t of fotmobTeams) {
    byShort.set(t.shortName, t.id);
    byName.set(normClub(t.name), t.id);
  }
  const m = new Map();
  for (const [k, pl] of Object.entries(teamById || {})) {
    const fid = Number(k);
    if (!Number.isFinite(fid)) continue;
    const sh = String(pl.short_name || '').toUpperCase();
    if (byShort.has(sh)) {
      m.set(fid, byShort.get(sh));
      continue;
    }
    const nn = normClub(pl.name);
    if (byName.has(nn)) m.set(fid, byName.get(nn));
  }
  return m;
}

function findMatchIdForFplFixture(fx, fplToFm, dayRows) {
  const th = Number(fx.team_h);
  const ta = Number(fx.team_a);
  const fh = fplToFm.get(th);
  const fa = fplToFm.get(ta);
  if (!Number.isFinite(fh) || !Number.isFinite(fa)) return null;
  for (const row of dayRows) {
    if (
      (row.homeId === fh && row.awayId === fa) ||
      (row.homeId === fa && row.awayId === fh)
    ) {
      return row.matchId;
    }
  }
  return null;
}

function normPlayer(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’.]/g, '')
    .trim();
}

/**
 * Resolve FotMob display name to FPL element id on `teamFplId`.
 * @returns {number | null}
 */
export function matchFplElementId(teamFplId, displayName, elementById) {
  const needle = normPlayer(displayName);
  if (!needle) return null;
  const cands = [];
  for (const el of Object.values(elementById || {})) {
    if (Number(el.team) !== Number(teamFplId)) continue;
    const id = Number(el.id);
    if (!Number.isFinite(id)) continue;
    const w = normPlayer(el.web_name);
    const kn = normPlayer(el.known_name);
    const sn = normPlayer(el.second_name);
    const fn = normPlayer(el.first_name);
    const full = normPlayer([el.first_name, el.second_name].filter(Boolean).join(' '));
    if (
      needle === w ||
      needle === kn ||
      needle === sn ||
      needle === full ||
      w.includes(needle) ||
      needle.includes(w) ||
      sn === needle ||
      needle.includes(sn)
    ) {
      cands.push(id);
    }
  }
  if (cands.length === 1) return cands[0];
  return null;
}

function extractEventsList(matchJson) {
  const c = matchJson?.content;
  const mf = c?.matchFacts;
  const ev = mf?.events;
  if (Array.isArray(ev)) return ev;
  if (ev && Array.isArray(ev.events)) return ev.events;
  return [];
}

function classifyFotmobEvent(ev) {
  const t = String(ev?.type || '');
  const tl = t.toLowerCase();
  const card = String(ev?.card || '').toLowerCase();
  if (tl === 'card' || card) {
    if (card.includes('red') || tl.includes('red')) return 'red_card';
    return 'yellow_card';
  }
  if (tl.includes('goal') || /\bgoal\b/i.test(String(ev?.nameStr || ''))) {
    return 'goal';
  }
  if (tl.includes('assist') || /\bassist\b/i.test(String(ev?.nameStr || ''))) {
    return 'assist';
  }
  return null;
}

/**
 * FotMob goal rows sometimes list an assister in `swap` (second entry).
 * @returns {{ primary: object, assist: object | null }}
 */
function assistNameFromGoalText(nameStr) {
  const m = String(nameStr || '').match(/assist(?:ed)?\s+by\s+([^·,(\n]+)/i);
  return m ? m[1].trim() : null;
}

function assistPlayerFromSwap(ev) {
  const swaps = Array.isArray(ev?.swap) ? ev.swap : [];
  const last = swaps[swaps.length - 1];
  if (last?.name && /\bassist/i.test(String(ev?.nameStr || ''))) {
    return { name: String(last.name) };
  }
  return null;
}

/**
 * FotMob encodes event minutes in varying shapes across responses. Try:
 *   1. `ev.time` as number (most common)
 *   2. `ev.timeStr` / `ev.time` as string — e.g. `"23'"`, `"45+2'"`, `"90+3"`
 *   3. fallback fields `minute`, `matchMinute`
 * Stoppage (`+N`) becomes a separate `stoppage` value so it can act as a sub-minute tiebreak.
 * Returns `{ minute: number | null, stoppage: number }`.
 */
export function parseFotmobEventMinute(ev) {
  const directTime = ev?.time;
  if (typeof directTime === 'number' && Number.isFinite(directTime)) {
    const overloadNum = Number(ev?.overloadTime);
    return {
      minute: directTime,
      stoppage: Number.isFinite(overloadNum) ? overloadNum : 0,
    };
  }
  const strSources = [ev?.timeStr, directTime, ev?.minute, ev?.matchMinute];
  for (const src of strSources) {
    if (src == null) continue;
    const s = String(src);
    const m = s.match(/(\d+)(?:\s*\+\s*(\d+))?/);
    if (m) {
      const overloadNum = Number(ev?.overloadTime);
      return {
        minute: Number(m[1]),
        stoppage: m[2] != null
          ? Number(m[2])
          : Number.isFinite(overloadNum)
            ? overloadNum
            : 0,
      };
    }
  }
  const altNum = Number(ev?.minute ?? ev?.matchMinute);
  if (Number.isFinite(altNum)) {
    const overloadNum = Number(ev?.overloadTime);
    return {
      minute: altNum,
      stoppage: Number.isFinite(overloadNum) ? overloadNum : 0,
    };
  }
  return { minute: null, stoppage: 0 };
}

/**
 * @param {{
 *   gameweek: number,
 *   gwFixtures: object[],
 *   elementById: Record<number, object>,
 *   teamById: Record<number, object>,
 *   trackedElementIds: Set<number>,
 * }} p
 * @returns {Promise<object[]>} contribution-shaped events with `sortKey` ≈ epoch ms ordering
 */
export async function fetchFotmobContributionTimeline({
  gameweek,
  gwFixtures,
  elementById,
  teamById,
  trackedElementIds,
}) {
  const gw = Number(gameweek);
  if (!Number.isFinite(gw) || !Array.isArray(gwFixtures) || !gwFixtures.length) {
    return [];
  }

  let leagueJson;
  try {
    leagueJson = await fetchFotmob(
      `leagues?id=${PL_LEAGUE_ID}&tab=table&type=league&timeZone=UTC`
    );
  } catch {
    try {
      leagueJson = await fetchFotmob(
        `leagues?id=${PL_LEAGUE_ID}&tab=overview&type=league&timeZone=UTC`
      );
    } catch {
      return [];
    }
  }

  const fotmobTeams = extractLeagueTeams(leagueJson);
  const fplToFm = mapFplTeamsToFotmob(teamById, fotmobTeams);
  if (!fplToFm.size) return [];

  const dates = new Set();
  for (const fx of gwFixtures) {
    const d = yyyymmddUtc(fx.kickoff_time);
    if (d) dates.add(d);
  }

  /** @type {Map<string, ReturnType<collectDayMatches>>} */
  const byDate = new Map();
  for (const d of dates) {
    try {
      const mj = await fetchFotmob(`matches?date=${d}`);
      byDate.set(d, collectDayMatches(mj));
    } catch {
      byDate.set(d, []);
    }
  }

  const out = [];

  for (const fx of gwFixtures) {
    const kickMs = Date.parse(String(fx.kickoff_time || ''));
    if (!Number.isFinite(kickMs)) continue;
    const d = yyyymmddUtc(fx.kickoff_time);
    const dayRows = d ? byDate.get(d) || [] : [];
    const matchId = findMatchIdForFplFixture(fx, fplToFm, dayRows);
    if (!Number.isFinite(matchId)) continue;

    let matchJson;
    try {
      matchJson = await fetchFotmob(`matchDetails?matchId=${matchId}`);
    } catch {
      continue;
    }

    const rawEvents = extractEventsList(matchJson);
    /**
     * Normalize then sort chronologically. Different FotMob endpoints return events in different
     * orders (sometimes grouped by half, sometimes descending). Sorting here guarantees the slot
     * tie-break reflects real match order.
     */
    const normalized = [];
    for (let i = 0; i < rawEvents.length; i++) {
      const ev = rawEvents[i];
      const kind = classifyFotmobEvent(ev);
      if (!kind) continue;
      const { minute, stoppage } = parseFotmobEventMinute(ev);
      const eid = Number(ev?.eventId);
      normalized.push({
        ev,
        kind,
        minute,
        stoppage,
        idx: i,
        eid: Number.isFinite(eid) ? eid : i,
      });
    }
    normalized.sort((a, b) => {
      const am = Number.isFinite(a.minute) ? a.minute : Number.POSITIVE_INFINITY;
      const bm = Number.isFinite(b.minute) ? b.minute : Number.POSITIVE_INFINITY;
      if (am !== bm) return am - bm;
      if (a.stoppage !== b.stoppage) return a.stoppage - b.stoppage;
      if (a.eid !== b.eid) return a.eid - b.eid;
      return a.idx - b.idx;
    });

    let slot = 0;
    let lastMk = '';

    for (let i = 0; i < normalized.length; i++) {
      const { ev, kind, minute, stoppage } = normalized[i];
      const tmin = Number.isFinite(minute) ? minute : 0;
      const ot = Number.isFinite(stoppage) ? stoppage : 0;
      const mk = `${tmin}_${ot}`;
      if (mk !== lastMk) {
        slot = 0;
        lastMk = mk;
      } else {
        slot += 1;
      }
      const sortKey = kickMs + tmin * 60_000 + ot * 1000 + slot;

      const pushOne = (k, playerObj, delta = 1) => {
        if (!playerObj?.name) return;
        const isHome = ev.isHome === true;
        const teamFpl = isHome ? Number(fx.team_h) : Number(fx.team_a);
        if (!Number.isFinite(teamFpl)) return;
        const elid = matchFplElementId(teamFpl, playerObj.name, elementById);
        if (elid == null || !trackedElementIds.has(elid)) return;
        const iso = new Date(sortKey).toISOString();
        out.push({
          stableId: `fotmob:${matchId}:${k}:${elid}:${ev.eventId ?? i}:${sortKey}`,
          kind: k,
          elementId: elid,
          gameweek: gw,
          delta,
          recordedAt: iso,
          sortKey,
          source: 'fotmob',
        });
      };

      if (kind === 'goal') {
        const primary = ev?.player;
        const teamFplScorer =
          ev.isHome === true ? Number(fx.team_h) : Number(fx.team_a);
        pushOne('goal', primary, 1);
        const an = assistNameFromGoalText(ev.nameStr);
        if (an && Number.isFinite(teamFplScorer)) {
          const elA = matchFplElementId(teamFplScorer, an, elementById);
          if (elA != null && trackedElementIds.has(elA)) {
            const iso = new Date(sortKey + 1).toISOString();
            out.push({
              stableId: `fotmob:${matchId}:assist:${elA}:${ev.eventId ?? i}:${sortKey}a`,
              kind: 'assist',
              elementId: elA,
              gameweek: gw,
              delta: 1,
              recordedAt: iso,
              sortKey: sortKey + 1,
              source: 'fotmob',
            });
          }
        } else {
          const swapA = assistPlayerFromSwap(ev);
          if (swapA?.name) pushOne('assist', swapA, 1);
        }
      } else {
        pushOne(kind, ev.player, 1);
      }
    }
  }

  out.sort((a, b) => (Number(b.sortKey) || 0) - (Number(a.sortKey) || 0));
  return out;
}
