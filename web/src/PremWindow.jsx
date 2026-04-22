import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLiveScores } from './useLiveScores';
import { TeamAvatar } from './TeamAvatar';
import { fetchEspnPremWindow } from './espnPremWindow.js';
import { buildOwnerByElementId } from './playerContributionEvents.js';

/** PL badge URL by FPL team `code` (same source as LiveScores). */
function plBadgeUrl(code) {
  if (code == null) return null;
  return `https://resources.premierleague.com/premierleague/badges/50/t${code}.png`;
}

function formatKickoff(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Render a compact status label: FT / HT / live minute / kickoff time.
 * Prefers the live feed's `statusText`/`liveMinute` when available; falls back to FPL kickoff.
 */
function matchStatusText({ score, fplFixture }) {
  if (score?.finished) return score.statusText || 'FT';
  if (score?.started) {
    if (score.liveMinute) return score.liveMinute;
    return score.statusText || 'LIVE';
  }
  const iso = fplFixture?.kickoff_time || score?.kickoffIso;
  return iso ? formatKickoff(iso) : 'TBD';
}

const EVENT_META = {
  goal: { icon: '⚽', label: 'Goal', className: 'prem-ev--goal' },
  assist: { icon: '🅰', label: 'Assist', className: 'prem-ev--assist' },
  yellow_card: { icon: '🟨', label: 'Yellow', className: 'prem-ev--yellow' },
  red_card: { icon: '🟥', label: 'Red', className: 'prem-ev--red' },
};

/**
 * `{ element → { leagueEntryId, teamName, fplEntryId } }` — enriched version of
 * `buildOwnerByElementId` that also keeps `fplEntryId` (same shape we'd use for logos).
 */
function buildOwnerMap(squads) {
  const base = buildOwnerByElementId(squads);
  const out = new Map();
  const fplByLid = new Map();
  for (const q of squads || []) {
    if (q?.error) continue;
    const lid = Number(q.leagueEntryId);
    if (Number.isFinite(lid) && q.fplEntryId != null) {
      fplByLid.set(lid, Number(q.fplEntryId));
    }
  }
  for (const [k, v] of base.entries()) {
    out.set(k, { ...v, fplEntryId: fplByLid.get(v.leagueEntryId) ?? null });
  }
  return out;
}

function OwnerTag({ owner, teamLogoMap, kitIndexByEntry }) {
  if (!owner) return null;
  return (
    <span className="prem-owner-tag" title={owner.teamName}>
      <span className="prem-owner-tag__avatar">
        <TeamAvatar
          entryId={owner.leagueEntryId}
          name={owner.teamName}
          size="sm"
          logoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
        />
      </span>
      <span className="prem-owner-tag__name">{owner.teamName}</span>
    </span>
  );
}

function EventRow({ ev, ownerByEl, teamLogoMap, kitIndexByEntry }) {
  const meta = EVENT_META[ev.kind];
  if (!meta) return null;
  const owner = ev.elementId != null ? ownerByEl.get(ev.elementId) : null;
  const sideClass =
    ev.teamSide === 'home'
      ? 'prem-ev-row--home'
      : ev.teamSide === 'away'
        ? 'prem-ev-row--away'
        : '';
  return (
    <li className={`prem-ev-row ${meta.className} ${sideClass}`}>
      <span className="prem-ev-minute">{ev.minuteLabel}</span>
      <span className="prem-ev-icon" aria-hidden="true">{meta.icon}</span>
      <span className="prem-ev-player">
        <span className="prem-ev-name">{ev.playerName || '—'}</span>
        {ev.isPenalty ? <span className="prem-ev-tag">(pen)</span> : null}
        {ev.isOwnGoal ? <span className="prem-ev-tag">(OG)</span> : null}
      </span>
      {owner ? (
        <OwnerTag
          owner={owner}
          teamLogoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
        />
      ) : null}
    </li>
  );
}

function LineupPlayerRow({
  player,
  ownerByEl,
  teamLogoMap,
  kitIndexByEntry,
}) {
  const owner = player.elementId != null ? ownerByEl.get(player.elementId) : null;
  return (
    <li className="prem-lineup-row">
      <span className="prem-lineup-shirt tabular" aria-hidden="true">
        {player.shirt ?? '·'}
      </span>
      <span className="prem-lineup-core">
        <span className="prem-lineup-name">
          {player.name || `#${player.fotmobPlayerId ?? '?'}`}
        </span>
        {player.usualPosition ? (
          <span className="prem-lineup-pos">{player.usualPosition}</span>
        ) : null}
      </span>
      {owner ? (
        <span className="prem-lineup-owner">
          <OwnerTag
            owner={owner}
            teamLogoMap={teamLogoMap}
            kitIndexByEntry={kitIndexByEntry}
          />
        </span>
      ) : null}
    </li>
  );
}

function LineupColumn({
  title,
  side,
  ownerByEl,
  teamLogoMap,
  kitIndexByEntry,
}) {
  if (!side) {
    return (
      <div className="prem-lineup-col">
        <div className="prem-lineup-col__head">
          <span className="prem-lineup-col__title">{title}</span>
        </div>
        <p className="muted muted--tight">No lineup yet</p>
      </div>
    );
  }
  return (
    <div className="prem-lineup-col">
      <div className="prem-lineup-col__head">
        <span className="prem-lineup-col__title">{title}</span>
        {side.formation ? (
          <span className="prem-lineup-col__formation">{side.formation}</span>
        ) : null}
        {side.confirmed ? (
          <span className="prem-lineup-col__badge prem-lineup-col__badge--confirmed">
            Confirmed
          </span>
        ) : (
          <span className="prem-lineup-col__badge prem-lineup-col__badge--predicted">
            Predicted
          </span>
        )}
      </div>
      <ul className="prem-lineup-list" role="list">
        {side.xi.map((p, i) => (
          <LineupPlayerRow
            key={`xi-${p.fotmobPlayerId ?? i}`}
            player={p}
            ownerByEl={ownerByEl}
            teamLogoMap={teamLogoMap}
            kitIndexByEntry={kitIndexByEntry}
          />
        ))}
      </ul>
      {side.bench?.length ? (
        <>
          <div className="prem-lineup-col__bench-head">Bench</div>
          <ul className="prem-lineup-list prem-lineup-list--bench" role="list">
            {side.bench.map((p, i) => (
              <LineupPlayerRow
                key={`bench-${p.fotmobPlayerId ?? i}`}
                player={p}
                ownerByEl={ownerByEl}
                teamLogoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
            ))}
          </ul>
        </>
      ) : null}
      {side.coach ? (
        <div className="prem-lineup-col__coach muted muted--tight">
          Manager: {side.coach}
        </div>
      ) : null}
    </div>
  );
}

function FixtureCard({
  fx,
  teamById,
  ownerByEl,
  teamLogoMap,
  kitIndexByEntry,
  expanded,
  onToggle,
}) {
  const home = teamById[Number(fx.fplFixture?.team_h)];
  const away = teamById[Number(fx.fplFixture?.team_a)];
  const homeName = home?.name || 'Home';
  const awayName = away?.name || 'Away';
  const homeShort = home?.short_name || '—';
  const awayShort = away?.short_name || '—';

  const status = matchStatusText(fx);
  const showScore =
    fx.score &&
    (fx.score.started || fx.score.finished) &&
    Number.isFinite(Number(fx.score.homeScore));

  const canShowLineups =
    fx.lineups?.home?.confirmed === true && fx.lineups?.away?.confirmed === true;
  const hasEvents = (fx.events || []).length > 0;

  return (
    <section className="prem-fixture">
      <button
        type="button"
        className="prem-fixture__header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="prem-fixture__side prem-fixture__side--home">
          <span className="prem-fixture__team-name">{homeShort}</span>
          {plBadgeUrl(home?.code) ? (
            <img
              className="prem-fixture__badge"
              src={plBadgeUrl(home?.code)}
              alt={homeName}
              loading="lazy"
            />
          ) : null}
        </span>
        <span className="prem-fixture__score">
          {showScore ? (
            <>
              <span>{fx.score.homeScore}</span>
              <span className="prem-fixture__score-sep">–</span>
              <span>{fx.score.awayScore}</span>
            </>
          ) : (
            <span className="prem-fixture__vs">vs</span>
          )}
        </span>
        <span className="prem-fixture__side prem-fixture__side--away">
          {plBadgeUrl(away?.code) ? (
            <img
              className="prem-fixture__badge"
              src={plBadgeUrl(away?.code)}
              alt={awayName}
              loading="lazy"
            />
          ) : null}
          <span className="prem-fixture__team-name">{awayShort}</span>
        </span>
        <span className="prem-fixture__chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
        <span className="prem-fixture__status">{status}</span>
      </button>

      {expanded ? (
        <div className="prem-fixture__body">
          {fx.fetchError ? (
            <div className="data-banner data-banner--error" role="alert">
              Could not load ESPN match summary: {fx.fetchError}
            </div>
          ) : null}
          {!fx.matchId ? (
            <p className="muted muted--tight">
              No ESPN match mapped for this fixture yet.
            </p>
          ) : null}
          {fx.matchId && fx.detailsBlockedReason ? (
            <p className="muted muted--tight prem-fixture__notice">
              {fx.detailsBlockedReason}
            </p>
          ) : null}

          {hasEvents ? (
            <div className="prem-events">
              <h3 className="prem-events__title">Events</h3>
              <ul className="prem-events__list">
                {fx.events.map((ev, i) => (
                  <EventRow
                    key={`${ev.kind}-${ev.eventId ?? i}-${i}`}
                    ev={ev}
                    ownerByEl={ownerByEl}
                    teamLogoMap={teamLogoMap}
                    kitIndexByEntry={kitIndexByEntry}
                  />
                ))}
              </ul>
            </div>
          ) : fx.matchId && !fx.detailsBlockedReason ? (
            <p className="muted muted--tight">No events yet.</p>
          ) : null}

          {canShowLineups ? (
            <div className="prem-lineups">
              <h3 className="prem-lineups__title">Lineups</h3>
              <div className="prem-lineups__cols">
                <LineupColumn
                  title={homeName}
                  side={fx.lineups.home}
                  ownerByEl={ownerByEl}
                  teamLogoMap={teamLogoMap}
                  kitIndexByEntry={kitIndexByEntry}
                />
                <LineupColumn
                  title={awayName}
                  side={fx.lineups.away}
                  ownerByEl={ownerByEl}
                  teamLogoMap={teamLogoMap}
                  kitIndexByEntry={kitIndexByEntry}
                />
              </div>
            </div>
          ) : fx.matchId && !fx.detailsBlockedReason ? (
            <p className="muted muted--tight">
              Lineups not confirmed yet — they often fill in close to team news (~1 hour before
              kickoff).
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * @param {{
 *   teams: Array<{ id: number, teamName: string, fplEntryId: number | null }>,
 *   gameweek: number,
 *   onGameweekChange: (n: number) => void,
 *   onBootstrapLiveMeta?: (meta: { currentGw: number | null }) => void,
 *   teamLogoMap: object,
 *   kitIndexByEntry?: object,
 * }} props
 */
export function PremWindow({
  teams,
  gameweek,
  onGameweekChange,
  onBootstrapLiveMeta,
  teamLogoMap,
  kitIndexByEntry,
}) {
  const {
    loading: liveLoading,
    error: liveError,
    events,
    squads,
    contributionLiveContext,
    refresh: refreshLive,
  } = useLiveScores({
    teams,
    gameweek,
    enabled: true,
    onBootstrapLiveMeta,
    pollIntervalMs: 90_000,
  });

  const gwFixtures = contributionLiveContext?.gwFixtures ?? null;
  const teamById = contributionLiveContext?.teamById ?? null;
  const elementById = contributionLiveContext?.elementById ?? null;

  const [espnWindowLoading, setEspnWindowLoading] = useState(false);
  const [espnWindowError, setEspnWindowError] = useState(null);
  const [espnWindowRows, setEspnWindowRows] = useState(/** @type {any[]} */ ([]));
  /** Fetch-generation guard so a slow request for an older GW cannot overwrite the new one. */
  const espnWindowGenRef = useRef(0);

  const doEspnWindowFetch = useCallback(async () => {
    if (!gwFixtures || !teamById || !elementById) return;
    if (!gwFixtures.length) {
      setEspnWindowRows([]);
      setEspnWindowError(null);
      return;
    }
    espnWindowGenRef.current += 1;
    const gen = espnWindowGenRef.current;
    setEspnWindowLoading(true);
    setEspnWindowError(null);
    try {
      const rows = await fetchEspnPremWindow({ gwFixtures, teamById, elementById });
      if (gen !== espnWindowGenRef.current) return;
      setEspnWindowRows(rows);
    } catch (e) {
      if (gen !== espnWindowGenRef.current) return;
      setEspnWindowError(e?.message || String(e));
      setEspnWindowRows([]);
    } finally {
      if (gen === espnWindowGenRef.current) setEspnWindowLoading(false);
    }
  }, [gwFixtures, teamById, elementById]);

  useEffect(() => {
    void doEspnWindowFetch();
  }, [doEspnWindowFetch]);

  /** Sort fixtures by kickoff time ascending so the GW reads chronologically. */
  const sortedRows = useMemo(() => {
    const rows = [...(espnWindowRows || [])];
    rows.sort((a, b) => {
      const ka = Date.parse(a.fplFixture?.kickoff_time || '') || 0;
      const kb = Date.parse(b.fplFixture?.kickoff_time || '') || 0;
      return ka - kb;
    });
    return rows;
  }, [espnWindowRows]);

  const ownerByEl = useMemo(() => buildOwnerMap(squads), [squads]);

  const gwOptions = useMemo(() => {
    if (!Array.isArray(events) || !events.length) return [];
    return events
      .map((e) => ({
        id: Number(e.id),
        label: `GW ${e.id}`,
        finished: e.finished === true,
      }))
      .sort((a, b) => a.id - b.id);
  }, [events]);

  const [expanded, setExpanded] = useState(/** @type {Set<number>} */ (new Set()));
  const toggle = useCallback((matchKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(matchKey)) next.delete(matchKey);
      else next.add(matchKey);
      return next;
    });
  }, []);

  return (
    <div className="dashboard-stack prem-window-root">
      <section className="tile tile--compact" aria-labelledby="prem-window-heading">
        <h2 id="prem-window-heading" className="tile-title tile-title--sm">
          Live Teams
        </h2>
        <p className="muted muted--tight">
          Live from ESPN. Lineups and events update from the public match feed; full squads
          usually appear at team news roughly an hour before kickoff.
        </p>

        <div className="live-toolbar">
          <label className="live-gw-label">
            <select
              className="live-gw-select"
              aria-label="Gameweek"
              value={gameweek}
              onChange={(e) => onGameweekChange(Number(e.target.value))}
            >
              {gwOptions.length ? (
                gwOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                    {o.finished ? ' ✓' : ''}
                  </option>
                ))
              ) : (
                <option value={gameweek}>GW {gameweek}</option>
              )}
            </select>
          </label>
          <button
            type="button"
            className="live-refresh-btn"
            onClick={() => {
              void refreshLive();
              void doEspnWindowFetch();
            }}
            disabled={liveLoading || espnWindowLoading}
          >
            {liveLoading || espnWindowLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {liveError ? (
          <div className="data-banner data-banner--error" role="alert">
            <strong>Could not load live FPL context.</strong> {liveError}
          </div>
        ) : null}
        {espnWindowError ? (
          <div className="data-banner data-banner--error" role="alert">
            <strong>ESPN fetch failed.</strong> {espnWindowError}
          </div>
        ) : null}
      </section>

      {sortedRows.length === 0 && !espnWindowLoading ? (
        <section className="tile tile--compact">
          <p className="muted muted--tight">No fixtures for this gameweek.</p>
        </section>
      ) : null}

      <div className="prem-fixtures">
        {sortedRows.map((fx) => {
          const key = Number(fx.fplFixture?.id) || Math.random();
          return (
            <FixtureCard
              key={key}
              fx={fx}
              teamById={teamById || {}}
              ownerByEl={ownerByEl}
              teamLogoMap={teamLogoMap}
              kitIndexByEntry={kitIndexByEntry}
              expanded={expanded.has(key)}
              onToggle={() => toggle(key)}
            />
          );
        })}
      </div>
    </div>
  );
}
