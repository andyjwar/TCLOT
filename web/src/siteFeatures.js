/**
 * Per-site copy and dashboard sections (baked in at `vite build`).
 * Set in GitHub: Settings → Secrets and variables → Actions → Variables
 * (or Environment variables on `github-pages`), same as VITE_FPL_PROXY_URL.
 *
 * Title tile (omit vars for TCLOT defaults):
 * - ExFOS: VITE_LEAGUE_TITLE_ABBR=exFOS, VITE_LEAGUE_TITLE=2025-26 season
 * - EAGalaxy: VITE_LEAGUE_TITLE_ABBR=EA Galaxy, VITE_LEAGUE_TITLE=2025-26 season
 *
 * Dashboard toggles (omit = all on):
 * - EAGalaxy example: VITE_SHOW_DASHBOARD_TRADES=false, VITE_SHOW_DASHBOARD_HALL=false
 */
const DEFAULT_LEAGUE_TITLE_ABBR = 'TCLOT'
const DEFAULT_LEAGUE_TITLE = 'Tri-Continental League of Titans, 2025-26 season'

function readStringEnv(value, fallback) {
  if (value === undefined || value === null) return fallback
  const s = String(value).trim()
  return s ? s : fallback
}

function readBoolEnv(value, defaultTrue = true) {
  if (value === undefined || value === '') return defaultTrue
  const s = String(value).toLowerCase().trim()
  if (s === '0' || s === 'false' || s === 'no' || s === 'off') return false
  if (s === '1' || s === 'true' || s === 'yes' || s === 'on') return true
  return defaultTrue
}

export const LEAGUE_TITLE_ABBR = readStringEnv(
  import.meta.env.VITE_LEAGUE_TITLE_ABBR,
  DEFAULT_LEAGUE_TITLE_ABBR,
)
export const LEAGUE_TITLE = readStringEnv(
  import.meta.env.VITE_LEAGUE_TITLE,
  DEFAULT_LEAGUE_TITLE,
)

export const showDashboardTrades = readBoolEnv(
  import.meta.env.VITE_SHOW_DASHBOARD_TRADES,
  true,
)
export const showDashboardHall = readBoolEnv(
  import.meta.env.VITE_SHOW_DASHBOARD_HALL,
  true,
)
