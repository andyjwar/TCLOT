import { useState } from 'react'
import { useLeagueData, FORM_LAST_N } from './useLeagueData'
import { TeamAvatar } from './TeamAvatar'
import './App.css'

const LEAGUE_TITLE = 'The Tri-Continental League of Titans'
const LEAGUE_SEASON_SUB = 'The 25/26 Season'

function FormCircles({ form }) {
  return (
    <div className="form-circles" aria-label="Last matches form">
      {form.map((r, i) =>
        r == null ? (
          <span key={i} className="form-dot form-dot--empty" title="—" />
        ) : (
          <span
            key={i}
            className={`form-dot form-dot--${r === 'W' ? 'win' : r === 'L' ? 'loss' : 'draw'}`}
            title={r === 'W' ? 'Win' : r === 'L' ? 'Loss' : 'Draw'}
          >
            {r}
          </span>
        )
      )}
    </div>
  )
}

function PlayerKit({ shirtUrl, badgeUrl, teamShort }) {
  const urls = [shirtUrl, badgeUrl].filter(Boolean)
  const [u, setU] = useState(0)
  if (u >= urls.length) {
    return (
      <span className="pl-kit-fallback" title={teamShort}>
        {teamShort?.slice(0, 3) ?? '?'}
      </span>
    )
  }
  return (
    <img
      className={u === 0 ? 'pl-kit-shirt' : 'pl-kit-badge'}
      src={urls[u]}
      alt=""
      loading="lazy"
      onError={() => setU((x) => x + 1)}
    />
  )
}

function App() {
  const { data, error, loading } = useLeagueData()
  const [formTeamId, setFormTeamId] = useState(null)

  if (loading) {
    return (
      <div className="app fotmob">
        <div className="load-screen">Loading league…</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="app fotmob">
        <header className="page-header page-header--centered">
          <section className="tile tile--title-banner" aria-label="League">
            <h1 className="page-title-main">{LEAGUE_TITLE}</h1>
            <h2 className="page-title-season">{LEAGUE_SEASON_SUB}</h2>
            <p className="brand-sub brand-sub--in-title-tile">FPL Draft · Head-to-head</p>
          </section>
        </header>
        <main className="main-tiles">
          <section className="tile error-tile">
            <p className="error-msg">{error ?? 'No data'}</p>
            <p className="muted">
              Run <code>python3 ingest.py &lt;LEAGUE_ID&gt;</code> then{' '}
              <code>npm run dev</code> to copy data into the site.
            </p>
          </section>
        </main>
      </div>
    )
  }

  const {
    tableRows,
    teamFormStripByEntry,
    teamsForFormSelect,
    nextEvent,
    nextGameweekFixtures,
    previousGameweek,
    previousGameweekFixtures,
    isSampleData,
    fetchFailedDemo,
    teamLogoMap,
    mostWaiveredPlayers,
  } = data

  const defaultFormEntry = teamsForFormSelect[0]?.id
  const activeFormEntry = formTeamId ?? defaultFormEntry
  const formStripRows =
    activeFormEntry != null ? teamFormStripByEntry[activeFormEntry] ?? [] : []
  const selectedFormTeamName =
    teamsForFormSelect.find((t) => t.id === activeFormEntry)?.teamName ?? ''

  const renderGwFixture = (fx, i) => (
    <li key={`${fx.event}-${fx.homeId}-${fx.awayId}-${i}`} className="gw-fixture-row">
      <div className="gw-fixture-teams">
        <span className="gw-fixture-side">
          <TeamAvatar entryId={fx.homeId} name={fx.homeName} size="sm" logoMap={teamLogoMap} />
          <span className={fx.homePts > fx.awayPts ? 'fw-600' : ''}>{fx.homeName}</span>
        </span>
        {fx.homePts != null ? (
          <span className="gw-fixture-score">
            {fx.homePts} – {fx.awayPts}
          </span>
        ) : (
          <span className="gw-fixture-vs">v</span>
        )}
        <span className="gw-fixture-side gw-fixture-side--end">
          <span className={fx.awayPts != null && fx.awayPts > fx.homePts ? 'fw-600' : ''}>{fx.awayName}</span>
          <TeamAvatar entryId={fx.awayId} name={fx.awayName} size="sm" logoMap={teamLogoMap} />
        </span>
      </div>
    </li>
  )

  return (
    <div className="app fotmob">
      <header className="page-header page-header--centered">
        <section className="tile tile--title-banner" aria-label="League">
          <h1 className="page-title-main">{LEAGUE_TITLE}</h1>
          <h2 className="page-title-season">{LEAGUE_SEASON_SUB}</h2>
        </section>
        <div className="header-team-strip" aria-label="League teams">
          {teamsForFormSelect.map((t) => (
            <div key={t.id} className="header-team-strip__item" title={t.teamName}>
              <TeamAvatar entryId={t.id} name={t.teamName} size="header" logoMap={teamLogoMap} />
            </div>
          ))}
        </div>
        {fetchFailedDemo && (
          <div className="data-banner data-banner--error" role="alert">
            <strong>League file didn’t load</strong> (wrong URL or deploy). Showing demo only.{' '}
            Use <code>https://YOUR_USER.github.io/repo-name/</code> with your real repo name (often
            lowercase). If the repo is <code>you.github.io</code>, use <code>https://you.github.io/</code>{' '}
            — no <code>/repo/</code> path.
          </div>
        )}
        {isSampleData && !fetchFailedDemo && (
          <div className="data-banner" role="status">
            <strong>Demo data</strong> — site owner: add GitHub secret{' '}
            <code>FPL_LEAGUE_ID</code> (your draft league number) under Settings → Secrets, then redeploy.
            Or publish files: <code>python3 ingest.py ID</code>,{' '}
            <code>cd web && npm run publish-real-league</code>, commit{' '}
            <code>web/public/league-data/</code>. ID: <code>draft.premierleague.com/league/YOUR_ID</code>
          </div>
        )}
      </header>

      <main className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <section className="tile tile--standings">
            <div className="table-head-bar">
              <span className="league-pill league-pill--lg">
                <span className="league-pill__icon" aria-hidden>
                  ⚽
                </span>
                <span>Standings</span>
              </span>
            </div>
            <div className="table-scroll table-scroll--standings-open">
              <table className="standings-table standings-table--sidebar">
                <thead>
                  <tr>
                    <th className="col-rank">#</th>
                    <th className="col-team">Team</th>
                    <th className="col-num">PL</th>
                    <th className="col-num">W</th>
                    <th className="col-num">D</th>
                    <th className="col-num">L</th>
                    <th className="col-num col-pfpa">+/-</th>
                    <th className="col-num">GD</th>
                    <th className="col-num col-pts">PTS</th>
                    <th className="col-form">Form</th>
                    <th className="col-next">Nxt</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => {
                    const isLeader = row.rank === 1
                    const plusMinus = `${row.gf}-${row.ga}`
                    return (
                      <tr key={row.league_entry} className={isLeader ? 'row-highlight' : undefined}>
                        <td className="col-rank">{row.rank}</td>
                        <td className="col-team">
                          <span className="team-cell">
                            <TeamAvatar entryId={row.league_entry} name={row.teamName} size="sm" logoMap={teamLogoMap} />
                            <span className="team-name team-name--sidebar">{row.teamName}</span>
                          </span>
                        </td>
                        <td className="col-num">{row.pl}</td>
                        <td className="col-num">{row.matches_won}</td>
                        <td className="col-num">{row.matches_drawn}</td>
                        <td className="col-num">{row.matches_lost}</td>
                        <td className="col-num col-pfpa tabular">{plusMinus}</td>
                        <td className="col-num tabular">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                        <td className="col-num col-pts">
                          <strong>{row.total}</strong>
                        </td>
                        <td className="col-form">
                          <FormCircles form={row.form} />
                        </td>
                        <td className="col-next">
                          {row.next ? (
                            <TeamAvatar entryId={row.next.id} name={row.next.name} size="sm" logoMap={teamLogoMap} />
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="table-foot muted">Form = last {FORM_LAST_N} H2H.</p>
          </section>
        </aside>

        <div className="dashboard-main dashboard-main--compact">
          <section className="tile tile--compact">
            <div className="tile-head-row tile-head-row--tight">
              <h2 className="tile-title tile-title--sm">Previous game week</h2>
              <span className="league-pill league-pill--sm">GW {previousGameweek ?? '—'}</span>
            </div>
            {previousGameweekFixtures?.length ? (
              <ul className="gw-fixture-list gw-fixture-list--tight">{previousGameweekFixtures.map(renderGwFixture)}</ul>
            ) : (
              <p className="muted muted--tight">No finished matches yet.</p>
            )}
          </section>

          <section className="tile tile--compact">
            <div className="tile-head-row tile-head-row--tight">
              <h2 className="tile-title tile-title--sm">Next game week</h2>
              <span className="league-pill league-pill--sm">GW {nextEvent ?? '—'}</span>
            </div>
            {nextGameweekFixtures?.length ? (
              <ul className="gw-fixture-list gw-fixture-list--tight">{nextGameweekFixtures.map((fx, i) => renderGwFixture(fx, i))}</ul>
            ) : (
              <p className="muted muted--tight">No upcoming fixtures in data.</p>
            )}
          </section>

          <section className="tile tile--compact tile--team-form">
            <h2 className="tile-title tile-title--sm">Team form</h2>
            <div className="form-team-toolbar">
              <label htmlFor="form-team-select" className="form-team-sublabel">
                Team
              </label>
              <div className="form-team-picker">
                <span className="form-team-picker__glyph" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <select
                  id="form-team-select"
                  className="form-team-select"
                  value={activeFormEntry ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setFormTeamId(v === '' ? null : Number(v))
                  }}
                >
                  {teamsForFormSelect.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teamName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="tile-hint muted tile-hint--tight">
              {selectedFormTeamName
                ? `${selectedFormTeamName} · last ${formStripRows.length} matches (FPL pts)`
                : '—'}
            </p>
            <div className="form-strip form-strip--tight">
              {formStripRows.length ? (
                formStripRows.map((row, i) => (
                  <div key={`${row.event}-${i}`} className="form-strip__item">
                    <div
                      className={`form-score form-score--${row.result === 'W' ? 'win' : row.result === 'L' ? 'loss' : 'draw'}`}
                    >
                      {row.scoreStr}
                    </div>
                    <span className="form-strip__opp" title={row.opponentName}>
                      <TeamAvatar entryId={row.opponentEntryId} name={row.opponentName} size="sm" logoMap={teamLogoMap} />
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted">No finished matches yet.</p>
              )}
            </div>
          </section>

          <section className="tile tile--compact">
            <h2 className="tile-title tile-title--sm">Most waivered players</h2>
            {mostWaiveredPlayers?.length ? (
              <ol className="waiver-list waiver-list--tight">
                {mostWaiveredPlayers.map((p, i) => (
                  <li key={p.elementId} className="waiver-row">
                    <span className="waiver-rank">{i + 1}</span>
                    <PlayerKit shirtUrl={p.shirtUrl} badgeUrl={p.badgeUrl} teamShort={p.teamShort} />
                    <div className="waiver-info">
                      <span className="waiver-name">{p.web_name}</span>
                      <span className="waiver-club muted">{p.teamShort}</span>
                    </div>
                    <span className="waiver-count">{p.claims}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">
                Run full <code>ingest.py</code> (includes <code>transactions.json</code> and{' '}
                <code>bootstrap_fpl.json</code>) then <code>npm run dev</code> to build waiver stats.
              </p>
            )}
          </section>

          <footer className="page-footer muted">
            Data from{' '}
            <a href="https://draft.premierleague.com" target="_blank" rel="noopener noreferrer">
              draft.premierleague.com
            </a>
            . Refresh with <code>ingest.py</code>.
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
