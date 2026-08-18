import { useEffect, useState } from 'react'
import './ForbiddenWaivers.css'

/**
 * Forbidden Waivers — league rule tile. Any player added to the FPL Draft
 * game after the committed baseline (Aug 18, 2026 ~3:30 PM EST) and before
 * the end of GW7 cannot be added by any team. The list regenerates on every
 * deploy from scripts/build-forbidden-waivers.mjs (fresh bootstrap minus the
 * baseline snapshot), so new signings appear here automatically.
 */
export function ForbiddenWaivers() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    fetch(`${import.meta.env.BASE_URL}league-data/forbidden-waivers.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (alive && json) setData(json)
      })
      .catch(() => {})
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
      <div className="tile-head-row tile-head-row--tight">
        <h2 id="forbidden-waivers-heading" className="tile-title tile-title--sm">
          Forbidden waivers
        </h2>
        {players.length > 0 ? (
          <span className="forbidden-waivers__count tabular">{players.length}</span>
        ) : null}
      </div>
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
          {players.map((p) => (
            <li key={p.id} className="forbidden-waivers__row">
              <span
                className={`forbidden-waivers__pos forbidden-waivers__pos--${p.position.toLowerCase()}`}
              >
                {p.position}
              </span>
              <span className="forbidden-waivers__name" title={p.fullName}>
                {p.webName}
              </span>
              <span className="forbidden-waivers__team">{p.team}</span>
              <span className="forbidden-waivers__ban" aria-label="Cannot be added">
                ⛔
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
