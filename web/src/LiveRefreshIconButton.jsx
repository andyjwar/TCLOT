/**
 * Circular refresh control (purple theme via `.live-refresh-icon-btn` in App.css).
 */
export function LiveRefreshIconButton({ onClick, disabled, loading, title = 'Refresh' }) {
  return (
    <button
      type="button"
      className={'live-refresh-icon-btn' + (loading ? ' live-refresh-icon-btn--loading' : '')}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={loading ? 'Refreshing…' : title}
    >
      <svg
        className="live-refresh-icon-btn__svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    </button>
  )
}
