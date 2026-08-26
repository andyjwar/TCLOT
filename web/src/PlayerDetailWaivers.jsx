import { fplElementDisplayName } from './fplElementNames.js'
import {
  stintPointsFromHistory,
  stintRangeLabel,
} from './playerWaiverHistory.js'
import { ClickablePlayerName } from './PlayerHistoryContext.jsx'
import { TeamAvatar } from './TeamAvatar'
import { ClickableManagerName } from './teamDetailBus.jsx'
import { useWaiverHistoryForElement } from './useWaiverHistoryForElement.js'

const TAG_LABEL = {
  'in-w': 'Waiver in',
  'in-f': 'Free agent in',
  out: 'Dropped',
}

function WaiverManager({ manager, logoMap, kitIndexByEntry, onManagerNavigate }) {
  return (
    <ClickableManagerName
      leagueEntryId={manager.leagueEntryId}
      title={`${manager.teamName} — manager card`}
      className="pdetail-wv__manager"
      onNavigate={onManagerNavigate}
    >
      {manager.leagueEntryId != null ? (
        <TeamAvatar
          entryId={manager.leagueEntryId}
          name={manager.teamName}
          size="sm"
          logoMap={logoMap}
          kitIndexByEntry={kitIndexByEntry}
        />
      ) : null}
      <span className="pdetail-wv__manager-name">{manager.teamName}</span>
    </ClickableManagerName>
  )
}

function SwappedPlayerName({ el, elementId }) {
  if (elementId == null) return <span>a free squad slot</span>
  const name = fplElementDisplayName(el, elementId)
  return (
    <ClickablePlayerName
      element={elementId}
      displayName={name}
      web_name={el?.web_name}
      className="pdetail-wv__player"
    >
      {name}
    </ClickablePlayerName>
  )
}

/**
 * "Waivers" tab pane on the player card — every waiver / free-agent
 * transaction this player was part of, oldest first. Signings show the
 * manager, the player dropped to make room, how long the stint lasted and
 * the FPL points scored across it (from the per-GW history the card already
 * fetched — bench weeks count, same convention as the Waivers tab tenure
 * table). Drops show who came in as the replacement. Unsuccessful waiver
 * claims collapse into one muted footer line.
 *
 * Unlike the fail-quiet draft line, the pane is always reachable (it owns a
 * tab), so it renders explicit placeholder cards for the loading /
 * unavailable / no-activity states instead of vanishing.
 *
 * @param {{
 *   el: object,
 *   summaryPayload: object | null,
 *   portrait: boolean,
 *   logoMap?: Record<string, string>,
 *   kitIndexByEntry?: Record<number, number>,
 *   onManagerNavigate?: () => void,
 * }} props
 */
export function PlayerDetailWaivers({
  el,
  summaryPayload,
  portrait,
  logoMap = {},
  kitIndexByEntry = undefined,
  onManagerNavigate,
}) {
  const elementId = el?.id
  const history = Array.isArray(summaryPayload?.history)
    ? summaryPayload.history
    : null
  const { status, events, failedClaims } = useWaiverHistoryForElement(elementId)

  const managerProps = { logoMap, kitIndexByEntry, onManagerNavigate }

  let body
  if (status === 'loading') {
    body = null
  } else if (status === 'unavailable') {
    body = (
      <div className="pdetail-wv__empty" role="status">
        Waiver history unavailable
      </div>
    )
  } else if (events.length === 0 && failedClaims.length === 0) {
    body = (
      <div className="pdetail-wv__empty" role="status">
        No waiver activity — {fplElementDisplayName(el, elementId)} has not
        been signed or dropped this season
      </div>
    )
  } else {
    body = (
      <>
        <ol className="pdetail-wv__list">
          {events.map((e) => {
            const stintPts =
              e.type === 'in'
                ? stintPointsFromHistory(history, e.gw, e.endGw)
                : null
            return (
              <li key={e.txId + e.type} className="pdetail-wv__card">
                <div className="pdetail-wv__top">
                  <span className="pdetail-wv__gw tabular">GW{e.gw}</span>
                  <span className={`pdetail-wv__tag pdetail-wv__tag--${e.type}`}>
                    {TAG_LABEL[e.type === 'in' ? `in-${e.kind}` : 'out']}
                  </span>
                  <WaiverManager manager={e.manager} {...managerProps} />
                </div>
                {e.type === 'in' ? (
                  <>
                    <div className="pdetail-wv__swap">
                      Dropped{' '}
                      <SwappedPlayerName
                        el={e.otherElement}
                        elementId={e.otherElementId}
                      />{' '}
                      to make room
                    </div>
                    <div className="pdetail-wv__stint">
                      <span>{stintRangeLabel(e.gw, e.endGw)}</span>
                      {stintPts != null ? (
                        <span className="pdetail-wv__pts tabular">
                          {stintPts} pts while on squad
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="pdetail-wv__swap">
                    Replaced by{' '}
                    <SwappedPlayerName
                      el={e.otherElement}
                      elementId={e.otherElementId}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        {failedClaims.length > 0 ? (
          <p className="pdetail-wv__failed">
            {failedClaims.length} unsuccessful claim
            {failedClaims.length === 1 ? '' : 's'} —{' '}
            {failedClaims
              .map((c) => `GW${c.gw} by ${c.manager.teamName}`)
              .join(', ')}
          </p>
        ) : null}
      </>
    )
  }

  const section = (
    <section className="pdetail__section pdetail-wv">
      <h4 className={portrait ? 'pdetail-p__section-h' : 'pdetail__section-h'}>
        Waiver history
      </h4>
      {body}
    </section>
  )

  return portrait ? (
    <div className="pdetail-p__body">{section}</div>
  ) : (
    <div className="pdetail__body pdetail__body--stacked">{section}</div>
  )
}
