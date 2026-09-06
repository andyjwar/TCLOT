import { useMemo, useState } from 'react'
import {
  fixtureTablePtsLabel,
  fixtureTableSummary,
  fixturesForGw,
  formatSatPlayers,
} from './benchPoints.js'
import { formatSwing, leaguePtsFromRecord } from './bestXi.js'
import { CompactSelectPill } from './CompactSelectPill.jsx'
import { TeamAvatar } from './TeamAvatar'
import { ClickableTeamName } from './TeamDetailOverlay.jsx'
import { firstWord } from './teamNameUtils.js'
import { useBenchPoints } from './useBenchPoints.js'
import { useMobileNarrowViewport } from './usePortraitMobile'

function scoreText(a, b) {
  return `${a}–${b}`
}

function tablePtsForRow(row) {
  if (row?.actualLeaguePts != null) return Number(row.actualLeaguePts) || 0
  return leaguePtsFromRecord({
    w: row?.actualW,
    d: row?.actualD,
    l: row?.actualL,
  })
}

function bestTablePtsForRow(row) {
  if (row?.bestLeaguePts != null) return Number(row.bestLeaguePts) || 0
  return leaguePtsFromRecord({
    w: row?.bestW,
    d: row?.bestD,
    l: row?.bestL,
  })
}

function swingForRow(row) {
  if (row?.leaguePtsSwing != null) return Number(row.leaguePtsSwing) || 0
  return bestTablePtsForRow(row) - tablePtsForRow(row)
}


/**
 * Stats → bench points: leftover FPL + table-pts (3/1/0) comparison.
 *
 * @param {object} props
 * @param {Record<string, string>} props.teamLogoMap
 * @param {Record<number, number>} props.kitIndexByEntry
 */
export function StandingsBenchPoints({ teamLogoMap = {}, kitIndexByEntry = {} }) {
  const isMobileNarrow = useMobileNarrowViewport()
  const { report, loading } = useBenchPoints(true)
  const gameweeks = report?.gameweeks || []
  const latestGw = gameweeks.length ? gameweeks[gameweeks.length - 1] : null
  const [gwPick, setGwPick] = useState(/** @type {number | null} */ (null))
  const gw =
    gwPick != null && gameweeks.includes(gwPick) ? gwPick : latestGw

  const teamRows = report?.teams || []
  const maxLeft = useMemo(() => {
    let max = 0
    for (const r of teamRows) {
      const n = Number(r?.benchLeft) || 0
      if (n > max) max = n
    }
    return max
  }, [teamRows])

  const gwFixtures = useMemo(
    () => (gw != null ? fixturesForGw(report?.fixtures || [], gw) : []),
    [report, gw],
  )

  const gwOptions = useMemo(
    () => gameweeks.map((n) => ({ value: n, label: `GW ${n}` })),
    [gameweeks],
  )

  const worst = teamRows[0]
  const biggestSwing = useMemo(() => {
    let best = null
    for (const r of teamRows) {
      const swing = swingForRow(r)
      if (!best || swing > swingForRow(best)) best = r
    }
    return best && swingForRow(best) > 0 ? best : null
  }, [teamRows])

  const hasData = teamRows.some((r) => (r.weeksPlayed ?? 0) > 0)

  return (
    <section
      className="standings-stats__section standings-stats__section--bench"
      aria-labelledby="standings-stats-bench-heading"
    >
      <h3 id="standings-stats-bench-heading" className="standings-stats-eyebrow">
        Points left on the bench
      </h3>
      <p className="standings-stats-hint">
        Unused is FPL points a better legal XI would have scored (autosubs
        already count). Table is the real standings: 3 for a win, 1 for a
        draw. If XI is that same table if every finished fixture used both
        sides' best legal 11.
      </p>

      {loading ? (
        <p className="muted muted--tight">Loading bench points…</p>
      ) : !hasData ? (
        <p className="muted muted--tight">
          No finished gameweeks to score yet.
        </p>
      ) : (
        <>
          {worst && worst.benchLeft > 0 ? (
            <p className="standings-bench__callout">
              Most unused FPL points:{' '}
              <strong>{worst.teamName}</strong> ({worst.benchLeft} across{' '}
              {worst.weeksPlayed} GW
              {worst.weeksPlayed === 1 ? '' : 's'}).
              {biggestSwing ? (
                <>
                  {' '}
                  Biggest table swing:{' '}
                  <strong>{biggestSwing.teamName}</strong> (
                  {formatSwing(swingForRow(biggestSwing))} table pt
                  {Math.abs(swingForRow(biggestSwing)) === 1 ? '' : 's'}).
                </>
              ) : null}
            </p>
          ) : (
            <p className="standings-bench__callout">
              Nobody left usable FPL points on the bench in finished gameweeks.
            </p>
          )}

          <div className="table-scroll table-scroll--win-margin">
            <table className="win-margin-table standings-stats-bench-table">
              <thead>
                <tr>
                  <th scope="col" className="win-margin-table__team">
                    Team
                  </th>
                  <th
                    scope="col"
                    className="win-margin-table__n tabular"
                    title="FPL points a legal best XI would have added after autosubs"
                  >
                    Unused
                  </th>
                  <th
                    scope="col"
                    className="win-margin-table__n tabular"
                    title="Current H2H table points (3 for a win, 1 for a draw)"
                  >
                    Table
                  </th>
                  <th
                    scope="col"
                    className="win-margin-table__n tabular"
                    title="Table points if every finished fixture used both sides' best legal XI"
                  >
                    If XI
                  </th>
                  <th
                    scope="col"
                    className="win-margin-table__n tabular standings-stats-bench-table__swing"
                    title="Swing in table points (If XI minus Table)"
                  >
                    +/−
                  </th>
                  <th
                    scope="col"
                    className="standings-stats-weeks-table__bar-head"
                    aria-label="Unused bar"
                  />
                </tr>
              </thead>
              <tbody>
                {teamRows.map((row, i) => {
                  const left = Number(row.benchLeft) || 0
                  const tablePts = tablePtsForRow(row)
                  const bestPts = bestTablePtsForRow(row)
                  const swing = swingForRow(row)
                  const fillPct = maxLeft > 0 ? Math.round((left / maxLeft) * 100) : 0
                  const recTitle = `Played ${row.actualRecord || '—'}. If best XIs: ${row.bestRecord || '—'}.`
                  return (
                    <tr
                      key={row.leagueEntryId}
                      className={
                        i === 0 && left > 0
                          ? 'standings-stats-bench-table__worst'
                          : undefined
                      }
                      title={recTitle}
                    >
                      <th scope="row" className="win-margin-table__team">
                        <span className="win-margin-table__team-inner">
                          <TeamAvatar
                            entryId={row.leagueEntryId}
                            name={row.teamName}
                            size="sm"
                            logoMap={teamLogoMap}
                            kitIndexByEntry={kitIndexByEntry}
                          />
                          <ClickableTeamName
                            leagueEntryId={row.leagueEntryId}
                            className="win-margin-table__name"
                            title={row.teamName}
                          >
                            {isMobileNarrow ? firstWord(row.teamName) : row.teamName}
                          </ClickableTeamName>
                        </span>
                      </th>
                      <td className="tabular win-margin-table__n">
                        <strong>{left}</strong>
                      </td>
                      <td className="tabular win-margin-table__n">{tablePts}</td>
                      <td className="tabular win-margin-table__n">{bestPts}</td>
                      <td
                        className={
                          'tabular win-margin-table__n standings-stats-bench-table__swing' +
                          (swing > 0
                            ? ' standings-stats-bench-table__swing--up'
                            : swing < 0
                              ? ' standings-stats-bench-table__swing--down'
                              : '')
                        }
                      >
                        {formatSwing(swing)}
                      </td>
                      <td className="standings-stats-weeks-table__bar-cell">
                        <span
                          className="standings-stats-weeks-table__bar"
                          aria-hidden="true"
                        >
                          <span
                            className="standings-stats-weeks-table__bar-fill standings-stats-bench-table__bar-fill"
                            style={{ width: `${fillPct}%` }}
                          />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="standings-bench-gw">
            <div className="standings-bench-gw__head">
              <h4 className="standings-stats-eyebrow standings-bench-gw__title">
                Would the result have changed?
              </h4>
              {gwOptions.length > 1 ? (
                <CompactSelectPill
                  label="GW"
                  value={gw}
                  options={gwOptions}
                  onChange={(next) => setGwPick(Number(next))}
                  ariaLabel="Game week for table-point comparison"
                />
              ) : gw != null ? (
                <span className="standings-bench-gw__single muted">GW {gw}</span>
              ) : null}
            </div>
            <p className="standings-stats-hint">
              Left column is what was played (and the 3 / 1 / 0 table pts it
              paid). Right column is the same fixture if both managers had
              started their best legal XI.
            </p>
            {gwFixtures.length ? (
              <ul className="standings-bench-fx">
                {gwFixtures.map((fx) => {
                  const homeLabel = isMobileNarrow
                    ? firstWord(fx.homeName)
                    : fx.homeName
                  const awayLabel = isMobileNarrow
                    ? firstWord(fx.awayName)
                    : fx.awayName
                  const homeSat = formatSatPlayers(fx.homeLeftOnBench)
                  const awaySat = formatSatPlayers(fx.awayLeftOnBench)
                  const playedPts = fixtureTablePtsLabel(
                    fx.actualResult,
                    homeLabel,
                    awayLabel,
                  )
                  const bestPts = fixtureTablePtsLabel(
                    fx.bestResult,
                    homeLabel,
                    awayLabel,
                  )
                  const verdict = fixtureTableSummary({
                    ...fx,
                    homeName: homeLabel,
                    awayName: awayLabel,
                  })
                  const homeLeft = Number(fx.homeLeft) || 0
                  const awayLeft = Number(fx.awayLeft) || 0
                  return (
                    <li
                      key={`${fx.gw}-${fx.homeId}-${fx.awayId}`}
                      className={
                        'standings-bench-fx__card' +
                        (fx.flipped ? ' standings-bench-fx__card--flip' : '')
                      }
                    >
                      <div className="standings-bench-fx__names">
                        <span className="standings-bench-fx__side">
                          <TeamAvatar
                            entryId={fx.homeId}
                            name={fx.homeName}
                            size="sm"
                            logoMap={teamLogoMap}
                            kitIndexByEntry={kitIndexByEntry}
                          />
                          <span className="standings-bench-fx__side-copy">
                            <ClickableTeamName
                              leagueEntryId={fx.homeId}
                              className="standings-bench-fx__name"
                              title={fx.homeName}
                            >
                              {homeLabel}
                            </ClickableTeamName>
                            {homeLeft > 0 ? (
                              <span className="standings-bench-fx__unused muted">
                                {homeLeft} unused
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className="standings-bench-fx__side standings-bench-fx__side--away">
                          <span className="standings-bench-fx__side-copy standings-bench-fx__side-copy--away">
                            <ClickableTeamName
                              leagueEntryId={fx.awayId}
                              className="standings-bench-fx__name"
                              title={fx.awayName}
                            >
                              {awayLabel}
                            </ClickableTeamName>
                            {awayLeft > 0 ? (
                              <span className="standings-bench-fx__unused muted">
                                {awayLeft} unused
                              </span>
                            ) : null}
                          </span>
                          <TeamAvatar
                            entryId={fx.awayId}
                            name={fx.awayName}
                            size="sm"
                            logoMap={teamLogoMap}
                            kitIndexByEntry={kitIndexByEntry}
                          />
                        </span>
                      </div>
                      <div className="standings-bench-fx__compare">
                        <div className="standings-bench-fx__col">
                          <span className="standings-bench-fx__col-label">
                            Played
                          </span>
                          <span className="standings-bench-fx__col-score tabular">
                            {scoreText(fx.actualHome, fx.actualAway)}
                          </span>
                          <span className="standings-bench-fx__col-pts">
                            {playedPts}
                          </span>
                        </div>
                        <div
                          className={
                            'standings-bench-fx__col' +
                            (fx.flipped ? ' standings-bench-fx__col--flip' : '')
                          }
                        >
                          <span className="standings-bench-fx__col-label">
                            If both best XIs
                          </span>
                          <span className="standings-bench-fx__col-score tabular">
                            {scoreText(fx.bestHome, fx.bestAway)}
                          </span>
                          <span className="standings-bench-fx__col-pts">
                            {bestPts}
                          </span>
                        </div>
                      </div>
                      <p
                        className={
                          'standings-bench-fx__verdict' +
                          (fx.flipped ? ' standings-bench-fx__verdict--flip' : '')
                        }
                      >
                        {verdict}
                      </p>
                      {homeSat || awaySat ? (
                        <p className="standings-bench-fx__misses">
                          {homeSat ? (
                            <span>
                              {homeLabel} sat {homeSat}
                            </span>
                          ) : null}
                          {homeSat && awaySat ? (
                            <span className="standings-bench-fx__miss-sep">
                              {' '}
                              ·{' '}
                            </span>
                          ) : null}
                          {awaySat ? (
                            <span>
                              {awayLabel} sat {awaySat}
                            </span>
                          ) : null}
                        </p>
                      ) : (
                        <p className="standings-bench-fx__misses muted">
                          Both already started their best legal 11.
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="muted muted--tight">No fixtures for this gameweek.</p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
