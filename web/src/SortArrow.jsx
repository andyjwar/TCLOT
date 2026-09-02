/** Text-presentation ↑ / ↓ — never the boxed ↕ emoji. */
const UP = '↑\uFE0E'
const DOWN = '↓\uFE0E'

/**
 * Brand-green sort chevron used on Standings, Heritage, and Players.
 * Same glyphs as live rank-move arrows (`live-standings-move`).
 *
 * Active / league-default PTS: a single green ↑ or ↓.
 * Idle: stacked green ↑↓ so the column still reads as sortable,
 * without the old grey boxed dual-arrow.
 */
export function SortArrow({
  active = false,
  dir = null,
  leagueDefaultDesc = false,
  className = 'standings-sort-arrow',
}) {
  const showActive = Boolean(active || leagueDefaultDesc)
  const resolvedDir = leagueDefaultDesc && !active ? 'desc' : dir
  const mods = showActive
    ? `${className}--active ${className}--${resolvedDir}`
    : `${className}--idle`

  return (
    <span className={`${className} ${mods}`} aria-hidden="true">
      {showActive ? (
        resolvedDir === 'asc' ? UP : DOWN
      ) : (
        <>
          <span>{UP}</span>
          <span>{DOWN}</span>
        </>
      )}
    </span>
  )
}
