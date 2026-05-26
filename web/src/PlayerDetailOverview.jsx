import {
  countDcThresholdMet,
  countGamesPlayedOver60,
  fdrTone,
  lastFiveGwCards,
  summarizeRecentPoints,
  upcomingFixturesNext,
} from './playerDetailDerivations.js'
import { PlayerDetailLastFiveCards } from './PlayerDetailLastFiveCards.jsx'

/** Standard Premier League 50-px crest URL (smaller variant for fixture rows). */
function plOppCrestUrl(teamCode) {
  if (teamCode == null) return null
  const n = Number(teamCode)
  if (!Number.isFinite(n)) return null
  return `https://resources.premierleague.com/premierleague/badges/50/t${n}.png`
}

function PdetailStatTile({ k, v, tone, prefix = '' }) {
  return (
    <div
      className={
        `${prefix}pdetail-tile` + (tone ? ` ${prefix}pdetail-tile--${tone}` : '')
      }
    >
      <div className={`${prefix}pdetail-tile__v`}>{v}</div>
      <div className={`${prefix}pdetail-tile__k`}>{k}</div>
    </div>
  )
}

/**
 * Single upcoming-fixture row — clean layout per locked Mockup
 * `PdetailFixtures`: GW + 22-px crest + opp short + muted Home/Away
 * + small numbered FDR pip (1-5 ramp). Earlier rebuild rendered the
 * pip as `opp + 'H'/'A'` repeating data already in the row — this
 * version drops that redundancy and uses the digit, matching the
 * `__fdr-legend-chip` treatment from the mockup CSS.
 */
function FixtureRow({ row, teamById }) {
  const opp = teamById?.get?.(row.teamId) ?? teamById?.[row.teamId] ?? null
  const oppShort = opp?.short_name ?? '?'
  const crestUrl = plOppCrestUrl(opp?.code)
  const tone = fdrTone(row.difficulty)
  return (
    <div className="pdetail-fixrow">
      <span className="pdetail-fixrow__gw">GW{row.gw}</span>
      <span className="pdetail-fixrow__crest" aria-hidden>
        {crestUrl ? <img src={crestUrl} alt="" loading="lazy" decoding="async" /> : null}
      </span>
      <span className="pdetail-fixrow__opp">{oppShort}</span>
      <span className="pdetail-fixrow__ha">{row.home ? 'Home' : 'Away'}</span>
      <span
        className={`pdetail-fdr pdetail-fdr--${tone} pdetail-fixrow__fdr`}
        aria-label={`FDR ${tone} ${row.home ? 'home' : 'away'} vs ${oppShort}`}
      >
        {tone}
      </span>
    </div>
  )
}

function FdrLegend() {
  return (
    <div className="pdetail__fdr-legend">
      <span className="pdetail__fdr-legend-k">FDR</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`pdetail-fdr pdetail-fdr--${fdrTone(n)} pdetail__fdr-legend-chip`}
        >
          {n}
        </span>
      ))}
    </div>
  )
}

/**
 * Season summary tiles + last-5 GW opponent-crest cards + upcoming
 * fixtures sidebar. 1:1 port of the Overview body inside
 * `PlayerDetailDesktop` / `PlayerDetailPortrait` from `web/src/Mockup.jsx`,
 * with the locked-mockup-feedback updates:
 *   - tiles: Points · 60+ mins · Goals · Assists · Clean sheets · DC · Bonus
 *   - last 5: opponent-crest cards (not bar chart)
 *
 * @param {{
 *   el: object,
 *   summaryPayload: object | null,
 *   teamById: Map<number, object> | null | undefined,
 *   portrait: boolean,
 *   plFixtures?: Array<object> | null,
 * }} props
 */
export function PlayerDetailOverview({
  el,
  summaryPayload,
  teamById,
  portrait,
  plFixtures = null,
}) {
  const elementType = el?.element_type
  const seasonPoints = Number(el?.total_points) || 0
  const seasonGoals = Number(el?.goals_scored) || 0
  const seasonAssists = Number(el?.assists) || 0
  const seasonCs = Number(el?.clean_sheets) || 0
  const seasonBonus = Number(el?.bonus) || 0
  const history = Array.isArray(summaryPayload?.history) ? summaryPayload.history : []
  const games60 = countGamesPlayedOver60(history)
  const dcQualifyingGames = countDcThresholdMet(history, elementType)

  const last5Cards = lastFiveGwCards(history, elementType, 5, {
    plFixtures,
    playerTeamId: el?.team,
  })
  const last5Pts = last5Cards.map((c) => (c.points == null ? 0 : c.points))
  const last5Summary = summarizeRecentPoints(last5Pts)
  const upcoming = upcomingFixturesNext(summaryPayload, el?.team, 5)

  const tiles = (
    <>
      <PdetailStatTile k="Points"   v={seasonPoints}        tone="brand" prefix={portrait ? '' : ''} />
      <PdetailStatTile k="60+ mins" v={games60} />
      <PdetailStatTile k="Goals"    v={seasonGoals} />
      <PdetailStatTile k="Assists"  v={seasonAssists} />
      <PdetailStatTile k="Clean sheets" v={seasonCs} />
      <PdetailStatTile k="DC"       v={dcQualifyingGames} />
      <PdetailStatTile k="Bonus"    v={seasonBonus} />
    </>
  )

  const lastFiveBlock =
    last5Cards.length > 0 ? (
      <>
        <h4 className={portrait ? 'pdetail-p__section-h' : 'pdetail__section-h'}>
          Last 5 gameweeks
        </h4>
        <PlayerDetailLastFiveCards cards={last5Cards} teamById={teamById} />
        <div className="pdetail__chart-meta pdetail-l5__meta">
          <span>Avg <b>{last5Summary.avg.toFixed(1)}</b></span>
          <span>Total <b>{last5Summary.total}</b></span>
        </div>
      </>
    ) : null

  if (portrait) {
    return (
      <div className="pdetail-p__body">
        <div className="pdetail-p__section-h">Season summary</div>
        <div className="pdetail-p__tiles">{tiles}</div>

        {lastFiveBlock}

        {upcoming.length > 0 ? (
          <>
            <div className="pdetail-p__section-h">Upcoming fixtures</div>
            <div className="pdetail-fixrows">
              {upcoming.map((row) => (
                <FixtureRow key={row.gw} row={row} teamById={teamById} />
              ))}
            </div>
            <div className="pdetail-p__legend-wrap">
              <FdrLegend />
            </div>
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div className="pdetail__body">
      <div className="pdetail__col pdetail__col--main">
        <h4 className="pdetail__section-h">Season summary</h4>
        <div className="pdetail__tiles">{tiles}</div>

        {lastFiveBlock}
      </div>

      {upcoming.length > 0 ? (
        <div className="pdetail__col pdetail__col--side">
          <h4 className="pdetail__section-h">Upcoming fixtures</h4>
          <div className="pdetail-fixrows">
            {upcoming.map((row) => (
              <FixtureRow key={row.gw} row={row} teamById={teamById} />
            ))}
          </div>
          <FdrLegend />
        </div>
      ) : null}
    </div>
  )
}
