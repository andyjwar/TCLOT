import { ClickablePlayerName } from './PlayerHistoryContext.jsx'
import { useManagerSquad } from './useManagerSquad.js'

/**
 * "Current squad" tab body for the manager detail card. Lists the manager's
 * currently-owned players grouped by position, with last-GW score, time on
 * squad and total season points. Player names open the player detail overlay.
 *
 * @param {object} props
 * @param {number|null} props.leagueEntryId
 * @param {number|null} props.fplEntryId
 * @param {boolean} props.active mounted-but-hidden panes pass `false`
 * @param {string} [props.leagueDataRevision]
 */
export function TeamCurrentSquad({
  leagueEntryId,
  fplEntryId,
  active,
  leagueDataRevision = '',
}) {
  const { status, groups, gameweek, totalSeasonPoints, error } = useManagerSquad(
    { leagueEntryId, fplEntryId, enabled: active, leagueDataRevision },
  )

  if (status === 'loading' || status === 'idle') {
    return <p className="tc-squad__note muted">Loading current squad…</p>
  }
  if (status === 'error') {
    return (
      <p className="tc-squad__note muted" role="alert">
        Couldn’t load the squad. {error}
      </p>
    )
  }
  if (!groups.length) {
    return (
      <p className="tc-squad__note muted">
        No squad on record for this manager yet.
      </p>
    )
  }

  return (
    <div className="tc-squad">
      <div className="tc-squad__caption">
        <span>
          {gameweek ? `Squad · last scored GW${gameweek}` : 'Current squad'}
        </span>
        <span className="tc-squad__total">
          {totalSeasonPoints}
          <small>season pts</small>
        </span>
      </div>

      <div className="tc-squad__head" aria-hidden="true">
        <span className="tc-squad__ch tc-squad__ch--name">Player</span>
        <span className="tc-squad__ch">GW</span>
        <span className="tc-squad__ch">On squad</span>
        <span className="tc-squad__ch">Season</span>
      </div>

      {groups.map((group) => (
        <div key={group.type} className="tc-squad__group">
          <div className="tc-squad__pos">{group.label}</div>
          <ul className="tc-squad__list">
            {group.players.map((p) => (
              <li key={p.element} className="tc-squad__row">
                <span className="tc-squad__name">
                  <ClickablePlayerName
                    element={p.element}
                    displayName={p.name}
                    web_name={p.name}
                    leagueEntryId={leagueEntryId}
                    className="tc-squad__name-btn"
                  >
                    {p.name}
                  </ClickablePlayerName>
                </span>
                <span className="tc-squad__cell tc-squad__cell--gw">
                  {p.lastGwPoints == null ? '–' : p.lastGwPoints}
                </span>
                <span
                  className="tc-squad__cell tc-squad__cell--tenure"
                  title={
                    p.joinedGw != null
                      ? `${p.joinedKind === 'draft' ? 'Drafted' : p.joinedKind === 'trade' ? 'Traded in' : 'Signed'} · since GW${p.joinedGw}`
                      : undefined
                  }
                >
                  {p.gwsOwned == null
                    ? '–'
                    : `${p.gwsOwned} GW${p.gwsOwned === 1 ? '' : 's'}`}
                </span>
                <span className="tc-squad__cell tc-squad__cell--season">
                  {p.seasonPoints}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
