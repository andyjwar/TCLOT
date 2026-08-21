import { usePullToRefresh } from './usePullToRefresh'
import './PullToRefresh.css'

/** Where the badge parks while the reload is in flight (px). */
const TRAVEL_WHILE_REFRESHING = 70

/* Floating pull-to-refresh indicator for the installed (standalone PWA) app.
 * Renders nothing in regular browser tabs — see usePullToRefresh. Pull down
 * from the top of the page; releasing past the threshold reloads the app,
 * which refetches league data and picks up new deploys. */
export default function PullToRefresh() {
  const { enabled, distance, refreshing, armed, progress } = usePullToRefresh()
  if (!enabled) return null
  const active = refreshing || distance > 0
  return (
    <div className="ptr" aria-hidden="true">
      <div
        className={[
          'ptr__badge',
          armed ? 'ptr__badge--armed' : '',
          refreshing ? 'ptr__badge--spinning' : '',
          active ? '' : 'ptr__badge--settle',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          transform: `translateY(${refreshing ? TRAVEL_WHILE_REFRESHING : distance}px)`,
          opacity: refreshing ? 1 : Math.min(1, progress * 1.4),
        }}
      >
        <svg
          className="ptr__icon"
          viewBox="0 0 24 24"
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
        >
          <path
            fill="currentColor"
            d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.15.69 4.22 1.78L13 11h7V4l-2.35 2.35Z"
          />
        </svg>
      </div>
    </div>
  )
}
