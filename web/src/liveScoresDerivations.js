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
 * Whether a given FPL position is eligible to score clean-sheet points:
 *
 *   - `'GK'` / `'GKP'`  → +4 CS points
 *   - `'DEF'`           → +4 CS points
 *   - `'MID'`           → +1 CS point
 *   - `'FWD'`           → 0 (never eligible)
 *
 * Used to gate the yellow "clean sheet locked in" status dot — it must
 * never render on a FWD even when their club has a clean sheet, because
 * the FWD scores 0 from it (misleading badge). Pure helper — no side
 * effects; safe to call on undefined / null / unexpected strings (those
 * fall through to `false`).
 *
 * @param {string | null | undefined} pos — singular position label
 *   (`'GK'` / `'GKP'` / `'DEF'` / `'MID'` / `'FWD'`); case-insensitive
 * @returns {boolean}
 */
export function isCleanSheetEligible(pos) {
  const p = String(pos ?? '').toUpperCase();
  return p === 'GK' || p === 'GKP' || p === 'DEF' || p === 'MID';
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
 * Position priority for the Starting XI sort: GK → DEF → MID → FWD.
 * Unknown / missing positions sort to the tail so they don't break the
 * spine of the table.
 */
const STARTING_XI_POSITION_RANK = {
  GK: 0,
  GKP: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
};

/**
 * Sort a squad's effective STARTING XI by FPL position
 * (GK → DEF → MID → FWD), with a points-contributed-descending secondary
 * sort within each position group (so the "best player at this position"
 * lands at the top of its group). Final tiebreak: original pickPosition
 * ascending so equal rows stay deterministic across polls.
 *
 * The bench is intentionally NOT sorted by this helper — bench order is
 * already meaningful (1st sub, 2nd sub, …) and should be preserved by
 * the caller via `pickPosition`.
 *
 * Position field read: `posSingular` (mirror of FPL bootstrap
 * `element_types[*].singular_name_short` — `'GKP'` / `'DEF'` / `'MID'` /
 * `'FWD'`). Case-insensitive; unknown labels sort to the tail.
 *
 * @template T
 * @param {T[]} players
 * @returns {T[]}
 */
export function sortStartingXIByPosition(players) {
  if (!Array.isArray(players) || players.length === 0) return [];
  const rankOf = (row) => {
    const p = String(row?.posSingular ?? '').toUpperCase();
    const r = STARTING_XI_POSITION_RANK[p];
    return Number.isFinite(r) ? r : 99;
  };
  return [...players].sort((a, b) => {
    const ra = rankOf(a);
    const rb = rankOf(b);
    if (ra !== rb) return ra - rb;
    const pa = Number(a?.total_points) || 0;
    const pb = Number(b?.total_points) || 0;
    if (pb !== pa) return pb - pa;
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
 * Per-gameweek H2H form entry used by the Live Table form dots column.
 *
 * - `gw` is the gameweek number the dot represents (e.g. 33, 34, 35, 36, 37
 *   for the rightmost-is-current ordering).
 * - `result` is the manager's W/D/L for that GW from the H2H scoring rule
 *   (higher FPL points = win, equal = draw, lower = loss). `null` means
 *   there's no data — typically because the manager had no scheduled match
 *   in that GW (bye, or the schedule didn't include them yet) or the GW
 *   isn't finished and no live points are available to compare against.
 * - `isLive` is `true` for the in-flight current-GW dot whose result is
 *   derived from live FPL points (not the finalized `matches[].finished`
 *   payload). The renderer overlays a pulsing animation on this dot so
 *   the viewer can tell it's still in flight while keeping the W/D/L
 *   colour visible.
 *
 * @typedef {{ gw: number, result: 'W' | 'D' | 'L' | null, isLive: boolean }} ManagerFormEntry
 */

/**
 * H2H W/D/L for one manager from a pair of FPL totals.
 *
 * Returns `null` when either side is missing or non-numeric so callers can
 * render a muted ring instead of guessing a result.
 *
 * @param {number | null | undefined} mine
 * @param {number | null | undefined} opp
 * @returns {'W' | 'D' | 'L' | null}
 */
function h2hResult(mine, opp) {
  if (mine == null || opp == null) return null;
  const m = Number(mine);
  const o = Number(opp);
  if (!Number.isFinite(m) || !Number.isFinite(o)) return null;
  if (m > o) return 'W';
  if (m < o) return 'L';
  return 'D';
}

/**
 * Compute the 5-dot form (last 4 finished GWs + current live GW) for one
 * manager in the Live Table form column.
 *
 * Returns an array of {@link ManagerFormEntry} sorted oldest → newest, so
 * callers can render left-to-right and the in-flight live dot lands at the
 * rightmost position. Length is always equal to `count` (default 5) so the
 * column width is stable across rows — when a manager has fewer than
 * `count - 1` finished GWs we left-pad with `result: null` entries (gw
 * numbers are still set when known).
 *
 * Finished history (the first `count - 1` slots) comes from `matches`:
 * entries with `event < gameweek` and `finished === true` involving the
 * manager. The most recent `count - 1` are kept; remaining gaps are filled
 * with null-result entries for the missing GW numbers (or just synthetic
 * placeholder GW numbers if there aren't enough). The last slot is the
 * current GW from `liveMyPts` / `liveOppPts`. When `currentGwFinished` is
 * true the live dot still renders but with `isLive: false` (the FT result
 * is finalized, no pulse needed).
 *
 * @param {{
 *   leagueEntryId: number | string | null,
 *   matches: object[] | null | undefined,
 *   gameweek: number,
 *   liveMyPts?: number | null,
 *   liveOppPts?: number | null,
 *   currentGwFinished?: boolean,
 *   count?: number,
 * }} input
 * @returns {ManagerFormEntry[]}
 */
export function computeManagerForm({
  leagueEntryId,
  matches,
  gameweek,
  liveMyPts = null,
  liveOppPts = null,
  currentGwFinished = false,
  count = 5,
} = {}) {
  const id = Number(leagueEntryId);
  const gwNum = Number(gameweek);
  const slots = Math.max(1, Math.floor(Number(count) || 5));
  const historySlots = slots - 1;

  /** Build per-GW W/D/L history from finished matches involving this manager. */
  const byGw = new Map();
  if (Array.isArray(matches) && Number.isFinite(id)) {
    for (const m of matches) {
      if (!m || m.finished !== true) continue;
      const ev = Number(m.event);
      if (!Number.isFinite(ev) || ev >= gwNum) continue;
      const e1 = Number(m.league_entry_1);
      const e2 = Number(m.league_entry_2);
      let mine;
      let opp;
      if (e1 === id) {
        mine = Number(m.league_entry_1_points);
        opp = Number(m.league_entry_2_points);
      } else if (e2 === id) {
        mine = Number(m.league_entry_2_points);
        opp = Number(m.league_entry_1_points);
      } else {
        continue;
      }
      const result = h2hResult(mine, opp);
      byGw.set(ev, result);
    }
  }

  /** Take the most-recent `historySlots` finished GWs, oldest → newest. */
  const finishedGws = [...byGw.keys()].sort((a, b) => a - b);
  const tail = finishedGws.slice(-historySlots);
  const history = tail.map((gw) => ({ gw, result: byGw.get(gw) ?? null, isLive: false }));

  /** Left-pad with null-result entries when we have fewer finished GWs than slots. */
  const pad = historySlots - history.length;
  const padded = [];
  for (let i = 0; i < pad; i++) {
    /** Best-guess GW numbers for the empty padding so tooltips stay sane. */
    const guess = Number.isFinite(gwNum) ? gwNum - (historySlots - i) : 0;
    padded.push({ gw: guess > 0 ? guess : 0, result: null, isLive: false });
  }

  /** 5th dot: live (or finalized) current-GW result. */
  const liveResult = h2hResult(liveMyPts, liveOppPts);
  const liveEntry = {
    gw: Number.isFinite(gwNum) ? gwNum : 0,
    result: liveResult,
    isLive: !currentGwFinished,
  };

  return [...padded, ...history, liveEntry];
}

/**
 * Live FPL points margin for one manager — `liveMyPts - liveOppPts`.
 *
 * Used by the mobile "+For" indicator on the Live Table. Returns `null`
 * when either side is missing so callers can render nothing rather than
 * a misleading `0` (no fixture / pre-kickoff state).
 *
 * @param {number | null | undefined} liveMyPts
 * @param {number | null | undefined} liveOppPts
 * @returns {number | null}
 */
export function liveMatchupMargin(liveMyPts, liveOppPts) {
  if (liveMyPts == null || liveOppPts == null) return null;
  const m = Number(liveMyPts);
  const o = Number(liveOppPts);
  if (!Number.isFinite(m) || !Number.isFinite(o)) return null;
  return m - o;
}

/**
 * Format a live matchup margin as a signed string. Positive margins get
 * a `+` prefix; negative margins keep their `-` sign; zero renders as
 * `"0"`. Null returns `null` so callers can omit the chip entirely.
 *
 * @param {number | null | undefined} margin
 * @returns {string | null}
 */
export function formatLiveMatchupMargin(margin) {
  if (margin == null || !Number.isFinite(Number(margin))) return null;
  const n = Number(margin);
  if (n > 0) return `+${n}`;
  return String(n);
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
