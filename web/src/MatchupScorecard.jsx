import { FittedTeamName } from './LiveFaceOffRow.jsx';
import { TeamAvatar } from './TeamAvatar';
import { HeroVillainAvatarFrame } from './HeroVillainAvatarFrame.jsx';
import { liveFixtureLead } from './liveScoresDerivations.js';
import { englishOrdinal } from './playerContributionEvents.js';
import './LiveOddsSection.css';

/**
 * Shared H2H matchup "scorecard" presentation (the `.lo-*` card look locked
 * on the Live Odds tile): tinted meta strip (seed label + to-play counts),
 * edge-aligned crest/name/score header with the winner glass pill, and the
 * win-probability text + hairline strip. Used by BOTH:
 *
 *  - the Scores tab's Live Scores fixture list (via {@link MatchupScorecard},
 *    where tapping a card opens that fixture's game card — mobile swipe deck
 *    or desktop fixture page); and
 *  - the Live Odds tile (which composes {@link MatchupMeta},
 *    {@link MatchupHeader} and {@link WinPcts} directly inside its own
 *    expand/collapse toggle).
 */

/**
 * Tinted banner strip opening each matchup card (combined-cards mockup "C"):
 * the seeding label ("1st vs 5th", each team's live competition rank) as
 * faded ghost text on the left, and the to-play counts ("10 v 11 to play",
 * flipping to "FT" once both sides are done) in the SAME ghost treatment on
 * the right. Either side renders independently — a missing rank (off-season
 * standings) or missing squad payload never blanks the whole strip. Renders
 * nothing when neither label is available.
 */
export function MatchupMeta({ fixture: f, liveRankByEntry }) {
  const homeRank = Number(liveRankByEntry?.[f.homeId]);
  const awayRank = Number(liveRankByEntry?.[f.awayId]);
  const seedLabel =
    Number.isFinite(homeRank) && Number.isFinite(awayRank)
      ? `${englishOrdinal(homeRank)} vs ${englishOrdinal(awayRank)}`
      : null;
  const hasRemaining =
    f.homeRemaining != null &&
    Number.isFinite(Number(f.homeRemaining)) &&
    f.awayRemaining != null &&
    Number.isFinite(Number(f.awayRemaining));
  const toPlayLabel = hasRemaining
    ? Number(f.homeRemaining) === 0 && Number(f.awayRemaining) === 0
      ? 'FT'
      : `${f.homeRemaining} v ${f.awayRemaining} to play`
    : null;
  if (!seedLabel && !toPlayLabel) return null;
  return (
    <div className="lo-meta">
      <span className="lo-meta__text">{seedLabel}</span>
      {toPlayLabel ? <span className="lo-meta__text">{toPlayLabel}</span> : null}
    </div>
  );
}

/**
 * Crest slot for one side of the header. When the side carries a hero /
 * villain narrative status the avatar keeps the Variant 1 tinted ring
 * (compact variant — ring only, no caption slot); otherwise the avatar
 * renders untreated.
 */
function MatchupCrest({ entryId, name, status, teamLogoMap, kitIndexByEntry }) {
  const avatar = (
    <TeamAvatar
      entryId={entryId}
      name={name}
      size="sm"
      logoMap={teamLogoMap}
      kitIndexByEntry={kitIndexByEntry}
    />
  );
  return (
    <span className="lo-hdr__crest">
      {status ? (
        <HeroVillainAvatarFrame status={status} size="compact">
          {avatar}
        </HeroVillainAvatarFrame>
      ) : (
        avatar
      )}
    </span>
  );
}

/**
 * Edge-aligned matchup header (mockup "C2"): crest pinned to the outer edge,
 * fitted team name beside it, and the score alone in the centre with the
 * Scores-tab winner "glass" pill behind the leading number. Reads left →
 * right with no full-width bars competing for the same line.
 *
 * `homeDisplayName` / `awayDisplayName` (optional) feed the fitted name's
 * preferred candidate — the Scores list passes the curated mobile short
 * label there so phones try e.g. `Mordor SFG` before falling back further.
 * `homeStatus` / `awayStatus` (optional) add the hero/villain avatar ring.
 */
export function MatchupHeader({
  fixture: f,
  teamLogoMap,
  kitIndexByEntry,
  homeDisplayName,
  awayDisplayName,
  homeStatus = null,
  awayStatus = null,
}) {
  const lead = liveFixtureLead(f.homeLive, f.awayLive);
  const bothScores = f.homeLive != null && f.awayLive != null;
  return (
    <div className="lo-hdr">
      <div className="lo-hdr__side">
        <MatchupCrest
          entryId={f.homeId}
          name={f.homeName}
          status={homeStatus}
          teamLogoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
        />
        <FittedTeamName
          className="lo-hdr__name"
          fullName={f.homeName}
          displayName={homeDisplayName}
          title={f.homeName}
        />
      </div>
      <div className="lo-hdr__score" aria-label="Gameweek score">
        {bothScores ? (
          <>
            <span
              className={
                'lo-hdr__half' + (lead === 'home' ? ' lo-hdr__half--winner' : '')
              }
            >
              {f.homeLive}
            </span>
            <span className="lo-hdr__sep" aria-hidden="true">
              –
            </span>
            <span
              className={
                'lo-hdr__half' + (lead === 'away' ? ' lo-hdr__half--winner' : '')
              }
            >
              {f.awayLive}
            </span>
          </>
        ) : (
          <span className="lo-hdr__pending muted">vs</span>
        )}
      </div>
      <div className="lo-hdr__side lo-hdr__side--away">
        <FittedTeamName
          className="lo-hdr__name"
          fullName={f.awayName}
          displayName={awayDisplayName}
          title={f.awayName}
        />
        <MatchupCrest
          entryId={f.awayId}
          name={f.awayName}
          status={awayStatus}
          teamLogoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
        />
      </div>
    </div>
  );
}

/**
 * Win probability, mockup "C2" treatment: the percentages live as TEXT at
 * the two ends of a quiet 7px three-segment strip (home / draw / away),
 * favourite (highest probability, ties share it) coloured to MATCH the
 * strip's favourite segment. The draw share keeps its segment in the strip
 * but gets no text label (combined-cards mockup "C"); it stays in the
 * aria-label for screen readers.
 */
export function WinPcts({ probs, homeName, awayName }) {
  const h = Number(probs.homeWinPct) || 0;
  const d = Number(probs.drawPct) || 0;
  const a = Number(probs.awayWinPct) || 0;
  const max = Math.max(h, d, a);
  const fav = (pct) => max > 0 && pct === max;
  return (
    <>
      <div
        className="lo-pcts"
        aria-label={`Win probability — ${homeName} ${Math.round(h)}%, draw ${Math.round(d)}%, ${awayName} ${Math.round(a)}%`}
      >
        <span className={'lo-pcts__side' + (fav(h) ? ' lo-pcts__side--fav' : '')}>
          {Math.round(h)}%<span className="lo-pcts__w">win</span>
        </span>
        <span className={'lo-pcts__side' + (fav(a) ? ' lo-pcts__side--fav' : '')}>
          <span className="lo-pcts__w">win</span>
          {Math.round(a)}%
        </span>
      </div>
      <div className="lo-strip" aria-hidden="true">
        <span
          className={'lo-strip__seg' + (fav(h) ? ' lo-strip__seg--fav' : '')}
          style={{ width: `${h}%` }}
        />
        <span
          className={'lo-strip__seg' + (fav(d) ? ' lo-strip__seg--fav' : '')}
          style={{ width: `${d}%` }}
        />
        <span
          className={'lo-strip__seg' + (fav(a) ? ' lo-strip__seg--fav' : '')}
          style={{ width: `${a}%` }}
        />
      </div>
    </>
  );
}

/**
 * Composed scorecard — one full `.lo-matchup` card (meta strip + header +
 * optional win-probability block). With `onClick` the whole card becomes a
 * single navigation button (`.lo-matchup--nav`): the Live Scores list uses
 * this to open the tapped fixture's game card (mobile swipe deck / desktop
 * fixture page). `probs` is optional — finished gameweeks and missing
 * forecast payloads simply omit the win-probability block.
 *
 * @param {{
 *   fixture: object,            // cardFixtures row from LiveScores
 *   probs?: object | null,      // h2hWinProbs() result, or null to omit
 *   liveRankByEntry?: object,   // entry id → live competition rank
 *   teamLogoMap: object,
 *   kitIndexByEntry?: object,
 *   homeDisplayName?: string,
 *   awayDisplayName?: string,
 *   homeStatus?: 'hero' | 'villain' | null,
 *   awayStatus?: 'hero' | 'villain' | null,
 *   onClick?: () => void,
 *   className?: string,
 * }} props
 */
export function MatchupScorecard({
  fixture,
  probs = null,
  liveRankByEntry,
  teamLogoMap,
  kitIndexByEntry,
  homeDisplayName,
  awayDisplayName,
  homeStatus = null,
  awayStatus = null,
  onClick,
  className,
}) {
  const Head = onClick ? 'button' : 'div';
  return (
    <div
      className={
        'lo-matchup' +
        (onClick ? ' lo-matchup--nav' : '') +
        (className ? ' ' + className : '')
      }
    >
      <Head
        className="lo-matchup__head"
        {...(onClick ? { type: 'button', onClick } : {})}
      >
        <MatchupMeta fixture={fixture} liveRankByEntry={liveRankByEntry} />
        <MatchupHeader
          fixture={fixture}
          teamLogoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
          homeDisplayName={homeDisplayName}
          awayDisplayName={awayDisplayName}
          homeStatus={homeStatus}
          awayStatus={awayStatus}
        />
        {probs ? (
          <WinPcts
            probs={probs}
            homeName={fixture.homeName}
            awayName={fixture.awayName}
          />
        ) : null}
      </Head>
    </div>
  );
}
