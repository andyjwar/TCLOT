import { Fragment, useMemo, useState } from 'react'
import {
  BENCH_DETAIL_MIN_PTS,
  fixtureTablePtsLabel,
  fixtureTableSummary,
  fixturesForGw,
  formatSatPlayers,
  leftoverBenchPlayers,
  nextBenchSort,
  sortBenchPointRows,
} from './benchPoints.js'
import { formatSwing, leaguePtsFromRecord } from './bestXi.js'
import { CompactSelectPill } from './CompactSelectPill.jsx'
import { ClickablePlayerName } from './PlayerHistoryContext.jsx'
import { PlayerKit } from './PlayerKit.jsx'
import { usePlayerClubBadges } from './usePlayerClubBadges.js'
import { SortArrow } from './SortArrow.jsx'
import { TeamAvatar } from './TeamAvatar'
import { ClickableTeamName } from './TeamDetailOverlay.jsx'
import { firstWord } from './teamNameUtils.js'
import { useBenchPoints } from './useBenchPoints.js'
import { useMobileNarrowViewport } from './usePortraitMobile'

const DEFAULT_BENCH_SORT = /** @type {const} */ ({ key: 'unused', dir: 'desc' })

function BenchSortTh({
  colKey,
  label,
  sort,
  onSort,
  className,
  title,
}) {
  const active = sort?.key === colKey
  const dir = active ? sort.dir : null
  const ariaSort = active
    ? dir === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none'
  const orderLabel =
    colKey === 'team'
      ? dir === 'asc'
        ? 'A to Z'
        : 'Z to A'
      : dir === 'desc'
        ? 'high to low'
        : 'low to high'
  const ariaLabel = active
    ? `${label}: sorted ${orderLabel}. Click to reverse.`
    : `Sort by ${label}`
  return (
    <th scope="col" className={className} title={title} aria-sort={ariaSort}>
      <button
        type="button"
        className="standings-sort-btn standings-stats-bench-table__sort"
        onClick={() => onSort(colKey)}
        aria-label={ariaLabel}
      >
        <span className="standings-sort-btn__label">{label}</span>
        <SortArrow active={active} dir={dir} />
      </button>
    </th>
  )
}

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
  const clubBadges = usePlayerClubBadges(true)
  const gameweeks = report?.gameweeks || []
  const latestGw = gameweeks.length ? gameweeks[gameweeks.length - 1] : null
  const [gwPick, setGwPick] = useState(/** @type {number | null} */ (null))
  const [expandedId, setExpandedId] = useState(/** @type {number | null} */ (null))
  const gw =
    gwPick != null && gameweeks.includes(gwPick) ? gwPick : latestGw

  const teamRows = report?.teams || []
  const [sort, setSort] = useState(DEFAULT_BENCH_SORT)
  const sortedRows = useMemo(
    () => sortBenchPointRows(teamRows, sort),
    [teamRows, sort],
  )
  const maxLeft = useMemo(() => {
    let max = 0
    for (const r of teamRows) {
      const n = Number(r?.benchLeft) || 0
      if (n > max) max = n
    }
    return max
  }, [teamRows])
  const worstUnusedId = useMemo(() => {
    let id = null
    let max = 0
    for (const r of teamRows) {
      const n = Number(r?.benchLeft) || 0
      if (n > max) {
        max = n
        id = r.leagueEntryId
      }
    }
    return max > 0 ? id : null
  }, [teamRows])

  const gwFixtures = useMemo(
    () => (gw != null ? fixturesForGw(report?.fixtures || [], gw) : []),
    [report, gw],
  )

  const gwOptions = useMemo(
    () => gameweeks.map((n) => ({ value: n, label: `GW ${n}` })),
    [gameweeks],
  )

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
        “Unused” shows the additional FPL points each team could have earned
        by fielding its best legal XI; autosub points are already included.
      </p>
      <p className="standings-stats-hint">
        “Actual” shows the current standings: 3 points for a win and 1 for a
        draw. “Best XI” shows how the standings would look if both teams had
        fielded their highest-scoring legal XI in every completed fixture.
      </p>
      <p className="standings-stats-hint">
        Tap a team to see sit-outs of more than {BENCH_DETAIL_MIN_PTS} points.
      </p>

      {loading ? (
        <p className="muted muted--tight">Loading bench points…</p>
      ) : !hasData ? (
        <p className="muted muted--tight">
          No finished gameweeks to score yet.
        </p>
      ) : (
        <>
          <div className="table-scroll table-scroll--win-margin">
            <table className="win-margin-table standings-stats-bench-table">
              <colgroup>
                <col className="standings-stats-bench-table__col-team" />
                <col className="standings-stats-bench-table__col-n" />
                <col className="standings-stats-bench-table__col-n" />
                <col className="standings-stats-bench-table__col-bestxi" />
                <col className="standings-stats-bench-table__col-swing" />
                <col className="standings-stats-bench-table__col-bar" />
              </colgroup>
              <thead>
                <tr>
                  <BenchSortTh
                    colKey="team"
                    label="Team"
                    sort={sort}
                    onSort={(key) => setSort((cur) => nextBenchSort(cur, key))}
                    className="win-margin-table__team"
                  />
                  <BenchSortTh
                    colKey="unused"
                    label="Unused"
                    sort={sort}
                    onSort={(key) => setSort((cur) => nextBenchSort(cur, key))}
                    className="win-margin-table__n tabular"
                    title="FPL points a legal best XI would have added after autosubs"
                  />
                  <BenchSortTh
                    colKey="actual"
                    label="Actual"
                    sort={sort}
                    onSort={(key) => setSort((cur) => nextBenchSort(cur, key))}
                    className="win-margin-table__n tabular"
                    title="Current H2H table points (3 for a win, 1 for a draw)"
                  />
                  <BenchSortTh
                    colKey="bestXi"
                    label="Best XI"
                    sort={sort}
                    onSort={(key) => setSort((cur) => nextBenchSort(cur, key))}
                    className="win-margin-table__n tabular standings-stats-bench-table__bestxi"
                    title="Table points if every finished fixture used both sides' best legal XI"
                  />
                  <BenchSortTh
                    colKey="swing"
                    label="+/−"
                    sort={sort}
                    onSort={(key) => setSort((cur) => nextBenchSort(cur, key))}
                    className="win-margin-table__n tabular standings-stats-bench-table__swing"
                    title="Swing in table points (Best XI minus Actual)"
                  />
                  <th
                    scope="col"
                    className="standings-stats-weeks-table__bar-head"
                    aria-label="Unused bar"
                  />
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const left = Number(row.benchLeft) || 0
                  const tablePts = tablePtsForRow(row)
                  const bestPts = bestTablePtsForRow(row)
                  const swing = swingForRow(row)
                  const fillPct = maxLeft > 0 ? Math.round((left / maxLeft) * 100) : 0
                  const recTitle = `Played ${row.actualRecord || '—'}. If best XIs: ${row.bestRecord || '—'}.`
                  const leftover = leftoverBenchPlayers(row).map((p) => {
                    const club = clubBadges.get(p.id)
                    return {
                      ...p,
                      badgeUrl: club?.badgeUrl ?? null,
                      teamShort: club?.teamShort ?? '',
                    }
                  })
                  const open = expandedId === row.leagueEntryId
                  const toggleId = `standings-bench-team-${row.leagueEntryId}`
                  const panelId = `standings-bench-detail-${row.leagueEntryId}`
                  const rowClass = [
                    row.leagueEntryId === worstUnusedId
                      ? 'standings-stats-bench-table__worst'
                      : '',
                    open ? 'standings-stats-bench-table__row--open' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <Fragment key={row.leagueEntryId}>
                    <tr
                      className={rowClass || undefined}
                      title={recTitle}
                    >
                      <th scope="row" className="win-margin-table__team">
                        <button
                          type="button"
                          id={toggleId}
                          className="standings-stats-bench-table__team-btn"
                          aria-expanded={open}
                          aria-controls={panelId}
                          onClick={() =>
                            setExpandedId(open ? null : row.leagueEntryId)
                          }
                        >
                          <span
                            className={
                              'standings-stats-bench-table__chevron' +
                              (open
                                ? ' standings-stats-bench-table__chevron--open'
                                : '')
                            }
                            aria-hidden="true"
                          >
                            ▶
                          </span>
                          <span className="win-margin-table__team-inner">
                            <TeamAvatar
                              entryId={row.leagueEntryId}
                              name={row.teamName}
                              size="sm"
                              logoMap={teamLogoMap}
                              kitIndexByEntry={kitIndexByEntry}
                            />
                            <span
                              className="win-margin-table__name"
                              title={row.teamName}
                            >
                              {isMobileNarrow
                                ? firstWord(row.teamName)
                                : row.teamName}
                            </span>
                          </span>
                        </button>
                      </th>
                      <td className="tabular win-margin-table__n">
                        <strong>{left}</strong>
                      </td>
                      <td className="tabular win-margin-table__n">{tablePts}</td>
                      <td className="tabular win-margin-table__n standings-stats-bench-table__bestxi">
                        {bestPts}
                      </td>
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
                    {open ? (
                      <tr className="standings-stats-bench-table__detail">
                        <td colSpan={6}>
                          <div
                            id={panelId}
                            className="standings-stats-bench-misses"
                            role="region"
                            aria-labelledby={toggleId}
                          >
                            {leftover.length ? (
                              <table className="standings-stats-bench-misses__table">
                                <thead>
                                  <tr>
                                    <th scope="col">Player</th>
                                    <th
                                      scope="col"
                                      className="tabular standings-stats-bench-misses__gw"
                                    >
                                      GW
                                    </th>
                                    <th
                                      scope="col"
                                      className="tabular standings-stats-bench-misses__pts"
                                    >
                                      Pts
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {leftover.map((p) => (
                                    <tr key={`${p.id}-${p.gw}`}>
                                      <td>
                                        <span className="standings-stats-bench-misses__player">
                                          <span className="standings-stats-bench-misses__kit">
                                            <PlayerKit
                                              badgeUrl={p.badgeUrl}
                                              teamShort={p.teamShort}
                                            />
                                          </span>
                                          <ClickablePlayerName
                                            element={p.id}
                                            displayName={p.name}
                                            web_name={p.name}
                                            teamShort={p.teamShort}
                                            leagueEntryId={row.leagueEntryId}
                                            className="standings-stats-bench-misses__name"
                                          >
                                            {p.name}
                                          </ClickablePlayerName>
                                        </span>
                                      </td>
                                      <td className="tabular standings-stats-bench-misses__gw">
                                        {p.gw}
                                      </td>
                                      <td className="tabular standings-stats-bench-misses__pts">
                                        <strong>{p.pts}</strong>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="standings-stats-bench-misses__empty muted">
                                No sit-outs above {BENCH_DETAIL_MIN_PTS} points.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <details className="standings-bench-gw">
            <summary className="standings-bench-gw__summary">
              <h4 className="standings-stats-eyebrow standings-bench-gw__title">
                Would the result have changed?
              </h4>
              {gw != null ? (
                <span className="standings-bench-gw__single muted">GW {gw}</span>
              ) : null}
            </summary>
            <div className="standings-bench-gw__body">
            {gwOptions.length > 1 ? (
              <div className="standings-bench-gw__toolbar">
                <CompactSelectPill
                  label="GW"
                  value={gw}
                  options={gwOptions}
                  onChange={(next) => setGwPick(Number(next))}
                  ariaLabel="Game week for table-point comparison"
                />
              </div>
            ) : null}
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
          </details>
        </>
      )}
    </section>
  )
}
