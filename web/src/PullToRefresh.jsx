import { usePullToRefresh } from './usePullToRefresh'
import './PullToRefresh.css'

/* Floating pull-to-refresh indicator for the installed (standalone PWA) app;
 * `?ptr=1` force-enables it in any browser for testing. A progress ring
 * draws around the disc as you pull, pops when the refresh arms, then spins
 * while `onRefresh` re-fetches league + live FPL data in place — see usePullToRefresh. */

const RING_R = 13
const RING_C = 2 * Math.PI * RING_R

export default function PullToRefresh({ onRefresh }) {
  const { enabled, distance, pulling, refreshing, armed, progress } =
    usePullToRefresh({ onRefresh })
  if (!enabled) return null
  const state = refreshing
    ? 'refreshing'
    : armed
      ? 'armed'
      : distance > 0
        ? 'pulling'
        : 'idle'
  return (
    <div
      className="ptr"
      aria-hidden="true"
      data-pulling={pulling ? 'true' : undefined}
    >
      <div
        className="ptr__disc"
        data-state={state}
        style={{
          transform: `translateY(${distance}px) scale(${
            refreshing ? 1 : 0.7 + 0.3 * progress
          })`,
          opacity: refreshing ? 1 : Math.min(1, progress * 1.5),
        }}
      >
        <svg className="ptr__ring" viewBox="0 0 32 32">
          <circle className="ptr__ring-track" cx="16" cy="16" r={RING_R} />
          <circle
            className="ptr__ring-arc"
            cx="16"
            cy="16"
            r={RING_R}
            strokeDasharray={RING_C}
            strokeDashoffset={
              refreshing ? RING_C * 0.3 : RING_C * (1 - progress)
            }
          />
        </svg>
      </div>
    </div>
  )
}
