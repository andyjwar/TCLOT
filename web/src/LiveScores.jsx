import {
  useMemo,
  useState,
  useCallback,
  useSyncExternalStore,
} from 'react';
import { TeamAvatar } from './TeamAvatar';
import { PlayerContributions } from './PlayerContributions';
import { useLiveScores } from './useLiveScores';
import { eventNameToGameWeekLabel, gameWeekSelectLabel } from './gwLabel.js';
import { GameWeekSelectOptgroups } from './GameWeekSelectOptgroups.jsx';
import { LiveRefreshIconButton } from './LiveRefreshIconButton.jsx';
import { usePlayerHistory, ClickablePlayerName } from './PlayerHistoryContext.jsx';
import { usePlayerDetailOverlayOptional } from './PlayerDetailOverlay.jsx';
import { heroDefeatEntryIds, villainVictoryEntryIds } from './gwRawPointsRankSeason.js';
import { DEFAULT_MODEL_CONFIG } from 'fpl-predictions';
import { fplApiBase, FPL_DIRECT } from './fplDraftUrl.js';
import { liveGwDisplayTotal } from './liveGwTotals.js';
import { LiveFixtureGwPointsChart } from './LiveFixtureGwPointsChart.jsx';
import { LiveProjectionsPanel } from './LiveProjectionsPanel.jsx';
import { LiveSharedStatusHeader } from './LiveSharedStatusHeader.jsx';
import { LiveFaceOffRow } from './LiveFaceOffRow.jsx';
import { HeroVillainAvatarFrame } from './HeroVillainAvatarFrame.jsx';
import { LiveExpandedFixture } from './LiveExpandedFixture.jsx';
import { useNarrowViewport } from './usePortraitMobile.js';
import {
  computeManagerForm,
  liveGwOutcomeDot,
  projectedH2HPoints,
} from './liveScoresDerivations.js';
import {
  bootstrapTeamToPredictionTeam,
  simulateFantasyH2hPercents,
  simulateFantasyH2hPercentsFromProjBlends,
  projectionRng as makePredictionRng,
} from './livePredictionMappers.js';
import {
  monteCarloBlendFromLiveBlend,
  projectedGwTotalLiveBlendForElement,
} from './liveGwMidProjection.js';

/**
 * Mins cell: green ≥60; red 0 after club’s GW fixture(s) finished; yellow 2–59.
 */
function livePickMinsCellClass(r) {
  const m = Number(r.minutes) || 0;
  if (m >= 60) return 'live-pick-cell--green';
  if (m === 0 && r.clubGwFixturesFinished === true) return 'live-pick-cell--red';
  if (m > 1 && m < 60) return 'live-pick-cell--yellow';
  return '';
}

/** Matches `live-picks-table-wrap--lineup-portrait` CSS breakpoint. */
const PORTRAIT_LINEUP_MQ = '(max-width: 560px) and (orientation: portrait)';

function usePortraitLineupMatch() {
  const subscribe = useCallback((onChange) => {
    if (typeof window === 'undefined') return () => {};
    const mq = window.matchMedia(PORTRAIT_LINEUP_MQ);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(PORTRAIT_LINEUP_MQ).matches;
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** DC cell: DEF ≥10, MID/FWD ≥12 (FPL defensive contribution count) */
function livePickDcGreen(r) {
  const dc = Number(r.dcCount) || 0;
  const pos = r.posSingular;
  if (pos === 'DEF') return dc >= 10;
  if (pos === 'MID' || pos === 'FWD') return dc >= 12;
  return false;
}

function KitThumb({ shirtUrl, badgeUrl, teamShort }) {
  const src = shirtUrl || badgeUrl;
  if (!src) {
    return (
      <span className="live-kit-fallback" title={teamShort}>
        {teamShort?.slice(0, 3) ?? '?'}
      </span>
    );
  }
  return (
    <img
      className="live-kit-img"
      src={src}
      alt=""
      loading="lazy"
      onError={(e) => {
        const img = e.currentTarget;
        if (shirtUrl && badgeUrl && img.src.includes(String(shirtUrl))) {
          img.src = badgeUrl;
        }
      }}
    />
  );
}

/**
 * Resolved ESPN Published XI tone for matchday colouring (pill + row tooltip); used for Starting XI **and Bench** picks.
 * @returns {'' | 'live-picks-row--mdy-xi' | 'live-picks-row--mdy-bench' | 'live-picks-row--mdy-absent'}
 */
function liveStartingXiMatchdayRowClass(row) {
  if (!row || row.espnMatchdayRole == null) return '';
  if (row.espnMatchdayRole === 'xi') return 'live-picks-row--mdy-xi';
  if (row.espnMatchdayRole === 'bench') return 'live-picks-row--mdy-bench';
  if (row.espnMatchdayRole === 'absent') return 'live-picks-row--mdy-absent';
  return '';
}

function liveMatchdayRowTitle(toneClass) {
  switch (toneClass) {
    case 'live-picks-row--mdy-xi':
      return 'In the Premier League starting XI for this match.';
    case 'live-picks-row--mdy-bench':
      return 'Listed on the Premier League bench for this fixture.';
    case 'live-picks-row--mdy-absent':
      return 'Not in the published Premier League squad for this fixture — strongly consider swapping out.';
    default:
      return undefined;
  }
}

/** Map row tone ({@link liveStartingXiMatchdayRowClass}) to pill modifier classes */
function liveStartingXiMatchdayPillClass(rowToneClass) {
  switch (rowToneClass) {
    case 'live-picks-row--mdy-xi':
      return 'live-player-mdy-pill live-player-mdy-pill--xi';
    case 'live-picks-row--mdy-bench':
      return 'live-player-mdy-pill live-player-mdy-pill--bench';
    case 'live-picks-row--mdy-absent':
      return 'live-player-mdy-pill live-player-mdy-pill--absent';
    default:
      return '';
  }
}

/**
 * @param {{ rows: object[], autosubInElementIds?: Set<number>, onPlayerClick?: (row: object) => void, toneTable?: 'matchday' }} props
 */
function PicksTable({ rows, autosubInElementIds, onPlayerClick, toneTable }) {
  const portraitLineup = usePortraitLineupMatch();
  if (!rows.length) return <p className="muted muted--tight">No picks</p>;
  return (
    <div className="table-scroll">
      <table className="live-picks-table">
        <colgroup>
          <col className="live-picks-col-player" />
          <col className="live-picks-col-pos" />
          <col className="live-picks-col-num live-picks-col-mins" />
          <col className="live-picks-col-num live-picks-col-dc" />
          <col className="live-picks-col-num live-picks-col-goals" />
          <col className="live-picks-col-num live-picks-col-assists" />
          <col className="live-picks-col-num live-picks-col-bonus" />
          <col className="live-picks-col-alarm" />
          <col className="live-picks-col-num live-picks-col-pts" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="live-picks-col-player">
              Player
            </th>
            <th scope="col" className="live-picks-col-pos">
              Pos
            </th>
            <th
              scope="col"
              className="live-picks-col-num live-picks-col-mins"
              title="Minutes"
            >
              Mins
            </th>
            <th
              scope="col"
              className="live-picks-col-num live-picks-col-dc"
              title="Defensive contributions this gameweek (FPL live stats)"
            >
              DC
            </th>
            <th
              scope="col"
              className="live-picks-col-num live-picks-col-goals"
              title="Goals scored this gameweek"
              aria-label="Goals"
            >
              <span aria-hidden="true">⚽</span>
            </th>
            <th
              scope="col"
              className="live-picks-col-num live-picks-col-assists"
              title="Assists this gameweek"
              aria-label="Assists"
            >
              <span aria-hidden="true">🍑</span>
            </th>
            <th
              scope="col"
              className="live-picks-col-num live-picks-col-bonus"
              title="FPL stats.bonus when &gt;0; else BPS estimate while live. After all of this club’s GW fixtures are full-time, if FPL still shows 0 bonus the estimate is dropped so it won’t freeze vs the official site."
            >
              Bonus
            </th>
            <th
              scope="col"
              className="live-picks-col-alarm live-picks-col-alarm--head"
              aria-label="Defensive contribution highlight"
              title="Shows when FPL awards exactly 2 pts from defensive contributions in live explain."
            />
            <th
              scope="col"
              className="live-picks-col-num live-picks-col-pts live-picks-col-pts--split"
              title="Live FPL points; bonus in the total matches the Bonus column (including BPS estimate when not yet posted)."
            >
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const minsTone = livePickMinsCellClass(r);
            const playerColName = r.displayName ?? r.web_name ?? '—';
            const fullLabel = `${playerColName}${r.opponentShortLabel ? ` (${r.opponentShortLabel})` : ''} · #${r.element}${r.teamName ? ` · ${r.teamName}` : ''}`;
            const mdyRowTone =
              toneTable === 'matchday' ? liveStartingXiMatchdayRowClass(r) : '';
            const mdyTitle = liveMatchdayRowTitle(mdyRowTone);
            const mdyPillClass = liveStartingXiMatchdayPillClass(mdyRowTone);
            const nameLabel =
              mdyPillClass ? (
                <span className={mdyPillClass}>
                  {playerColName}
                  {r.opponentShortLabel ? (
                    <span className="live-player-opponent">
                      {' '}
                      ({r.opponentShortLabel})
                    </span>
                  ) : null}
                </span>
              ) : (
                <>
                  {playerColName}
                  {r.opponentShortLabel ? (
                    <span className="live-player-opponent">
                      {' '}
                      ({r.opponentShortLabel})
                    </span>
                  ) : null}
                </>
              );
            return (
            <tr key={`${r.pickPosition}-${r.element}`} title={mdyTitle}>
              <td className="live-picks-col-player">
                <div className="live-player-cell">
                  <KitThumb
                    shirtUrl={r.shirtUrl}
                    badgeUrl={r.badgeUrl}
                    teamShort={r.teamShort}
                  />
                  <div className="live-player-text">
                    <div className="live-player-name-row">
                      {onPlayerClick ? (
                        <button
                          type="button"
                          className={
                            'live-player-name live-player-name--btn' +
                            (portraitLineup ? ' live-player-name--lineup-portrait' : '')
                          }
                          title={`${fullLabel} — view season history`}
                          onClick={() => onPlayerClick(r)}
                        >
                          {nameLabel}
                        </button>
                      ) : (
                        <div
                          className={
                            'live-player-name' +
                            (portraitLineup ? ' live-player-name--lineup-portrait' : '')
                          }
                          title={fullLabel}
                        >
                          {nameLabel}
                        </div>
                      )}
                      {r.availabilityStatus === 'i' ? (
                        <span
                          className="live-player-injury"
                          title={
                            r.availabilityNews?.trim()
                              ? r.availabilityNews
                              : 'Injured'
                          }
                          aria-label="Injured"
                          role="img"
                        >
                          🚑
                        </span>
                      ) : null}
                      {autosubInElementIds?.has(r.element) ? (
                        <span
                          className="live-player-autosub"
                          title="Autosubbed in from the bench"
                          aria-label="Autosubbed in from the bench"
                          role="img"
                        >
                          🔄
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </td>
              <td className="live-picks-col-pos tabular">{r.posSingular}</td>
              <td
                className={['live-picks-col-num', 'live-picks-col-mins', 'tabular', minsTone]
                  .filter(Boolean)
                  .join(' ')}
              >
                {r.minutes}
              </td>
              <td
                className={
                  'live-picks-col-num live-picks-col-dc tabular' +
                  (livePickDcGreen(r) ? ' live-pick-cell--green' : '')
                }
              >
                {r.dcCount}
              </td>
              <td
                className={
                  'live-picks-col-num live-picks-col-goals tabular' +
                  ((Number(r.goalsScored) || 0) > 0 ? ' live-pick-cell--green' : '')
                }
              >
                {r.goalsScored}
              </td>
              <td
                className={
                  'live-picks-col-num live-picks-col-assists tabular' +
                  ((Number(r.assists) || 0) > 0 ? ' live-pick-cell--green' : '')
                }
              >
                {r.assists}
              </td>
              <td
                className={
                  'live-picks-col-num live-picks-col-bonus tabular' +
                  ((Number(r.bonus) || 0) > 0 ? ' live-pick-cell--green' : '')
                }
              >
                {r.bonus}
              </td>
              <td className="live-picks-col-alarm tabular" />
              <td className="live-picks-col-num live-picks-col-pts live-picks-col-pts--split tabular">
                <strong>{r.total_points}</strong>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 3 / 1 / 0 from live GW score vs opponent (same as H2H table stakes). */
function liveH2hBonusPts(myLive, oppLive) {
  if (myLive == null || oppLive == null) return 0;
  if (myLive > oppLive) return 3;
  if (myLive < oppLive) return 0;
  return 1;
}

function teamNameForEntry(teams, leagueEntryId) {
  return teams?.find((t) => t.id === leagueEntryId)?.teamName ?? `Team ${leagueEntryId}`;
}

/** "David Higman · #1" sub-line for the desktop face-off row. */
function teamMgrSubLine(teams, leagueEntryId) {
  const t = teams?.find((x) => x.id === leagueEntryId);
  if (!t) return null;
  const mgr = (t.manager ?? '').trim();
  const rank = Number.isFinite(Number(t.rank)) ? `#${t.rank}` : '';
  if (mgr && rank) return `${mgr} · ${rank}`;
  return mgr || rank || null;
}

/**
 * All `matches` rows between two `league_entry` ids this season (tile home/away = banner sides).
 * Winner-first score in each chip (e.g. 34–21). For draws, home tile score first (same order as FPL row).
 * Uses live GW XI totals when this row is the active gameweek pairing.
 */
function seasonH2hBetween(
  matches,
  homeId,
  awayId,
  gameweek,
  liveHomePts,
  liveAwayPts,
  /** When false and this row uses live subs, a 0–0 score is omitted (unsettled GW, not a real draw). */
  selectedGwFinished,
) {
  const h = Number(homeId);
  const a = Number(awayId);
  const gwNum = Number(gameweek);
  const homeWins = [];
  const awayWins = [];
  const draws = [];
  for (const m of matches || []) {
    const e1 = Number(m.league_entry_1);
    const e2 = Number(m.league_entry_2);
    if (!Number.isFinite(e1) || !Number.isFinite(e2)) continue;
    if ((e1 !== h || e2 !== a) && (e1 !== a || e2 !== h)) continue;

    const ev = Number(m.event);
    let hp;
    let ap;
    if (Number.isFinite(ev) && ev === gwNum && liveHomePts != null && liveAwayPts != null) {
      hp = liveHomePts;
      ap = liveAwayPts;
      if (hp === 0 && ap === 0 && !selectedGwFinished) {
        continue;
      }
    } else {
      const p1 = Number(m.league_entry_1_points);
      const p2 = Number(m.league_entry_2_points);
      if (!Number.isFinite(p1) || !Number.isFinite(p2)) continue;
      hp = e1 === h ? p1 : p2;
      ap = e1 === h ? p2 : p1;
    }

    if (hp > ap) {
      homeWins.push({ gw: ev, label: `${hp}-${ap}` });
    } else if (ap > hp) {
      awayWins.push({ gw: ev, label: `${ap}-${hp}` });
    } else {
      draws.push({ gw: ev, label: `${hp}-${ap}` });
    }
  }
  const byGw = (x, y) => x.gw - y.gw;
  homeWins.sort(byGw);
  awayWins.sort(byGw);
  draws.sort(byGw);
  return { homeWins, awayWins, draws };
}

/**
 * @param {{ homeId: number, awayId: number, homeName: string, awayName: string, matches: object[], gameweek: number, liveHomePts: number | null | undefined, liveAwayPts: number | null | undefined, selectedGwFinished: boolean, teamLogoMap: object, kitIndexByEntry?: object }} props
 */
function LiveFixtureSeasonH2h({
  homeId,
  awayId,
  homeName,
  awayName,
  matches,
  gameweek,
  liveHomePts,
  liveAwayPts,
  selectedGwFinished,
  teamLogoMap,
  kitIndexByEntry,
}) {
  const { homeWins, awayWins, draws } = useMemo(
    () =>
      seasonH2hBetween(
        matches,
        homeId,
        awayId,
        gameweek,
        liveHomePts,
        liveAwayPts,
        selectedGwFinished,
      ),
    [
      matches,
      homeId,
      awayId,
      gameweek,
      liveHomePts,
      liveAwayPts,
      selectedGwFinished,
    ],
  );
  const hasAny = homeWins.length + awayWins.length + draws.length > 0;

  return (
    <div className="live-fixture-season-h2h" aria-label="Season head-to-head">
      <h4 className="live-fixture-season-h2h__heading">Season H2H</h4>
      {!hasAny ? (
        <p className="muted muted--tight live-fixture-season-h2h__empty">
          No scored head-to-heads in league data for this pair yet.
        </p>
      ) : (
        <>
          <div className="live-fixture-season-h2h__row">
            <div className="live-fixture-season-h2h__side">
              <TeamAvatar
                entryId={homeId}
                name={homeName}
                size="sm"
                logoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
              <div className="live-fixture-season-h2h__chips">
                {homeWins.map((x) => (
                  <span
                    key={`h2h-h-${homeId}-${awayId}-${x.gw}`}
                    className="live-h2h-chip live-h2h-chip--win tabular"
                    title={`GW ${x.gw}: ${homeName} ${x.label}`}
                  >
                    {x.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="live-fixture-season-h2h__side live-fixture-season-h2h__side--away">
              <TeamAvatar
                entryId={awayId}
                name={awayName}
                size="sm"
                logoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
              <div className="live-fixture-season-h2h__chips">
                {awayWins.map((x) => (
                  <span
                    key={`h2h-a-${homeId}-${awayId}-${x.gw}`}
                    className="live-h2h-chip live-h2h-chip--win tabular"
                    title={`GW ${x.gw}: ${awayName} ${x.label}`}
                  >
                    {x.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {draws.length > 0 ? (
            <div className="live-fixture-season-h2h__draws">
              <span className="live-fixture-season-h2h__draws-label">Draws</span>
              <div className="live-fixture-season-h2h__chips">
                {draws.map((x) => (
                  <span
                    key={`h2h-d-${homeId}-${awayId}-${x.gw}`}
                    className="live-h2h-chip live-h2h-chip--draw tabular"
                    title={`GW ${x.gw}: draw ${x.label}`}
                  >
                    {x.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function squadsToGwPointsMap(squads) {
  const pointsByEntryId = new Map();
  for (const s of squads || []) {
    const id = Number(s.leagueEntryId);
    const pts = liveGwDisplayTotal(s);
    if (!Number.isFinite(id) || pts == null || !Number.isFinite(Number(pts))) continue;
    pointsByEntryId.set(id, Number(pts));
  }
  return pointsByEntryId;
}

/** @param {object[]} squads @param {object[]} gwMatches */
function villainVictoryLeagueEntryIds(squads, gwMatches) {
  return villainVictoryEntryIds(squadsToGwPointsMap(squads), gwMatches);
}

/** @param {object[]} squads @param {object[]} gwMatches */
function heroDefeatLeagueEntryIds(squads, gwMatches) {
  return heroDefeatEntryIds(squadsToGwPointsMap(squads), gwMatches);
}

const H2H_WIN_PCT_CONFIG = { ...DEFAULT_MODEL_CONFIG, simulationIterations: 450 };

/**
 * Collect per-player {projFinal, remaining} blends for exactly 11 starters.
 * Returns null if any player is missing from context.
 */
function buildProjBlendsForPicks(picks, ctx, teamsById, gw, blendCtx, liveByEl) {
  if (!Array.isArray(picks) || picks.length !== 11) return null;
  const blends = [];
  for (let i = 0; i < 11; i++) {
    const pid = Number(picks[i]?.element);
    const el = ctx.elementById?.[pid];
    if (!el) return null;
    try {
      const blend = projectedGwTotalLiveBlendForElement(
        el,
        blendCtx,
        teamsById,
        gw,
        H2H_WIN_PCT_CONFIG,
        liveByEl[pid],
        makePredictionRng(pid, 990_011 + gw + i * 31),
        320,
        Number(picks[i]?.fplMultiplier) || 1,
      );
      blends.push(monteCarloBlendFromLiveBlend(blend, picks[i]));
    } catch {
      return null;
    }
  }
  return blends;
}

/** Sum projected GW totals for 11 starters; matches `buildProjBlendsForPicks` RNG seeds. */
function sumProjectedGwForStarters(picks, ctx, teamsById, gw, blendCtx, liveByEl) {
  if (!Array.isArray(picks) || picks.length !== 11) return null;
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const pid = Number(picks[i]?.element);
    const el = ctx.elementById?.[pid];
    if (!el) return null;
    try {
      const blend = projectedGwTotalLiveBlendForElement(
        el,
        blendCtx,
        teamsById,
        gw,
        H2H_WIN_PCT_CONFIG,
        liveByEl[pid],
        makePredictionRng(pid, 990_011 + gw + i * 31),
        320,
        Number(picks[i]?.fplMultiplier) || 1,
      );
      sum += monteCarloBlendFromLiveBlend(blend, picks[i]).projFinal;
    } catch {
      return null;
    }
  }
  return sum;
}


/** Effective XI rows (post-autosub when available). */
function startersForEffectiveXi(squad) {
  if (!squad || squad.error) return [];
  const nBench = squad.bench?.length ?? 0;
  if (
    squad.displayStarters?.length === 11 &&
    squad.displayBench?.length === nBench
  ) {
    return squad.displayStarters;
  }
  return squad.starters ?? [];
}

/** Element ids on this squad’s submitted picks (starters ∪ bench) — guards against stale/mixed rows. */
function pickElementIdSet(squad) {
  const s = new Set();
  for (const r of squad?.starters ?? []) {
    if (r?.element != null) s.add(r.element);
  }
  for (const r of squad?.bench ?? []) {
    if (r?.element != null) s.add(r.element);
  }
  return s;
}

/** FPL `web_name` (e.g. Martinez) — matches game UI better than derived displayName. */
function formatPlayerLtpSegment(r) {
  const name = String(r.web_name ?? r.displayName ?? '').trim() || '?';
  const opp = r.opponentShortLabel ?? '—';
  return `${name} (${opp})`;
}

const LEFT_TO_PLAY_TITLE =
  'Total fixtures left for the effective starting XI: each starter adds their own remaining club fixtures they can still score from (double gameweeks: up to two per player).';

/** Bracketed count after the team name (both sides — keeps layout symmetrical). */
function LeftToPlayOutsideAfter({ count, leadingSpace = true }) {
  if (typeof count !== 'number') return null;
  return (
    <span className="live-left-to-play tabular" title={LEFT_TO_PLAY_TITLE}>
      {leadingSpace ? ' ' : null}
      ({count})
    </span>
  );
}

/** @param {{ squad: object, onPlayerClick?: (row: object, squad: object) => void }} */
function SquadLineupPanel({ squad, onPlayerClick }) {
  if (!squad) {
    return <p className="muted muted--tight">No squad data for this team.</p>;
  }
  if (squad.error) {
    return <p className="muted">{squad.error}</p>;
  }

  const nBench = squad.bench?.length ?? 0;
  const useEffective =
    squad.displayStarters?.length === 11 && squad.displayBench?.length === nBench;
  const starters = useEffective ? squad.displayStarters : squad.starters;
  const bench = useEffective ? squad.displayBench : squad.bench;

  const allRows = [...squad.starters, ...squad.bench];
  const subsToShow =
    squad.autosubSource === 'official' && squad.autoSubs?.length
      ? squad.autoSubs
      : squad.autosubSource === 'projected' && squad.projectedAutoSubs?.length
        ? squad.projectedAutoSubs
        : [];

  const autosubInElementIds =
    useEffective && subsToShow.length > 0
      ? new Set(
          subsToShow
            .map((a) => Number(a.element_in))
            .filter((id) => Number.isFinite(id))
        )
      : undefined;

  return (
    <>
      {subsToShow.length ? (
        <div
          className={
            'live-auto-subs muted' +
            (squad.autosubSource === 'projected' ? ' live-auto-subs--projected' : '')
          }
          role="status"
        >
          <strong>
            {squad.autosubSource === 'official' ? 'Auto subs:' : 'Projected auto subs:'}
          </strong>{' '}
          {subsToShow.map((a) => {
            const rowIn = allRows.find((r) => r.element === Number(a.element_in));
            const rowOut = allRows.find((r) => r.element === Number(a.element_out));
            const nameIn = rowIn?.displayName ?? rowIn?.web_name ?? `#${a.element_in}`;
            const nameOut = rowOut?.displayName ?? rowOut?.web_name ?? `#${a.element_out}`;
            return (
              <span key={`${a.element_in}-${a.element_out}`} className="live-auto-sub-pair">
                <ClickablePlayerName
                  element={a.element_in}
                  displayName={rowIn?.displayName}
                  web_name={rowIn?.web_name ?? nameIn}
                  teamShort={rowIn?.teamShort}
                >
                  {nameIn}
                </ClickablePlayerName>
                {' '}
                ↔{' '}
                <ClickablePlayerName
                  element={a.element_out}
                  displayName={rowOut?.displayName}
                  web_name={rowOut?.web_name ?? nameOut}
                  teamShort={rowOut?.teamShort}
                >
                  {nameOut}
                </ClickablePlayerName>
              </span>
            );
          })}
          {squad.autosubSource === 'projected' ? (
            <span className="live-auto-subs__note">
              {' '}
              Provisional until FPL posts official autosubs.
            </span>
          ) : null}
        </div>
      ) : null}
      <h4 className="live-lineup-heading">Starting XI</h4>
      <div className="live-picks-table-wrap live-picks-table-wrap--lineup-portrait">
        <PicksTable
          rows={starters}
          autosubInElementIds={autosubInElementIds}
          toneTable="matchday"
          onPlayerClick={
            onPlayerClick ? (r) => onPlayerClick(r, squad) : undefined
          }
        />
      </div>
      <h4 className="live-lineup-heading live-lineup-heading--bench">Bench</h4>
      <div className="live-picks-table-wrap live-picks-table-wrap--lineup-portrait">
        <PicksTable
          rows={bench}
          toneTable="matchday"
          onPlayerClick={
            onPlayerClick ? (r) => onPlayerClick(r, squad) : undefined
          }
        />
      </div>
    </>
  );
}

function proxyHostLabel() {
  const raw = import.meta.env.VITE_FPL_PROXY_URL;
  if (raw == null || String(raw).trim() === '') return null;
  try {
    return new URL(String(raw).trim()).host;
  } catch {
    return null;
  }
}

/**
 * @param {{ teams: Array<{ id: number, teamName: string, fplEntryId: number | null }>, tableRows?: Array<object>, matches?: Array<{ event: number, league_entry_1: number, league_entry_2: number, finished?: boolean, league_entry_1_points?: number, league_entry_2_points?: number }>, gameweek: number, onGameweekChange: (n: number) => void, onBootstrapLiveMeta?: (meta: { currentGw: number | null }) => void, teamLogoMap: object, kitIndexByEntry?: object, leagueId?: number | null, waiverOutGwRows?: object[], fplDraftCurrentGw?: number | null, projectionsOnly?: boolean }}
 */
export function LiveScores({
  teams,
  tableRows = [],
  matches = [],
  gameweek,
  onGameweekChange,
  onBootstrapLiveMeta,
  teamLogoMap,
  kitIndexByEntry,
  leagueId = null,
  waiverOutGwRows = [],
  /** Draft bootstrap `events.current` — when the selected GW is earlier, standings use league totals only (no live +3 overlay). */
  fplDraftCurrentGw = null,
  /** When true, only the GW toolbar and {@link LiveProjectionsPanel} (FPL Live → Projections sub-tab). */
  projectionsOnly = false,
  /** Mobile app shell: hide tile h2; GW toolbar sticks below section sub-pills. */
  compactMobileChrome = false,
}) {
  const { loading, error, fixturesDegradedNotice, refresh, events, eventSnapshot, squads, contributionLiveContext, lastUpdated } =
    useLiveScores({
      teams,
      gameweek,
      enabled: true,
      onBootstrapLiveMeta,
      /** Hook only applies the interval when GW is current and not finished. */
      pollIntervalMs: 90_000,
    });

  /**
   * Below-desktop breakpoint (≤880px) — drives both the slim face-off row
   * treatment (manager+rank line hidden, smaller avatars and score) and the
   * `LiveExpandedFixture` tab-selector layout across the full phone+tablet
   * range, replacing the prior 601–880px stacked two-column grid.
   */
  const narrowViewport = useNarrowViewport();

  /** Fixture keys in the set are expanded; default empty = all collapsed. */
  const [expandedFixtures, setExpandedFixtures] = useState(() => new Set());
  const toggleFixtureExpanded = useCallback((key) => {
    setExpandedFixtures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /** Single “fixtures left” panel for all H2H fixtures — collapsed by default. */
  const [ltpPanelExpanded, setLtpPanelExpanded] = useState(false);

  /** FPL element id + labels — opens slide-over season history from `element-summary`. */
  const { openPlayerHistory } = usePlayerHistory();
  const detailOverlayCtx = usePlayerDetailOverlayOptional();

  const openLineupOrHistory = useCallback(
    (row, squad) => {
      if (
        detailOverlayCtx &&
        Number.isFinite(Number(row?.element ?? row?.elementId))
      ) {
        detailOverlayCtx.openPlayerDetail({
          element: Number(row.element ?? row.elementId),
          leagueEntryId:
            squad?.leagueEntryId != null ? Number(squad.leagueEntryId) : undefined,
          displayName: row?.displayName,
          web_name: row?.web_name,
          teamShort: row?.teamShort,
        });
        return;
      }
      openPlayerHistory(row);
    },
    [detailOverlayCtx, openPlayerHistory],
  );

  const proxyHost = proxyHostLabel();
  const hasExplicitWorkerUrl =
    (import.meta.env.VITE_FPL_PROXY_URL ?? '').trim() !== '';
  const fplFetchBase = fplApiBase();
  /** Browser will hit FPL directly — needs Worker URL at build time for static hosts. */
  const showNoProxyBuildError = fplFetchBase === FPL_DIRECT;
  const usesSameOriginViteProxy = fplFetchBase === '/__fpl';

  const allMissingFplId =
    teams?.length > 0 && teams.every((t) => t.fplEntryId == null);

  const gwOptions = useMemo(() => {
    return (events || [])
      .filter((e) => e && e.id >= 1 && e.id <= 38)
      .map((e) => ({
        id: e.id,
        label: eventNameToGameWeekLabel(e.name, e.id),
        finished: e.finished,
        is_current: e.is_current,
        is_next: e.is_next,
      }));
  }, [events]);

  const selectedGwOption = useMemo(
    () => gwOptions.find((o) => Number(o.id) === Number(gameweek)),
    [gwOptions, gameweek],
  );

  const gwMatches = useMemo(() => {
    if (!Array.isArray(matches) || matches.length === 0) return [];
    return matches.filter((m) => Number(m.event) === Number(gameweek));
  }, [matches, gameweek]);

  const squadByLeagueEntry = useMemo(() => {
    const m = new Map();
    for (const s of squads) {
      m.set(s.leagueEntryId, s);
    }
    return m;
  }, [squads]);

  /** Opponent’s live GW total for this GW (for projected Faced / GD / H2H pts). */
  const oppLiveGwByLeagueEntry = useMemo(() => {
    const m = new Map();
    for (const fx of gwMatches) {
      const a = Number(fx.league_entry_1);
      const b = Number(fx.league_entry_2);
      const la = liveGwDisplayTotal(squadByLeagueEntry.get(a));
      const lb = liveGwDisplayTotal(squadByLeagueEntry.get(b));
      m.set(a, lb);
      m.set(b, la);
    }
    return m;
  }, [gwMatches, squadByLeagueEntry]);

  /**
   * Win percentages for each H2H fixture: pre-live uses xPts MC; live uses per-player Proj MC.
   * Keyed by `${homeId}-${awayId}-${gameweek}`.
   */
  const h2hWinPctByKey = useMemo(() => {
    const ctx = contributionLiveContext;
    if (!ctx?.elementById || !gwMatches.length) return new Map();
    const gw = Number(gameweek);
    if (!Number.isFinite(gw)) return new Map();

    const allFx = Array.isArray(ctx.gwFixtures) ? ctx.gwFixtures : [];
    const teamsById = new Map();
    for (const t of Object.values(ctx.teamById || {})) {
      const tm = bootstrapTeamToPredictionTeam(t);
      teamsById.set(tm.id, tm);
    }

    const gwIsLive = allFx.some((f) => f?.started === true);
    const liveByEl = ctx.liveFullByElementId || {};
    const blendCtx = { gwFixtures: allFx };
    const result = new Map();

    for (const m of gwMatches) {
      const homeId = Number(m.league_entry_1);
      const awayId = Number(m.league_entry_2);
      const sqH = squadByLeagueEntry.get(homeId);
      const sqA = squadByLeagueEntry.get(awayId);
      const stH =
        sqH?.displayStarters?.length === 11 ? sqH.displayStarters : (sqH?.starters ?? []);
      const stA =
        sqA?.displayStarters?.length === 11 ? sqA.displayStarters : (sqA?.starters ?? []);
      const key = `${homeId}-${awayId}-${gw}`;
      const rnd = makePredictionRng(homeId, awayId);

      if (gwIsLive && stH.length === 11 && stA.length === 11) {
        const hBlends = buildProjBlendsForPicks(stH, ctx, teamsById, gw, blendCtx, liveByEl);
        const aBlends = buildProjBlendsForPicks(stA, ctx, teamsById, gw, blendCtx, liveByEl);
        if (hBlends && aBlends) {
          const pct = simulateFantasyH2hPercentsFromProjBlends(hBlends, aBlends, rnd, 1500, {
            homeXiFixturesLeft: sqH?.leftToPlayCount,
            awayXiFixturesLeft: sqA?.leftToPlayCount,
          });
          if (pct) {
            result.set(key, { ...pct, isLive: true });
            continue;
          }
        }
      }

      if (stH.length === 11 && stA.length === 11) {
        const pct = simulateFantasyH2hPercents(
          stH, stA, ctx, teamsById, gw, H2H_WIN_PCT_CONFIG, rnd, 1500,
        );
        if (pct) result.set(key, { ...pct, isLive: false });
      }
    }
    return result;
  }, [contributionLiveContext, gwMatches, gameweek, squadByLeagueEntry]);

  /** Per-entry projected GW total (live blend); null when lineup or context incomplete. */
  const projectedGwByEntryId = useMemo(() => {
    const m = new Map();
    const ctx = contributionLiveContext;
    if (!ctx?.elementById || !gwMatches.length) return m;
    const gw = Number(gameweek);
    if (!Number.isFinite(gw)) return m;

    const allFx = Array.isArray(ctx.gwFixtures) ? ctx.gwFixtures : [];
    const teamsById = new Map();
    for (const t of Object.values(ctx.teamById || {})) {
      const tm = bootstrapTeamToPredictionTeam(t);
      teamsById.set(tm.id, tm);
    }
    const blendCtx = { gwFixtures: allFx };
    const liveByEl = ctx.liveFullByElementId || {};

    const entryIds = new Set();
    for (const fx of gwMatches) {
      entryIds.add(Number(fx.league_entry_1));
      entryIds.add(Number(fx.league_entry_2));
    }
    for (const id of entryIds) {
      const sq = squadByLeagueEntry.get(id);
      const st =
        sq?.displayStarters?.length === 11
          ? sq.displayStarters
          : (sq?.starters ?? []);
      if (st.length !== 11) {
        m.set(id, null);
        continue;
      }
      const sum = sumProjectedGwForStarters(
        st,
        ctx,
        teamsById,
        gw,
        blendCtx,
        liveByEl,
      );
      m.set(id, sum);
    }
    return m;
  }, [contributionLiveContext, gwMatches, gameweek, squadByLeagueEntry]);

  /**
   * Median FPL points among winning sides in **finished** head-to-head matches (full season),
   * from league `matches` — not the current GW’s live polling totals.
   */
  const medianGwWinScore = useMemo(() => {
    const winners = [];
    for (const m of matches) {
      if (!m?.finished) continue;
      const p1 = Number(m.league_entry_1_points);
      const p2 = Number(m.league_entry_2_points);
      if (!Number.isFinite(p1) || !Number.isFinite(p2)) continue;
      if (p1 > p2) winners.push(p1);
      else if (p2 > p1) winners.push(p2);
    }
    if (!winners.length) return null;
    winners.sort((x, y) => x - y);
    const mid = Math.floor(winners.length / 2);
    return winners.length % 2 === 1
      ? winners[mid]
      : (winners[mid - 1] + winners[mid]) / 2;
  }, [matches]);

  /**
   * When “frozen”, PTS / For / Faced come from league `standings` only (no live +3 overlay).
   * FPL sometimes leaves `matches[].finished` false briefly after scores settle, and
   * `events.data[id].finished` can lag — so also freeze when the user is viewing a GW **before**
   * draft `events.current` (FPL has rolled the calendar to a later GW).
   */
  const gwStandingsFrozen = useMemo(() => {
    const cur = Number(fplDraftCurrentGw);
    const gw = Number(gameweek);
    const viewingPastGw =
      Number.isFinite(cur) && Number.isFinite(gw) && gw < cur;
    return (
      Boolean(eventSnapshot?.finished) ||
      (gwMatches.length > 0 && gwMatches.every((m) => m.finished)) ||
      viewingPastGw
    );
  }, [eventSnapshot?.finished, gwMatches, gameweek, fplDraftCurrentGw]);

  /**
   * Projected For / Faced / GD / PTS from this GW’s live fixtures, then sorted by projected PTS,
   * then For, then GD. `liveRank` = competition rank (ties share a #). `rankMove` uses ordinal
   * list position (i + 1) vs season rank so movement still shows inside tied groups.
   *
   * When this GW is already finished, league `tableRows` totals (PTS, For, Faced) already include
   * it — do not add live H2H points or GW FPL totals again (would double-count e.g. +3).
   */
  const liveStandingsRows = useMemo(() => {
    if (!Array.isArray(tableRows) || tableRows.length === 0) return [];
    /**
     * PR #5g — `gwHasStarted` is the signal the new `GW` dot column uses to
     * differentiate "pre-kickoff" (muted placeholder dot) from "live"
     * (W/D/L coloured dot, pulsing if not frozen). Frozen GWs are
     * always considered started so the FT dot still renders coloured.
     */
    const gwHasStarted =
      gwStandingsFrozen || gwMatches.some((m) => m?.started === true);
    const enriched = tableRows.map((row) => {
      const eid = row.league_entry;
      const squad = squadByLeagueEntry.get(eid);
      const liveGw = liveGwDisplayTotal(squad);
      const inFixture = oppLiveGwByLeagueEntry.has(eid);
      const oppLiveGw = inFixture ? oppLiveGwByLeagueEntry.get(eid) : null;

      const gf = Number(row.gf) || 0;
      const ga = Number(row.ga) || 0;
      const total = Number(row.total) || 0;
      const addMine =
        gwStandingsFrozen || liveGw == null ? 0 : liveGw;
      const addOpp =
        gwStandingsFrozen ||
        !inFixture ||
        oppLiveGw == null ||
        !Number.isFinite(Number(oppLiveGw))
          ? 0
          : Number(oppLiveGw);

      /**
       * PR #5g — `projectedFor` is the live-cumulative For (season points
       * for + this GW's live FPL points). When `gwStandingsFrozen` is true
       * the league `gf` already includes this GW so we add 0 to avoid
       * double-counting. This is the same value rendered in the new `FOR`
       * column post-restructure — no separate helper needed.
       */
      const projectedFor = gf + addMine;
      const projectedGa = ga + addOpp;
      const projectedGd = projectedFor - projectedGa;
      const h2hBonus =
        inFixture && liveGw != null && oppLiveGw != null
          ? liveH2hBonusPts(liveGw, oppLiveGw)
          : 0;
      const projectedPts = gwStandingsFrozen ? total : total + h2hBonus;

      /**
       * PR #5g — `formDotsHistoric` powers the new `Last 5` column: 5
       * most-recently-finished GW dots, no live dot (the live result moved
       * to the separate `GW` dot column).
       */
      const formDotsHistoric = computeManagerForm({
        leagueEntryId: eid,
        matches,
        gameweek,
        includeLive: false,
        count: 5,
      });
      /**
       * PR #5g — `gwOutcomeDot` drives the new `GW` column (single
       * coloured dot). `h2hProj` drives the inline `+3 / +1` chip in the
       * team-name cell (hidden on losing rows; `value === null` then).
       */
      const gwOutcomeDot = liveGwOutcomeDot(
        liveGw,
        inFixture ? oppLiveGw : null,
        gwHasStarted,
      );
      const h2hProj = projectedH2HPoints(
        liveGw,
        inFixture ? oppLiveGw : null,
      );

      return {
        ...row,
        liveGw,
        oppLiveGw: inFixture ? oppLiveGw : null,
        projectedFor,
        projectedGa,
        projectedGd,
        h2hBonus,
        projectedPts,
        formDotsHistoric,
        gwOutcomeDot,
        h2hProj,
      };
    });
    const sorted = [...enriched].sort((a, b) => {
      const d = (b.projectedPts ?? 0) - (a.projectedPts ?? 0);
      if (d !== 0) return d;
      const f = (b.projectedFor ?? 0) - (a.projectedFor ?? 0);
      if (f !== 0) return f;
      const g = (b.projectedGd ?? 0) - (a.projectedGd ?? 0);
      if (g !== 0) return g;
      return (a.rank ?? 999) - (b.rank ?? 999);
    });
    let currentLiveRank = 0;
    return sorted.map((row, i) => {
      if (i === 0 || row.projectedPts !== sorted[i - 1].projectedPts) {
        currentLiveRank = i + 1;
      }
      const liveRank = currentLiveRank;
      const ordinalLive = i + 1;
      const rankMove = (row.rank ?? 999) - ordinalLive;
      return { ...row, liveRank, ordinalLive, rankMove };
    });
  }, [
    tableRows,
    squadByLeagueEntry,
    oppLiveGwByLeagueEntry,
    gwStandingsFrozen,
    matches,
    gameweek,
    gwMatches,
  ]);

  const liveRankByEntry = useMemo(() => {
    const o = {};
    for (const row of liveStandingsRows) {
      const eid = row.league_entry;
      o[eid] = row.liveRank;
      o[String(eid)] = row.liveRank;
    }
    return o;
  }, [liveStandingsRows]);

  const villainVictoryEntryIds = useMemo(
    () => villainVictoryLeagueEntryIds(squads, gwMatches),
    [squads, gwMatches]
  );

  const heroDefeatEntryIds = useMemo(
    () => heroDefeatLeagueEntryIds(squads, gwMatches),
    [squads, gwMatches]
  );

  /** One object per H2H fixture with both sides’ fixture totals and player lines. */
  const leftToPlayByFixture = useMemo(() => {
    if (!gwMatches.length) return [];
    const buildSide = (leagueEntryId) => {
      const squad = squadByLeagueEntry.get(leagueEntryId);
      const name =
        squad?.teamName ?? teamNameForEntry(teams, leagueEntryId);
      const live = liveGwDisplayTotal(squad);
      const xi = startersForEffectiveXi(squad);
      const allowed = pickElementIdSet(squad);
      const ltpRows = xi
        .filter((r) => allowed.has(r.element))
        .filter((r) => Number(r.playerGamesLeftToPlay) > 0);
      const segments = ltpRows.map(formatPlayerLtpSegment);
      const ltpGamesCount = ltpRows.reduce((sum, r) => {
        const n = Number(r.playerGamesLeftToPlay);
        return sum + (Number.isFinite(n) && n > 0 ? n : 0);
      }, 0);
      return { leagueEntryId, name, live, segments, ltpGamesCount };
    };
    return gwMatches.map((m) => {
      const homeId = Number(m.league_entry_1);
      const awayId = Number(m.league_entry_2);
      return {
        key: `${homeId}-${awayId}-${Number(gameweek)}`,
        home: buildSide(homeId),
        away: buildSide(awayId),
      };
    });
  }, [gwMatches, teams, squadByLeagueEntry, gameweek]);

  const pairedLeagueEntryIds = useMemo(() => {
    const s = new Set();
    for (const m of gwMatches) {
      s.add(Number(m.league_entry_1));
      s.add(Number(m.league_entry_2));
    }
    return s;
  }, [gwMatches]);

  const orphanSquads = useMemo(
    () => squads.filter((q) => !pairedLeagueEntryIds.has(q.leagueEntryId)),
    [squads, pairedLeagueEntryIds]
  );

  const useFixtureLayout = gwMatches.length > 0;

  return (
    <div
      className={
        'dashboard-stack live-scores-root' +
        (compactMobileChrome ? ' live-scores-root--compact-chrome' : '')
      }
    >
      <section
        className={
          compactMobileChrome ? 'live-scores-chrome' : 'tile tile--compact'
        }
        aria-labelledby="live-heading"
      >
        <h2
          id="live-heading"
          className={
            'tile-title tile-title--sm' +
            (compactMobileChrome ? ' live-heading--hide-mobile' : '')
          }
        >
          {projectionsOnly ? 'Projections' : 'Live GW'}
        </h2>

        {showNoProxyBuildError ? (
          <div className="data-banner data-banner--error" role="alert">
            <strong>No proxy in this JavaScript build.</strong>{' '}
            <code>VITE_FPL_PROXY_URL</code> was not set for this deploy, so the browser calls FPL
            directly (<code>{FPL_DIRECT}</code>) and usually hits CORS on static hosting. Add your
            Cloudflare Worker base URL at <strong>build time</strong> (GitHub secret / CI env). Copy{' '}
            <code>web/.env.local.example</code> → <code>web/.env.local</code> for local testing, then{' '}
            <strong>re-run the deploy workflow</strong>. Check <code>deploy-check.json</code> —{' '}
            <code>liveProxyConfigured</code> should be <code>true</code>.
          </div>
        ) : null}

        {import.meta.env.DEV && usesSameOriginViteProxy && !hasExplicitWorkerUrl ? (
          <div className="data-banner" role="status">
            <span className="muted">
              Local dev uses Vite’s same-origin <code>/__fpl</code> proxy —{' '}
              <code>VITE_FPL_PROXY_URL</code> is optional. For GitHub Pages, set the Worker URL when
              building (see <code>web/.env.local.example</code>).
            </span>
          </div>
        ) : null}

        {allMissingFplId ? (
          <div className="data-banner" role="status">
            <strong>No FPL entry ids</strong> — sample/demo <code>details.json</code> omits{' '}
            <code>entry_id</code> on each team. Ingest your real draft league so each manager has an{' '}
            <code>entry_id</code> (the number from the FPL game URL).
          </div>
        ) : null}

        <div
          className={
            'live-toolbar' +
            (compactMobileChrome ? ' live-toolbar--section-sticky' : '')
          }
        >
          <div className="live-gw-field">
            <div className="live-gw-input-row">
              <label className="live-gw-label">
                <select
                  className="live-gw-select"
                  aria-label="Game week"
                  value={gameweek}
                  onChange={(e) => onGameweekChange(Number(e.target.value))}
                >
                  {gwOptions.length ? (
                    <GameWeekSelectOptgroups options={gwOptions} />
                  ) : (
                    <option value={gameweek}>{gameWeekSelectLabel(gameweek)}</option>
                  )}
                </select>
              </label>
              {selectedGwOption?.finished ? (
                <span
                  className="live-gw-pill"
                  title="This game week is complete (all fixtures finished)"
                  aria-label="This game week is complete"
                >
                  FT
                </span>
              ) : null}
            </div>
          </div>
          <LiveRefreshIconButton
            title="Refresh from FPL"
            loading={Boolean(loading)}
            disabled={Boolean(loading)}
            onClick={() => void refresh()}
          />
        </div>

        {error ? (
          <div className="data-banner data-banner--error" role="alert">
            <strong>Could not load live data.</strong> {error}{' '}
            <span className="muted">
              {hasExplicitWorkerUrl && proxyHost ? (
                <>
                  The FPL proxy (<code>{proxyHost}</code>) may be unavailable or over its daily
                  request limit (Cloudflare Workers free tier). Wait until after midnight UTC, run{' '}
                  <code>npm run dev:vite</code> locally, or upgrade the Workers plan — see{' '}
                  <code>web/workers/fpl-proxy/README.md</code>.
                </>
              ) : usesSameOriginViteProxy ? (
                <>
                  If you see HTML (<code>&lt;!doctype</code>…), the request never reached FPL — use{' '}
                  <code>npm run dev:vite</code> or <code>npx vite preview</code> so{' '}
                  <code>/__fpl</code> is proxied, not a plain static server. After changing{' '}
                  <code>.env.local</code>, restart Vite. For static hosting, set{' '}
                  <code>VITE_FPL_PROXY_URL</code> at build time.
                </>
              ) : (
                <>
                  On GitHub Pages, set <code>VITE_FPL_PROXY_URL</code> to your Worker (see{' '}
                  <code>web/workers/fpl-proxy/README.md</code>) and redeploy.
                </>
              )}
            </span>
          </div>
        ) : null}
        {!error && fixturesDegradedNotice ? (
          <div className="data-banner" role="status">
            <strong>Limited fixture data.</strong> {fixturesDegradedNotice}
          </div>
        ) : null}
      </section>

      {projectionsOnly ? (
        <LiveProjectionsPanel
          contributionLiveContext={contributionLiveContext}
          gameweek={gameweek}
          gwMatches={gwMatches}
          squads={squads}
          teams={teams}
          teamLogoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
          liveRankByEntry={liveRankByEntry}
        />
      ) : (
        <>
      <section
        className="tile tile--compact player-contrib-tile"
        aria-label="FPL live scores"
      >
        <PlayerContributions
          leagueId={leagueId}
          gameweek={gameweek}
          squads={squads}
          contributionLiveContext={contributionLiveContext}
          waiverOutGwRows={waiverOutGwRows}
          lastUpdated={lastUpdated}
          teamLogoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
        />
      </section>

      {useFixtureLayout ? (
        <section
          className="tile tile--compact live-banner-group-tile"
          aria-label={`Gameweek ${gameweek} head-to-head fixtures`}
        >
          <LiveSharedStatusHeader
            eventSnapshot={eventSnapshot}
            gwFixtures={contributionLiveContext?.gwFixtures ?? null}
          />
          <div className="live-banner-group__list">
            {gwMatches.map((m) => {
              const homeId = Number(m.league_entry_1);
              const awayId = Number(m.league_entry_2);
              const homeName = teamNameForEntry(teams, homeId);
              const awayName = teamNameForEntry(teams, awayId);
              const homeSquad = squadByLeagueEntry.get(homeId);
              const awaySquad = squadByLeagueEntry.get(awayId);
              const homeLive = liveGwDisplayTotal(homeSquad);
              const awayLive = liveGwDisplayTotal(awaySquad);

              const homeVillain = villainVictoryEntryIds.has(homeId);
              const awayVillain = villainVictoryEntryIds.has(awayId);
              const homeHero = heroDefeatEntryIds.has(homeId);
              const awayHero = heroDefeatEntryIds.has(awayId);

              const fixtureKey = `${homeId}-${awayId}-${gameweek}`;
              const winPct = h2hWinPctByKey.get(fixtureKey);
              const lineupOpen = expandedFixtures.has(fixtureKey);
              const fixtureBodyId = `live-fixture-lineups-${fixtureKey}`;

              // Hero defeat / villain victory narrative status is passed
              // through to LiveFaceOffRow as `homeStatus`/`awayStatus` so the
              // Variant 1 avatar treatment (ring + dot + caption pill) wraps
              // the manager avatar directly. The rectangular tile is no
              // longer injected via `bannerExtras` in this face-off row.
              const homeStatus = homeVillain ? 'villain' : homeHero ? 'hero' : null;
              const awayStatus = awayVillain ? 'villain' : awayHero ? 'hero' : null;

              const bannerExtras = {
                home: winPct ? (
                  <span
                    className={
                      'live-banner-row__win-pct tabular' +
                      (winPct.isLive ? ' live-banner-row__win-pct--live' : '')
                    }
                    title={winPct.isLive ? 'Home win % (live Proj MC)' : 'Home win % (xPts MC)'}
                    aria-label={`Home win ${Math.round(winPct.homeWinPct)}%`}
                  >
                    {Math.round(winPct.homeWinPct)}%
                  </span>
                ) : null,
                away: winPct ? (
                  <span
                    className={
                      'live-banner-row__win-pct tabular' +
                      (winPct.isLive ? ' live-banner-row__win-pct--live' : '')
                    }
                    title={winPct.isLive ? 'Away win % (live Proj MC)' : 'Away win % (xPts MC)'}
                    aria-label={`Away win ${Math.round(winPct.awayWinPct)}%`}
                  >
                    {Math.round(winPct.awayWinPct)}%
                  </span>
                ) : null,
              };

              return (
                <div
                  key={fixtureKey}
                  className={
                    'live-banner-group__item' +
                    (lineupOpen ? ' live-banner-group__item--open' : '') +
                    (homeVillain || awayVillain ? ' live-banner-group__item--villain-victory' : '') +
                    (homeHero || awayHero ? ' live-banner-group__item--hero-defeat' : '')
                  }
                >
                  <LiveFaceOffRow
                    homeId={homeId}
                    awayId={awayId}
                    homeName={homeName}
                    awayName={awayName}
                    homeMgr={teamMgrSubLine(teams, homeId)}
                    awayMgr={teamMgrSubLine(teams, awayId)}
                    homeLive={homeLive}
                    awayLive={awayLive}
                    teamLogoMap={teamLogoMap}
                    kitIndexByEntry={kitIndexByEntry}
                    compact={narrowViewport}
                    expanded={lineupOpen}
                    bannerExtras={bannerExtras}
                    homeStatus={homeStatus}
                    awayStatus={awayStatus}
                    onToggle={() => toggleFixtureExpanded(fixtureKey)}
                    ariaControls={fixtureBodyId}
                    chevronEnd={
                      <span className="live-banner-row__chev" aria-hidden="true">
                        {lineupOpen ? '▾' : '▸'}
                      </span>
                    }
                  />

                  {lineupOpen ? (
                    <div className="live-banner-group__expanded" id={fixtureBodyId}>
                      <LiveFixtureSeasonH2h
                        homeId={homeId}
                        awayId={awayId}
                        homeName={homeName}
                        awayName={awayName}
                        matches={matches}
                        gameweek={gameweek}
                        liveHomePts={homeLive}
                        liveAwayPts={awayLive}
                        selectedGwFinished={Boolean(selectedGwOption?.finished)}
                        teamLogoMap={teamLogoMap}
                        kitIndexByEntry={kitIndexByEntry}
                      />
                      <LiveExpandedFixture
                        homeSquad={homeSquad}
                        awaySquad={awaySquad}
                        homeName={homeName}
                        awayName={awayName}
                        viewport={narrowViewport ? 'mobile' : 'desktop'}
                        onOpenPlayer={openLineupOrHistory}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        squads.map((squad) => {
          const squadVillain = villainVictoryEntryIds.has(Number(squad.leagueEntryId));
          const squadHero = heroDefeatEntryIds.has(Number(squad.leagueEntryId));
          return (
            <section
              key={squad.leagueEntryId}
              className={
                'tile tile--compact live-squad-tile' +
                (squadVillain ? ' live-squad-tile--villain-victory' : '') +
                (squadHero ? ' live-squad-tile--hero-defeat' : '')
              }
              aria-labelledby={`live-squad-${squad.leagueEntryId}`}
            >
              <div className="live-squad-head">
                <h3
                  id={`live-squad-${squad.leagueEntryId}`}
                  className="live-squad-title"
                  title={
                    squad.fplEntryId != null
                      ? `Squad from draft FPL API · entry_id ${squad.fplEntryId} (league_entries.entry_id)`
                      : undefined
                  }
                >
                  <HeroVillainAvatarFrame
                    status={squadVillain ? 'villain' : squadHero ? 'hero' : null}
                    size="compact"
                  >
                    <TeamAvatar
                      entryId={squad.leagueEntryId}
                      name={squad.teamName}
                      size="sm"
                      logoMap={teamLogoMap}
                      kitIndexByEntry={kitIndexByEntry}
                    />
                  </HeroVillainAvatarFrame>
                  <span className="live-squad-title__text">
                    <span>
                      {squad.teamName}
                      <LeftToPlayOutsideAfter count={squad.leftToPlayCount} />
                    </span>
                  </span>
                </h3>
                <div className="live-squad-meta tabular">
                  {liveGwDisplayTotal(squad) != null ? (
                    <span className="live-squad-pts">
                      <strong>{liveGwDisplayTotal(squad)}</strong> GW pts
                    </span>
                  ) : null}
                  {squad.pointsOnBench != null ? (
                    <span className="muted">Bench: {squad.pointsOnBench} pts</span>
                  ) : null}
                </div>
              </div>
              <SquadLineupPanel squad={squad} onPlayerClick={openLineupOrHistory} />
            </section>
          );
        })
      )}

      {useFixtureLayout && orphanSquads.length > 0
        ? orphanSquads.map((squad) => {
            const squadVillain = villainVictoryEntryIds.has(Number(squad.leagueEntryId));
            const squadHero = heroDefeatEntryIds.has(Number(squad.leagueEntryId));
            return (
            <section
              key={`orphan-${squad.leagueEntryId}`}
              className={
                'tile tile--compact live-squad-tile live-squad-tile--orphan' +
                (squadVillain ? ' live-squad-tile--villain-victory' : '') +
                (squadHero ? ' live-squad-tile--hero-defeat' : '')
              }
              aria-labelledby={`live-squad-o-${squad.leagueEntryId}`}
            >
              <p className="muted muted--tight live-orphan-note">
                No H2H pairing in schedule for this GW — showing squad only.
              </p>
              <div className="live-squad-head">
                <h3
                  id={`live-squad-o-${squad.leagueEntryId}`}
                  className="live-squad-title"
                  title={
                    squad.fplEntryId != null
                      ? `Squad from draft FPL API · entry_id ${squad.fplEntryId}`
                      : undefined
                  }
                >
                  <HeroVillainAvatarFrame
                    status={squadVillain ? 'villain' : squadHero ? 'hero' : null}
                    size="compact"
                  >
                    <TeamAvatar
                      entryId={squad.leagueEntryId}
                      name={squad.teamName}
                      size="sm"
                      logoMap={teamLogoMap}
                      kitIndexByEntry={kitIndexByEntry}
                    />
                  </HeroVillainAvatarFrame>
                  <span className="live-squad-title__text">
                    <span>
                      {squad.teamName}
                      <LeftToPlayOutsideAfter count={squad.leftToPlayCount} />
                    </span>
                  </span>
                </h3>
                <div className="live-squad-meta tabular">
                  {liveGwDisplayTotal(squad) != null ? (
                    <span className="live-squad-pts">
                      <strong>{liveGwDisplayTotal(squad)}</strong> GW pts
                    </span>
                  ) : null}
                </div>
              </div>
              <SquadLineupPanel squad={squad} onPlayerClick={openLineupOrHistory} />
            </section>
            );
          })
        : null}

      {leftToPlayByFixture.length > 0 ? (
        <section
          className="tile tile--compact live-ltp-panel-tile"
          aria-label="Total fixtures left to play in H2H matchups"
        >
          <button
            type="button"
            className="live-fixture-banner live-fixture-banner--toggle live-ltp-fixture-banner"
            onClick={() => setLtpPanelExpanded((v) => !v)}
            aria-expanded={ltpPanelExpanded}
            aria-controls="live-ltp-panel-body"
          >
            <span className="live-fixture-chevron live-fixture-chevron--desktop" aria-hidden>
              {ltpPanelExpanded ? '▼' : '▶'}
            </span>
            <span className="live-ltp-fixture-banner__text">
              <span className="live-ltp-fixture-banner__title live-ltp-fixture-banner__title--only">
                Fixtures left to play
              </span>
            </span>
            <span className="live-fixture-banner__expand-foot" aria-hidden>
              <span className="live-fixture-chevron live-fixture-chevron--mobile">
                {!ltpPanelExpanded ? '▼' : '▲'}
              </span>
            </span>
          </button>

          {ltpPanelExpanded ? (
            <div className="live-ltp-panel-body" id="live-ltp-panel-body">
              {leftToPlayByFixture.map((fx) => (
                <div key={fx.key} className="live-ltp-fixture-block">
                  <div className="live-ltp-summary-list">
                    {[fx.home, fx.away].map((row) => (
                      <div
                        key={row.leagueEntryId}
                        className="live-ltp-summary-row"
                      >
                        <span className="live-ltp-summary-team">
                          <span className="live-ltp-summary-score-inline tabular">
                            {row.live != null ? row.live : '—'}
                          </span>
                          <TeamAvatar
                            entryId={row.leagueEntryId}
                            name={row.name}
                            size="sm"
                            logoMap={teamLogoMap}
                            kitIndexByEntry={kitIndexByEntry}
                          />
                          <strong className="live-ltp-summary-team-name">
                            {row.name}
                          </strong>
                        </span>
                        <span className="live-ltp-summary-players">
                          <span
                            className="live-ltp-summary-players-count muted tabular"
                            title="Total fixtures left (sum over effective starting XI)"
                          >
                            ({row.ltpGamesCount})
                          </span>
                          {row.segments.length ? (
                            <> {row.segments.join(', ')}</>
                          ) : (
                            <span className="muted"> None</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section
        className="tile tile--compact tile--live-standings"
        aria-labelledby="live-standings-heading"
      >
        <div className="tile-head-row tile-head-row--tight">
          <h2 id="live-standings-heading" className="tile-title tile-title--sm">
            Live Table
          </h2>
          <span className="league-pill league-pill--sm">GW {gameweek}</span>
        </div>
        {!tableRows?.length ? (
          <p className="muted muted--tight">No standings data.</p>
        ) : (
          <div className="table-scroll table-scroll--standings-open">
            <table className="standings-table standings-table--sidebar standings-table--live">
              <thead>
                <tr>
                  <th
                    className="col-rank"
                    title={
                      gwStandingsFrozen
                        ? 'League position (this GW is finished)'
                        : 'Position by projected points including this GW'
                    }
                  >
                    #
                  </th>
                  <th className="col-team">Team</th>
                  <th
                    className="col-num col-pl"
                    title={
                      gwStandingsFrozen
                        ? 'Live played score: final FPL points this GW'
                        : 'Live played score: FPL points this GW so far (0 pre-kickoff)'
                    }
                  >
                    PL
                  </th>
                  <th
                    className="col-num col-for"
                    title={
                      gwStandingsFrozen
                        ? 'Season points for (includes this GW)'
                        : 'Season points for, plus this GW’s live FPL points'
                    }
                  >
                    FOR
                  </th>
                  <th
                    className="col-live-form"
                    title="Last 5 finished GWs (oldest to newest)"
                  >
                    Last 5
                  </th>
                  <th
                    className="col-live-gw-dot"
                    title={
                      gwStandingsFrozen
                        ? 'This GW’s H2H result: green win, amber draw, red loss'
                        : 'Live H2H result vs opponent: green winning, amber drawing, red losing, muted pre-kickoff'
                    }
                  >
                    GW
                  </th>
                  <th
                    className="col-num col-pts"
                    title={
                      gwStandingsFrozen
                        ? 'Season H2H points (includes this GW)'
                        : 'Season H2H points plus 3 / 1 / 0 from live score vs opponent this GW'
                    }
                  >
                    PTS
                  </th>
                </tr>
              </thead>
              <tbody>
                {liveStandingsRows.map((row) => {
                  const isLeader = row.liveRank === 1;
                  const isVillainVictory = villainVictoryEntryIds.has(
                    Number(row.league_entry)
                  );
                  const isHeroDefeat = heroDefeatEntryIds.has(
                    Number(row.league_entry)
                  );
                  const rowClass = [
                    isLeader ? 'row-highlight' : '',
                    row.liveRank === 1 ? 'standings-row--divider-below' : '',
                    row.liveRank === 8
                      ? 'standings-row--divider-above standings-row--8th'
                      : '',
                    isVillainVictory ? 'standings-row--villain-victory' : '',
                    isHeroDefeat ? 'standings-row--hero-defeat' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  const moveUp = row.rankMove > 0;
                  const moveDown = row.rankMove < 0;
                  return (
                    <tr key={row.league_entry} className={rowClass || undefined}>
                      <td className="col-rank">
                        {row.liveRank === 8 ? (
                          <span
                            role="img"
                            className="standings-rank-8"
                            aria-label="8"
                          >
                            🧩
                          </span>
                        ) : (
                          row.liveRank
                        )}
                      </td>
                      <td className="col-team">
                        <span className="team-cell">
                          <HeroVillainAvatarFrame
                            status={
                              isVillainVictory
                                ? 'villain'
                                : isHeroDefeat
                                  ? 'hero'
                                  : null
                            }
                            size="tiny"
                          >
                            <TeamAvatar
                              entryId={row.league_entry}
                              name={row.teamName}
                              size="sm"
                              logoMap={teamLogoMap}
                              kitIndexByEntry={kitIndexByEntry}
                            />
                          </HeroVillainAvatarFrame>
                          <span className="team-name team-name--sidebar live-standings-team-name">
                            {row.teamName}
                            {moveUp ? (
                              <span
                                className="live-standings-move live-standings-move--up"
                                title={`Up ${row.rankMove} vs league #${row.rank}`}
                                aria-label={`Up ${row.rankMove} places vs league position ${row.rank}`}
                              >
                                ↑
                              </span>
                            ) : null}
                            {moveDown ? (
                              <span
                                className="live-standings-move live-standings-move--down"
                                title={`Down ${-row.rankMove} vs league #${row.rank}`}
                                aria-label={`Down ${-row.rankMove} places vs league position ${row.rank}`}
                              >
                                ↓
                              </span>
                            ) : null}
                          </span>
                          {/* PR #5g — inline projected-H2H chip next to the
                             team name. Renders `+3` (winning) or `+1`
                             (drawing); hidden on losing rows and pre-kickoff
                             so the row's GW dot column carries the loss
                             signal. Narrow viewport (≤880px) only — desktop
                             uses the dedicated GW dot column instead. */}
                          {narrowViewport && row.h2hProj && row.h2hProj.value != null ? (
                            <span
                              className={`live-form-margin live-form-margin--${row.h2hProj.kind}`}
                              title={
                                row.h2hProj.kind === 'win'
                                  ? `Projected H2H points: +${row.h2hProj.value} (winning this GW)`
                                  : `Projected H2H points: +${row.h2hProj.value} (drawing this GW)`
                              }
                              aria-label={
                                row.h2hProj.kind === 'win'
                                  ? `Projected H2H points plus ${row.h2hProj.value} (winning)`
                                  : `Projected H2H points plus ${row.h2hProj.value} (drawing)`
                              }
                            >
                              +{row.h2hProj.value}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td
                        className="col-num col-pl tabular"
                        title={
                          row.liveGw != null
                            ? `Live GW played score: ${row.liveGw} FPL pts`
                            : 'Live GW played score (no data yet)'
                        }
                      >
                        {row.liveGw != null ? row.liveGw : 0}
                      </td>
                      <td
                        className="col-num col-for tabular"
                        title={`Season ${row.gf} + GW live${row.liveGw != null ? ` (${row.liveGw})` : ''}`}
                      >
                        {row.projectedFor}
                      </td>
                      <td className="col-live-form">
                        <span
                          className="live-form-dots"
                          role="img"
                          aria-label="Last 5 finished GWs (oldest to newest)"
                        >
                          {row.formDotsHistoric.map((dot, i) => {
                            const kind =
                              dot.result === 'W'
                                ? 'win'
                                : dot.result === 'D'
                                  ? 'draw'
                                  : dot.result === 'L'
                                    ? 'loss'
                                    : 'none';
                            const cls = `live-form-dot live-form-dot--${kind}`;
                            const label = dot.result
                              ? `GW ${dot.gw} ${dot.result}`
                              : `GW ${dot.gw} — no result`;
                            return (
                              <span
                                key={`${row.league_entry}-last5-${i}-${dot.gw}`}
                                className={cls}
                                title={label}
                                aria-label={label}
                              />
                            );
                          })}
                        </span>
                      </td>
                      <td className="col-live-gw-dot">
                        {(() => {
                          const kind = row.gwOutcomeDot; // 'win' | 'draw' | 'loss' | 'none'
                          /**
                           * Pulse only when the GW is live (started but not
                           * frozen) AND we have a coloured result. Frozen
                           * dots keep their colour but skip the pulse — the
                           * @keyframes rule also collapses for
                           * prefers-reduced-motion via the live-form-dot CSS.
                           */
                          const isLive = !gwStandingsFrozen && kind !== 'none';
                          const cls = [
                            'live-gw-dot',
                            `live-gw-dot--${kind}`,
                            isLive ? 'live-gw-dot--live' : '',
                          ]
                            .filter(Boolean)
                            .join(' ');
                          const label =
                            kind === 'win'
                              ? `GW ${gameweek} winning`
                              : kind === 'draw'
                                ? `GW ${gameweek} drawing`
                                : kind === 'loss'
                                  ? `GW ${gameweek} losing`
                                  : `GW ${gameweek} not started`;
                          return (
                            <span
                              className={cls}
                              role="img"
                              title={label}
                              aria-label={label}
                            />
                          );
                        })()}
                      </td>
                      <td className="col-num col-pts tabular">
                        <strong>{row.projectedPts}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="table-foot muted standings-landscape-hint">
          On mobile, turn your device to landscape for the full table.
          {gwStandingsFrozen ? (
            <>
              {' '}
              Frozen standings use league totals from the last loaded league file; refresh ingest /
              deploy so <code>details.json</code> matches FPL if PTS look stale.
            </>
          ) : null}
        </p>
      </section>

      {useFixtureLayout ? (
        <LiveFixtureGwPointsChart
          gameweek={gameweek}
          gwMatches={gwMatches}
          teams={teams}
          squadByLeagueEntry={squadByLeagueEntry}
          teamLogoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
          projectedGwByEntryId={projectedGwByEntryId}
          medianGwWinScore={medianGwWinScore}
        />
      ) : null}
        </>
      )}
    </div>
  );
}
