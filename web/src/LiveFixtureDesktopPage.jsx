import { useEffect } from 'react';
import { TeamAvatar } from './TeamAvatar';
import { LiveFixtureMatchSplit } from './LiveFixtureMatchSplit.jsx';
import { LiveFixtureKeyStats } from './LiveFixtureKeyStats.jsx';
import { LiveFixtureH2hBars } from './LiveFixtureH2hBars.jsx';
import { LiveFixtureOdds } from './LiveFixtureOdds.jsx';
import { LiveFixtureSeasonH2h } from './LiveFixtureSeasonH2h.jsx';

/**
 * Desktop fixture page — a full-width takeover that replaces the Scores
 * stack when a fixture row is clicked (FotMob-desktop style). Instead of
 * transplanting the phone card's tab strip, it lays the panes out for width:
 * a hero score strip, then Match split on the left with Key Stats / season
 * H2H / Odds in a right rail. Scrolls as a normal document; Back (button or
 * Esc) returns to the fixtures list. Phones keep the swipeable card deck.
 */
export function LiveFixtureDesktopPage({ fixture, ctx, onBack }) {
  // Esc backs out, matching the card deck's dismissal affordance.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const {
    homeId,
    awayId,
    homeName,
    awayName,
    homeSquad,
    awaySquad,
    homeLive,
    awayLive,
    homeRemaining,
    awayRemaining,
    comp,
  } = fixture;

  const toPlay = (Number(homeRemaining) || 0) + (Number(awayRemaining) || 0);
  const live = toPlay > 0;
  const finished =
    !live &&
    (ctx.gwFinished === true || (homeRemaining === 0 && awayRemaining === 0));

  const heroSide = (which) => {
    const isHome = which === 'home';
    const remaining = isHome ? homeRemaining : awayRemaining;
    return (
      <div className={`lfxp-hero__side lfxp-hero__side--${which}`}>
        <TeamAvatar
          entryId={isHome ? homeId : awayId}
          name={isHome ? homeName : awayName}
          size="md"
          logoMap={ctx.teamLogoMap}
          kitIndexByEntry={ctx.kitIndexByEntry}
        />
        <span className="lfxp-hero__name">{isHome ? homeName : awayName}</span>
        <span
          className={
            'lfxp-hero__sub' + (remaining != null && remaining > 0 ? ' is-live' : '')
          }
        >
          {remaining != null && remaining > 0 ? `${remaining} to play` : '\u00a0'}
        </span>
      </div>
    );
  };

  return (
    <section className="tile tile--compact lfx-page" aria-label={`${homeName} vs ${awayName}`}>
      <div className="lfx-page__topbar">
        <button type="button" className="lfxp-back" onClick={onBack}>
          <span aria-hidden="true">‹</span> All fixtures
        </button>
        <span className="lfxp-comp">{comp}</span>
      </div>
      <div className="lfxp-hero">
        {heroSide('home')}
        <div className="lfxp-hero__mid">
          <span className="lfxp-hero__score tabular">
            {homeLive ?? '—'}
            <span className="lfxp-hero__dash">–</span>
            {awayLive ?? '—'}
          </span>
          <span
            className={'lfxp-hero__status' + (live ? ' is-live' : '')}
          >
            {live ? '● LIVE' : finished ? 'FT' : '—'}
          </span>
        </div>
        {heroSide('away')}
      </div>
      <div className="lfxp-cols">
        <div className="lfxp-col lfxp-col--main">
          <LiveFixtureMatchSplit
            fixture={fixture}
            ctx={ctx}
            onOpenPlayer={ctx.onOpenPlayer}
          />
        </div>
        <div className="lfxp-col lfxp-col--side">
          <LiveFixtureKeyStats homeSquad={homeSquad} awaySquad={awaySquad} />
          <LiveFixtureH2hBars
            matches={ctx.matches}
            homeId={homeId}
            awayId={awayId}
            homeName={homeName}
            awayName={awayName}
          />
          <LiveFixtureSeasonH2h
            homeId={homeId}
            awayId={awayId}
            homeName={homeName}
            awayName={awayName}
            matches={ctx.matches}
            gameweek={ctx.gameweek}
            liveHomePts={homeLive}
            liveAwayPts={awayLive}
            selectedGwFinished={Boolean(ctx.gwFinished)}
            teamLogoMap={ctx.teamLogoMap}
            kitIndexByEntry={ctx.kitIndexByEntry}
          />
          <LiveFixtureOdds
            homeSquad={homeSquad}
            awaySquad={awaySquad}
            homeId={homeId}
            awayId={awayId}
            homeName={homeName}
            awayName={awayName}
            ctx={ctx}
          />
        </div>
      </div>
    </section>
  );
}
