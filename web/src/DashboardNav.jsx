import { TeamAvatar } from './TeamAvatar'
import { NavIcon } from './NavIcon'

/** @typedef {'standings' | 'teamSelection' | 'players' | 'hall' | 'fplLive' | 'more' | 'settings'} DashboardViewId */

/** @typedef {'pulsing-dot' | 'bar-chart-3' | 'users' | 'shuffle' | 'trophy' | 'more'} NavIconName */

/**
 * Note: the view ID for the Transactions tab stays `teamSelection` to keep
 * already-stored Settings default-tab prefs (PR #3) working. Only the
 * user-visible label changes.
 *
 * @param {{
 *   item: {
 *     id: DashboardViewId,
 *     label: string,
 *     shortLabel: string,
 *     icon: NavIconName,
 *     pulse?: boolean,
 *     bottomOnly?: boolean,
 *   },
 *   active: boolean,
 *   onSelect: (id: DashboardViewId) => void,
 *   variant: 'top' | 'bottom',
 * }} props
 */
function NavButton({ item, active, onSelect, variant }) {
  const isBottom = variant === 'bottom'
  const iconClass =
    'dashboard-nav__icon' + (item.pulse ? ' dashboard-nav__icon--pulse' : '')
  return (
    <button
      type="button"
      className={
        'dashboard-nav__btn' +
        (active ? ' dashboard-nav__btn--active' : '') +
        (isBottom ? ' dashboard-nav__btn--bottom' : '')
      }
      onClick={() => onSelect(item.id)}
      aria-current={active ? 'page' : undefined}
      aria-label={isBottom ? item.label : undefined}
      title={isBottom ? item.label : undefined}
    >
      <NavIcon name={item.icon} className={iconClass} />
      <span className="dashboard-nav__label">
        {isBottom ? item.shortLabel : item.label}
      </span>
    </button>
  )
}

/**
 * @param {{ variant: 'top' | 'bottom', dashboardView: DashboardViewId, onSelect: (id: DashboardViewId) => void }} props
 */
export function DashboardNav({ variant, dashboardView, onSelect }) {
  const isBottom = variant === 'bottom'

  const primaryItems = [
    {
      id: /** @type {const} */ ('fplLive'),
      label: 'FPL Live',
      shortLabel: 'Live',
      icon: /** @type {const} */ ('pulsing-dot'),
      pulse: true,
    },
    {
      id: /** @type {const} */ ('standings'),
      label: 'Standings',
      shortLabel: 'Table',
      icon: /** @type {const} */ ('bar-chart-3'),
    },
    {
      id: /** @type {const} */ ('teamSelection'),
      label: 'Transactions',
      shortLabel: 'Moves',
      icon: /** @type {const} */ ('users'),
    },
    {
      id: /** @type {const} */ ('players'),
      label: 'Players',
      shortLabel: 'Wire',
      icon: /** @type {const} */ ('shuffle'),
    },
    {
      id: /** @type {const} */ ('more'),
      label: 'More',
      shortLabel: 'More',
      icon: /** @type {const} */ ('more'),
      bottomOnly: true,
    },
  ]

  const topItems = [
    primaryItems.find((i) => i.id === 'standings'),
    primaryItems.find((i) => i.id === 'teamSelection'),
    {
      id: /** @type {const} */ ('hall'),
      label: 'Hall of Champions',
      shortLabel: 'Hall',
      icon: /** @type {const} */ ('trophy'),
    },
    primaryItems.find((i) => i.id === 'players'),
    primaryItems.find((i) => i.id === 'fplLive'),
  ].filter(Boolean)

  const items = isBottom
    ? primaryItems.filter((i) => i.bottomOnly || !i.bottomOnly)
    : topItems

  const isActive = (id) => {
    if (id === 'more') {
      return (
        dashboardView === 'more' ||
        dashboardView === 'hall' ||
        dashboardView === 'settings'
      )
    }
    return dashboardView === id
  }

  return (
    <nav
      className={
        'dashboard-nav' + (isBottom ? ' dashboard-nav--bottom' : ' dashboard-nav--top')
      }
      aria-label={isBottom ? 'App navigation' : 'Dashboard sections'}
    >
      {items.map((item) => (
        <NavButton
          key={item.id}
          item={item}
          active={isActive(item.id)}
          onSelect={onSelect}
          variant={variant}
        />
      ))}
    </nav>
  )
}

export function DashboardMorePanel({
  onNavigate,
  badgeTeams = [],
  teamLogoMap = {},
  kitIndexByEntry = {},
}) {
  const rows = [
    { id: /** @type {const} */ ('hall'), label: 'Hall of Champions', emoji: '🏆' },
    { id: /** @type {const} */ ('settings'), label: 'Settings', emoji: '⚙️' },
  ]

  return (
    <section className="tile tile--compact dashboard-more" aria-label="More">
      <h2 className="tile-title tile-title--sm">More</h2>
      {badgeTeams.length > 0 ? (
        <div className="dashboard-more__badges">
          <h3 className="dashboard-more__section-title">Badges</h3>
          <ul className="dashboard-more__badge-grid">
            {badgeTeams.map((t) => (
              <li key={t.id} className="dashboard-more__badge-cell">
                <TeamAvatar
                  entryId={t.id}
                  name={t.teamName}
                  size="lg"
                  logoMap={teamLogoMap}
                  kitIndexByEntry={kitIndexByEntry}
                />
                <span className="dashboard-more__badge-name">{t.teamName}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <ul className="dashboard-more__list">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className="dashboard-more__btn"
              onClick={() => onNavigate(row.id)}
            >
              <span className="dashboard-more__emoji" aria-hidden="true">
                {row.emoji}
              </span>
              <span className="dashboard-more__label">{row.label}</span>
              <span className="dashboard-more__chevron" aria-hidden="true">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
