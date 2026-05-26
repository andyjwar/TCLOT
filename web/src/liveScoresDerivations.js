/**
 * Pure derivation helpers for the Live scores redesign (PR #5 / Phase 2).
 *
 * No React, no DOM, no fetch — these are the small math/state functions the
 * Live UI uses to render the shared status header, the per-fixture face-off
 * row, and the expanded player view. Kept testable.
 */

/**
 * Lead detection for the brand-violet winner score (Option D).
 *
 * Returns 'home' / 'away' when one side strictly leads, 'tie' for equal
 * non-null totals, and null when either total is missing (pre-kickoff or
 * upstream data not yet loaded).
 *
 * @param {number | null | undefined} homeLive
 * @param {number | null | undefined} awayLive
 * @returns {'home' | 'away' | 'tie' | null}
 */
export function liveFixtureLead(homeLive, awayLive) {
  if (homeLive == null || awayLive == null) return null;
  const h = Number(homeLive);
  const a = Number(awayLive);
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
  if (h > a) return 'home';
  if (a > h) return 'away';
  return 'tie';
}

/**
 * Defensive-contribution threshold per FPL position singular (`'GKP'`, `'GK'`,
 * `'DEF'`, `'MID'`, `'FWD'`). GK/DEF need 10+, MID/FWD need 12+. Anything else
 * (unknown position, MNG, etc.) returns false.
 *
 * @param {string | null | undefined} pos
 * @param {number | null | undefined} dc
 * @returns {boolean}
 */
export function dcThresholdReached(pos, dc) {
  const n = Number(dc);
  if (!Number.isFinite(n)) return false;
  const p = String(pos ?? '').toUpperCase();
  if (p === 'GK' || p === 'GKP' || p === 'DEF') return n >= 10;
  if (p === 'MID' || p === 'FWD') return n >= 12;
  return false;
}

/**
 * Map an FPL pick row's `espnMatchdayRole` (`xi` / `bench` / `absent`) to
 * the status pill kind used in the redesigned expanded view. When the role
 * is unknown (no published lineups, DGW edge cases) we fall back to `'xi'`
 * — production already styles unknown rows as the default starter colour
 * via `live-picks-row` selectors.
 *
 * @param {{ espnMatchdayRole?: string | null } | null | undefined} row
 * @returns {'xi' | 'bench' | 'absent'}
 */
export function playerXiPillKind(row) {
  const r = row?.espnMatchdayRole;
  if (r === 'bench') return 'bench';
  if (r === 'absent') return 'absent';
  return 'xi';
}

/**
 * Live status for a single player row in the expanded view.
 *
 * Kinds:
 *   - `'live'`   — player on the pitch right now (minutes > 0, club fixtures
 *                  not all finished). `text` is `${minutes}'` for the red
 *                  minute counter (e.g. "47'").
 *   - `'ft'`     — all club fixtures finished AND player took minutes. Shows
 *                  the literal "FT" label.
 *   - `'dnp'`    — all club fixtures finished AND player took 0 minutes
 *                  (didn't play / on bench, didn't autosub).
 *   - `'pre'`    — club has unfinished fixtures and 0 minutes so far. Shows
 *                  kickoff time when available, otherwise "—".
 *   - `'none'`   — no GW fixture for this player's club (blank week). Shows
 *                  a long dash so the column stays aligned.
 *
 * @param {{
 *   minutes?: number | null,
 *   clubGwFixturesFinished?: boolean | null,
 *   hasGwFixture?: boolean | null,
 *   kickoffLabel?: string | null,
 * }} row
 * @returns {{ kind: 'live' | 'ft' | 'dnp' | 'pre' | 'none', text: string }}
 */
export function playerLiveState(row) {
  const m = Number(row?.minutes) || 0;
  if (row?.hasGwFixture === false) {
    return { kind: 'none', text: '—' };
  }
  const finished = Boolean(row?.clubGwFixturesFinished);
  if (finished) {
    if (m > 0) return { kind: 'ft', text: 'FT' };
    return { kind: 'dnp', text: 'DNP' };
  }
  if (m > 0) return { kind: 'live', text: `${m}'` };
  const ko = typeof row?.kickoffLabel === 'string' ? row.kickoffLabel.trim() : '';
  return { kind: 'pre', text: ko || '—' };
}

/**
 * Format an FPL fixture `kickoff_time` (ISO 8601) as a compact "Sat 16:30"
 * label in the viewer's locale. Returns null when the input is missing or
 * unparseable.
 *
 * Mainly used to drive `playerLiveState` for the DNP / pre-kickoff state.
 *
 * @param {string | null | undefined} iso
 * @param {Date} [now] — defaults to current time; lets tests pin "today".
 * @returns {string | null}
 */
export function formatKickoffLabel(iso, now = new Date()) {
  if (typeof iso !== 'string' || !iso.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const wd = d.toLocaleDateString(undefined, { weekday: 'short' });
    const hm = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    // If kickoff is later today, drop the weekday for a more compact label.
    const sameDay = (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
    return sameDay ? hm : `${wd} ${hm}`;
  } catch {
    return null;
  }
}

/**
 * Shared status for the *group* of all H2H fixtures in a single GW. The
 * mockup `LiveHeaderStrip` covers four states (Pre / Live / Mid-GW / FT):
 *
 *   - `'pre'`  — GW hasn't started, all upcoming.
 *   - `'live'` — at least one PL fixture has kicked off this GW and the
 *                GW is not finished. May or may not have a known minute /
 *                a progress count of finished fixtures.
 *   - `'ft'`   — every PL fixture in the GW is finished (event marked
 *                `finished` by FPL bootstrap, or every classic fixture is
 *                `finished === true`).
 *
 * @param {{
 *   eventSnapshot?: { id?: number, finished?: boolean, deadline_time?: string | null } | null,
 *   gwFixtures?: object[] | null,
 *   liveFixtureCount?: number | null,
 *   minute?: number | null,
 *   now?: Date,
 * }} input
 * @returns {{
 *   kind: 'pre' | 'live' | 'ft',
 *   chipLabel: string,
 *   meta: string | null,
 *   progress: string | null,
 * }}
 */
export function liveGroupStatus({
  eventSnapshot,
  gwFixtures,
  liveFixtureCount,
  minute,
  now = new Date(),
} = {}) {
  const gwNum = Number(eventSnapshot?.id);
  const gwLabel = Number.isFinite(gwNum) ? `GW ${gwNum}` : 'GW';

  const fixtures = Array.isArray(gwFixtures) ? gwFixtures : [];
  const finishedFixtures = fixtures.filter(
    (f) => f && (f.finished === true || f.finished_provisional === true),
  );
  const totalFixtures = fixtures.length;
  const allFinished =
    Boolean(eventSnapshot?.finished) ||
    (totalFixtures > 0 && finishedFixtures.length === totalFixtures);

  const deadlineIso = eventSnapshot?.deadline_time;
  const deadlinePassed = (() => {
    if (!deadlineIso) return false;
    const t = new Date(deadlineIso).getTime();
    if (Number.isNaN(t)) return false;
    return t <= now.getTime();
  })();

  if (allFinished) {
    return {
      kind: 'ft',
      chipLabel: `Final · ${gwLabel}`,
      meta: 'Gameweek complete',
      progress: null,
    };
  }

  const hasLive = Number(liveFixtureCount) > 0;
  const someStarted = fixtures.some((f) => f && f.started === true);

  if (deadlinePassed || hasLive || someStarted) {
    const liveN = Number(liveFixtureCount);
    const liveMin = Number(minute);
    let meta = null;
    if (Number.isFinite(liveN) && liveN > 0) {
      if (Number.isFinite(liveMin) && liveMin > 0) {
        meta = `${liveN} ${liveN === 1 ? 'fixture' : 'fixtures'} live · ${liveMin}′`;
      } else {
        meta = `${liveN} ${liveN === 1 ? 'fixture' : 'fixtures'} live`;
      }
    }
    let progress = null;
    if (totalFixtures > 0) {
      progress = `${finishedFixtures.length} of ${totalFixtures} fixtures complete`;
    }
    return {
      kind: 'live',
      chipLabel: `Live · ${gwLabel}`,
      meta,
      progress,
    };
  }

  return {
    kind: 'pre',
    chipLabel: `${gwLabel} · Upcoming`,
    meta: deadlineIso ? `Kicks off ${formatKickoffLabel(deadlineIso, now) ?? '—'}` : null,
    progress: null,
  };
}

/**
 * Sort a squad's effective starting XI / bench rows by **points contributed
 * this gameweek** (descending). Stable tiebreakers: minutes desc, then the
 * original pickPosition ascending so equal rows stay deterministic across
 * polls.
 *
 * @template T
 * @param {T[]} rows
 * @returns {T[]}
 */
export function rowsByPointsContributed(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return [...rows].sort((a, b) => {
    const pa = Number(a?.total_points) || 0;
    const pb = Number(b?.total_points) || 0;
    if (pb !== pa) return pb - pa;
    const ma = Number(a?.minutes) || 0;
    const mb = Number(b?.minutes) || 0;
    if (mb !== ma) return mb - ma;
    return (Number(a?.pickPosition) || 0) - (Number(b?.pickPosition) || 0);
  });
}

/**
 * Compact "N/M done" progress label for the expanded-fixture sticky header.
 *
 * Reads the same finished/finished-provisional flags as `liveGroupStatus`
 * but renders a short slash-separated string the table-style header uses
 * (the long form "N of M fixtures complete" would wrap on mobile).
 *
 * Returns null when there are no fixtures (blank week / data not yet
 * loaded) so the caller can omit the label entirely.
 *
 * @param {object[] | null | undefined} gwFixtures
 * @returns {{ done: number, total: number, label: string } | null}
 */
export function liveGwProgress(gwFixtures) {
  if (!Array.isArray(gwFixtures) || gwFixtures.length === 0) return null;
  const total = gwFixtures.length;
  let done = 0;
  for (const f of gwFixtures) {
    if (f && (f.finished === true || f.finished_provisional === true)) {
      done += 1;
    }
  }
  return { done, total, label: `${done}/${total} done` };
}

/**
 * Tone bucket for the minute cell in the expanded-fixture table.
 *
 * Mirrors the `minTone` helper from the OPTION 2 table mockup. The tints
 * are applied via classes `.live-xp__cell--min-{none,low,partial,good,full}`
 * — full (≥89), good (≥60), partial (≥30), low (>0), none (0 or DNP).
 *
 * @param {number | null | undefined} minutes
 * @param {boolean} [played] — gates rendering; pass false to force `'none'`
 * @returns {'none' | 'low' | 'partial' | 'good' | 'full'}
 */
export function minutesTone(minutes, played = true) {
  if (!played) return 'none';
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return 'none';
  if (m >= 89) return 'full';
  if (m >= 60) return 'good';
  if (m >= 30) return 'partial';
  return 'low';
}

/**
 * Tiny initials helper for the team-crest fallback used in the compressed
 * face-off row. Two-letter (first letter of first two words) or first two
 * letters of a single-word name.
 *
 * @param {string | null | undefined} name
 * @returns {string}
 */
export function teamInitials(name) {
  const s = String(name ?? '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}
