import {
  fdrTone,
  lastNHistoryRows,
  performanceStatValue,
  summarizeRecentPoints,
  upcomingFixturesNext,
} from './playerDetailDerivations.js'
import { PlayerDetailMiniBars } from './PlayerDetailMiniBars.jsx'

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

function FixtureRow({ row, teamById }) {
  const opp = teamById?.get?.(row.teamId) ?? teamById?.[row.teamId] ?? null
  const oppShort = opp?.short_name ?? '?'
  const crestUrl = plOppCrestUrl(opp?.code)
  return (
    <div className="pdetail-fixrow">
      <span className="pdetail-fixrow__gw">GW{row.gw}</span>
      <span className="pdetail-fixrow__crest" aria-hidden>
        {crestUrl ? <img src={crestUrl} alt="" loading="lazy" decoding="async" /> : null}
      </span>
      <span className="pdetail-fixrow__opp">{oppShort}</span>
      <span className="pdetail-fixrow__ha">{row.home ? 'Home' : 'Away'}</span>
      <span className={`pdetail-fdr pdetail-fdr--${row.difficulty}`}>
        <span className="pdetail-fdr__opp">{oppShort}</span>
        <span className="pdetail-fdr__ha">{row.home ? 'H' : 'A'}</span>
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
 * Season summary tiles + last-5 mini chart + upcoming fixtures sidebar.
 * 1:1 port of the Overview body inside `PlayerDetailDesktop` /
 * `PlayerDetailPortrait` from `web/src/Mockup.jsx`.
 *
 * @param {{
 *   el: object,
 *   summaryPayload: object | null,
 *   teamById: Map<number, object> | null | undefined,
 *   portrait: boolean,
 * }} props
 */
export function PlayerDetailOverview({
  el,
  summaryPayload,
  teamById,
  portrait,
}) {
  const seasonPoints = Number(el?.total_points) || 0
  const seasonMinutes = Number(el?.minutes) || 0
  const seasonGoals = Number(el?.goals_scored) || 0
  const seasonAssists = Number(el?.assists) || 0
  const seasonCs = Number(el?.clean_sheets) || 0
  const seasonBonus = Number(el?.bonus) || 0
  const seasonDc = (() => {
    const direct = Number(el?.defensive_contribution)
    if (Number.isFinite(direct) && direct > 0) return direct
    const history = Array.isArray(summaryPayload?.history) ? summaryPayload.history : []
    let total = 0
    for (const h of history) {
      const v = Number(performanceStatValue('dc', h))
      if (Number.isFinite(v)) total += v
    }
    return total
  })()

  const last5History = lastNHistoryRows(
    Array.isArray(summaryPayload?.history) ? summaryPayload.history : [],
    5,
  )
  const last5Pts = last5History.map((h) =>
    Number(performanceStatValue('pts', h)) || 0,
  )
  const last5Summary = summarizeRecentPoints(last5Pts)
  const upcoming = upcomingFixturesNext(summaryPayload, el?.team, 5)

  if (portrait) {
    return (
      <div className="pdetail-p__body">
        <div className="pdetail-p__section-h">Season summary</div>
        <div className="pdetail-p__tiles">
          <PdetailStatTile k="Points" v={seasonPoints} tone="brand" prefix="" />
          <PdetailStatTile k="Minutes" v={seasonMinutes} />
          <PdetailStatTile k="Goals" v={seasonGoals} />
          <PdetailStatTile k="Assists" v={seasonAssists} />
          <PdetailStatTile k="Clean sheets" v={seasonCs} />
          <PdetailStatTile k="DC total" v={seasonDc} />
          <PdetailStatTile k="Bonus" v={seasonBonus} />
        </div>

        {last5Pts.length > 0 ? (
          <>
            <div className="pdetail-p__section-h">Last 5 gameweeks</div>
            <div className="pdetail-p__chart-wrap">
              <PlayerDetailMiniBars
                values={last5Pts}
                max={Math.max(18, ...last5Pts)}
                width={335}
                height={80}
                accent="pos-neg"
              />
              <div className="pdetail__chart-meta">
                <span>Avg <b>{last5Summary.avg.toFixed(1)}</b></span>
                <span>Last <b>{last5Summary.last}</b></span>
                <span>Total <b>{last5Summary.total}</b></span>
              </div>
            </div>
          </>
        ) : null}

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
        <div className="pdetail__tiles">
          <PdetailStatTile k="Points" v={seasonPoints} tone="brand" />
          <PdetailStatTile k="Minutes" v={seasonMinutes} />
          <PdetailStatTile k="Goals" v={seasonGoals} />
          <PdetailStatTile k="Assists" v={seasonAssists} />
          <PdetailStatTile k="Clean sheets" v={seasonCs} />
          <PdetailStatTile k="DC total" v={seasonDc} />
          <PdetailStatTile k="Bonus" v={seasonBonus} />
        </div>

        {last5Pts.length > 0 ? (
          <>
            <h4 className="pdetail__section-h">Last 5 gameweeks</h4>
            <div className="pdetail__chart-wrap">
              <PlayerDetailMiniBars
                values={last5Pts}
                max={Math.max(18, ...last5Pts)}
                width={460}
                height={92}
                accent="pos-neg"
              />
              <div className="pdetail__chart-meta">
                <span>Avg <b>{last5Summary.avg.toFixed(1)}</b></span>
                <span>Last <b>{last5Summary.last}</b></span>
                <span>Total <b>{last5Summary.total}</b></span>
              </div>
            </div>
          </>
        ) : null}
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
