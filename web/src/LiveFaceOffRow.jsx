import { TeamAvatar } from './TeamAvatar';
import { HeroVillainAvatarFrame } from './HeroVillainAvatarFrame';
import { liveFixtureLead } from './liveScoresDerivations.js';

/**
 * Compact face-off row (desktop wide grid, or mobile compressed) — both
 * variants share a single 1-fr · auto · 1-fr grid and only the size class
 * differs. Used inside `LiveBannerGroup` and the mobile compressed list
 * (mockup `mockup-live-group__row` and `mockup-live-compressed__row`).
 *
 * Winner emphasis follows mockup **Option D** (locked decision): winner's
 * score number rendered in `var(--tclot-logo-purple)`; team names stay
 * equal-weight; no tinted background; no underline.
 *
 * Hero defeat / villain victory narrative badge follows the Variant 1
 * treatment from the mockup HERO/VILLAIN BADGE showcase (locked): the
 * existing avatar is wrapped in a 2px tinted ring with a small emoji dot
 * at bottom-right and a caption pill below it. Both crest columns reserve
 * the caption slot when either side has a status so the avatars stay Y
 * aligned across home/away.
 *
 * @param {{
 *   homeId: number,
 *   awayId: number,
 *   homeName: string,
 *   awayName: string,
 *   homeLive: number | null | undefined,
 *   awayLive: number | null | undefined,
 *   teamLogoMap: object,
 *   kitIndexByEntry?: object,
 *   compact?: boolean,
 *   expanded?: boolean,
 *   bannerExtras?: { home?: React.ReactNode, away?: React.ReactNode },
 *   homeStatus?: 'hero' | 'villain' | null,
 *   awayStatus?: 'hero' | 'villain' | null,
 *   onToggle?: () => void,
 *   ariaControls?: string,
 *   chevronEnd?: React.ReactNode,
 * }} props
 */
export function LiveFaceOffRow({
  homeId,
  awayId,
  homeName,
  awayName,
  homeMgr = null,
  awayMgr = null,
  homeLive,
  awayLive,
  teamLogoMap,
  kitIndexByEntry,
  compact = false,
  expanded = false,
  bannerExtras = {},
  homeStatus = null,
  awayStatus = null,
  onToggle,
  ariaControls,
  chevronEnd = null,
}) {
  const lead = liveFixtureLead(homeLive, awayLive);
  const homeWinner = lead === 'home';
  const awayWinner = lead === 'away';
  const homeScoreLive = homeLive != null;
  const awayScoreLive = awayLive != null;
  const captionSlotVisible = Boolean(homeStatus) || Boolean(awayStatus);

  const RowEl = onToggle ? 'button' : 'div';
  const interactiveProps = onToggle
    ? {
        type: 'button',
        onClick: onToggle,
        'aria-expanded': expanded,
        'aria-controls': ariaControls,
      }
    : {};

  return (
    <RowEl
      className={
        'live-banner-row' +
        (compact ? ' live-banner-row--compact' : '') +
        (onToggle ? ' live-banner-row--toggle' : '') +
        (expanded ? ' live-banner-row--open' : '') +
        (captionSlotVisible ? ' live-banner-row--has-status' : '')
      }
      {...interactiveProps}
    >
      <div className="live-banner-row__side live-banner-row__side--home">
        {bannerExtras.home ?? null}
        <span className="live-banner-row__crest">
          <HeroVillainAvatarFrame
            status={homeStatus}
            size="default"
            captionSlotVisible={captionSlotVisible}
          >
            <TeamAvatar
              entryId={homeId}
              name={homeName}
              size={compact ? 'sm' : 'md'}
              logoMap={teamLogoMap}
              kitIndexByEntry={kitIndexByEntry}
            />
          </HeroVillainAvatarFrame>
        </span>
        <span className="live-banner-row__names">
          <span
            className={
              'live-banner-row__name' +
              (homeWinner ? ' live-banner-row__name--winner' : '') +
              (awayWinner ? ' live-banner-row__name--loser' : '')
            }
          >
            {homeName}
          </span>
        </span>
      </div>

      <div className="live-banner-row__score tabular" aria-label="Gameweek score">
        {homeScoreLive && awayScoreLive ? (
          <>
            <span
              className={
                'live-banner-row__score-half' +
                (homeWinner ? ' live-banner-row__score-half--winner' : '') +
                (awayWinner ? ' live-banner-row__score-half--loser' : '')
              }
            >
              {homeLive}
            </span>
            <span className="live-banner-row__score-sep" aria-hidden="true">
              –
            </span>
            <span
              className={
                'live-banner-row__score-half' +
                (awayWinner ? ' live-banner-row__score-half--winner' : '') +
                (homeWinner ? ' live-banner-row__score-half--loser' : '')
              }
            >
              {awayLive}
            </span>
          </>
        ) : (
          <span className="live-banner-row__score-pending muted">vs</span>
        )}
      </div>

      <div className="live-banner-row__side live-banner-row__side--away">
        <span className="live-banner-row__names live-banner-row__names--away">
          <span
            className={
              'live-banner-row__name' +
              (awayWinner ? ' live-banner-row__name--winner' : '') +
              (homeWinner ? ' live-banner-row__name--loser' : '')
            }
          >
            {awayName}
          </span>
        </span>
        <span className="live-banner-row__crest">
          <HeroVillainAvatarFrame
            status={awayStatus}
            size="default"
            captionSlotVisible={captionSlotVisible}
          >
            <TeamAvatar
              entryId={awayId}
              name={awayName}
              size={compact ? 'sm' : 'md'}
              logoMap={teamLogoMap}
              kitIndexByEntry={kitIndexByEntry}
            />
          </HeroVillainAvatarFrame>
        </span>
        {bannerExtras.away ?? null}
      </div>

      {chevronEnd ?? null}
    </RowEl>
  );
}
