import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TeamAvatar } from './TeamAvatar';
import {
  buildLatestDropByElementOut,
  buildOwnerByElementId,
  buildTrackedElementIdSetWithFixtures,
  compareContributionEventsDesc,
  diffContributionEvents,
} from './playerContributionEvents';
import {
  mergePersistPlayerContributions,
  playerContributionStorageKey,
  readPlayerContributionBucket,
} from './playerContributionStorage';
import { fetchFotmobContributionTimeline } from './fotmobPremTimeline';
import { fplShirtImageUrl } from './fplShirtUrl';

function badgeUrl(teamCode) {
  if (teamCode == null) return null;
  return `https://resources.premierleague.com/premierleague/badges/50/t${teamCode}.png`;
}

function displayPlayerName(el, elementId) {
  if (!el) return `Player #${elementId}`;
  const known = el.known_name?.trim();
  if (known) return known;
  const parts = [el.first_name, el.second_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return el.web_name ?? `Player #${elementId}`;
}

/** FPL-style short label (`web_name`) — better on narrow screens. */
function displayPlayerNameShort(el, elementId) {
  if (!el) return `Player #${elementId}`;
  const w = el.web_name?.trim();
  if (w) return w;
  return displayPlayerName(el, elementId);
}

function pointsPerGoal(scoring, elementTypeId) {
  const et = Number(elementTypeId);
  if (!scoring) {
    if (et === 1) return 10;
    if (et === 2) return 6;
    if (et === 3) return 5;
    if (et === 4) return 4;
    return 4;
  }
  if (et === 1) return Number(scoring.goals_scored_GKP) || 10;
  if (et === 2) return Number(scoring.goals_scored_DEF) || 6;
  if (et === 3) return Number(scoring.goals_scored_MID) || 5;
  if (et === 4) return Number(scoring.goals_scored_FWD) || 4;
  return 4;
}

/** e.g. (+3) or (-1) */
function pointsBracket(signedTotal) {
  if (!Number.isFinite(signedTotal) || signedTotal === 0) return '';
  if (signedTotal > 0) return ` (+${signedTotal})`;
  return ` (${signedTotal})`;
}

/**
 * @param {string} kind
 * @param {number} delta — count for goals/assists/cards; fantasy pts for dc_points / save_points
 * @param {number | null | undefined} elementTypeId
 * @param {object | null | undefined} scoring — draft `settings.scoring`
 * @returns {{ emoji: string, text: string }}
 */
function contributionActionParts(kind, delta, elementTypeId, scoring) {
  const d = Number(delta) || 0;
  const assistPts = Number(scoring?.assists) || 3;
  const yellowPts = Number(scoring?.yellow_cards) || -1;
  const redPts = Number(scoring?.red_cards) || -3;

  if (kind === 'goal') {
    const label = d === 1 ? 'GOAL' : `${d} GOALS`;
    const pts = d * pointsPerGoal(scoring, elementTypeId);
    return { emoji: '⚽', text: `${label}${pointsBracket(pts)}` };
  }
  if (kind === 'assist') {
    const label = d === 1 ? 'ASSIST' : `${d} ASSISTS`;
    return { emoji: '🍑', text: `${label}${pointsBracket(d * assistPts)}` };
  }
  if (kind === 'dc_points') {
    return { emoji: '🥊', text: `DC${pointsBracket(d)}` };
  }
  if (kind === 'save_points') {
    const label = d === 1 ? 'SAVES' : `SAVES ×${d}`;
    return { emoji: '🧤', text: `${label}${pointsBracket(d)}` };
  }
  if (kind === 'yellow_card') {
    const label = d === 1 ? 'YELLOW' : `${d} YELLOWS`;
    return { emoji: '🟨', text: `${label}${pointsBracket(d * yellowPts)}` };
  }
  if (kind === 'red_card') {
    const label = d === 1 ? 'RED CARD' : `${d} RED CARDS`;
    return { emoji: '🟥', text: `${label}${pointsBracket(d * redPts)}` };
  }
  return { emoji: '', text: String(kind).toUpperCase() };
}

/** FPL kit image; falls back to club badge on error / missing shirt. */
function ShirtThumb({ shirtUrl: su, badgeUrl: bu, teamShort }) {
  const src = su || bu;
  if (!src) {
    return (
      <span className="player-contrib-row__shirt-fallback" title={teamShort}>
        {teamShort?.slice(0, 3) ?? '?'}
      </span>
    );
  }
  return (
    <img
      className="player-contrib-row__shirt-img"
      src={src}
      alt=""
      loading="lazy"
      onError={(e) => {
        const img = e.currentTarget;
        if (su && bu && img.src.includes(String(su))) {
          img.src = bu;
        }
      }}
    />
  );
}

/** First word of fantasy team name on rostered players; fixed label for waivers. */
function fantasyOwnerMobileShort(ownerLeagueEntryId, ownerTeamName, ownerLine) {
  if (ownerLeagueEntryId != null) {
    const raw = String(ownerTeamName || ownerLine || '').trim();
    if (!raw) return '—';
    const first = raw.split(/\s+/)[0];
    return first || raw;
  }
  return 'Waiver';
}

function mergeUniqueByStableId(preferFirstLists) {
  const m = new Map();
  for (const list of preferFirstLists) {
    for (const ev of list || []) {
      const sid = ev?.stableId;
      if (!sid || m.has(sid)) continue;
      m.set(sid, ev);
    }
  }
  return [...m.values()].sort(compareContributionEventsDesc);
}

async function fetchArchiveEventsForGw(gameweek) {
  try {
    const base = import.meta.env.BASE_URL || '/';
    const url = new URL('league-data/player-contributions-gw.json', base).href;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    const gk = String(gameweek);
    const bucket = j?.byGw?.[gk] ?? j?.byGw?.[gameweek];
    return Array.isArray(bucket?.events) ? bucket.events : [];
  } catch {
    return [];
  }
}

/**
 * @param {{
 *   leagueId: number | null | undefined,
 *   gameweek: number,
 *   squads: object[],
 *   contributionLiveContext: object | null,
 *   waiverOutGwRows: object[],
 *   lastUpdated: string | null,
 *   teamLogoMap?: object,
 *   kitIndexByEntry?: object,
 * }} props
 */
export function PlayerContributions({
  leagueId,
  gameweek,
  squads,
  contributionLiveContext,
  waiverOutGwRows,
  lastUpdated,
  teamLogoMap = {},
  kitIndexByEntry = {},
}) {
  const [displayed, setDisplayed] = useState([]);
  /** When true, goals / assists / cards come from FotMob timeline (ordered); FPL diff skips those kinds. */
  const [fotmobTimelineActive, setFotmobTimelineActive] = useState(false);
  /** '' = all fantasy teams; otherwise `leagueEntryId` of owning squad. */
  const [fantasyTeamEntryId, setFantasyTeamEntryId] = useState('');
  /** When both false, every contribution kind is shown. When either true, only those kinds (union). */
  const [filterGoal, setFilterGoal] = useState(false);
  const [filterAssist, setFilterAssist] = useState(false);
  const [filterDc, setFilterDc] = useState(false);
  const prevLiveRef = useRef(null);
  const hydratedKeyRef = useRef('');
  const listScrollRef = useRef(null);
  const prevDisplayedLenRef = useRef(0);

  const storageKey = useMemo(
    () => playerContributionStorageKey(leagueId, gameweek),
    [leagueId, gameweek]
  );

  const ownerByEl = useMemo(() => buildOwnerByElementId(squads), [squads]);
  const dropByEl = useMemo(
    () => buildLatestDropByElementOut(waiverOutGwRows),
    [waiverOutGwRows]
  );

  const tracked = useMemo(
    () =>
      buildTrackedElementIdSetWithFixtures(
        squads,
        waiverOutGwRows,
        contributionLiveContext?.elementById ?? {},
        contributionLiveContext?.gwTeamIds ?? []
      ),
    [
      squads,
      waiverOutGwRows,
      contributionLiveContext?.elementById,
      contributionLiveContext?.gwTeamIds,
    ]
  );

  const hydrate = useCallback(async () => {
    const k = `${leagueId ?? 'x'}:${gameweek}`;
    hydratedKeyRef.current = k;
    const [arch, bucket] = await Promise.all([
      fetchArchiveEventsForGw(gameweek),
      Promise.resolve(readPlayerContributionBucket(storageKey)),
    ]);
    const local = bucket?.events ?? [];
    const merged = mergeUniqueByStableId([local, arch]);
    if (hydratedKeyRef.current === k) setDisplayed(merged);
  }, [leagueId, gameweek, storageKey]);

  useEffect(() => {
    prevLiveRef.current = null;
    prevDisplayedLenRef.current = 0;
    setFotmobTimelineActive(false);
    setFantasyTeamEntryId('');
    setFilterGoal(false);
    setFilterAssist(false);
    setFilterDc(false);
  }, [gameweek, leagueId]);

  const fantasyTeamOptions = useMemo(() => {
    const out = [];
    for (const q of squads || []) {
      if (q?.error) continue;
      const id = q.leagueEntryId;
      if (id == null || !Number.isFinite(Number(id))) continue;
      const name = String(q.teamName ?? '').trim() || `Team ${id}`;
      out.push({ id: Number(id), name });
    }
    out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return out;
  }, [squads]);

  const fotmobFetchKey = useMemo(() => {
    const fx = contributionLiveContext?.gwFixtures || [];
    const ids = fx
      .map((f) => Number(f.id))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    return `${gameweek}|${ids.join(',')}`;
  }, [gameweek, contributionLiveContext?.gwFixtures]);

  const trackedKey = useMemo(
    () =>
      [...tracked]
        .filter((n) => Number.isFinite(Number(n)))
        .sort((a, b) => a - b)
        .join(','),
    [tracked]
  );

  const contribCtxRef = useRef(contributionLiveContext);
  contribCtxRef.current = contributionLiveContext;

  useEffect(() => {
    const ctx = contribCtxRef.current;
    if (!ctx?.gwFixtures?.length || !ctx?.elementById || !ctx?.teamById) return;
    let cancelled = false;
    void (async () => {
      try {
        const liveCtx = contribCtxRef.current;
        if (!liveCtx?.gwFixtures?.length) return;
        const ev = await fetchFotmobContributionTimeline({
          gameweek,
          gwFixtures: liveCtx.gwFixtures,
          elementById: liveCtx.elementById,
          teamById: liveCtx.teamById,
          trackedElementIds: tracked,
        });
        if (cancelled) return;
        if (ev.length) {
          setFotmobTimelineActive(true);
          setDisplayed((prev) => {
            const keep = prev.filter(
              (e) =>
                e.kind === 'dc_points' ||
                e.kind === 'save_points' ||
                String(e.stableId || '').startsWith('fotmob:')
            );
            return mergeUniqueByStableId([ev, keep]);
          });
          const bucket = readPlayerContributionBucket(storageKey);
          mergePersistPlayerContributions(storageKey, bucket?.events ?? [], ev, 2000);
        } else {
          setFotmobTimelineActive(false);
        }
      } catch {
        if (!cancelled) setFotmobTimelineActive(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fotmobFetchKey, gameweek, storageKey, trackedKey]);

  const fplOmitCardGoalKinds = useMemo(() => {
    if (!fotmobTimelineActive) return null;
    return new Set(['goal', 'assist', 'yellow_card', 'red_card']);
  }, [fotmobTimelineActive]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      await hydrate();
    });
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  useEffect(() => {
    if (!lastUpdated || !contributionLiveContext?.liveFullByElementId) return;
    const ctx = contributionLiveContext;
    const next = ctx.liveFullByElementId;
    const nowIso = new Date().toISOString();
    const newEvents = diffContributionEvents({
      prevLiveByElementId: prevLiveRef.current,
      nextLiveByElementId: next,
      elementById: ctx.elementById || {},
      trackedElementIds: tracked,
      gameweek,
      nowIso,
      gwFixtures: ctx.gwFixtures || [],
      omitKinds: fplOmitCardGoalKinds,
    });
    prevLiveRef.current = next;

    if (!newEvents.length) return;

    setDisplayed((prev) => {
      const sortedIncoming = [...newEvents].sort(compareContributionEventsDesc);
      return mergeUniqueByStableId([sortedIncoming, prev]);
    });

    const bucket = readPlayerContributionBucket(storageKey);
    mergePersistPlayerContributions(
      storageKey,
      bucket?.events ?? [],
      newEvents,
      2000
    );
  }, [
    lastUpdated,
    contributionLiveContext,
    gameweek,
    tracked,
    storageKey,
    fplOmitCardGoalKinds,
  ]);

  /** Newest first (`displayed` sort order). */
  const rows = useMemo(() => {
    const teamById = contributionLiveContext?.teamById || {};
    return displayed.map((ev) => {
      const el = contributionLiveContext?.elementById?.[ev.elementId];
      const elementTypeId = el?.element_type;
      const tid = el?.team != null ? Number(el.team) : null;
      const tm = tid != null ? teamById[tid] : null;
      const own = ownerByEl.get(ev.elementId);
      const drop = dropByEl.get(ev.elementId);
      let ownerLine = own?.teamName ?? null;
      if (!ownerLine) {
        ownerLine = drop
          ? `Waivers · dropped by ${drop.teamName} (GW ${drop.gameweek})`
          : 'Waivers / free agents';
      }
      const ap = contributionActionParts(
        ev.kind,
        ev.delta,
        elementTypeId,
        contributionLiveContext?.draftScoring
      );
      const fullName = displayPlayerName(el, ev.elementId);
      const shortName = displayPlayerNameShort(el, ev.elementId);
      return {
        ...ev,
        /** Short label (`web_name` when present) — shown on narrow viewports. */
        playerLabel: shortName,
        /** `displayPlayerName` — shown on wider viewports. */
        playerLabelFull: fullName,
        shirtUrl: fplShirtImageUrl(tm?.code, elementTypeId),
        badgeUrl: badgeUrl(tm?.code),
        teamShort: tm?.short_name ?? '—',
        ownerLine,
        ownerLineMobileShort: fantasyOwnerMobileShort(
          own?.leagueEntryId ?? null,
          own?.teamName ?? null,
          ownerLine
        ),
        ownerTeamName: own?.teamName ?? null,
        ownerLeagueEntryId: own?.leagueEntryId ?? null,
        actionEmoji: ap.emoji,
        actionText: ap.text,
      };
    });
  }, [displayed, contributionLiveContext, ownerByEl, dropByEl]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (fantasyTeamEntryId !== '') {
      const want = Number(fantasyTeamEntryId);
      out = out.filter((r) => Number(r.ownerLeagueEntryId) === want);
    }
    const restrictKinds = filterGoal || filterAssist || filterDc;
    if (restrictKinds) {
      out = out.filter((r) => {
        if (filterGoal && r.kind === 'goal') return true;
        if (filterAssist && r.kind === 'assist') return true;
        if (filterDc && r.kind === 'dc_points') return true;
        return false;
      });
    }
    return out;
  }, [rows, fantasyTeamEntryId, filterGoal, filterAssist, filterDc]);

  const kindFiltersAll = !filterGoal && !filterAssist && !filterDc;

  const clearKindFilters = useCallback(() => {
    setFilterGoal(false);
    setFilterAssist(false);
    setFilterDc(false);
  }, []);

  const toggleFilterGoal = useCallback(() => {
    setFilterGoal((g) => !g);
  }, []);

  const toggleFilterAssist = useCallback(() => {
    setFilterAssist((a) => !a);
  }, []);

  const toggleFilterDc = useCallback(() => {
    setFilterDc((d) => !d);
  }, []);

  useLayoutEffect(() => {
    const el = listScrollRef.current;
    if (!el || !filteredRows.length) return;
    if (filteredRows.length > prevDisplayedLenRef.current) {
      el.scrollTop = 0;
    }
    prevDisplayedLenRef.current = filteredRows.length;
  }, [filteredRows]);

  const toolbar = (
    <div className="player-contrib-section-head">
      <h2 id="player-contrib-heading" className="tile-title tile-title--sm">
        Player contributions
      </h2>
      <div className="player-contrib-toolbar">
        <div
          className="player-contrib-kind-filters"
          role="group"
          aria-label="Filter by event type"
        >
          <button
            type="button"
            className="player-contrib-kind-btn player-contrib-kind-btn--goal"
            aria-pressed={filterGoal}
            onClick={toggleFilterGoal}
          >
            Goal
          </button>
          <button
            type="button"
            className="player-contrib-kind-btn player-contrib-kind-btn--assist"
            aria-pressed={filterAssist}
            onClick={toggleFilterAssist}
          >
            Assist
          </button>
          <button
            type="button"
            className="player-contrib-kind-btn player-contrib-kind-btn--dc"
            aria-pressed={filterDc}
            onClick={toggleFilterDc}
          >
            DC
          </button>
          <button
            type="button"
            className="player-contrib-kind-btn player-contrib-kind-btn--all"
            aria-pressed={kindFiltersAll}
            onClick={clearKindFilters}
          >
            All
          </button>
        </div>
        <select
          className="player-contrib-team-select"
          value={fantasyTeamEntryId}
          onChange={(e) => setFantasyTeamEntryId(e.target.value)}
          aria-label="Filter by fantasy team"
        >
          <option value="">All teams</option>
          {fantasyTeamOptions.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  if (!rows.length) {
    return (
      <>
        {toolbar}
        <p className="muted muted--tight player-contrib-empty">
          Contribution events appear here during the live gameweek when goals, assists,
          defensive-contribution points, save points, or yellow or red cards change after each
          refresh (auto every 90s for the current GW). Goals, assists, and cards are ordered from
          FotMob match timelines when available (same proxy as FPL); defensive-contribution and save
          points still come from FPL live. Events include every player whose club has a PL fixture
          this GW, not only fantasy rosters. Open this tab during matches to build history in this
          browser; optional{' '}
          <span className="player-contrib-code">player-contributions-gw.json</span> merges shared
          snapshots.
        </p>
      </>
    );
  }

  return (
    <>
      {toolbar}
      {!filteredRows.length ? (
        <div className="player-contrib-broadcast">
          <p className="muted muted--tight player-contrib-empty player-contrib-empty--filters">
            No contributions match these filters. Try another team or turn on more event types.
          </p>
        </div>
      ) : (
    <div className="player-contrib-broadcast">
      <div
        ref={listScrollRef}
        className="player-contrib-feed"
        role="list"
        aria-label="Player fantasy scoring contributions"
      >
        {filteredRows.map((r) => (
          <div key={r.stableId} className="player-contrib-row" role="listitem">
            <div
              className={`player-contrib-row__action player-contrib-row__action--${(r.kind && String(r.kind).replace(/[^a-z0-9_-]/gi, '')) || 'other'}`}
            >
              {r.actionEmoji ? (
                <span className="player-contrib-row__action-emoji" aria-hidden>
                  {r.actionEmoji}
                </span>
              ) : null}
              <span className="player-contrib-row__action-text">{r.actionText}</span>
            </div>
            <div className="player-contrib-row__mid">
              <div className="player-contrib-row__player-stack">
                <span className="player-contrib-row__player-sr">{r.playerLabelFull}</span>
                <span
                  className="player-contrib-row__player player-contrib-row__player--desktop"
                  aria-hidden="true"
                >
                  {r.playerLabelFull}
                </span>
                <span
                  className="player-contrib-row__player player-contrib-row__player--mobile"
                  aria-hidden="true"
                  title={
                    r.playerLabelFull !== r.playerLabel ? r.playerLabelFull : undefined
                  }
                >
                  {r.playerLabel}
                </span>
              </div>
              <div className="player-contrib-row__shirt-cell">
                <ShirtThumb
                  shirtUrl={r.shirtUrl}
                  badgeUrl={r.badgeUrl}
                  teamShort={r.teamShort}
                />
              </div>
            </div>
            <div className="player-contrib-row__owner-wrap" title={r.ownerLine}>
              <span className="player-contrib-row__owner-sr">{r.ownerLine}</span>
              <span
                className="player-contrib-row__owner player-contrib-row__owner--full"
                aria-hidden="true"
              >
                {r.ownerLine}
              </span>
              <span
                className="player-contrib-row__owner player-contrib-row__owner--mcompact"
                aria-hidden="true"
              >
                {r.ownerLineMobileShort}
              </span>
              {r.ownerLeagueEntryId != null ? (
                <TeamAvatar
                  entryId={r.ownerLeagueEntryId}
                  name={r.ownerTeamName ?? r.ownerLine}
                  size="sm"
                  logoMap={teamLogoMap}
                  kitIndexByEntry={kitIndexByEntry}
                />
              ) : (
                <span className="player-contrib-row__owner-logo-fallback" aria-hidden>
                  —
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
      )}
    </>
  );
}
