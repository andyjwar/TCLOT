/**
 * TCLOT bookie — fake-money betting for the Draft H2H league.
 *
 * Markets are priced by the site's own prediction model: the deploy pipeline
 * writes league-data/bookie-markets.json (build-bookie-markets.mjs) and this
 * Worker ingests it into D1 — weekly H2H (home/draw/away) markets open until
 * the FPL gameweek deadline, plus a season-long outright champion market that
 * is repriced after every banked gameweek. Bets lock their odds at bet time.
 *
 * Settlement reads the official FPL Draft league results directly (same
 * "effectively finished" rule as web/src/h2hEffectiveFinished.js: a GW counts
 * as final once every Premier League fixture for it is finished or
 * provisionally finished), grades bets, credits payouts, and pays every
 * registered punter a weekly stipend so nobody is frozen out after going bust.
 *
 * Identity is honor-system-with-a-lock: each manager claims their league
 * entry once with a PIN (PBKDF2-hashed); sessions are HMAC-signed tokens.
 *
 * Endpoints (JSON):
 *   GET  /api/health
 *   GET  /api/state        — markets, leaderboard, weekly P/L (+ me with auth)
 *   POST /api/register     — { entryId, pin }
 *   POST /api/login        — { entryId, pin }
 *   POST /api/bets         — { marketId, selection, stake } (Bearer auth)
 *
 * Deploy: cd web/workers/bookie && npm run deploy  (see README.md for setup)
 */

import { footballComplete, h2hResultForMarket, championFromMatches } from './settlement.js';

const STARTING_BALANCE = 1000;
const WEEKLY_STIPEND = 50;
const MIN_STAKE = 10;
const PIN_ITERATIONS = 100_000;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days
const SYNC_THROTTLE_MS = 1000 * 60 * 5;
const DRAFT_API = 'https://draft.premierleague.com/api';
const CLASSIC_API = 'https://fantasy.premierleague.com/api';

/* ------------------------------------------------------------------ */
/* Small utilities                                                      */
/* ------------------------------------------------------------------ */

function corsHeaders(env, request) {
  const origin = request.headers.get('Origin');
  const allow = env.ALLOW_ORIGIN?.trim() || origin || '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, ch) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...ch, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function errorJson(message, status, ch) {
  return json({ error: message }, status, ch);
}

const enc = new TextEncoder();

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

async function hashPin(pin, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PIN_ITERATIONS },
    key,
    256,
  );
  return bytesToHex(bits);
}

async function hmacSign(payloadB64, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  return bytesToHex(sig);
}

async function makeSessionToken(entryId, season, secret) {
  const payloadB64 = b64urlEncode(
    JSON.stringify({ e: Number(entryId), s: season, x: Date.now() + SESSION_TTL_MS }),
  );
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

/** Verified session `{ entryId, season }` from the Authorization header, or null. */
async function sessionFromRequest(request, env) {
  const secret = env.SESSION_SECRET;
  if (!secret) return null;
  const auth = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+(.+)$/.exec(auth);
  if (!m) return null;
  const [payloadB64, sig] = m[1].split('.');
  if (!payloadB64 || !sig) return null;
  const expected = await hmacSign(payloadB64, secret);
  if (sig !== expected) return null;
  let payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64));
  } catch {
    return null;
  }
  if (!payload || typeof payload.x !== 'number' || payload.x < Date.now()) return null;
  if (!Number.isFinite(Number(payload.e)) || typeof payload.s !== 'string') return null;
  return { entryId: Number(payload.e), season: payload.s };
}

async function fetchJson(url, init) {
  const r = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'TCLOT-bookie/1.0' },
    ...init,
  });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
}

/* ------------------------------------------------------------------ */
/* Meta key/value helpers                                               */
/* ------------------------------------------------------------------ */

async function metaGet(db, k) {
  const row = await db.prepare('SELECT v FROM meta WHERE k = ?').bind(k).first();
  return row ? row.v : null;
}

async function metaSet(db, k, v) {
  await db
    .prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')
    .bind(k, String(v))
    .run();
}

/* ------------------------------------------------------------------ */
/* Market ingestion — bookie-markets.json → D1 rows                     */
/* ------------------------------------------------------------------ */

/**
 * Pull the model-priced market sheet from the deployed site and open any
 * markets that don't exist yet. Weekly H2H odds freeze at ingestion (the
 * sheet is rebuilt on every deploy, but a market that is already open keeps
 * its board — bets locked odds at bet time anyway). The outright board *is*
 * repriced on every sync while it stays open, because its odds should track
 * the Predictions tab week to week.
 */
async function ingestMarkets(env) {
  const base = (env.SITE_BASE_URL || '').replace(/\/+$/, '');
  if (!base) return;
  const sheet = await fetchJson(`${base}/league-data/bookie-markets.json`, {
    cf: { cacheTtl: 0 },
  });
  const season = sheet?.season;
  if (!season) return;
  const db = env.DB;
  const nowMs = Date.now();

  if (sheet.weekly && Array.isArray(sheet.weekly.matches)) {
    const closesAtMs = Date.parse(sheet.weekly.deadline);
    if (Number.isFinite(closesAtMs) && closesAtMs > nowMs) {
      for (const m of sheet.weekly.matches) {
        const marketKey = `${season}:${m.key}`;
        const payload = JSON.stringify({
          gw: m.gw,
          homeEntryId: m.homeEntryId,
          awayEntryId: m.awayEntryId,
          homeName: m.homeName,
          awayName: m.awayName,
          odds: m.odds,
          probs: m.probs,
        });
        await db
          .prepare(
            `INSERT INTO markets (season, market_key, kind, gw, closes_at_ms, status, payload)
             VALUES (?, ?, 'h2h', ?, ?, 'open', ?)
             ON CONFLICT(market_key) DO NOTHING`,
          )
          .bind(season, marketKey, Number(m.gw), closesAtMs, payload)
          .run();
      }
    }
  }

  if (sheet.outright && Array.isArray(sheet.outright.selections)) {
    const marketKey = `${season}:outright`;
    const closesAtMs = Date.parse(sheet.outright.closesAt ?? '') || nowMs + 400 * 24 * 3600 * 1000;
    const payload = JSON.stringify({
      asOfGw: sheet.outright.asOfGw ?? null,
      selections: sheet.outright.selections,
    });
    await db
      .prepare(
        `INSERT INTO markets (season, market_key, kind, gw, closes_at_ms, status, payload)
         VALUES (?, ?, 'outright', NULL, ?, 'open', ?)
         ON CONFLICT(market_key) DO UPDATE SET
           payload = excluded.payload,
           closes_at_ms = excluded.closes_at_ms
         WHERE markets.status = 'open'`,
      )
      .bind(season, marketKey, closesAtMs, payload)
      .run();
  }

  await metaSet(db, 'currentSeason', season);
}

/* ------------------------------------------------------------------ */
/* Settlement — official FPL results → graded bets                      */
/* (pure grading rules live in settlement.js so node:test can cover them) */
/* ------------------------------------------------------------------ */

/** Grade every open bet on a settled market and credit winners. */
async function gradeBets(db, market, winningSelection) {
  const bets = await db
    .prepare(`SELECT * FROM bets WHERE market_id = ? AND status = 'open'`)
    .bind(market.id)
    .all();
  const nowIso = new Date().toISOString();
  for (const bet of bets.results ?? []) {
    const won = winningSelection != null && String(bet.selection) === String(winningSelection);
    if (won) {
      const payout = Math.round(bet.stake * bet.odds);
      await db.batch([
        db
          .prepare(`UPDATE bets SET status = 'won', payout = ?, settled_at = ? WHERE id = ?`)
          .bind(payout, nowIso, bet.id),
        db
          .prepare(`UPDATE users SET balance = balance + ? WHERE entry_id = ? AND season = ?`)
          .bind(payout, bet.entry_id, bet.season),
      ]);
    } else if (winningSelection != null) {
      await db
        .prepare(`UPDATE bets SET status = 'lost', payout = 0, settled_at = ? WHERE id = ?`)
        .bind(nowIso, bet.id)
        .run();
    } else {
      // Void: no result could ever be derived — refund the stake.
      await db.batch([
        db
          .prepare(`UPDATE bets SET status = 'void', payout = ?, settled_at = ? WHERE id = ?`)
          .bind(bet.stake, nowIso, bet.id),
        db
          .prepare(`UPDATE users SET balance = balance + ? WHERE entry_id = ? AND season = ?`)
          .bind(bet.stake, bet.entry_id, bet.season),
      ]);
    }
  }
}

/**
 * Settle every due market: H2H markets whose gameweek's football is complete,
 * and the outright once all league matches are final. After a gameweek fully
 * settles, every registered punter gets the weekly stipend (once per GW) so
 * a busted bankroll can always come back for more.
 */
async function settleDue(env) {
  const db = env.DB;
  const nowMs = Date.now();
  const due = await db
    .prepare(`SELECT * FROM markets WHERE status = 'open' AND closes_at_ms < ?`)
    .bind(nowMs)
    .all();
  const dueMarkets = due.results ?? [];
  const h2hDue = dueMarkets.filter((m) => m.kind === 'h2h');
  const outrightDue = dueMarkets.filter((m) => m.kind === 'outright');
  if (h2hDue.length === 0 && outrightDue.length === 0) return;

  const leagueId = String(env.LEAGUE_ID || '').trim();
  if (!leagueId) return;
  let details;
  try {
    details = await fetchJson(`${DRAFT_API}/league/${leagueId}/details`);
  } catch {
    return; // FPL down — try again on the next sync
  }
  const matches = details?.matches ?? [];
  const nowIso = new Date().toISOString();

  const gws = [...new Set(h2hDue.map((m) => Number(m.gw)))].sort((a, b) => a - b);
  for (const gw of gws) {
    let fixtures;
    try {
      fixtures = await fetchJson(`${CLASSIC_API}/fixtures/?event=${gw}`);
    } catch {
      continue;
    }
    const complete = footballComplete(fixtures, gw);
    for (const market of h2hDue.filter((m) => Number(m.gw) === gw)) {
      const payload = JSON.parse(market.payload);
      const match = matches.find(
        (m) =>
          Number(m.event) === gw &&
          ((Number(m.league_entry_1) === Number(payload.homeEntryId) &&
            Number(m.league_entry_2) === Number(payload.awayEntryId)) ||
            (Number(m.league_entry_1) === Number(payload.awayEntryId) &&
              Number(m.league_entry_2) === Number(payload.homeEntryId))),
      );
      const finished =
        match &&
        (match.finished === true || (complete && match.started === true));
      if (!finished) continue;
      const outcome = h2hResultForMarket(payload, match);
      if (!outcome) continue;
      await db
        .prepare(
          `UPDATE markets SET status = 'settled', result = ?, settled_at = ?,
             payload = ? WHERE id = ?`,
        )
        .bind(
          outcome.result,
          nowIso,
          JSON.stringify({ ...payload, finalScore: { home: outcome.home, away: outcome.away } }),
          market.id,
        )
        .run();
      await gradeBets(db, market, outcome.result);
    }

    // Stipend: once per gameweek, after every H2H market for it has settled.
    const remaining = await db
      .prepare(`SELECT COUNT(*) AS n FROM markets WHERE kind = 'h2h' AND gw = ? AND status = 'open'`)
      .bind(gw)
      .first();
    if (Number(remaining?.n) === 0) {
      const season = h2hDue.find((m) => Number(m.gw) === gw)?.season;
      const stipendKey = `stipend:${season}:${gw}`;
      if (season && !(await metaGet(db, stipendKey))) {
        await db
          .prepare(`UPDATE users SET balance = balance + ? WHERE season = ?`)
          .bind(WEEKLY_STIPEND, season)
          .run();
        await metaSet(db, stipendKey, nowIso);
      }
    }
  }

  for (const market of outrightDue) {
    const champion = championFromMatches(matches);
    if (champion == null) continue;
    await db
      .prepare(`UPDATE markets SET status = 'settled', result = ?, settled_at = ? WHERE id = ?`)
      .bind(String(champion), nowIso, market.id)
      .run();
    await gradeBets(db, market, String(champion));
  }
}

/** Throttled ingest + settle, shared by the cron and lazy request-time sync. */
async function syncNow(env, { force = false } = {}) {
  const db = env.DB;
  if (!force) {
    const last = Number(await metaGet(db, 'lastSyncAtMs')) || 0;
    if (Date.now() - last < SYNC_THROTTLE_MS) return;
  }
  await metaSet(db, 'lastSyncAtMs', Date.now());
  try {
    await ingestMarkets(env);
  } catch (e) {
    console.warn('bookie: ingest failed', e.message);
  }
  try {
    await settleDue(env);
  } catch (e) {
    console.warn('bookie: settle failed', e.message);
  }
}

/* ------------------------------------------------------------------ */
/* Roster — who is allowed to register                                  */
/* ------------------------------------------------------------------ */

/** League roster from the outright market payload: entryId → name. */
async function rosterForSeason(db, season) {
  const market = await db
    .prepare(`SELECT payload FROM markets WHERE market_key = ?`)
    .bind(`${season}:outright`)
    .first();
  if (!market) return null;
  try {
    const payload = JSON.parse(market.payload);
    return new Map(
      (payload.selections ?? []).map((s) => [Number(s.entryId), String(s.name)]),
    );
  } catch {
    return null;
  }
}

async function currentSeason(db) {
  return metaGet(db, 'currentSeason');
}

/* ------------------------------------------------------------------ */
/* Route handlers                                                       */
/* ------------------------------------------------------------------ */

async function handleRegister(request, env, ch) {
  const body = await request.json().catch(() => null);
  const entryId = Number(body?.entryId);
  const pin = String(body?.pin ?? '');
  if (!Number.isFinite(entryId) || !/^\d{4,8}$/.test(pin)) {
    return errorJson('entryId and a 4–8 digit pin are required', 400, ch);
  }
  if (!env.SESSION_SECRET) return errorJson('worker missing SESSION_SECRET', 500, ch);
  const db = env.DB;
  const season = await currentSeason(db);
  if (!season) return errorJson('markets not ingested yet — try again shortly', 503, ch);
  const roster = await rosterForSeason(db, season);
  if (!roster || !roster.has(entryId)) {
    return errorJson('unknown league entry', 400, ch);
  }
  const existing = await db
    .prepare(`SELECT entry_id FROM users WHERE entry_id = ? AND season = ?`)
    .bind(entryId, season)
    .first();
  if (existing) return errorJson('this team is already claimed — log in with its PIN', 409, ch);

  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPin(pin, salt);
  await db
    .prepare(
      `INSERT INTO users (entry_id, season, name, pin_hash, pin_salt, balance, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(entryId, season, roster.get(entryId), hash, salt, STARTING_BALANCE, new Date().toISOString())
    .run();
  const token = await makeSessionToken(entryId, season, env.SESSION_SECRET);
  return json({ token, entryId, season, name: roster.get(entryId), balance: STARTING_BALANCE }, 200, ch);
}

async function handleLogin(request, env, ch) {
  const body = await request.json().catch(() => null);
  const entryId = Number(body?.entryId);
  const pin = String(body?.pin ?? '');
  if (!Number.isFinite(entryId) || pin.length === 0) {
    return errorJson('entryId and pin are required', 400, ch);
  }
  if (!env.SESSION_SECRET) return errorJson('worker missing SESSION_SECRET', 500, ch);
  const db = env.DB;
  const season = await currentSeason(db);
  if (!season) return errorJson('markets not ingested yet — try again shortly', 503, ch);
  const user = await db
    .prepare(`SELECT * FROM users WHERE entry_id = ? AND season = ?`)
    .bind(entryId, season)
    .first();
  if (!user) return errorJson('team not registered yet', 404, ch);
  const hash = await hashPin(pin, user.pin_salt);
  if (hash !== user.pin_hash) return errorJson('wrong PIN', 401, ch);
  const token = await makeSessionToken(entryId, season, env.SESSION_SECRET);
  return json({ token, entryId, season, name: user.name, balance: user.balance }, 200, ch);
}

async function handlePlaceBet(request, env, ch) {
  const session = await sessionFromRequest(request, env);
  if (!session) return errorJson('login required', 401, ch);
  const body = await request.json().catch(() => null);
  const marketId = Number(body?.marketId);
  const selection = String(body?.selection ?? '');
  const stake = Number(body?.stake);
  if (!Number.isFinite(marketId) || !selection) {
    return errorJson('marketId and selection are required', 400, ch);
  }
  if (!Number.isInteger(stake) || stake < MIN_STAKE) {
    return errorJson(`stake must be a whole number of at least ${MIN_STAKE} coins`, 400, ch);
  }
  const db = env.DB;
  const market = await db.prepare(`SELECT * FROM markets WHERE id = ?`).bind(marketId).first();
  if (!market || market.season !== session.season) return errorJson('unknown market', 404, ch);
  if (market.status !== 'open' || market.closes_at_ms <= Date.now()) {
    return errorJson('market is closed', 409, ch);
  }
  const payload = JSON.parse(market.payload);
  let odds = null;
  if (market.kind === 'h2h') {
    if (!['home', 'draw', 'away'].includes(selection)) {
      return errorJson('selection must be home, draw or away', 400, ch);
    }
    odds = Number(payload.odds?.[selection]);
  } else if (market.kind === 'outright') {
    const sel = (payload.selections ?? []).find((s) => String(s.entryId) === selection);
    odds = sel ? Number(sel.odds) : null;
  }
  if (!Number.isFinite(odds) || odds < 1) return errorJson('unknown selection', 400, ch);

  const debit = await db
    .prepare(
      `UPDATE users SET balance = balance - ?
       WHERE entry_id = ? AND season = ? AND balance >= ?`,
    )
    .bind(stake, session.entryId, session.season, stake)
    .run();
  if ((debit.meta?.changes ?? 0) === 0) return errorJson('insufficient balance', 400, ch);

  try {
    await db
      .prepare(
        `INSERT INTO bets (season, entry_id, market_id, selection, stake, odds, placed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(session.season, session.entryId, marketId, selection, stake, odds, new Date().toISOString())
      .run();
  } catch (e) {
    // Refund the debit if the ticket failed to write.
    await db
      .prepare(`UPDATE users SET balance = balance + ? WHERE entry_id = ? AND season = ?`)
      .bind(stake, session.entryId, session.season)
      .run();
    throw e;
  }
  const user = await db
    .prepare(`SELECT balance FROM users WHERE entry_id = ? AND season = ?`)
    .bind(session.entryId, session.season)
    .first();
  return json(
    { ok: true, balance: user?.balance ?? null, odds, potentialPayout: Math.round(stake * odds) },
    200,
    ch,
  );
}

async function handleState(request, env, ctx, ch) {
  const db = env.DB;
  ctx.waitUntil(syncNow(env));
  const season = await currentSeason(db);
  if (!season) {
    // First hit ever: sync inline so the tab isn't empty on day one.
    await syncNow(env, { force: true });
  }
  const seasonNow = season ?? (await currentSeason(db));
  if (!seasonNow) return json({ season: null, markets: [], leaderboard: [] }, 200, ch);

  const nowMs = Date.now();
  const markets = await db
    .prepare(
      `SELECT * FROM markets WHERE season = ?
       ORDER BY CASE kind WHEN 'outright' THEN 1 ELSE 0 END, gw DESC, id ASC`,
    )
    .bind(seasonNow)
    .all();
  const marketRows = (markets.results ?? []).map((m) => ({
    id: m.id,
    key: m.market_key,
    kind: m.kind,
    gw: m.gw,
    closesAt: new Date(m.closes_at_ms).toISOString(),
    open: m.status === 'open' && m.closes_at_ms > nowMs,
    status: m.status,
    result: m.result,
    payload: JSON.parse(m.payload),
  }));

  const users = await db
    .prepare(`SELECT entry_id, name, balance FROM users WHERE season = ? ORDER BY balance DESC, name ASC`)
    .bind(seasonNow)
    .all();

  // Weekly net P/L per punter per GW — the "who won the week" table.
  const weekly = await db
    .prepare(
      `SELECT b.entry_id, m.gw,
              SUM(CASE b.status WHEN 'won' THEN b.payout - b.stake
                                WHEN 'lost' THEN -b.stake ELSE 0 END) AS net,
              COUNT(*) AS bets
       FROM bets b JOIN markets m ON m.id = b.market_id
       WHERE b.season = ? AND m.kind = 'h2h' AND b.status IN ('won', 'lost')
       GROUP BY b.entry_id, m.gw`,
    )
    .bind(seasonNow)
    .all();

  // Everyone's tickets become public once their market closes — bragging
  // rights without letting anyone copy a live board.
  const closedBets = await db
    .prepare(
      `SELECT b.entry_id, b.market_id, b.selection, b.stake, b.odds, b.status, b.payout,
              m.gw, m.kind
       FROM bets b JOIN markets m ON m.id = b.market_id
       WHERE b.season = ? AND m.closes_at_ms <= ?
       ORDER BY b.id DESC LIMIT 400`,
    )
    .bind(seasonNow, nowMs)
    .all();

  const out = {
    season: seasonNow,
    startingBalance: STARTING_BALANCE,
    weeklyStipend: WEEKLY_STIPEND,
    minStake: MIN_STAKE,
    markets: marketRows,
    leaderboard: (users.results ?? []).map((u) => ({
      entryId: u.entry_id,
      name: u.name,
      balance: u.balance,
    })),
    weeklyNet: (weekly.results ?? []).map((r) => ({
      entryId: r.entry_id,
      gw: r.gw,
      net: r.net,
      bets: r.bets,
    })),
    closedBets: closedBets.results ?? [],
  };

  const session = await sessionFromRequest(request, env);
  if (session && session.season === seasonNow) {
    const me = await db
      .prepare(`SELECT entry_id, name, balance FROM users WHERE entry_id = ? AND season = ?`)
      .bind(session.entryId, seasonNow)
      .first();
    if (me) {
      const myBets = await db
        .prepare(
          `SELECT b.id, b.market_id, b.selection, b.stake, b.odds, b.status, b.payout,
                  b.placed_at, m.kind, m.gw, m.status AS market_status
           FROM bets b JOIN markets m ON m.id = b.market_id
           WHERE b.season = ? AND b.entry_id = ?
           ORDER BY b.id DESC LIMIT 200`,
        )
        .bind(seasonNow, session.entryId)
        .all();
      out.me = {
        entryId: me.entry_id,
        name: me.name,
        balance: me.balance,
        bets: myBets.results ?? [],
      };
    }
  }
  return json(out, 200, ch);
}

/* ------------------------------------------------------------------ */
/* Worker entry points                                                  */
/* ------------------------------------------------------------------ */

export default {
  async fetch(request, env, ctx) {
    const ch = corsHeaders(env, request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: ch });

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    try {
      if (path === '/api/health') {
        return json({ ok: true, service: 'tclot-bookie' }, 200, ch);
      }
      if (path === '/api/state' && request.method === 'GET') {
        return await handleState(request, env, ctx, ch);
      }
      if (path === '/api/register' && request.method === 'POST') {
        return await handleRegister(request, env, ch);
      }
      if (path === '/api/login' && request.method === 'POST') {
        return await handleLogin(request, env, ch);
      }
      if (path === '/api/bets' && request.method === 'POST') {
        return await handlePlaceBet(request, env, ch);
      }
      return errorJson('not found', 404, ch);
    } catch (e) {
      console.error('bookie: unhandled', e);
      return errorJson('internal error', 500, ch);
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(syncNow(env, { force: true }));
  },
};
