import { useEffect, useState } from 'react'
import { fetchLeagueDataJsonOptional } from './leagueDataFetch.js'
import { useIsCeefax } from './useIsCeefax.js'
import './ForbiddenWaivers.css'

/** PL club badge for an FPL team `code`. */
function plClubBadgeUrl(code) {
  if (code == null) return null
  return `https://resources.premierleague.com/premierleague/badges/50/t${code}.png`
}

/** Position sort order so rows are grouped GK → DEF → MID → FWD. */
const POS_RANK = { GKP: 1, GK: 1, DEF: 2, MID: 3, FWD: 4 }

/**
 * Forbidden Waivers — league rule tile. Any player added to the FPL Draft
 * game after the committed baseline (Aug 18, 2026 ~3:30 PM EST) and before
 * the end of GW7 cannot be added by any team. The list regenerates on every
 * deploy from scripts/build-forbidden-waivers.mjs (fresh bootstrap minus the
 * baseline snapshot), so new signings appear here automatically.
 */
export function ForbiddenWaivers() {
  const [data, setData] = useState(null)
  const isCeefax = useIsCeefax()

  useEffect(() => {
    let alive = true
    fetchLeagueDataJsonOptional('forbidden-waivers.json').then((json) => {
      if (alive && json) setData(json)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!data) return null

  const players = data.players ?? []
  const closed = data.windowOpen === false

  return (
    <section
      className="tile tile--compact forbidden-waivers"
      aria-labelledby="forbidden-waivers-heading"
    >
      <details className="forbidden-waivers__fold">
        <summary className="forbidden-waivers__summary">
          <h2 id="forbidden-waivers-heading" className="tile-title tile-title--sm">
            Forbidden waivers
          </h2>
          {players.length > 0 ? (
            <span className="forbidden-waivers__count tabular">{players.length}</span>
          ) : null}
        </summary>
        <p className="tile-hint muted tile-hint--tight">
          {closed
            ? `The GW${data.windowClosesAfterGw} window has closed — this list is final. Players added to the game from now on are fair game.`
            : 'League rule: anyone added to the FPL game after Aug 18 (3:30 PM EST) cannot be picked up by any team until GW8 waivers.'}
        </p>
        {players.length === 0 ? (
          <p className="forbidden-waivers__empty">
            No new players have entered the game since the cutoff.
          </p>
        ) : (
          <ul className="forbidden-waivers__list">
            {players
              .slice()
              .sort(
                (a, b) =>
                  (POS_RANK[a.position] ?? 5) - (POS_RANK[b.position] ?? 5) ||
                  (a.fullName || a.webName || '').localeCompare(b.fullName || b.webName || ''),
              )
              .map((p) => {
                const badge = plClubBadgeUrl(p.teamCode)
                return (
                  <li key={p.id} className="forbidden-waivers__row">
                    {isCeefax ? (
                      <span className="forbidden-waivers__badge forbidden-waivers__badge--code">
                        {p.team || ''}
                      </span>
                    ) : badge ? (
                      <img
                        className="forbidden-waivers__badge"
                        src={badge}
                        alt={p.team || ''}
                        loading="lazy"
                        width="20"
                        height="20"
                      />
                    ) : (
                      <span className="forbidden-waivers__badge" aria-hidden />
                    )}
                    <span className="forbidden-waivers__name" title={p.fullName}>
                      {p.fullName || p.webName}
                    </span>
                    <span
                      className={`forbidden-waivers__pos forbidden-waivers__pos--${p.position.toLowerCase()}`}
                    >
                      {p.position}
                    </span>
                  </li>
                )
              })}
          </ul>
        )}
      </details>
    </section>
  )
}
