/**
 * NavIcon — monochrome Lucide-style line icons for the main DashboardNav.
 *
 * SVG paths are duplicated from Mockup.jsx's `LucideIcon` rather than imported
 * because Mockup.jsx is a temporary design spec slated for removal after
 * Phase 2 lands. Six cases cover the live nav set:
 *
 *   - pulsing-dot  : FPL Live (filled #16a34a circle, no stroke; animated by CSS)
 *   - bar-chart-3  : Standings
 *   - users        : Transactions (formerly "Team Selection")
 *   - shuffle      : Players
 *   - trophy       : Hall of Champions
 *   - more         : More menu (three horizontal dots)
 *
 * Stroke color is `currentColor` so the icon inherits CSS color from its
 * surrounding button (active vs. idle). pulsing-dot is the lone exception:
 * its green fill carries meaning and is not theme-dependent.
 */

/**
 * @param {{
 *   name: 'pulsing-dot' | 'bar-chart-3' | 'users' | 'shuffle' | 'trophy' | 'more',
 *   className?: string,
 *   size?: number,
 * }} props
 */
export function NavIcon({ name, className, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
    className,
  }
  switch (name) {
    case 'pulsing-dot':
      return (
        <svg {...common}>
          <g className="nav-icon__pulse-target">
            <circle cx="12" cy="12" r="5" fill="#16a34a" stroke="none" />
          </g>
        </svg>
      )
    case 'bar-chart-3':
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'shuffle':
      return (
        <svg {...common}>
          <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" />
          <path d="m18 2 4 4-4 4" />
          <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
          <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
          <path d="m18 14 4 4-4 4" />
        </svg>
      )
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      )
    case 'more':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      )
    default:
      return null
  }
}
