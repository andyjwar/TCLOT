/**
 * Module-level opener for the team (manager) detail overlay.
 *
 * The team overlay's React context (`useTeamDetailOverlayOptional`) is only
 * visible to descendants of `TeamDetailOverlayProvider`. The *player* detail
 * overlay renders in a portal owned by `PlayerDetailOverlayProvider`, which
 * sits *above* the team provider in the tree, so it cannot read that context.
 *
 * To let the player card (and any other out-of-tree surface) open a manager
 * card, `TeamDetailOverlayProvider` registers its `openTeamDetail` here on
 * mount; callers use {@link requestOpenTeamDetail} or {@link ClickableManagerName}.
 * This is a deliberate decoupling from provider nesting and avoids the
 * circular import that importing the provider module would create.
 */

/** @type {((leagueEntryId: number) => void) | null} */
let opener = null

/**
 * Register the active team-detail opener. Returns an unregister fn.
 * @param {(leagueEntryId: number) => void} fn
 */
export function registerTeamDetailOpener(fn) {
  opener = fn
  return () => {
    if (opener === fn) opener = null
  }
}

/**
 * Open the manager card for a league entry, if an opener is registered.
 * @param {number} leagueEntryId
 * @returns {boolean} whether an opener handled the request
 */
export function requestOpenTeamDetail(leagueEntryId) {
  const id = Number(leagueEntryId)
  if (opener && Number.isFinite(id)) {
    opener(id)
    return true
  }
  return false
}

/**
 * A manager/team name that opens the manager card when clicked, routed through
 * the module-level opener bus so it works from surfaces outside the team
 * overlay provider (e.g. the player detail card). Falls back to a plain span
 * when no valid league entry id is provided. The click always
 * `stopPropagation`s so it never triggers a parent row handler.
 *
 * @param {object} props
 * @param {number | null | undefined} props.leagueEntryId
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} [props.title]
 * @param {() => void} [props.onNavigate] fired after the manager card is opened
 *   (only when an opener handled it) — e.g. to close the surface it was
 *   triggered from so the manager card *replaces* it rather than stacking.
 */
export function ClickableManagerName({
  leagueEntryId,
  children,
  className = '',
  title,
  onNavigate,
}) {
  const id = Number(leagueEntryId)
  const canOpen = leagueEntryId != null && Number.isFinite(id)
  if (!canOpen) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    )
  }
  const open = (e) => {
    e.stopPropagation()
    if (requestOpenTeamDetail(id)) onNavigate?.()
  }
  return (
    <span
      className={`${className ? `${className} ` : ''}tc-team-link`}
      title={title}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          open(e)
        }
      }}
    >
      {children}
    </span>
  )
}
