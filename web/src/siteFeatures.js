/**
 * Per-site copy and dashboard sections (baked in at `vite build`).
 * Set in GitHub: Settings → Secrets and variables → Actions → Variables
 * (or Environment variables on `github-pages`), same as VITE_FPL_PROXY_URL.
 *
 * Title tile (omit vars for TCLOT defaults). TCLOT image header only when abbr is TCLOT (or
 * VITE_USE_TCLOT_HEADER_BRAND=true); other abbrs use text + pill in the title tile.
 * - ExFOS: VITE_LEAGUE_TITLE_ABBR=exFOS, VITE_LEAGUE_TITLE=2025-26 season
 * - EAGalaxy: VITE_LEAGUE_TITLE_ABBR=EA Galaxy, VITE_LEAGUE_TITLE=2025-26 season
 *
 * Dashboard toggles:
 * - Trades / Hall: omit = on. EAGalaxy: VITE_SHOW_DASHBOARD_TRADES=false, VITE_SHOW_DASHBOARD_HALL=false
 * - Playoff bracket: omit = off. ExFOS: VITE_SHOW_DASHBOARD_PLAYOFF=true
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

/**
 * `public/tclot-header-brand.png` is TCLOT-only. Other leagues (set `VITE_LEAGUE_TITLE_ABBR`) get the
 * text + abbr pill header. Optional override: `VITE_USE_TCLOT_HEADER_BRAND` = true | false.
 */
export const showTclotHeaderBrand = (() => {
  const v = import.meta.env.VITE_USE_TCLOT_HEADER_BRAND
  if (v === '1' || v === 'true' || v === 'on') return true
  if (v === '0' || v === 'false' || v === 'off') return false
  const abbr = readStringEnv(
    import.meta.env.VITE_LEAGUE_TITLE_ABBR,
    DEFAULT_LEAGUE_TITLE_ABBR,
  )
  return abbr.trim().toUpperCase() === 'TCLOT'
})()

export const showDashboardTrades = readBoolEnv(
  import.meta.env.VITE_SHOW_DASHBOARD_TRADES,
  true,
)
export const showDashboardHall = readBoolEnv(
  import.meta.env.VITE_SHOW_DASHBOARD_HALL,
  true,
)
export const showDashboardPlayoff = readBoolEnv(
  import.meta.env.VITE_SHOW_DASHBOARD_PLAYOFF,
  false,
)
