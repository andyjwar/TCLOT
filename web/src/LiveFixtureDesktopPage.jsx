import { useEffect, useState } from 'react';
import { TeamAvatar } from './TeamAvatar';
import { LiveFixtureMatchSplit } from './LiveFixtureMatchSplit.jsx';
import { LiveExpandedFixture } from './LiveExpandedFixture.jsx';
import { LiveFixtureKeyStats } from './LiveFixtureKeyStats.jsx';
import { LiveFixtureH2hBars } from './LiveFixtureH2hBars.jsx';
import { LiveFixtureOdds } from './LiveFixtureOdds.jsx';
import { LiveFixtureSeasonH2h } from './LiveFixtureSeasonH2h.jsx';
import { LiveStandingsTable } from './LiveStandingsTable.jsx';
import { FIXTURE_CARD_TABS } from './liveFixtureCardTabs.js';

/**
 * Desktop / tablet fixture page — a full-width takeover that replaces the
 * Scores stack when a fixture row is clicked. Mirrors the phone card's
 * structure instead of inventing its own: a hero score strip, then the same
 * Match / Lineups / Stats / Odds / Table tab strip, then one pane at a time.
 * The old stacked two-column layout (everything at once + stats rail) read
 * as a wall on iPads.
 *
 * Pane mapping vs the phone card:
 *   - Match   → `LiveFixtureMatchSplit` (compact split columns + events band),
 *               width-capped so it doesn't stretch across a monitor.
 *   - Lineups → the detailed side-by-side `LiveExpandedFixture` desktop
 *               tables (the phone card shows one team at a time; here both
 *               fit untruncated at full page width).
 *   - Stats   → Key Stats + season H2H bars + Season H2H chips as a card grid.
 *   - Odds    → win probability + projections.
 *   - Table   → the live standings table.
 *
 * Scrolls as a normal document; Back (button or Esc) returns to the
 * fixtures list. Phones keep the swipeable card deck.
 */
export function LiveFixtureDesktopPage({ fixture, ctx, onBack }) {
  const [tab, setTab] = useState('match');

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

  /**
   * One hero side: crest nearest the score, with the name stacked over the
   * "N to play" note. Home mirrors away so both groups hug the centre.
   */
  const heroSide = (which) => {
    const isHome = which === 'home';
    const remaining = isHome ? homeRemaining : awayRemaining;
    const crest = (
      <TeamAvatar
        entryId={isHome ? homeId : awayId}
        name={isHome ? homeName : awayName}
        size="md"
        logoMap={ctx.teamLogoMap}
        kitIndexByEntry={ctx.kitIndexByEntry}
      />
    );
    const text = (
      <span className="lfxp-hero__teamtext">
        <span className="lfxp-hero__name">{isHome ? homeName : awayName}</span>
        <span
          className={
            'lfxp-hero__sub' + (remaining != null && remaining > 0 ? ' is-live' : '')
          }
        >
          {remaining != null && remaining > 0 ? `${remaining} to play` : '\u00a0'}
        </span>
      </span>
    );
    return (
      <div className={`lfxp-hero__side lfxp-hero__side--${which}`}>
        {isHome ? (
          <>
            {text}
            {crest}
          </>
        ) : (
          <>
            {crest}
            {text}
          </>
        )}
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
      {/* Hero + tab strip share one gradient band so the pills sit on the
          same dark surface as on the phone card. */}
      <div className="lfxp-head">
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
        <div className="lfc-tabs lfxp-tabs" role="tablist">
          {FIXTURE_CARD_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={'lfc-tab' + (tab === t.id ? ' is-active' : '')}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'match' ? (
        <div className="lfxp-pane lfxp-pane--match">
          <LiveFixtureMatchSplit
            fixture={fixture}
            ctx={ctx}
            onOpenPlayer={ctx.onOpenPlayer}
          />
        </div>
      ) : null}

      {tab === 'lineups' ? (
        <div className="lfxp-pane lfxp-pane--lineups">
          <LiveExpandedFixture
            homeSquad={homeSquad}
            awaySquad={awaySquad}
            homeName={homeName}
            awayName={awayName}
            viewport="desktop"
            onOpenPlayer={ctx.onOpenPlayer}
          />
        </div>
      ) : null}

      {tab === 'stats' ? (
        <div className="lfxp-pane lfxp-pane--stats">
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
        </div>
      ) : null}

      {tab === 'odds' ? (
        <div className="lfxp-pane lfxp-pane--odds">
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
      ) : null}

      {tab === 'table' ? (
        <div className="lfxp-pane lfxp-pane--table">
          <LiveStandingsTable
            liveStandingsRows={ctx.liveStandingsRows}
            gwStandingsFrozen={ctx.gwStandingsFrozen}
            gameweek={ctx.gameweek}
            teams={ctx.teams}
            teamLogoMap={ctx.teamLogoMap}
            kitIndexByEntry={ctx.kitIndexByEntry}
          />
        </div>
      ) : null}
    </section>
  );
}
