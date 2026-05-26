import { useMemo } from 'react';
import { TeamAvatar } from './TeamAvatar';
import { liveGwDisplayTotal } from './liveGwTotals.js';
import {
  formatKickoffLabel,
  liveFixtureLead,
  liveGroupStatus,
} from './liveScoresDerivations.js';
import { deriveLiveSummary } from './useFplFixtureLiveSummary.js';

function teamNameForEntry(teams, leagueEntryId) {
  return teams?.find((t) => t.id === leagueEntryId)?.teamName ?? `Team ${leagueEntryId}`;
}

/**
 * Pick a featured fixture for the hero banner.
 *
 * Heuristic: prefer the **closest live fixture** (smallest absolute live
 * score delta) so the banner stays interesting. If no live deltas are
 * available, fall back to the first fixture in the GW so we don't render
 * an empty hero on a quiet day.
 */
function featuredFixture(gwMatches, squadByLeagueEntry) {
  if (!Array.isArray(gwMatches) || gwMatches.length === 0) return null;
  const withMeta = gwMatches.map((m) => {
    const homeId = Number(m.league_entry_1);
    const awayId = Number(m.league_entry_2);
    const homeLive = liveGwDisplayTotal(squadByLeagueEntry?.get(homeId));
    const awayLive = liveGwDisplayTotal(squadByLeagueEntry?.get(awayId));
    const hasScore = homeLive != null && awayLive != null;
    const delta = hasScore ? Math.abs(Number(homeLive) - Number(awayLive)) : Infinity;
    return { m, homeId, awayId, homeLive, awayLive, hasScore, delta };
  });
  const scored = withMeta.filter((x) => x.hasScore);
  const pool = scored.length ? scored : withMeta;
  pool.sort((a, b) => a.delta - b.delta);
  return pool[0];
}

/**
 * Replaces the static Triple Threat promo PNG with a generative
 * single-fixture hero (mockup `LiveBannerConcept`). Uses live data from
 * useLiveScores via parent props so we don't double-fetch.
 *
 * @param {{
 *   teams: object[],
 *   matches: object[],
 *   gameweek: number,
 *   squadByLeagueEntry: Map<number, object>,
 *   eventSnapshot: object | null,
 *   gwFixtures: object[] | null,
 *   teamLogoMap: object,
 *   kitIndexByEntry?: object,
 * }} props
 */
export function LiveBannerConcept({
  teams,
  matches,
  gameweek,
  squadByLeagueEntry,
  eventSnapshot,
  gwFixtures,
  teamLogoMap,
  kitIndexByEntry,
}) {
  const gwMatches = useMemo(() => {
    if (!Array.isArray(matches) || matches.length === 0) return [];
    return matches.filter((m) => Number(m.event) === Number(gameweek));
  }, [matches, gameweek]);

  const featured = featuredFixture(gwMatches, squadByLeagueEntry);

  const summary = useMemo(
    () => deriveLiveSummary(gwFixtures ?? []),
    [gwFixtures],
  );
  const status = useMemo(
    () =>
      liveGroupStatus({
        eventSnapshot,
        gwFixtures,
        liveFixtureCount: summary.liveFixtureCount,
        minute: summary.minute,
      }),
    [eventSnapshot, gwFixtures, summary.liveFixtureCount, summary.minute],
  );

  if (!featured) return null;

  const homeName = teamNameForEntry(teams, featured.homeId);
  const awayName = teamNameForEntry(teams, featured.awayId);
  const lead = liveFixtureLead(featured.homeLive, featured.awayLive);
  const homeWinner = lead === 'home';
  const awayWinner = lead === 'away';

  const windowLabel =
    eventSnapshot?.deadline_time
      ? `${gwLabel(eventSnapshot)} · ${formatKickoffLabel(eventSnapshot.deadline_time) ?? ''}`
      : gwLabel(eventSnapshot);
  const minuteText =
    status.kind === 'live' && summary.minute != null && Number(summary.minute) > 0
      ? `Live · ${summary.minute}′ played`
      : status.chipLabel;

  return (
    <section
      className={`live-banner-hero live-banner-hero--${status.kind}`}
      aria-label={`Featured matchup: ${homeName} versus ${awayName}`}
    >
      <div className="live-banner-hero__top">
        <span className="live-banner-hero__chip">
          {status.kind === 'live' ? (
            <span className="live-banner-hero__dot" aria-hidden="true" />
          ) : null}
          {minuteText}
        </span>
        <span className="live-banner-hero__gw tabular">{windowLabel.trim()}</span>
      </div>
      <div className="live-banner-hero__matchup">
        <div className="live-banner-hero__side live-banner-hero__side--home">
          <span className="live-banner-hero__crest">
            <TeamAvatar
              entryId={featured.homeId}
              name={homeName}
              size="md"
              logoMap={teamLogoMap}
              kitIndexByEntry={kitIndexByEntry}
            />
          </span>
          <div className="live-banner-hero__names">
            <div className={'live-banner-hero__name' + (homeWinner ? ' live-banner-hero__name--winner' : awayWinner ? ' live-banner-hero__name--loser' : '')}>
              {homeName}
            </div>
            <div className="live-banner-hero__sub">Home</div>
          </div>
        </div>
        <div className="live-banner-hero__score tabular">
          {featured.hasScore ? (
            <>
              <span
                className={
                  'live-banner-hero__score-half' +
                  (homeWinner ? ' live-banner-hero__score-half--winner' : '') +
                  (awayWinner ? ' live-banner-hero__score-half--loser' : '')
                }
              >
                {featured.homeLive}
              </span>
              <span className="live-banner-hero__score-sep" aria-hidden="true">–</span>
              <span
                className={
                  'live-banner-hero__score-half' +
                  (awayWinner ? ' live-banner-hero__score-half--winner' : '') +
                  (homeWinner ? ' live-banner-hero__score-half--loser' : '')
                }
              >
                {featured.awayLive}
              </span>
            </>
          ) : (
            <span className="live-banner-hero__score-pending muted">vs</span>
          )}
        </div>
        <div className="live-banner-hero__side live-banner-hero__side--away">
          <div className="live-banner-hero__names live-banner-hero__names--away">
            <div className={'live-banner-hero__name' + (awayWinner ? ' live-banner-hero__name--winner' : homeWinner ? ' live-banner-hero__name--loser' : '')}>
              {awayName}
            </div>
            <div className="live-banner-hero__sub">Away</div>
          </div>
          <span className="live-banner-hero__crest">
            <TeamAvatar
              entryId={featured.awayId}
              name={awayName}
              size="md"
              logoMap={teamLogoMap}
              kitIndexByEntry={kitIndexByEntry}
            />
          </span>
        </div>
      </div>
    </section>
  );
}

function gwLabel(eventSnapshot) {
  const id = Number(eventSnapshot?.id);
  return Number.isFinite(id) ? `GW ${id}` : 'GW';
}
