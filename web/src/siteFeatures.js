/**
 * Per-site copy and dashboard sections (baked in at `vite build`).
 * Set in GitHub: Settings → Secrets and variables → Actions → Variables
 * (or Environment variables on `github-pages`), same as VITE_FPL_PROXY_URL.
 *
 * Title tile (omit vars for TCLOT defaults). Branded `public/*.png` header when: optional
 * `VITE_LEAGUE_HEADER_IMAGE`, or abbr is exFOS / EA Galaxy / TCLOT (see `leagueHeaderBrandSrc`). Otherwise: text
 * + pill in the title tile.
 * - exFOS: VITE_LEAGUE_TITLE_ABBR=exFOS — uses `exfos-header-brand.png` (replaces abbr + season line in tile)
 * - EAGalaxy: VITE_LEAGUE_TITLE_ABBR=EA Galaxy — `ea-galaxy-header-brand.png`
 * - (Legacy) VITE_LEAGUE_TITLE=2025-26 season when using text title only
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

const viteBase = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
function publicAssetPath(filename) {
  return `${viteBase}${String(filename).replace(/^\//, '')}`
}

/**
 * `null` = text title (abbr + VITE_LEAGUE_TITLE). Otherwise `<img src>` in the title tile.
 * - `VITE_LEAGUE_HEADER_IMAGE` = public path/filename (highest priority)
 * - Else exFOS → `exfos-header-brand.png`
 * - Else EA Galaxy → `ea-galaxy-header-brand.png`
 * - Else TCLOT when `showTclotHeaderBrand` → `tclot-header-brand.png`
 */
export const leagueHeaderBrandSrc = (() => {
  const fromEnv = readStringEnv(import.meta.env.VITE_LEAGUE_HEADER_IMAGE, '')
  if (fromEnv) return publicAssetPath(fromEnv)
  const abbr = readStringEnv(
    import.meta.env.VITE_LEAGUE_TITLE_ABBR,
    DEFAULT_LEAGUE_TITLE_ABBR,
  )
    .trim()
    .replace(/\s+/g, ' ')
  // Case-insensitive so GitHub Variables match (e.g. exfos, EA GALAXY)
  const abbrLc = abbr.toLowerCase()
  if (abbrLc === 'exfos') return publicAssetPath('exfos-header-brand.png')
  if (abbrLc === 'ea galaxy') return publicAssetPath('ea-galaxy-header-brand.png')
  if (showTclotHeaderBrand) return publicAssetPath('tclot-header-brand.png')
  return null
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
