import { useMemo, useState } from 'react'
import { fixturesForGw, formatBenchMisses } from './benchPoints.js'
import { CompactSelectPill } from './CompactSelectPill.jsx'
import { TeamAvatar } from './TeamAvatar'
import { ClickableTeamName } from './TeamDetailOverlay.jsx'
import { firstWord } from './teamNameUtils.js'
import { useBenchPoints } from './useBenchPoints.js'
import { useMobileNarrowViewport } from './usePortraitMobile'

function resultLabel(code) {
  if (code === 'H') return 'Home win'
  if (code === 'A') return 'Away win'
  return 'Draw'
}

function scoreText(a, b) {
  return `${a}–${b}`
}

/**
 * Stats → bench points: season leftover table + per-GW adjusted H2H scores.
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
        What each side would have scored with a legal best XI from the same
        15. Leftover is the gap versus the official total (autosubs already
        count). Worst manager sits at the top.
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
              Most left on the pine:{' '}
              <strong>{worst.teamName}</strong> ({worst.benchLeft} pt
              {worst.benchLeft === 1 ? '' : 's'} across {worst.weeksPlayed} GW
              {worst.weeksPlayed === 1 ? '' : 's'}).
            </p>
          ) : (
            <p className="standings-bench__callout">
              Nobody left usable points on the bench in finished gameweeks.
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
                    title="Points a legal best XI would have added"
                  >
                    Left
                  </th>
                  <th
                    scope="col"
                    className="win-margin-table__n tabular"
                    title="Sum of each GW’s best legal XI"
                  >
                    Best
                  </th>
                  <th
                    scope="col"
                    className="win-margin-table__n tabular"
                    title="Official points for"
                  >
                    Actual
                  </th>
                  <th
                    scope="col"
                    className="win-margin-table__n tabular standings-stats-bench-table__rec"
                    title="W–D–L if every fixture used best-XI scores"
                  >
                    Best rec
                  </th>
                  <th
                    scope="col"
                    className="standings-stats-weeks-table__bar-head"
                    aria-label="Leftover bar"
                  />
                </tr>
              </thead>
              <tbody>
                {teamRows.map((row, i) => {
                  const left = Number(row.benchLeft) || 0
                  const fillPct = maxLeft > 0 ? Math.round((left / maxLeft) * 100) : 0
                  return (
                    <tr
                      key={row.leagueEntryId}
                      className={
                        i === 0 && left > 0
                          ? 'standings-stats-bench-table__worst'
                          : undefined
                      }
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
                      <td className="tabular win-margin-table__n">{row.bestXiPts}</td>
                      <td className="tabular win-margin-table__n muted">
                        {row.actualPts}
                      </td>
                      <td className="tabular win-margin-table__n standings-stats-bench-table__rec">
                        {row.bestRecord}
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
                Game week scores
              </h4>
              {gwOptions.length > 1 ? (
                <CompactSelectPill
                  label="GW"
                  value={gw}
                  options={gwOptions}
                  onChange={(next) => setGwPick(Number(next))}
                  ariaLabel="Game week for adjusted scores"
                />
              ) : gw != null ? (
                <span className="standings-bench-gw__single muted">GW {gw}</span>
              ) : null}
            </div>
            <p className="standings-stats-hint">
              Official H2H score, then the score if both managers had started
              their best legal XI that week.
            </p>
            {gwFixtures.length ? (
              <ul className="standings-bench-fx">
                {gwFixtures.map((fx) => {
                  const homeMiss = formatBenchMisses(fx.homeLeftOnBench)
                  const awayMiss = formatBenchMisses(fx.awayLeftOnBench)
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
                          <ClickableTeamName
                            leagueEntryId={fx.homeId}
                            className="standings-bench-fx__name"
                            title={fx.homeName}
                          >
                            {isMobileNarrow ? firstWord(fx.homeName) : fx.homeName}
                          </ClickableTeamName>
                        </span>
                        <span className="standings-bench-fx__side standings-bench-fx__side--away">
                          <ClickableTeamName
                            leagueEntryId={fx.awayId}
                            className="standings-bench-fx__name"
                            title={fx.awayName}
                          >
                            {isMobileNarrow ? firstWord(fx.awayName) : fx.awayName}
                          </ClickableTeamName>
                          <TeamAvatar
                            entryId={fx.awayId}
                            name={fx.awayName}
                            size="sm"
                            logoMap={teamLogoMap}
                            kitIndexByEntry={kitIndexByEntry}
                          />
                        </span>
                      </div>
                      <div className="standings-bench-fx__scores">
                        <div className="standings-bench-fx__line">
                          <span className="standings-bench-fx__label">Actual</span>
                          <span className="standings-bench-fx__score tabular">
                            {scoreText(fx.actualHome, fx.actualAway)}
                          </span>
                          <span className="standings-bench-fx__result muted">
                            {resultLabel(fx.actualResult)}
                          </span>
                        </div>
                        <div className="standings-bench-fx__line">
                          <span className="standings-bench-fx__label">Best XI</span>
                          <span className="standings-bench-fx__score tabular">
                            {scoreText(fx.bestHome, fx.bestAway)}
                          </span>
                          <span
                            className={
                              'standings-bench-fx__result' +
                              (fx.flipped
                                ? ' standings-bench-fx__result--flip'
                                : ' muted')
                            }
                          >
                            {fx.flipped
                              ? `Would be ${resultLabel(fx.bestResult).toLowerCase()}`
                              : 'Same result'}
                          </span>
                        </div>
                      </div>
                      {homeMiss || awayMiss ? (
                        <p className="standings-bench-fx__misses">
                          {homeMiss ? (
                            <span>
                              {isMobileNarrow ? firstWord(fx.homeName) : fx.homeName}{' '}
                              left {homeMiss} on the bench
                            </span>
                          ) : null}
                          {homeMiss && awayMiss ? (
                            <span className="standings-bench-fx__miss-sep"> · </span>
                          ) : null}
                          {awayMiss ? (
                            <span>
                              {isMobileNarrow ? firstWord(fx.awayName) : fx.awayName}{' '}
                              left {awayMiss} on the bench
                            </span>
                          ) : null}
                        </p>
                      ) : (
                        <p className="standings-bench-fx__misses muted">
                          Both XIs already matched the best legal 11.
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
