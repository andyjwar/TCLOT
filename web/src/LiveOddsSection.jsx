import { useMemo, useState } from 'react';
import { FittedTeamName } from './LiveFaceOffRow.jsx';
import { LiveFixtureCompareRow } from './LiveFixtureKeyStats.jsx';
import { TeamAvatar } from './TeamAvatar';
import { usePredictions } from './usePredictions.js';
import { predictionsById, h2hWinProbs } from './forecastHelpers.js';
import { effectiveStartersForCard } from './liveFixtureCardDerivations.js';
import { teamProjection, teamReturns, anyFixtureLive } from './liveBlend.js';
import { liveFixtureLead } from './liveScoresDerivations.js';
import './LiveFixtureCard.css';
import './LiveOddsSection.css';

/** Route chip glyph + colour class — mirrors the fixture-card Odds tab. */
const ROUTE = {
  goal: { text: '⚽', cls: 'lfc-rt--goal' },
  assist: { text: 'A', cls: 'lfc-rt--assist' },
  cs: { text: 'CS', cls: 'lfc-rt--cs' },
};

/**
 * Edge-aligned matchup header (mockup "C2"): crest pinned to the outer edge,
 * fitted team name beside it, and the score alone in the centre with the
 * Scores-tab winner "glass" pill behind the leading number. Reads left →
 * right with no full-width bars competing for the same line.
 */
function MatchupHeader({ fixture: f, teamLogoMap, kitIndexByEntry }) {
  const lead = liveFixtureLead(f.homeLive, f.awayLive);
  const bothScores = f.homeLive != null && f.awayLive != null;
  return (
    <div className="lo-hdr">
      <div className="lo-hdr__side">
        <span className="lo-hdr__crest">
          <TeamAvatar
            entryId={f.homeId}
            name={f.homeName}
            size="sm"
            logoMap={teamLogoMap}
            kitIndexByEntry={kitIndexByEntry}
          />
        </span>
        <FittedTeamName
          className="lo-hdr__name"
          fullName={f.homeName}
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
          title={f.awayName}
        />
        <span className="lo-hdr__crest">
          <TeamAvatar
            entryId={f.awayId}
            name={f.awayName}
            size="sm"
            logoMap={teamLogoMap}
            kitIndexByEntry={kitIndexByEntry}
          />
        </span>
      </div>
    </div>
  );
}

/**
 * Win probability, mockup "C2" treatment: the percentages live as TEXT at
 * the two ends of a quiet 7px three-segment strip (home / draw / away),
 * favourite (highest probability, ties share it) coloured in the brand
 * accent, draw as a small caption in the middle. Same segment colour
 * language as the Odds-tab bar, minus the heavy 26px block.
 */
function WinPcts({ probs, homeName, awayName }) {
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
        <span className={'lo-pcts__draw' + (fav(d) ? ' lo-pcts__draw--fav' : '')}>
          draw {Math.round(d)}%
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

/** One manager's "most likely to return" column — mirrors the Odds tab. */
function ReturnsColumn({ entryId, name, picks, teamLogoMap, kitIndexByEntry }) {
  return (
    <div className="lfc-ret__col">
      <div className="lfc-ret__team">
        <span className="lfc-ret__badge">
          <TeamAvatar
            entryId={entryId}
            name={name}
            size="sm"
            logoMap={teamLogoMap}
            kitIndexByEntry={kitIndexByEntry}
          />
        </span>
        <span className="lfc-ret__teamname">{name}</span>
      </div>
      {picks.length === 0 ? (
        <p className="lfc-ret__empty">No likely returns.</p>
      ) : (
        picks.map((p) => {
          const route = ROUTE[p.route] ?? ROUTE.goal;
          return (
            <div className="lfc-ret__row" key={p.id}>
              <span className="lfc-ret__name">{p.name}</span>
              <span className={'lfc-ret__chip ' + route.cls}>
                {route.text} {p.returnPct}%
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * "Live Odds" tile for the Scores tab — sits below the Points Feed and
 * collects every H2H matchup's odds in one place.
 *
 * Each matchup renders the mockup-C2 header ({@link MatchupHeader}: crests
 * on the outer edges, fitted last-word team names, centred score with the
 * winner glass pill) over the headline **live** win probability shown as
 * text percentages flanking a quiet hairline strip ({@link WinPcts}).
 * Tapping a matchup expands it to Projected points (Live and Pre-Match
 * compare rows, same accents as the fixture-card Odds tab) plus "Most
 * likely to return" route chips (always the pre-match forecast, as on the
 * Odds tab).
 *
 * Before the first kick-off the headline falls back to the pre-match
 * forecast (no live dot, no Live row). Renders nothing for finished
 * gameweeks (the fixture card's Odds tab covers the settled view) or when
 * the forecast payload is missing.
 *
 * @param {{
 *   fixtures: Array<object>,   // cardFixtures rows from LiveScores
 *   gameweek: number | null,
 *   gwFinished: boolean,
 *   teamLogoMap: object,
 *   kitIndexByEntry?: object,
 * }} props
 */
export function LiveOddsSection({
  fixtures,
  gameweek,
  gwFinished,
  teamLogoMap,
  kitIndexByEntry,
}) {
  const { predictions, loading } = usePredictions();
  const [openKeys, setOpenKeys] = useState(() => new Set());

  const computed = useMemo(() => {
    if (gwFinished) return null;
    if (!predictions?.players?.length) return null;
    if (!fixtures?.length) return null;
    const byId = predictionsById(predictions);
    const gw = predictions.gameweek ?? null;
    const gwMismatch =
      gw != null && gameweek != null && Number(gw) !== Number(gameweek);
    const models = new Map();
    for (const f of fixtures) {
      const { homeSquad, awaySquad } = f;
      if (!homeSquad || homeSquad.error || !awaySquad || awaySquad.error) continue;
      const homeRows = effectiveStartersForCard(homeSquad);
      const awayRows = effectiveStartersForCard(awaySquad);
      const live = !gwMismatch && anyFixtureLive(homeRows, awayRows);
      const pre = {
        home: teamProjection(homeRows, byId, 'prematch'),
        away: teamProjection(awayRows, byId, 'prematch'),
      };
      if (pre.home.matched === 0 && pre.away.matched === 0) continue;
      const liveData = live
        ? {
            home: teamProjection(homeRows, byId, 'live'),
            away: teamProjection(awayRows, byId, 'live'),
          }
        : null;
      const headline = liveData ?? pre;
      models.set(f.key, {
        live,
        probs: h2hWinProbs(headline.home, headline.away),
        pre,
        liveData,
        homeReturns: teamReturns(homeRows, byId, 'prematch', 'home', 3),
        awayReturns: teamReturns(awayRows, byId, 'prematch', 'away', 3),
      });
    }
    if (models.size === 0) return null;
    return { gwMismatch, forecastGw: gw, models };
  }, [predictions, fixtures, gameweek, gwFinished]);

  if (loading || !computed) return null;

  const anyLive = [...computed.models.values()].some((m) => m.live);
  const f1 = (v) => (Number(v) || 0).toFixed(1);
  const toggle = (key) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section
      className="tile tile--compact live-odds-tile"
      aria-labelledby="live-odds-heading"
    >
      <div className="tile-head-row tile-head-row--tight lo-head-row">
        <h2 id="live-odds-heading" className="tile-title tile-title--sm lo-title">
          {anyLive ? <span className="lo-live-dot" aria-hidden="true" /> : null}
          Live Odds
        </h2>
        <span className="lo-gwcap">
          GW{gameweek}
          {anyLive ? ' · updates live' : ''}
        </span>
      </div>
      <p className="lo-sub muted">
        {computed.gwMismatch
          ? `Projections shown are the pre-match forecast for GW${computed.forecastGw}.`
          : `Win probability from the ${anyLive ? 'live' : 'pre-match'} projection model. Tap a matchup for the full odds.`}
      </p>

      {fixtures.map((f) => {
        const model = computed.models.get(f.key);
        if (!model) return null;
        const isOpen = openKeys.has(f.key);
        const bodyId = `lo-body-${f.key}`;
        return (
          <div
            key={f.key}
            className={'lo-matchup' + (isOpen ? ' lo-matchup--open' : '')}
          >
            <button
              type="button"
              className="lo-matchup__head"
              onClick={() => toggle(f.key)}
              aria-expanded={isOpen}
              aria-controls={bodyId}
            >
              <MatchupHeader
                fixture={f}
                teamLogoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
              <WinPcts
                probs={model.probs}
                homeName={f.homeName}
                awayName={f.awayName}
              />
            </button>
            {isOpen ? (
              <div className="lo-matchup__body" id={bodyId}>
                <h3 className="lfc-block__h lfc-block__h--left">
                  Projected points
                </h3>
                {model.live && model.liveData ? (
                  <LiveFixtureCompareRow
                    className="lfc-cmp--live"
                    label="Live"
                    home={model.liveData.home.mu}
                    away={model.liveData.away.mu}
                    homeText={f1(model.liveData.home.mu)}
                    awayText={f1(model.liveData.away.mu)}
                  />
                ) : null}
                <LiveFixtureCompareRow
                  label="Pre-Match"
                  home={model.pre.home.mu}
                  away={model.pre.away.mu}
                  homeText={f1(model.pre.home.mu)}
                  awayText={f1(model.pre.away.mu)}
                />
                {!model.live ? (
                  <p className="lfc-seg__hint">
                    Live projections unlock once the first match kicks off
                  </p>
                ) : null}
                <h3 className="lfc-block__h lfc-block__h--left lo-matchup__ret-h">
                  Most likely to return
                </h3>
                <div className="lfc-ret__cols">
                  <ReturnsColumn
                    entryId={f.homeId}
                    name={f.homeName}
                    picks={model.homeReturns}
                    teamLogoMap={teamLogoMap}
                    kitIndexByEntry={kitIndexByEntry}
                  />
                  <ReturnsColumn
                    entryId={f.awayId}
                    name={f.awayName}
                    picks={model.awayReturns}
                    teamLogoMap={teamLogoMap}
                    kitIndexByEntry={kitIndexByEntry}
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
