/*
 * TCLOT Design Mockup — local-only preview at ?mockup=1
 *
 * Demonstrates the modernization recommendations end-to-end:
 *   - Slim hero
 *   - Two accent variants side-by-side
 *   - Two background shells side-by-side
 *   - Lucide vs Phosphor icon family compare
 *   - Geist Sans typography + 6-step type scale
 *   - FotMob-flush standings (real league data)
 *   - Polished schedule matrix concept
 *   - Nav before/after
 *   - Hall trophies de-golded
 *   - Generative live banner concept
 *
 * Gated at main.jsx behind `?mockup=1`. Production code paths untouched.
 */

import { Fragment, useMemo, useState } from 'react'
import { useLeagueData } from './useLeagueData'
import { TeamAvatar } from './TeamAvatar'
import './Mockup.css'
import { MOCKUP_PART2_SECTIONS } from './MockupSurfacesPart2.jsx'
import './MockupSurfacesPart2.css'
import {
  HALL_SEASON_FINAL_TABLES,
  hallManagerDisplayKey,
} from './hallManagerHistory'

/* ------------------------------------------------------------------ */
/* Icon families — minimal inline SVGs                                  */
/* ------------------------------------------------------------------ */

// Lucide style: 24px viewBox, stroke 2, line caps round.
function LucideIcon({ name, ...rest }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest,
  }
  switch (name) {
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
    case 'radio':
      return (
        <svg {...common}>
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
          <circle cx="12" cy="12" r="2" />
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
          <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
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
    // ---- FPL Live indicator candidates ----------------------------------
    // Solid filled dot. Pair with the .mockup-nav-icon--pulse class on the
    // parent button to get a subtle breathing animation.
    case 'pulsing-dot':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
        </svg>
      )
    // Center dot + 2 concentric arcs in the upper-right quadrant. Reads as
    // "broadcasting outward from this point" rather than wifi-symmetric.
    case 'radar-rings':
      return (
        <svg {...common}>
          <circle cx="7" cy="17" r="1.6" fill="currentColor" stroke="none" />
          <path d="M7 13a4 4 0 0 1 4 4" />
          <path d="M7 9a8 8 0 0 1 8 8" />
        </svg>
      )
    // Simplified soccer ball: outer circle + central pentagon stitching.
    case 'football':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5 16 10.5 14.5 15h-5L8 10.5z" />
          <path d="M12 7.5V4" />
          <path d="m16 10.5 3.5-1.5" />
          <path d="m14.5 15 2.5 3" />
          <path d="m9.5 15-2.5 3" />
          <path d="M8 10.5 4.5 9" />
        </svg>
      )
    // Outlined right-pointing triangle (▶), stroke not fill.
    case 'play-triangle':
      return (
        <svg {...common}>
          <path d="M8 5v14l11-7z" />
        </svg>
      )
    // Top crown bar + side button + circle body + hour hand.
    case 'stopwatch':
      return (
        <svg {...common}>
          <path d="M10 2h4" />
          <path d="m18.5 6.5-1.5 1.5" />
          <circle cx="12" cy="14" r="8" />
          <path d="M12 14V9.5" />
        </svg>
      )
    default:
      return null
  }
}

// Phosphor "regular" style: 24px viewBox, stroke 1.6, rounded caps, slightly more
// geometric — a bit warmer / more sport-app feeling than Lucide.
function PhosphorIcon({ name, ...rest }) {
  const common = {
    viewBox: '0 0 256 256',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 16,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest,
  }
  switch (name) {
    case 'bar-chart-3':
      return (
        <svg {...common}>
          <path d="M32 32v192h192" />
          <rect x="64" y="128" width="32" height="64" rx="2" fill="currentColor" stroke="none" />
          <rect x="116" y="92" width="32" height="100" rx="2" fill="currentColor" stroke="none" />
          <rect x="168" y="56" width="32" height="136" rx="2" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <circle cx="100" cy="108" r="36" />
          <path d="M48 200a64 64 0 0 1 104 0" />
          <path d="M168 92a36 36 0 0 1 28 56" />
          <path d="M168 200a64 64 0 0 0-12-37" />
        </svg>
      )
    case 'shuffle':
      return (
        <svg {...common}>
          <path d="M32 64h32l128 128h32" />
          <path d="M32 192h32l40-40" />
          <path d="M152 104l40-40h32" />
          <path d="m200 40 24 24-24 24" />
          <path d="m200 168 24 24-24 24" />
        </svg>
      )
    case 'radio':
      return (
        <svg {...common}>
          <circle cx="128" cy="128" r="16" fill="currentColor" stroke="none" />
          <path d="M88 168a56 56 0 0 1 0-80" />
          <path d="M168 88a56 56 0 0 1 0 80" />
          <path d="M64 192a96 96 0 0 1 0-128" />
          <path d="M192 64a96 96 0 0 1 0 128" />
        </svg>
      )
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M64 32h128v40a64 64 0 0 1-128 0Z" />
          <path d="M64 56H44a20 20 0 0 0 0 40h26" />
          <path d="M192 56h20a20 20 0 0 1 0 40h-26" />
          <path d="M96 224h64" />
          <path d="M128 152v72" />
        </svg>
      )
    case 'more':
      return (
        <svg {...common}>
          <circle cx="128" cy="128" r="14" fill="currentColor" stroke="none" />
          <circle cx="64" cy="128" r="14" fill="currentColor" stroke="none" />
          <circle cx="192" cy="128" r="14" fill="currentColor" stroke="none" />
        </svg>
      )
    default:
      return null
  }
}

const NAV_ITEMS = [
  { id: 'fplLive',       label: 'FPL Live',     icon: 'radio',       emoji: '🟢', legacyEmoji: '🟢' },
  { id: 'standings',     label: 'Standings',    icon: 'bar-chart-3', emoji: '📈' },
  { id: 'teamSelection', label: 'Team Selection', icon: 'users',     emoji: '👥' },
  { id: 'players',       label: 'Players',      icon: 'shuffle',     emoji: '🎢' },
  { id: 'hall',          label: 'Hall',         icon: 'trophy',      emoji: '🏆' },
  { id: 'more',          label: 'More',         icon: 'more',        emoji: '⋯' },
]

/* ------------------------------------------------------------------ */
/* Section: design decisions tracker                                    */
/* ------------------------------------------------------------------ */

// Decided + Open lists are structured as data so the column counts in the
// header stay accurate as items move between columns.
const DECISIONS_DECIDED = [
  {
    surface: 'HEADER',
    items: [
      'Variant B — gradient pill (lion + TCLOT) on left, season label right-aligned',
      'Theme toggle moves to a Settings page (not in header)',
      'Live / GW state chip lives on the Live page only (not in header)',
      'Post-PR-#2 evolution: status strip below the brand pill (variant 1) — locked',
    ],
  },
  {
    surface: 'PLAYERS TAB',
    items: [
      'Default sort: Total points ↓',
      'Default filter: Free agents only · "Include drafted" toggle to expand',
      'Filter pills: Position · Club · Owned · Sort (Status pill dropped)',
      'XI / BN / OUT status pill removed from this tab',
      'Desktop player cell: single line — crest + name + position chip',
      'Desktop columns: production position-aware system (defaultWireStatIdsForPosition + StatsColumnsPill)',
      'Portrait: sticky-header sortable table — Player · Pts · Pos · G · A · DC · Next, Pts active sort',
    ],
  },
  {
    surface: 'PLAYER DETAIL',
    items: [
      'Full-bleed slide-over (X / Escape / swipe-right / back-strip dismissal). Implemented inside existing PlayerDetailOverlay.jsx — not URL navigation, not a small floating modal',
      'Hero action: Compare only (no Add-to-wire / Star / More)',
      'Form display: bar chart with positive / negative tone',
      'Position-average comparison strip: dropped',
      'Tabs: Overview · Fixtures · Form · History (no News tab)',
      'Hero: club crest only (no kit shirt option)',
      'Upcoming fixtures: next 5',
      'History tab: current season only',
      'Click-anywhere mechanism: existing <ClickablePlayerName> primitive (PlayerHistoryContext.jsx) — used wherever player names appear',
      'PlayerSeasonSlideOver.jsx retired in Phase 2 once the new overlay UI is live (file + PlayerHistoryContext fallback path both removed)',
    ],
  },
  {
    surface: 'COMPARE',
    items: [
      'Portrait layout: stacked rows with inline Δ column',
      'Max players: 2',
      'Stat defaults: position-aware (GK/DEF/MID/FWD different rows)',
      'Add-player UI: Search tab (default) + "From a squad" tab',
      'Compare entry point: Player Detail → Compare button only',
      'Search results: 18px crest + name + club code + position chip (medium density)',
      '"From a squad" expansion: inline — squad list expands below the selector (drawer / modal / popover rejected)',
    ],
  },
  {
    surface: 'BRAND',
    items: [
      'Lion icon: keep the inline path extracted from the TCLOT banner SVG',
      'Brand pill scope: header only (not on Trophy cards / Records / share assets)',
    ],
  },
  {
    surface: 'NAV',
    items: [
      '"Team Selection" renames to "Transactions" (label-only, same page, same view ID). Implemented in a small post-PR-#3 follow-up that updates DashboardNav.jsx label string, App.jsx view labels, and Settings dropdown options.',
    ],
  },
  {
    surface: 'TROPHY ROOM',
    items: [
      'Lives under Hall sub-nav: Champions · Trophy room (Records scrapped)',
      'Card concept: banner is artwork — no duplicated team / season text',
      'Card accent: brand violet 2px top line (Option A)',
      'Grid: 1:1 square aspect, 4 cols desktop / 2 tablet / 1 mobile (Option B)',
    ],
  },
  {
    surface: 'LIVE SCORES (expanded view)',
    items: [
      'Stat tracking: tabbed table — G · A · CS · DC · B columns',
      'Status pills (XI / BN / OUT) on each row',
      'Goal / assist event dots; clean-sheet dot',
      'Defensive-contribution threshold: green / bold when met per position',
      'Softer yellow / red in dark mode',
      'Live banner group: shared status header (not per-card)',
      'Live winner indication: brand-violet winner score number (Option D — Brand score)',
      'Ticker: single header for overall GW status',
    ],
  },
  {
    surface: 'LIVE FACE-OFF · HERO/VILLAIN BADGE',
    items: [
      'Variant 1 — avatar status ring (2px) + tiny floating badge dot (🦸 / 🦹 emoji) + caption pill below.',
      'Hero defeat: orange/amber #d97706. Villain victory: violet #7c3aed. Reused as production CSS vars (--live-hero-color / --live-villain-color in App.css).',
      'Wired into LiveFaceOffRow on redesign-phase-2; legacy rectangular tile retained in squad-tile heads + expanded-fixture standings (out of scope for this lock).',
    ],
  },
  {
    surface: 'SCHEDULE',
    items: [
      'Mobile: single-team mode (pick a team, see their season)',
      'Mobile rows: single stream with sticky GW labels (no segment headers, no month groups)',
      'Mobile row status: colored dot only — no W/L/T result chip (dot conveys live/upcoming/done state)',
      'Desktop matrix → single-team mode: click a team column header in the matrix to drill in',
    ],
  },
  {
    surface: 'STANDINGS',
    items: [
      'Form pip count: 8 on desktop, 5 on portrait/mobile (responsive)',
      'Schedule-strength metric: dropped — placeholder removed',
    ],
  },
  {
    surface: 'WAIVERS / PICKUPS / DROPS',
    items: [
      'Unified feed excludes trade rows by default — Trades have their own page',
      'Tenure metric: render the existing pickups-tenure.json field (Total FPL pts while on squad after waiver-in, stints summed)',
    ],
  },
  {
    surface: 'TRADES',
    items: [
      '"Net pts since trade" verdict line: dropped for now — show the swap, let users judge',
      'No captain / vice-captain marks anywhere in the mockup (Draft H2H has no captaincy)',
    ],
  },
  {
    surface: 'PLAYER CONTRIBUTIONS · LOCKED',
    items: [
      'Density: Variant A (card per event) — top line: event-kind icon + label · player + crest · minute · points pill; second line: team badge + team name. Manager name and relative timestamp removed.',
      'Filter UX: Variant 2 (multi-select dropdown) — popover with checkboxes for event kinds + teams; popover footer has paired "Select all · Clear all" affordances.',
      'Pagination: full event list rendered in a scrollable max-height container. Universal across viewports (replaces the prior mobile-latest-only pattern).',
      'Streaming animation: brand-violet pulse + highlight on row arrival (locked from prior pass).',
    ],
  },
  {
    surface: 'SCOPE',
    items: [
      'Records page: scrapped — data discoverable elsewhere',
      'Compare experience: kept — existing player data only, no new data introduced',
      'Site-wide approach: redesign of existing surfaces and data; no net-new data sources',
      'Redesign-not-rebuild rule: surfaces with locked decisions get redesigned in Phase 2; all other production surfaces inherit global tokens (--fm-*, --space-*, --brand, Geist fonts) automatically — no bespoke redesign of FormAndH2hSection, PremWindow, WaiverSummaryShare, DraftQuality, LiveFixtureGwPointsChart, FplLiveTripleThreatBanner, etc.',
      'PlayerContributions stays on Live page (locked) — redesigned in PR #5b: chronological newest-first, modern tokens, streaming pulse/highlight. Player Detail Form tab may still surface the player-scoped variant of the same data (separate filter, same source).',
    ],
  },
  {
    surface: 'SYSTEM',
    items: [
      'Light theme is the default (dark is opt-in)',
      'Fonts: Geist Sans body, Geist Mono for numerics',
      'Token system (--fm-*, --space-*, --r-*, --brand)',
      'FotMob-inspired clean aesthetic',
      'Info-only site — no actions (no Add / Drop / Star buttons)',
      'No horizontal scroll on mobile across all key surfaces',
    ],
  },
  {
    surface: 'SETTINGS',
    items: [
      'Contents: theme toggle (Light / Dark / System) + default landing tab dropdown',
      'Layout: minimal card, no sectioned subheaders',
      'Access: inside the existing More menu (no new header chrome)',
      'ThemeToggle.jsx logic reused — Settings just hosts the existing component',
    ],
  },
  {
    surface: 'PLAYOFFS',
    items: [
      'Playoffs not part of design — removed from mockup; in Phase 2 fully delete PlayOffBracket.jsx, VITE_SHOW_DASHBOARD_PLAYOFF env var (siteFeatures.js), the More-menu entry (DashboardNav.jsx), and routing (App.jsx)',
    ],
  },
  {
    surface: 'LEGACY DETAILS',
    items: [
      'Form pip: dot only',
      'Champion marker: no extra decoration',
      'Live motion: static dot (no pulse)',
      'Eyebrow case: Title Case',
      'Hall layout: podium then table',
      'Player shirts: club crests',
      'Position chip in draft: yes — next to player name',
      'Portrait draft: player on top, team below',
    ],
  },
]

const DECISIONS_OPEN = [
  {
    surface: 'PRODUCTION WIRING',
    items: [
      'Phase 2 not started — locked design decisions need to be applied to production code',
    ],
  },
  {
    surface: 'OPEN VARIANTS · NEEDS PICK BEFORE PR #4',
    items: [
      'FPL Live sub-nav: text-only (A) vs PL-crest-on-Lineups-only (B) vs icons-everywhere (C). See SUB-NAV · FPL LIVE showcase.',
      'Header tile chrome: variant 4 with tile chrome (currently shipped in PR #3.7) vs full-bleed combos 5a/5b/5c. See HEADER · FULL-BLEED + STATUS STRIP COMBOS showcase.',
    ],
  },
  {
    surface: 'PAGE BG · BACKGROUND + HEADER TREATMENT',
    items: [
      'A: lifted bg (#fafafa); B: single-color (FotMob mobile); C: brand-tint hero strip; D: shadow-based cards on white body. User to pick — possibly mix (e.g. B on mobile, A on desktop). See BACKGROUND + HEADER COLOR VARIANTS showcase.',
    ],
  },
  {
    surface: 'MOBILE NAV · BOTTOM NAV TREATMENT',
    items: [
      'A: current flush, full-width; B: floating pill (Lyft-style, icons only); C: floating rounded rectangle with labels; D: half-floating, rounded top corners only. See FLOATING BOTTOM NAV — VARIANTS showcase.',
    ],
  },
]

function DecisionsColumn({ tone, label, groups }) {
  const count = groups.reduce((sum, g) => sum + g.items.length, 0)
  const isDecided = tone === 'decided'
  return (
    <div className={`mockup-decisions__col mockup-decisions__col--${tone}`}>
      <div className="mockup-decisions__col-h">
        <span
          className={`mockup-decisions__col-glyph mockup-decisions__col-glyph--${tone}`}
          aria-hidden
        >
          {isDecided ? '✓' : '◯'}
        </span>
        <span className="mockup-decisions__col-label">{label}</span>
        <span className="mockup-decisions__col-sep" aria-hidden>·</span>
        <span className="mockup-decisions__col-count">{count}</span>
      </div>
      {groups.map((group) => (
        <div className="mockup-decisions__group" key={group.surface}>
          <h4 className="mockup-decisions__group-h">{group.surface}</h4>
          <ul className="mockup-decisions__list">
            {group.items.map((item, idx) => (
              <li className="mockup-decisions__row" key={idx}>
                <span
                  className={`mockup-decisions__glyph mockup-decisions__glyph--${tone}`}
                  aria-hidden
                >
                  {isDecided ? '✓' : '◯'}
                </span>
                <span className="mockup-decisions__text">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function DecisionsTracker() {
  return (
    <div className="mockup-decisions">
      <DecisionsColumn tone="decided" label="Decided" groups={DECISIONS_DECIDED} />
      <DecisionsColumn tone="open" label="Open" groups={DECISIONS_OPEN} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: slim hero                                                   */
/* ------------------------------------------------------------------ */
function SlimHero() {
  return (
    <>
      <div className="mockup-hero">
        <span className="mockup-hero__mark" aria-hidden>TC</span>
        <span className="mockup-hero__title">
          <span className="mockup-hero__wordmark">TCLOT</span>
          <span className="mockup-hero__sub">2025/26 · FPL Draft H2H</span>
        </span>
        <span className="mockup-hero__right">
          <span className="mockup-hero__chip">
            <span className="mockup-hero__chip-dot" />
            Live · GW 28
          </span>
          <span
            className="mockup-hero__theme-toggle"
            role="img"
            aria-label="Theme toggle preview"
          >
            <span className="mockup-hero__theme-thumb" />
          </span>
        </span>
      </div>
      <div className="mockup-strip" aria-label="League teams">
        {['TO', 'CE', 'CC', 'HA', 'HM', 'MJ', 'SC', 'BM'].map((c, i) => (
          <span key={i} className="mockup-strip__crest">{c}</span>
        ))}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Brand-integration variants — explores how much of the real TCLOT     */
/* logo (PL lion + violet→indigo wordmark) carries into the app header. */
/* Lion path is extracted verbatim from /tclot-fantasy-style-banner.svg */
/* so it stays faithful to the production asset.                        */
/* ------------------------------------------------------------------ */

const TCLOT_LION_PATH = "m 60.78468,39.44666 c -1.88455,1.54443 -3.48225,2.4052 -3.48225,2.4052 l 0.0218,4.89541 c 1.34714,1.46649 2.67613,2.68148 3.67106,4.8954 1.88818,-3.31555 1.52507,-8.18972 -0.2106,-12.19601 m -1.53234,16.0252 c 0,0 -0.38489,-2.01909 -2.02253,-3.90357 l -3.73642,0.0886 c 0,0 -5.03636,4.22239 -8.10829,4.32156 0,0 1.6921,3.07115 2.54905,4.6758 1.68847,-0.36132 4.66235,-1.66133 5.86062,-3.02156 0,0 0.79159,2.49022 0.64271,5.43029 1.68121,-0.94932 3.99786,-3.52809 4.81486,-7.59107 m -4.81486,-8.84149 -0.007,-4.8777 c 0,0 -2.23314,-0.69782 -4.61515,-2.50084 -4.78582,0.70492 -10.58109,5.40195 -10.58109,5.40195 0,0 1.95718,3.62375 4.09954,7.53441 3.76547,0.51362 9.31382,-4.12675 11.10396,-5.55782 m 12.76338,20.31134 -3.07919,-3.32618 c -0.87873,8.99027 -5.39221,16.62385 -13.68205,21.94787 l -1.26726,-4.84936 c -7.03711,4.95917 -19.11421,8.17555 -29.48832,2.45125 1.28904,-6.4115 2.43285,-12.90801 -0.0218,-20.68683 -5.74443,8.67855 -10.828,12.07912 -10.828,12.07912 C 4.95285,68.19927 5.30143,55.44358 6.45976,51.68877 L 0,53.64056 C 0,49.35442 3.1627,40.26143 7.74518,35.15348 L 3.711,34.52296 l -0.004,0 C 6.4485,29.05725 10.54077,24.34603 15.54808,20.80731 l 0.007,-0.004 c -1.50328,2.31664 -1.52507,8.03385 2.87948,10.20881 -1.87002,-3.19866 -2.09515,-7.15184 -0.14161,-9.19927 1.95354,-2.06514 5.2397,-1.35668 7.33849,0.24442 -0.62455,-1.7853 -2.45464,-4.031096 -5.19613,-4.183413 l -0.004,0 c 5.17797,-2.600022 11.05676,-4.062977 17.27686,-4.062977 1.16196,0 2.32029,0.04959 3.4532,0.148775 l 0,0 c 1.8083,0.708453 4.46264,3.195123 5.70086,4.743095 0,0 0.0871,-1.82427 -0.95136,-4.027558 6.73573,1.601103 9.94927,4.275518 11.29641,5.564898 0.27597,2.8409 1.14744,4.54473 2.2985,7.24393 -2.1823,-2.38395 -7.66529,-6.23084 -10.28333,-7.15183 0,0 -0.21423,2.46188 -1.11475,3.64499 -5.21429,-3.66978 -7.77423,-4.59432 -7.77423,-4.59432 -5.72264,0.80055 -9.4046,2.95425 -11.40534,4.64746 l 1.74293,1.44877 c -3.44956,1.03435 -5.68996,3.92483 -5.68996,3.92483 0.0254,0.0532 3.08282,0.47821 3.08282,0.47821 0,0 -0.31228,3.5033 4.18305,5.69951 3.85262,1.88094 9.39007,-0.45341 14.60436,1.58693 -3.42777,-3.86106 -5.7989,-5.58615 -5.7989,-5.58615 0,0 -1.36167,-0.27629 -2.32028,-0.26922 -1.19827,0.007 -2.98478,0.23734 -4.94195,-0.50654 -0.93683,-0.35777 -2.0298,-0.98828 -2.88674,-1.51254 0,0 2.40743,-2.41229 5.92598,-2.94363 0,0 3.1736,0.8714 5.68634,2.68504 1.67031,-1.58693 3.41325,-1.53734 3.41325,-1.53734 0,0 -1.72842,1.57276 -1.20553,3.4785 2.5091,2.18204 5.23244,5.30631 5.23244,5.30631 2.77417,-1.48067 8.80546,-1.14061 10.04367,0.26213 -1.56864,-1.9872 -3.83083,-3.64499 -5.58103,-5.06189 -0.21423,-0.74388 -2.1242,-3.33681 -2.44737,-3.57769 0,0 1.81556,0.54551 3.43867,1.96596 0.46478,-0.64824 1.33625,-1.3071 2.52363,-1.59756 1.22005,0.99891 1.43792,2.53271 1.40524,2.78776 -0.5483,0.64115 -1.09297,0.90328 -1.09297,0.90328 l 2.94121,3.10656 0.29412,-2.22809 c 6.77567,9.44014 10.46852,20.36448 5.71901,34.09784 M 13.69195,7.197881 c 3.90709,1.746337 6.41619,3.949626 6.87371,4.286141 -0.20697,-0.984749 -0.97677,-5.7243 -1.41977,-8.667921 2.27671,1.540885 7.55999,5.118572 9.2993,6.280434 0.70807,-2.1289 3.1627,-9.082366 3.1627,-9.082366 0,0 4.43723,7.0066 5.19613,8.143667 C 37.72996,7.212051 43.03139,1.455872 44.40396,0 c 0.22876,3.312017 0.54103,8.048026 0.62092,8.760021 0.26507,-0.350685 2.29487,-3.12782 5.69722,-5.685335 -1.47423,2.833811 -2.17867,6.744471 -2.49094,9.88646 -3.34789,-0.910362 -6.88097,-1.399194 -10.51936,-1.399194 -6.9899,0 -13.55496,1.792386 -19.2304,4.941459 -1.03124,-3.035721 -2.64709,-6.811775 -4.78945,-9.30553"

function TclotLionIcon({ size = 28, color = '#ffffff', opacity = 1, style }) {
  return (
    <svg
      viewBox="-10 -8 134 144"
      width={size}
      height={size}
      aria-hidden
      style={{ display: 'block', ...style }}
    >
      <g fill={color} fillOpacity={opacity} transform="scale(1.58)">
        <path d={TCLOT_LION_PATH} />
      </g>
    </svg>
  )
}

/* Variant A — Lion icon + wordmark (subtle, lightest touch).
 * Small gradient circle holds the white lion silhouette, then the
 * "TCLOT" wordmark sits beside it. Subtitle is dropped to stay clean. */
function HeroVariantA() {
  return (
    <div className="mockup-hero mockup-brand-a">
      <span className="mockup-brand-icon" aria-hidden>
        <TclotLionIcon size={20} />
      </span>
      <span className="mockup-hero__title">
        <span className="mockup-hero__wordmark">TCLOT</span>
        <span className="mockup-hero__sub">2025/26 · FPL Draft H2H</span>
      </span>
      <span className="mockup-hero__right">
        <span className="mockup-hero__chip">
          <span className="mockup-hero__chip-dot" />
          Live · GW 28
        </span>
        <span
          className="mockup-hero__theme-toggle"
          role="img"
          aria-label="Theme toggle preview"
        >
          <span className="mockup-hero__theme-thumb" />
        </span>
      </span>
    </div>
  )
}

function HeroVariantAMobile() {
  return (
    <div className="mockup-hero mockup-brand-a mockup-brand-a--mobile">
      <span className="mockup-brand-icon mockup-brand-icon--sm" aria-hidden>
        <TclotLionIcon size={16} />
      </span>
      <span className="mockup-hero__title">
        <span className="mockup-hero__wordmark">TCLOT</span>
        <span className="mockup-hero__sub mockup-brand-a__sub--mobile">
          2025/26 · FPL Draft
        </span>
      </span>
      <span className="mockup-hero__right">
        <span className="mockup-brand-live-mono">
          <span className="mockup-hero__chip-dot" />
          LIVE GW28
        </span>
        <span
          className="mockup-hero__theme-toggle"
          role="img"
          aria-label="Theme toggle preview"
        >
          <span className="mockup-hero__theme-thumb" />
        </span>
      </span>
    </div>
  )
}

/* Variant B — Gradient pill (middle ground).
 * The lavender square is replaced with a single horizontal gradient
 * pill that holds the lion + "TCLOT" wordmark inline — effectively a
 * miniaturized version of the actual brand card. */
function HeroVariantB() {
  return (
    <div className="mockup-hero mockup-brand-b">
      <span className="mockup-brand-pill" aria-label="TCLOT">
        <TclotLionIcon size={22} />
        <span className="mockup-brand-pill__wordmark">TCLOT</span>
      </span>
      <span className="mockup-brand-b__meta">FPL Draft H2H</span>
      <span className="mockup-brand-b__season">2025/26</span>
    </div>
  )
}

function HeroVariantBMobile() {
  return (
    <div className="mockup-hero mockup-brand-b mockup-brand-b--mobile">
      <span
        className="mockup-brand-pill mockup-brand-pill--sm"
        aria-label="TCLOT"
      >
        <TclotLionIcon size={16} />
        <span className="mockup-brand-pill__wordmark">TCLOT</span>
      </span>
      <span className="mockup-brand-b__season mockup-brand-b__season--mobile">
        2025/26
      </span>
    </div>
  )
}

/* Variant C — Hero watermark (boldest).
 * Larger header; the full logo asset sits as a low-opacity watermark
 * filling the left 40%. Wordmark + season text overlay it; right side
 * keeps the clean live + theme toggle on the surface. */
function HeroVariantC() {
  return (
    <div className="mockup-brand-hero">
      <div className="mockup-brand-hero__panel" aria-hidden>
        <div className="mockup-brand-hero__panel-mark">
          <TclotLionIcon size={56} color="#ffffff" opacity={0.85} />
        </div>
      </div>
      <div className="mockup-brand-hero__content">
        <span className="mockup-brand-hero__wordmark">TCLOT</span>
        <span className="mockup-brand-hero__sub">
          Tri-Continental League of Titans · 2025/26 · FPL Draft H2H
        </span>
      </div>
      <span className="mockup-hero__right mockup-brand-hero__right">
        <span className="mockup-hero__chip">
          <span className="mockup-hero__chip-dot" />
          Live · GW 28
        </span>
        <span
          className="mockup-hero__theme-toggle"
          role="img"
          aria-label="Theme toggle preview"
        >
          <span className="mockup-hero__theme-thumb" />
        </span>
      </span>
    </div>
  )
}

function HeroVariantCMobile() {
  return (
    <div className="mockup-brand-hero mockup-brand-hero--mobile">
      <div className="mockup-brand-hero__bar">
        <TclotLionIcon size={22} color="#ffffff" />
        <span className="mockup-brand-hero__wordmark">TCLOT</span>
      </div>
      <span className="mockup-hero__right mockup-brand-hero__right">
        <span className="mockup-brand-live-mono">
          <span className="mockup-hero__chip-dot" />
          LIVE GW28
        </span>
        <span
          className="mockup-hero__theme-toggle"
          role="img"
          aria-label="Theme toggle preview"
        >
          <span className="mockup-hero__theme-thumb" />
        </span>
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Header variants showcase — post-PR-#2 evolution                      */
/* ------------------------------------------------------------------ */
/* Four candidates the user is choosing between to fill the white-tile
 * space on the post-PR-#2 header. Variant 0 is the current production
 * baseline; 1–3 explore status density, league richness, and dropping
 * the tile chrome entirely. Mockup-only — none of these are wired to
 * production yet. */

/* 8 PL clubs to populate the league-strip variant. We intentionally
 * pick clubs already mapped in PL_CODE so the existing `plCrestUrl`
 * helper resolves a real crest. Ranks 1–8 are illustrative. */
const HEADER_LEAGUE_STRIP_TEAMS = [
  { code: 'LIV', rank: 1 },
  { code: 'ARS', rank: 2 },
  { code: 'MCI', rank: 3 },
  { code: 'CHE', rank: 4 },
  { code: 'NEW', rank: 5 },
  { code: 'AVL', rank: 6 },
  { code: 'TOT', rank: 7 },
  { code: 'MUN', rank: 8 },
]

function HeroVariantBStatusStrip({ state, treatment }) {
  /* `treatment` swaps the strip's chrome for one of the variants 5a/5b/5c
   * (plain / pill / band) when the parent tile chrome is removed. Default
   * (undefined) keeps the variant-4 tile-bound look. */
  const treatmentCls = treatment
    ? ` mockup-hero-status-strip--${treatment}`
    : ''
  if (state === 'live') {
    return (
      <div
        className={`mockup-hero-status-strip mockup-hero-status-strip--live${treatmentCls}`}
      >
        <span className="mockup-hero-status-strip__dot" aria-hidden />
        <span className="mockup-hero-status-strip__strong">GW 28</span>
        <span className="mockup-hero-status-strip__sep">—</span>
        <span>4 fixtures live</span>
        <span className="mockup-hero-status-strip__sep">·</span>
        <span className="mockup-hero-status-strip__mono">47&apos;</span>
      </div>
    )
  }
  return (
    <div
      className={`mockup-hero-status-strip mockup-hero-status-strip--idle${treatmentCls}`}
    >
      <span className="mockup-hero-status-strip__strong">GW 38 complete</span>
      <span className="mockup-hero-status-strip__sep">·</span>
      <span>GW 1 of 26/27 starts Aug 16</span>
    </div>
  )
}

function HeroVariantBLeagueStrip() {
  return (
    <div className="mockup-hero-league-strip">
      {HEADER_LEAGUE_STRIP_TEAMS.map((t) => {
        const code = PL_CODE[t.code]
        return (
          <div className="mockup-hero-league-strip__cell" key={t.code}>
            <span className="mockup-hero-league-strip__crest">
              {code ? <img src={plCrestUrl(code)} alt={t.code} loading="lazy" decoding="async" /> : null}
            </span>
            <span className="mockup-hero-league-strip__rank">{t.rank}</span>
          </div>
        )
      })}
    </div>
  )
}

/* Variant 4 (combined refinement of variant 1) — brand pill on left,
 * '2025/26' caps-mono in the meta slot (replaces 'FPL Draft H2H'), and
 * the 8 fantasy team crests in current standings order on the right.
 *
 * Crest source: production `TeamAvatar` component (same as live site).
 * It tries `team-logos/{entryId}.{ext}` raw uploads, then the
 * `team-logos-web/{entryId}.png` pipeline output, then falls back to
 * a `ShirtInitialsBadge` SVG. That gives 4 real PNG crests today
 * (Crouch End Oashisu, Hanson of York AFC, Morpeth Jamiroquai, plus
 * one mapped via kit) and shirt-initial silhouettes for the rest —
 * which is exactly how the production standings render them. */
function HeroVariantBSeasonAndCrests({ rows, entries, teamLogoMap, kitIndexByEntry }) {
  const entryById = useMemo(() => {
    const m = {}
    for (const e of entries ?? []) {
      if (e?.id != null) m[e.id] = e
    }
    return m
  }, [entries])
  const top8 = useMemo(() => {
    const sorted = [...(rows ?? [])].sort(
      (a, b) => (a.rank ?? 99) - (b.rank ?? 99),
    )
    return sorted.slice(0, 8)
  }, [rows])

  return (
    <div className="mockup-hero mockup-brand-b mockup-brand-b--crests">
      <span className="mockup-brand-pill" aria-label="TCLOT">
        <TclotLionIcon size={22} />
        <span className="mockup-brand-pill__wordmark">TCLOT</span>
      </span>
      <span className="mockup-brand-b__meta mockup-brand-b__meta--season">
        2025/26
      </span>
      <span
        className="mockup-hero-team-crests"
        aria-label="League standings — top 8"
      >
        {top8.length > 0 ? (
          top8.map((r) => {
            const e = entryById[r.league_entry] ?? {}
            const teamName = e.entry_name ?? '—'
            const mgr = `${e.player_first_name ?? ''} ${e.player_last_name ?? ''}`.trim()
            const title = mgr
              ? `${r.rank}. ${teamName} — ${mgr}`
              : `${r.rank}. ${teamName}`
            return (
              <span
                className="mockup-hero-team-crests__cell"
                key={r.league_entry}
                title={title}
              >
                <TeamAvatar
                  entryId={e.id}
                  name={teamName}
                  size="sm"
                  logoMap={teamLogoMap ?? {}}
                  kitIndexByEntry={kitIndexByEntry}
                  badgeFallback
                />
              </span>
            )
          })
        ) : (
          <span className="mockup-hero-team-crests__placeholder">
            8 fantasy team crests · rank 1 → 8
          </span>
        )}
      </span>
    </div>
  )
}

function HeaderVariantsShowcase({
  tableRows,
  leagueEntries,
  teamLogoMap,
  kitIndexByEntry,
}) {
  return (
    <div className="mockup-header-variants">
      {/* 0. Baseline — current PR #2 */}
      <div className="mockup-header-variant">
        <div className="mockup-header-variant__label">0 — Current (PR #2)</div>
        <HeroVariantB />
      </div>

      {/* 1. Status strip below the brand */}
      <div className="mockup-header-variant">
        <div className="mockup-header-variant__label">
          1 — Status strip below brand (live + idle states)
        </div>
        <div className="mockup-hero-tile">
          <HeroVariantB />
          <HeroVariantBStatusStrip state="live" />
        </div>
        <div className="mockup-hero-tile" style={{ marginTop: 'var(--space-3)' }}>
          <HeroVariantB />
          <HeroVariantBStatusStrip state="idle" />
        </div>
      </div>

      {/* 2. League strip below the brand */}
      <div className="mockup-header-variant">
        <div className="mockup-header-variant__label">
          2 — League strip below brand (8 club crests)
        </div>
        <div className="mockup-hero-tile">
          <HeroVariantB />
          <HeroVariantBLeagueStrip />
        </div>
      </div>

      {/* 3. Full-bleed — drop tile chrome */}
      <div className="mockup-header-variant">
        <div className="mockup-header-variant__label">
          3 — Full-bleed (no tile chrome)
        </div>
        <div className="mockup-hero-tile mockup-hero-tile--bleed">
          <HeroVariantB />
        </div>
      </div>

      {/* 4. Combined refinement of variant 1 — status strip locked,
       *    plus '2025/26' caps-mono meta + 8 fantasy crests right. */}
      <div className="mockup-header-variant">
        <div className="mockup-header-variant__label">
          4 — Status strip + 2025/26 meta + 8 fantasy crests right (PROPOSED)
          <span
            className="mockup-variant-picked mockup-variant-picked--proposed"
            aria-label="Proposed option"
          >
            PROPOSED
          </span>
        </div>
        <div className="mockup-hero-tile">
          <HeroVariantBSeasonAndCrests
            rows={tableRows}
            entries={leagueEntries}
            teamLogoMap={teamLogoMap}
            kitIndexByEntry={kitIndexByEntry}
          />
          <HeroVariantBStatusStrip state="live" />
        </div>
        <div className="mockup-hero-tile" style={{ marginTop: 'var(--space-3)' }}>
          <HeroVariantBSeasonAndCrests
            rows={tableRows}
            entries={leagueEntries}
            teamLogoMap={teamLogoMap}
            kitIndexByEntry={kitIndexByEntry}
          />
          <HeroVariantBStatusStrip state="idle" />
        </div>
      </div>
    </div>
  )
}

/* Variants 5a/5b/5c — variant 4 content rendered full-bleed (no tile
 * chrome). The brand row sits directly on the page background; only
 * the status strip's treatment changes between the three sub-variants.
 *
 *   5a (plain)  — text-only, no container, aligns to brand pill edge.
 *   5b (pill)   — centered shrink-wrapped pill, surface-2 + 1px border.
 *   5c (band)   — thin edge-to-edge surface-2 band, square corners.
 *
 * All three reuse `HeroVariantBSeasonAndCrests` for the brand row and
 * render both the live + idle status states so the user can compare
 * how each treatment reads with and without the pulsing dot. */
function HeaderFullBleedComboShowcase({
  tableRows,
  leagueEntries,
  teamLogoMap,
  kitIndexByEntry,
}) {
  const renderPair = (treatment) => (
    <>
      <div className="mockup-hero-tile mockup-hero-tile--bleed">
        <HeroVariantBSeasonAndCrests
          rows={tableRows}
          entries={leagueEntries}
          teamLogoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
        />
        <HeroVariantBStatusStrip state="live" treatment={treatment} />
      </div>
      <div
        className="mockup-hero-tile mockup-hero-tile--bleed"
        style={{ marginTop: 'var(--space-3)' }}
      >
        <HeroVariantBSeasonAndCrests
          rows={tableRows}
          entries={leagueEntries}
          teamLogoMap={teamLogoMap}
          kitIndexByEntry={kitIndexByEntry}
        />
        <HeroVariantBStatusStrip state="idle" treatment={treatment} />
      </div>
    </>
  )

  return (
    <div className="mockup-header-variants">
      <div className="mockup-header-variant">
        <div className="mockup-header-variant__label">
          5a — Plain text (no container; status sits on page background)
        </div>
        {renderPair('plain')}
      </div>

      <div className="mockup-header-variant">
        <div className="mockup-header-variant__label">
          5b — Floating pill (centered, surface-2 + 1px border)
        </div>
        {renderPair('pill')}
      </div>

      <div className="mockup-header-variant">
        <div className="mockup-header-variant__label">
          5c — Thin band (edge-to-edge surface-2 strip)
        </div>
        {renderPair('band')}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: background + header color variants (mockup-only)            */
/* ------------------------------------------------------------------ */
/* User feedback: the current --bg grey feels too dark and jarring
 * against the white tiles, and the per-tile rhythm
 * (grey → white → grey → white) doesn't flow cleanly. This showcase
 * mocks up four alternative treatments without touching production
 * tokens. Each variant overrides --bg / --surface / --surface-2 and
 * tile chrome via scoped CSS classes only (see Mockup.css). */

/* Tiny "Live Table" stand-in — three standings rows in a single tile
 * so each variant shows two tile rhythms (banner + table) under the
 * header. Avoids pulling MiniApp's nav/chips chrome which would muddy
 * the bg/tile comparison. */
function BgVariantLiveTable() {
  const rows = [
    { rank: 1, name: 'Crouch End Oashisu', mgr: 'David Higman', pts: 1284, gw: 67 },
    { rank: 2, name: 'Clapton Cornershop',  mgr: 'Mike Sutton',  pts: 1271, gw: 66 },
    { rank: 3, name: 'Toronto Oizo',        mgr: 'Andy Ward',    pts: 1268, gw: 66 },
  ]
  return (
    <div className="mockup-bg-variant-table">
      <div className="mockup-bg-variant-table__head">
        <span>Live table</span>
        <span className="mockup-bg-variant-table__head-meta">GW 28</span>
      </div>
      {rows.map((r) => (
        <div className="mockup-bg-variant-table__row" key={r.rank}>
          <span className="mockup-bg-variant-table__rank">{r.rank}</span>
          <span className="mockup-bg-variant-table__team">
            <span className="mockup-bg-variant-table__name">{r.name}</span>
            <span className="mockup-bg-variant-table__mgr">{r.mgr}</span>
          </span>
          <span className="mockup-bg-variant-table__gw">+{r.gw}</span>
          <span className="mockup-bg-variant-table__pts">{r.pts}</span>
        </div>
      ))}
    </div>
  )
}

function BgVariantPreview({ variantId, mode, tableRows, leagueEntries, teamLogoMap, kitIndexByEntry }) {
  const isMobile = mode === 'mobile'
  return (
    <div
      className={
        'mockup-bg-variant-stage' +
        ' mockup-bg-variant-stage--' + mode +
        ' mockup-bg-variant--' + variantId
      }
    >
      <div className="mockup-bg-variant-stage__page">
        <div className="mockup-bg-variant-stage__section mockup-bg-variant-stage__section--header">
          <div className="mockup-hero-tile">
            {isMobile ? (
              <HeroVariantBMobile />
            ) : (
              <HeroVariantBSeasonAndCrests
                rows={tableRows}
                entries={leagueEntries}
                teamLogoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
            )}
            <HeroVariantBStatusStrip state="live" />
          </div>
        </div>
        <div className="mockup-bg-variant-stage__section">
          <LiveBannerGroup />
        </div>
        <div className="mockup-bg-variant-stage__section">
          <BgVariantLiveTable />
        </div>
      </div>
    </div>
  )
}

function BackgroundVariantsShowcase({
  tableRows,
  leagueEntries,
  teamLogoMap,
  kitIndexByEntry,
}) {
  const variants = [
    {
      id: 'a',
      label: 'Variant A — Lighter, softer contrast',
      desc:
        'Lift --bg from #f7f7f9 to #fafafa. Tiles unchanged ' +
        '(white surface, border + radius). Smallest possible tweak — ' +
        'just calms the grey without changing visual hierarchy.',
    },
    {
      id: 'b',
      label: 'Variant B — Single-color (FotMob mobile style)',
      desc:
        'Body, tiles, and surface-2 all share one color (#fff). ' +
        'Tiles drop borders + radii; sections separated by hairline ' +
        'border-bottom only. Brand bar gets a subtle border-bottom to ' +
        'separate from content. The user’s "all one colour" hypothesis.',
    },
    {
      id: 'c',
      label: 'Variant C — Brand-tinted hero strip',
      desc:
        'Body lifted (Variant A baseline). Top header band wears a soft ' +
        'brand-violet wash that fades into the page bg over ~140px. ' +
        'Tiles unchanged. Adds personality at the top, calms the rest.',
    },
    {
      id: 'd',
      label: 'Variant D — Shadow-based cards on white body',
      desc:
        'Body = #fff. Tiles drop border, keep radius, gain a subtle ' +
        'elevation shadow (0 1px 2px rgba(0,0,0,0.04)). More ' +
        'elevated / app-like; closer to Stripe / Linear dashboard feel.',
    },
  ]
  return (
    <div className="mockup-bg-variants">
      {variants.map((v) => (
        <div className="mockup-bg-variant" key={v.id}>
          <div className="mockup-bg-variant__label">{v.label}</div>
          <p className="mockup-bg-variant__desc">{v.desc}</p>
          <div className="mockup-bg-variant__previews">
            <div className="mockup-bg-variant__preview">
              <div className="mockup-portrait-col__h">Desktop</div>
              <BgVariantPreview
                variantId={v.id}
                mode="desktop"
                tableRows={tableRows}
                leagueEntries={leagueEntries}
                teamLogoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
            </div>
            <div className="mockup-bg-variant__preview">
              <div className="mockup-portrait-col__h">Mobile · 375 px</div>
              <BgVariantPreview
                variantId={v.id}
                mode="mobile"
                tableRows={tableRows}
                leagueEntries={leagueEntries}
                teamLogoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: floating bottom nav variants (mockup-only)                  */
/* ------------------------------------------------------------------ */
/* User asked whether we can do a Lyft-style floating pill bottom nav on
 * web — yes, trivially. Four treatments mocked up in mobile portrait
 * frames so they can pick. Scoped CSS only; production
 * .dashboard-nav--bottom in App.css is untouched. */

const BOTTOM_NAV_ITEMS = [
  { id: 'fplLive',       label: 'Live',     icon: 'radio' },
  { id: 'standings',     label: 'Table',    icon: 'bar-chart-3' },
  { id: 'teamSelection', label: 'Trades',   icon: 'users' },
  { id: 'players',       label: 'Wire',     icon: 'shuffle' },
  { id: 'more',          label: 'More',     icon: 'more' },
]

function BottomNavMockPage() {
  // Lightweight placeholder cards so the nav has something to float
  // over. Mirrors the rhythm of a Live Scores list without wiring real
  // data — keeps the comparison focused on nav chrome.
  const cards = [
    { home: 'Crouch End', away: 'Clapton',    homeScore: 67, awayScore: 66, status: '78\'', live: true },
    { home: 'Toronto',    away: 'Seoul 7',    homeScore: 54, awayScore: 49, status: 'HT',   live: true },
    { home: 'AFC Loaf',   away: 'Jamiroquai', homeScore: 41, awayScore: 40, status: 'FT',   live: false },
    { home: 'Oashisu',    away: 'Cornershop', homeScore: 0,  awayScore: 0,  status: 'Sat 12:00', live: false, pre: true },
  ]
  return (
    <div className="mockup-bottom-nav-screen__page">
      <div className="mockup-bottom-nav-screen__page-h">
        <span className="mockup-bottom-nav-screen__page-eyebrow">FPL · GW 28</span>
        <span className="mockup-bottom-nav-screen__page-title">Live Scores</span>
      </div>
      <div className="mockup-bottom-nav-screen__page-cards">
        {cards.map((c, i) => (
          <div className="mockup-bottom-nav-screen__page-card" key={i}>
            <div className="mockup-bottom-nav-screen__page-card-team">
              <span className="mockup-bottom-nav-screen__page-card-crest" aria-hidden />
              <span className="mockup-bottom-nav-screen__page-card-name">{c.home}</span>
              <span className="mockup-bottom-nav-screen__page-card-score">
                {c.pre ? '—' : c.homeScore}
              </span>
            </div>
            <div className="mockup-bottom-nav-screen__page-card-team">
              <span className="mockup-bottom-nav-screen__page-card-crest" aria-hidden />
              <span className="mockup-bottom-nav-screen__page-card-name">{c.away}</span>
              <span className="mockup-bottom-nav-screen__page-card-score">
                {c.pre ? '—' : c.awayScore}
              </span>
            </div>
            <div
              className={
                'mockup-bottom-nav-screen__page-card-status' +
                (c.live ? ' is-live' : '')
              }
            >
              {c.live && <span className="mockup-bottom-nav-screen__page-card-pulse" aria-hidden />}
              {c.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BottomNavMock({ variant, activeId = 'standings', showLabels = true }) {
  return (
    <nav
      className={'mockup-bottom-nav mockup-bottom-nav--' + variant}
      aria-label={`Bottom nav variant ${variant.toUpperCase()}`}
    >
      {BOTTOM_NAV_ITEMS.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            className={
              'mockup-bottom-nav__btn' +
              (isActive ? ' is-active' : '')
            }
          >
            <span className="mockup-bottom-nav__icon-wrap" aria-hidden>
              <LucideIcon name={item.icon} />
            </span>
            {showLabels ? (
              <span className="mockup-bottom-nav__label">{item.label}</span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

const FLOATING_NAV_VARIANTS = [
  {
    id: 'a',
    label: 'Variant A — Current (flush, full-width)',
    desc:
      'Baseline. bottom: 0, edge-to-edge, top hairline border, no rounded ' +
      'corners. Matches what ships today in .dashboard-nav--bottom.',
    showLabels: true,
  },
  {
    id: 'b',
    label: 'Variant B — Floating pill (Lyft-style)',
    desc:
      'bottom: 12px + safe-area, side margins, 999px radius, strong shadow, ' +
      'icons-only. Active item gets a brand-tinted circle behind the icon. ' +
      'Closest match to the Lyft screenshot.',
    showLabels: false,
  },
  {
    id: 'c',
    label: 'Variant C — Floating rounded rectangle',
    desc:
      'Same floating positioning as B but 20px radius (not pill) and labels ' +
      'kept under each icon. Less aggressive than the pill; better for ' +
      'users who rely on label legibility.',
    showLabels: true,
  },
  {
    id: 'd',
    label: 'Variant D — Half-floating (rounded top corners)',
    desc:
      'bottom: 0 flush, but border-top-radius: 20px and a soft top-edge ' +
      'shadow. Labels kept. Compromise — a slight "raised" feel without ' +
      'fully detaching from the bottom edge.',
    showLabels: true,
  },
]

function FloatingBottomNavShowcase() {
  return (
    <div className="mockup-bottom-nav-variants">
      {FLOATING_NAV_VARIANTS.map((v) => (
        <div className="mockup-bottom-nav-variant" key={v.id}>
          <div className="mockup-bottom-nav-variant__label">{v.label}</div>
          <div className="mockup-bottom-nav-stage">
            <div className="mockup-bottom-nav-screen">
              <BottomNavMockPage />
              <BottomNavMock
                variant={v.id}
                activeId="standings"
                showLabels={v.showLabels}
              />
            </div>
          </div>
          <p className="mockup-bottom-nav-variant__desc">{v.desc}</p>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: tokens panel                                                */
/* ------------------------------------------------------------------ */
function TokensPanel() {
  return (
    <div className="mockup-tokens">
      <div className="mockup-tokens__group">
        <h4 className="mockup-tokens__group-h">Colour</h4>
        {[
          ['--brand',         '#795bfb', 'Chrome accent only'],
          ['--data-positive', '#12a15a', 'Wins, +trend'],
          ['--data-negative', '#ef4444', 'Losses, −trend'],
          ['--data-neutral',  '#9ca3af', 'Draws, idle'],
          ['--surface',       '#1e1e1e', 'Cards, inputs'],
          ['--border',        '#2a2a2a', 'Hairlines'],
        ].map(([name, hex, use]) => (
          <div className="mockup-tokens__row" key={name}>
            <span
              className="mockup-tokens__row__swatch"
              style={{ background: hex }}
              aria-hidden
            />
            <span>
              <span className="mockup-tokens__row__name">{name}</span>
              <div className="mockup-tokens__row__value">{use}</div>
            </span>
            <span className="mockup-tokens__row__value">{hex}</span>
          </div>
        ))}
      </div>

      <div className="mockup-tokens__group">
        <h4 className="mockup-tokens__group-h">Spacing — 6 step</h4>
        {[
          ['--space-1', 4],
          ['--space-2', 8],
          ['--space-3', 12],
          ['--space-4', 16],
          ['--space-5', 24],
          ['--space-6', 40],
        ].map(([name, px]) => (
          <div className="mockup-tokens__row mockup-tokens__row--space" key={name}>
            <span>
              <span
                className="mockup-tokens__row__sample-bar"
                style={{ width: px }}
                aria-hidden
              />
              <span className="mockup-tokens__row__name">{name}</span>
            </span>
            <span className="mockup-tokens__row__value">{px}px</span>
          </div>
        ))}
      </div>

      <div className="mockup-tokens__group">
        <h4 className="mockup-tokens__group-h">Radius + motion</h4>
        {[
          ['--r-sm',    '4px',  'Pills, table cells'],
          ['--r-md',    '8px',  'Cards, inputs'],
          ['--r-lg',    '14px', 'Hero only'],
          ['--dur-fast','120ms','Hover'],
          ['--dur-base','200ms','Tab change'],
          ['--ease',    'cubic-bezier(.4,0,.2,1)', 'Single ease'],
        ].map(([name, value, use]) => (
          <div className="mockup-tokens__row mockup-tokens__row--space" key={name}>
            <span>
              <span className="mockup-tokens__row__name">{name}</span>
              <div className="mockup-tokens__row__value">{use}</div>
            </span>
            <span className="mockup-tokens__row__value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: mini app preview (used in compare cards)                    */
/* ------------------------------------------------------------------ */
function MiniApp() {
  return (
    <div className="mockup-mini">
      <div className="mockup-mini__nav">
        {NAV_ITEMS.slice(0, 4).map((it, i) => (
          <span
            key={it.id}
            className={'mockup-mini__nav-item' + (i === 1 ? ' is-active' : '')}
          >
            <LucideIcon name={it.icon} />
            {it.label}
          </span>
        ))}
      </div>

      <div>
        {[
          { rank: 1, name: 'Crouch End Oashisu', mgr: 'David Higman', pts: 67 },
          { rank: 2, name: 'Clapton Cornershop',  mgr: 'Mike Sutton',  pts: 66 },
          { rank: 3, name: 'Toronto Oizo',        mgr: 'Andy Ward',    pts: 66 },
        ].map((r) => (
          <div className="mockup-mini__row" key={r.rank}>
            <span className="mockup-mini__row__rank">{r.rank}</span>
            <span>
              <div style={{ color: 'var(--text-strong)', fontWeight: 500, fontSize: 'var(--text-sm)' }}>
                {r.name}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{r.mgr}</div>
            </span>
            <span className="mockup-mini__row__pts">{r.pts}</span>
          </div>
        ))}
      </div>

      <div className="mockup-mini__chips">
        <span className="mockup-mini__chip">
          <span className="mockup-mini__dot mockup-mini__dot--win" /> W
        </span>
        <span className="mockup-mini__chip">
          <span className="mockup-mini__dot mockup-mini__dot--draw" /> D
        </span>
        <span className="mockup-mini__chip">
          <span className="mockup-mini__dot mockup-mini__dot--loss" /> L
        </span>
        <button className="mockup-mini__btn">Make a trade</button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: real-data standings                                         */
/* ------------------------------------------------------------------ */
function FlushStandings({ rows, leagueEntries }) {
  const entryMap = useMemo(() => {
    const m = {}
    for (const e of leagueEntries ?? []) {
      if (e?.id != null) m[e.id] = e
    }
    return m
  }, [leagueEntries])

  if (!rows || rows.length === 0) {
    return (
      <div className="mockup-note">
        Standings unavailable in this preview (no league-data loaded yet).
      </div>
    )
  }
  return (
    <div className="mockup-standings">
      <table>
        <thead>
          <tr>
            <th className="col-rank">#</th>
            <th className="col-team">Team</th>
            <th>PL</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>For</th>
            <th>Ag</th>
            <th>GD</th>
            <th>Form</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const entry = entryMap[r.league_entry] ?? {}
            const teamName = entry.entry_name ?? '—'
            const mgr = `${entry.player_first_name ?? ''} ${entry.player_last_name ?? ''}`.trim()
            const initials = teamName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()
            return (
              <tr key={r.league_entry}>
                <td className="col-rank">{r.rank}</td>
                <td className="col-team">
                  <span className="mockup-standings__team">
                    <span className="mockup-standings__crest">{initials}</span>
                    <span>
                      <div className="mockup-standings__team-name">{teamName}</div>
                      <div className="mockup-standings__team-mgr">{mgr}</div>
                    </span>
                  </span>
                </td>
                <td>{r.pl}</td>
                <td>{r.matches_won}</td>
                <td>{r.matches_drawn}</td>
                <td>{r.matches_lost}</td>
                <td>{r.gf}</td>
                <td>{r.ga}</td>
                <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td>
                  <span className="mockup-standings__form">
                    {(r.form ?? []).slice(-5).map((f, i) => {
                      if (!f) {
                        return (
                          <span
                            key={i}
                            className="mockup-standings__form-pip"
                            style={{
                              background: 'transparent',
                              border: '1px dashed var(--border)',
                            }}
                          />
                        )
                      }
                      return (
                        <span
                          key={i}
                          className={`mockup-standings__form-pip mockup-standings__form-pip--${f}`}
                          aria-label={f}
                        />
                      )
                    })}
                  </span>
                </td>
                <td className="col-pts">{r.total}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: schedule luck matrix concept (sample data)                  */
/* ------------------------------------------------------------------ */
const MATRIX_TEAMS = ['Oizo', 'Oashisu', 'Cornershop', 'AFC', 'Loaf', 'Jamiroquai', 'Seoul 7', 'Men']
const MATRIX_DATA = [
  /* diagonal = self; positive = better than real schedule, negative = worse */
  [66, 50, 54, 47, 51, 47, 38, 43],
  [58, 61, 56, 50, 51, 44, 56, 57],
  [52, 63, 60, 45, 62, 45, 55, 47],
  [65, 59, 59, 51, 57, 53, 60, 48],
  [48, 56, 62, 47, 48, 42, 41, 46],
  [53, 48, 59, 42, 47, 48, 47, 51],
  [47, 45, 42, 41, 40, 39, 45, 44],
  [47, 54, 49, 42, 48, 41, 39, 40],
]
function heatClass(val, base) {
  const delta = val - base
  if (delta >= 12) return 'heat-pos-3'
  if (delta >= 6)  return 'heat-pos-2'
  if (delta >= 2)  return 'heat-pos-1'
  if (delta <= -12) return 'heat-neg-3'
  if (delta <= -6)  return 'heat-neg-2'
  if (delta <= -2)  return 'heat-neg-1'
  return 'heat-zero'
}
function ScheduleMatrix() {
  return (
    <div className="mockup-matrix">
      <div className="mockup-matrix__caption">
        <span>Wins-by-margin → opponent column scenario</span>
        <span>Source: H2H · Sample · 38 GW</span>
      </div>
      <table>
        <thead>
          <tr>
            <th className="matrix-team-h">Team / Schedule</th>
            {MATRIX_TEAMS.map((t) => (
              <th key={t}>{t}</th>
            ))}
            <th className="matrix-totals-h">AVG</th>
            <th className="matrix-totals-h">Σ</th>
          </tr>
        </thead>
        <tbody>
          {MATRIX_DATA.map((row, i) => {
            const own = row[i]
            const sum = row.reduce((a, b) => a + b, 0)
            const avg = (sum / row.length).toFixed(1)
            return (
              <tr key={MATRIX_TEAMS[i]}>
                <td className="matrix-team">{MATRIX_TEAMS[i]}</td>
                {row.map((v, j) => (
                  <td key={j} className={i === j ? 'matrix-self' : heatClass(v, own)}>
                    {v}
                  </td>
                ))}
                <td className="matrix-totals">{avg}</td>
                <td className="matrix-totals">{sum}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: nav before/after                                            */
/* ------------------------------------------------------------------ */
function NavCompare() {
  return (
    <div className="mockup-nav">
      <div>
        <div className="mockup-nav__row-label mockup-nav__row-label--bad" />
        <div className="mockup-nav__row">
          {NAV_ITEMS.map((it, i) => (
            <button
              key={it.id}
              className={
                'mockup-nav__btn mockup-nav__btn--legacy' +
                (i === 1 ? ' is-active' : '')
              }
            >
              <span className="emoji" aria-hidden>{it.emoji}</span>
              {it.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mockup-nav__row-label mockup-nav__row-label--good" />
        <div className="mockup-nav__row">
          {NAV_ITEMS.map((it, i) => (
            <button
              key={it.id}
              className={'mockup-nav__btn' + (i === 1 ? ' is-active' : '')}
            >
              <LucideIcon name={it.icon} />
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: FPL Live icon candidates                                    */
/* ------------------------------------------------------------------ */
// Six candidate glyphs for the FPL Live nav tab, each rendered inside a
// full nav row so the user can compare in context. The 'radio' icon
// (current proposed) reads as "receiving signal" rather than "live now",
// which is the question this showcase exists to answer.
const FPL_LIVE_ICON_OPTIONS = [
  { icon: 'radio',         title: 'Radio',         tag: 'current' },
  { icon: 'pulsing-dot',   title: 'Pulsing dot',   tag: "Andy's pick" },
  { icon: 'radar-rings',   title: 'Radar rings' },
  { icon: 'football',      title: 'Football' },
  { icon: 'play-triangle', title: 'Play triangle' },
  { icon: 'stopwatch',     title: 'Stopwatch' },
]

function NavFplLiveIconShowcase() {
  return (
    <div className="mockup-nav-row-stack">
      {FPL_LIVE_ICON_OPTIONS.map((opt) => {
        const isPulse = opt.icon === 'pulsing-dot'
        return (
          <div className="mockup-nav-row-stack__entry" key={opt.icon}>
            <div className="mockup-nav-row-stack__label">
              <span className="mockup-nav-row-stack__label-text">{opt.title}</span>
              {opt.tag ? (
                <span
                  className={
                    'mockup-nav-row-stack__pill mockup-nav-row-stack__pill--' +
                    (opt.tag === 'current' ? 'current' : 'pick')
                  }
                >
                  {opt.tag}
                </span>
              ) : null}
            </div>
            <div className="mockup-nav__row">
              {NAV_ITEMS.map((it, i) => {
                const isLive = it.id === 'fplLive'
                const iconName = isLive ? opt.icon : it.icon
                const liveStyle = isLive
                  ? { color: isPulse ? '#16a34a' : 'var(--text-muted)' }
                  : undefined
                return (
                  <button
                    key={it.id}
                    className={
                      'mockup-nav__btn' +
                      (i === 1 ? ' is-active' : '') +
                      (isLive && isPulse ? ' mockup-nav-icon--pulse' : '')
                    }
                    style={liveStyle}
                  >
                    <LucideIcon name={iconName} />
                    {it.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: nav color direction (mono / accent / violet hint / emoji)  */
/* ------------------------------------------------------------------ */
// Per-tab accent palette for direction B. Standings is intentionally
// muted in this map because it sits in the active state (violet wash);
// the accent only affects inactive icons.
const NAV_TAB_ACCENT = {
  fplLive:       '#16a34a', // green-600
  standings:     '#0ea5e9', // sky-500 (only shows on inactive rows)
  teamSelection: '#6366f1', // indigo-500
  players:       '#f59e0b', // amber-500
  hall:          '#eab308', // yellow-500
  more:          'var(--text-muted)',
}

const COLOR_DIRECTION_OPTIONS = [
  {
    key: 'mono',
    title: 'A — Monochrome (current)',
    sub: 'Pure line icons in muted gray. Reference baseline.',
  },
  {
    key: 'accent',
    title: 'B — Per-tab accent',
    tag: "Andy's pick",
    sub: 'A single brand color per inactive tab; active tab keeps the violet wash.',
  },
  {
    key: 'violet',
    title: 'C — Violet hint',
    sub: 'Line icons stay neutral with a soft brand-violet wash. Subtle but present.',
  },
  {
    key: 'emoji',
    title: 'D — Emojis polished',
    sub: 'Production emojis with tightened spacing and modern type — no boxy chrome.',
  },
]

function NavColorDirectionShowcase() {
  return (
    <div className="mockup-nav-row-stack">
      {COLOR_DIRECTION_OPTIONS.map((opt) => (
        <div className="mockup-nav-row-stack__entry" key={opt.key}>
          <div className="mockup-nav-row-stack__label">
            <span className="mockup-nav-row-stack__label-text">{opt.title}</span>
            {opt.tag ? (
              <span className="mockup-nav-row-stack__pill mockup-nav-row-stack__pill--pick">
                {opt.tag}
              </span>
            ) : null}
          </div>
          {opt.sub ? (
            <div className="mockup-nav-row-stack__sub">{opt.sub}</div>
          ) : null}
          <div
            className={
              'mockup-nav__row mockup-nav__row--color-' + opt.key +
              (opt.key === 'emoji' ? ' mockup-nav__row--polished-emoji' : '')
            }
          >
            {NAV_ITEMS.map((it, i) => {
              const isActive = i === 1
              let style
              if (opt.key === 'accent' && !isActive) {
                style = { color: NAV_TAB_ACCENT[it.id] }
              }
              return (
                <button
                  key={it.id}
                  className={'mockup-nav__btn' + (isActive ? ' is-active' : '')}
                  style={style}
                >
                  {opt.key === 'emoji' ? (
                    <span className="emoji" aria-hidden>
                      {it.legacyEmoji ?? it.emoji}
                    </span>
                  ) : (
                    <LucideIcon name={it.icon} />
                  )}
                  {it.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: icon family compare                                         */
/* ------------------------------------------------------------------ */
function IconCompare() {
  const items = [
    { name: 'bar-chart-3', use: 'Standings' },
    { name: 'users',       use: 'Team Selection' },
    { name: 'shuffle',     use: 'Players / Wire' },
    { name: 'radio',       use: 'FPL Live' },
    { name: 'trophy',      use: 'Hall of Champions' },
    { name: 'more',        use: 'More' },
  ]
  return (
    <div className="mockup-icons">
      <div className="mockup-icons__group">
        <div className="mockup-icons__title">
          Lucide
          <small>Stroke 2 · sharp · Linear/Vercel feel</small>
        </div>
        {items.map((it) => (
          <div className="mockup-icons__row" key={it.name}>
            <LucideIcon name={it.name} />
            <span className="mockup-icons__row__name">{it.name}</span>
            <span className="mockup-icons__row__use">{it.use}</span>
          </div>
        ))}
      </div>
      <div className="mockup-icons__group">
        <div className="mockup-icons__title">
          Phosphor
          <small>Stroke 1.6 · rounder · sport-app feel</small>
        </div>
        {items.map((it) => (
          <div className="mockup-icons__row" key={it.name}>
            <PhosphorIcon name={it.name} />
            <span className="mockup-icons__row__name">{it.name}</span>
            <span className="mockup-icons__row__use">{it.use}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: type scale                                                  */
/* ------------------------------------------------------------------ */
function TypeScale() {
  const rows = [
    ['--text-2xl', 'TCLOT 2025/26', 'Hero only',          { fontSize: 30, lineHeight: '34px', fontWeight: 700, letterSpacing: '-0.02em' }],
    ['--text-xl',  'Standings',     'Page titles',         { fontSize: 22, lineHeight: '28px', fontWeight: 700, letterSpacing: '-0.01em' }],
    ['--text-lg',  'Most active waivers this week', 'Card titles, h2', { fontSize: 16, lineHeight: '22px', fontWeight: 600 }],
    ['--text-md',  'David Higman · Crouch End Oashisu', 'Body, table cells', { fontSize: 14, lineHeight: '20px', fontWeight: 500 }],
    ['--text-sm',  'Manager · Last 5 · GW 28', 'Secondary meta', { fontSize: 12, lineHeight: '16px', fontWeight: 500, color: 'var(--text-muted)' }],
    ['--text-xs',  'TEAM · MATCHES PLAYED · POINTS FOR', 'Eyebrows, table heads', { fontSize: 11, lineHeight: '14px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }],
  ]
  return (
    <div className="mockup-type">
      {rows.map(([token, sample, use, styles]) => (
        <div className="mockup-type__row" key={token}>
          <span className="mockup-type__row__token">{token}</span>
          <span className="mockup-type__row__sample" style={styles}>{sample}</span>
          <span className="mockup-type__row__meta">{styles.fontSize}/{(styles.lineHeight || '').replace('px','')} · {styles.fontWeight}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: hall — top-3 podium + historic flush table                  */
/* ------------------------------------------------------------------ */
function teamInitials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function HallPodium({ entries }) {
  // Render order on screen: 2nd | 1st | 3rd (classic podium)
  const screen = [
    entries.find((e) => e.rank === 2),
    entries.find((e) => e.rank === 1),
    entries.find((e) => e.rank === 3),
  ]
  return (
    <div className="mockup-hall__podium">
      {screen.map((e) => {
        if (!e) return null
        return (
          <div className={`mockup-hall__step mockup-hall__step--${e.rank}`} key={e.rank}>
            <span className="mockup-hall__step__rank">
              {e.rank === 1 ? 'Champion' : e.rank === 2 ? 'Runner-up' : 'Third'}
            </span>
            <LucideIcon name="trophy" className="mockup-hall__step__icon" />
            <span className="mockup-hall__step__crest">{teamInitials(e.team)}</span>
            <div>
              <div className="mockup-hall__step__team">{e.team}</div>
              <div className="mockup-hall__step__mgr">{e.mgr}</div>
            </div>
            <span className="mockup-hall__step__year">{e.year}</span>
          </div>
        )
      })}
    </div>
  )
}

function HallHistoric({ rows }) {
  return (
    <div className="mockup-hall__historic">
      <table>
        <thead>
          <tr>
            <th className="col-rank">#</th>
            <th>Team</th>
            <th className="col-year">Season</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="col-rank">{r.rank}</td>
              <td>
                <span className="mockup-hall__historic__team">
                  <span className="mockup-hall__historic__crest">{teamInitials(r.team)}</span>
                  <span>
                    <div className="mockup-hall__historic__team-name">{r.team}</div>
                    <div className="mockup-hall__historic__team-mgr">{r.mgr}</div>
                  </span>
                </span>
              </td>
              <td className="col-year">{r.year}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HallTrophies() {
  const latest = [
    { rank: 1, mgr: 'David Higman', team: 'Crouch End Oashisu', year: '2025/26' },
    { rank: 2, mgr: 'Mike Sutton',  team: 'Clapton Cornershop', year: '2025/26' },
    { rank: 3, mgr: 'Andy Ward',    team: 'Toronto Oizo',       year: '2025/26' },
  ]
  const historic = [
    { rank: 1, mgr: 'Luke Butcher',   team: 'Seoul Club 7',        year: '2024/25' },
    { rank: 2, mgr: 'Nick Goodacre',  team: 'Hanson of York AFC',  year: '2024/25' },
    { rank: 3, mgr: 'Jon Ward',       team: 'Morpeth Jamiroquai',  year: '2024/25' },
    { rank: 1, mgr: 'Andy Ward',      team: 'Toronto Oizo',        year: '2023/24' },
    { rank: 2, mgr: 'David Higman',   team: 'Crouch End Oashisu',  year: '2023/24' },
    { rank: 3, mgr: 'Eddy Webster',   team: 'Brampton II Men',     year: '2023/24' },
    { rank: 1, mgr: 'Mike Sutton',    team: 'Clapton Cornershop',  year: '2022/23' },
    { rank: 2, mgr: 'Luke Butcher',   team: 'Seoul Club 7',        year: '2022/23' },
    { rank: 3, mgr: 'Nick Goodacre',  team: 'Hanson of York AFC',  year: '2022/23' },
  ]
  return (
    <>
      <HallPodium entries={latest} />
      <HallHistoric rows={historic} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Section: live banner concept                                         */
/* ------------------------------------------------------------------ */
function LiveBannerConcept() {
  return (
    <div className="mockup-live">
      <div className="mockup-live__top">
        <div className="mockup-live__title">
          <span className="mockup-live__title-dot" />
          Live · 32 mins played
        </div>
        <div className="mockup-live__gw">GW 28 · Sat 16:30 GMT</div>
      </div>
      <div className="mockup-live__matchup">
        <div className="mockup-live__side">
          <div className="mockup-live__crest-big">CO</div>
          <div>
            <div className="mockup-live__name">Crouch End Oashisu</div>
            <div className="mockup-live__sub">David Higman · #1</div>
          </div>
        </div>
        <div className="mockup-live__score">
          42<span className="mockup-live__score__sep">–</span>38
        </div>
        <div className="mockup-live__side mockup-live__side--away">
          <div>
            <div className="mockup-live__name" style={{ textAlign: 'right' }}>
              Toronto Oizo
            </div>
            <div className="mockup-live__sub" style={{ textAlign: 'right' }}>
              Andy Ward · #3
            </div>
          </div>
          <div className="mockup-live__crest-big">TO</div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: live banner — group of 4 with one shared state header       */
/* ------------------------------------------------------------------ */
function StateChip({ kind, text }) {
  return (
    <span className={`mockup-live__chip mockup-live__chip--${kind}`}>
      {kind === 'live' && <span className="mockup-live__title-dot" />}
      {text}
    </span>
  )
}

function LiveBannerGroup() {
  // The actual gameweek view: one shared header at the top, all 4
  // fixtures stripped of any per-card state — they're all in the same
  // state by definition.
  const fixtures = [
    { home: { code: 'CO', name: 'Crouch End Oashisu', mgr: 'David Higman · #1', winner: true  },
      away: { code: 'TO', name: 'Toronto Oizo',       mgr: 'Andy Ward · #3'                   },
      score: '67 – 61' },
    { home: { code: 'CC', name: 'Clapton Cornershop', mgr: 'Tom Roberts · #2'                  },
      away: { code: 'HA', name: 'Hackney York',       mgr: 'Nick Davis · #5',  winner: true  },
      score: '38 – 52' },
    { home: { code: 'HM', name: 'Heavenly Loaf',      mgr: 'Sam Patel · #6',   winner: true  },
      away: { code: 'MJ', name: 'Mighty Jamiroquai',  mgr: 'Will Chen · #4'                   },
      score: '71 – 49' },
    { home: { code: 'SC', name: 'Soul Coughing 7',    mgr: 'Greg Foster · #7'                  },
      away: { code: 'BM', name: 'Brampton Magpies',   mgr: 'Olly Read · #8',   winner: true  },
      score: '33 – 44' },
  ]
  return (
    <div className="mockup-live-group mockup-live-group--score-color">
      <div className="mockup-live-group__header">
        <StateChip kind="live" text="Live · GW 28" />
        <span className="mockup-live-group__header-meta">Sat 16:30 → Mon 21:00 GMT</span>
        <span className="mockup-live-group__header-progress">6 of 10 fixtures complete</span>
      </div>
      <div className="mockup-live-group__list">
        {fixtures.map((f, i) => {
          const [hs, as] = f.score.split('–').map((s) => s.trim())
          return (
            <div className="mockup-live-group__row" key={i}>
              <div className={'mockup-live__side' + (f.home.winner ? ' mockup-live__side--winner' : '')}>
                <div className="mockup-live__crest-big">{f.home.code}</div>
                <div>
                  <div className={'mockup-live__name' + (f.home.winner ? ' mockup-live__name--winner' : f.away.winner ? ' mockup-live__name--loser' : '')}>
                    {f.home.name}
                  </div>
                  <div className="mockup-live__sub">{f.home.mgr}</div>
                </div>
              </div>
              <div className="mockup-live__score">
                <span className={'mockup-live__score__half--' + (f.home.winner ? 'winner' : 'loser')}>{hs}</span>
                <span className="mockup-live__score__sep">–</span>
                <span className={'mockup-live__score__half--' + (f.away.winner ? 'winner' : 'loser')}>{as}</span>
              </div>
              <div className={'mockup-live__side mockup-live__side--away' + (f.away.winner ? ' mockup-live__side--winner' : '')}>
                <div>
                  <div className={'mockup-live__name' + (f.away.winner ? ' mockup-live__name--winner' : f.home.winner ? ' mockup-live__name--loser' : '')} style={{ textAlign: 'right' }}>
                    {f.away.name}
                  </div>
                  <div className="mockup-live__sub" style={{ textAlign: 'right' }}>{f.away.mgr}</div>
                </div>
                <div className="mockup-live__crest-big">{f.away.code}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WinnerOptionRow({ variantClass, splitScore = false }) {
  // Same matchup for direct comparison.
  const f = {
    home: { code: 'CO', name: 'Crouch End Oashisu', mgr: 'David Higman · #1', winner: true },
    away: { code: 'TO', name: 'Toronto Oizo',       mgr: 'Andy Ward · #3' },
    score: '67 – 61',
  }
  const [hs, as] = f.score.split('–').map((s) => s.trim())
  return (
    <div className={'mockup-live-group__row ' + variantClass}>
      <div className={'mockup-live__side' + (f.home.winner ? ' mockup-live__side--winner' : '')}>
        <div className="mockup-live__crest-big">{f.home.code}</div>
        <div>
          <div className={'mockup-live__name' + (f.home.winner ? ' mockup-live__name--winner' : f.away.winner ? ' mockup-live__name--loser' : '')}>
            {f.home.name}
          </div>
          <div className="mockup-live__sub">{f.home.mgr}</div>
        </div>
      </div>
      <div className="mockup-live__score">
        {splitScore ? (
          <>
            <span className={'mockup-live__score__half--' + (f.home.winner ? 'winner' : 'loser')}>{hs}</span>
            <span className="mockup-live__score__sep">–</span>
            <span className={'mockup-live__score__half--' + (f.away.winner ? 'winner' : 'loser')}>{as}</span>
          </>
        ) : (
          <>
            {hs}<span className="mockup-live__score__sep">–</span>{as}
          </>
        )}
      </div>
      <div className={'mockup-live__side mockup-live__side--away' + (f.away.winner ? ' mockup-live__side--winner' : '')}>
        <div>
          <div className={'mockup-live__name' + (f.away.winner ? ' mockup-live__name--winner' : f.home.winner ? ' mockup-live__name--loser' : '')} style={{ textAlign: 'right' }}>
            {f.away.name}
          </div>
          <div className="mockup-live__sub" style={{ textAlign: 'right' }}>{f.away.mgr}</div>
        </div>
        <div className="mockup-live__crest-big">{f.away.code}</div>
      </div>
    </div>
  )
}

function WinnerOptions() {
  const options = [
    { num: 'C+E', title: 'Score weight + dot marker', desc: 'Combined: score numbers carry weight, brand dot next to the winner\u2019s name.', cls: 'mockup-row--ce', split: true, isPick: true },
    { num: 'A',   title: 'Type weight only',          desc: 'Full ink for winner, muted for loser. Zero decoration.', cls: 'mockup-row--type' },
    { num: 'B',   title: 'Outer accent bar',          desc: 'Thin brand-color bar on the winner\u2019s outer edge.',  cls: 'mockup-row--bar' },
    { num: 'C',   title: 'Score weight',              desc: 'Names stay equal; only the score numbers carry weight.',  cls: 'mockup-row--score-weight', split: true },
    { num: 'D',   title: 'Brand score',               desc: 'Winner\u2019s score number in brand violet.',             cls: 'mockup-row--score-color',  split: true },
    { num: 'E',   title: 'Dot marker',                desc: 'Small brand dot next to the winner\u2019s name.',         cls: 'mockup-row--dot' },
  ]
  return (
    <div className="mockup-winner-options">
      {options.map((o) => (
        <div className="mockup-winner-option" key={o.num}>
          <div className="mockup-winner-option__head">
            <span className="mockup-winner-option__num">Option {o.num}</span>
            <span className="mockup-winner-option__title">{o.title}</span>
            <span className="mockup-winner-option__desc">{o.desc}</span>
          </div>
          <WinnerOptionRow variantClass={o.cls} splitScore={!!o.split} />
        </div>
      ))}
    </div>
  )
}

function PortraitFrame({ children }) {
  return (
    <div className="mockup-portrait-frame">
      <div className="mockup-portrait-frame__screen">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* HERO DEFEAT / VILLAIN VICTORY · circular treatments                  */
/* ------------------------------------------------------------------ */
/* User flagged the production rectangular tile feels out of place
 * against the new circular-avatar design language. Three circular
 * treatments mocked up side-by-side, plus the reference rectangular
 * for A/B compare. Both narrative kinds (HERO DEFEAT — orange/red,
 * VILLAIN VICTORY — purple/violet) rendered per variant. */
const HV_KINDS = [
  {
    key: 'hero',
    label: 'HERO DEFEAT',
    short: 'HERO',
    short2: 'DEFEAT',
    glyph: '🦸',
    img: 'hero-defeat.png',
    objectPosition: 'center bottom',
  },
  {
    key: 'villain',
    label: 'VILLAIN VICTORY',
    short: 'VILLAIN',
    short2: 'VICTORY',
    glyph: '🦹',
    img: 'villain-detected.png',
    objectPosition: 'center top',
  },
]

function HvFaceOffShell({ kind, badge, position = 'right' }) {
  // Mini face-off composition so each variant reads in context of the avatar
  // row it lives in. The badge slot can be either side-of-avatar (variant 2/3)
  // or laid over the avatar's bottom-right (variant 1 dot). The caption pill
  // for variant 1 sits below the team column.
  const isHero = kind === 'hero'
  const teamCode = isHero ? 'CO' : 'TO'
  const teamName = isHero ? 'Crouch End Oashisu' : 'Toronto Oizo'
  const teamMgr = isHero ? 'David Higman · #1' : 'Andy Ward · #3'
  const score = isHero ? 67 : 71
  const oppScore = isHero ? 71 : 67
  const oppCode = isHero ? 'TO' : 'CO'
  const oppName = isHero ? 'Toronto Oizo' : 'Crouch End Oashisu'
  return (
    <div className={'mockup-hv-faceoff mockup-hv-faceoff--' + kind}>
      <div className="mockup-hv-faceoff__side mockup-hv-faceoff__side--home">
        {position === 'left' ? badge : null}
        <div className="mockup-hv-faceoff__avatar-col">
          <div className={'mockup-hv-faceoff__crest mockup-hv-faceoff__crest--' + kind}>
            {teamCode}
            {position === 'overlay' ? badge : null}
          </div>
          {position === 'caption-below' ? (
            <div className="mockup-hv-faceoff__caption-slot">{badge}</div>
          ) : null}
        </div>
        <div className="mockup-hv-faceoff__names">
          <span className="mockup-hv-faceoff__name">{teamName}</span>
          <span className="mockup-hv-faceoff__sub">{teamMgr}</span>
        </div>
        {position === 'right' ? badge : null}
      </div>
      <div className="mockup-hv-faceoff__score">
        <span className={
          'mockup-hv-faceoff__score-half' +
          (isHero ? ' mockup-hv-faceoff__score-half--loser' : ' mockup-hv-faceoff__score-half--winner')
        }>
          {score}
        </span>
        <span className="mockup-hv-faceoff__score-sep">–</span>
        <span className={
          'mockup-hv-faceoff__score-half' +
          (isHero ? ' mockup-hv-faceoff__score-half--winner' : ' mockup-hv-faceoff__score-half--loser')
        }>
          {oppScore}
        </span>
      </div>
      <div className="mockup-hv-faceoff__side mockup-hv-faceoff__side--away">
        <div className="mockup-hv-faceoff__names mockup-hv-faceoff__names--away">
          <span className="mockup-hv-faceoff__name">{oppName}</span>
          <span className="mockup-hv-faceoff__sub">{isHero ? 'Andy Ward · #3' : 'David Higman · #1'}</span>
        </div>
        <div className="mockup-hv-faceoff__crest mockup-hv-faceoff__crest--neutral">{oppCode}</div>
      </div>
    </div>
  )
}

/* Reference — production rectangular tile (for A/B compare only). */
function HvReferenceBadge({ kind }) {
  const meta = HV_KINDS.find((k) => k.key === kind)
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  return (
    <span
      className={'mockup-hv-ref mockup-hv-ref--' + kind}
      role="img"
      aria-label={meta.label}
    >
      <img
        className="mockup-hv-ref__img"
        src={`${base}${meta.img}`}
        alt=""
        width={32}
        height={46}
        style={{ objectPosition: meta.objectPosition }}
        decoding="async"
        loading="lazy"
      />
      <span className="mockup-hv-ref__label" aria-hidden="true">{meta.label}</span>
    </span>
  )
}

/* Variant 1 — Avatar status ring + tiny badge dot + caption pill below */
function HvVariant1Render({ kind }) {
  const meta = HV_KINDS.find((k) => k.key === kind)
  const dot = (
    <span className={'mockup-hv-badge--variant-1__badge-dot mockup-hv-badge--variant-1__badge-dot--' + kind} aria-hidden>
      {meta.glyph}
    </span>
  )
  const captionPill = (
    <span className={'mockup-hv-badge--variant-1__caption mockup-hv-badge--variant-1__caption--' + kind} aria-hidden>
      {meta.label}
    </span>
  )
  return (
    <div className={'mockup-hv-faceoff mockup-hv-faceoff--' + kind + ' mockup-hv-badge--variant-1'}>
      <div className="mockup-hv-faceoff__side mockup-hv-faceoff__side--home">
        <div className="mockup-hv-faceoff__avatar-col">
          <div
            className={
              'mockup-hv-faceoff__crest mockup-hv-faceoff__crest--' + kind +
              ' mockup-hv-badge--variant-1__avatar mockup-hv-badge--variant-1__avatar--' + kind
            }
          >
            {kind === 'hero' ? 'CO' : 'TO'}
            {dot}
          </div>
          {captionPill}
        </div>
        <div className="mockup-hv-faceoff__names">
          <span className="mockup-hv-faceoff__name">{kind === 'hero' ? 'Crouch End Oashisu' : 'Toronto Oizo'}</span>
          <span className="mockup-hv-faceoff__sub">{kind === 'hero' ? 'David Higman · #1' : 'Andy Ward · #3'}</span>
        </div>
      </div>
      <div className="mockup-hv-faceoff__score">
        <span className={'mockup-hv-faceoff__score-half mockup-hv-faceoff__score-half--' + (kind === 'hero' ? 'loser' : 'winner')}>
          {kind === 'hero' ? 67 : 71}
        </span>
        <span className="mockup-hv-faceoff__score-sep">–</span>
        <span className={'mockup-hv-faceoff__score-half mockup-hv-faceoff__score-half--' + (kind === 'hero' ? 'winner' : 'loser')}>
          {kind === 'hero' ? 71 : 67}
        </span>
      </div>
      <div className="mockup-hv-faceoff__side mockup-hv-faceoff__side--away">
        <div className="mockup-hv-faceoff__names mockup-hv-faceoff__names--away">
          <span className="mockup-hv-faceoff__name">{kind === 'hero' ? 'Toronto Oizo' : 'Crouch End Oashisu'}</span>
          <span className="mockup-hv-faceoff__sub">{kind === 'hero' ? 'Andy Ward · #3' : 'David Higman · #1'}</span>
        </div>
        <div className="mockup-hv-faceoff__crest mockup-hv-faceoff__crest--neutral">{kind === 'hero' ? 'TO' : 'CO'}</div>
      </div>
    </div>
  )
}

/* Variant 2 — Standalone circular medallion next to the avatar */
function HvVariant2Render({ kind }) {
  const meta = HV_KINDS.find((k) => k.key === kind)
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  const medallion = (
    <span
      className={'mockup-hv-badge--variant-2__medallion mockup-hv-badge--variant-2__medallion--' + kind}
      role="img"
      aria-label={meta.label}
    >
      <img
        className="mockup-hv-badge--variant-2__img"
        src={`${base}${meta.img}`}
        alt=""
        style={{ objectPosition: meta.objectPosition }}
        decoding="async"
        loading="lazy"
      />
      <span className={'mockup-hv-badge--variant-2__tint mockup-hv-badge--variant-2__tint--' + kind} aria-hidden />
      <span className="mockup-hv-badge--variant-2__caption" aria-hidden>
        <span className="mockup-hv-badge--variant-2__caption-1">{meta.short}</span>
        <span className="mockup-hv-badge--variant-2__caption-2">{meta.short2}</span>
      </span>
    </span>
  )
  return <HvFaceOffShell kind={kind} badge={medallion} position="left" />
}

/* Variant 3 — Two-part horizontal pill (circle + caption) */
function HvVariant3Render({ kind }) {
  const meta = HV_KINDS.find((k) => k.key === kind)
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  const pill = (
    <span
      className={'mockup-hv-badge--variant-3__pill mockup-hv-badge--variant-3__pill--' + kind}
      role="img"
      aria-label={meta.label}
    >
      <span className={'mockup-hv-badge--variant-3__circle mockup-hv-badge--variant-3__circle--' + kind}>
        <img
          className="mockup-hv-badge--variant-3__img"
          src={`${base}${meta.img}`}
          alt=""
          style={{ objectPosition: meta.objectPosition }}
          decoding="async"
          loading="lazy"
        />
      </span>
      <span className="mockup-hv-badge--variant-3__caption" aria-hidden>{meta.label}</span>
    </span>
  )
  return <HvFaceOffShell kind={kind} badge={pill} position="right" />
}

/* Reference (current production look) wrapped in the same face-off shell */
function HvReferenceRender({ kind }) {
  return <HvFaceOffShell kind={kind} badge={<HvReferenceBadge kind={kind} />} position="right" />
}

function HeroVillainBadgeShowcase() {
  const variants = [
    {
      key: 'ref',
      label: 'Current — for comparison',
      caption: 'Production rectangular tile · image cutout + caps text · orange (HERO) / purple (VILLAIN) tint.',
      Render: HvReferenceRender,
      tag: 'reference',
    },
    {
      key: 'v1',
      label: 'Variant 1 — Status ring + badge dot',
      caption: 'Avatar gets a 2px tinted ring + a 16px glyph dot at the bottom-right. Caption pill below in caps mono.',
      Render: HvVariant1Render,
      tag: 'locked',
    },
    {
      key: 'v2',
      label: 'Variant 2 — Standalone medallion',
      caption: 'Discrete 56px circle next to the manager avatar. Image cropped to circle + faint gradient tint + stacked HERO / DEFEAT text under it.',
      Render: HvVariant2Render,
      tag: 'reference',
    },
    {
      key: 'v3',
      label: 'Variant 3 — Horizontal pill (circle + caption)',
      caption: 'Same image + text composition as today, reshaped into a rounded-pill capsule.',
      Render: HvVariant3Render,
      tag: 'reference',
    },
  ]
  return (
    <div className="mockup-hv-showcase">
      {variants.map((v) => (
        <div className="mockup-hv-variant" key={v.key}>
          <div className="mockup-hv-variant__head">
            <span className="mockup-hv-variant__label">
              {v.label}
              {v.tag === 'locked' ? (
                <span className="mockup-variant-picked" aria-label="Locked option">LOCKED</span>
              ) : (
                <span className="mockup-variant-ref" aria-label="Reference only">Reference only</span>
              )}
            </span>
            <span className="mockup-hv-variant__caption">{v.caption}</span>
          </div>
          <div className="mockup-hv-variant__pair">
            <div className="mockup-hv-variant__cell">
              <div className="mockup-hv-variant__kind-h">HERO DEFEAT · orange/red</div>
              <v.Render kind="hero" />
            </div>
            <div className="mockup-hv-variant__cell">
              <div className="mockup-hv-variant__kind-h">VILLAIN VICTORY · purple/violet</div>
              <v.Render kind="villain" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* Expanded breakdown sample data for the first fixture. `total` is each
 * player's points contribution; values sum to the headline score
 * (CO 67 — TO 61). Draft H2H has no captaincy so no doubling applies. */
const EXPANDED_BREAKDOWN = {
  home: {
    label: 'HOME',
    code: 'CO',
    name: 'Crouch End Oashisu',
    total: 67,
    players: [
      { club: 'LIV', name: 'M.Salah',   pos: 'MID', total: 18 },
      { club: 'ARS', name: 'Saliba',    pos: 'DEF', total: 9 },
      { club: 'NEW', name: 'Bruno G.',  pos: 'MID', total: 7 },
      { club: 'CHE', name: 'Palmer',    pos: 'MID', total: 7 },
      { club: 'LIV', name: 'Alisson',   pos: 'GKP', total: 6 },
      { club: 'LIV', name: 'Van Dijk',  pos: 'DEF', total: 5 },
      { club: 'MCI', name: 'Haaland',   pos: 'FWD', total: 5 },
      { club: 'NEW', name: 'Isak',      pos: 'FWD', total: 4 },
      { club: 'TOT', name: 'Porro',     pos: 'DEF', total: 4 },
      { club: 'AVL', name: 'McGinn',    pos: 'MID', total: 2 },
      { club: 'BOU', name: 'Evanilson', pos: 'FWD', total: 0 },
    ],
  },
  away: {
    label: 'AWAY',
    code: 'TO',
    name: 'Toronto Oizo',
    total: 61,
    players: [
      { club: 'TOT', name: 'Maddison',   pos: 'MID', total: 14 },
      { club: 'BRE', name: 'Mbeumo',     pos: 'MID', total: 11 },
      { club: 'NFO', name: 'Sels',       pos: 'GKP', total: 7 },
      { club: 'CHE', name: 'Delap',      pos: 'FWD', total: 7 },
      { club: 'ARS', name: 'Gabriel',    pos: 'DEF', total: 6 },
      { club: 'BHA', name: 'João Pedro', pos: 'FWD', total: 6 },
      { club: 'CHE', name: 'N.Jackson',  pos: 'FWD', total: 5 },
      { club: 'WHU', name: 'Bowen',      pos: 'MID', total: 3 },
      { club: 'NEW', name: 'Gordon',     pos: 'MID', total: 2 },
      { club: 'BOU', name: 'Kerkez',     pos: 'DEF', total: 0 },
      { club: 'AVL', name: 'Konsa',      pos: 'DEF', total: 0 },
    ],
  },
}

function PortraitBreakdownTeam({ team }) {
  const sorted = useMemo(
    () => [...team.players].sort((a, b) => b.total - a.total),
    [team.players],
  )
  return (
    <>
      <div className="mockup-portrait-breakdown__team-h">
        <span className="mockup-portrait-breakdown__team-h-label">{team.label}</span>
        <span className="mockup-portrait-breakdown__team-h-name">{team.name}</span>
        <span className="mockup-portrait-breakdown__team-h-pts">{team.total}</span>
      </div>
      {sorted.map((p, i) => (
        <div className="mockup-portrait-breakdown__player" key={i}>
          <ClubCrest club={p.club} size={18} className="mockup-portrait-breakdown__crest" />
          <span className="mockup-portrait-breakdown__name">{p.name}</span>
          <span className={`mockup-portrait-breakdown__pos mockup-portrait-breakdown__pos--${p.pos}`}>{p.pos}</span>
          <span className={'mockup-portrait-breakdown__total' + (p.total === 0 ? ' mockup-portrait-breakdown__total--zero' : '')}>
            {p.total}
          </span>
        </div>
      ))}
    </>
  )
}

function PortraitCompressedExpandedFirst() {
  // Variant B — compressed list, but the first fixture is shown in its expanded
  // state so the breakdown sits inline beneath it.
  const fixtures = [
    { home: { code: 'CO', short: 'Crouch End', winner: true }, away: { code: 'TO', short: 'Toronto'    }, hs: 67, as: 61 },
    { home: { code: 'CC', short: 'Clapton'    },                away: { code: 'HA', short: 'Hackney',  winner: true }, hs: 38, as: 52 },
    { home: { code: 'HM', short: 'Heavenly',  winner: true   }, away: { code: 'MJ', short: 'Mighty'    }, hs: 71, as: 49 },
    { home: { code: 'SC', short: 'Soul Cough.' },               away: { code: 'BM', short: 'Brampton', winner: true }, hs: 33, as: 44 },
  ]
  return (
    <div className="mockup-live-compressed">
      <div className="mockup-live-compressed__head">
        <StateChip kind="live" text="Live · GW 28" />
        <span className="mockup-live-group__header-meta">Sat 16:30 → Mon 21:00</span>
        <span className="mockup-live-group__header-progress">6 of 10 fixtures complete</span>
      </div>
      {fixtures.map((f, i) => (
        <Fragment key={i}>
          <div className={'mockup-live-compressed__row' + (i === 0 ? ' is-open' : '')}>
            <div className="mockup-live-compressed__side">
              <div className="mockup-live-compressed__crest">{f.home.code}</div>
              <span className={'mockup-live-compressed__name' + (f.home.winner ? ' mockup-live-compressed__name--winner' : f.away.winner ? ' mockup-live-compressed__name--loser' : '')}>
                {f.home.short}
              </span>
            </div>
            <div className="mockup-live-compressed__score">
              <span className={'mockup-live-compressed__score__half--' + (f.home.winner ? 'winner' : 'loser')}>{f.hs}</span>
              <span className="mockup-live-compressed__score__sep">–</span>
              <span className={'mockup-live-compressed__score__half--' + (f.away.winner ? 'winner' : 'loser')}>{f.as}</span>
            </div>
            <div className="mockup-live-compressed__side mockup-live-compressed__side--away">
              <span className={'mockup-live-compressed__name' + (f.away.winner ? ' mockup-live-compressed__name--winner' : f.home.winner ? ' mockup-live-compressed__name--loser' : '')}>
                {f.away.short}
              </span>
              <div className="mockup-live-compressed__crest">{f.away.code}</div>
            </div>
          </div>
          {i === 0 && (
            <div className="mockup-portrait-breakdown">
              <PortraitBreakdownTeam team={EXPANDED_BREAKDOWN.home} />
              <PortraitBreakdownTeam team={EXPANDED_BREAKDOWN.away} />
              <div className="mockup-portrait-breakdown__total">
                <span className="mockup-portrait-breakdown__total-label">Total</span>
                <span className="mockup-portrait-breakdown__total-score">
                  <span className="mockup-portrait-breakdown__total-half mockup-portrait-breakdown__total-half--winner">{EXPANDED_BREAKDOWN.home.total}</span>
                  <span className="mockup-portrait-breakdown__total-sep">–</span>
                  <span className="mockup-portrait-breakdown__total-half mockup-portrait-breakdown__total-half--loser">{EXPANDED_BREAKDOWN.away.total}</span>
                </span>
              </div>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  )
}

function PortraitCompressed() {
  // Variant B — face-off horizontal, but compressed to fit 375px
  const fixtures = [
    { home: { code: 'CO', short: 'Crouch End', winner: true }, away: { code: 'TO', short: 'Toronto'    }, hs: 67, as: 61 },
    { home: { code: 'CC', short: 'Clapton'    },                away: { code: 'HA', short: 'Hackney',  winner: true }, hs: 38, as: 52 },
    { home: { code: 'HM', short: 'Heavenly',  winner: true   }, away: { code: 'MJ', short: 'Mighty'    }, hs: 71, as: 49 },
    { home: { code: 'SC', short: 'Soul Cough.' },               away: { code: 'BM', short: 'Brampton', winner: true }, hs: 33, as: 44 },
  ]
  return (
    <div className="mockup-live-compressed">
      <div className="mockup-live-compressed__head">
        <StateChip kind="live" text="Live · GW 28" />
        <span className="mockup-live-group__header-meta">Sat 16:30 → Mon 21:00</span>
        <span className="mockup-live-group__header-progress">6 of 10 fixtures complete</span>
      </div>
      {fixtures.map((f, i) => (
        <div className="mockup-live-compressed__row" key={i}>
          <div className="mockup-live-compressed__side">
            <div className="mockup-live-compressed__crest">{f.home.code}</div>
            <span className={'mockup-live-compressed__name' + (f.home.winner ? ' mockup-live-compressed__name--winner' : f.away.winner ? ' mockup-live-compressed__name--loser' : '')}>
              {f.home.short}
            </span>
          </div>
          <div className="mockup-live-compressed__score">
            <span className={'mockup-live-compressed__score__half--' + (f.home.winner ? 'winner' : 'loser')}>{f.hs}</span>
            <span className="mockup-live-compressed__score__sep">–</span>
            <span className={'mockup-live-compressed__score__half--' + (f.away.winner ? 'winner' : 'loser')}>{f.as}</span>
          </div>
          <div className="mockup-live-compressed__side mockup-live-compressed__side--away">
            <span className={'mockup-live-compressed__name' + (f.away.winner ? ' mockup-live-compressed__name--winner' : f.home.winner ? ' mockup-live-compressed__name--loser' : '')}>
              {f.away.short}
            </span>
            <div className="mockup-live-compressed__crest">{f.away.code}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Expanded fixture — tap a row to see both teams' players              */
/* ------------------------------------------------------------------ */
function ExpandedHeader() {
  return (
    <div className="mockup-expanded__head">
      <div className="mockup-expanded__head-top">
        <button className="mockup-expanded__back" aria-label="Back">‹</button>
        <StateChip kind="live" text="Live · GW 28" />
        <span className="mockup-live-group__header-progress" style={{ marginLeft: 'auto', fontSize: 10 }}>6/10 done</span>
      </div>
      <div className="mockup-expanded__matchup">
        <div className="mockup-expanded__side">
          <div className="mockup-expanded__crest">CO</div>
          <span className="mockup-expanded__name mockup-expanded__name--winner">Crouch End</span>
        </div>
        <div className="mockup-expanded__score">
          <span className="mockup-expanded__score__half--winner">67</span>
          <span className="mockup-expanded__score__sep">–</span>
          <span className="mockup-expanded__score__half--loser">61</span>
        </div>
        <div className="mockup-expanded__side mockup-expanded__side--away">
          <span className="mockup-expanded__name mockup-expanded__name--loser">Toronto</span>
          <div className="mockup-expanded__crest">TO</div>
        </div>
      </div>
    </div>
  )
}

// xi: PL matchday squad status — 'xi' (in starting XI) | 'bench' (on PL bench) | 'absent' (not in squad)
// goals/assists: integer counts. defcon: total defensive contributions. bonus: BPS-bonus number.
// played: derived true/false — used to gate the second-line stats strip.
// cs: clean sheet active (>60 mins played, 0 conceded). Only shown for GK/DEF/MID.
// opp: opponent club 3-letter code (replaces minute/kickoff display).
const TEAM_CO = {
  code: 'CO',
  name: 'Crouch End',
  total: 67,
  starters: [
    { club: 'LIV', name: 'Alisson',     pos: 'GK',  opp: 'CHE', played: true,  min: 67, pts: 6,  xi: 'xi',     g: 0, a: 0, dc: 2,  b: 0, cs: true  },
    { club: 'ARS', name: 'Saliba',      pos: 'DEF', opp: 'NFO', played: true,  min: 90, pts: 9,  xi: 'xi',     g: 0, a: 0, dc: 14, b: 1, cs: true  },
    { club: 'LIV', name: 'Van Dijk',    pos: 'DEF', opp: 'CHE', played: true,  min: 67, pts: 6,  xi: 'xi',     g: 0, a: 0, dc: 11, b: 0, cs: true  },
    { club: 'TOT', name: 'Porro',       pos: 'DEF', opp: 'BRE', played: true,  min: 67, pts: 4,  xi: 'xi',     g: 0, a: 1, dc: 8,  b: 0, cs: false },
    { club: 'LIV', name: 'M.Salah',     pos: 'MID', opp: 'CHE', played: true,  min: 67, pts: 18, xi: 'xi', g: 1, a: 1, dc: 0, b: 3, cs: true },
    { club: 'NEW', name: 'Bruno G.',    pos: 'MID', opp: 'WHU', played: true,  min: 90, pts: 8,  xi: 'xi',     g: 0, a: 1, dc: 12, b: 0, cs: false },
    { club: 'CHE', name: 'Palmer',      pos: 'MID', opp: 'LIV', played: true,  min: 67, pts: 7,  xi: 'xi',     g: 1, a: 0, dc: 1,  b: 0, cs: false },
    { club: 'AVL', name: 'McGinn',      pos: 'MID', opp: 'LEI', played: false, min: 0,  pts: 0,  xi: 'bench',  g: 0, a: 0, dc: 0, b: 0, cs: false },
    { club: 'MCI', name: 'Haaland',     pos: 'FWD', opp: 'BHA', played: true,  min: 90, pts: 5,  xi: 'xi',     g: 1, a: 0, dc: 0, b: 0, cs: false },
    { club: 'NEW', name: 'Isak',        pos: 'FWD', opp: 'WHU', played: true,  min: 58, pts: 4,  xi: 'xi',     g: 0, a: 0, dc: 1, b: 0, cs: false, inj: true },
    { club: 'BOU', name: 'Evanilson',   pos: 'FWD', opp: 'CRY', played: false, min: 0,  pts: 0,  xi: 'absent', g: 0, a: 0, dc: 0, b: 0, cs: false },
  ],
  bench: [
    { club: 'BHA', name: 'Verbruggen',  pos: 'GK',  opp: 'MCI', played: true,  min: 90, pts: 2,  xi: 'xi',     g: 0, a: 0, dc: 1,  b: 0, cs: false },
    { club: 'WHU', name: 'Wan-Bissaka', pos: 'DEF', opp: 'NEW', played: true,  min: 67, pts: 1,  xi: 'xi',     g: 0, a: 0, dc: 8,  b: 0, cs: false, autosub: true },
    { club: 'CRY', name: 'Eze',         pos: 'MID', opp: 'BOU', played: false, min: 0,  pts: 0,  xi: 'bench',  g: 0, a: 0, dc: 0, b: 0, cs: false },
    { club: 'FUL', name: 'Muniz',       pos: 'FWD', opp: 'IPS', played: false, min: 0,  pts: 0,  xi: 'absent', g: 0, a: 0, dc: 0, b: 0, cs: false },
  ],
}

const TEAM_TO = {
  code: 'TO',
  name: 'Toronto',
  total: 61,
  starters: [
    { club: 'NFO', name: 'Sels',        pos: 'GK',  opp: 'ARS', played: true,  min: 90, pts: 7,  xi: 'xi',     g: 0, a: 0, dc: 3,  b: 0, cs: false },
    { club: 'ARS', name: 'Gabriel',     pos: 'DEF', opp: 'NFO', played: true,  min: 90, pts: 6,  xi: 'xi',     g: 0, a: 1, dc: 14, b: 1, cs: true  },
    { club: 'BOU', name: 'Kerkez',      pos: 'DEF', opp: 'CRY', played: false, min: 0,  pts: 0,  xi: 'xi',     g: 0, a: 0, dc: 0, b: 0, cs: false },
    { club: 'AVL', name: 'Konsa',       pos: 'DEF', opp: 'LEI', played: false, min: 0,  pts: 0,  xi: 'xi',     g: 0, a: 0, dc: 0, b: 0, cs: false },
    { club: 'TOT', name: 'Maddison',    pos: 'MID', opp: 'BRE', played: true,  min: 67, pts: 9,  xi: 'xi', g: 0, a: 1, dc: 5, b: 0, cs: false },
    { club: 'BRE', name: 'Mbeumo',      pos: 'MID', opp: 'TOT', played: true,  min: 90, pts: 11, xi: 'xi',     g: 1, a: 0, dc: 6, b: 1, cs: false },
    { club: 'WHU', name: 'Bowen',       pos: 'MID', opp: 'NEW', played: true,  min: 67, pts: 5,  xi: 'xi',     g: 0, a: 1, dc: 2, b: 0, cs: false, inj: true },
    { club: 'NEW', name: 'Gordon',      pos: 'MID', opp: 'WHU', played: true,  min: 90, pts: 4,  xi: 'xi',     g: 0, a: 0, dc: 4, b: 0, cs: false },
    { club: 'CHE', name: 'N.Jackson',   pos: 'FWD', opp: 'LIV', played: true,  min: 67, pts: 6,  xi: 'xi',     g: 1, a: 0, dc: 1, b: 0, cs: false },
    { club: 'IPS', name: 'Delap',       pos: 'FWD', opp: 'FUL', played: true,  min: 88, pts: 7,  xi: 'xi',     g: 1, a: 0, dc: 1, b: 0, cs: false },
    { club: 'BRI', name: 'João Pedro',  pos: 'FWD', opp: 'WOL', played: true,  min: 64, pts: 6,  xi: 'bench',  g: 0, a: 1, dc: 1, b: 0, cs: false },
  ],
  bench: [
    { club: 'EVE', name: 'Pickford',    pos: 'GK',  opp: 'SOU', played: true,  min: 90, pts: 2,  xi: 'xi',     g: 0, a: 0, dc: 1,  b: 0, cs: false },
    { club: 'LEI', name: 'Justin',      pos: 'DEF', opp: 'AVL', played: true,  min: 67, pts: 1,  xi: 'xi',     g: 0, a: 0, dc: 6,  b: 0, cs: false, autosub: true },
    { club: 'WOL', name: 'Cunha',       pos: 'MID', opp: 'BRI', played: false, min: 0,  pts: 0,  xi: 'bench',  g: 0, a: 0, dc: 0, b: 0, cs: false },
    { club: 'SOU', name: 'Armstrong',   pos: 'FWD', opp: 'EVE', played: false, min: 0,  pts: 0,  xi: 'absent', g: 0, a: 0, dc: 0, b: 0, cs: false },
  ],
}

function StatDots({ count, kind }) {
  if (!count) return null
  return (
    <span className="mockup-expanded__stat" aria-label={`${count} ${kind}`}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`mockup-expanded__stat-dot mockup-expanded__stat-dot--${kind}`} />
      ))}
    </span>
  )
}

function PlayerRow({ p, bench }) {
  const showCS = p.cs && (p.pos === 'GK' || p.pos === 'DEF' || p.pos === 'MID')
  return (
    <div className={'mockup-expanded__player' + (bench ? ' mockup-expanded__player--bench' : '')}>
      <div className="mockup-expanded__player-crest">{p.club}</div>
      <div className="mockup-expanded__player-name">
        <span className={`mockup-expanded__name-pill mockup-expanded__name-pill--${p.xi || 'xi'}`}>
          {p.name}
        </span>
      </div>
      {p.pos && <span className="mockup-expanded__player-pos">{p.pos}</span>}
      <span className="mockup-expanded__player-opp">
        <span className="mockup-expanded__player-opp-vs">vs</span>
        <span className="mockup-expanded__player-opp-crest">{p.opp}</span>
      </span>
      <span className={'mockup-expanded__player-pts' + (p.pts === 0 ? ' mockup-expanded__player-pts--zero' : '')}>{p.pts}</span>
      {p.played && (
        <div className="mockup-expanded__player-stats">
          <StatDots count={p.g} kind="goal" />
          <StatDots count={p.a} kind="assist" />
          {showCS && (
            <span className="mockup-expanded__stat" aria-label="Clean sheet">
              <span className="mockup-expanded__stat-dot mockup-expanded__stat-dot--cs" />
            </span>
          )}
          <span className="mockup-expanded__stat">
            <span className="mockup-expanded__stat-label">DC</span>
            <span className={'mockup-expanded__stat-num' + (p.dc === 0 ? ' mockup-expanded__stat-num--zero' : '')}>{p.dc}</span>
          </span>
          {p.b > 0 && (
            <span className="mockup-expanded__stat">
              <span className="mockup-expanded__stat-num mockup-expanded__stat-num--bonus">+{p.b}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerList({ team }) {
  return (
    <>
      <div className="mockup-expanded__group-h">
        <span>Starting XI</span>
        <span className="mockup-expanded__group-h-legend">G &middot; A &middot; DC &middot; B</span>
        <span className="mockup-expanded__group-h-pts">PTS</span>
      </div>
      {team.starters.map((p, i) => <PlayerRow key={'s' + i} p={p} />)}
      <div className="mockup-expanded__group-h">
        <span>Bench</span>
      </div>
      {team.bench.map((p, i) => <PlayerRow key={'b' + i} p={p} bench />)}
    </>
  )
}

function ExpandedTabbed() {
  const [tab, setTab] = useState('home')
  const team = tab === 'home' ? TEAM_CO : TEAM_TO
  return (
    <div className="mockup-expanded">
      <ExpandedHeader />
      <div className="mockup-expanded__tabs">
        <button className={'mockup-expanded__tab' + (tab === 'home' ? ' is-active' : '')} onClick={() => setTab('home')}>
          <span>Crouch End</span>
          <span className="mockup-expanded__tab-points">{TEAM_CO.total} pts</span>
        </button>
        <button className={'mockup-expanded__tab' + (tab === 'away' ? ' is-active' : '')} onClick={() => setTab('away')}>
          <span>Toronto</span>
          <span className="mockup-expanded__tab-points">{TEAM_TO.total} pts</span>
        </button>
      </div>
      <PlayerList team={team} />
    </div>
  )
}

function ExpandedStacked() {
  return (
    <div className="mockup-expanded">
      <ExpandedHeader />
      <div className="mockup-expanded__team-h mockup-expanded__team-h--winner">
        <div className="mockup-expanded__crest">{TEAM_CO.code}</div>
        <span>Crouch End Oashisu</span>
        <span className="mockup-expanded__team-pts">{TEAM_CO.total}</span>
      </div>
      <PlayerList team={TEAM_CO} />
      <div className="mockup-expanded__team-h">
        <div className="mockup-expanded__crest">{TEAM_TO.code}</div>
        <span>Toronto Oizo</span>
        <span className="mockup-expanded__team-pts">{TEAM_TO.total}</span>
      </div>
      <PlayerList team={TEAM_TO} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Expanded · Table style — restyled production view for stat tracking  */
/* ------------------------------------------------------------------ */
function minTone(min, played) {
  if (!played) return 'none'
  if (min >= 89) return 'full'
  if (min >= 60) return 'good'
  if (min >= 30) return 'partial'
  return 'low'
}

function dcAchieved(pos, dc) {
  if (pos === 'DEF') return dc >= 10
  if (pos === 'MID' || pos === 'FWD') return dc >= 12
  return false
}

function TableRow({ p, bench }) {
  const showCS = p.cs && (p.pos === 'GK' || p.pos === 'DEF' || p.pos === 'MID')
  const tone = minTone(p.min, p.played)
  return (
    <div className={'mockup-table__row' + (bench ? ' mockup-table__row--bench' : '')}>
      <div className="mockup-table__cell mockup-table__cell--player">
        <ClubCrest club={p.club} size={18} className="mockup-table__player-crest" />
        <span className={`mockup-table__player-name mockup-table__player-name--${p.xi}`}>
          {p.name}
          {showCS && <span className="mockup-table__cs" aria-label="Clean sheet" />}
          {p.inj && <span className="mockup-table__inj" aria-label="Injury doubt" title="Injury doubt">🚑</span>}
          {p.autosub && <span className="mockup-table__autosub" aria-label="Autosubbed in" title="Autosubbed in">🔄</span>}
        </span>
      </div>
      <div className="mockup-table__cell mockup-table__cell--pos">{p.pos}</div>
      <div className={`mockup-table__cell mockup-table__cell--min mockup-table__cell--min-${tone}`}>
        {p.played ? p.min : '—'}
      </div>
      <div className={
        'mockup-table__cell mockup-table__cell--num mockup-table__cell--dc' +
        (!p.played ? ' mockup-table__cell--mute' : '') +
        (p.played && dcAchieved(p.pos, p.dc) ? ' mockup-table__cell--dc-achieved' : '')
      }>
        {p.played ? p.dc : '—'}
      </div>
      <div className="mockup-table__cell mockup-table__cell--num mockup-table__cell--g">
        {p.g > 0 ? p.g : (p.played ? <span className="mockup-table__zero">0</span> : '—')}
      </div>
      <div className="mockup-table__cell mockup-table__cell--num mockup-table__cell--a">
        {p.a > 0 ? p.a : (p.played ? <span className="mockup-table__zero">0</span> : '—')}
      </div>
      <div className="mockup-table__cell mockup-table__cell--num mockup-table__cell--b">
        {p.b > 0 ? p.b : (p.played ? <span className="mockup-table__zero">0</span> : '—')}
      </div>
      <div className={'mockup-table__cell mockup-table__cell--num mockup-table__cell--pts' + (p.pts === 0 ? ' mockup-table__cell--pts-zero' : '')}>
        {p.pts}
      </div>
    </div>
  )
}

function ExpandedTable() {
  const [tab, setTab] = useState('home')
  const team = tab === 'home' ? TEAM_CO : TEAM_TO
  return (
    <div className="mockup-expanded">
      <ExpandedHeader />
      <div className="mockup-expanded__tabs">
        <button className={'mockup-expanded__tab' + (tab === 'home' ? ' is-active' : '')} onClick={() => setTab('home')}>
          <span>Crouch End</span>
          <span className="mockup-expanded__tab-points">{TEAM_CO.total} pts</span>
        </button>
        <button className={'mockup-expanded__tab' + (tab === 'away' ? ' is-active' : '')} onClick={() => setTab('away')}>
          <span>Toronto</span>
          <span className="mockup-expanded__tab-points">{TEAM_TO.total} pts</span>
        </button>
      </div>
      <div className="mockup-table">
        <div className="mockup-table__head">
          <div className="mockup-table__th mockup-table__th--player">Player</div>
          <div className="mockup-table__th mockup-table__th--pos">Pos</div>
          <div className="mockup-table__th">Min</div>
          <div className="mockup-table__th">DC</div>
          <div className="mockup-table__th mockup-table__th--g" title="Goals">
            <span className="mockup-table__head-dot mockup-table__head-dot--g" />G
          </div>
          <div className="mockup-table__th mockup-table__th--a" title="Assists">
            <span className="mockup-table__head-dot mockup-table__head-dot--a" />A
          </div>
          <div className="mockup-table__th">B</div>
          <div className="mockup-table__th mockup-table__th--pts">Pts</div>
        </div>
        <div className="mockup-table__group">Starting XI</div>
        {team.starters.map((p, i) => <TableRow key={'s' + i} p={p} />)}
        <div className="mockup-table__group">Bench</div>
        {team.bench.map((p, i) => <TableRow key={'b' + i} p={p} bench />)}
      </div>
    </div>
  )
}

function PortraitExpandedPreview() {
  return (
    <div className="mockup-portrait-row">
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Option 1 · Compact list (browsing)</div>
        <PortraitFrame>
          <ExpandedTabbed />
        </PortraitFrame>
      </div>
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Option 2 · Table (stat tracking)</div>
        <PortraitFrame>
          <ExpandedTable />
        </PortraitFrame>
      </div>
    </div>
  )
}

function PortraitPreview() {
  return (
    <div className="mockup-portrait-row">
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Collapsed · full gameweek</div>
        <PortraitFrame>
          <PortraitCompressed />
        </PortraitFrame>
      </div>
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Expanded · first fixture open</div>
        <PortraitFrame>
          <PortraitCompressedExpandedFirst />
        </PortraitFrame>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Portrait surfaces — other tabs adapted to a 375px phone frame        */
/* ------------------------------------------------------------------ */

function PortraitPageHeader({ title, meta }) {
  return (
    <div className="mockup-portrait-page__h">
      <span className="mockup-portrait-page__h-title">{title}</span>
      {meta && <span className="mockup-portrait-page__h-meta">{meta}</span>}
    </div>
  )
}

/* a. Standings ----------------------------------------------------- */
const PORTRAIT_STANDINGS = [
  { rank: 1, code: 'CO', name: 'Crouch End',     w: 18, d: 1, l: 4,  pts: 55, form: ['W','W','W','L','W'], pf: 1342, pa: 1186, streak: 'W2' },
  { rank: 2, code: 'TO', name: 'Toronto Oizo',   w: 16, d: 1, l: 6,  pts: 49, form: ['W','L','W','W','W'], pf: 1310, pa: 1195, streak: 'W3' },
  { rank: 3, code: 'CC', name: 'Clapton',        w: 14, d: 2, l: 7,  pts: 44, form: ['W','L','W','D','W'], pf: 1289, pa: 1198, streak: 'W1' },
  { rank: 4, code: 'HA', name: 'Hackney York',   w: 13, d: 2, l: 8,  pts: 41, form: ['L','W','W','L','W'], pf: 1275, pa: 1212, streak: 'W1' },
  { rank: 5, code: 'HM', name: 'Heavenly Loaf',  w: 11, d: 2, l: 10, pts: 35, form: ['L','W','L','W','L'], pf: 1240, pa: 1220, streak: 'L1' },
  { rank: 6, code: 'MJ', name: 'Mighty Jamir.',  w: 9,  d: 3, l: 11, pts: 30, form: ['L','L','W','L','D'], pf: 1218, pa: 1252, streak: 'D1' },
  { rank: 7, code: 'SC', name: 'Seoul Club 7',   w: 8,  d: 2, l: 13, pts: 26, form: ['L','W','L','L','L'], pf: 1192, pa: 1268, streak: 'L3' },
  { rank: 8, code: 'BM', name: 'Brampton II',    w: 7,  d: 1, l: 15, pts: 22, form: ['L','L','D','L','L'], pf: 1180, pa: 1290, streak: 'L2' },
]

function PortraitStandings() {
  const [expanded, setExpanded] = useState(3)
  return (
    <div className="mockup-portrait-page">
      <PortraitPageHeader title="Standings" meta="GW 28" />
      <div className="mockup-portrait-standings">
        {PORTRAIT_STANDINGS.map((r) => (
          <Fragment key={r.rank}>
            <button
              type="button"
              className={'mockup-portrait-standings__row' + (expanded === r.rank ? ' is-open' : '')}
              onClick={() => setExpanded((e) => (e === r.rank ? null : r.rank))}
            >
              <span className="mockup-portrait-standings__rank">{r.rank}</span>
              <span className="mockup-portrait-standings__crest">{r.code}</span>
              <span className="mockup-portrait-standings__team">{r.name}</span>
              <span className="mockup-portrait-standings__wl">{r.w}-{r.l}</span>
              <span className="mockup-portrait-standings__pts">{r.pts}</span>
              <span className="mockup-portrait-standings__form">
                {r.form.map((f, i) => (
                  <span key={i} className={`mockup-portrait-standings__pip mockup-portrait-standings__pip--${f}`} aria-label={f} />
                ))}
              </span>
            </button>
            {expanded === r.rank && (
              <div className="mockup-portrait-standings__detail">
                <span className="mockup-portrait-standings__detail-item">
                  <span className="mockup-portrait-standings__detail-k">PF</span>
                  <span className="mockup-portrait-standings__detail-v">{r.pf}</span>
                </span>
                <span className="mockup-portrait-standings__detail-item">
                  <span className="mockup-portrait-standings__detail-k">PA</span>
                  <span className="mockup-portrait-standings__detail-v">{r.pa}</span>
                </span>
                <span className="mockup-portrait-standings__detail-item">
                  <span className="mockup-portrait-standings__detail-k">Streak</span>
                  <span className={
                    'mockup-portrait-standings__detail-v' +
                    (r.streak.startsWith('W') ? ' mockup-portrait-standings__detail-v--pos' :
                     r.streak.startsWith('L') ? ' mockup-portrait-standings__detail-v--neg' : '')
                  }>{r.streak}</span>
                </span>
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

/* b. Schedule luck (single-team mode) ------------------------------ */
const LUCK_TEAMS = [
  'Crouch End Oashisu', 'Toronto Oizo', 'Clapton Cornershop', 'Hackney York',
  'Heavenly Loaf', 'Mighty Jamiroquai', 'Seoul Club 7', 'Brampton II Men',
]
const LUCK_ROWS = [
  { gw:  1, opp: { code: 'CC', name: 'Clapton'    }, actual: 62, expected: 54 },
  { gw:  2, opp: { code: 'TO', name: 'Toronto'    }, actual: 47, expected: 58 },
  { gw:  3, opp: { code: 'HA', name: 'Hackney'    }, actual: 71, expected: 60 },
  { gw:  4, opp: { code: 'HM', name: 'Heavenly'   }, actual: 53, expected: 55 },
  { gw:  5, opp: { code: 'MJ', name: 'Jamiroquai' }, actual: 48, expected: 51 },
  { gw:  6, opp: { code: 'SC', name: 'Seoul 7'    }, actual: 66, expected: 50 },
  { gw:  7, opp: { code: 'BM', name: 'Brampton'   }, actual: 58, expected: 45 },
  { gw:  8, opp: { code: 'CC', name: 'Clapton'    }, actual: 41, expected: 56 },
  { gw:  9, opp: { code: 'TO', name: 'Toronto'    }, actual: 60, expected: 59 },
  { gw: 10, opp: { code: 'HA', name: 'Hackney'    }, actual: 73, expected: 61 },
]

function PortraitScheduleLuck() {
  const [team, setTeam] = useState(LUCK_TEAMS[0])
  return (
    <div className="mockup-portrait-page">
      <PortraitPageHeader title="Schedule luck" meta="GW 1–28" />
      <div className="mockup-portrait-page__sticky">
        <select
          className="mockup-select mockup-portrait-select"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          aria-label="Select team"
        >
          {LUCK_TEAMS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="mockup-portrait-luck">
        {LUCK_ROWS.map((r) => {
          const delta = r.actual - r.expected
          const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±'
          return (
            <div key={r.gw} className="mockup-portrait-luck__row">
              <span className="mockup-portrait-luck__gw">GW{String(r.gw).padStart(2, '0')}</span>
              <div className="mockup-portrait-luck__main">
                <div className="mockup-portrait-luck__opp">
                  <span className="mockup-portrait-luck__opp-crest">{r.opp.code}</span>
                  <span className="mockup-portrait-luck__opp-name">vs {r.opp.name}</span>
                </div>
                <div className="mockup-portrait-luck__nums">
                  <span>Act <b>{r.actual}</b></span>
                  <span className="mockup-portrait-luck__sep">·</span>
                  <span>Exp <b>{r.expected}</b></span>
                </div>
              </div>
              <span className={
                'mockup-portrait-luck__delta' +
                (delta > 0 ? ' mockup-portrait-luck__delta--pos' :
                 delta < 0 ? ' mockup-portrait-luck__delta--neg' : '')
              }>{sign}{Math.abs(delta)}</span>
            </div>
          )
        })}
        <button type="button" className="mockup-portrait-luck__more">
          Show full season →
        </button>
      </div>
    </div>
  )
}

/* c. Draft board (vertical pick list) ------------------------------ */
const PORTRAIT_DRAFT = [
  { round: 1, picks: [
    { pickNo: '1.1', team: { code: 'CC', name: 'Clapton' },    player: 'E.Haaland',   club: 'MCI', pos: 'FWD', pre: 1 },
    { pickNo: '1.2', team: { code: 'CO', name: 'Crouch End' }, player: 'M.Salah',     club: 'LIV', pos: 'MID', pre: 2 },
    { pickNo: '1.3', team: { code: 'TO', name: 'Toronto' },    player: 'C.Palmer',    club: 'CHE', pos: 'MID', pre: 4 },
  ]},
  { round: 2, picks: [
    { pickNo: '2.1', team: { code: 'BM', name: 'Brampton' },   player: 'B.Saka',      club: 'ARS', pos: 'MID', pre: 6 },
    { pickNo: '2.2', team: { code: 'SC', name: 'Seoul 7' },    player: 'A.Isak',      club: 'NEW', pos: 'FWD', pre: 8 },
    { pickNo: '2.3', team: { code: 'HM', name: 'Heavenly' },   player: 'B.Fernandes', club: 'MUN', pos: 'MID', pre: 11 },
  ]},
]

function PortraitDraft() {
  return (
    <div className="mockup-portrait-page">
      <PortraitPageHeader title="Draft" meta="2025/26" />
      <div className="mockup-portrait-page__filters">
        <button type="button" className="mockup-filter-pill mockup-filter-pill--sm">
          <span className="mockup-filter-pill__label">Round</span>
          <span className="mockup-filter-pill__value">All</span>
          <CaretIcon className="mockup-filter-pill__caret" />
        </button>
        <button type="button" className="mockup-filter-pill mockup-filter-pill--sm">
          <span className="mockup-filter-pill__label">Team</span>
          <span className="mockup-filter-pill__value">All</span>
          <CaretIcon className="mockup-filter-pill__caret" />
        </button>
      </div>
      <div className="mockup-portrait-draft">
        {PORTRAIT_DRAFT.map((rnd) => (
          <Fragment key={rnd.round}>
            <div className="mockup-portrait-draft__round-h">Round {rnd.round}</div>
            {rnd.picks.map((p) => (
              <div key={p.pickNo} className="mockup-portrait-draft__pick">
                <div className="mockup-portrait-draft__player-line">
                  <span className="mockup-portrait-draft__pick-no">R{p.pickNo}</span>
                  <ClubCrest club={p.club} size={22} className="mockup-portrait-draft__player-crest" />
                  <span className="mockup-portrait-draft__player-name">{p.player}</span>
                  <span className="mockup-portrait-draft__pos">{p.pos}</span>
                  <span className="mockup-portrait-draft__pre">Pre #{p.pre}</span>
                </div>
                <div className="mockup-portrait-draft__team-line">
                  <span className="mockup-portrait-draft__team-crest">{p.team.code}</span>
                  <span className="mockup-portrait-draft__team-name">{p.team.name}</span>
                </div>
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

/* d. Waivers feed (grouped activity) ------------------------------- */
const PORTRAIT_WAIVERS = [
  {
    date: 'Wed 14 Mar', team: { code: 'CO', name: 'Crouch End' },
    in:  { name: 'B.Saka',     club: 'ARS', pos: 'MID' },
    out: { name: 'K.Trippier', club: 'NEW', pos: 'DEF' },
    note: 'Trippier rested, Saka back for bench bonus',
  },
  {
    date: 'Tue 13 Mar', team: { code: 'TO', name: 'Toronto Oizo' },
    in:  { name: 'A.Gordon',    club: 'NEW', pos: 'MID' },
    out: { name: 'M.Cucurella', club: 'CHE', pos: 'DEF' },
  },
  {
    date: 'Mon 12 Mar', team: { code: 'HA', name: 'Hackney York' },
    in:  { name: 'Y.Wissa',    club: 'BRE', pos: 'FWD' },
    out: { name: 'D.Calvert-L.', club: 'EVE', pos: 'FWD' },
    note: 'Wissa hot streak, Calvert-Lewin benched',
  },
  {
    date: 'Sun 11 Mar', team: { code: 'BM', name: 'Brampton II' },
    in:  { name: 'A.Semenyo',  club: 'BOU', pos: 'MID' },
    out: { name: 'A.Elanga',   club: 'NEW', pos: 'MID' },
  },
]

function PortraitWaivers() {
  return (
    <div className="mockup-portrait-page">
      <PortraitPageHeader title="Waivers" meta="Week 28" />
      <div className="mockup-portrait-waivers">
        {PORTRAIT_WAIVERS.map((w, i) => (
          <div key={i} className="mockup-portrait-waivers__entry">
            <div className="mockup-portrait-waivers__head">
              <span className="mockup-portrait-waivers__date">{w.date}</span>
              <span className="mockup-portrait-waivers__sep">·</span>
              <span className="mockup-portrait-waivers__team-crest">{w.team.code}</span>
              <span className="mockup-portrait-waivers__team-name">{w.team.name}</span>
            </div>
            <div className="mockup-portrait-waivers__move mockup-portrait-waivers__move--in">
              <span className="mockup-portrait-waivers__sign">+</span>
              <ClubCrest club={w.in.club} size={18} className="mockup-portrait-waivers__crest" />
              <span className="mockup-portrait-waivers__player">{w.in.name}</span>
              <span className="mockup-portrait-waivers__meta">{w.in.club} · {w.in.pos}</span>
            </div>
            <div className="mockup-portrait-waivers__move mockup-portrait-waivers__move--out">
              <span className="mockup-portrait-waivers__sign">−</span>
              <ClubCrest club={w.out.club} size={18} className="mockup-portrait-waivers__crest" />
              <span className="mockup-portrait-waivers__player">{w.out.name}</span>
              <span className="mockup-portrait-waivers__meta">{w.out.club} · {w.out.pos}</span>
            </div>
            {w.note && (
              <div className="mockup-portrait-waivers__note">{w.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* e. Hall of champions (portrait) ---------------------------------- */
const PORTRAIT_HALL_HISTORIC = [
  { mgr: 'Luke Butcher',  team: 'Seoul Club 7',       year: '2024/25' },
  { mgr: 'Andy Ward',     team: 'Toronto Oizo',       year: '2023/24' },
  { mgr: 'Mike Sutton',   team: 'Clapton Cornershop', year: '2022/23' },
  { mgr: 'David Higman',  team: 'Crouch End Oashisu', year: '2021/22' },
  { mgr: 'Nick Goodacre', team: 'Hanson of York AFC', year: '2020/21' },
]

function PortraitHall() {
  return (
    <div className="mockup-portrait-page">
      <PortraitPageHeader title="Hall of champions" meta="All-time" />
      <div className="mockup-portrait-hall">
        <div className="mockup-portrait-hall__hero">
          <span className="mockup-portrait-hall__hero-eyebrow">2025/26 Champion</span>
          <div className="mockup-portrait-hall__hero-crest">CO</div>
          <div className="mockup-portrait-hall__hero-team">Crouch End Oashisu</div>
          <div className="mockup-portrait-hall__hero-mgr">David Higman</div>
        </div>
        <div className="mockup-portrait-hall__historic">
          <div className="mockup-portrait-hall__historic-h">Previous winners</div>
          {PORTRAIT_HALL_HISTORIC.map((r) => (
            <div className="mockup-portrait-hall__historic-row" key={r.year}>
              <span className="mockup-portrait-hall__historic-year">{r.year}</span>
              <span className="mockup-portrait-hall__historic-crest">{teamInitials(r.team)}</span>
              <span className="mockup-portrait-hall__historic-team">
                <span className="mockup-portrait-hall__historic-team-name">{r.team}</span>
                <span className="mockup-portrait-hall__historic-team-mgr">{r.mgr}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* f. Compact slim hero (portrait) ---------------------------------- */
function PortraitHero() {
  return (
    <div className="mockup-portrait-hero">
      <span className="mockup-portrait-hero__mark" aria-hidden>TC</span>
      <div className="mockup-portrait-hero__title">
        <span className="mockup-portrait-hero__wordmark">TCLOT</span>
        <span className="mockup-portrait-hero__sub">2025/26 · GW 28</span>
      </div>
      <span className="mockup-portrait-hero__chip">
        <span className="mockup-portrait-hero__chip-dot" />
        Live
      </span>
    </div>
  )
}

/* Wrapper: 2-col grid of all portrait surfaces */
function PortraitSurfaces() {
  return (
    <div className="mockup-portrait-grid">
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Standings</div>
        <PortraitFrame>
          <PortraitStandings />
        </PortraitFrame>
      </div>
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Schedule luck · single-team mode</div>
        <PortraitFrame>
          <PortraitScheduleLuck />
        </PortraitFrame>
      </div>
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Draft</div>
        <PortraitFrame>
          <PortraitDraft />
        </PortraitFrame>
      </div>
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Waivers</div>
        <PortraitFrame>
          <PortraitWaivers />
        </PortraitFrame>
      </div>
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Hall of champions</div>
        <PortraitFrame>
          <PortraitHall />
        </PortraitFrame>
      </div>
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Hero (slim)</div>
        <PortraitFrame>
          <PortraitHero />
        </PortraitFrame>
      </div>
    </div>
  )
}

function LiveHeaderStrip() {
  // What the shared header looks like across the four data states.
  // Banners below the header stay identical — only this row changes.
  const variants = [
    { label: 'Pre-gameweek',     chip: { kind: 'upcoming', text: 'GW 28 · Upcoming' }, meta: 'Kicks off Sat 16:30 GMT', progress: null },
    { label: 'In progress',      chip: { kind: 'live',     text: 'Live · GW 28'      }, meta: 'Sat 16:30 → Mon 21:00',  progress: '32 mins played' },
    { label: 'Between fixtures', chip: { kind: 'live',     text: 'Live · GW 28'      }, meta: 'Sat 16:30 → Mon 21:00',  progress: '6 of 10 fixtures complete' },
    { label: 'Gameweek complete',chip: { kind: 'ft',       text: 'Final · GW 28'     }, meta: 'Sat 16:30 → Mon 21:00',  progress: null },
  ]
  return (
    <div className="mockup-live-states-strip">
      {variants.map((v) => (
        <div className="mockup-live-states-strip__row" key={v.label}>
          <div className="mockup-live-states-strip__label">{v.label}</div>
          <div className="mockup-live-states-strip__preview">
            <StateChip kind={v.chip.kind} text={v.chip.text} />
            <span className="mockup-live-group__header-meta">{v.meta}</span>
            {v.progress && <span className="mockup-live-group__header-progress">{v.progress}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: live ticker bar (4 fixtures, mixed states)                  */
/* ------------------------------------------------------------------ */
function LiveTicker() {
  const fixtures = [
    { home: { code: 'CO', name: 'Oashisu',    winner: false }, away: { code: 'TO', name: 'Oizo',       winner: true  }, score: '54 – 71' },
    { home: { code: 'CC', name: 'Cornershop', winner: true  }, away: { code: 'HA', name: 'York',       winner: false }, score: '62 – 38' },
    { home: { code: 'HM', name: 'Loaf',       winner: false }, away: { code: 'MJ', name: 'Jamiroquai', winner: true  }, score: '21 – 28' },
    { home: { code: 'SC', name: 'Seoul 7',    winner: true  }, away: { code: 'BM', name: 'Brampton',   winner: false }, score: '49 – 33' },
  ]
  // All TCLOT fixtures share the same state at any time, so we lift status
  // to a single bar header instead of repeating it per cell.
  return (
    <div className="mockup-ticker-bar">
      <div className="mockup-ticker-bar__head">
        <span className="mockup-ticker-bar__gw">GW 28</span>
        <span className="mockup-ticker-bar__sep">·</span>
        <span className="mockup-ticker-bar__status--live">Live</span>
        <span className="mockup-ticker-bar__sep">·</span>
        <span>Sat 14:00 – Mon 20:00 GMT</span>
        <span className="mockup-ticker-bar__progress">6 of 10 fixtures complete</span>
      </div>
      <div className="mockup-ticker">
        {fixtures.map((f, i) => (
          <div className="mockup-ticker__cell" key={i}>
            <div className="mockup-ticker__team">
              <span className="mockup-ticker__crest">{f.home.code}</span>
              <span className={'mockup-ticker__team-name' + (f.home.winner ? ' mockup-ticker__name--winner' : f.away.winner ? ' mockup-ticker__name--loser' : '')}>
                {f.home.name}
              </span>
            </div>
            <div className="mockup-ticker__score">{f.score}</div>
            <div className="mockup-ticker__team mockup-ticker__team--away">
              <span className={'mockup-ticker__team-name' + (f.away.winner ? ' mockup-ticker__name--winner' : f.home.winner ? ' mockup-ticker__name--loser' : '')}>
                {f.away.name}
              </span>
              <span className="mockup-ticker__crest">{f.away.code}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: PlayerContributions redesign — sample data + variants       */
/* ------------------------------------------------------------------ */
/* Sample event feed used by all four PlayerContributions showcases.    */
/* Mirrors the production event kinds (goal, assist, dc_points, yellow, */
/* red) without depending on the real PlayerContributions component.    */
/* Newest first; manager + player pairings drawn from TROPHY_SEASONS    */
/* and recognisable FPL names.                                          */
const CONTRIB_SAMPLE_EVENTS = [
  { id: 'e1', kind: 'goal',    pts: 5,  manager: 'David Higman',     teamCode: 'CO', teamName: 'Crouch End Oashisu',   player: 'Salah',     club: 'LIV', minute: "67'",  rel: '12s ago'  },
  { id: 'e2', kind: 'assist',  pts: 3,  manager: 'Andy Ward',        teamCode: 'TO', teamName: 'Toronto Oizo',         player: 'Bruno G.',  club: 'NEW', minute: "61'",  rel: '4m ago'   },
  { id: 'e3', kind: 'dc',      pts: 2,  manager: 'David Higman',     teamCode: 'CO', teamName: 'Crouch End Oashisu',   player: 'Saliba',    club: 'ARS', minute: "58'",  rel: '8m ago'   },
  { id: 'e4', kind: 'goal',    pts: 4,  manager: 'Luke Butcher',     teamCode: 'SC', teamName: 'Seoul Club 7',         player: 'Haaland',   club: 'MCI', minute: "44'",  rel: '24m ago'  },
  { id: 'e5', kind: 'yellow',  pts: -1, manager: 'Mike Sutton',      teamCode: 'CC', teamName: 'Clapton Cornershop',   player: 'Rice',      club: 'ARS', minute: "39'",  rel: '31m ago'  },
  { id: 'e6', kind: 'assist',  pts: 3,  manager: 'Nick Mottershead', teamCode: 'HM', teamName: 'Hackney Meat Loaf',    player: 'Palmer',    club: 'CHE', minute: "29'",  rel: '46m ago'  },
  { id: 'e7', kind: 'goal',    pts: 6,  manager: 'Nick Greenwood',   teamCode: 'HY', teamName: 'Hanson of York AFC',   player: 'Van Dijk',  club: 'LIV', minute: "21'",  rel: '54m ago'  },
  { id: 'e8', kind: 'red',     pts: -3, manager: 'Jon Beale',        teamCode: 'MJ', teamName: 'Morpeth Jamiroquai',   player: 'Caicedo',   club: 'CHE', minute: "16'",  rel: '1h ago'   },
]

const CONTRIB_KINDS = [
  { id: 'goal',    label: 'Goals',    short: 'Goal',    glyph: '⚽', sym: '+' },
  { id: 'assist',  label: 'Assists',  short: 'Assist',  glyph: '🅰', sym: '+' },
  { id: 'dc',      label: 'DC',       short: 'DC',      glyph: '🛡', sym: '+' },
  { id: 'cards',   label: 'Cards',    short: 'Cards',   glyph: '🟥', sym: '−' },
]

function contribKindLabel(kind) {
  if (kind === 'goal')   return 'Goal'
  if (kind === 'assist') return 'Assist'
  if (kind === 'dc')     return 'DC'
  if (kind === 'yellow') return 'Yellow'
  if (kind === 'red')    return 'Red'
  return kind
}

function contribKindGlyph(kind) {
  if (kind === 'goal')   return '⚽'
  if (kind === 'assist') return '🅰'
  if (kind === 'dc')     return '🛡'
  if (kind === 'yellow') return '🟨'
  if (kind === 'red')    return '🟥'
  return '·'
}

/* Inline SVG icons used by the icon-toggle filter variant. Stroke 1.75
 * to match the existing mockup nav-icon weight. */
function ContribKindIcon({ kind, ...rest }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...rest,
  }
  if (kind === 'goal') {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18" />
        <path d="M3 12h18" />
        <path d="M5.6 6.5L12 9l6.4-2.5" />
        <path d="M5.6 17.5L12 15l6.4 2.5" />
      </svg>
    )
  }
  if (kind === 'assist') {
    return (
      <svg {...common} aria-hidden>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    )
  }
  if (kind === 'dc') {
    return (
      <svg {...common} aria-hidden>
        <path d="M12 3 4 6v6c0 4.5 3.4 7.7 8 9 4.6-1.3 8-4.5 8-9V6l-8-3Z" />
      </svg>
    )
  }
  if (kind === 'cards') {
    return (
      <svg {...common} aria-hidden>
        <rect x="6" y="4" width="9" height="14" rx="1.5" />
        <rect x="9" y="6" width="9" height="14" rx="1.5" fill="currentColor" stroke="currentColor" />
      </svg>
    )
  }
  return null
}

/* Small monogram crest used for both manager team avatars and player
 * club crests in the contrib mockups. Matches the existing
 * .mockup-ticker__crest visual but is reusable at multiple sizes via
 * a size modifier. */
function ContribMonogram({ code, size = 'md' }) {
  return (
    <span className={`mockup-contrib-mono mockup-contrib-mono--${size}`} aria-hidden>
      {code}
    </span>
  )
}

/* Points pill — green tint for positive, red tint for negative. Mono
 * font + tabular numerals so trailing digits line up across rows. */
function ContribPointsPill({ pts }) {
  const positive = pts >= 0
  return (
    <span className={'mockup-contrib-pts' + (positive ? ' mockup-contrib-pts--pos' : ' mockup-contrib-pts--neg')}>
      {positive ? `+${pts}` : `${pts}`}
    </span>
  )
}

/* Canonical 2x2 contrib card. Shared by the Variant A showcase, the
 * mobile collapsed pattern, and the streaming animation showcase so
 * every PlayerContributions surface mirrors the same locked layout.
 * Accepts an optional `modifier` class for surface-specific tweaks
 * (e.g. tighter mobile padding, brand-violet arrival pulse). */
function ContribCard({ e, modifier = '' }) {
  const kindLabel = contribKindLabel(e.kind).toUpperCase()
  const kindToneClass =
    e.kind === 'red'    ? ' mockup-contrib-card__kind--red'
    : e.kind === 'yellow' ? ' mockup-contrib-card__kind--yellow'
    : ''
  const className = 'mockup-contrib-card' + (modifier ? ' ' + modifier : '')
  return (
    <article className={className}>
      <div className="mockup-contrib-card__top">
        <span className="mockup-contrib-card__glyph" aria-hidden>{contribKindGlyph(e.kind)}</span>
        <span className="mockup-contrib-card__player">{e.player}</span>
        <ContribMonogram code={e.club} size="sm" />
      </div>
      <div className="mockup-contrib-card__minute">{e.minute}</div>
      <div className="mockup-contrib-card__sub">
        <ContribMonogram code={e.teamCode} size="sm" />
        <span className="mockup-contrib-card__team">{e.teamName}</span>
      </div>
      <div className="mockup-contrib-card__meta-bottom">
        <span className={'mockup-contrib-card__kind' + kindToneClass}>{kindLabel}</span>
        <ContribPointsPill pts={e.pts} />
      </div>
    </article>
  )
}

/* Variant A showcase — the canonical 2x2 card wrapped in card-list
 * chrome (outer border + rounded corners). Visual reference for the
 * locked density pick on PR #5b. */
function ContribCardsVariant({ events }) {
  return (
    <div className="mockup-contrib-card-list">
      {events.map((e) => <ContribCard key={e.id} e={e} />)}
    </div>
  )
}

/* Variant B — single-line list. Each event is one horizontal row:
 * 16px team avatar · manager · player · kind · pts · minute · rel.
 * Twitter-feed density. Truncates manager / player on narrow widths. */
function ContribListVariant({ events }) {
  return (
    <ul className="mockup-contrib-row-list">
      {events.map((e) => (
        <li className="mockup-contrib-row" key={e.id}>
          <ContribMonogram code={e.teamCode} size="xs" />
          <span className="mockup-contrib-row__manager">{e.manager}</span>
          <span className="mockup-contrib-row__sep" aria-hidden>·</span>
          <span className="mockup-contrib-row__glyph" aria-hidden>{contribKindGlyph(e.kind)}</span>
          <span className="mockup-contrib-row__player">{e.player}</span>
          <span className="mockup-contrib-row__club">{e.club}</span>
          <span className="mockup-contrib-row__kind">{contribKindLabel(e.kind)}</span>
          <ContribPointsPill pts={e.pts} />
          <span className="mockup-contrib-row__minute">{e.minute}</span>
          <span className="mockup-contrib-row__time">{e.rel}</span>
        </li>
      ))}
    </ul>
  )
}

/* Toolbar wrapper — every filter variant is rendered above 2-3 sample
 * rows so the user sees how the toolbar relates to the feed. */
function ContribFilterStub() {
  const stub = CONTRIB_SAMPLE_EVENTS.slice(0, 3)
  return <ContribListVariant events={stub} />
}

/* Filter Variant 1 — chip pills (the current pattern, restyled). */
function ContribFilterChipPills() {
  const [active, setActive] = useState('all')
  const pills = [
    { id: 'all',     label: 'All'     },
    { id: 'goal',    label: 'Goals'   },
    { id: 'assist',  label: 'Assists' },
    { id: 'dc',      label: 'DC'      },
    { id: 'cards',   label: 'Cards'   },
  ]
  return (
    <div className="mockup-contrib-filter-block">
      <div className="mockup-contrib-filters">
        <div className="mockup-contrib-filters__pills" role="group" aria-label="Event kind filter">
          {pills.map((p) => (
            <button
              key={p.id}
              type="button"
              className={'mockup-contrib-filters__pill' + (active === p.id ? ' mockup-contrib-filters__pill--active' : '')}
              onClick={() => setActive(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <select className="mockup-contrib-team-select" defaultValue="all" aria-label="Team filter">
          <option value="all">All teams</option>
          <option value="CO">Crouch End Oashisu</option>
          <option value="TO">Toronto Oizo</option>
          <option value="SC">Seoul Club 7</option>
        </select>
      </div>
      <ContribFilterStub />
    </div>
  )
}

/* Filter Variant 2 — multi-select dropdown popover (kept open in the
 * mockup so the affordance is visible without interaction). */
function ContribFilterDropdown() {
  const checks = [
    { id: 'goal',   label: 'Goals',   on: true  },
    { id: 'assist', label: 'Assists', on: true  },
    { id: 'dc',     label: 'DC',      on: false },
    { id: 'cards',  label: 'Cards',   on: true  },
  ]
  const teams = [
    { id: 'CO', label: 'Crouch End Oashisu', on: true  },
    { id: 'TO', label: 'Toronto Oizo',       on: false },
    { id: 'SC', label: 'Seoul Club 7',       on: false },
    { id: 'HM', label: 'Hackney Meat Loaf',  on: true  },
  ]
  const kindOnCount = checks.filter((c) => c.on).length
  const teamOnCount = teams.filter((t) => t.on).length
  const totalOn = kindOnCount + teamOnCount
  return (
    <div className="mockup-contrib-filter-block">
      <div className="mockup-contrib-filter-dropdown">
        <button type="button" className="mockup-contrib-filter-button" aria-expanded="true">
          <span className="mockup-contrib-filter-button__label">Filters</span>
          <span className="mockup-contrib-filter-button__sep" aria-hidden>·</span>
          <span className="mockup-contrib-filter-button__count">{totalOn} selected</span>
          <span className="mockup-contrib-filter-button__chev" aria-hidden>▾</span>
        </button>
        <div className="mockup-contrib-filter-popover" role="dialog" aria-label="Filters">
          <div className="mockup-contrib-filter-popover__section">
            <div className="mockup-contrib-filter-popover__h">Event kind</div>
            {checks.map((c) => (
              <label key={c.id} className="mockup-contrib-filter-popover__row">
                <span className={'mockup-contrib-checkbox' + (c.on ? ' mockup-contrib-checkbox--on' : '')} aria-hidden>
                  {c.on ? '✓' : ''}
                </span>
                <span>{c.label}</span>
              </label>
            ))}
          </div>
          <div className="mockup-contrib-filter-popover__section">
            <div className="mockup-contrib-filter-popover__h">Team</div>
            {teams.map((t) => (
              <label key={t.id} className="mockup-contrib-filter-popover__row">
                <span className={'mockup-contrib-checkbox' + (t.on ? ' mockup-contrib-checkbox--on' : '')} aria-hidden>
                  {t.on ? '✓' : ''}
                </span>
                <span>{t.label}</span>
              </label>
            ))}
          </div>
          <div className="mockup-contrib-filter-popover__foot">
            <span className="mockup-contrib-filter-popover__bulk">
              <button type="button" className="mockup-contrib-filter-popover__clear">Select all</button>
              <span className="mockup-contrib-filter-popover__bulk-sep" aria-hidden>·</span>
              <button type="button" className="mockup-contrib-filter-popover__clear">Clear all</button>
            </span>
            <button type="button" className="mockup-contrib-filter-popover__apply">Apply</button>
          </div>
        </div>
      </div>
      <ContribFilterStub />
    </div>
  )
}

/* Filter Variant 3 — icon-toggle row. Each event kind is a small icon
 * (muted gray when inactive, brand violet when active). Multi-select.
 * Team filter sits to the right as a dedicated chip with a count
 * badge that opens a separate popover (rendered open here for clarity). */
function ContribFilterIconToggle() {
  const [activeKinds, setActiveKinds] = useState(new Set(['goal', 'assist']))
  const [teamPopoverOpen, setTeamPopoverOpen] = useState(true)
  function toggleKind(id) {
    const next = new Set(activeKinds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setActiveKinds(next)
  }
  const teamCount = 2
  const teams = [
    { id: 'CO', label: 'Crouch End Oashisu', on: true  },
    { id: 'TO', label: 'Toronto Oizo',       on: false },
    { id: 'SC', label: 'Seoul Club 7',       on: true  },
    { id: 'HM', label: 'Hackney Meat Loaf',  on: false },
  ]
  return (
    <div className="mockup-contrib-filter-block">
      <div className="mockup-contrib-filters mockup-contrib-filters--icons">
        <div className="mockup-contrib-filter-icons" role="group" aria-label="Event kind filter">
          {CONTRIB_KINDS.map((k) => {
            const on = activeKinds.has(k.id)
            return (
              <button
                key={k.id}
                type="button"
                className={'mockup-contrib-filter-icons__btn' + (on ? ' mockup-contrib-filter-icons__btn--active' : '')}
                onClick={() => toggleKind(k.id)}
                aria-pressed={on}
                title={k.label}
              >
                <ContribKindIcon kind={k.id} width="16" height="16" />
              </button>
            )
          })}
          <span className="mockup-contrib-filter-icons__count">{activeKinds.size}</span>
        </div>
        <div className="mockup-contrib-filter-team">
          <button
            type="button"
            className={'mockup-contrib-filter-team__chip' + (teamPopoverOpen ? ' mockup-contrib-filter-team__chip--open' : '')}
            aria-expanded={teamPopoverOpen}
            onClick={() => setTeamPopoverOpen(!teamPopoverOpen)}
          >
            <span>Teams</span>
            <span className="mockup-contrib-filter-team__badge">{teamCount}</span>
            <span className="mockup-contrib-filter-team__chev" aria-hidden>▾</span>
          </button>
          {teamPopoverOpen && (
            <div className="mockup-contrib-filter-team__popover" role="dialog" aria-label="Team filter">
              {teams.map((t) => (
                <label key={t.id} className="mockup-contrib-filter-popover__row">
                  <span className={'mockup-contrib-checkbox' + (t.on ? ' mockup-contrib-checkbox--on' : '')} aria-hidden>
                    {t.on ? '✓' : ''}
                  </span>
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <ContribFilterStub />
    </div>
  )
}

/* Mobile collapsed: shows ONLY the latest event by default with a
 * chevron-down to expand. Expanded shows the latest 5 with a
 * chevron-up to collapse. Both states stacked in a 375px frame.
 * Each event is rendered as the canonical 2x2 card with the
 * `--mobile` modifier (slightly tighter padding for narrow widths). */
function ContribMobileCollapsed() {
  const collapsed = CONTRIB_SAMPLE_EVENTS.slice(0, 1)
  const expanded = CONTRIB_SAMPLE_EVENTS.slice(0, 5)
  return (
    <div className="mockup-contrib-mobile-row-row">
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Collapsed · latest only</div>
        <PortraitFrame>
          <div className="mockup-contrib-mobile">
            <div className="mockup-contrib-mobile__head">
              <span className="mockup-contrib-mobile__title">Contributions</span>
              <span className="mockup-contrib-mobile__sub">GW 28 · 1 of 8</span>
            </div>
            <div className="mockup-contrib-mobile-collapsed">
              {collapsed.map((e) => (
                <ContribCard key={e.id} e={e} modifier="mockup-contrib-card--mobile" />
              ))}
              <button type="button" className="mockup-contrib-mobile__toggle" aria-label="Expand to last 5 events">
                <span>Show last 5</span>
                <span className="mockup-contrib-mobile__chev" aria-hidden>▾</span>
              </button>
            </div>
          </div>
        </PortraitFrame>
      </div>
      <div className="mockup-portrait-col">
        <div className="mockup-portrait-col__h">Expanded · last 5</div>
        <PortraitFrame>
          <div className="mockup-contrib-mobile">
            <div className="mockup-contrib-mobile__head">
              <span className="mockup-contrib-mobile__title">Contributions</span>
              <span className="mockup-contrib-mobile__sub">GW 28 · 5 of 8</span>
              <button type="button" className="mockup-contrib-mobile__toggle mockup-contrib-mobile__toggle--inline" aria-label="Collapse to latest only">
                <span className="mockup-contrib-mobile__chev mockup-contrib-mobile__chev--up" aria-hidden>▴</span>
              </button>
            </div>
            <div className="mockup-contrib-mobile-expanded">
              {expanded.map((e) => (
                <ContribCard key={e.id} e={e} modifier="mockup-contrib-card--mobile" />
              ))}
            </div>
          </div>
        </PortraitFrame>
      </div>
    </div>
  )
}

/* Streaming animation showcase. Each event renders as the canonical
 * 2x2 card; the top card gets the `--just-arrived` modifier so the
 * brand-violet entrance pulse keeps replaying in the mockup. In
 * production the modifier is added on row arrival and removed when
 * the animation finishes. */
function ContribStreamingShowcase() {
  const events = CONTRIB_SAMPLE_EVENTS.slice(0, 4)
  return (
    <div className="mockup-contrib-streaming">
      <div className="mockup-contrib-card-list">
        {events.map((e, idx) => (
          <ContribCard
            key={e.id}
            e={e}
            modifier={idx === 0 ? 'mockup-contrib-card--just-arrived' : ''}
          />
        ))}
      </div>
      <div className="mockup-contrib-streaming__note">
        Top card = newly arrived; animation triggers on first paint
        and again when a new event lands.
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: sub-nav (secondary tabs)                                    */
/* ------------------------------------------------------------------ */
function SubNav() {
  const [active, setActive] = useState('waivers')
  const tabs = [
    { id: 'waivers', label: 'Waivers',   count: 12 },
    { id: 'trades',  label: 'Trades',    count: 3  },
    { id: 'draft',   label: 'Draft',     count: 56 },
  ]
  return (
    <div className="mockup-subnav">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={'mockup-subnav__tab' + (active === t.id ? ' is-active' : '')}
          onClick={() => setActive(t.id)}
        >
          {t.label}
          <span className="mockup-subnav__count">{t.count}</span>
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sub-nav variants showcase — FPL Live sub-tab row                     */
/* ------------------------------------------------------------------ */
/* Three candidates for the FPL Live sub-tab row: text-only (mockup
 * spec baseline), PL-crest-on-Lineups-only (preserves "real PL data"
 * semantic), and icons-everywhere (consistent prefix). Each variant
 * gets a compact mini-page preview underneath so the user can see the
 * sub-nav in context. Mockup-only. */

/* PL crest URL for the mockup. Mirrors production's `${BASE_URL}premier-league-logo.svg`
 * — root-relative is fine for the mockup preview at /?mockup=1. */
const MOCKUP_PL_LOGO_URL = '/premier-league-logo.svg'

function FplLiveSubNav({ variant }) {
  const [active, setActive] = useState('live')
  const tabs = [
    { id: 'live',        label: 'Live GW',     icon: 'football' },
    { id: 'lineups',     label: 'Lineups',     icon: 'pl-crest' },
    { id: 'projections', label: 'Projections', icon: 'bar-chart-3' },
  ]
  return (
    <div className="mockup-subnav" role="tablist" aria-label="FPL Live views">
      {tabs.map((t) => {
        const showIcon =
          variant === 'icons' || (variant === 'lineups-crest' && t.id === 'lineups')
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            className={'mockup-subnav__tab' + (active === t.id ? ' is-active' : '')}
            onClick={() => setActive(t.id)}
          >
            {showIcon && t.icon === 'pl-crest' && (
              <img
                className="mockup-subnav__pl-crest"
                src={MOCKUP_PL_LOGO_URL}
                alt=""
                aria-hidden
              />
            )}
            {showIcon && t.icon !== 'pl-crest' && (
              <LucideIcon
                name={t.icon}
                className="mockup-subnav__icon"
                width={16}
                height={16}
              />
            )}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

function FplLiveStubPreview() {
  const fixtures = [
    { home: 'Cornershop',  away: 'York',       score: '62 – 38', state: "Live · 47'" },
    { home: 'Loaf',        away: 'Jamiroquai', score: '21 – 28', state: "Live · 47'" },
    { home: 'Seoul 7',     away: 'Brampton',   score: '49 – 33', state: "Live · 47'" },
  ]
  return (
    <div className="mockup-subnav-variant__preview">
      <div className="mockup-subnav-variant__bar">
        <span className="mockup-subnav-variant__bar-gw">GW 28</span>
        <span className="mockup-subnav-variant__bar-sep">·</span>
        <span className="mockup-subnav-variant__bar-status">4 fixtures live · 47&apos;</span>
      </div>
      <div className="mockup-subnav-variant__cards">
        {fixtures.map((f, i) => (
          <div className="mockup-subnav-variant__card" key={i}>
            <span className="mockup-subnav-variant__card-team">{f.home}</span>
            <span className="mockup-subnav-variant__card-score">{f.score}</span>
            <span className="mockup-subnav-variant__card-team mockup-subnav-variant__card-team--away">
              {f.away}
            </span>
            <span className="mockup-subnav-variant__card-state">{f.state}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SubNavVariantsShowcase() {
  const variants = [
    { key: 'text',           label: 'A — Text-only (mockup spec)' },
    { key: 'lineups-crest',  label: 'B — PL crest on Lineups only' },
    { key: 'icons',          label: 'C — Icons everywhere (16px)' },
  ]
  return (
    <div className="mockup-subnav-variants">
      {variants.map((v) => (
        <div className="mockup-subnav-variant" key={v.key}>
          <div className="mockup-subnav-variant__label">{v.label}</div>
          <FplLiveSubNav variant={v.key} />
          <FplLiveStubPreview />
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Premier League club crests — official PL CDN                         */
/* ------------------------------------------------------------------ */
function plCrestUrl(teamCode) {
  if (!teamCode) return null
  return `https://resources.premierleague.com/premierleague/badges/70/t${teamCode}.png`
}

/** PL `team_code` mapping for the clubs used in the mockup. */
const PL_CODE = {
  LIV: 14, MCI: 43, ARS: 3,  CHE: 8,  BOU: 91, BRE: 94, NEW: 4,  MUN: 1,
  AVL: 7,  TOT: 6,  CRY: 31, BHA: 36, EVE: 11, NFO: 17, WHU: 21, FUL: 54,
  SUN: 56, BUR: 90, LEE: 2,  WOL: 39, IPS: 40,
}

function ClubCrest({ club, size = 28, className = 'mockup-player-row__crest' }) {
  const code = PL_CODE[club]
  return (
    <span className={className} style={{ width: size, height: size }}>
      {code ? (
        <img src={plCrestUrl(code)} alt={club} loading="lazy" decoding="async" />
      ) : (
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>{club}</span>
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Sample player data (used in wire / draft / waivers)                  */
/* ------------------------------------------------------------------ */
const SAMPLE_PLAYERS = [
  { name: 'Mohamed Salah',  team: 'LIV', pos: 'MID', pts: 187, owner: 'Brampton II Men' },
  { name: 'Erling Haaland', team: 'MCI', pos: 'FWD', pts: 224, owner: 'Clapton Cornershop' },
  { name: 'Bukayo Saka',    team: 'ARS', pos: 'MID', pts: 168, owner: 'Seoul Club 7' },
  { name: 'Cole Palmer',    team: 'CHE', pos: 'MID', pts: 154, owner: 'Crouch End Oashisu' },
  { name: 'Antoine Semenyo',team: 'BOU', pos: 'MID', pts: 142, owner: 'Toronto Oizo' },
  { name: 'Yoane Wissa',    team: 'BRE', pos: 'FWD', pts: 121, owner: null },
  { name: 'Anthony Gordon', team: 'NEW', pos: 'MID', pts: 98,  owner: null },
  { name: 'Bruno Fernandes',team: 'MUN', pos: 'MID', pts: 145, owner: 'Hanson of York AFC' },
]

/* ------------------------------------------------------------------ */
/* Section: player wire rows                                            */
/* ------------------------------------------------------------------ */
function PlayerRows({ rows = SAMPLE_PLAYERS }) {
  return (
    <div className="mockup-player-rows">
      {rows.map((p, i) => (
        <div className="mockup-player-row" key={p.name}>
          <span className="mockup-player-row__rank">{i + 1}</span>
          <ClubCrest club={p.team} />
          <span>
            <div className="mockup-player-row__name">{p.name}</div>
            <div className="mockup-player-row__meta">{p.team} · {p.pos}</div>
          </span>
          <span className={'mockup-player-row__owner' + (!p.owner ? ' mockup-player-row__owner--free' : '')}>
            {p.owner ?? 'Free agent'}
          </span>
          <span className="mockup-player-row__pts">{p.pts}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: draft board                                                 */
/* ------------------------------------------------------------------ */
const DRAFT_TEAMS = ['Cornershop', 'Oashisu', 'Oizo', 'York', 'Seoul 7', 'Loaf', 'Jamiroquai', 'Brampton']
const DRAFT_PICKS = [
  // round 1
  ['Haaland·MCI·FWD','Palmer·CHE·MID','Isak·LIV·FWD','B.Fernandes·MUN·MID','Bowen·WHU·MID','Watkins·AVL·FWD','Saka·ARS·MID','Salah·LIV·MID'],
  // round 2 — snake
  ['Ekitiké·LIV·FWD','Mbeumo·MUN·MID','Wirtz·LIV·MID','Cunha·MUN·MID','Wood·NFO·FWD','Eze·ARS·MID','Foden·MCI·MID','Marmoush·MCI·FWD'],
  // round 3
  ['Mateta·CRY·FWD','Solanke·TOT·FWD','Semenyo·BOU·MID','Gordon·NEW·MID','Wissa·BRE·FWD','Gibbs-White·NFO·MID','Gakpo·LIV·MID','Havertz·ARS·MID'],
  // round 4 — snake
  ['Neto·CHE·MID','Mitoma·BHA·MID','Rogers·AVL·MID','Bruno G.·NEW·MID','Delap·CHE·FWD','Gvardiol·MCI·DEF','Welbeck·BHA·FWD','Savinho·MCI·MID'],
]
function DraftBoard() {
  let pickCounter = 0
  return (
    <div className="mockup-draft">
      <div className="mockup-draft__head">
        <div className="mockup-draft__head-cell mockup-draft__head-cell--rnd">RND</div>
        {DRAFT_TEAMS.map((t) => (
          <div className="mockup-draft__head-cell" key={t}>{t}</div>
        ))}
      </div>
      {DRAFT_PICKS.map((round, i) => {
        // snake order: even rounds (0-indexed) go L→R, odd go R→L
        const reverse = i % 2 === 1
        const ordered = reverse ? round.slice().reverse() : round
        return (
          <div className="mockup-draft__row" key={i}>
            <div className="mockup-draft__row-num">{i + 1}</div>
            {ordered.map((pick, j) => {
              pickCounter += 1
              const [name, club, pos] = pick.split('·')
              return (
                <div className="mockup-draft__pick" key={j}>
                  <span className="mockup-draft__pick-num">{pickCounter}</span>
                  <ClubCrest club={club} className="mockup-draft__pick-crest" size={24} />
                  <span style={{ minWidth: 0 }}>
                    <div className="mockup-draft__pick-name">{name}</div>
                    <div className="mockup-draft__pick-meta">{pos}</div>
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: dropdowns — three patterns                                  */
/* ------------------------------------------------------------------ */
function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function CaretIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function DropdownsShowcase() {
  const [filterPos, setFilterPos] = useState('All')
  const [posOpen, setPosOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div className="mockup-dropdowns">
      {/* (1) Native styled select */}
      <div className="mockup-dropdowns__group">
        <h4 className="mockup-dropdowns__title">Native select</h4>
        <p className="mockup-dropdowns__caption">
          Single-choice menus. Renders the OS picker on mobile (best touch UX).
          Used for gameweek picker, team filter, sort by, season select.
        </p>
        <select className="mockup-select" defaultValue="28">
          <option value="1">GW 01 · Aug 16</option>
          <option value="14">GW 14 · Dec 13</option>
          <option value="28">GW 28 · Mar 14</option>
          <option value="38">GW 38 · May 24</option>
        </select>
        <select className="mockup-select" defaultValue="all">
          <option value="all">All teams</option>
          <option value="ce">Crouch End Oashisu</option>
          <option value="cc">Clapton Cornershop</option>
          <option value="to">Toronto Oizo</option>
        </select>
        <select className="mockup-select mockup-select--compact" defaultValue="pts-desc">
          <option value="pts-desc">Sort: Points ↓</option>
          <option value="pts-asc">Sort: Points ↑</option>
          <option value="name">Sort: Name A–Z</option>
        </select>
      </div>

      {/* (2) Filter pill */}
      <div className="mockup-dropdowns__group">
        <h4 className="mockup-dropdowns__title">Filter pill</h4>
        <p className="mockup-dropdowns__caption">
          Wire / draft filters where the active value belongs in the pill itself.
          Pill turns brand-tinted when filtering narrows the set.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="mockup-popover-host">
            <button
              className={'mockup-filter-pill' + (filterPos !== 'All' ? ' mockup-filter-pill--active' : '')}
              onClick={() => setPosOpen((o) => !o)}
              aria-expanded={posOpen}
            >
              <span className="mockup-filter-pill__label">Position</span>
              <span className="mockup-filter-pill__value">{filterPos}</span>
              <CaretIcon className="mockup-filter-pill__caret" />
            </button>
            {posOpen && (
              <div className="mockup-popover" role="menu">
                <div className="mockup-popover__group">
                  {['All', 'GKP', 'DEF', 'MID', 'FWD'].map((p) => (
                    <button
                      key={p}
                      className={'mockup-popover__item' + (p === filterPos ? ' is-checked' : '')}
                      onClick={() => { setFilterPos(p); setPosOpen(false) }}
                    >
                      {p}
                      {p === filterPos && <CheckIcon className="mockup-popover__item-check" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </span>
          <button className="mockup-filter-pill">
            <span className="mockup-filter-pill__label">Club</span>
            <span className="mockup-filter-pill__value">All</span>
            <CaretIcon className="mockup-filter-pill__caret" />
          </button>
          <button className="mockup-filter-pill mockup-filter-pill--active">
            <span className="mockup-filter-pill__label">Owned</span>
            <span className="mockup-filter-pill__value">Free agents</span>
            <CaretIcon className="mockup-filter-pill__caret" />
          </button>
        </div>
      </div>

      {/* (3) Popover menu */}
      <div className="mockup-dropdowns__group">
        <h4 className="mockup-dropdowns__title">Popover menu</h4>
        <p className="mockup-dropdowns__caption">
          Richer multi-section menus. Nav "More" overflow, row context menus, per-team
          action menus. Section headers, checked state, optional shortcuts.
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: 280 }}>
          <span className="mockup-popover-host">
            <button
              className="mockup-filter-pill"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
            >
              <span className="mockup-filter-pill__value">More actions</span>
              <CaretIcon className="mockup-filter-pill__caret" />
            </button>
            {moreOpen && (
              <div className="mockup-popover" role="menu" style={{ minWidth: 240 }}>
                <div className="mockup-popover__group">
                  <span className="mockup-popover__group-h">View</span>
                  <button className="mockup-popover__item is-checked">
                    Compact rows <CheckIcon className="mockup-popover__item-check" />
                  </button>
                  <button className="mockup-popover__item">Expanded rows</button>
                  <button className="mockup-popover__item">
                    Show projections
                    <span className="mockup-popover__item-shortcut">P</span>
                  </button>
                </div>
                <div className="mockup-popover__group">
                  <span className="mockup-popover__group-h">Export</span>
                  <button className="mockup-popover__item">Copy as CSV</button>
                  <button className="mockup-popover__item">Share screenshot</button>
                </div>
                <div className="mockup-popover__group">
                  <button className="mockup-popover__item" style={{ color: 'var(--data-negative)' }}>
                    Reset filters
                  </button>
                </div>
              </div>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Section: waivers feed                                                */
/* ------------------------------------------------------------------ */
const WAIVERS = [
  { gw: 'GW28', dir: 'in',  player: SAMPLE_PLAYERS[0], owner: 'Brampton II Men' },
  { gw: 'GW28', dir: 'out', player: { name: 'Anthony Elanga', team: 'NEW', pos: 'MID' }, owner: 'Brampton II Men' },
  { gw: 'GW28', dir: 'in',  player: SAMPLE_PLAYERS[5], owner: 'Hackney Meat Loaf' },
  { gw: 'GW28', dir: 'out', player: { name: 'Milos Kerkez', team: 'LIV', pos: 'DEF' }, owner: 'Hackney Meat Loaf' },
  { gw: 'GW27', dir: 'in',  player: SAMPLE_PLAYERS[6], owner: 'Toronto Oizo' },
  { gw: 'GW27', dir: 'out', player: { name: 'Dominic Calvert-Lewin', team: 'EVE', pos: 'FWD' }, owner: 'Toronto Oizo' },
]
function WaiversFeed() {
  return (
    <div className="mockup-waivers">
      {WAIVERS.map((w, i) => (
        <div className="mockup-waiver-row" key={i}>
          <span className="mockup-waiver-row__gw">{w.gw}</span>
          <span className="mockup-waiver-row__player">
            <span className={`mockup-waiver-row__arrow mockup-waiver-row__arrow--${w.dir}`}>
              {w.dir === 'in' ? '↑ IN' : '↓ OUT'}
            </span>
            <ClubCrest club={w.player.team} />
            <span>
              <div className="mockup-player-row__name">{w.player.name}</div>
              <div className="mockup-player-row__meta">{w.player.team} · {w.player.pos}</div>
            </span>
          </span>
          <span></span>
          <span className="mockup-waiver-row__owner">{w.owner}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Players · Player detail · Compare — new design surfaces              */
/* All classes namespaced with mockup-players-* / mockup-pdetail-*       */
/* / mockup-compare-* so they don't collide with the expanded fixture    */
/* tracker currently being restyled in this file.                        */
/* ------------------------------------------------------------------ */

/* Stable sample dataset. xi: PL matchday squad status. l5: last-5 GW pts.
 * status: null | 'inj' | 'doubt'. fixtures: next 5 GW with FDR tier 1-5
 * (1 = easiest green, 5 = hardest red). owner: fantasy team owner or null. */
const PLAYERS_DATA = [
  {
    id: 'salah', name: 'M.Salah', fullName: 'Mohamed Salah',
    club: 'LIV', clubFull: 'Liverpool', pos: 'MID', xi: 'xi',
    owner: { code: 'BM', name: 'Brampton II Men',     short: 'Brampton' },
    gwPts: 14, l5: [12, 8, 15, 6, 14], season: 187,
    g: 18, a: 11, cs: 9, dc: 4, mins: 2380, bonus: 23, status: null,
    gp: 27, sixtyPlus: 25, xg: 14.2, xa: 8.7,
    fixtures: [
      { gw: 29, opp: 'CHE', home: false, fdr: 4 },
      { gw: 30, opp: 'BRI', home: true,  fdr: 3 },
      { gw: 31, opp: 'WHU', home: false, fdr: 2 },
      { gw: 32, opp: 'NEW', home: true,  fdr: 4 },
      { gw: 33, opp: 'LEI', home: false, fdr: 2 },
    ],
  },
  {
    id: 'haaland', name: 'E.Haaland', fullName: 'Erling Haaland',
    club: 'MCI', clubFull: 'Man City', pos: 'FWD', xi: 'xi',
    owner: { code: 'CC', name: 'Clapton Cornershop', short: 'Clapton' },
    gwPts: 8, l5: [11, 2, 13, 9, 8], season: 224,
    g: 26, a: 4, cs: 0, dc: 1, mins: 2510, bonus: 31, status: null,
    gp: 26, sixtyPlus: 24, xg: 22.1, xa: 3.5,
    fixtures: [
      { gw: 29, opp: 'BHA', home: true,  fdr: 3 },
      { gw: 30, opp: 'AVL', home: false, fdr: 4 },
      { gw: 31, opp: 'CRY', home: true,  fdr: 2 },
      { gw: 32, opp: 'ARS', home: false, fdr: 5 },
      { gw: 33, opp: 'FUL', home: true,  fdr: 2 },
    ],
  },
  {
    id: 'palmer', name: 'C.Palmer', fullName: 'Cole Palmer',
    club: 'CHE', clubFull: 'Chelsea', pos: 'MID', xi: 'xi',
    owner: { code: 'CO', name: 'Crouch End Oashisu',  short: 'Crouch End' },
    gwPts: 12, l5: [10, 4, 15, 7, 12], season: 154,
    g: 14, a: 8, cs: 4, dc: 3, mins: 2310, bonus: 18, status: 'doubt',
    gp: 27, sixtyPlus: 23, xg: 10.4, xa: 6.8,
    fixtures: [
      { gw: 29, opp: 'LIV', home: true,  fdr: 5 },
      { gw: 30, opp: 'EVE', home: false, fdr: 3 },
      { gw: 31, opp: 'MUN', home: true,  fdr: 4 },
      { gw: 32, opp: 'WHU', home: false, fdr: 2 },
      { gw: 33, opp: 'IPS', home: true,  fdr: 1 },
    ],
  },
  {
    id: 'saka', name: 'B.Saka', fullName: 'Bukayo Saka',
    club: 'ARS', clubFull: 'Arsenal', pos: 'MID', xi: 'xi',
    owner: { code: 'SC', name: 'Seoul Club 7',       short: 'Seoul 7' },
    gwPts: 6, l5: [5, 9, 2, 11, 6], season: 168,
    g: 10, a: 14, cs: 11, dc: 5, mins: 2255, bonus: 19, status: null,
    gp: 26, sixtyPlus: 24, xg: 8.3, xa: 11.2,
    fixtures: [
      { gw: 29, opp: 'NFO', home: false, fdr: 3 },
      { gw: 30, opp: 'BOU', home: true,  fdr: 2 },
      { gw: 31, opp: 'TOT', home: false, fdr: 4 },
      { gw: 32, opp: 'MCI', home: true,  fdr: 5 },
      { gw: 33, opp: 'WOL', home: true,  fdr: 2 },
    ],
  },
  {
    id: 'mbeumo', name: 'B.Mbeumo', fullName: 'Bryan Mbeumo',
    club: 'BRE', clubFull: 'Brentford', pos: 'MID', xi: 'xi',
    owner: null,
    gwPts: 7, l5: [3, 9, 4, 11, 7], season: 121,
    g: 13, a: 5, cs: 3, dc: 9, mins: 2090, bonus: 14, status: null,
    gp: 27, sixtyPlus: 22, xg: 9.8, xa: 4.1,
    fixtures: [
      { gw: 29, opp: 'TOT', home: true,  fdr: 4 },
      { gw: 30, opp: 'LEI', home: false, fdr: 2 },
      { gw: 31, opp: 'BHA', home: true,  fdr: 3 },
      { gw: 32, opp: 'CRY', home: false, fdr: 2 },
      { gw: 33, opp: 'EVE', home: true,  fdr: 3 },
    ],
  },
  {
    id: 'semenyo', name: 'A.Semenyo', fullName: 'Antoine Semenyo',
    club: 'BOU', clubFull: 'Bournemouth', pos: 'MID', xi: 'bench',
    owner: { code: 'TO', name: 'Toronto Oizo',       short: 'Toronto' },
    gwPts: 2, l5: [4, 7, 1, 3, 2], season: 142,
    g: 9, a: 6, cs: 5, dc: 7, mins: 1980, bonus: 12, status: null,
    gp: 26, sixtyPlus: 20, xg: 7.1, xa: 4.9,
    fixtures: [
      { gw: 29, opp: 'ARS', home: false, fdr: 5 },
      { gw: 30, opp: 'NFO', home: true,  fdr: 3 },
      { gw: 31, opp: 'CHE', home: false, fdr: 4 },
      { gw: 32, opp: 'WHU', home: true,  fdr: 2 },
      { gw: 33, opp: 'MUN', home: false, fdr: 4 },
    ],
  },
  {
    id: 'wissa', name: 'Y.Wissa', fullName: 'Yoane Wissa',
    club: 'BRE', clubFull: 'Brentford', pos: 'FWD', xi: 'xi',
    owner: null,
    gwPts: 9, l5: [6, 11, 5, 9, 9], season: 121,
    g: 14, a: 3, cs: 0, dc: 4, mins: 2010, bonus: 10, status: null,
    gp: 26, sixtyPlus: 21, xg: 11.6, xa: 2.4,
    fixtures: [
      { gw: 29, opp: 'TOT', home: true,  fdr: 4 },
      { gw: 30, opp: 'LEI', home: false, fdr: 2 },
      { gw: 31, opp: 'BHA', home: true,  fdr: 3 },
      { gw: 32, opp: 'CRY', home: false, fdr: 2 },
      { gw: 33, opp: 'EVE', home: true,  fdr: 3 },
    ],
  },
  {
    id: 'gordon', name: 'A.Gordon', fullName: 'Anthony Gordon',
    club: 'NEW', clubFull: 'Newcastle', pos: 'MID', xi: 'absent',
    owner: null,
    gwPts: 0, l5: [0, 3, 5, 2, 0], season: 98,
    g: 6, a: 4, cs: 6, dc: 6, mins: 1500, bonus: 7, status: 'inj',
    gp: 18, sixtyPlus: 15, xg: 5.2, xa: 3.1,
    fixtures: [
      { gw: 29, opp: 'WHU', home: false, fdr: 2 },
      { gw: 30, opp: 'BUR', home: true,  fdr: 2 },
      { gw: 31, opp: 'AVL', home: false, fdr: 4 },
      { gw: 32, opp: 'LIV', home: true,  fdr: 5 },
      { gw: 33, opp: 'IPS', home: false, fdr: 1 },
    ],
  },
  {
    id: 'bfern', name: 'B.Fernandes', fullName: 'Bruno Fernandes',
    club: 'MUN', clubFull: 'Man United', pos: 'MID', xi: 'xi',
    owner: { code: 'HA', name: 'Hanson of York AFC', short: 'Hanson' },
    gwPts: 5, l5: [7, 8, 3, 6, 5], season: 145,
    g: 11, a: 10, cs: 4, dc: 2, mins: 2400, bonus: 15, status: null,
    gp: 27, sixtyPlus: 25, xg: 8.6, xa: 8.2,
    fixtures: [
      { gw: 29, opp: 'IPS', home: false, fdr: 1 },
      { gw: 30, opp: 'NEW', home: true,  fdr: 4 },
      { gw: 31, opp: 'CHE', home: false, fdr: 4 },
      { gw: 32, opp: 'WOL', home: true,  fdr: 2 },
      { gw: 33, opp: 'BOU', home: false, fdr: 3 },
    ],
  },
  {
    id: 'eze', name: 'E.Eze', fullName: 'Eberechi Eze',
    club: 'ARS', clubFull: 'Arsenal', pos: 'MID', xi: 'bench',
    owner: { code: 'HM', name: 'Heavenly Loaf',      short: 'Heavenly' },
    gwPts: 1, l5: [2, 4, 6, 0, 1], season: 89,
    g: 7, a: 5, cs: 8, dc: 4, mins: 1620, bonus: 6, status: null,
    gp: 21, sixtyPlus: 15, xg: 5.9, xa: 3.7,
    fixtures: [
      { gw: 29, opp: 'NFO', home: false, fdr: 3 },
      { gw: 30, opp: 'BOU', home: true,  fdr: 2 },
      { gw: 31, opp: 'TOT', home: false, fdr: 4 },
      { gw: 32, opp: 'MCI', home: true,  fdr: 5 },
      { gw: 33, opp: 'WOL', home: true,  fdr: 2 },
    ],
  },
  /* —— Extra free-agent MIDs added below so the "Free agents only"
   * default on the Players tab renders a visually full list. Appended
   * at indices ≥ 10 so existing index references in Compare / Player
   * Detail (e.g. PLAYERS_DATA[0], PLAYERS_DATA[2]) stay stable. */
  {
    id: 'bowen', name: 'J.Bowen', fullName: 'Jarrod Bowen',
    club: 'WHU', clubFull: 'West Ham', pos: 'MID', xi: 'xi',
    owner: null,
    gwPts: 8, l5: [5, 9, 6, 11, 8], season: 138,
    g: 12, a: 6, cs: 4, dc: 5, mins: 2280, bonus: 14, status: null,
    gp: 26, sixtyPlus: 23, xg: 9.5, xa: 5.0,
    fixtures: [
      { gw: 29, opp: 'NEW', home: true,  fdr: 4 },
      { gw: 30, opp: 'TOT', home: false, fdr: 4 },
      { gw: 31, opp: 'LIV', home: true,  fdr: 5 },
      { gw: 32, opp: 'BRE', home: false, fdr: 3 },
      { gw: 33, opp: 'FUL', home: true,  fdr: 3 },
    ],
  },
  {
    id: 'iwobi', name: 'A.Iwobi', fullName: 'Alex Iwobi',
    club: 'FUL', clubFull: 'Fulham', pos: 'MID', xi: 'xi',
    owner: null,
    gwPts: 4, l5: [3, 6, 2, 5, 4], season: 104,
    g: 6, a: 7, cs: 5, dc: 3, mins: 2100, bonus: 10, status: null,
    gp: 25, sixtyPlus: 20, xg: 4.8, xa: 6.2,
    fixtures: [
      { gw: 29, opp: 'AVL', home: false, fdr: 4 },
      { gw: 30, opp: 'BRI', home: true,  fdr: 3 },
      { gw: 31, opp: 'EVE', home: false, fdr: 3 },
      { gw: 32, opp: 'BHA', home: true,  fdr: 3 },
      { gw: 33, opp: 'WHU', home: false, fdr: 3 },
    ],
  },
  {
    id: 'doku', name: 'J.Doku', fullName: 'Jérémy Doku',
    club: 'MCI', clubFull: 'Man City', pos: 'MID', xi: 'bench',
    owner: null,
    gwPts: 3, l5: [4, 0, 7, 2, 3], season: 86,
    g: 4, a: 5, cs: 7, dc: 2, mins: 1450, bonus: 6, status: null,
    gp: 22, sixtyPlus: 14, xg: 5.1, xa: 4.6,
    fixtures: [
      { gw: 29, opp: 'BHA', home: true,  fdr: 3 },
      { gw: 30, opp: 'AVL', home: false, fdr: 4 },
      { gw: 31, opp: 'CRY', home: true,  fdr: 2 },
      { gw: 32, opp: 'ARS', home: false, fdr: 5 },
      { gw: 33, opp: 'FUL', home: true,  fdr: 2 },
    ],
  },
]

/* ---- Atoms reused across the three new surfaces ---- */

function MockupPlayersPos({ pos }) {
  return (
    <span className={`mockup-players-pos mockup-players-pos--${pos}`}>{pos}</span>
  )
}

function MockupPlayersXi({ xi }) {
  // xi-status pill that sits BEHIND the name. Matches expanded tracker tone
  // but is scoped to its own class set so we never touch those rules.
  return (
    <span className={`mockup-players-xi mockup-players-xi--${xi}`} aria-label={xi}>
      {xi === 'xi' ? 'XI' : xi === 'bench' ? 'BN' : 'OUT'}
    </span>
  )
}

function MockupPlayersStatus({ status }) {
  if (!status) return <span className="mockup-players-status mockup-players-status--ok" aria-hidden />
  const label = status === 'inj' ? 'Injured' : status === 'doubt' ? 'Doubtful' : 'Suspended'
  return (
    <span
      className={`mockup-players-status mockup-players-status--${status}`}
      title={label}
      aria-label={label}
    >
      <span className="mockup-players-status__dot" />
    </span>
  )
}

/** Tiny 5-pip "last 5 GW" form strip. Bar height encodes points 0..15. */
function MockupPlayersFormPips({ l5 }) {
  const max = 15
  return (
    <span className="mockup-players-formpips" aria-label={`Last 5: ${l5.join(', ')}`}>
      {l5.map((v, i) => {
        const h = Math.max(2, Math.round((Math.min(v, max) / max) * 16))
        const tone = v >= 8 ? 'hi' : v >= 4 ? 'mid' : 'lo'
        return (
          <span
            key={i}
            className={`mockup-players-formpips__pip mockup-players-formpips__pip--${tone}`}
            style={{ height: `${h}px` }}
          />
        )
      })}
    </span>
  )
}

function MockupPlayersOwner({ owner, compact = false }) {
  if (!owner) {
    return (
      <span className="mockup-players-owner mockup-players-owner--free">
        <span className="mockup-players-owner__free-dot" aria-hidden /> Free agent
      </span>
    )
  }
  return (
    <span className={'mockup-players-owner' + (compact ? ' mockup-players-owner--compact' : '')}>
      <span className="mockup-players-owner__crest">{owner.code}</span>
      <span className="mockup-players-owner__name">{compact ? owner.short : owner.name}</span>
    </span>
  )
}

/* FDR tier tile, 1 = best, 5 = hardest */
function FdrTile({ fdr, opp, home }) {
  return (
    <span className={`mockup-pdetail-fdr mockup-pdetail-fdr--${fdr}`}>
      <span className="mockup-pdetail-fdr__opp">{opp}</span>
      <span className="mockup-pdetail-fdr__ha">{home ? 'H' : 'A'}</span>
    </span>
  )
}

/** Inline SVG bar chart, used for last-5 GW points and for the
 *  position-avg comparison strip. `max` caps the y axis. */
function MiniBars({ values, max = 18, width = 200, height = 56, accent = 'brand' }) {
  const n = values.length
  if (n === 0) return null
  const pad = 2
  const gap = 4
  const barW = (width - gap * (n - 1)) / n
  return (
    <svg
      className="mockup-pdetail-bars"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-hidden
    >
      <line
        x1={0} x2={width}
        y1={height - 0.5} y2={height - 0.5}
        className="mockup-pdetail-bars__base"
      />
      {values.map((v, i) => {
        const clamped = Math.max(0, Math.min(v, max))
        const h = Math.max(2, Math.round((clamped / max) * (height - pad * 2 - 8)))
        const x = i * (barW + gap)
        const y = height - h - 10
        const cls = accent === 'pos-neg'
          ? (v >= 6 ? 'mockup-pdetail-bars__bar--pos' : 'mockup-pdetail-bars__bar--neg')
          : `mockup-pdetail-bars__bar--${accent}`
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={h}
              rx={2}
              className={`mockup-pdetail-bars__bar ${cls}`}
            />
            <text
              x={x + barW / 2}
              y={height - 1}
              className="mockup-pdetail-bars__label"
              textAnchor="middle"
            >{v}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* A · Players tab — desktop                                            */
/* ------------------------------------------------------------------ */
/* Mockup column model.
 *
 * production-side: the visible stat-column list comes from
 *   defaultWireStatIdsForPosition(positionFilter) in
 *   web/src/playersWireList.js plus the user-customizable
 *   StatsColumnsPill in web/src/playersFilterPills.jsx (max
 *   WIRE_MAX_STAT_COLUMNS = 8). Production also gates rows by the
 *   active position pill and an "owned" filter — the mockup hard-codes
 *   one MID + free-agents snapshot for visual fidelity only. */
const MOCKUP_PLAYERS_MID_STAT_COLS = [
  { id: 'gp',         label: 'GP',  title: 'Games played',    field: 'gp' },
  { id: 'sixtyPlus',  label: '60+', title: '60+ min apps',    field: 'sixtyPlus' },
  { id: 'goals',      label: 'G',   title: 'Goals',           field: 'g' },
  { id: 'assists',    label: 'A',   title: 'Assists',         field: 'a' },
  { id: 'cs',         label: 'CS',  title: 'Clean sheets',    field: 'cs' },
  { id: 'defConHits', label: 'DC',  title: 'DefCon GWs',      field: 'dc' },
  { id: 'xg',         label: 'xG',  title: 'Expected goals',  field: 'xg', decimal: true },
  { id: 'xa',         label: 'xA',  title: 'Expected assists', field: 'xa', decimal: true },
]

function MockupStatsPill({ selected, max, compact = false }) {
  return (
    <button
      type="button"
      className={'mockup-filter-pill mockup-stats-pill' + (compact ? ' mockup-filter-pill--sm' : '')}
      aria-haspopup="dialog"
      aria-label={`Table stat columns, ${selected} of ${max} selected`}
    >
      <span className="mockup-filter-pill__label" aria-hidden>📊 Stats</span>
      <span className="mockup-filter-pill__value">
        {selected} of {max}
      </span>
      <CaretIcon className="mockup-filter-pill__caret" />
    </button>
  )
}

function MockupIncludeDraftedToggle({ compact = false }) {
  return (
    <button
      type="button"
      className={'mockup-include-drafted' + (compact ? ' mockup-include-drafted--sm' : '')}
      role="switch"
      aria-checked="false"
    >
      <span className="mockup-include-drafted__track">
        <span className="mockup-include-drafted__thumb" />
      </span>
      <span className="mockup-include-drafted__label">Include drafted</span>
    </button>
  )
}

function PlayersTabDesktop() {
  const cols = MOCKUP_PLAYERS_MID_STAT_COLS
  // Default: Free agents only + Sort Total ↓ + Position MID. Mockup
  // hard-codes the rendered snapshot rather than wiring a real filter.
  const rows = PLAYERS_DATA
    .filter((p) => p.owner === null && p.pos === 'MID')
    .sort((a, b) => b.season - a.season)
  return (
    <div className="mockup-players">
      <div className="mockup-players__head">
        <div className="mockup-players__head-titles">
          <h3 className="mockup-players__h">Players</h3>
          <span className="mockup-players__h-meta">2025/26 · GW 28 · {rows.length} free-agent MIDs</span>
        </div>
        <div className="mockup-players__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Search players, clubs, owners…"
            defaultValue=""
            aria-label="Search players"
          />
          <kbd className="mockup-players__search-kbd">/</kbd>
        </div>
        <MockupIncludeDraftedToggle />
      </div>

      <div className="mockup-players__filters">
        <button type="button" className="mockup-filter-pill mockup-filter-pill--active">
          <span className="mockup-filter-pill__label">Position</span>
          <span className="mockup-filter-pill__value">MID</span>
          <CaretIcon className="mockup-filter-pill__caret" />
        </button>
        <button type="button" className="mockup-filter-pill">
          <span className="mockup-filter-pill__label">Club</span>
          <span className="mockup-filter-pill__value">All</span>
          <CaretIcon className="mockup-filter-pill__caret" />
        </button>
        <button type="button" className="mockup-filter-pill mockup-filter-pill--active">
          <span className="mockup-filter-pill__label">Owned</span>
          <span className="mockup-filter-pill__value">Free agents only</span>
          <CaretIcon className="mockup-filter-pill__caret" />
        </button>
        <span className="mockup-players__filters-spacer" />
        <button type="button" className="mockup-filter-pill">
          <span className="mockup-filter-pill__label">Sort</span>
          <span className="mockup-filter-pill__value">Total ↓</span>
          <CaretIcon className="mockup-filter-pill__caret" />
        </button>
        <MockupStatsPill selected={cols.length} max={8} />
      </div>

      <div className="mockup-players__table" role="table" aria-label="Players">
        <div
          className="mockup-players__th mockup-players__th--mid"
          role="row"
        >
          <span className="mockup-players__th-cell mockup-players__th-cell--rank">#</span>
          <span className="mockup-players__th-cell mockup-players__th-cell--player">Player</span>
          <span className="mockup-players__th-cell mockup-players__th-cell--owner">Owner</span>
          <span className="mockup-players__th-cell mockup-players__th-cell--num mockup-players__th-cell--pts">Pts</span>
          {cols.map((c) => (
            <span
              key={c.id}
              className="mockup-players__th-cell mockup-players__th-cell--num"
              title={c.title}
            >{c.label}</span>
          ))}
          <span className="mockup-players__th-cell mockup-players__th-cell--status">·</span>
        </div>
        {rows.map((p, i) => (
          <div key={p.id} className="mockup-players__row mockup-players__row--mid" role="row">
            <span className="mockup-players__cell mockup-players__cell--rank">{i + 1}</span>
            <span className="mockup-players__cell mockup-players__cell--player">
              <ClubCrest club={p.club} size={28} className="mockup-players__crest" />
              <span className="mockup-players__name">{p.fullName}</span>
              <MockupPlayersPos pos={p.pos} />
            </span>
            <span className="mockup-players__cell mockup-players__cell--owner">
              <MockupPlayersOwner owner={p.owner} compact />
            </span>
            <span className="mockup-players__cell mockup-players__cell--num mockup-players__cell--pts">{p.season}</span>
            {cols.map((c) => {
              const v = p[c.field]
              const isZero = v === 0
              const text = c.decimal ? (typeof v === 'number' ? v.toFixed(1) : v) : v
              return (
                <span
                  key={c.id}
                  className={'mockup-players__cell mockup-players__cell--num' + (isZero ? ' is-zero' : '')}
                >{text}</span>
              )
            })}
            <span className="mockup-players__cell mockup-players__cell--status">
              <MockupPlayersStatus status={p.status} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* B · Players tab — portrait                                           */
/* ------------------------------------------------------------------ */
function PlayersTabPortrait() {
  // production-side: portrait wire shows up to portraitMaxStatColumns
  // stats from defaultWireStatIdsForPosition (MID = G · A · CS · DC).
  // Mockup hard-codes a free-agents-only MID snapshot for visual fidelity.
  const rows = PLAYERS_DATA
    .filter((p) => p.owner === null && p.pos === 'MID')
    .sort((a, b) => b.season - a.season)
  return (
    <div className="mockup-portrait-page">
      <div className="mockup-players-ptbl__h">
        <span className="mockup-players-ptbl__h-title">Players</span>
        <span className="mockup-players-ptbl__h-meta">{rows.length}</span>
      </div>
      <div className="mockup-players-ptbl__filters">
        <button type="button" className="mockup-filter-pill mockup-filter-pill--sm mockup-filter-pill--active">
          <span className="mockup-filter-pill__label">Pos</span>
          <span className="mockup-filter-pill__value">MID</span>
          <CaretIcon className="mockup-filter-pill__caret" />
        </button>
        <button type="button" className="mockup-filter-pill mockup-filter-pill--sm">
          <span className="mockup-filter-pill__label">Club</span>
          <span className="mockup-filter-pill__value">All</span>
          <CaretIcon className="mockup-filter-pill__caret" />
        </button>
        <button type="button" className="mockup-filter-pill mockup-filter-pill--sm mockup-filter-pill--active">
          <span className="mockup-filter-pill__label">Owned</span>
          <span className="mockup-filter-pill__value">Free agents</span>
          <CaretIcon className="mockup-filter-pill__caret" />
        </button>
        <button type="button" className="mockup-filter-pill mockup-filter-pill--sm">
          <span className="mockup-filter-pill__label">Sort</span>
          <span className="mockup-filter-pill__value">Total ↓</span>
          <CaretIcon className="mockup-filter-pill__caret" />
        </button>
        <MockupStatsPill selected={4} max={4} compact />
      </div>
      <div className="mockup-players-ptbl__search-row">
        <div className="mockup-players-ptbl__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" placeholder="Search players, clubs, owners…" aria-label="Search players" />
        </div>
        <MockupIncludeDraftedToggle compact />
      </div>
      <div className="mockup-players-ptbl__card">
        <div className="mockup-players-ptbl" role="table" aria-label="Players">
          <div className="mockup-players-ptbl__th" role="row">
            <span className="mockup-players-ptbl__th-cell mockup-players-ptbl__th-cell--player" aria-hidden />
            <span className="mockup-players-ptbl__th-cell mockup-players-ptbl__th-cell--num mockup-players-ptbl__th-cell--sorted" aria-sort="descending">
              Pts<span className="mockup-players-ptbl__th-arrow" aria-hidden>↓</span>
            </span>
            <span className="mockup-players-ptbl__th-cell mockup-players-ptbl__th-cell--num">Pos</span>
            <span className="mockup-players-ptbl__th-cell mockup-players-ptbl__th-cell--num">G</span>
            <span className="mockup-players-ptbl__th-cell mockup-players-ptbl__th-cell--num">A</span>
            <span className="mockup-players-ptbl__th-cell mockup-players-ptbl__th-cell--num">DC</span>
            <span className="mockup-players-ptbl__th-cell mockup-players-ptbl__th-cell--num">Next</span>
          </div>
          {rows.map((p) => (
            <div key={p.id} className="mockup-players-ptbl__row" role="row">
              <span className="mockup-players-ptbl__cell mockup-players-ptbl__cell--player">
                <ClubCrest club={p.club} size={18} className="mockup-players-ptbl__crest" />
                <span className="mockup-players-ptbl__name">{p.fullName}</span>
                {p.status && <MockupPlayersStatus status={p.status} />}
              </span>
              <span className="mockup-players-ptbl__cell mockup-players-ptbl__cell--num mockup-players-ptbl__cell--pts">{p.season}</span>
              <span className="mockup-players-ptbl__cell mockup-players-ptbl__cell--num mockup-players-ptbl__cell--pos">
                {p.pos === 'GKP' ? 'GK' : p.pos.charAt(0)}
              </span>
              <span className={'mockup-players-ptbl__cell mockup-players-ptbl__cell--num' + (p.g === 0 ? ' is-zero' : '')}>{p.g}</span>
              <span className={'mockup-players-ptbl__cell mockup-players-ptbl__cell--num' + (p.a === 0 ? ' is-zero' : '')}>{p.a}</span>
              <span className={'mockup-players-ptbl__cell mockup-players-ptbl__cell--num' + (p.dc === 0 ? ' is-zero' : '')}>{p.dc}</span>
              <span className="mockup-players-ptbl__cell mockup-players-ptbl__cell--num is-zero" aria-label="No fixture data">—</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* C · Player detail — desktop                                          */
/* ------------------------------------------------------------------ */
function PdetailStatTile({ k, v, tone }) {
  return (
    <div className={'mockup-pdetail-tile' + (tone ? ` mockup-pdetail-tile--${tone}` : '')}>
      <div className="mockup-pdetail-tile__v">{v}</div>
      <div className="mockup-pdetail-tile__k">{k}</div>
    </div>
  )
}

function PdetailFixtures({ rows }) {
  return (
    <div className="mockup-pdetail-fixrows">
      {rows.map((f) => (
        <div className="mockup-pdetail-fixrow" key={f.gw}>
          <span className="mockup-pdetail-fixrow__gw">GW{f.gw}</span>
          <ClubCrest club={f.opp} size={22} className="mockup-pdetail-fixrow__crest" />
          <span className="mockup-pdetail-fixrow__opp">{f.opp}</span>
          <span className="mockup-pdetail-fixrow__ha">{f.home ? 'Home' : 'Away'}</span>
          <FdrTile fdr={f.fdr} opp={f.opp} home={f.home} />
        </div>
      ))}
    </div>
  )
}

function PlayerDetailDesktop({ player = PLAYERS_DATA[0] }) {
  const tabs = ['Overview', 'Performance']
  return (
    <div className="mockup-pdetail">
      {/* Hero */}
      <div className="mockup-pdetail__hero">
        <div className="mockup-pdetail__hero-crest-wrap">
          <ClubCrest club={player.club} size={120} className="mockup-pdetail__hero-crest" />
          <span className={`mockup-pdetail__hero-xi mockup-pdetail-xi--${player.xi}`}>
            {player.xi === 'xi' ? 'STARTING XI' : player.xi === 'bench' ? 'ON BENCH' : 'NOT IN SQUAD'}
          </span>
        </div>
        <div className="mockup-pdetail__hero-body">
          <div className="mockup-pdetail__hero-meta">
            <MockupPlayersPos pos={player.pos} />
            <span className="mockup-pdetail__hero-club">{player.clubFull}</span>
            <span className="mockup-pdetail__hero-dot" />
            <span className="mockup-pdetail__hero-shirt">Shirt #11</span>
          </div>
          <h3 className="mockup-pdetail__hero-name">{player.fullName}</h3>
          <div className="mockup-pdetail__hero-owner">
            {player.owner ? (
              <>
                On <span className="mockup-pdetail__hero-owner-crest">{player.owner.code}</span>
                <span className="mockup-pdetail__hero-owner-name">{player.owner.name}</span>
                <span className="mockup-pdetail__hero-owner-status">· Starting XI</span>
              </>
            ) : (
              <>
                <span className="mockup-pdetail__hero-owner-free-dot" /> Free agent
                <span className="mockup-pdetail__hero-owner-status">· available on waivers</span>
              </>
            )}
          </div>
        </div>
        <div className="mockup-pdetail__hero-actions">
          <button type="button" className="mockup-pdetail__btn">Compare</button>
        </div>
      </div>

      {/* Tab strip */}
      <div className="mockup-pdetail__tabs" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t}
            className={'mockup-pdetail__tab' + (i === 0 ? ' is-active' : '')}
            role="tab"
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview body */}
      <div className="mockup-pdetail__body">
        <div className="mockup-pdetail__col mockup-pdetail__col--main">
          <h4 className="mockup-pdetail__section-h">Season summary</h4>
          <div className="mockup-pdetail__tiles">
            <PdetailStatTile k="Points"   v={player.season} tone="brand" />
            <PdetailStatTile k="Minutes"  v={player.mins} />
            <PdetailStatTile k="Goals"    v={player.g} />
            <PdetailStatTile k="Assists"  v={player.a} />
            <PdetailStatTile k="Clean sheets" v={player.cs} />
            <PdetailStatTile k="DC total" v={player.dc} />
            <PdetailStatTile k="Bonus"    v={player.bonus} />
          </div>

          <h4 className="mockup-pdetail__section-h">Last 5 gameweeks</h4>
          <div className="mockup-pdetail__chart-wrap">
            <MiniBars values={player.l5} max={18} width={460} height={92} accent="pos-neg" />
            <div className="mockup-pdetail__chart-meta">
              <span>Avg <b>{(player.l5.reduce((a, b) => a + b, 0) / player.l5.length).toFixed(1)}</b></span>
              <span>Last <b>{player.l5[player.l5.length - 1]}</b></span>
              <span>Total <b>{player.l5.reduce((a, b) => a + b, 0)}</b></span>
            </div>
          </div>
        </div>

        <div className="mockup-pdetail__col mockup-pdetail__col--side">
          <h4 className="mockup-pdetail__section-h">Upcoming fixtures</h4>
          <PdetailFixtures rows={player.fixtures} />
          <div className="mockup-pdetail__fdr-legend">
            <span className="mockup-pdetail__fdr-legend-k">FDR</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`mockup-pdetail-fdr mockup-pdetail-fdr--${n} mockup-pdetail__fdr-legend-chip`}>{n}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* D · Player detail — portrait                                         */
/* ------------------------------------------------------------------ */
function PlayerDetailPortrait({ player = PLAYERS_DATA[0] }) {
  const tabs = ['Overview', 'Performance']
  return (
    <div className="mockup-portrait-page">
      <div className="mockup-pdetail-p__h">
        <button type="button" className="mockup-pdetail-p__back" aria-label="Back">‹</button>
        <span className="mockup-pdetail-p__h-title">Player</span>
      </div>

      <div className="mockup-pdetail-p__hero">
        <ClubCrest club={player.club} size={56} className="mockup-pdetail-p__hero-crest" />
        <div className="mockup-pdetail-p__hero-body">
          <div className="mockup-pdetail-p__hero-name">{player.fullName}</div>
          <div className="mockup-pdetail-p__hero-meta">
            <MockupPlayersPos pos={player.pos} />
            <span>{player.clubFull}</span>
          </div>
        </div>
        <span className={`mockup-pdetail-p__hero-xi mockup-pdetail-xi--${player.xi}`}>
          {player.xi === 'xi' ? 'XI' : player.xi === 'bench' ? 'BN' : 'OUT'}
        </span>
      </div>

      <div className="mockup-pdetail-p__owner">
        {player.owner ? (
          <>
            On <span className="mockup-pdetail-p__owner-crest">{player.owner.code}</span>
            <span className="mockup-pdetail-p__owner-name">{player.owner.name}</span>
          </>
        ) : (
          <>
            <span className="mockup-pdetail-p__owner-free-dot" /> Free agent
          </>
        )}
      </div>

      <div className="mockup-pdetail-p__actions">
        <button type="button" className="mockup-pdetail__btn mockup-pdetail-p__btn">Compare</button>
      </div>

      <div className="mockup-pdetail-p__tabs" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={t}
            className={'mockup-pdetail-p__tab' + (i === 0 ? ' is-active' : '')}
            role="tab"
          >{t}</button>
        ))}
      </div>

      <div className="mockup-pdetail-p__section-h">Season summary</div>
      <div className="mockup-pdetail-p__tiles">
        <PdetailStatTile k="Points"  v={player.season} tone="brand" />
        <PdetailStatTile k="Minutes" v={player.mins} />
        <PdetailStatTile k="Goals"   v={player.g} />
        <PdetailStatTile k="Assists" v={player.a} />
        <PdetailStatTile k="Clean sheets" v={player.cs} />
        <PdetailStatTile k="Bonus"   v={player.bonus} />
      </div>

      <div className="mockup-pdetail-p__section-h">Last 5 gameweeks</div>
      <div className="mockup-pdetail-p__chart-wrap">
        <MiniBars values={player.l5} max={18} width={335} height={80} accent="pos-neg" />
      </div>

      <div className="mockup-pdetail-p__section-h">Upcoming fixtures</div>
      <PdetailFixtures rows={player.fixtures} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* E · Compare — desktop                                                */
/* ------------------------------------------------------------------ */
/* Position-aware stat catalog for the Compare surface. Mirrors the
 * production rules:
 *   GK  → Points · Goals · Assists · Clean sheets · Saves · Bonus · Form
 *   DEF → Points · Goals · Assists · Clean sheets · DC · Bonus · Form
 *   MID → Points · Goals · Assists · DC · Bonus · Form (no CS by default)
 *   FWD → Points · Goals · Assists · Bonus · Form           (no CS/DC)
 * When the two compared players have different positions, the union of
 * their stat rows is shown and the cell renders "—" for the player whose
 * position normally hides that stat. Form is rendered separately below
 * the stats block, so it's not listed in the catalog. */
const COMPARE_STATS_CATALOG = {
  season:  { k: 'Points',       field: 'season' },
  g:       { k: 'Goals',        field: 'g' },
  a:       { k: 'Assists',      field: 'a' },
  cs:      { k: 'Clean sheets', field: 'cs' },
  saves:   { k: 'Saves',        field: 'saves' },
  dc:      { k: 'DC',           field: 'dc' },
  bonus:   { k: 'Bonus',        field: 'bonus' },
}
const COMPARE_STATS_BY_POS = {
  GK:  ['season', 'g', 'a', 'cs', 'saves', 'bonus'],
  DEF: ['season', 'g', 'a', 'cs', 'dc', 'bonus'],
  MID: ['season', 'g', 'a', 'dc', 'bonus'],
  FWD: ['season', 'g', 'a', 'bonus'],
}
function compareStatsForPlayers(players) {
  const seen = new Set()
  const ordered = []
  for (const p of players) {
    const ids = COMPARE_STATS_BY_POS[p.pos] ?? COMPARE_STATS_BY_POS.MID
    for (const id of ids) {
      if (seen.has(id)) continue
      seen.add(id)
      ordered.push(COMPARE_STATS_CATALOG[id])
    }
  }
  return ordered
}
/** Returns the stat value, or null when the row is part of another
 * player's position default and this player's position normally hides it. */
function compareStatValue(p, statId) {
  const ids = COMPARE_STATS_BY_POS[p.pos] ?? COMPARE_STATS_BY_POS.MID
  if (!ids.includes(statId)) return null
  return p[COMPARE_STATS_CATALOG[statId].field]
}

function CompareDesktop() {
  const a = PLAYERS_DATA[0]
  const b = PLAYERS_DATA[2]
  const players = [a, b]
  const stats = compareStatsForPlayers(players)
  return (
    <div className="mockup-compare">
      <div className="mockup-compare__head">
        <h3 className="mockup-compare__h">Compare</h3>
        <div className="mockup-compare__chips">
          <span className="mockup-compare__chip">
            <ClubCrest club={a.club} size={16} className="mockup-compare__chip-crest" />
            {a.fullName}
            <button type="button" className="mockup-compare__chip-x" aria-label="Remove">×</button>
          </span>
          <span className="mockup-compare__chip">
            <ClubCrest club={b.club} size={16} className="mockup-compare__chip-crest" />
            {b.fullName}
            <button type="button" className="mockup-compare__chip-x" aria-label="Remove">×</button>
          </span>
          <span className="mockup-compare__cap">2 of 2</span>
        </div>
      </div>

      <div className="mockup-compare__cols">
        {players.map((p) => (
          <div className="mockup-compare__col" key={p.id}>
            <div className="mockup-compare__player">
              <ClubCrest club={p.club} size={48} className="mockup-compare__player-crest" />
              <div className="mockup-compare__player-body">
                <div className="mockup-compare__player-name">{p.fullName}</div>
                <div className="mockup-compare__player-meta">
                  <MockupPlayersPos pos={p.pos} />
                  <span>{p.clubFull}</span>
                </div>
                <div className="mockup-compare__player-owner">
                  {p.owner ? (
                    <>
                      <span className="mockup-compare__player-owner-crest">{p.owner.code}</span>
                      <span>{p.owner.short}</span>
                    </>
                  ) : (
                    <span className="mockup-compare__player-owner-free">Free agent</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mockup-compare__stats">
              {stats.map((s) => {
                const myV = compareStatValue(p, Object.keys(COMPARE_STATS_CATALOG).find((k) => COMPARE_STATS_CATALOG[k] === s))
                const otherP = p === a ? b : a
                const otherV = compareStatValue(otherP, Object.keys(COMPARE_STATS_CATALOG).find((k) => COMPARE_STATS_CATALOG[k] === s))
                const isWinner = myV != null && otherV != null && myV > otherV
                return (
                  <div
                    key={s.k}
                    className={'mockup-compare__stat' + (isWinner ? ' mockup-compare__stat--winner' : '')}
                  >
                    <span className="mockup-compare__stat-k">{s.k}</span>
                    <span className="mockup-compare__stat-v">
                      {isWinner && <span className="mockup-compare__stat-up">▲</span>}
                      {myV == null ? '—' : myV}
                    </span>
                  </div>
                )
              })}
              <div className="mockup-compare__stat mockup-compare__stat--form">
                <span className="mockup-compare__stat-k">Form (last 5)</span>
                <span className="mockup-compare__stat-bars">
                  <MiniBars values={p.l5} max={18} width={200} height={48} accent="brand" />
                </span>
              </div>
              <div className="mockup-compare__stat mockup-compare__stat--fdr">
                <span className="mockup-compare__stat-k">Next 3 fixtures</span>
                <span className="mockup-compare__stat-fdr">
                  {p.fixtures.slice(0, 3).map((f) => (
                    <FdrTile key={f.gw} fdr={f.fdr} opp={f.opp} home={f.home} />
                  ))}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* E2 · Compare — add-player picker (inline, shown when <2 selected)    */
/* ------------------------------------------------------------------ */
/* Static visual representation of the inline picker that replaces the
 * "+ Add player" placeholder. Two tabs: Search (default) and From a
 * squad. Renders both states so the design is obvious without any
 * autocomplete logic. */
function ComparePlayerPicker() {
  const a = PLAYERS_DATA[0]
  const searchResults = [PLAYERS_DATA[2], PLAYERS_DATA[3], PLAYERS_DATA[4]] // Palmer, Saka, Mbeumo
  const squads = [
    { code: 'BM', name: 'Brampton II Men',     short: 'Brampton',   roster: 16 },
    { code: 'CC', name: 'Clapton Cornershop',  short: 'Clapton',    roster: 16 },
    { code: 'CO', name: 'Crouch End Oashisu',  short: 'Crouch End', roster: 16, expanded: true },
    { code: 'HA', name: 'Hanson of York AFC',  short: 'Hanson',     roster: 16 },
    { code: 'HM', name: 'Heavenly Loaf',       short: 'Heavenly',   roster: 16 },
    { code: 'SC', name: 'Seoul Club 7',        short: 'Seoul 7',    roster: 16 },
    { code: 'TO', name: 'Toronto Oizo',        short: 'Toronto',    roster: 16 },
    { code: 'WY', name: 'Wyld Stallyns',       short: 'Wyld',       roster: 16 },
  ]
  const expandedRoster = [PLAYERS_DATA[2], PLAYERS_DATA[9]] // Palmer, Eze (both rostered to CO in sample)
  return (
    <div className="mockup-compare">
      <div className="mockup-compare__head">
        <h3 className="mockup-compare__h">Compare</h3>
        <div className="mockup-compare__chips">
          <span className="mockup-compare__chip">
            <ClubCrest club={a.club} size={16} className="mockup-compare__chip-crest" />
            {a.fullName}
            <button type="button" className="mockup-compare__chip-x" aria-label="Remove">×</button>
          </span>
          <span className="mockup-compare__cap">1 of 2</span>
        </div>
      </div>

      <div className="mockup-compare-picker">
        <div className="mockup-compare-picker__tabs" role="tablist">
          <button type="button" className="mockup-compare-picker__tab is-active" role="tab" aria-selected="true">
            Search
          </button>
          <button type="button" className="mockup-compare-picker__tab" role="tab" aria-selected="false">
            From a squad
          </button>
        </div>

        <div className="mockup-compare-picker__panels">
          <div className="mockup-compare-picker__panel">
            <div className="mockup-compare-picker__panel-h">Search tab · type-ahead</div>
            <div className="mockup-compare-picker__search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input type="search" placeholder="Search any player…" defaultValue="pal" aria-label="Search players" />
            </div>
            <div className="mockup-compare-picker__results">
              {searchResults.map((p) => (
                <button type="button" key={p.id} className="mockup-compare-picker__result">
                  <ClubCrest club={p.club} size={18} className="mockup-compare-picker__result-crest" />
                  <span className="mockup-compare-picker__result-name">{p.fullName}</span>
                  <span className="mockup-compare-picker__result-meta">
                    <span className="mockup-compare-picker__result-club">{p.club}</span>
                    <MockupPlayersPos pos={p.pos} />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mockup-compare-picker__panel">
            <div className="mockup-compare-picker__panel-h">From a squad tab · 8 fantasy teams</div>
            <div className="mockup-compare-picker__squads">
              {squads.map((sq) => (
                <Fragment key={sq.code}>
                  <button
                    type="button"
                    className={'mockup-compare-picker__squad' + (sq.expanded ? ' is-expanded' : '')}
                  >
                    <span className="mockup-compare-picker__squad-crest">{sq.code}</span>
                    <span className="mockup-compare-picker__squad-name">{sq.name}</span>
                    <span className="mockup-compare-picker__squad-count">{sq.roster}</span>
                    <span className="mockup-compare-picker__squad-chev" aria-hidden>
                      {sq.expanded ? '▾' : '▸'}
                    </span>
                  </button>
                  {sq.expanded && (
                    <div className="mockup-compare-picker__squad-roster">
                      {expandedRoster.map((p) => (
                        <button type="button" key={p.id} className="mockup-compare-picker__roster-row">
                          <ClubCrest club={p.club} size={20} className="mockup-compare-picker__roster-crest" />
                          <span className="mockup-compare-picker__roster-name">{p.fullName}</span>
                          <MockupPlayersPos pos={p.pos} />
                          <span className="mockup-compare-picker__roster-club">{p.club}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* F · Compare — portrait (stacked rows with inline Δ column)           */
/* ------------------------------------------------------------------ */
function ComparePortraitStacked() {
  const a = PLAYERS_DATA[0]
  const b = PLAYERS_DATA[2]
  const stats = compareStatsForPlayers([a, b])
  return (
    <div className="mockup-portrait-page">
      <div className="mockup-compare-p__h">
        <span className="mockup-compare-p__h-title">Compare</span>
        <span className="mockup-compare-p__h-meta">2 of 2</span>
      </div>
      <div className="mockup-compare-p__chips">
        <span className="mockup-compare-p__chip mockup-compare-p__chip--a">
          <ClubCrest club={a.club} size={14} className="mockup-compare-p__chip-crest" />
          <span className="mockup-compare-p__chip-name">{a.fullName}</span>
          <button type="button" className="mockup-compare-p__chip-x" aria-label="Remove">×</button>
        </span>
        <span className="mockup-compare-p__chip mockup-compare-p__chip--b">
          <ClubCrest club={b.club} size={14} className="mockup-compare-p__chip-crest" />
          <span className="mockup-compare-p__chip-name">{b.fullName}</span>
          <button type="button" className="mockup-compare-p__chip-x" aria-label="Remove">×</button>
        </span>
      </div>

      <div className="mockup-compare-p__hero-row">
        <span className="mockup-compare-p__hero-letter mockup-compare-p__hero-letter--a">A</span>
        <ClubCrest club={a.club} size={32} className="mockup-compare-p__hero-crest" />
        <div className="mockup-compare-p__hero-body">
          <div className="mockup-compare-p__hero-name">{a.fullName}</div>
          <div className="mockup-compare-p__hero-meta">
            <MockupPlayersPos pos={a.pos} />
            <span>{a.clubFull}</span>
          </div>
        </div>
      </div>
      <div className="mockup-compare-p__hero-row">
        <span className="mockup-compare-p__hero-letter mockup-compare-p__hero-letter--b">B</span>
        <ClubCrest club={b.club} size={32} className="mockup-compare-p__hero-crest" />
        <div className="mockup-compare-p__hero-body">
          <div className="mockup-compare-p__hero-name">{b.fullName}</div>
          <div className="mockup-compare-p__hero-meta">
            <MockupPlayersPos pos={b.pos} />
            <span>{b.clubFull}</span>
          </div>
        </div>
      </div>

      <div className="mockup-compare-p__th">
        <span>Stat</span>
        <span className="mockup-compare-p__th-a">A</span>
        <span className="mockup-compare-p__th-b">B</span>
        <span className="mockup-compare-p__th-d">Δ</span>
      </div>
      <div className="mockup-compare-p__rows">
        {stats.map((s) => {
          const statId = Object.keys(COMPARE_STATS_CATALOG).find((k) => COMPARE_STATS_CATALOG[k] === s)
          const va = compareStatValue(a, statId)
          const vb = compareStatValue(b, statId)
          const bothNum = va != null && vb != null
          const d = bothNum ? va - vb : 0
          const sign = d > 0 ? '+' : d < 0 ? '−' : '±'
          return (
            <div className="mockup-compare-p__row" key={s.k}>
              <span className="mockup-compare-p__k">{s.k}</span>
              <span className={'mockup-compare-p__v mockup-compare-p__v--a' + (bothNum && va > vb ? ' is-winner' : '')}>{va == null ? '—' : va}</span>
              <span className={'mockup-compare-p__v mockup-compare-p__v--b' + (bothNum && vb > va ? ' is-winner' : '')}>{vb == null ? '—' : vb}</span>
              <span className={
                'mockup-compare-p__d'
                + (bothNum && d > 0 ? ' mockup-compare-p__d--pos'
                  : bothNum && d < 0 ? ' mockup-compare-p__d--neg' : '')
              }>{bothNum ? `${sign}${Math.abs(d)}` : '—'}</span>
            </div>
          )
        })}
      </div>

      <div className="mockup-compare-p__section-h">Form (last 5 GW)</div>
      <div className="mockup-compare-p__form-row">
        <span className="mockup-compare-p__form-letter mockup-compare-p__hero-letter--a">A</span>
        <MiniBars values={a.l5} max={18} width={280} height={48} accent="brand" />
      </div>
      <div className="mockup-compare-p__form-row">
        <span className="mockup-compare-p__form-letter mockup-compare-p__hero-letter--b">B</span>
        <MiniBars values={b.l5} max={18} width={280} height={48} accent="brand" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* G · Compare — "From a squad" expansion variants (portrait)           */
/* ------------------------------------------------------------------ */
/* Four side-by-side options for how the per-manager squad list
 * materialises once the user picks "From a squad → David Higman".
 * Static demos only — no interactivity. Each variant lives inside a
 * 375px portrait frame so the user can compare visual feel directly. */
const SAMPLE_SQUAD = {
  manager: 'David Higman',
  team: 'Crouch End Oashisu',
  code: 'CO',
  players: [
    { name: 'Cole Palmer',     club: 'CHE', pos: 'MID' },
    { name: 'Alisson',         club: 'LIV', pos: 'GK'  },
    { name: 'Virgil van Dijk', club: 'LIV', pos: 'DEF' },
    { name: 'Bruno G.',        club: 'NEW', pos: 'MID' },
    { name: 'Erling Haaland',  club: 'MCI', pos: 'FWD' },
    { name: 'Saliba',          club: 'ARS', pos: 'DEF' },
  ],
}

/* Compact roster row reused inside every variant. */
function CompareFsRosterRow({ p }) {
  return (
    <button type="button" className="mockup-compare-fs__player">
      <ClubCrest club={p.club} size={18} className="mockup-compare-fs__player-crest" />
      <span className="mockup-compare-fs__player-name">{p.name}</span>
      <span className="mockup-compare-fs__player-club">{p.club}</span>
      <MockupPlayersPos pos={p.pos} />
    </button>
  )
}

/* Shared portrait-page chrome: sticky compare header + a placeholder
 * "+ Add player" picker shell. Variants render their own expansion
 * inside / on top of this base. */
function CompareFsBase({ children, dim = false }) {
  return (
    <div className={'mockup-portrait-page mockup-compare-fs__page' + (dim ? ' is-dimmed' : '')}>
      <div className="mockup-portrait-page__sticky mockup-compare-fs__sticky">
        <div className="mockup-compare-fs__h">
          <span className="mockup-compare-fs__h-title">Compare</span>
          <span className="mockup-compare-fs__h-meta">1 of 2</span>
        </div>
        <div className="mockup-compare-fs__chips">
          <span className="mockup-compare-fs__chip">
            <ClubCrest club="LIV" size={14} className="mockup-compare-fs__chip-crest" />
            <span className="mockup-compare-fs__chip-name">M.Salah</span>
            <button type="button" className="mockup-compare-fs__chip-x" aria-label="Remove">×</button>
          </span>
        </div>
      </div>
      {children}
    </div>
  )
}

/* Picker shell — tabs + the "From a squad" content (manager pill is
 * selected; how the squad list appears is variant-specific). The
 * `squadList` prop slot is where the variant injects its expansion. */
function CompareFsPickerShell({ squadList, popoverOpen = false }) {
  return (
    <div className="mockup-compare-fs__picker">
      <div className="mockup-compare-fs__tabs" role="tablist">
        <button type="button" className="mockup-compare-fs__tab" role="tab">Search</button>
        <button type="button" className="mockup-compare-fs__tab is-active" role="tab" aria-selected="true">
          From a squad
        </button>
      </div>
      <div className="mockup-compare-fs__panel">
        <div className="mockup-compare-fs__panel-h">Choose a manager</div>
        <span className="mockup-popover-host">
          <button
            type="button"
            className={'mockup-filter-pill mockup-filter-pill--sm mockup-filter-pill--active mockup-compare-fs__mgr-pill' + (popoverOpen ? ' is-open' : '')}
            aria-haspopup="listbox"
            aria-expanded={popoverOpen}
          >
            <span className="mockup-filter-pill__label">From</span>
            <span className="mockup-filter-pill__value">{SAMPLE_SQUAD.manager}</span>
            <CaretIcon className="mockup-filter-pill__caret" />
          </button>
          {squadList}
        </span>
      </div>
    </div>
  )
}

/* Variant 1 — Inline.
 * Squad list expands directly below the manager pill, in the same
 * scroll container. Sticky header stays pinned. */
function CompareFromSquadInline() {
  return (
    <CompareFsBase>
      <CompareFsPickerShell />
      <div className="mockup-compare-fs__inline">
        <div className="mockup-compare-fs__inline-h">
          <span className="mockup-compare-fs__inline-h-crest" aria-hidden>{SAMPLE_SQUAD.code}</span>
          <span className="mockup-compare-fs__inline-h-title">{SAMPLE_SQUAD.team}</span>
          <span className="mockup-compare-fs__inline-h-count">{SAMPLE_SQUAD.players.length}</span>
        </div>
        <div className="mockup-compare-fs__list">
          {SAMPLE_SQUAD.players.map((p) => (
            <CompareFsRosterRow key={p.name} p={p} />
          ))}
        </div>
      </div>
    </CompareFsBase>
  )
}

/* Variant 2 — Drawer (slides from right).
 * The base picker stays mounted; a 320px-ish panel overlays from the
 * right edge of the portrait frame with a darkened backdrop. */
function CompareFromSquadDrawer() {
  return (
    <div className="mockup-compare-fs__stage">
      <CompareFsBase dim>
        <CompareFsPickerShell />
      </CompareFsBase>
      <div className="mockup-compare-fs__backdrop" aria-hidden />
      <aside className="mockup-compare-fs__drawer" aria-label="Squad: David Higman">
        <div className="mockup-compare-fs__drawer-h">
          <span className="mockup-compare-fs__drawer-h-title">Squad: {SAMPLE_SQUAD.manager}</span>
          <button type="button" className="mockup-compare-fs__drawer-x" aria-label="Close">×</button>
        </div>
        <div className="mockup-compare-fs__drawer-meta">
          <span className="mockup-compare-fs__drawer-crest" aria-hidden>{SAMPLE_SQUAD.code}</span>
          <span className="mockup-compare-fs__drawer-team">{SAMPLE_SQUAD.team}</span>
          <span className="mockup-compare-fs__drawer-count">{SAMPLE_SQUAD.players.length}</span>
        </div>
        <div className="mockup-compare-fs__list">
          {SAMPLE_SQUAD.players.map((p) => (
            <CompareFsRosterRow key={p.name} p={p} />
          ))}
        </div>
      </aside>
    </div>
  )
}

/* Variant 3 — Modal / full-screen takeover.
 * A full-page panel replaces the picker view entirely. Header has a
 * back-arrow + title + close ×. */
function CompareFromSquadModal() {
  return (
    <div className="mockup-compare-fs__stage">
      <CompareFsBase dim>
        <CompareFsPickerShell />
      </CompareFsBase>
      <div className="mockup-compare-fs__modal" role="dialog" aria-label="Squad: David Higman">
        <div className="mockup-compare-fs__modal-h">
          <button type="button" className="mockup-compare-fs__modal-back" aria-label="Back">‹</button>
          <span className="mockup-compare-fs__modal-title">Squad: {SAMPLE_SQUAD.manager}</span>
          <button type="button" className="mockup-compare-fs__modal-x" aria-label="Close">×</button>
        </div>
        <div className="mockup-compare-fs__modal-meta">
          <span className="mockup-compare-fs__drawer-crest" aria-hidden>{SAMPLE_SQUAD.code}</span>
          <span className="mockup-compare-fs__drawer-team">{SAMPLE_SQUAD.team}</span>
          <span className="mockup-compare-fs__drawer-count">{SAMPLE_SQUAD.players.length}</span>
        </div>
        <div className="mockup-compare-fs__list">
          {SAMPLE_SQUAD.players.map((p) => (
            <CompareFsRosterRow key={p.name} p={p} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* Variant 4 — Popover.
 * A dropdown anchored to the "From a squad" manager pill, styled like
 * an existing filter-pill menu. Max-height ~340px with internal scroll.
 *
 * Visual concern: the portrait frame uses `overflow: hidden`, so a true
 * absolute-positioned popover would be clipped. For the static demo we
 * keep the popover in normal flow (immediately below the pill) but
 * style it as a floating menu (border, shadow, max-height + internal
 * scroll). Same visual signal, fits inside the 375px frame. */
function CompareFromSquadPopover() {
  return (
    <CompareFsBase>
      <CompareFsPickerShell
        popoverOpen
        squadList={
          <div className="mockup-compare-fs__popover" role="listbox">
            <div className="mockup-compare-fs__popover-h">Squad · {SAMPLE_SQUAD.team}</div>
            <div className="mockup-compare-fs__popover-scroll">
              {SAMPLE_SQUAD.players.map((p) => (
                <CompareFsRosterRow key={p.name} p={p} />
              ))}
            </div>
          </div>
        }
      />
    </CompareFsBase>
  )
}

/* ------------------------------------------------------------------ */
/* Section: Settings (Theme + Default landing tab)                      */
/* ------------------------------------------------------------------ */
/* Minimal card, no sectioned subheaders. Two rows: Theme (segmented   */
/* control) and Default landing tab (select pill). Lives inside the    */
/* existing More menu — no new chrome added to the header. The actual  */
/* production component just hosts the existing ThemeToggle.jsx logic. */
function SettingsShowcase() {
  return (
    <div className="mockup-settings">
      <p className="mockup-settings__access">
        Lives inside the existing More menu (no new chrome added to header).
      </p>

      <div className="mockup-settings__card">
        <div className="mockup-settings__row">
          <span className="mockup-settings__label">Theme</span>
          <div
            className="mockup-settings-segmented"
            role="group"
            aria-label="Theme"
          >
            <button
              type="button"
              className="mockup-settings-segmented__btn mockup-settings-segmented__btn--active"
              aria-pressed="true"
            >
              Light
            </button>
            <button
              type="button"
              className="mockup-settings-segmented__btn"
              aria-pressed="false"
            >
              Dark
            </button>
            <button
              type="button"
              className="mockup-settings-segmented__btn"
              aria-pressed="false"
            >
              System
            </button>
          </div>
        </div>

        <div className="mockup-settings__row">
          <span className="mockup-settings__label">Default landing tab</span>
          <button
            type="button"
            className="mockup-settings-select"
            aria-haspopup="listbox"
            aria-expanded="false"
          >
            <span className="mockup-settings-select__value">FPL Live</span>
            <CaretIcon className="mockup-settings-select__caret" />
          </button>
        </div>
      </div>

      <p className="mockup-settings__options-note">
        <span className="mockup-settings__options-key">Options ·</span>
        <span className="mockup-settings__option mockup-settings__option--active">FPL Live</span>
        <span className="mockup-settings__option-sep" aria-hidden>·</span>
        <span className="mockup-settings__option">Team Selection</span>
        <span className="mockup-settings__option-sep" aria-hidden>·</span>
        <span className="mockup-settings__option">Players</span>
        <span className="mockup-settings__option-sep" aria-hidden>·</span>
        <span className="mockup-settings__option">Hall of Champions</span>
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ============ WIRE PORTRAIT LAYOUT VARIANTS ============ */
/* Four mockup variants for the portrait wire/waiver list. Shared toolbar
 * (full-width search + Position pill + Club pill) and shared row internals
 * across A–C; D recomposes the row as a vertical card. Only the wrapper
 * chrome (outer tile padding/border/radius/shadow + inner-card wrapper)
 * varies. All class names are prefixed `mock-wire-portrait-` so they
 * can't collide with production. Mockup-only — no production wire styles
 * touched. */

const WIRE_PORTRAIT_PLAYERS = [
  {
    name: 'Saka',
    club: 'ARS',
    clubColor: '#ef4444',
    pos: 'MID',
    gp: 24,
    g: 7,
    a: 9,
    dc: 28,
    pts: 14.2,
    next3: [
      { opp: 'WHU', home: true },
      { opp: 'LIV', home: false },
      { opp: 'BRI', home: true },
    ],
    indicator: { kind: 'owned', team: 'TO', teamColor: '#b1364c' },
  },
  {
    name: 'Haaland',
    club: 'MCI',
    clubColor: '#06b6d4',
    pos: 'FWD',
    gp: 23,
    g: 18,
    a: 4,
    dc: 18,
    pts: 16.8,
    next3: [
      { opp: 'NEW', home: true },
      { opp: 'CHE', home: false },
      { opp: 'LIV', home: true },
    ],
    indicator: { kind: 'owned', team: 'CC', teamColor: '#4f46e5' },
  },
  {
    name: 'Palmer',
    club: 'CHE',
    clubColor: '#2563eb',
    pos: 'MID',
    gp: 24,
    g: 11,
    a: 7,
    dc: 16,
    pts: 12.4,
    next3: [
      { opp: 'MCI', home: true },
      { opp: 'BRE', home: false },
      { opp: 'AVL', home: true },
    ],
    indicator: { kind: 'fa' },
  },
  {
    name: 'Van Dijk',
    club: 'LIV',
    clubColor: '#a50034',
    pos: 'DEF',
    gp: 24,
    g: 2,
    a: 1,
    dc: 31,
    pts: 7.9,
    next3: [
      { opp: 'BRI', home: false },
      { opp: 'MCI', home: true },
      { opp: 'FUL', home: false },
    ],
    indicator: null,
  },
  {
    name: 'B. Fernandes',
    club: 'MUN',
    clubColor: '#ea580c',
    pos: 'MID',
    gp: 22,
    g: 6,
    a: 8,
    dc: 19,
    pts: 9.1,
    next3: [
      { opp: 'NFO', home: true },
      { opp: 'BOU', home: false },
      { opp: 'WHU', home: true },
    ],
    indicator: { kind: 'injured' },
  },
  {
    name: 'Alisson',
    club: 'LIV',
    clubColor: '#a50034',
    pos: 'GK',
    gp: 23,
    g: 0,
    a: 1,
    dc: 8,
    pts: 6.4,
    next3: [
      { opp: 'BRI', home: false },
      { opp: 'MCI', home: true },
      { opp: 'FUL', home: false },
    ],
    indicator: null,
  },
]

const WIRE_PORTRAIT_PL_CLUBS = [
  { name: 'Arsenal', abbr: 'ARS' },
  { name: 'Aston Villa', abbr: 'AVL' },
  { name: 'Bournemouth', abbr: 'BOU' },
  { name: 'Brentford', abbr: 'BRE' },
  { name: 'Brighton', abbr: 'BRI' },
]

const WIRE_PORTRAIT_FANTASY_TEAMS = [
  'Team Tomato',
  'Castle Caprice',
  'Hawk Mountain',
  'Slytherin XI',
  'North London Forever',
]

function WirePortraitCrest({ club, color }) {
  return (
    <span className="mock-wire-portrait-crest" style={{ background: color }} aria-hidden>
      {club}
    </span>
  )
}

function WirePortraitOwner({ initials, color }) {
  return (
    <span
      className="mock-wire-portrait-owner"
      style={{ background: color }}
      aria-label={`Owned by ${initials}`}
    >
      {initials}
    </span>
  )
}

function WirePortraitFixture({ opp, home }) {
  return (
    <span
      className={'mock-wire-portrait-fixture ' + (home ? 'is-home' : 'is-away')}
    >
      <span className="mock-wire-portrait-fixture__opp">{opp}</span>
      <span className="mock-wire-portrait-fixture__ha">{home ? 'H' : 'A'}</span>
    </span>
  )
}

function WirePortraitIndicators({ indicator }) {
  if (!indicator) return null
  if (indicator.kind === 'fa') {
    return (
      <span className="mock-wire-portrait-row__indicators">
        <span
          className="mock-wire-portrait-dot mock-wire-portrait-dot--fa"
          aria-label="Free agent"
        />
      </span>
    )
  }
  if (indicator.kind === 'injured') {
    return (
      <span className="mock-wire-portrait-row__indicators">
        <span
          className="mock-wire-portrait-dot mock-wire-portrait-dot--injured"
          aria-label="Injured"
        />
      </span>
    )
  }
  if (indicator.kind === 'owned') {
    return (
      <span className="mock-wire-portrait-row__indicators">
        <WirePortraitOwner initials={indicator.team} color={indicator.teamColor} />
      </span>
    )
  }
  return null
}

function WirePortraitSearchIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function WirePortraitToolbar({ posOpen = false }) {
  return (
    <div className="mock-wire-portrait-toolbar">
      <label className="mock-wire-portrait-search">
        <WirePortraitSearchIcon className="mock-wire-portrait-search__icon" />
        <input
          type="search"
          readOnly
          className="mock-wire-portrait-search__input"
          placeholder="Search players, clubs, owners…"
          defaultValue=""
        />
      </label>
      <div className="mock-wire-portrait-filters" role="group" aria-label="Wire filters">
        <span className="mock-wire-portrait-pill-host">
          <button
            type="button"
            className={'mock-wire-portrait-pill' + (posOpen ? ' is-open' : '')}
            aria-expanded={posOpen}
          >
            <span className="mock-wire-portrait-pill__label">Position</span>
            <span className="mock-wire-portrait-pill__sep" aria-hidden>·</span>
            <span className="mock-wire-portrait-pill__value">All</span>
            <CaretIcon className="mock-wire-portrait-pill__caret" />
          </button>
          {posOpen && (
            <div className="mock-wire-portrait-pop" role="menu">
              {[
                { label: 'All', checked: true },
                { label: 'GK', checked: true },
                { label: 'DEF', checked: true },
                { label: 'MID', checked: true },
                { label: 'FWD', checked: true },
              ].map((opt) => (
                <label key={opt.label} className="mock-wire-portrait-pop__item">
                  <input
                    type="checkbox"
                    defaultChecked={opt.checked}
                    readOnly
                    className="mock-wire-portrait-pop__check"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </span>
        <button type="button" className="mock-wire-portrait-pill" aria-expanded={false}>
          <span className="mock-wire-portrait-pill__label">Club</span>
          <span className="mock-wire-portrait-pill__sep" aria-hidden>·</span>
          <span className="mock-wire-portrait-pill__value">All</span>
          <CaretIcon className="mock-wire-portrait-pill__caret" />
        </button>
      </div>
    </div>
  )
}

function WirePortraitHeader() {
  return (
    <div className="mock-wire-portrait-header">
      <span className="mock-wire-portrait-header__title">Wire</span>
      <span className="mock-wire-portrait-header__meta">347 free agents · GW 28</span>
    </div>
  )
}

function WirePortraitRow({ player }) {
  return (
    <div className="mock-wire-portrait-row">
      <div className="mock-wire-portrait-row__player">
        <WirePortraitCrest club={player.club} color={player.clubColor} />
        <span className="mock-wire-portrait-row__name">{player.name}</span>
        <WirePortraitIndicators indicator={player.indicator} />
      </div>
      <div className="mock-wire-portrait-row__pos">{player.pos}</div>
      <div className="mock-wire-portrait-row__stat">{player.gp}</div>
      <div className="mock-wire-portrait-row__stat">{player.g}</div>
      <div className="mock-wire-portrait-row__stat">{player.a}</div>
      <div className="mock-wire-portrait-row__stat">{player.dc}</div>
      <div className="mock-wire-portrait-row__next3">
        {player.next3.map((f, i) => (
          <WirePortraitFixture key={i} opp={f.opp} home={f.home} />
        ))}
      </div>
    </div>
  )
}

function WirePortraitCard({ player }) {
  return (
    <div className="mock-wire-portrait-card">
      <div className="mock-wire-portrait-card__top">
        <div className="mock-wire-portrait-card__id">
          <WirePortraitCrest club={player.club} color={player.clubColor} />
          <span className="mock-wire-portrait-card__name">{player.name}</span>
          <WirePortraitIndicators indicator={player.indicator} />
        </div>
        <div className="mock-wire-portrait-card__pts">{player.pts.toFixed(1)}</div>
      </div>
      <div className="mock-wire-portrait-card__sub">
        <span>{player.pos}</span>
        <span aria-hidden>·</span>
        <span>{player.club}</span>
        {player.indicator?.kind === 'owned' && (
          <>
            <span aria-hidden>·</span>
            <span>Owned by {player.indicator.team}</span>
          </>
        )}
        {player.indicator?.kind === 'fa' && (
          <>
            <span aria-hidden>·</span>
            <span className="mock-wire-portrait-card__fa-chip">Free agent</span>
          </>
        )}
        {player.indicator?.kind === 'injured' && (
          <>
            <span aria-hidden>·</span>
            <span className="mock-wire-portrait-card__injury-chip">Injured</span>
          </>
        )}
      </div>
      <div className="mock-wire-portrait-card__stats">
        <span><em>GP</em> {player.gp}</span>
        <span><em>G</em> {player.g}</span>
        <span><em>A</em> {player.a}</span>
        <span><em>DC</em> {player.dc}</span>
      </div>
      <div className="mock-wire-portrait-card__fixtures">
        {player.next3.map((f, i) => (
          <WirePortraitFixture key={i} opp={f.opp} home={f.home} />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ============ WIRE PORTRAIT TILE LAYOUT VARIANTS (E/F/G/H) ============ */
/* Tile-based row layouts targeting ~5-6 tiles per phone viewport.
 * Follows on from A/B/C/D — those explored wrapper chrome, these
 * explore taller per-row tile compositions. New class names all
 * use `mock-wire-portrait-tile-` so they don't collide with A–D
 * styles. Toolbar is the latest production shape: search + Wire|Owned
 * toggle on Row 1, Position/Club/Stats pills on Row 2. */

const WIRE_TILE_PLAYERS = [
  {
    name: 'Bruno Fernandes',
    club: 'MUN',
    clubColor: '#da291c',
    pos: 'M',
    pts: 184,
    gp: 22, g: 6, a: 8, dc: 19,
    next3: [
      { opp: 'NFO', home: true },
      { opp: 'BOU', home: false },
      { opp: 'WHU', home: true },
    ],
    availability: 'fit',
    ownership: { kind: 'owned', team: 'TO', teamColor: '#b1364c' },
  },
  {
    name: 'Mohamed Salah',
    club: 'LIV',
    clubColor: '#c8102e',
    pos: 'F',
    pts: 177,
    gp: 36, g: 28, a: 14, dc: 6,
    next3: [
      { opp: 'ARS', home: true },
      { opp: 'BHA', home: false },
      { opp: 'NEW', home: true },
    ],
    availability: 'fit',
    ownership: { kind: 'fa' },
  },
  {
    name: 'Erling Haaland',
    club: 'MCI',
    clubColor: '#6cabdd',
    pos: 'F',
    pts: 169,
    gp: 32, g: 22, a: 5, dc: 4,
    next3: [
      { opp: 'TOT', home: false },
      { opp: 'CHE', home: true },
      { opp: 'AVL', home: false },
    ],
    availability: 'doubtful',
    ownership: { kind: 'owned', team: 'CC', teamColor: '#4f46e5' },
  },
  {
    name: 'Bukayo Saka',
    club: 'ARS',
    clubColor: '#ef0107',
    pos: 'F',
    pts: 167,
    gp: 30, g: 12, a: 11, dc: 5,
    next3: [
      { opp: 'LIV', home: true },
      { opp: 'NEW', home: false },
      { opp: 'BHA', home: true },
    ],
    availability: 'fit',
    ownership: { kind: 'fa' },
  },
  {
    name: 'Trent Alexander-Arnold',
    club: 'LIV',
    clubColor: '#c8102e',
    pos: 'D',
    pts: 149,
    gp: 25, g: 3, a: 8, dc: 12,
    next3: [
      { opp: 'ARS', home: true },
      { opp: 'BHA', home: false },
      { opp: 'NEW', home: true },
    ],
    availability: 'injured',
    ownership: { kind: 'owned', team: 'HM', teamColor: '#7a1f3f' },
  },
  {
    name: 'Cole Palmer',
    club: 'CHE',
    clubColor: '#034694',
    pos: 'M',
    pts: 148,
    gp: 28, g: 14, a: 7, dc: 9,
    next3: [
      { opp: 'MCI', home: true },
      { opp: 'BRE', home: false },
      { opp: 'AVL', home: true },
    ],
    availability: 'fit',
    ownership: { kind: 'fa' },
  },
]

function WirePortraitTileCrest({ club, color }) {
  return (
    <span
      className="mock-wire-portrait-tile-crest"
      style={{ background: color }}
      aria-hidden
    >
      {club}
    </span>
  )
}

function WirePortraitTileOwner({ initials, color }) {
  return (
    <span
      className="mock-wire-portrait-tile-owner"
      style={{ background: color }}
      aria-label={`Owned by ${initials}`}
    >
      {initials}
    </span>
  )
}

function WirePortraitTileFaTag() {
  return <span className="mock-wire-portrait-tile-fatag">Free agent</span>
}

function WirePortraitTileAvailDot({ kind }) {
  return (
    <span
      className={`mock-wire-portrait-tile-avail mock-wire-portrait-tile-avail--${kind}`}
      aria-label={kind === 'fit' ? 'Fit' : kind === 'injured' ? 'Injured' : 'Doubtful'}
    />
  )
}

function WirePortraitTileFixture({ opp, home }) {
  return (
    <span
      className={
        'mock-wire-portrait-tile-fixture ' + (home ? 'is-home' : 'is-away')
      }
    >
      <span className="mock-wire-portrait-tile-fixture__opp">{opp}</span>
      <span className="mock-wire-portrait-tile-fixture__ha">{home ? 'H' : 'A'}</span>
    </span>
  )
}

function WirePortraitTileOwnership({ ownership }) {
  if (!ownership) return null
  if (ownership.kind === 'fa') return <WirePortraitTileFaTag />
  if (ownership.kind === 'owned') {
    return (
      <WirePortraitTileOwner
        initials={ownership.team}
        color={ownership.teamColor}
      />
    )
  }
  return null
}

/* Shared toolbar for E/F/G/H — matches the just-shipped production polish:
 * Row 1: full-width pill search + Wire|Owned segmented toggle to the right.
 * Row 2: Position / Club / Stats dropdown pills (all closed). */
function WirePortraitTileToolbar({ statsCount = 5 }) {
  return (
    <div className="mock-wire-portrait-tile-toolbar">
      <div className="mock-wire-portrait-tile-toolbar__row1">
        <label className="mock-wire-portrait-tile-search">
          <WirePortraitSearchIcon className="mock-wire-portrait-tile-search__icon" />
          <input
            type="search"
            readOnly
            className="mock-wire-portrait-tile-search__input"
            placeholder="Search players, clubs, owners…"
            defaultValue=""
          />
        </label>
        <div className="mock-wire-portrait-tile-segment" role="group" aria-label="Player ownership filter">
          <button
            type="button"
            className="mock-wire-portrait-tile-segment__btn mock-wire-portrait-tile-segment__btn--active"
            aria-pressed
          >
            Wire
          </button>
          <button
            type="button"
            className="mock-wire-portrait-tile-segment__btn"
            aria-pressed={false}
          >
            Owned
          </button>
        </div>
      </div>
      <div className="mock-wire-portrait-tile-toolbar__row2" role="group" aria-label="Wire filters">
        <button type="button" className="mock-wire-portrait-tile-pill" aria-expanded={false}>
          <span className="mock-wire-portrait-tile-pill__label">Position</span>
          <span className="mock-wire-portrait-tile-pill__sep" aria-hidden>·</span>
          <span className="mock-wire-portrait-tile-pill__value">All</span>
          <CaretIcon className="mock-wire-portrait-tile-pill__caret" />
        </button>
        <button type="button" className="mock-wire-portrait-tile-pill" aria-expanded={false}>
          <span className="mock-wire-portrait-tile-pill__label">Club</span>
          <span className="mock-wire-portrait-tile-pill__sep" aria-hidden>·</span>
          <span className="mock-wire-portrait-tile-pill__value">All</span>
          <CaretIcon className="mock-wire-portrait-tile-pill__caret" />
        </button>
        <button type="button" className="mock-wire-portrait-tile-pill" aria-expanded={false}>
          <span className="mock-wire-portrait-tile-pill__label">Stats</span>
          <span className="mock-wire-portrait-tile-pill__sep" aria-hidden>·</span>
          <span className="mock-wire-portrait-tile-pill__value">{statsCount}</span>
          <CaretIcon className="mock-wire-portrait-tile-pill__caret" />
        </button>
      </div>
    </div>
  )
}

function WirePortraitTileHeader() {
  return (
    <div className="mock-wire-portrait-tile-header">
      <span className="mock-wire-portrait-tile-header__title">Wire</span>
      <span className="mock-wire-portrait-tile-header__meta">347 free agents · GW 28</span>
    </div>
  )
}

/* ---------------- Variant E — identity-left, stats-right ---------------- */
function WirePortraitTileE({ player }) {
  return (
    <div className="mock-wire-portrait-tile-e">
      <div className="mock-wire-portrait-tile-e__id">
        <WirePortraitTileCrest club={player.club} color={player.clubColor} />
        <div className="mock-wire-portrait-tile-e__id-text">
          <div className="mock-wire-portrait-tile-e__name">{player.name}</div>
          <div className="mock-wire-portrait-tile-e__meta">
            <span className="mock-wire-portrait-tile-e__pos">{player.pos}</span>
            <span className="mock-wire-portrait-tile-e__sep" aria-hidden>·</span>
            <WirePortraitTileAvailDot kind={player.availability} />
            <span className="mock-wire-portrait-tile-e__sep" aria-hidden>·</span>
            <WirePortraitTileOwnership ownership={player.ownership} />
          </div>
        </div>
      </div>
      <div className="mock-wire-portrait-tile-e__data">
        <div className="mock-wire-portrait-tile-e__pts">
          <span className="mock-wire-portrait-tile-e__pts-num">{player.pts}</span>
          <span className="mock-wire-portrait-tile-e__pts-lbl">PTS</span>
        </div>
        <div className="mock-wire-portrait-tile-e__stats">
          <span><em>GP</em>{player.gp}</span>
          <span><em>G</em>{player.g}</span>
          <span><em>A</em>{player.a}</span>
          <span><em>DC</em>{player.dc}</span>
        </div>
        <div className="mock-wire-portrait-tile-e__fixtures">
          {player.next3.map((f, i) => (
            <WirePortraitTileFixture key={i} opp={f.opp} home={f.home} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Variant F — stats-forward, full-width stats ---------------- */
function WirePortraitTileF({ player }) {
  return (
    <div className="mock-wire-portrait-tile-f">
      <div className="mock-wire-portrait-tile-f__top">
        <WirePortraitTileCrest club={player.club} color={player.clubColor} />
        <div className="mock-wire-portrait-tile-f__id">
          <div className="mock-wire-portrait-tile-f__name-row">
            <span className="mock-wire-portrait-tile-f__name">{player.name}</span>
            <WirePortraitTileAvailDot kind={player.availability} />
          </div>
          <div className="mock-wire-portrait-tile-f__sub">
            <span className="mock-wire-portrait-tile-f__pos">{player.pos}</span>
            <span className="mock-wire-portrait-tile-f__sep" aria-hidden>·</span>
            <span className="mock-wire-portrait-tile-f__club">{player.club}</span>
            <span className="mock-wire-portrait-tile-f__sep" aria-hidden>·</span>
            <WirePortraitTileOwnership ownership={player.ownership} />
          </div>
        </div>
        <div className="mock-wire-portrait-tile-f__pts">
          <span className="mock-wire-portrait-tile-f__pts-num">{player.pts}</span>
          <span className="mock-wire-portrait-tile-f__pts-lbl">PTS</span>
        </div>
      </div>
      <div className="mock-wire-portrait-tile-f__stats">
        <span><em>GP</em>{player.gp}</span>
        <span><em>G</em>{player.g}</span>
        <span><em>A</em>{player.a}</span>
        <span><em>DC</em>{player.dc}</span>
      </div>
      <div className="mock-wire-portrait-tile-f__fixtures">
        {player.next3.map((f, i) => (
          <WirePortraitTileFixture key={i} opp={f.opp} home={f.home} />
        ))}
      </div>
    </div>
  )
}

/* ---------------- Variant G — compact side-by-side ---------------- */
function WirePortraitTileG({ player }) {
  return (
    <div className="mock-wire-portrait-tile-g">
      <div className="mock-wire-portrait-tile-g__id">
        <WirePortraitTileCrest club={player.club} color={player.clubColor} />
        <div className="mock-wire-portrait-tile-g__id-text">
          <div className="mock-wire-portrait-tile-g__name">{player.name}</div>
          <div className="mock-wire-portrait-tile-g__meta">
            <span className="mock-wire-portrait-tile-g__pos">{player.pos}</span>
            <span className="mock-wire-portrait-tile-g__sep" aria-hidden>·</span>
            <WirePortraitTileAvailDot kind={player.availability} />
            <span className="mock-wire-portrait-tile-g__sep" aria-hidden>·</span>
            <WirePortraitTileOwnership ownership={player.ownership} />
          </div>
        </div>
      </div>
      <div className="mock-wire-portrait-tile-g__data">
        <div className="mock-wire-portrait-tile-g__pts">
          <span className="mock-wire-portrait-tile-g__pts-num">{player.pts}</span>
          <span className="mock-wire-portrait-tile-g__pts-lbl">PTS</span>
        </div>
        <div className="mock-wire-portrait-tile-g__stats">
          <span><em>G</em>{player.g}</span>
          <span><em>A</em>{player.a}</span>
          <span><em>DC</em>{player.dc}</span>
        </div>
        <div className="mock-wire-portrait-tile-g__fixtures">
          {player.next3.map((f, i) => (
            <WirePortraitTileFixture key={i} opp={f.opp} home={f.home} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Variant H — hero Pts, brand-tinted ---------------- */
function WirePortraitTileH({ player }) {
  return (
    <div className="mock-wire-portrait-tile-h">
      <div className="mock-wire-portrait-tile-h__main">
        <div className="mock-wire-portrait-tile-h__id-row">
          <WirePortraitTileCrest club={player.club} color={player.clubColor} />
          <span className="mock-wire-portrait-tile-h__name">{player.name}</span>
          <WirePortraitTileAvailDot kind={player.availability} />
        </div>
        <div className="mock-wire-portrait-tile-h__sub">
          <span className="mock-wire-portrait-tile-h__pos">{player.pos}</span>
          <span className="mock-wire-portrait-tile-h__sep" aria-hidden>·</span>
          <span className="mock-wire-portrait-tile-h__club">{player.club}</span>
          <span className="mock-wire-portrait-tile-h__sep" aria-hidden>·</span>
          <WirePortraitTileOwnership ownership={player.ownership} />
        </div>
        <div className="mock-wire-portrait-tile-h__stats">
          <span><em>GP</em> {player.gp}</span>
          <span aria-hidden>·</span>
          <span><em>G</em> {player.g}</span>
          <span aria-hidden>·</span>
          <span><em>A</em> {player.a}</span>
          <span aria-hidden>·</span>
          <span><em>DC</em> {player.dc}</span>
        </div>
        <div className="mock-wire-portrait-tile-h__fixtures">
          {player.next3.map((f, i) => (
            <WirePortraitTileFixture key={i} opp={f.opp} home={f.home} />
          ))}
        </div>
      </div>
      <div className="mock-wire-portrait-tile-h__pts">
        <span className="mock-wire-portrait-tile-h__pts-num">{player.pts}</span>
        <span className="mock-wire-portrait-tile-h__pts-lbl">PTS</span>
      </div>
    </div>
  )
}

function WirePortraitTileVariants() {
  const players = WIRE_TILE_PLAYERS
  return (
    <div className="mock-wire-portrait">
      <div className="mock-wire-portrait__legend">
        <div className="mock-wire-portrait__legend-h">What varies across E–H</div>
        <ul className="mock-wire-portrait__legend-list">
          <li>
            <strong>E</strong> — identity left, mini stats grid right, fixtures
            bottom-right (compact 2-row identity).
          </li>
          <li>
            <strong>F</strong> — stats forward; metadata as sub-row; stats and
            fixtures full-width.
          </li>
          <li>
            <strong>G</strong> — tight side-by-side; identity 50%, stats 50%;
            no separate fixture row.
          </li>
          <li>
            <strong>H</strong> — hero Pts; large brand-tinted points; stats
            single-line; fixture chips inline.
          </li>
        </ul>
        <div className="mock-wire-portrait__legend-shared">
          Shared across all four: same toolbar (search + Wire/Owned segmented
          toggle on row 1, Position / Club / Stats pills on row 2), same crest
          (24px), full player names (no truncation), single-letter positions
          (G/D/M/F), 8px availability dots (fit/injured/doubtful), and the
          same Pts value (184) on the topmost player for direct comparison.
        </div>
      </div>

      <div className="mock-wire-portrait__stack">
        {/* Variant E */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant E</strong> · Identity left · mini stats grid right · ~88px tile
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--c">
                <WirePortraitTileHeader />
                <WirePortraitTileToolbar />
                <div className="mock-wire-portrait-tile-list mock-wire-portrait-tile-list--e">
                  {players.map((p) => (
                    <WirePortraitTileE key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variant F */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant F</strong> · Stats-forward · full-width stats row · ~96px card
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--c">
                <WirePortraitTileHeader />
                <WirePortraitTileToolbar />
                <div className="mock-wire-portrait-tile-list mock-wire-portrait-tile-list--f">
                  {players.map((p) => (
                    <WirePortraitTileF key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variant G */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant G</strong> · Tight side-by-side · no separate fixture row · ~76px tile
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--c">
                <WirePortraitTileHeader />
                <WirePortraitTileToolbar />
                <div className="mock-wire-portrait-tile-list mock-wire-portrait-tile-list--g">
                  {players.map((p) => (
                    <WirePortraitTileG key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variant H */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant H</strong> · Hero Pts · brand-tinted right edge · ~88px card
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--c">
                <WirePortraitTileHeader />
                <WirePortraitTileToolbar />
                <div className="mock-wire-portrait-tile-list mock-wire-portrait-tile-list--h">
                  {players.map((p) => (
                    <WirePortraitTileH key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ============ WIRE PORTRAIT TILE LAYOUT VARIANTS (I/J/K/L) ============ */
/* Follow-up to E/F/G/H. The user found that inline-mixed stat positions
 * made columns shift tile-to-tile, breaking at-a-glance comparison when
 * sorting (you can't scan down a Goals column if Goals isn't at the same
 * x in every tile).
 *
 * These four variants lock stats into a FIXED-WIDTH right column so
 * PTS / G / A / DC values appear at identical x-coordinates across
 * every tile. Left column = crest + full name (wraps if needed) +
 * Next-3 fixture chips below. Right column varies per variant.
 *
 * All shared atoms (crest, fixture chip, toolbar, header) are reused
 * verbatim from the E/F/G/H section above. Class names are namespaced
 * `mock-wire-portrait-tile-{i,j,k,l}-*` and a shared `…-ijkl-*` for the
 * common left column. */

const WIRE_TILE_RIGHT_PLAYERS = [
  {
    name: 'Mohamed Salah',
    club: 'LIV',
    clubColor: '#c8102e',
    pos: 'F',
    pts: 184, gp: 36, g: 28, a: 14, dc: 6,
    next3: [
      { opp: 'ARS', home: true },
      { opp: 'LIV', home: false },
      { opp: 'BRI', home: true },
    ],
  },
  {
    name: 'Bruno Fernandes',
    club: 'MUN',
    clubColor: '#da291c',
    pos: 'M',
    pts: 167, gp: 22, g: 6, a: 8, dc: 19,
    next3: [
      { opp: 'NFO', home: true },
      { opp: 'BOU', home: false },
      { opp: 'WHU', home: true },
    ],
  },
  {
    name: 'Trent Alexander-Arnold',
    club: 'LIV',
    clubColor: '#c8102e',
    pos: 'D',
    pts: 149, gp: 30, g: 3, a: 6, dc: 3,
    next3: [
      { opp: 'ARS', home: true },
      { opp: 'LIV', home: false },
      { opp: 'BRI', home: true },
    ],
  },
  {
    name: 'Cole Palmer',
    club: 'CHE',
    clubColor: '#034694',
    pos: 'M',
    pts: 169, gp: 37, g: 10, a: 8, dc: 1,
    next3: [
      { opp: 'NEW', home: true },
      { opp: 'CHE', home: false },
      { opp: 'LIV', home: true },
    ],
  },
  {
    name: 'Ollie Watkins',
    club: 'AVL',
    clubColor: '#670e36',
    pos: 'F',
    pts: 144, gp: 37, g: 16, a: 4, dc: 0,
    next3: [
      { opp: 'MCI', home: true },
      { opp: 'BRE', home: false },
      { opp: 'AVL', home: true },
    ],
  },
  {
    name: 'Bukayo Saka',
    club: 'ARS',
    clubColor: '#ef0107',
    pos: 'F',
    pts: 148, gp: 36, g: 3, a: 3, dc: 13,
    next3: [
      { opp: 'NFO', home: true },
      { opp: 'BOU', home: false },
      { opp: 'WHU', home: true },
    ],
  },
]

/* Shared left column for I/J/K/L: crest + full name, fixtures below. */
function WirePortraitTileIJKLLeft({ player }) {
  return (
    <div className="mock-wire-portrait-tile-ijkl__left">
      <div className="mock-wire-portrait-tile-ijkl__id-row">
        <WirePortraitTileCrest club={player.club} color={player.clubColor} />
        <span className="mock-wire-portrait-tile-ijkl__name">{player.name}</span>
      </div>
      <div className="mock-wire-portrait-tile-ijkl__fixtures">
        {player.next3.map((f, i) => (
          <WirePortraitTileFixture key={i} opp={f.opp} home={f.home} />
        ))}
      </div>
    </div>
  )
}

/* ---------------- Variant I — persistent column header above tile group ---------------- */
function WirePortraitTileI({ player }) {
  return (
    <div className="mock-wire-portrait-tile-i">
      <WirePortraitTileIJKLLeft player={player} />
      <div className="mock-wire-portrait-tile-i__right">
        <span>{player.pts}</span>
        <span>{player.g}</span>
        <span>{player.a}</span>
        <span>{player.dc}</span>
      </div>
    </div>
  )
}

function WirePortraitTileIColHeader() {
  return (
    <div className="mock-wire-portrait-tile-i-colhead" aria-hidden>
      <span className="mock-wire-portrait-tile-i-colhead__spacer" />
      <div className="mock-wire-portrait-tile-i-colhead__cols">
        <span>Pts</span>
        <span>G</span>
        <span>A</span>
        <span>DC</span>
      </div>
    </div>
  )
}

/* ---------------- Variant J — per-tile label-above-value ---------------- */
function WirePortraitTileJ({ player }) {
  return (
    <div className="mock-wire-portrait-tile-j">
      <WirePortraitTileIJKLLeft player={player} />
      <div className="mock-wire-portrait-tile-j__right">
        <div className="mock-wire-portrait-tile-j__labels">
          <span>Pts</span>
          <span>G</span>
          <span>A</span>
          <span>DC</span>
        </div>
        <div className="mock-wire-portrait-tile-j__values">
          <span>{player.pts}</span>
          <span>{player.g}</span>
          <span>{player.a}</span>
          <span>{player.dc}</span>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Variant K — 2×2 stats grid ---------------- */
function WirePortraitTileK({ player }) {
  return (
    <div className="mock-wire-portrait-tile-k">
      <WirePortraitTileIJKLLeft player={player} />
      <div className="mock-wire-portrait-tile-k__right">
        <div className="mock-wire-portrait-tile-k__cell">
          <em>Pts</em>
          <span>{player.pts}</span>
        </div>
        <div className="mock-wire-portrait-tile-k__cell">
          <em>G</em>
          <span>{player.g}</span>
        </div>
        <div className="mock-wire-portrait-tile-k__cell">
          <em>A</em>
          <span>{player.a}</span>
        </div>
        <div className="mock-wire-portrait-tile-k__cell">
          <em>DC</em>
          <span>{player.dc}</span>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Variant L — hero PTS + 3-stat strip ---------------- */
function WirePortraitTileL({ player }) {
  return (
    <div className="mock-wire-portrait-tile-l">
      <WirePortraitTileIJKLLeft player={player} />
      <div className="mock-wire-portrait-tile-l__right">
        <div className="mock-wire-portrait-tile-l__pts">{player.pts}</div>
        <div className="mock-wire-portrait-tile-l__strip">
          <span><em>G</em>{player.g}</span>
          <span><em>A</em>{player.a}</span>
          <span><em>DC</em>{player.dc}</span>
        </div>
      </div>
    </div>
  )
}

function WirePortraitTileRightVariants() {
  const players = WIRE_TILE_RIGHT_PLAYERS
  return (
    <div className="mock-wire-portrait">
      <div className="mock-wire-portrait__legend">
        <div className="mock-wire-portrait__legend-h">What varies across I–L</div>
        <ul className="mock-wire-portrait__legend-list">
          <li>
            <strong>I</strong> — persistent column header above the tile
            group; pure values in tiles (most table-like).
          </li>
          <li>
            <strong>J</strong> — label-above-value per tile (self-describing,
            more redundant).
          </li>
          <li>
            <strong>K</strong> — 2×2 mini stat grid per tile.
          </li>
          <li>
            <strong>L</strong> — hero Pts + smaller 3-stat strip (G/A/DC)
            below.
          </li>
        </ul>
        <div className="mock-wire-portrait__legend-shared">
          Shared across all four: identity left (crest + full name) with the
          Next-3 fixture chips directly below the name, and a{' '}
          <strong>fixed-width right column</strong> so stat values appear at
          the same x-coordinate from tile to tile. Numbers use{' '}
          <code>tabular-nums</code> so 1s and 8s stay aligned. Long names
          (e.g. Trent Alexander-Arnold) wrap inside the left column without
          shifting the stat column. Position chip / availability dot /
          owned-by are intentionally omitted — focus is identity+fixtures
          left, stats right.
        </div>
      </div>

      <div className="mock-wire-portrait__stack">
        {/* Variant I */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant I</strong> · Persistent column header · pure values in tiles
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--c">
                <WirePortraitTileHeader />
                <WirePortraitTileToolbar statsCount={4} />
                <div className="mock-wire-portrait-tile-list mock-wire-portrait-tile-list--ijkl">
                  <WirePortraitTileIColHeader />
                  {players.map((p) => (
                    <WirePortraitTileI key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variant J */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant J</strong> · Label-above-value per tile · self-describing
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--c">
                <WirePortraitTileHeader />
                <WirePortraitTileToolbar statsCount={4} />
                <div className="mock-wire-portrait-tile-list mock-wire-portrait-tile-list--ijkl">
                  {players.map((p) => (
                    <WirePortraitTileJ key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variant K */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant K</strong> · 2×2 stats grid · label + value per cell
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--c">
                <WirePortraitTileHeader />
                <WirePortraitTileToolbar statsCount={4} />
                <div className="mock-wire-portrait-tile-list mock-wire-portrait-tile-list--ijkl">
                  {players.map((p) => (
                    <WirePortraitTileK key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variant L */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant L</strong> · Hero Pts · G/A/DC strip below
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--c">
                <WirePortraitTileHeader />
                <WirePortraitTileToolbar statsCount={4} />
                <div className="mock-wire-portrait-tile-list mock-wire-portrait-tile-list--ijkl">
                  {players.map((p) => (
                    <WirePortraitTileL key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WirePortraitVariants() {
  const players = WIRE_PORTRAIT_PLAYERS
  return (
    <div className="mock-wire-portrait">
      <div className="mock-wire-portrait__legend">
        <div className="mock-wire-portrait__legend-h">What varies across A–D</div>
        <ul className="mock-wire-portrait__legend-list">
          <li>
            <strong>A</strong> — Drop the nested inner card around the table only.
            Outer dashboard tile (border, radius, shadow, 16/18px padding) preserved.
          </li>
          <li>
            <strong>B</strong> — Outer tile padding goes to <code>0</code> (border / radius /
            shadow preserved). Header, filter, and search rows get their own
            padding back. Rows go edge-to-edge inside the tile border.
          </li>
          <li>
            <strong>C</strong> — Strip the outer tile chrome entirely on portrait. Rows extend
            to the absolute screen edges (FotMob &ldquo;All Players&rdquo; pattern).
            Position dropdown rendered <em>open</em> so you can see the multi-select.
          </li>
          <li>
            <strong>D</strong> — Same full-bleed chrome as C, but each player rendered as a
            vertical card (Pts on the right, sub-row, stats row, fixtures row).
          </li>
        </ul>
        <div className="mock-wire-portrait__legend-shared">
          Shared across all four: same toolbar (full-width search + Position pill + Club pill,
          no Sort / Owned / Include-drafted), same player-row internals (font, indicators,
          fixture chips). Only the <em>wrapper chrome</em> changes.
        </div>
      </div>

      <div className="mock-wire-portrait__stack">
        {/* Variant A — drop nested inner card only */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant A</strong> · Drop nested inner card only
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen mock-wire-portrait-screen--padded">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--a">
                <WirePortraitHeader />
                <WirePortraitToolbar />
                <div className="mock-wire-portrait-list mock-wire-portrait-list--a">
                  {players.map((p) => (
                    <WirePortraitRow key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variant B — zero outer tile padding */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant B</strong> · Zero outer tile padding (keep tile border)
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen mock-wire-portrait-screen--padded">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--b">
                <WirePortraitHeader />
                <WirePortraitToolbar />
                <div className="mock-wire-portrait-list mock-wire-portrait-list--b">
                  {players.map((p) => (
                    <WirePortraitRow key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variant C — full bleed (with Position dropdown open) */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant C</strong> · Full bleed, no tile chrome (Position dropdown open)
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--c">
                <WirePortraitHeader />
                <WirePortraitToolbar posOpen />
                <div className="mock-wire-portrait-list mock-wire-portrait-list--c">
                  {players.map((p) => (
                    <WirePortraitRow key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Variant D — card per player (full-bleed chrome) */}
        <div className="mock-wire-portrait__variant">
          <div className="mock-wire-portrait__variant-label">
            <strong>Variant D</strong> · Card per player (full-bleed chrome like C)
          </div>
          <div className="mock-wire-portrait__frame">
            <div className="mock-wire-portrait-screen">
              <div className="mock-wire-portrait-tile mock-wire-portrait-tile--c">
                <WirePortraitHeader />
                <WirePortraitToolbar />
                <div className="mock-wire-portrait-cards">
                  {players.map((p) => (
                    <WirePortraitCard key={p.name} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* ============ STANDINGS — PORTRAIT LAYOUT VARIANTS (A/B/C/D/E) =====
 * Five portrait-first mockups of the Standings tab. The production
 * Standings is a 12-column table; on a 390px phone that table goes
 * horizontal-scroll. These variants explore five different ways to
 * present the same 8 teams without horizontal scroll. All class names
 * are namespaced under `mock-standings-` so they cannot collide with
 * production or with other mockup sections. Mockup-only — no
 * production Standings code is touched. */

const STANDINGS_VARIANT_TEAMS = [
  {
    rank: 1, abbr: 'CEO', name: 'Crouch End Oashisu', mgr: 'Andy Ward',
    color: '#f59e0b',
    pl: 38, w: 25, d: 5, l: 8,
    forPts: 1842, faced: 1593, gd: 249, pts: 184,
    form: ['W', 'W', 'W', 'D', 'W'], nxt: 'SCC',
  },
  {
    rank: 2, abbr: 'SZM', name: 'Soul Ze Moles', mgr: 'Eddy Webster',
    color: '#8b5cf6',
    pl: 38, w: 22, d: 6, l: 10,
    forPts: 1788, faced: 1604, gd: 184, pts: 167,
    form: ['W', 'L', 'W', 'W', 'D'], nxt: 'CEO',
  },
  {
    rank: 3, abbr: 'DBS', name: 'Dalston Bellsprouts', mgr: 'Tom Roe',
    color: '#10b981',
    pl: 38, w: 19, d: 11, l: 8,
    forPts: 1721, faced: 1592, gd: 129, pts: 158,
    form: ['W', 'D', 'D', 'W', 'W'], nxt: 'ESR',
  },
  {
    rank: 4, abbr: 'TWG', name: 'Toronto Wiggum', mgr: 'Cary Camma',
    color: '#3b82f6',
    pl: 38, w: 18, d: 10, l: 10,
    forPts: 1702, faced: 1645, gd: 57, pts: 152,
    form: ['D', 'W', 'L', 'W', 'W'], nxt: 'SZM',
  },
  {
    rank: 5, abbr: 'ESR', name: 'Essex Ratigans', mgr: 'Chris Newton',
    color: '#ef4444',
    pl: 38, w: 17, d: 9, l: 12,
    forPts: 1675, faced: 1632, gd: 43, pts: 144,
    form: ['L', 'W', 'D', 'W', 'L'], nxt: 'DBS',
  },
  {
    rank: 6, abbr: 'DBN', name: 'Dalston Benoit', mgr: 'Cole Henderson',
    color: '#14b8a6',
    pl: 38, w: 15, d: 9, l: 14,
    forPts: 1604, faced: 1671, gd: -67, pts: 132,
    form: ['W', 'L', 'L', 'D', 'W'], nxt: 'TWG',
  },
  {
    rank: 7, abbr: 'SCC', name: 'Soul Crouch Carrol', mgr: 'Sam Wilson',
    color: '#64748b',
    pl: 38, w: 13, d: 8, l: 17,
    forPts: 1559, faced: 1722, gd: -163, pts: 119,
    form: ['L', 'D', 'L', 'L', 'W'], nxt: 'CEO',
  },
  {
    rank: 8, abbr: 'PFO', name: 'Pinks Five-O', mgr: 'Pat Hooks',
    color: '#ec4899',
    pl: 38, w: 10, d: 6, l: 22,
    forPts: 1487, faced: 1819, gd: -332, pts: 96,
    form: ['L', 'L', 'D', 'L', 'L'], nxt: 'DBN',
  },
]

const STANDINGS_VARIANT_TEAM_BY_ABBR = STANDINGS_VARIANT_TEAMS.reduce(
  (m, t) => { m[t.abbr] = t; return m },
  {},
)

function fmtSigned(n) {
  if (n > 0) return '+' + n
  return String(n)
}

/* Shared atoms ------------------------------------------------------ */

function StandingsCrest({ team, size = 28, fontSize }) {
  return (
    <span
      className="mock-standings-crest"
      style={{
        background: team.color,
        width: size,
        height: size,
        fontSize: fontSize ?? (size <= 22 ? 9 : 10),
      }}
      aria-hidden
    >
      {team.abbr}
    </span>
  )
}

function StandingsFormDots({ form, size = 7 }) {
  return (
    <span
      className="mock-standings-form"
      style={{ '--mock-standings-dot': size + 'px' }}
    >
      {form.map((f, i) => (
        <span
          key={i}
          className={'mock-standings-form__dot mock-standings-form__dot--' + f}
          aria-label={f}
        />
      ))}
    </span>
  )
}

function StandingsNxt({ abbr, size = 22 }) {
  const opp = STANDINGS_VARIANT_TEAM_BY_ABBR[abbr]
  if (!opp) return null
  return (
    <span
      className="mock-standings-nxt"
      style={{
        background: opp.color,
        width: size,
        height: size,
        fontSize: size <= 20 ? 8 : 9,
      }}
      title={'Next: ' + opp.name}
      aria-label={'Next opponent: ' + opp.name}
    >
      {opp.abbr}
    </span>
  )
}

function StandingsRankCell({ rank }) {
  if (rank === 8) {
    return (
      <span
        className="mock-standings-rank mock-standings-rank--spoon"
        aria-label="Rank 8 — wooden spoon"
      >
        <span className="mock-standings-rank__num">8</span>
        <span className="mock-standings-rank__icon" aria-hidden>🧩</span>
      </span>
    )
  }
  return (
    <span
      className={
        'mock-standings-rank' +
        (rank === 1 ? ' mock-standings-rank--leader' : '')
      }
    >
      {rank}
    </span>
  )
}

function StandingsEyebrow() {
  return <div className="mock-standings-eyebrow">Standings</div>
}

/* ------------------------------------------------------------------ */
/* Variant A — Wire-style tile, right-aligned 4-stat column,
 * persistent column header above the tile group. Form dots below the
 * stat values; Nxt avatar in the bottom-right corner of the tile. */

function StandingsVariantA({ teams }) {
  return (
    <div className="mock-standings-a">
      <StandingsEyebrow />
      <div className="mock-standings-a__colhead" aria-hidden>
        <span className="mock-standings-a__colhead-spacer" />
        <div className="mock-standings-a__colhead-cols">
          <span>PTS</span>
          <span>GD</span>
          <span>FOR</span>
          <span>FACED</span>
        </div>
      </div>
      <div className="mock-standings-a__list">
        {teams.map((t) => (
          <div
            key={t.abbr}
            className={
              'mock-standings-a__row' +
              (t.rank === 1 ? ' is-leader' : '') +
              (t.rank === 8 ? ' is-spoon' : '')
            }
          >
            <div className="mock-standings-a__left">
              <StandingsRankCell rank={t.rank} />
              <StandingsCrest team={t} size={28} />
              <div className="mock-standings-a__id">
                <div className="mock-standings-a__name">{t.name}</div>
                <div className="mock-standings-a__mgr">{t.mgr}</div>
              </div>
            </div>
            <div className="mock-standings-a__right">
              <div className="mock-standings-a__values">
                <span className="mock-standings-a__value mock-standings-a__value--pts">{t.pts}</span>
                <span className="mock-standings-a__value">{fmtSigned(t.gd)}</span>
                <span className="mock-standings-a__value">{t.forPts}</span>
                <span className="mock-standings-a__value">{t.faced}</span>
              </div>
              <div className="mock-standings-a__sub">
                <StandingsFormDots form={t.form} size={7} />
                <StandingsNxt abbr={t.nxt} size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Variant B — Density-collapsed table. Drop W/D/L (implicit in PL)
 * and For/Faced (GD carries the differential). Visible columns:
 * # · Team · PL · GD · PTS · Form · Nxt. */

function StandingsVariantB({ teams }) {
  return (
    <div className="mock-standings-b">
      <StandingsEyebrow />
      <table className="mock-standings-b__table">
        <thead>
          <tr>
            <th className="mock-standings-b__th-rank">#</th>
            <th className="mock-standings-b__th-team">Team</th>
            <th>PL</th>
            <th>GD</th>
            <th className="mock-standings-b__th-pts">PTS</th>
            <th>Form</th>
            <th>Nxt</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr
              key={t.abbr}
              className={
                (t.rank === 1 ? 'is-leader ' : '') +
                (t.rank === 8 ? 'is-spoon' : '')
              }
            >
              <td className="mock-standings-b__rank">
                <StandingsRankCell rank={t.rank} />
              </td>
              <td className="mock-standings-b__team">
                <StandingsCrest team={t} size={22} />
                <div className="mock-standings-b__id">
                  <div className="mock-standings-b__name">{t.name}</div>
                  <div className="mock-standings-b__mgr">{t.mgr}</div>
                </div>
              </td>
              <td>{t.pl}</td>
              <td>{fmtSigned(t.gd)}</td>
              <td className="mock-standings-b__pts">{t.pts}</td>
              <td>
                <StandingsFormDots form={t.form} size={6} />
              </td>
              <td>
                <StandingsNxt abbr={t.nxt} size={20} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Variant C — Hero leader card + condensed rows below.
 * The #1 team gets a prominent hero card with big PTS, big crest,
 * "Top of the league" eyebrow chip, and prominent form dots.
 * Remaining 7 teams render as compact rows. */

function StandingsVariantC({ teams }) {
  const [leader, ...rest] = teams
  return (
    <div className="mock-standings-c">
      <StandingsEyebrow />
      <div className="mock-standings-c__hero">
        <div className="mock-standings-c__hero-eyebrow">
          <span className="mock-standings-c__hero-eyebrow-dot" aria-hidden>★</span>
          Top of the league
        </div>
        <div className="mock-standings-c__hero-row">
          <StandingsCrest team={leader} size={56} fontSize={14} />
          <div className="mock-standings-c__hero-id">
            <div className="mock-standings-c__hero-name">{leader.name}</div>
            <div className="mock-standings-c__hero-mgr">{leader.mgr}</div>
          </div>
          <div className="mock-standings-c__hero-pts">
            <div className="mock-standings-c__hero-pts-num">{leader.pts}</div>
            <div className="mock-standings-c__hero-pts-lbl">PTS</div>
          </div>
        </div>
        <div className="mock-standings-c__hero-sub">
          <StandingsFormDots form={leader.form} size={10} />
          <span className="mock-standings-c__hero-nxt">
            <span className="mock-standings-c__hero-nxt-lbl">Next</span>
            <StandingsNxt abbr={leader.nxt} size={22} />
          </span>
        </div>
      </div>
      <table className="mock-standings-c__table">
        <thead>
          <tr>
            <th className="mock-standings-c__th-rank">#</th>
            <th className="mock-standings-c__th-team">Team</th>
            <th>PL</th>
            <th>GD</th>
            <th className="mock-standings-c__th-pts">PTS</th>
            <th>Form</th>
            <th>Nxt</th>
          </tr>
        </thead>
        <tbody>
          {rest.map((t) => (
            <tr
              key={t.abbr}
              className={t.rank === 8 ? 'is-spoon' : ''}
            >
              <td className="mock-standings-c__rank">
                <StandingsRankCell rank={t.rank} />
              </td>
              <td className="mock-standings-c__team">
                <StandingsCrest team={t} size={20} />
                <div className="mock-standings-c__id">
                  <div className="mock-standings-c__name">{t.name}</div>
                  <div className="mock-standings-c__mgr">{t.mgr}</div>
                </div>
              </td>
              <td>{t.pl}</td>
              <td>{fmtSigned(t.gd)}</td>
              <td className="mock-standings-c__pts">{t.pts}</td>
              <td>
                <StandingsFormDots form={t.form} size={6} />
              </td>
              <td>
                <StandingsNxt abbr={t.nxt} size={20} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Variant D — Stats-grid tile (2×2 right-side grid).
 * Each tile shows rank + crest + name on the left; a 2×2 mini stat
 * grid on the right (PL/PTS top row, GD/GP bottom row). Form dots
 * span the bottom of the tile; Nxt avatar sits at the bottom-right.
 * Tile chrome: rounded cards with subtle bottom border, 8px gap. */

function StandingsVariantD({ teams }) {
  return (
    <div className="mock-standings-d">
      <StandingsEyebrow />
      <div className="mock-standings-d__list">
        {teams.map((t) => (
          <div
            key={t.abbr}
            className={
              'mock-standings-d__tile' +
              (t.rank === 1 ? ' is-leader' : '') +
              (t.rank === 8 ? ' is-spoon' : '')
            }
          >
            <div className="mock-standings-d__top">
              <div className="mock-standings-d__left">
                <StandingsRankCell rank={t.rank} />
                <StandingsCrest team={t} size={28} />
                <div className="mock-standings-d__id">
                  <div className="mock-standings-d__name">{t.name}</div>
                  <div className="mock-standings-d__mgr">{t.mgr}</div>
                </div>
              </div>
              <div className="mock-standings-d__grid" aria-hidden>
                <span className="mock-standings-d__cell">
                  <em>PL</em>
                  <span>{t.pl}</span>
                </span>
                <span className="mock-standings-d__cell mock-standings-d__cell--pts">
                  <em>PTS</em>
                  <span>{t.pts}</span>
                </span>
                <span className="mock-standings-d__cell">
                  <em>GD</em>
                  <span>{fmtSigned(t.gd)}</span>
                </span>
                <span className="mock-standings-d__cell">
                  <em>W-D-L</em>
                  <span>{t.w}-{t.d}-{t.l}</span>
                </span>
              </div>
            </div>
            <div className="mock-standings-d__bottom">
              <StandingsFormDots form={t.form} size={7} />
              <StandingsNxt abbr={t.nxt} size={22} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Variant E — Tap-to-expand compact row.
 * Default visible: # | Team | PTS | Form | Nxt + chevron.
 * Row 1 is rendered in the expanded state; rows 2–8 collapsed so the
 * mock shows both interaction states side-by-side. The expand band
 * reveals full stats (PL/W/D/L/For/Faced/GD). */

function StandingsExpandSubBand({ team }) {
  return (
    <div className="mock-standings-e__sub">
      <div className="mock-standings-e__sub-row">
        <span><em>PL</em>{team.pl}</span>
        <span><em>W</em>{team.w}</span>
        <span><em>D</em>{team.d}</span>
        <span><em>L</em>{team.l}</span>
      </div>
      <div className="mock-standings-e__sub-row">
        <span><em>For</em>{team.forPts}</span>
        <span><em>Faced</em>{team.faced}</span>
        <span><em>GD</em>{fmtSigned(team.gd)}</span>
      </div>
    </div>
  )
}

function StandingsVariantE({ teams }) {
  return (
    <div className="mock-standings-e">
      <StandingsEyebrow />
      <div className="mock-standings-e__head" aria-hidden>
        <span className="mock-standings-e__head-rank">#</span>
        <span className="mock-standings-e__head-team">Team</span>
        <span className="mock-standings-e__head-pts">PTS</span>
        <span className="mock-standings-e__head-form">Form</span>
        <span className="mock-standings-e__head-nxt">Nxt</span>
        <span className="mock-standings-e__head-chev" />
      </div>
      <div className="mock-standings-e__list">
        {teams.map((t) => {
          const expanded = t.rank === 1
          return (
            <Fragment key={t.abbr}>
              <div
                className={
                  'mock-standings-e__row' +
                  (t.rank === 1 ? ' is-leader' : '') +
                  (t.rank === 8 ? ' is-spoon' : '') +
                  (expanded ? ' is-expanded' : '')
                }
              >
                <span className="mock-standings-e__rank">
                  <StandingsRankCell rank={t.rank} />
                </span>
                <span className="mock-standings-e__team">
                  <StandingsCrest team={t} size={22} />
                  <span className="mock-standings-e__id">
                    <span className="mock-standings-e__name">{t.name}</span>
                    <span className="mock-standings-e__mgr">{t.mgr}</span>
                  </span>
                </span>
                <span className="mock-standings-e__pts">{t.pts}</span>
                <span className="mock-standings-e__form">
                  <StandingsFormDots form={t.form} size={6} />
                </span>
                <span className="mock-standings-e__nxt">
                  <StandingsNxt abbr={t.nxt} size={20} />
                </span>
                <span
                  className={
                    'mock-standings-e__chev' +
                    (expanded ? ' is-up' : '')
                  }
                  aria-hidden
                >
                  {expanded ? '▲' : '▼'}
                </span>
              </div>
              {expanded && <StandingsExpandSubBand team={t} />}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Showcase wrapper — legend + 5 phone frames stacked. */

const STANDINGS_VARIANTS_META = [
  {
    key: 'A',
    label: 'Wire-style tile · right-aligned 4-stat column · persistent header',
    desktop: 'Same pattern, just wider — the right column expands to host the W/D/L breakdown alongside the existing 4 numeric columns.',
    render: (teams) => <StandingsVariantA teams={teams} />,
  },
  {
    key: 'B',
    label: 'Density-collapsed table · #/Team/PL/GD/PTS/Form/Nxt',
    desktop: 'Restores W/D/L/For/Faced columns — back to the legacy 12-col layout but with the new visual chrome (typography, dots, crests, eyebrow).',
    render: (teams) => <StandingsVariantB teams={teams} />,
  },
  {
    key: 'C',
    label: 'Hero leader card + condensed rows below',
    desktop: 'Hero card spans full width up top; compact list below. Could also pair side-by-side with a leader card on the left + standings on the right.',
    render: (teams) => <StandingsVariantC teams={teams} />,
  },
  {
    key: 'D',
    label: 'Stats-grid tile · 2×2 mini-grid + form dots + Nxt',
    desktop: 'Becomes a 2-column grid of tiles (4 tiles per row × 2 rows) for fast at-a-glance scanning of all 8 teams.',
    render: (teams) => <StandingsVariantD teams={teams} />,
  },
  {
    key: 'E',
    label: 'Tap-to-expand compact row · mobile-only interaction',
    desktop: 'On desktop all rows show full stats by default — no expand needed since horizontal space is plentiful. The expand-row pattern is mobile-only.',
    render: (teams) => <StandingsVariantE teams={teams} />,
  },
]

function StandingsPortraitVariants() {
  const teams = STANDINGS_VARIANT_TEAMS
  return (
    <div className="mock-standings">
      <div className="mock-standings__legend">
        <div className="mock-standings__legend-h">What varies across A–E</div>
        <ul className="mock-standings__legend-list">
          <li>
            <strong>A</strong> — Wire-style tile, right-aligned stat columns
            (4 stats), persistent column header above the tile group.
          </li>
          <li>
            <strong>B</strong> — Density-collapsed table (drop W/D/L, drop
            For/Faced; keep #/Team/PL/GD/PTS/Form/Nxt).
          </li>
          <li>
            <strong>C</strong> — Hero leader card + condensed rows for the
            other 7 teams below.
          </li>
          <li>
            <strong>D</strong> — Stats-grid tile (2×2 mini-grid on the right
            + form dots + Nxt at the bottom).
          </li>
          <li>
            <strong>E</strong> — Tap-to-expand compact row (mobile-only
            interaction pattern; row 1 shown expanded).
          </li>
        </ul>
        <div className="mock-standings__legend-shared">
          Shared across all five: rank #1 carries a subtle leader tint,
          rank #8 gets the 🧩 wooden-spoon marker with a divider above,
          5 form dots per team (W green / D grey / L red), next-opponent
          crest visible, manager names muted under the team name, and a
          simple lower-case &ldquo;Standings&rdquo; eyebrow above the list
          (no tile-head meta row). 8 teams shared across all variants for
          fair comparison.
        </div>
      </div>

      <div className="mock-standings__stack">
        {STANDINGS_VARIANTS_META.map((v) => (
          <div className="mock-standings__variant" key={v.key}>
            <div className="mock-standings__variant-label">
              <strong>Variant {v.key}</strong> · {v.label}
            </div>
            <div className="mock-standings__frame">
              <div className="mock-standings__screen">
                {v.render(teams)}
              </div>
            </div>
            <div className="mock-standings__desktop-note">
              <strong>Desktop note ·</strong> {v.desktop}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */
/* ================================================================== */
/* STANDINGS · SUB-NAV STRUCTURE + GW SUMMARY TILES                     */
/* ================================================================== */
/* User direction (verbatim): "I think building some sub menus in
 * standings is good - Schedule, Form & Stats. Under the standings
 * section I want it to show last game week and next game week
 * results/fixtures in the side by side tiles."
 *
 * The redesigned Standings tab stacks:
 *   1. brand header strip (already shipped, untouched)
 *   2. standings hero+table tile (already shipped, untouched)
 *   3. NEW side-by-side Last GW / Next GW mini tiles
 *   4. NEW sub-nav: Schedule · Form · Stats
 *   5. sub-tab content body
 *
 * Five portrait frames below explore this layout: default landing
 * (Schedule active), Schedule expanded, Form expanded, Stats expanded,
 * and an alternative segmented-control sub-nav (Variant B).
 */

/* Mid-season state (GW 17 played, GW 18 upcoming) ------------------ */
const STANDINGS_NAV_TEAMS_MID = [
  { rank: 1, abbr: 'CEO', name: 'Crouch End Oashisu', short: 'Crouch End',   mgr: 'Andy Ward',      color: '#f59e0b', pl: 17, w: 12, d: 3, l: 2, forPts: 824, faced: 712, gd:  112, pts: 92, form: ['W','W','W','D','W'], pts5: 13, nxt: 'PFO' },
  { rank: 2, abbr: 'SZM', name: 'Soul Ze Moles',       short: 'Soul Ze',     mgr: 'Eddy Webster',   color: '#8b5cf6', pl: 17, w: 11, d: 3, l: 3, forPts: 798, faced: 720, gd:   78, pts: 84, form: ['W','L','W','W','D'], pts5: 10, nxt: 'SCC' },
  { rank: 3, abbr: 'DBS', name: 'Dalston Bellsprouts', short: 'Bellsprouts', mgr: 'Tom Roe',        color: '#10b981', pl: 17, w:  9, d: 5, l: 3, forPts: 770, faced: 712, gd:   58, pts: 79, form: ['W','D','D','W','W'], pts5: 11, nxt: 'DBN' },
  { rank: 4, abbr: 'TWG', name: 'Toronto Wiggum',      short: 'Toronto',     mgr: 'Cary Camma',     color: '#3b82f6', pl: 17, w:  9, d: 4, l: 4, forPts: 760, faced: 735, gd:   25, pts: 76, form: ['D','W','L','W','W'], pts5: 10, nxt: 'ESR' },
  { rank: 5, abbr: 'ESR', name: 'Essex Ratigans',      short: 'Essex',       mgr: 'Chris Newton',   color: '#ef4444', pl: 17, w:  8, d: 5, l: 4, forPts: 748, faced: 730, gd:   18, pts: 72, form: ['L','W','D','W','L'], pts5:  7, nxt: 'TWG' },
  { rank: 6, abbr: 'DBN', name: 'Dalston Benoit',      short: 'Benoit',      mgr: 'Cole Henderson', color: '#14b8a6', pl: 17, w:  7, d: 5, l: 5, forPts: 716, faced: 746, gd:  -30, pts: 66, form: ['W','L','L','D','W'], pts5:  7, nxt: 'DBS' },
  { rank: 7, abbr: 'SCC', name: 'Soul Crouch Carrol',  short: 'Soul Crouch', mgr: 'Sam Wilson',     color: '#64748b', pl: 17, w:  6, d: 4, l: 7, forPts: 696, faced: 769, gd:  -73, pts: 60, form: ['L','D','L','L','W'], pts5:  4, nxt: 'SZM' },
  { rank: 8, abbr: 'PFO', name: 'Pinks Five-O',        short: 'Pinks',       mgr: 'Pat Hooks',      color: '#ec4899', pl: 17, w:  5, d: 3, l: 9, forPts: 664, faced: 812, gd: -148, pts: 48, form: ['L','L','D','L','L'], pts5:  1, nxt: 'CEO' },
]

const STANDINGS_NAV_TEAM_BY_ABBR = STANDINGS_NAV_TEAMS_MID.reduce(
  (m, t) => { m[t.abbr] = t; return m },
  {},
)

/* Last GW (17) results — user-specified pairings. */
const STANDINGS_NAV_LAST_GW = {
  id: 17,
  matches: [
    { home: 'CEO', away: 'TWG', homeScore: 58, awayScore: 41 },
    { home: 'SZM', away: 'ESR', homeScore: 67, awayScore: 49 },
    { home: 'DBS', away: 'DBN', homeScore: 52, awayScore: 52 },
    { home: 'SCC', away: 'PFO', homeScore: 38, awayScore: 71 },
  ],
}

/* Next GW (18) upcoming — user-specified pairings. */
const STANDINGS_NAV_NEXT_GW = {
  id: 18,
  matches: [
    { home: 'CEO', away: 'PFO' },
    { home: 'SZM', away: 'SCC' },
    { home: 'DBS', away: 'DBN' },
    { home: 'TWG', away: 'ESR' },
  ],
}

/* Form leaderboard — sorted by points from last 5 GWs. */
const STANDINGS_NAV_FORM_LEADERBOARD = [...STANDINGS_NAV_TEAMS_MID]
  .sort((a, b) => b.pts5 - a.pts5)

/* H2H record of one team vs each of the other 7 — used in the
 * Form sub-tab "per-team H2H rivals" deep dive. CEO selected. */
const STANDINGS_NAV_H2H_FOR_CEO = [
  { abbr: 'SZM', played: 2, w: 1, d: 1, l: 0, pf: 113, pa:  98 },
  { abbr: 'DBS', played: 3, w: 2, d: 1, l: 0, pf: 168, pa: 142 },
  { abbr: 'TWG', played: 2, w: 2, d: 0, l: 0, pf: 116, pa:  78 },
  { abbr: 'ESR', played: 2, w: 2, d: 0, l: 0, pf: 122, pa:  94 },
  { abbr: 'DBN', played: 3, w: 2, d: 0, l: 1, pf: 168, pa: 159 },
  { abbr: 'SCC', played: 2, w: 2, d: 0, l: 0, pf: 132, pa:  76 },
  { abbr: 'PFO', played: 3, w: 3, d: 0, l: 0, pf: 195, pa: 121 },
]

/* Wins by margin / Losses by margin — used in the Stats sub-tab. */
const STANDINGS_NAV_MARGIN_BUCKETS = ['>20', '11–20', '1–10', 'Tie']

const STANDINGS_NAV_WINS_BY_MARGIN = [
  { abbr: 'CEO', vals: [4, 5, 3, 0] },
  { abbr: 'SZM', vals: [3, 5, 3, 1] },
  { abbr: 'DBS', vals: [2, 4, 3, 2] },
  { abbr: 'TWG', vals: [2, 4, 3, 1] },
  { abbr: 'ESR', vals: [1, 3, 4, 1] },
  { abbr: 'DBN', vals: [1, 2, 4, 2] },
  { abbr: 'SCC', vals: [1, 1, 4, 1] },
  { abbr: 'PFO', vals: [0, 1, 4, 1] },
]

/* Weeks at the top — Stats sub-tab. */
const STANDINGS_NAV_WEEKS_TOP = [
  { abbr: 'CEO', weeks: 12 },
  { abbr: 'SZM', weeks:  3 },
  { abbr: 'DBS', weeks:  2 },
  { abbr: 'TWG', weeks:  0 },
  { abbr: 'ESR', weeks:  0 },
  { abbr: 'DBN', weeks:  0 },
  { abbr: 'SCC', weeks:  0 },
  { abbr: 'PFO', weeks:  0 },
]

/* Schedule-luck matrix — projected points-difference if each team had
 * played each other team's schedule. Diagonal is "—" (own schedule).
 * Positive = lucky schedule for that team, negative = unlucky. */
const STANDINGS_NAV_LUCK_ROWS = ['CEO','SZM','DBS','TWG','ESR','DBN','SCC','PFO']
const STANDINGS_NAV_LUCK_MATRIX = [
  /* Row: team's actual season. Cell: actual_pts − pts_if_played_col_schedule. */
  /* CEO */ [null, +2, +4, +1,  0, +3, +5, +8],
  /* SZM */ [-2, null, +3, +1, +1, +2, +4, +6],
  /* DBS */ [-3, -1, null,  0, +1, +2, +3, +5],
  /* TWG */ [-1,  0, +1, null,  0, +1, +2, +4],
  /* ESR */ [ 0, -1, -1,  0, null, +1, +2, +3],
  /* DBN */ [-2, -2, -1, -1, -1, null, +1, +2],
  /* SCC */ [-4, -3, -2, -2, -1, -1, null,  0],
  /* PFO */ [-6, -5, -4, -3, -3, -2,  0, null],
]

/* ------------------------------------------------------------------ */
/* Shared chrome: brand strip, standings table mini, GW summary tiles   */
/* ------------------------------------------------------------------ */

function StandingsNavBrandStrip() {
  return (
    <div className="mock-standings-nav-brand">
      <span className="mock-standings-nav-brand__pill" aria-label="TCLOT">
        <TclotLionIcon size={14} />
        <span className="mock-standings-nav-brand__wordmark">TCLOT</span>
      </span>
      <span className="mock-standings-nav-brand__status">
        <span className="mock-standings-nav-brand__status-dot" aria-hidden />
        <span className="mock-standings-nav-brand__status-strong">GW 17</span>
        <span className="mock-standings-nav-brand__status-sep">·</span>
        <span>Complete</span>
      </span>
      <span className="mock-standings-nav-brand__season">2025/26</span>
    </div>
  )
}

/* Compact standings — leader hero card + 4 condensed rows below.
 * Mirrors Variant C chrome, just trimmed so it doesn't dominate the
 * frame and the new GW tiles + sub-nav stay visible without scrolling. */
function StandingsNavTable({ teams = STANDINGS_NAV_TEAMS_MID }) {
  const [leader, ...rest] = teams
  const condensed = rest.slice(0, 4)
  return (
    <div className="mock-standings-nav-table">
      <div className="mock-standings-nav-table__hero">
        <div className="mock-standings-nav-table__hero-eyebrow">
          <span className="mock-standings-nav-table__hero-eyebrow-dot" aria-hidden>★</span>
          Top of the league
        </div>
        <div className="mock-standings-nav-table__hero-row">
          <StandingsCrest team={leader} size={44} fontSize={12} />
          <div className="mock-standings-nav-table__hero-id">
            <div className="mock-standings-nav-table__hero-name">{leader.name}</div>
            <div className="mock-standings-nav-table__hero-mgr">{leader.mgr}</div>
          </div>
          <div className="mock-standings-nav-table__hero-pts">
            <div className="mock-standings-nav-table__hero-pts-num">{leader.pts}</div>
            <div className="mock-standings-nav-table__hero-pts-lbl">PTS</div>
          </div>
        </div>
      </div>
      <table className="mock-standings-nav-table__rows">
        <thead>
          <tr>
            <th className="mock-standings-nav-table__th-rank">#</th>
            <th className="mock-standings-nav-table__th-team">Team</th>
            <th>PL</th>
            <th>GD</th>
            <th className="mock-standings-nav-table__th-pts">PTS</th>
            <th>Form</th>
          </tr>
        </thead>
        <tbody>
          {condensed.map((t) => (
            <tr key={t.abbr}>
              <td className="mock-standings-nav-table__rank">{t.rank}</td>
              <td className="mock-standings-nav-table__team">
                <StandingsCrest team={t} size={18} />
                <span className="mock-standings-nav-table__name">{t.short}</span>
              </td>
              <td>{t.pl}</td>
              <td>{fmtSigned(t.gd)}</td>
              <td className="mock-standings-nav-table__pts">{t.pts}</td>
              <td>
                <StandingsFormDots form={t.form} size={5} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mock-standings-nav-table__more">
        + 3 more · tap to expand full table
      </div>
    </div>
  )
}

/* Side-by-side LAST GW / NEXT GW mini tiles — the new "at-a-glance"
 * summary that sits beneath the standings table. Variant-C-style
 * chrome (rounded card, brand-tinted), half-width each on portrait. */
function StandingsNavGwTiles() {
  return (
    <div className="mock-standings-nav-tiles">
      <StandingsNavLastGwTile gw={STANDINGS_NAV_LAST_GW} />
      <StandingsNavNextGwTile gw={STANDINGS_NAV_NEXT_GW} />
    </div>
  )
}

function StandingsNavLastGwTile({ gw }) {
  return (
    <div className="mock-standings-nav-tile mock-standings-nav-tile--last">
      <div className="mock-standings-nav-tile__head">
        <span className="mock-standings-nav-tile__head-lbl">Last GW</span>
        <span className="mock-standings-nav-tile__head-gw">GW {gw.id}</span>
      </div>
      <div className="mock-standings-nav-tile__body">
        {gw.matches.map((m, i) => {
          const home = STANDINGS_NAV_TEAM_BY_ABBR[m.home]
          const away = STANDINGS_NAV_TEAM_BY_ABBR[m.away]
          const tie = m.homeScore === m.awayScore
          const homeWin = m.homeScore > m.awayScore
          return (
            <div className="mock-standings-nav-tile__match" key={i}>
              <div
                className={
                  'mock-standings-nav-tile__row' +
                  (tie ? '' : (homeWin ? ' is-winner' : ' is-loser'))
                }
              >
                <StandingsCrest team={home} size={14} fontSize={7} />
                <span className="mock-standings-nav-tile__rname">
                  {home.short}
                  <span className="mock-standings-nav-tile__rrank">({home.rank})</span>
                </span>
                <span className="mock-standings-nav-tile__rscore">{m.homeScore}</span>
              </div>
              <div
                className={
                  'mock-standings-nav-tile__row' +
                  (tie ? '' : (homeWin ? ' is-loser' : ' is-winner'))
                }
              >
                <StandingsCrest team={away} size={14} fontSize={7} />
                <span className="mock-standings-nav-tile__rname">
                  {away.short}
                  <span className="mock-standings-nav-tile__rrank">({away.rank})</span>
                </span>
                <span className="mock-standings-nav-tile__rscore">{m.awayScore}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StandingsNavNextGwTile({ gw }) {
  return (
    <div className="mock-standings-nav-tile mock-standings-nav-tile--next">
      <div className="mock-standings-nav-tile__head">
        <span className="mock-standings-nav-tile__head-lbl">Next GW</span>
        <span className="mock-standings-nav-tile__head-gw">GW {gw.id}</span>
      </div>
      <div className="mock-standings-nav-tile__body">
        {gw.matches.map((m, i) => {
          const home = STANDINGS_NAV_TEAM_BY_ABBR[m.home]
          const away = STANDINGS_NAV_TEAM_BY_ABBR[m.away]
          return (
            <div className="mock-standings-nav-tile__match" key={i}>
              <div className="mock-standings-nav-tile__row">
                <StandingsCrest team={home} size={14} fontSize={7} />
                <span className="mock-standings-nav-tile__rname">
                  {home.short}
                  <span className="mock-standings-nav-tile__rrank">({home.rank})</span>
                </span>
              </div>
              <div className="mock-standings-nav-tile__vs" aria-hidden>vs</div>
              <div className="mock-standings-nav-tile__row">
                <StandingsCrest team={away} size={14} fontSize={7} />
                <span className="mock-standings-nav-tile__rname">
                  {away.short}
                  <span className="mock-standings-nav-tile__rrank">({away.rank})</span>
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Sub-nav — pill-tab text-link style (Variant A) and segmented
 * control (Variant B). Both render the same tab labels and active
 * state lookup; only the chrome differs. */
const STANDINGS_NAV_TABS = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'form',     label: 'Form' },
  { id: 'stats',    label: 'Stats' },
]

function StandingsNavSubNav({ active = 'schedule', variant = 'pill' }) {
  const isSegmented = variant === 'segmented'
  return (
    <div
      className={
        'mock-standings-nav-subnav' +
        (isSegmented ? ' mock-standings-nav-subnav--segmented' : ' mock-standings-nav-subnav--pill')
      }
      role="tablist"
    >
      {STANDINGS_NAV_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === active}
          className={
            'mock-standings-nav-subnav__tab' +
            (t.id === active ? ' is-active' : '')
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Schedule sub-tab content ----------------------- */

function StandingsNavSchedulePanel() {
  return (
    <div className="mock-standings-nav-panel">
      <div className="mock-standings-nav-panel__eyebrow">All gameweeks</div>
      <div className="mock-standings-nav-schedule">
        <div className="mock-standings-nav-schedule__seg" role="tablist">
          <button
            type="button"
            className="mock-standings-nav-schedule__seg-btn is-active"
            aria-selected="true"
          >
            Results
            <span className="mock-standings-nav-schedule__seg-count">17</span>
          </button>
          <button
            type="button"
            className="mock-standings-nav-schedule__seg-btn"
            aria-selected="false"
          >
            Upcoming
            <span className="mock-standings-nav-schedule__seg-count">21</span>
          </button>
        </div>
        <div className="mock-standings-nav-schedule__picker">
          <button
            type="button"
            className="mock-standings-nav-schedule__picker-btn"
            aria-label="Previous gameweek"
          >‹</button>
          <span className="mock-standings-nav-schedule__picker-lbl">GW 17</span>
          <button
            type="button"
            className="mock-standings-nav-schedule__picker-btn"
            aria-label="Next gameweek"
          >›</button>
        </div>
        <div className="mock-standings-nav-schedule__matches">
          {STANDINGS_NAV_LAST_GW.matches.map((m, i) => {
            const home = STANDINGS_NAV_TEAM_BY_ABBR[m.home]
            const away = STANDINGS_NAV_TEAM_BY_ABBR[m.away]
            const tie = m.homeScore === m.awayScore
            const homeWin = m.homeScore > m.awayScore
            return (
              <div className="mock-standings-nav-schedule__match" key={i}>
                <div
                  className={
                    'mock-standings-nav-schedule__side' +
                    (tie ? '' : (homeWin ? ' is-winner' : ' is-loser'))
                  }
                >
                  <StandingsCrest team={home} size={18} fontSize={8} />
                  <span className="mock-standings-nav-schedule__sname">
                    {home.short}
                  </span>
                  <span className="mock-standings-nav-schedule__srank">({home.rank})</span>
                </div>
                <div className="mock-standings-nav-schedule__score">
                  <span
                    className={
                      'mock-standings-nav-schedule__sn' +
                      (tie ? '' : (homeWin ? ' is-winner' : ' is-loser'))
                    }
                  >
                    {m.homeScore}
                  </span>
                  <span className="mock-standings-nav-schedule__dash">–</span>
                  <span
                    className={
                      'mock-standings-nav-schedule__sn' +
                      (tie ? '' : (homeWin ? ' is-loser' : ' is-winner'))
                    }
                  >
                    {m.awayScore}
                  </span>
                </div>
                <div
                  className={
                    'mock-standings-nav-schedule__side mock-standings-nav-schedule__side--right' +
                    (tie ? '' : (homeWin ? ' is-loser' : ' is-winner'))
                  }
                >
                  <span className="mock-standings-nav-schedule__srank">({away.rank})</span>
                  <span className="mock-standings-nav-schedule__sname">
                    {away.short}
                  </span>
                  <StandingsCrest team={away} size={18} fontSize={8} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mock-standings-nav-schedule__foot">
          ‹ GW 16 · jump to a specific gameweek · GW 18 ›
        </div>
      </div>
    </div>
  )
}

/* ---------------- Form sub-tab content --------------------------- */

function StandingsNavFormPanel() {
  return (
    <div className="mock-standings-nav-panel">
      <div className="mock-standings-nav-panel__eyebrow">League form · last 5 GWs</div>
      <div className="mock-standings-nav-form-leader">
        {STANDINGS_NAV_FORM_LEADERBOARD.map((t, idx) => (
          <div className="mock-standings-nav-form-leader__row" key={t.abbr}>
            <span className="mock-standings-nav-form-leader__rank">{idx + 1}</span>
            <StandingsCrest team={t} size={18} fontSize={8} />
            <span className="mock-standings-nav-form-leader__name">{t.short}</span>
            <span className="mock-standings-nav-form-leader__dots">
              <StandingsFormDots form={t.form} size={6} />
            </span>
            <span className="mock-standings-nav-form-leader__pts">
              {t.pts5}
              <span className="mock-standings-nav-form-leader__pts-lbl">pts</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mock-standings-nav-panel__eyebrow mock-standings-nav-panel__eyebrow--spaced">
        Head-to-head rivals
      </div>
      <div className="mock-standings-nav-form-h2h">
        <div className="mock-standings-nav-form-h2h__picker">
          <span className="mock-standings-nav-form-h2h__picker-lbl">Team</span>
          <button
            type="button"
            className="mock-standings-nav-form-h2h__picker-btn"
            aria-haspopup="listbox"
          >
            <StandingsCrest
              team={STANDINGS_NAV_TEAM_BY_ABBR.CEO}
              size={16}
              fontSize={7}
            />
            <span className="mock-standings-nav-form-h2h__picker-name">
              Crouch End Oashisu
            </span>
            <span className="mock-standings-nav-form-h2h__picker-chev" aria-hidden>▾</span>
          </button>
        </div>
        <table className="mock-standings-nav-form-h2h__table">
          <thead>
            <tr>
              <th className="mock-standings-nav-form-h2h__th-team">vs</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>PF</th>
              <th>PA</th>
            </tr>
          </thead>
          <tbody>
            {STANDINGS_NAV_H2H_FOR_CEO.map((r) => {
              const t = STANDINGS_NAV_TEAM_BY_ABBR[r.abbr]
              return (
                <tr key={r.abbr}>
                  <td className="mock-standings-nav-form-h2h__team">
                    <StandingsCrest team={t} size={14} fontSize={7} />
                    <span>{t.short}</span>
                  </td>
                  <td>{r.played}</td>
                  <td>{r.w}</td>
                  <td>{r.d}</td>
                  <td>{r.l}</td>
                  <td>{r.pf}</td>
                  <td>{r.pa}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- Stats sub-tab content -------------------------- */

function StandingsNavStatsPanel() {
  return (
    <div className="mock-standings-nav-panel">
      <div className="mock-standings-nav-panel__eyebrow">Wins by margin</div>
      <div className="mock-standings-nav-stats__toggle" role="tablist">
        <button
          type="button"
          className="mock-standings-nav-stats__toggle-btn is-active"
          aria-selected="true"
        >Wins</button>
        <button
          type="button"
          className="mock-standings-nav-stats__toggle-btn"
          aria-selected="false"
        >Losses</button>
      </div>
      <StandingsNavMarginTable rows={STANDINGS_NAV_WINS_BY_MARGIN} tone="win" />

      <div className="mock-standings-nav-panel__eyebrow mock-standings-nav-panel__eyebrow--spaced">
        Game weeks in 1st place
      </div>
      <div className="mock-standings-nav-stats__toggle" role="tablist">
        <button
          type="button"
          className="mock-standings-nav-stats__toggle-btn is-active"
          aria-selected="true"
        >1st</button>
        <button
          type="button"
          className="mock-standings-nav-stats__toggle-btn"
          aria-selected="false"
        >Last 🧩</button>
      </div>
      <StandingsNavWeeksTable rows={STANDINGS_NAV_WEEKS_TOP} totalGw={17} tone="top" />

      <div className="mock-standings-nav-panel__eyebrow mock-standings-nav-panel__eyebrow--spaced">
        Schedule luck matrix
      </div>
      <StandingsNavLuckMatrix />
    </div>
  )
}

function StandingsNavMarginTable({ rows, tone = 'win' }) {
  return (
    <table className={'mock-standings-nav-margin mock-standings-nav-margin--' + tone}>
      <thead>
        <tr>
          <th className="mock-standings-nav-margin__th-team">Team</th>
          {STANDINGS_NAV_MARGIN_BUCKETS.map((b) => (
            <th key={b}>{b}</th>
          ))}
          <th className="mock-standings-nav-margin__th-total">Σ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const t = STANDINGS_NAV_TEAM_BY_ABBR[r.abbr]
          const total = r.vals.reduce((s, n) => s + n, 0)
          return (
            <tr key={r.abbr}>
              <td className="mock-standings-nav-margin__team">
                <StandingsCrest team={t} size={14} fontSize={7} />
                <span>{t.short}</span>
              </td>
              {r.vals.map((v, i) => (
                <td key={i} className={v ? '' : 'is-zero'}>{v}</td>
              ))}
              <td className="mock-standings-nav-margin__total">{total}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function StandingsNavWeeksTable({ rows, totalGw, tone = 'top' }) {
  return (
    <table className={'mock-standings-nav-weeks mock-standings-nav-weeks--' + tone}>
      <thead>
        <tr>
          <th className="mock-standings-nav-weeks__th-team">Team</th>
          <th>Weeks</th>
          <th>%</th>
          <th>Bar</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const t = STANDINGS_NAV_TEAM_BY_ABBR[r.abbr]
          const pct = totalGw > 0 ? Math.round((r.weeks / totalGw) * 100) : 0
          return (
            <tr key={r.abbr}>
              <td className="mock-standings-nav-weeks__team">
                <StandingsCrest team={t} size={14} fontSize={7} />
                <span>{t.short}</span>
              </td>
              <td className="mock-standings-nav-weeks__weeks">{r.weeks}</td>
              <td className="mock-standings-nav-weeks__pct">{pct}%</td>
              <td className="mock-standings-nav-weeks__bar-cell">
                <span className="mock-standings-nav-weeks__bar">
                  <span
                    className="mock-standings-nav-weeks__bar-fill"
                    style={{ width: pct + '%' }}
                  />
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function StandingsNavLuckMatrix() {
  return (
    <div className="mock-standings-nav-luck">
      <div className="mock-standings-nav-luck__legend">
        Cell = actual pts − pts if you played that team&apos;s schedule.
        Greener = luckier draw.
      </div>
      <div className="mock-standings-nav-luck__scroll">
        <table className="mock-standings-nav-luck__table">
          <thead>
            <tr>
              <th />
              {STANDINGS_NAV_LUCK_ROWS.map((abbr) => {
                const t = STANDINGS_NAV_TEAM_BY_ABBR[abbr]
                return (
                  <th key={abbr} title={t.name}>
                    <StandingsCrest team={t} size={14} fontSize={7} />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {STANDINGS_NAV_LUCK_MATRIX.map((row, i) => {
              const rowTeam = STANDINGS_NAV_TEAM_BY_ABBR[STANDINGS_NAV_LUCK_ROWS[i]]
              return (
                <tr key={i}>
                  <th title={rowTeam.name}>
                    <StandingsCrest team={rowTeam} size={14} fontSize={7} />
                  </th>
                  {row.map((cell, j) => {
                    if (cell === null) {
                      return (
                        <td key={j} className="is-diag">—</td>
                      )
                    }
                    const tone =
                      cell > 0 ? 'pos' :
                      cell < 0 ? 'neg' : 'neu'
                    const intensity = Math.min(Math.abs(cell), 8)
                    return (
                      <td
                        key={j}
                        className={'is-' + tone}
                        style={{
                          '--mock-luck-alpha': (intensity / 8).toFixed(2),
                        }}
                      >
                        {fmtSigned(cell)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Frame composition — five phone frames                                */
/* ------------------------------------------------------------------ */

function StandingsNavFrame({ children }) {
  return (
    <div className="mock-standings-nav__frame">
      <div className="mock-standings-nav__screen">
        {children}
      </div>
    </div>
  )
}

function StandingsNavFrameShell({
  eyebrow,
  caption,
  subnavVariant = 'pill',
  active = 'schedule',
  children,
}) {
  return (
    <div className="mock-standings-nav__variant">
      <div className="mock-standings-nav__variant-label">
        <strong>{eyebrow}</strong> · {caption}
      </div>
      <StandingsNavFrame>
        <StandingsNavBrandStrip />
        <div className="mock-standings-nav__body">
          <StandingsNavTable />
          <StandingsNavGwTiles />
          <div className="mock-standings-nav__subnav-band">
            <StandingsNavSubNav active={active} variant={subnavVariant} />
          </div>
          {children}
        </div>
      </StandingsNavFrame>
    </div>
  )
}

function StandingsNavShowcase() {
  return (
    <div className="mock-standings-nav">
      <div className="mock-standings-nav__intro">
        <div className="mock-standings-nav__intro-h">What&apos;s new vs the A–E set above</div>
        <ul className="mock-standings-nav__intro-list">
          <li>
            <strong>Side-by-side GW tiles</strong> beneath the standings
            table — half-width <em>Last GW · GW 17</em> results on the left,
            half-width <em>Next GW · GW 18</em> fixtures on the right.
            Compact crest + abbreviated name + rank; winner score bold,
            loser muted.
          </li>
          <li>
            <strong>Sub-nav</strong> with three sections: Schedule · Form ·
            Stats. Schedule merges the legacy &ldquo;Complete&rdquo; +
            &ldquo;Future&rdquo; GW lists into one segmented tile. Form
            owns the team-picker H2H deep-dive plus a new league form
            leaderboard. Stats consolidates the four legacy miscellaneous
            tables (wins/losses by margin, weeks at top/bottom, schedule
            luck matrix).
          </li>
          <li>
            <strong>Frame 1 vs Frame 5</strong> shows two sub-nav
            chromes side by side — pill-tab text links (A) vs segmented
            control (B) — for an A/B pick.
          </li>
        </ul>
        <div className="mock-standings-nav__intro-shared">
          Shared across all five frames: brand header strip, compact
          leader hero + 4 condensed rows, side-by-side GW tiles, sub-nav
          band. Sub-tab content body is the only thing that swaps.
        </div>
      </div>

      <div className="mock-standings-nav__stack">
        <StandingsNavFrameShell
          eyebrow="Frame 1 — Variant A · pill tabs · Schedule active"
          caption="Default landing. Schedule sub-tab is selected; the content shows the merged GW results / upcoming view."
          subnavVariant="pill"
          active="schedule"
        >
          <StandingsNavSchedulePanel />
        </StandingsNavFrameShell>

        <StandingsNavFrameShell
          eyebrow="Frame 2 — Schedule sub-tab expanded"
          caption="Segmented Results / Upcoming inside one tile; GW chevron picker; the four H2H matchups for the selected GW with full team names and clear winner emphasis."
          subnavVariant="pill"
          active="schedule"
        >
          <StandingsNavSchedulePanel />
        </StandingsNavFrameShell>

        <StandingsNavFrameShell
          eyebrow="Frame 3 — Form sub-tab expanded"
          caption="League form leaderboard at the top (last-5 dots + total pts), per-team H2H rivals deep-dive below (team-picker dropdown + compact opponent table)."
          subnavVariant="pill"
          active="form"
        >
          <StandingsNavFormPanel />
        </StandingsNavFrameShell>

        <StandingsNavFrameShell
          eyebrow="Frame 4 — Stats sub-tab expanded"
          caption="Three sections stacked with eyebrow headings: wins/losses by margin (W/L toggle), weeks at top/bottom (1st/Last toggle), and a compact schedule-luck matrix."
          subnavVariant="pill"
          active="stats"
        >
          <StandingsNavStatsPanel />
        </StandingsNavFrameShell>

        <StandingsNavFrameShell
          eyebrow="Frame 5 — Variant B · segmented control · Schedule active"
          caption="Same surface as Frame 1, but the sub-nav uses a segmented control (pill-encased rounded rectangles) instead of pill-tab text links. Lets the user A/B the chrome."
          subnavVariant="segmented"
          active="schedule"
        >
          <StandingsNavSchedulePanel />
        </StandingsNavFrameShell>
      </div>
    </div>
  )
}

/* ================================================================== */
/* HALL OF FAME — Trophy Room + History mockups                         */
/* ------------------------------------------------------------------ */
/* All teams, manager names, finishing positions, and historic         */
/* standings here are MOCK DATA. Eyebrow text in the rendered section  */
/* discloses this so the user doesn't mistake it for production data.  */
/* Uses banner PNGs in /hall-champions/ where available; cycles four   */
/* unique team banners across the 8 mocked seasons (some teams "won"   */
/* multiple titles).                                                   */
/* ================================================================== */
const HOF_TEAMS = [
  { id: 'CO',  name: 'Crouch End Oashisu',  mgr: 'David Higman',   color: '#7e57ff' },
  { id: 'SZM', name: 'Soul Ze Moles',       mgr: 'Eddy Webster',   color: '#e94343' },
  { id: 'DB',  name: 'Dalston Bellsprouts', mgr: 'Tom Roberts',    color: '#28b269' },
  { id: 'TW',  name: 'Toronto Wiggum',      mgr: 'Andy Ward',      color: '#f79233' },
  { id: 'ER',  name: 'Essex Ratigans',      mgr: 'Mike Sutton',    color: '#3a8dde' },
  { id: 'DN',  name: 'Dalston Benoit',      mgr: 'Nick Goodacre',  color: '#9c6b3c' },
  { id: 'SCC', name: 'Soul Crouch Carrol',  mgr: 'Luke Butcher',   color: '#cf4d8e' },
  { id: 'PFO', name: 'Pinks Five-O',        mgr: 'Jon Ward',       color: '#c2497a' },
]

const HOF_TEAM_BY_ID = HOF_TEAMS.reduce((m, t) => { m[t.id] = t; return m }, {})

const HOF_BANNER_FOR_TEAM = {
  CO:  '/hall-champions/crouch-end-oashisu.png',
  SZM: '/hall-champions/soul-ze-moles.png',
  DB:  '/hall-champions/dalston-bellsprouts.png',
  TW:  '/hall-champions/toronto-wiggum.png',
}

const HOF_SEASONS = ['18/19', '19/20', '20/21', '21/22', '22/23', '23/24', '24/25', '25/26']

/* Per-season finishing positions: HOF_POSITIONS[teamId][seasonIdx]
 * = finishing rank (1 = champion, 8 = wooden spoon). Values verified
 * unique 1–8 per season column. Crouch End wins 4 / Soul Ze Moles 2 /
 * Dalston Bellsprouts 1 / Toronto Wiggum 1, per spec. */
const HOF_POSITIONS = {
  CO:  [3, 2, 1, 2, 1, 2, 1, 1],
  SZM: [1, 4, 5, 3, 2, 1, 4, 2],
  DB:  [4, 1, 3, 5, 4, 3, 2, 3],
  TW:  [2, 3, 4, 1, 3, 5, 6, 4],
  ER:  [5, 5, 2, 6, 5, 6, 3, 5],
  DN:  [7, 7, 6, 4, 6, 4, 7, 6],
  SCC: [6, 8, 8, 7, 8, 8, 8, 8],
  PFO: [8, 6, 7, 8, 7, 7, 5, 7],
}

/* Build a banner per season (the team that won that season). */
const HOF_BANNERS = HOF_SEASONS.map((season, idx) => {
  const winnerId = Object.keys(HOF_POSITIONS).find((tid) => HOF_POSITIONS[tid][idx] === 1)
  const team = HOF_TEAM_BY_ID[winnerId]
  return {
    season,
    teamId: winnerId,
    team: team.name,
    mgr: team.mgr,
    image: HOF_BANNER_FOR_TEAM[winnerId] ?? null,
    color: team.color,
    isLive: idx === HOF_SEASONS.length - 1,
  }
})

/* Per-team title and runner-up totals derived from HOF_POSITIONS. */
function hofCountFinish(rank) {
  const out = {}
  for (const tid of Object.keys(HOF_POSITIONS)) {
    out[tid] = HOF_POSITIONS[tid].filter((p) => p === rank).length
  }
  return out
}
const HOF_TITLES_BY_TEAM = hofCountFinish(1)
const HOF_RUNNERUPS_BY_TEAM = hofCountFinish(2)

/* Mock final standings detail per season — used by Historic Standings
 * dropdown. Only 25/26 carries full row data; prior seasons synthesise
 * realistic-ish numbers from the position. */
function buildHistoricStandings(seasonIdx) {
  const ranked = HOF_TEAMS
    .map((t) => ({ team: t, rank: HOF_POSITIONS[t.id][seasonIdx] }))
    .sort((a, b) => a.rank - b.rank)
  return ranked.map(({ team, rank }) => {
    /* Pyramid-ish synthesis: top teams have more wins / better GD. */
    const w = 27 - (rank - 1) * 2 - (seasonIdx % 3)
    const d = 7 + ((rank + seasonIdx) % 3)
    const l = 38 - w - d
    const gf = 2400 - (rank - 1) * 50 - (seasonIdx % 4) * 8
    const ga = 2050 + (rank - 1) * 35 + (seasonIdx % 4) * 6
    const gd = gf - ga
    const pts = w * 3 + d
    return {
      rank,
      team: team.name,
      mgr: team.mgr,
      teamId: team.id,
      pl: 38, w, d, l,
      gf, ga, gd, pts,
    }
  })
}

const HOF_HISTORIC_STANDINGS = HOF_SEASONS.reduce((m, season, idx) => {
  m[season] = buildHistoricStandings(idx)
  return m
}, {})

/* ------------------------------------------------------------------ */
/* HOF · merged team-name + finishing position data                     */
/* ------------------------------------------------------------------ */
/* Anchors history on managers (their first names are the stable
 * identity — team names rebrand every season). Real ranks + team names
 * for 20/21 → 24/25 come from `hallManagerHistory.js`. The 25/26 row is
 * fabricated to keep the merged variants self-contained inside Mockup —
 * Luke wins, per the team-name-table screenshot the user shared.
 *
 * NOTE: this dataset deliberately does NOT use HOF_POSITIONS (the
 * position-heatmap matrix that the rest of HOF uses). HOF_POSITIONS is
 * keyed by current team-id with fictional managers (e.g. SZM/Eddy
 * Webster, SCC/Luke Butcher) that do not 1:1 map to the real manager
 * identities in hallManagerHistory. Composing them honestly would have
 * required either re-attributing teams (changes the heatmap story) or
 * inventing a manager↔team-id bridge (introduces noise). Anchoring on
 * the manager-first history and fabricating one 25/26 row keeps each
 * merged variant internally consistent at the cost of mild divergence
 * from H-D1/H-D2's tally — flagged in the return summary. */
const MERGED_MGR_KEYS = ['Andy', 'David', 'Eddy', 'Jon', 'Luke', 'Mike', 'Nick G', 'Nick M']

const MERGED_MGR_META = {
  Andy:     { initials: 'AW', color: '#f79233', fullName: 'Andy Ward' },
  David:    { initials: 'DH', color: '#7e57ff', fullName: 'David Higman' },
  Eddy:     { initials: 'EW', color: '#c0392b', fullName: 'Eddy Webster' },
  Jon:      { initials: 'JW', color: '#c2497a', fullName: 'Jon Ward' },
  Luke:     { initials: 'LB', color: '#2bb1d9', fullName: 'Luke Butcher' },
  Mike:     { initials: 'MS', color: '#3a8dde', fullName: 'Mike Sutton' },
  'Nick G': { initials: 'NG', color: '#9c6b3c', fullName: 'Nick Goodacre' },
  'Nick M': { initials: 'NM', color: '#28b269', fullName: 'Nick Mottershead' },
}

/* 6-column run — 18/19 + 19/20 dropped (the league existed but the
 * mocked-data table starts at 20/21). Keeping six matches the
 * team-name-by-season screenshot the user pasted exactly. */
const MERGED_SEASONS = ['20/21', '21/22', '22/23', '23/24', '24/25', '25/26']

/* Mocked 25/26 final table — anchored on the user's team-name table
 * (Luke = "Seoul Club 7" with trophy emoji = champion). Other ranks
 * fabricated for the merged variants only. */
const MERGED_LIVE_2526 = [
  { manager: 'Luke',   team: 'Seoul Club 7',       rank: 1 },
  { manager: 'David',  team: 'Crouch End Oashisu', rank: 2 },
  { manager: 'Andy',   team: 'Toronto Oizo',       rank: 3 },
  { manager: 'Eddy',   team: 'Brampton II Men',    rank: 4 },
  { manager: 'Nick',   team: 'Hanson of York AFC', rank: 5 },
  { manager: 'Nick',   team: 'Hackney Meat Loaf',  rank: 6 },
  { manager: 'Mike',   team: 'Clapton Cornershop', rank: 7 },
  { manager: 'Jon',    team: 'Morpeth Jamiroquai', rank: 8 },
]

function shortenSeasonLabel(season) {
  /* '2020-21' → '20/21' */
  const m = /^(\d{2})(\d{2})-(\d{2})$/.exec(String(season))
  return m ? `${m[2]}/${m[3]}` : String(season)
}

function buildMergedHistory() {
  const seasonRows = [
    ...HALL_SEASON_FINAL_TABLES.map(({ season, rows }) => ({
      label: shortenSeasonLabel(season),
      rows,
    })),
    { label: '25/26', rows: MERGED_LIVE_2526 },
  ]
  const byMgr = {}
  for (const key of MERGED_MGR_KEYS) byMgr[key] = {}
  for (const { label, rows } of seasonRows) {
    for (const r of rows) {
      const mgrKey = hallManagerDisplayKey(r.team, r.manager)
      if (!byMgr[mgrKey]) byMgr[mgrKey] = {}
      byMgr[mgrKey][label] = { team: r.team, rank: r.rank }
    }
  }
  return MERGED_MGR_KEYS.map((key) => {
    const seasons = MERGED_SEASONS.map((s) => ({
      season: s,
      team: byMgr[key]?.[s]?.team ?? null,
      rank: byMgr[key]?.[s]?.rank ?? null,
    }))
    const ranks = seasons.map((s) => s.rank).filter(Boolean)
    const titles = ranks.filter((r) => r === 1).length
    const ru = ranks.filter((r) => r === 2).length
    const best = ranks.length ? Math.min(...ranks) : null
    return { key, meta: MERGED_MGR_META[key], seasons, titles, ru, best }
  })
}

const MERGED_HISTORY = buildMergedHistory()

/* Sort: titles desc, then runner-ups, then best rank — matches the
 * sort used by HOF_TITLES_BY_TEAM / runner-up tie-break. */
const MERGED_HISTORY_SORTED = [...MERGED_HISTORY].sort((a, b) => {
  if (b.titles !== a.titles) return b.titles - a.titles
  if (b.ru !== a.ru) return b.ru - a.ru
  return (a.best ?? 9) - (b.best ?? 9)
})

/* ------------------------------------------------------------------ */
/* HOF · shared atoms                                                   */
/* ------------------------------------------------------------------ */
function HofBannerImage({ banner, fit = 'cover' }) {
  if (banner.image) {
    return (
      <img
        className="hof-banner__img"
        src={banner.image}
        alt={`${banner.team} ${banner.season} champion banner`}
        style={{ objectFit: fit }}
      />
    )
  }
  /* Fallback for any season without a real PNG — themed gradient with
   * team initials so the layout still reads. */
  const initials = banner.team
    .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <div
      className="hof-banner__fallback"
      style={{
        background: `linear-gradient(135deg, ${banner.color} 0%, color-mix(in srgb, ${banner.color} 60%, #000) 100%)`,
      }}
    >
      <span>{initials}</span>
    </div>
  )
}

function HofSectionLabel({ children }) {
  return <div className="hof-mock-eyebrow">{children}</div>
}

/* ------------------------------------------------------------------ */
/* TROPHY ROOM — locked spec (T-D carousel + 6-grid toggle)             */
/* ------------------------------------------------------------------ */
/* Locked direction from the user:
 *   - Default state: scrolling/swipe carousel (latest season first)
 *   - Toggle (subtle, top-right of screen) flips to a view-all grid
 *   - Grid is 6 cells (2 × 3) — the most recent 6 banners. The full
 *     8-cell prior spec is retired; older banners are accessible by
 *     swiping back inside the carousel.
 * Both views share the same brand-tinted celebratory dark backdrop.
 * The toggle is rendered as a 2-icon segmented pill: carousel icon
 * (single image) and grid icon (4 squares). */

/* Lock the grid to the most-recent 6 banners, latest first. */
const HOF_GRID_BANNERS = HOF_BANNERS.slice(-6).reverse()

/* Default carousel landing index — latest season. */
const HOF_CAROUSEL_DEFAULT_IDX = HOF_BANNERS.length - 1

function TrophyRoomViewToggle({ mode, onCarousel, onGrid, size = 'md' }) {
  return (
    <div
      className={
        'hof-troom__vtoggle hof-troom__vtoggle--' + size
      }
      role="group"
      aria-label="Trophy room view"
    >
      <button
        type="button"
        className={
          'hof-troom__vtoggle-btn' + (mode === 'carousel' ? ' is-active' : '')
        }
        aria-pressed={mode === 'carousel'}
        aria-label="Carousel view"
        onClick={onCarousel}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <circle cx="9" cy="11" r="1.4" />
          <path d="M20 16l-3.5-4.5L13 16l-2-2.5L8 16" />
        </svg>
      </button>
      <button
        type="button"
        className={
          'hof-troom__vtoggle-btn' + (mode === 'grid' ? ' is-active' : '')
        }
        aria-pressed={mode === 'grid'}
        aria-label="Grid view"
        onClick={onGrid}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.4" />
          <rect x="14" y="3" width="7" height="7" rx="1.4" />
          <rect x="3" y="14" width="7" height="7" rx="1.4" />
          <rect x="14" y="14" width="7" height="7" rx="1.4" />
        </svg>
      </button>
    </div>
  )
}

/* Carousel state — one banner full-bleed, neighbors peek either side,
 * dot indicators at the bottom. Toggle pill in the top-right corner. */
function TrophyRoomCarouselFrame({ activeIdx = HOF_CAROUSEL_DEFAULT_IDX, onToggleMode }) {
  const total = HOF_BANNERS.length
  const prev = HOF_BANNERS[(activeIdx - 1 + total) % total]
  const cur = HOF_BANNERS[activeIdx]
  const next = HOF_BANNERS[(activeIdx + 1) % total]
  return (
    <div className="hof-troom hof-troom--swipe">
      <TrophyRoomViewToggle
        mode="carousel"
        onCarousel={() => {}}
        onGrid={() => onToggleMode && onToggleMode('grid')}
      />
      <div className="hof-troom__swipe-stage">
        <div className="hof-troom__swipe-peek hof-troom__swipe-peek--prev" aria-hidden>
          <HofBannerImage banner={prev} fit="cover" />
        </div>
        <div className="hof-troom__swipe-active">
          <HofBannerImage banner={cur} fit="cover" />
        </div>
        <div className="hof-troom__swipe-peek hof-troom__swipe-peek--next" aria-hidden>
          <HofBannerImage banner={next} fit="cover" />
        </div>
      </div>
      <div className="hof-troom__swipe-dots" role="tablist" aria-label="Banner">
        {HOF_BANNERS.map((b, i) => (
          <span
            key={b.season}
            className={'hof-troom__swipe-dot' + (i === activeIdx ? ' is-active' : '')}
            role="tab"
            aria-selected={i === activeIdx}
          />
        ))}
      </div>
    </div>
  )
}

/* View-all grid — 2 cols × 3 rows of the most-recent 6 banners. Same
 * celebratory backdrop. Toggle pill in the top-right corner. */
function TrophyRoomGridFrame({ onToggleMode }) {
  return (
    <div className="hof-troom hof-troom--viewall">
      <TrophyRoomViewToggle
        mode="grid"
        onCarousel={() => onToggleMode && onToggleMode('carousel')}
        onGrid={() => {}}
      />
      <div className="hof-troom__viewall-grid hof-troom__viewall-grid--6">
        {HOF_GRID_BANNERS.map((b) => (
          <button
            key={b.season}
            type="button"
            className="hof-troom__viewall-card"
            aria-label={`Open ${b.team} ${b.season} banner`}
          >
            <HofBannerImage banner={b} fit="cover" />
          </button>
        ))}
      </div>
    </div>
  )
}

/* Stateful wrapper that flips between carousel and grid via the
 * top-right toggle. Used inside a single PortraitFrame so the
 * mockup behaves like the runtime experience. */
function TrophyRoomLockedFrame({ initialMode = 'carousel', initialIdx = HOF_CAROUSEL_DEFAULT_IDX }) {
  const [mode, setMode] = useState(initialMode)
  if (mode === 'grid') {
    return <TrophyRoomGridFrame onToggleMode={setMode} />
  }
  return <TrophyRoomCarouselFrame activeIdx={initialIdx} onToggleMode={setMode} />
}

/* Toggle UX detail — zoomed-in render of just the toggle pill on a
 * cropped dark backdrop, with annotations for the active/inactive
 * states. Used in the "toggle UX detail" frame in the mockup. */
function TrophyRoomToggleDetail() {
  return (
    <div className="hof-troom hof-troom--toggle-detail">
      <div className="hof-troom__toggle-detail-bg" aria-hidden />
      <div className="hof-troom__toggle-detail-stack">
        <div className="hof-troom__toggle-detail-row">
          <TrophyRoomViewToggle mode="carousel" onCarousel={() => {}} onGrid={() => {}} size="lg" />
          <div className="hof-troom__toggle-detail-caption">
            <div className="hof-troom__toggle-detail-eyebrow">Carousel mode active</div>
            <div className="hof-troom__toggle-detail-text">
              Brand-violet pill behind the carousel icon. Grid icon sits
              muted on the same dark glass background.
            </div>
          </div>
        </div>
        <div className="hof-troom__toggle-detail-row">
          <TrophyRoomViewToggle mode="grid" onCarousel={() => {}} onGrid={() => {}} size="lg" />
          <div className="hof-troom__toggle-detail-caption">
            <div className="hof-troom__toggle-detail-eyebrow">Grid mode active</div>
            <div className="hof-troom__toggle-detail-text">
              Tap the carousel icon to return to full-bleed swipe.
            </div>
          </div>
        </div>
        <div className="hof-troom__toggle-detail-note">
          Toggle sits absolute top-right of the trophy-room screen,
          inside a subtle dark-glass pill so it never competes with
          the banner art.
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* HISTORY — shared building blocks                                     */
/* ------------------------------------------------------------------ */

/* Team History table — finishing position per team per season + title
 * / runner-up tally on the far right. Used by H-A/H-B/H-C and visible
 * on its own. */
function TeamHistoryTable({ compact = false }) {
  const rowsByTotalScore = HOF_TEAMS
    .map((t) => ({
      team: t,
      positions: HOF_POSITIONS[t.id],
      titles: HOF_TITLES_BY_TEAM[t.id],
      ru: HOF_RUNNERUPS_BY_TEAM[t.id],
      score: HOF_POSITIONS[t.id].reduce((s, p) => s + (9 - p), 0),
    }))
    .sort((a, b) => b.score - a.score)
  return (
    <div className={'hof-table hof-table--team-history' + (compact ? ' hof-table--compact' : '')}>
      <table>
        <thead>
          <tr>
            <th className="hof-th-team">Team</th>
            {HOF_SEASONS.map((s) => <th key={s} className="hof-th-season">{s}</th>)}
            <th className="hof-th-meta">Titles</th>
            <th className="hof-th-meta">Runner-up</th>
          </tr>
        </thead>
        <tbody>
          {rowsByTotalScore.map(({ team, positions, titles, ru }) => (
            <tr key={team.id}>
              <td className="hof-td-team">
                <span className="hof-team-cell">
                  <span className="hof-team-cell__crest" style={{ background: team.color }}>
                    {team.id}
                  </span>
                  <span className="hof-team-cell__text">
                    <span className="hof-team-cell__name">{team.name}</span>
                    {!compact && <span className="hof-team-cell__mgr">{team.mgr}</span>}
                  </span>
                </span>
              </td>
              {positions.map((p, i) => (
                <td key={i} className={'hof-td-pos hof-td-pos--' + p}>{p}</td>
              ))}
              <td className="hof-td-meta">{titles}</td>
              <td className="hof-td-meta">{ru}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* Build manager-initial bubbles (e.g. "Andy Ward" → "AW"). Used by the
 * refined Historic Standings table per the user's locked spec:
 *   - bubbles carry manager identity (initials in team-color tint)
 *   - dedicated Manager column is dropped (redundant once the bubble
 *     identifies the manager) */
function managerInitialsFromName(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/* Historic Standings table — full final standings for the selected
 * season. Refinements per locked spec:
 *   1. Bubble shows manager initials (e.g. DH, EW), not team-id (CO).
 *      Team-color background is preserved.
 *   2. Dedicated Manager column dropped.
 *   3. Team-cell column is left-aligned (was inheriting right-align).
 *   4. Current season (25/26) is plain "25/26" in the dropdown — no
 *      "· live" suffix. */
function HistoricStandingsTable({ initialSeason = '25/26' }) {
  const [season, setSeason] = useState(initialSeason)
  const rows = HOF_HISTORIC_STANDINGS[season] ?? []
  return (
    <div className="hof-historic">
      <div className="hof-historic__head">
        <label className="hof-historic__label" htmlFor="hof-season-select">Season</label>
        <select
          id="hof-season-select"
          className="hof-historic__select"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
        >
          {HOF_SEASONS.slice().reverse().map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="hof-table hof-table--standings">
        <table>
          <thead>
            <tr>
              <th className="hof-th-rank">#</th>
              <th className="hof-th-team">Team</th>
              <th>PL</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>For</th>
              <th>Faced</th>
              <th>GD</th>
              <th className="hof-th-pts">PTS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const team = HOF_TEAM_BY_ID[r.teamId]
              const mgrInitials = managerInitialsFromName(r.mgr)
              return (
                <tr key={r.teamId}>
                  <td className="hof-td-rank">{r.rank}</td>
                  <td className="hof-td-team">
                    <span className="hof-team-cell">
                      <span
                        className="hof-team-cell__crest"
                        style={{ background: team.color }}
                        title={r.mgr}
                      >
                        {mgrInitials}
                      </span>
                      <span className="hof-team-cell__text">
                        <span className="hof-team-cell__name">{r.team}</span>
                      </span>
                    </span>
                  </td>
                  <td>{r.pl}</td>
                  <td>{r.w}</td>
                  <td>{r.d}</td>
                  <td>{r.l}</td>
                  <td>{r.gf}</td>
                  <td>{r.ga}</td>
                  <td className={r.gd >= 0 ? 'hof-td-gd-pos' : 'hof-td-gd-neg'}>
                    {r.gd > 0 ? `+${r.gd}` : r.gd}
                  </td>
                  <td className="hof-td-pts">{r.pts}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* Champions of Champions matrix — rows = teams, columns = seasons,
 * cells = finishing position; right column = total. Two style modes:
 *   `style="heatmap"` — gold/silver/bronze + greyscale tinting per pos
 *   `style="chip"`    — circular chip per finishing tier
 * Plus `algorithm` toggle: when true, cells show `9 - position` (the
 * algorithmic 8-7-6-5-4-3-2-1 score) instead of the raw position;
 * total column sums those scores either way. */
function CocMatrixTable({ style: mode = 'heatmap', algorithm = false, sticky = true }) {
  const rows = HOF_TEAMS
    .map((t) => {
      const positions = HOF_POSITIONS[t.id]
      const scores = positions.map((p) => 9 - p)
      const total = scores.reduce((s, v) => s + v, 0)
      const titles = positions.filter((p) => p === 1).length
      return { team: t, positions, scores, total, titles }
    })
    .sort((a, b) => b.total - a.total)
  return (
    <div className={'hof-coc hof-coc--' + mode + (algorithm ? ' hof-coc--algo' : '')}>
      <table className={sticky ? 'hof-coc__table is-sticky' : 'hof-coc__table'}>
        <thead>
          <tr>
            <th className="hof-coc__th-team">Team</th>
            {HOF_SEASONS.map((s) => <th key={s} className="hof-coc__th-season">{s}</th>)}
            <th className="hof-coc__th-total">{algorithm ? 'Total pts' : 'Total titles'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ team, positions, scores, total, titles }) => (
            <tr key={team.id}>
              <td className="hof-coc__td-team">
                <span className="hof-team-cell">
                  <span className="hof-team-cell__crest" style={{ background: team.color }}>
                    {team.id}
                  </span>
                  <span className="hof-team-cell__text">
                    <span className="hof-team-cell__name">{team.name}</span>
                    <span className="hof-team-cell__mgr">{team.mgr}</span>
                  </span>
                </span>
              </td>
              {positions.map((p, i) => {
                const display = algorithm ? scores[i] : p
                if (mode === 'chip') {
                  return (
                    <td key={i} className="hof-coc__td-cell">
                      <span className={'hof-coc__chip hof-coc__chip--pos-' + p}>{display}</span>
                    </td>
                  )
                }
                return (
                  <td key={i} className={'hof-coc__td-cell hof-coc__td-cell--pos-' + p}>
                    {display}
                  </td>
                )
              })}
              <td className="hof-coc__td-total">
                <strong>{algorithm ? total : titles}</strong>
                {!algorithm && <span className="hof-coc__td-total-sub">{titles === 1 ? 'title' : 'titles'}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* History · Variant H-A is now the locked History sub-menu structure
 * itself — see HallOfFameHistorySubMenu below. The standalone H-A /
 * H-B / H-C / H-D1 / H-D2 mockup variants and their hero-scrubber /
 * stacked-scroll shells have been retired. Hero scrubber, hero card,
 * and HofSectionLabel are no longer used by the live mockup; they
 * lived only inside the deleted H-B / H-C shells. */

/* Live tally view — preserved as the placeholder treatment for the
 * Champions of Champions tab (Tab 3) while the visual is being
 * decided. Renders cumulative titles + runner-ups, no matrix. */
function CocLiveTally() {
  const rows = HOF_TEAMS
    .map((t) => ({
      team: t,
      titles: HOF_TITLES_BY_TEAM[t.id],
      ru: HOF_RUNNERUPS_BY_TEAM[t.id],
    }))
    .sort((a, b) => (b.titles - a.titles) || (b.ru - a.ru))
  return (
    <div className="hof-coc hof-coc--tally">
      <table className="hof-coc__table">
        <thead>
          <tr>
            <th className="hof-coc__th-team">Team</th>
            <th className="hof-coc__th-tally">Titles</th>
            <th className="hof-coc__th-tally">Runner-up</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ team, titles, ru }) => (
            <tr key={team.id}>
              <td className="hof-coc__td-team">
                <span className="hof-team-cell">
                  <span className="hof-team-cell__crest" style={{ background: team.color }}>
                    {team.id}
                  </span>
                  <span className="hof-team-cell__text">
                    <span className="hof-team-cell__name">{team.name}</span>
                    <span className="hof-team-cell__mgr">{team.mgr}</span>
                  </span>
                </span>
              </td>
              <td className="hof-coc__td-tally">
                <span className="hof-coc__trophy-row" aria-hidden>
                  {Array.from({ length: titles }).map((_, i) => (
                    <span key={i} className="hof-coc__trophy" />
                  ))}
                </span>
                <strong>{titles}</strong>
              </td>
              <td className="hof-coc__td-tally">
                <strong>{ru}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* Champions of Champions — Live vs Algorithm toggle with the matrix as
 * the focal table. Re-uses CocMatrixTable. */
function CocLiveAlgoToggle({ style: mode = 'heatmap' }) {
  const [algo, setAlgo] = useState(false)
  return (
    <div className="hof-coc-toggle">
      <div className="hof-coc-toggle__row">
        <span className="hof-coc-toggle__label">View</span>
        <div className="hof-coc-toggle__seg" role="tablist" aria-label="Champions of Champions view">
          <button
            type="button"
            role="tab"
            aria-selected={!algo}
            className={'hof-coc-toggle__seg-btn' + (!algo ? ' is-active' : '')}
            onClick={() => setAlgo(false)}
          >
            Live
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={algo}
            className={'hof-coc-toggle__seg-btn' + (algo ? ' is-active' : '')}
            onClick={() => setAlgo(true)}
          >
            Algorithm · 8-7-6-5-4-3-2-1
          </button>
        </div>
      </div>
      <CocMatrixTable style={mode} algorithm={algo} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* MERGED HISTORY — team-name + finishing position variants             */
/* TH-A · TH-B · TH-C · TH-D (desktop) + MV-A · MV-B · MV-C (mobile)    */
/* ------------------------------------------------------------------ */

function MergedMgrCell({ row }) {
  return (
    <span className="hof-team-cell merged-history__mgr-cell">
      <span
        className="hof-team-cell__crest"
        style={{ background: row.meta.color }}
      >
        {row.meta.initials}
      </span>
      <span className="hof-team-cell__text">
        <span className="hof-team-cell__name">{row.key}</span>
        <span className="hof-team-cell__mgr">{row.meta.fullName}</span>
      </span>
    </span>
  )
}

function mergedCellPosClass(rank) {
  if (!rank) return 'is-empty'
  return 'is-pos-' + rank
}

/* TH-A · stacked-cell, TH-B · position+ribbon, and TH-C · two-row-band
 * variants have been retired. TH-D is the locked Team History layout.
 * MergedMgrCell stays defined — kept for parity even though TH-D
 * doesn't render the long-form mgr-cell (it composes its own crest +
 * stacked stats block instead). */

/* TH-D · Manager journey timeline — vertical card row per manager.
 * Manager + crest on the left; season cards stretch right. Each card
 * shows team name on top + big position below (heatmap-tinted).
 *
 * Locked spec: identity column carries the manager name + a stacked
 * uppercase stats block (TITLES · RUNNER-UP · BEST #N) that mirrors
 * the 25/26 year-label treatment (caps, muted, letter-spaced). The
 * inline "N titles · best #1" line was retired so the celebratory
 * stats stand on their own. */
function MergedHistoryTHD() {
  return (
    <div className="merged-history-timeline">
      {MERGED_HISTORY_SORTED.map((row) => (
        <div key={row.key} className="merged-history-timeline__row">
          <div className="merged-history-timeline__mgr">
            <span
              className="merged-history-timeline__crest"
              style={{ background: row.meta.color }}
            >
              {row.meta.initials}
            </span>
            <div className="merged-history-timeline__mgr-text">
              <div className="merged-history-timeline__mgr-name">{row.key}</div>
              <ul className="merged-history-timeline__mgr-stats" aria-label="Career stats">
                <li className="merged-history-timeline__mgr-stat">
                  <span className="merged-history-timeline__mgr-stat-num">{row.titles}</span>
                  <span className="merged-history-timeline__mgr-stat-label">
                    {row.titles === 1 ? 'title' : 'titles'}
                  </span>
                </li>
                <li className="merged-history-timeline__mgr-stat">
                  <span className="merged-history-timeline__mgr-stat-num">{row.ru}</span>
                  <span className="merged-history-timeline__mgr-stat-label">runner-up</span>
                </li>
                <li className="merged-history-timeline__mgr-stat">
                  <span className="merged-history-timeline__mgr-stat-label">best</span>
                  <span className="merged-history-timeline__mgr-stat-num">#{row.best ?? '—'}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="merged-history-timeline__cards">
            {row.seasons.map((s) => (
              <div
                key={s.season}
                className={
                  'merged-history-timeline__card ' + mergedCellPosClass(s.rank)
                }
              >
                <div className="merged-history-timeline__card-season">{s.season}</div>
                <div className="merged-history-timeline__card-team" title={s.team ?? ''}>
                  {s.team ?? '—'}
                </div>
                <div className="merged-history-timeline__card-pos">
                  {s.rank ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* MV-A · Mobile accordion — each manager is one row showing
 * crest + name + best/titles summary; tap → expand to reveal the
 * per-season journey list. Mocked with the top row expanded so the
 * user sees both states in the same frame. */
function MergedHistoryMVA() {
  const [openKey, setOpenKey] = useState(MERGED_HISTORY_SORTED[0].key)
  return (
    <div className="merged-history-mv merged-history-mv--accordion">
      <ul className="merged-history-mv__accordion-list">
        {MERGED_HISTORY_SORTED.map((row) => {
          const open = openKey === row.key
          return (
            <li key={row.key} className="merged-history-mv__accordion-item">
              <button
                type="button"
                aria-expanded={open}
                className={
                  'merged-history-mv__accordion-toggle' + (open ? ' is-open' : '')
                }
                onClick={() => setOpenKey(open ? null : row.key)}
              >
                <span className="merged-history-mv__accordion-mgr">
                  <span
                    className="merged-history-mv__crest"
                    style={{ background: row.meta.color }}
                  >
                    {row.meta.initials}
                  </span>
                  <span className="merged-history-mv__accordion-mgr-text">
                    <span className="merged-history-mv__accordion-mgr-name">{row.key}</span>
                    <span className="merged-history-mv__accordion-mgr-sub">
                      {row.meta.fullName}
                    </span>
                  </span>
                </span>
                <span className="merged-history-mv__accordion-meta">
                  <span className="merged-history-mv__summary-chip">
                    <span className="merged-history-mv__summary-chip-num">{row.titles}</span>
                    <span className="merged-history-mv__summary-chip-label">titles</span>
                  </span>
                  <span className="merged-history-mv__summary-chip">
                    <span className="merged-history-mv__summary-chip-num">#{row.best ?? '—'}</span>
                    <span className="merged-history-mv__summary-chip-label">best</span>
                  </span>
                  <span
                    className="merged-history-mv__chevron"
                    aria-hidden
                    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                  >
                    ›
                  </span>
                </span>
              </button>
              {open && (
                <ul className="merged-history-mv__journey">
                  {row.seasons.map((s) => (
                    <li
                      key={s.season}
                      className={
                        'merged-history-mv__journey-row ' + mergedCellPosClass(s.rank)
                      }
                    >
                      <span className="merged-history-mv__journey-season">{s.season}</span>
                      <span className="merged-history-mv__journey-team">
                        {s.team ?? '—'}
                      </span>
                      <span
                        className={
                          'merged-history-mv__pos-chip ' + mergedCellPosClass(s.rank)
                        }
                      >
                        {s.rank ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* MV-B (one-manager pager) has been retired. Only MV-A (accordion)
 * and MV-C (transposed matrix) remain — they live behind the locked
 * MV-A ⇄ MV-C toggle defined further down. */

/* MV-C · Transposed matrix — rows = seasons, columns = managers
 * (8 narrow cells across the phone viewport, ~38-42 px each). Each
 * cell shows finishing position with the heatmap; team name reveals
 * on tap at runtime — the mock just shows the position. */
function MergedHistoryMVC() {
  return (
    <div className="merged-history-mv merged-history-mv--transposed">
      <div className="merged-history-mv__transposed-scroll">
        <table>
          <thead>
            <tr>
              <th className="merged-history-mv__transposed-corner" />
              {MERGED_HISTORY_SORTED.map((row) => (
                <th
                  key={row.key}
                  className="merged-history-mv__transposed-th-mgr"
                  title={`${row.key} · ${row.meta.fullName}`}
                >
                  <span
                    className="merged-history-mv__transposed-crest"
                    style={{ background: row.meta.color }}
                  >
                    {row.meta.initials}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MERGED_SEASONS.map((season) => (
              <tr key={season}>
                <th className="merged-history-mv__transposed-th-season">{season}</th>
                {MERGED_HISTORY_SORTED.map((row) => {
                  const entry = row.seasons.find((s) => s.season === season)
                  const rank = entry?.rank ?? null
                  return (
                    <td
                      key={row.key}
                      className={
                        'merged-history-mv__transposed-cell ' + mergedCellPosClass(rank)
                      }
                      title={entry?.team ?? '—'}
                    >
                      {rank ?? '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="merged-history-mv__transposed-note">
        Tap a cell to reveal the team name that season. Mock shows
        positions only.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* HISTORY · MOBILE MV-A ⇄ MV-C TOGGLE (locked)                        */
/* ------------------------------------------------------------------ */
/* User direction: "How can we do both, and switch between the two? I
 * love both visuals." Render the MV-A accordion list and the MV-C
 * transposed matrix behind a small segmented pill — list icon swaps
 * to accordion, matrix icon swaps to the transposed grid. Same visual
 * language as the Trophy Room carousel ⇄ grid pill so the toggle UX
 * reads consistently across Hall of Fame surfaces. */

function MobileViewToggle({ mode, onList, onMatrix, size = 'md' }) {
  return (
    <div
      className={'mobile-view-toggle mobile-view-toggle--' + size}
      role="group"
      aria-label="History view"
    >
      <button
        type="button"
        className={'mobile-view-toggle__btn' + (mode === 'list' ? ' is-active' : '')}
        aria-pressed={mode === 'list'}
        aria-label="Accordion list view"
        onClick={onList}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="8" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="20" y2="12" />
          <line x1="8" y1="18" x2="20" y2="18" />
          <circle cx="4" cy="6" r="1.4" />
          <circle cx="4" cy="12" r="1.4" />
          <circle cx="4" cy="18" r="1.4" />
        </svg>
      </button>
      <button
        type="button"
        className={'mobile-view-toggle__btn' + (mode === 'matrix' ? ' is-active' : '')}
        aria-pressed={mode === 'matrix'}
        aria-label="Transposed matrix view"
        onClick={onMatrix}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </button>
    </div>
  )
}

/* Frame: list mode active — toggle pill on top, MV-A accordion below. */
function MobileHistoryListFrame({ onToggleMode }) {
  return (
    <div className="hof-mob-history hof-mob-history--list">
      <div className="hof-mob-history__bar">
        <MobileViewToggle
          mode="list"
          onList={() => {}}
          onMatrix={() => onToggleMode && onToggleMode('matrix')}
        />
      </div>
      <div className="hof-mob-history__body">
        <MergedHistoryMVA />
      </div>
    </div>
  )
}

/* Frame: matrix mode active — toggle pill on top, MV-C transposed
 * matrix below. */
function MobileHistoryMatrixFrame({ onToggleMode }) {
  return (
    <div className="hof-mob-history hof-mob-history--matrix">
      <div className="hof-mob-history__bar">
        <MobileViewToggle
          mode="matrix"
          onList={() => onToggleMode && onToggleMode('list')}
          onMatrix={() => {}}
        />
      </div>
      <div className="hof-mob-history__body">
        <MergedHistoryMVC />
      </div>
    </div>
  )
}

/* Stateful wrapper — flips between MV-A and MV-C inside one PortraitFrame
 * so the mockup behaves like the runtime experience. */
function MobileHistoryToggleFrame({ initialMode = 'list' }) {
  const [mode, setMode] = useState(initialMode)
  if (mode === 'matrix') return <MobileHistoryMatrixFrame onToggleMode={setMode} />
  return <MobileHistoryListFrame onToggleMode={setMode} />
}

/* Zoomed-in detail of the toggle pill — both states stacked so the UX
 * reads at a glance. Mirrors TrophyRoomToggleDetail. */
function MobileHistoryToggleDetail() {
  return (
    <div className="hof-mob-history hof-mob-history--toggle-detail">
      <div className="hof-mob-history__detail-stack">
        <div className="hof-mob-history__detail-row">
          <MobileViewToggle mode="list" onList={() => {}} onMatrix={() => {}} size="lg" />
          <div className="hof-mob-history__detail-caption">
            <div className="hof-mob-history__detail-eyebrow">List mode active</div>
            <div className="hof-mob-history__detail-text">
              Brand-violet pill behind the list icon. Accordion list of
              managers fills the page below.
            </div>
          </div>
        </div>
        <div className="hof-mob-history__detail-row">
          <MobileViewToggle mode="matrix" onList={() => {}} onMatrix={() => {}} size="lg" />
          <div className="hof-mob-history__detail-caption">
            <div className="hof-mob-history__detail-eyebrow">Matrix mode active</div>
            <div className="hof-mob-history__detail-text">
              Transposed grid (season-as-row, 8 manager columns) fills the
              page so positions line up vertically.
            </div>
          </div>
        </div>
        <div className="hof-mob-history__detail-note">
          Pill sits at the top of the Team History sub-tab on mobile,
          inside a subtle dark-glass surround so it never competes
          with the heatmap.
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* HALL OF FAME · HISTORY sub-menu (H-A locked)                         */
/* ------------------------------------------------------------------ */
/* Locked structure: H-A's tabbed sub-sub-nav is the History sub-menu.
 * Three tabs — Team History · Historic Standings · Champions of
 * Champions. Each tab renders its own desktop + mobile mock frames.
 * Champions of Champions is preserved as-is (TBD label) so the
 * existing live-tally / matrix mocks aren't lost while the team
 * decides what wins there. */
function HallOfFameHistorySubMenu() {
  const [tab, setTab] = useState('team')
  return (
    <div className="hof-history-variant">
      <nav className="hof-history-variant__subnav" aria-label="History sections">
        {[
          { id: 'team', label: 'Team History' },
          { id: 'std',  label: 'Historic Standings' },
          { id: 'coc',  label: 'Champions of Champions' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={'hof-history-variant__subnav-pill' + (tab === t.id ? ' is-active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'team' && (
        <div className="hof-history-tab hof-history-tab--team">
          <div className="hof-history-tab__beat">
            <div className="hof-history-tab__beat-eyebrow">
              HISTORY · TAB 1 · TEAM HISTORY · DESKTOP (TH-D)
            </div>
            <MergedHistoryTHD />
          </div>
          <div className="hof-history-tab__beat">
            <div className="hof-history-tab__beat-eyebrow">
              HISTORY · TAB 1 · TEAM HISTORY · MOBILE (MV-A ⇄ MV-C TOGGLE)
            </div>
            <div className="mockup-portrait-row hof-portrait-row hof-portrait-row--3">
              <div className="mockup-portrait-col">
                <div className="mockup-portrait-col__h">List view active (MV-A)</div>
                <PortraitFrame>
                  <MobileHistoryToggleFrame initialMode="list" />
                </PortraitFrame>
              </div>
              <div className="mockup-portrait-col">
                <div className="mockup-portrait-col__h">Matrix view active (MV-C)</div>
                <PortraitFrame>
                  <MobileHistoryToggleFrame initialMode="matrix" />
                </PortraitFrame>
              </div>
              <div className="mockup-portrait-col">
                <div className="mockup-portrait-col__h">Toggle UX detail</div>
                <PortraitFrame>
                  <MobileHistoryToggleDetail />
                </PortraitFrame>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 'std' && (
        <div className="hof-history-tab hof-history-tab--std">
          <div className="hof-history-tab__beat">
            <div className="hof-history-tab__beat-eyebrow">
              HISTORY · TAB 2 · HISTORIC STANDINGS
            </div>
            <HistoricStandingsTable />
          </div>
        </div>
      )}
      {tab === 'coc' && (
        <div className="hof-history-tab hof-history-tab--coc">
          <div className="hof-history-tab__beat">
            <div className="hof-history-tab__beat-eyebrow">
              HISTORY · TAB 3 · CHAMPIONS OF CHAMPIONS · TBD
            </div>
            <p className="hof-history-tab__pending">
              Pending decision on visual treatment. The live tally below is
              preserved from the earlier mocks while the team decides
              between cumulative tally, season-as-column matrix
              (heatmap or chip), or a fused presentation. No layout
              locked yet.
            </p>
            <CocLiveTally />
          </div>
        </div>
      )}
    </div>
  )
}

function readStoredMockupTheme() {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = window.localStorage.getItem('tclot-mockup-theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch { /* ignore */ }
  return 'light'
}

/* Top-level mockup tabs. Default lands on Standings — the active focus
 * area where new sub-nav frames just shipped. Wire / Live isolate the
 * recent variant iterations; Other catches everything else (foundations,
 * design-system explorations, past surfaces). */
const MOCKUP_TABS = [
  { id: 'standings', label: 'Standings' },
  { id: 'wire',      label: 'Wire' },
  { id: 'live',      label: 'Live' },
  { id: 'hall',      label: 'Hall of Fame' },
  { id: 'other',     label: 'Other' },
]

function readStoredMockupTab() {
  if (typeof window === 'undefined') return 'standings'
  try {
    const stored = window.sessionStorage.getItem('mockupActiveTab')
    if (stored && MOCKUP_TABS.some((t) => t.id === stored)) return stored
  } catch { /* ignore */ }
  return 'standings'
}

export function Mockup() {
  const { data } = useLeagueData()
  const tableRows = data?.tableRows ?? []
  const leagueEntries = data?.leagueEntries ?? []
  const [theme, setTheme] = useState(readStoredMockupTheme)
  const [activeTab, setActiveTab] = useState(readStoredMockupTab)

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try { window.localStorage.setItem('tclot-mockup-theme', next) } catch { /* ignore */ }
      return next
    })
  }

  const handleTabChange = (id) => {
    setActiveTab(id)
    try { window.sessionStorage.setItem('mockupActiveTab', id) } catch { /* ignore */ }
  }

  return (
    <div className="mockup" data-theme={theme}>
      <div className="mockup__ribbon">
        <strong>Mockup</strong>
        <span>Local-only design preview · production unaffected</span>
        <button
          type="button"
          className="mockup__ribbon-toggle"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <a href="?">← Back to live site</a>
      </div>

      <div className="mockup__page">
        <div className="mockup__intro">
          <h1>TCLOT — design system mockup</h1>
          <p>
            All sections below render in <code style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, padding: '2px 6px', background: 'var(--surface)', borderRadius: 4 }}>Geist Sans</code>{' '}
            with the proposed token system. The accent + shell pickers are shown side-by-side
            for direct comparison. Standings use real league data; schedule matrix and Hall use sample data.
          </p>
        </div>

        {/* Top-level tabs. Sticks just below the .mockup__ribbon so a
         * tab switch is always one click away while scrolling within an
         * active tab. Pill-tab visual language mirrors
         * .mock-standings-nav-subnav--pill (Frame 1 of the standings
         * sub-nav showcase). */}
        <nav className="mockup__tabs" role="tablist" aria-label="Mockup sections">
          {MOCKUP_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              className={'mockup__tab' + (activeTab === t.id ? ' is-active' : '')}
              onClick={() => handleTabChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {activeTab === 'other' && (<>
        {/* 0. Design decisions tracker */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Decisions tracker</div>
          <h2 className="mockup__section-h">Locked-in calls vs what&apos;s on the table</h2>
          <p className="mockup__section-sub">
            Locked-in calls vs what&apos;s still on the table. Updated as we go.
          </p>
          <DecisionsTracker />
        </section>

        {/* 1. Slim hero */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Slim hero</div>
          <h2 className="mockup__section-h">Title row + separated league strip</h2>
          <p className="mockup__section-sub">
            Single 68px row carries brand + season + live state + theme toggle.
            League team avatars become a subtle strip below the hero, not embedded in it.
          </p>
          <HeroVariantB />

          <div className="mockup-brand-variants">
            <h3 className="mockup-brand-variants__h">
              Brand-integration options
            </h3>
            <p className="mockup__section-sub">
              Three middle-ground options exploring how much brand to carry
              into the header on every page. The original (above) drops the
              real PL lion + violet→indigo gradient for a generic
              <code style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 11,
                padding: '1px 5px',
                background: 'var(--surface)',
                borderRadius: 4,
                margin: '0 4px',
              }}>TC</code>
              lavender square. Each option below puts more of the actual logo
              back into the header without overwhelming the page.
            </p>

            {/* Variant A */}
            <div className="mockup-brand-variant">
              <div className="mockup__eyebrow">
                Alternate · Variant A · subtle · lion icon + wordmark · works
                at every density
              </div>
              <HeroVariantA />
              <div
                className="mockup-portrait-row"
                style={{ marginTop: 'var(--space-4)' }}
              >
                <div className="mockup-portrait-col">
                  <div className="mockup-portrait-col__h">Portrait · 375px</div>
                  <PortraitFrame>
                    <div className="mockup-brand-portrait-pad">
                      <HeroVariantAMobile />
                    </div>
                  </PortraitFrame>
                </div>
              </div>
            </div>

            {/* Variant B */}
            <div className="mockup-brand-variant">
              <div className="mockup__eyebrow">
                Variant B · <span style={{ color: 'var(--brand)' }}>selected ✓</span> · pill on left, season label on right
              </div>
              <HeroVariantB />
              <div
                className="mockup-portrait-row"
                style={{ marginTop: 'var(--space-4)' }}
              >
                <div className="mockup-portrait-col">
                  <div className="mockup-portrait-col__h">Portrait · 375px</div>
                  <PortraitFrame>
                    <div className="mockup-brand-portrait-pad">
                      <HeroVariantBMobile />
                    </div>
                  </PortraitFrame>
                </div>
              </div>
            </div>

            {/* Variant C */}
            <div className="mockup-brand-variant">
              <div className="mockup__eyebrow">
                Alternate · Variant C · boldest · hero watermark on every page
              </div>
              <HeroVariantC />
              <div
                className="mockup-portrait-row"
                style={{ marginTop: 'var(--space-4)' }}
              >
                <div className="mockup-portrait-col">
                  <div className="mockup-portrait-col__h">
                    Portrait · 375px (watermark drops; full-bleed violet bar)
                  </div>
                  <PortraitFrame>
                    <div className="mockup-brand-portrait-pad mockup-brand-portrait-pad--bleed">
                      <HeroVariantCMobile />
                    </div>
                  </PortraitFrame>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 1b. Header variant showcase — post-PR-#2 evolution */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">HEADER · POST-PR-#2 EVOLUTION</div>
          <h2 className="mockup__section-h">Four ideas to fill the white-tile space</h2>
          <p className="mockup__section-sub">
            User flagged the current header reads as one large white tile.
            Options 1–3 add informational density (status strip), visual
            richness (league strip), or reduce tile-on-tile stacking
            (full-bleed). Option 4 is the combined refinement on top of
            the locked status-strip — adds the season meta in caps-mono
            and the 8 fantasy crests in standings order. Compare against
            the current PR #2 baseline (0).
          </p>
          <HeaderVariantsShowcase
            tableRows={tableRows}
            leagueEntries={leagueEntries}
            teamLogoMap={data?.teamLogoMap ?? {}}
            kitIndexByEntry={data?.defaultKitIndexByLeagueEntry ?? {}}
          />
        </section>

        {/* 1c. Header — full-bleed + status strip combos */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">
            HEADER · FULL-BLEED + STATUS STRIP COMBOS
          </div>
          <h2 className="mockup__section-h">
            Variant 4 content without the tile chrome
          </h2>
          <p className="mockup__section-sub">
            Currently variant 4 lives inside a tile container. Dropping the
            tile chrome (full-bleed) could look cleaner — but the status
            strip needs a new treatment. Compare three approaches.
          </p>
          <HeaderFullBleedComboShowcase
            tableRows={tableRows}
            leagueEntries={leagueEntries}
            teamLogoMap={data?.teamLogoMap ?? {}}
            kitIndexByEntry={data?.defaultKitIndexByLeagueEntry ?? {}}
          />
        </section>

        {/* 1d. Background + header color variants */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">BACKGROUND + HEADER COLOR VARIANTS</div>
          <h2 className="mockup__section-h">Four treatments for the page bg + header rhythm</h2>
          <p className="mockup__section-sub">
            User flagged the current grey page bg as too dark and jarring against
            the white tiles. Four alternatives mocked up below — each with
            desktop + mobile previews so you can pick (or mix, e.g. one on mobile
            + a different one on desktop). Mockup-only; no production token
            changes shipped.
          </p>
          <BackgroundVariantsShowcase
            tableRows={tableRows}
            leagueEntries={leagueEntries}
            teamLogoMap={data?.teamLogoMap ?? {}}
            kitIndexByEntry={data?.defaultKitIndexByLeagueEntry ?? {}}
          />
        </section>

        {/* 1e. Floating bottom nav variants — mobile-only treatment */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">FLOATING BOTTOM NAV — VARIANTS</div>
          <h2 className="mockup__section-h">
            Lyft-style floating pill + three alternatives
          </h2>
          <p className="mockup__section-sub">
            User shared a Lyft app screenshot with a floating pill bottom nav
            and asked if we can do the same on web — yes, trivially. Four
            treatments rendered in mobile portrait frames (mobile-only
            chrome). A is the current production baseline; B is the closest
            Lyft match; C and D are intermediate options. All four respect
            <code style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, margin: '0 4px' }}>env(safe-area-inset-bottom)</code>.
            Mockup-only; production <code style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, margin: '0 4px' }}>.dashboard-nav--bottom</code> is untouched.
          </p>
          <FloatingBottomNavShowcase />
        </section>

        {/* 2. Accent compare */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Accent comparison</div>
          <h2 className="mockup__section-h">Violet vs Deeper violet</h2>
          <p className="mockup__section-sub">
            Same nav, same standings rows, same primary CTA — only the chrome accent
            changes. Data colours (W/D/L dots) stay constant. Pick whichever feels right.
          </p>
          <div className="mockup-compare">
            <div className="mockup-preview theme-violet shell-pure">
              <div className="mockup-preview__label">
                <span>Violet</span>
                <code>#795bfb</code>
              </div>
              <div className="mockup-preview__body">
                <MiniApp />
              </div>
            </div>
            <div className="mockup-preview theme-violet-deep shell-pure">
              <div className="mockup-preview__label">
                <span>Deeper violet</span>
                <code>#6246f0</code>
              </div>
              <div className="mockup-preview__body">
                <MiniApp />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Shell compare */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Background shell</div>
          <h2 className="mockup__section-h">Pure black vs Violet-tinted</h2>
          <p className="mockup__section-sub">
            Identical content; the shell on the right has a subtle violet hue baked into
            the background. On a long viewing session it whispers TCLOT's brand without
            using the accent colour.
          </p>
          <div className="mockup-compare">
            <div className="mockup-preview theme-violet shell-pure">
              <div className="mockup-preview__label">
                <span>Pure</span>
                <code>#121212</code>
              </div>
              <div className="mockup-preview__body">
                <MiniApp />
              </div>
            </div>
            <div className="mockup-preview theme-violet shell-tinted">
              <div className="mockup-preview__label">
                <span>Violet-tinted</span>
                <code>#141320</code>
              </div>
              <div className="mockup-preview__body">
                <MiniApp />
              </div>
            </div>
          </div>
        </section>

        {/* 4. Type + tokens */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Tokens</div>
          <h2 className="mockup__section-h">Colour, spacing, radius, motion</h2>
          <p className="mockup__section-sub">
            6-step spacing scale, 3-step radius, 2 motion timings. Every value the
            site uses comes from this set; everything else is a bug.
          </p>
          <TokensPanel />
        </section>

        <section className="mockup__section">
          <div className="mockup__eyebrow">Type scale</div>
          <h2 className="mockup__section-h">Geist Sans · 6 sizes</h2>
          <p className="mockup__section-sub">
            All UI text uses one of these six tokens. Tabular numerals enabled
            globally so every score column lines up.
          </p>
          <TypeScale />
        </section>

        {/* 5. Nav before/after */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Navigation</div>
          <h2 className="mockup__section-h">Today's emoji nav vs proposed icon nav</h2>
          <p className="mockup__section-sub">
            Top: current state — emoji + violet gradient + glow on the active pill.
            Bottom: SVG icons + flat accent underline + subtle accent tint on the active tab.
          </p>
          <NavCompare />
        </section>

        {/* 5a. FPL Live icon candidates */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">NAV ICONS · FPL LIVE</div>
          <h2 className="mockup__section-h">Six candidates for the live indicator</h2>
          <p className="mockup__section-sub">
            The current 'radio' icon reads as 'receiving signal' rather than
            'broadcasting now'. Compare alternatives.
          </p>
          <NavFplLiveIconShowcase />
        </section>

        {/* 5b. Inactive nav-icon color direction */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">NAV ICONS · COLOR DIRECTION</div>
          <h2 className="mockup__section-h">
            Inactive icons — pure mono vs. accent colors vs. emojis
          </h2>
          <p className="mockup__section-sub">
            The proposed nav uses pure monochrome line icons. The user finds them
            a bit sterile next to the gradient brand pill. Compare four directions.
          </p>
          <NavColorDirectionShowcase />
        </section>

        {/* 6. Icon compare */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Icon family</div>
          <h2 className="mockup__section-h">Lucide vs Phosphor</h2>
          <p className="mockup__section-sub">
            Both libraries are MIT-licensed, both ~1KB per icon when inlined. Same set
            shown so you can compare character side-by-side.
          </p>
          <IconCompare />
        </section>
        </>)}

        {activeTab === 'standings' && (<>
        {/* 7. Standings (real data, flush) */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Standings · real data</div>
          <h2 className="mockup__section-h">FotMob-flush table</h2>
          <p className="mockup__section-sub">
            No tile wrapping. Top + bottom hairline borders only. Form column reduced to
            small coloured dots — colour carries the data, no letter clutter.
            Real <code style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>tableRows</code> from your league-data.
          </p>
          <FlushStandings rows={tableRows} leagueEntries={leagueEntries} />
        </section>
        </>)}

        {activeTab === 'other' && (<>
        {/* 8. Schedule matrix */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Schedule luck matrix</div>
          <h2 className="mockup__section-h">Saturated heat + flat diagonal + clear totals</h2>
          <p className="mockup__section-sub">
            Diagonal cells (own schedule = baseline) render flat surface, not a heat
            colour, so the eye reads them as the reference. Σ/AVG totals separated by
            a hairline. Caption row labels what the heat means.
          </p>
          <ScheduleMatrix />
        </section>

        {/* 9. Hall trophies */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Hall of Champions</div>
          <h2 className="mockup__section-h">Top-3 podium + historic flush table</h2>
          <p className="mockup__section-sub">
            Latest season gets a podium hero with crests; older seasons drop into a
            FotMob-flush historic table. Same atoms as the standings — no separate
            chrome, no gold palette.
          </p>
          <HallTrophies />
        </section>
        </>)}

        {activeTab === 'live' && (<>
        {/* 10. Live banner — single concept (kept as-is) */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Live banner — single fixture</div>
          <h2 className="mockup__section-h">Generative replacement for promo PNGs</h2>
          <p className="mockup__section-sub">
            All data already exists in <code style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>useLiveScores</code> — render once, no per-week design work.
            Static red dot when live; flat otherwise.
          </p>
          <LiveBannerConcept />
        </section>

        {/* 11. Live banner — group of 4 with shared header */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Live banner — gameweek view</div>
          <h2 className="mockup__section-h">All 4 H2Hs share one state header</h2>
          <p className="mockup__section-sub">
            All four weekly H2Hs are always in the same state, so the state lives once
            at the top of the group — not on each card. Cards stay clean: crests, names,
            score, winner emphasis. Header carries the chip, the GW window, and progress.
          </p>
          <LiveBannerGroup />
        </section>

        {/* 11a. Winner-indication options */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Winner indication · alternatives</div>
          <h2 className="mockup__section-h">Five lighter ways to mark the winner</h2>
          <p className="mockup__section-sub">
            Same matchup, five different treatments. The current banner above uses
            a tinted background, which feels heavy. These lean on type, a thin bar,
            score weight/color, or a small dot marker instead.
          </p>
          <WinnerOptions />
        </section>

        {/* 11a-HV. Hero defeat / Villain victory — circular treatments */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">LIVE FACE-OFF · HERO/VILLAIN BADGE</div>
          <h2 className="mockup__section-h">Three circular treatments + reference rectangular for comparison</h2>
          <p className="mockup__section-sub">
            The current rectangular tile feels out of place against the new
            circular-avatar design language. Three circular treatments mocked
            up side-by-side, each rendered for both narrative kinds (HERO
            DEFEAT — orange/red, VILLAIN VICTORY — purple/violet). Reference
            rectangular at the top for A/B compare.
          </p>
          <HeroVillainBadgeShowcase />
        </section>

        {/* 11a-2. Portrait mobile preview */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Portrait mobile · live scores (collapsed + expanded)</div>
          <h2 className="mockup__section-h">Option B is the pick — face-off row that opens in place</h2>
          <p className="mockup__section-sub">
            Compressed face-off (Option B) wins on density and read-at-a-glance.
            Left: all four H2Hs in their collapsed state. Right: tap a row and the
            same compressed list expands the first fixture inline, surfacing each
            team's starting XI sorted by points contributed. No horizontal scroll
            in either state; both fit a 375 px portrait screen.
          </p>
          <PortraitPreview />
        </section>

        {/* 11a-3. Expanded fixture (player view) */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Portrait · expanded fixture</div>
          <h2 className="mockup__section-h">Tap a fixture → see both teams' players</h2>
          <p className="mockup__section-sub">
            Same 375 px frame. Header keeps the matchup score visible at the top,
            then either tabbed (one team at a time) or stacked (both teams in a
            scroll). Live players show a red minute counter, FT players show
            "FT", DNP players show their kickoff time.
          </p>
          <PortraitExpandedPreview />
        </section>

        {/* 11b. Header-only state strip */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Header states · same group, different data</div>
          <h2 className="mockup__section-h">Pre · Live · Mid-GW · Complete</h2>
          <p className="mockup__section-sub">
            The 4 cards underneath don't change — only this header row does. Live and
            Mid-GW share the same chip; the right-hand progress meta tells you which.
          </p>
          <LiveHeaderStrip />
        </section>

        {/* 12. Live ticker */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Live ticker bar</div>
          <h2 className="mockup__section-h">Same shared-state pattern, condensed</h2>
          <p className="mockup__section-sub">
            Replaces the current <code style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>FplLiveGwTickerBar</code> chrome.
            Single state header at the top — cells underneath are pure score
            rows with winner emphasis.
          </p>
          <LiveTicker />
        </section>

        {/* 12a-PC1. Player Contributions · row density */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">PLAYER CONTRIBUTIONS · ROW DENSITY</div>
          <h2 className="mockup__section-h">Card per event vs single-line list</h2>
          <p className="mockup__section-sub">
            Same chronological newest-first feed below the live fixtures.
            Variant A foregrounds the manager identity in a card; Variant B
            collapses each event to a single Twitter-density line. Pick how
            each contribution renders.
          </p>
          <div className="mockup-portrait-row mockup-contrib-density-row">
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">
                Variant A — Card per event
                <span className="mockup-variant-picked" aria-label="Locked option">LOCKED</span>
              </div>
              <ContribCardsVariant events={CONTRIB_SAMPLE_EVENTS} />
            </div>
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">
                Variant B — Single-line list
                <span className="mockup-variant-ref" aria-label="Reference only">Reference only</span>
              </div>
              <ContribListVariant events={CONTRIB_SAMPLE_EVENTS} />
            </div>
          </div>
        </section>

        {/* 12a-PC2. Player Contributions · filter UX */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">PLAYER CONTRIBUTIONS · FILTER UX</div>
          <h2 className="mockup__section-h">Three takes on the kind / team filter</h2>
          <p className="mockup__section-sub">
            Each variant renders the same toolbar above a stub of 3 events
            so the relationship is visible. Variant 1 mirrors today's
            mutually-exclusive chips; Variants 2 and 3 introduce
            multi-select.
          </p>
          <div className="mockup-portrait-row mockup-contrib-filter-row">
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">
                Variant 1 — Restyled chip pills
                <span className="mockup-variant-ref" aria-label="Reference only">Reference only</span>
              </div>
              <ContribFilterChipPills />
            </div>
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">
                Variant 2 — Multi-select dropdown
                <span className="mockup-variant-picked" aria-label="Locked option">LOCKED</span>
              </div>
              <ContribFilterDropdown />
            </div>
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">
                Variant 3 — Icon-toggle row
                <span className="mockup-variant-ref" aria-label="Reference only">Reference only</span>
              </div>
              <ContribFilterIconToggle />
            </div>
          </div>
        </section>

        {/* 12a-PC3. Player Contributions · mobile collapsed */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">PLAYER CONTRIBUTIONS · MOBILE COLLAPSED</div>
          <h2 className="mockup__section-h">Latest event default → tap to expand to last 5</h2>
          <p className="mockup__section-sub">
            Below 480 px the feed collapses to only the most recent event,
            with a chevron toggle to reveal the prior 4. Both states
            rendered in 375 px frames so the tap-target sizing reads true.
          </p>
          <ContribMobileCollapsed />
        </section>

        {/* 12a-PC4. Player Contributions · streaming animation */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">PLAYER CONTRIBUTIONS · STREAMING ANIMATION</div>
          <h2 className="mockup__section-h">Brand-violet pulse + highlight on row arrival</h2>
          <p className="mockup__section-sub">
            New events fade in from a brand-violet tint with a subtle
            scale-up, then settle into the regular row treatment. In the
            mockup the entrance is permanently applied to the top row so
            the visual effect is visible without live data.
          </p>
          <ContribStreamingShowcase />
        </section>
        </>)}

        {activeTab === 'hall' && (<>
        {/* ============================================================
         *  HALL OF FAME · LOCKED STRUCTURE
         *  ── Trophy Room · T-D carousel + 6-cell grid toggle (locked)
         *  ── History sub-menu · H-A sub-sub-nav (locked) with three tabs:
         *     1. Team History → TH-D (desktop) · MV-A ⇄ MV-C (mobile)
         *     2. Historic Standings → refined table (manager-initial
         *        bubbles, dedicated Manager column dropped, no "live"
         *        suffix on 25/26 in the season picker)
         *     3. Champions of Champions → TBD (live tally preserved
         *        from the earlier mocks while the team decides)
         *  All standings/matrix data is mock — eight plausible seasons
         *  (2018/19 → 2025/26) with Crouch End on 4 titles, Soul Ze
         *  Moles on 2, Bellsprouts and Wiggum on 1 each.
         * ============================================================ */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">HALL OF FAME · LOCKED STRUCTURE</div>
          <h2 className="mockup__section-h">Two sub-sections — Trophy Room + History</h2>
          <p className="mockup__section-sub">
            User-locked direction: Hall of Fame splits into{' '}
            <strong>Trophy Room</strong> (banners-only carousel with a
            view-all 6-grid toggle — no surrounding text) and{' '}
            <strong>History</strong> (a sub-sub-nav with Team History ·
            Historic Standings · Champions of Champions). The Champions
            of Champions visual is still pending; everything else below
            is locked.
          </p>
        </section>

        {/* TROPHY ROOM — locked T-D · carousel + 6-cell grid toggle ----- */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">
            TROPHY ROOM · LOCKED · MOBILE-FIRST CAROUSEL + 6-GRID TOGGLE
          </div>
          <h2 className="mockup__section-h">
            Default to swipe carousel · subtle toggle flips to a 6-cell grid
          </h2>
          <p className="mockup__section-sub">
            Locked direction from the user: T-D wins. Default state is a
            fullscreen swipeable carousel of championship banners, latest
            season first, neighbors peeking on each side, dot indicators
            at the bottom. A subtle 2-icon segmented pill in the top-right
            (carousel ⇄ grid) flips to a view-all <strong>2-by-3 grid</strong>{' '}
            of the most-recent 6 banners. Older banners stay accessible by
            swiping back inside the carousel. T-A pedestal, T-B flat
            gallery, and T-C trophy-case mocks have been removed.
          </p>
          <div className="mockup-portrait-row hof-portrait-row hof-portrait-row--3">
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">Default carousel · latest banner active</div>
              <PortraitFrame>
                <TrophyRoomLockedFrame initialMode="carousel" />
              </PortraitFrame>
            </div>
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">View-all grid · 6 most-recent banners</div>
              <PortraitFrame>
                <TrophyRoomLockedFrame initialMode="grid" />
              </PortraitFrame>
            </div>
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">Toggle UX detail</div>
              <PortraitFrame>
                <TrophyRoomToggleDetail />
              </PortraitFrame>
            </div>
          </div>
        </section>

        {/* HISTORY — locked H-A sub-sub-nav (3 tabs) -------------------- */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">
            HISTORY · INTERNAL SUB-SUB-NAV (H-A LOCKED)
          </div>
          <h2 className="mockup__section-h">
            One table at a time · tabs for Team History · Historic Standings · Champions of Champions
          </h2>
          <p className="mockup__section-sub">
            Locked: H-A&apos;s tabbed pattern is the History sub-menu.
            Tab 1 (Team History) renders the manager-journey timeline
            (TH-D, refined with stacked uppercase TITLES · RUNNER-UP ·
            BEST stats) on desktop, and a small List ⇄ Matrix toggle
            (MV-A accordion ⇄ MV-C transposed matrix) on mobile. Tab 2
            (Historic Standings) shows the refined per-season table with
            manager-initial bubbles, the dedicated Manager column
            dropped, team name left-aligned tight to the bubble, and the
            season picker without a &ldquo;live&rdquo; suffix on 25/26.
            Tab 3 (Champions of Champions) is preserved as pending — the
            live-tally mock stays in place while the visual is decided.
          </p>
          <HallOfFameHistorySubMenu />
        </section>
        </>)}

        {activeTab === 'other' && (<>
        {/* 12b. Mobile portrait — other surfaces */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Mobile portrait · other surfaces</div>
          <h2 className="mockup__section-h">Standings, schedule, draft, waivers, hall, hero at 375 px</h2>
          <p className="mockup__section-sub">
            Same 375 px frame from the live-scores section, now applied to every
            other tab. Each surface adapts the layout instead of allowing
            horizontal scroll: standings drop seldom-used columns and tap-expand
            for detail; schedule luck switches to a single-team list; the draft
            board flattens to a vertical pick list; waivers becomes an activity
            feed; the hall hero shrinks to a single column.
          </p>
          <PortraitSurfaces />
        </section>

        {/* 12c. Players tab — desktop + portrait */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Players tab · desktop + portrait</div>
          <h2 className="mockup__section-h">Modern player browse / wire</h2>
          <p className="mockup__section-sub">
            Dense trading-floor table on desktop, vertical card list on portrait.
            Filter pills carry the active value inline. Defaults to <strong>Free
            agents only</strong> with an <strong>Include drafted</strong> sticky
            toggle in the header; sorted by Total points ↓. Stat columns are
            position-aware (here MID: GP · 60+ · G · A · CS · DC · xG · xA),
            with a Stats column picker pill that mirrors production's
            StatsColumnsPill. Status icon at row end conveys
            injured / suspended / available.
          </p>
          <PlayersTabDesktop />
          <div className="mockup-portrait-row" style={{ marginTop: 'var(--space-4)' }}>
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">Portrait · 375px</div>
              <PortraitFrame>
                <PlayersTabPortrait />
              </PortraitFrame>
            </div>
          </div>
        </section>

        {/* 12d. Player detail — desktop + portrait */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Player detail · desktop + portrait · drill-in</div>
          <h2 className="mockup__section-h">Opens when a player name is clicked</h2>
          <p className="mockup__section-sub">
            Full-page drill-in (no modal). Hero with club crest watermark +
            ownership state and a single <strong>Compare</strong> action
            (site is informational — no add-to-wire / star / more menu).
            Tabbed body (<em>Overview · Fixtures · Form · History</em>) with
            Overview default: FotMob-style stat tiles, last-5 mini bar chart
            with positive/negative tone, upcoming fixtures with FDR tiles.
            Portrait gets a back chevron in the header.
          </p>
          <PlayerDetailDesktop />
          <div className="mockup-portrait-row" style={{ marginTop: 'var(--space-4)' }}>
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">Portrait · 375px</div>
              <PortraitFrame>
                <PlayerDetailPortrait />
              </PortraitFrame>
            </div>
          </div>
        </section>

        {/* 12e. Compare — desktop + portrait */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Compare · reachable from: Player Detail → Compare</div>
          <h2 className="mockup__section-h">Side-by-side comparison of two players</h2>
          <p className="mockup__section-sub">
            Two columns on desktop with sticky stat rows; the higher value on
            each row gets a subtle brand tint and a ▲ marker. Hard-capped at
            2 players. Stat rows are position-aware (e.g. MID hides CS,
            FWD hides CS + DC); when the two players are different positions
            the rows are unioned and the player whose position normally
            hides that stat shows "—". Portrait uses a stacked list with an
            inline Δ column.
          </p>
          <CompareDesktop />
          <div className="mockup__section-sub" style={{ marginTop: 'var(--space-5)' }}>
            <strong style={{ color: 'var(--text-strong)' }}>Add-player flow.</strong>{' '}
            When fewer than 2 are selected, the "+ Add player" placeholder is
            replaced by an inline picker with two tabs: <em>Search</em>{' '}
            (default — type-ahead over every player) and <em>From a squad</em>{' '}
            (the 8 fantasy teams, click to expand a roster). Both tabs shown
            below for visual fidelity.
          </div>
          <ComparePlayerPicker />
          <div className="mockup-portrait-row" style={{ marginTop: 'var(--space-4)' }}>
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">Portrait · 375px</div>
              <PortraitFrame>
                <ComparePortraitStacked />
              </PortraitFrame>
            </div>
          </div>
        </section>

        {/* 12e-2. Compare — "From a squad" expansion variants */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Compare · &quot;From a squad&quot; expansion · 4 options</div>
          <h2 className="mockup__section-h">How the picked manager&apos;s roster materialises</h2>
          <p className="mockup__section-sub">
            Inline picked. The other three are kept for reference.
          </p>
          <div className="mockup-portrait-row mockup-compare-fs__row">
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">
                Option 1 — Inline
                <span className="mockup-variant-picked" aria-label="Picked option">PICKED</span>
              </div>
              <PortraitFrame>
                <CompareFromSquadInline />
              </PortraitFrame>
            </div>
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">Option 2 — Drawer (right)</div>
              <PortraitFrame>
                <CompareFromSquadDrawer />
              </PortraitFrame>
            </div>
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">Option 3 — Modal (full-screen)</div>
              <PortraitFrame>
                <CompareFromSquadModal />
              </PortraitFrame>
            </div>
            <div className="mockup-portrait-col">
              <div className="mockup-portrait-col__h">Option 4 — Popover</div>
              <PortraitFrame>
                <CompareFromSquadPopover />
              </PortraitFrame>
            </div>
          </div>
        </section>

        {/* 13. Sub-nav */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Secondary navigation</div>
          <h2 className="mockup__section-h">Pill-segment tabs (within sections)</h2>
          <p className="mockup__section-sub">
            For sub-nav inside Team Selection, FPL Live, and similar sections. Active
            pill gets surface elevation; idle pills are transparent. Optional count chips.
          </p>
          <SubNav />
        </section>

        {/* 13a. Sub-nav variants showcase — FPL Live */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">SUB-NAV · FPL LIVE</div>
          <h2 className="mockup__section-h">
            Three options for the Live GW / Lineups / Projections row
          </h2>
          <p className="mockup__section-sub">
            Mockup spec defaults to text-only. The PL crest on Lineups carries
            semantic weight (&ldquo;real Premier League data&rdquo; vs
            &ldquo;draft-league data&rdquo;). Compare three directions before
            PR #4.
          </p>
          <SubNavVariantsShowcase />
        </section>

        {/* 13b. Dropdowns */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Dropdowns &amp; menus</div>
          <h2 className="mockup__section-h">Three patterns: select · filter pill · popover</h2>
          <p className="mockup__section-sub">
            One dropdown family covers everything the site needs. Try the
            "Position" filter pill and the "More actions" popover — they're
            interactive in the mockup.
          </p>
          <DropdownsShowcase />
        </section>

        {/* 14. Player rows */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Player rows · canonical atom</div>
          <h2 className="mockup__section-h">Used in wire, draft, waivers, search</h2>
          <p className="mockup__section-sub">
            One row component everywhere a player appears. Coloured shirt as primary
            identifier (uses club kit colour), name + club + position as identity,
            position chip + ownership + points as context.
          </p>
          <PlayerRows />
        </section>

        {/* 15. Draft board */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Draft board</div>
          <h2 className="mockup__section-h">Snake order grid</h2>
          <p className="mockup__section-sub">
            8 columns × N rounds. Position chip carries colour, club abbreviation
            stays muted. Hairline grid only — no row tinting (it'd fight with
            position chips).
          </p>
          <DraftBoard />
        </section>

        {/* 16. Waivers feed */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Waivers feed</div>
          <h2 className="mockup__section-h">Recent moves, in/out by gameweek</h2>
          <p className="mockup__section-sub">
            Same player-row atom from above; ↑ IN coloured green, ↓ OUT coloured red.
            Owner column is right-aligned and uses tabular numerals when amounts appear.
          </p>
          <WaiversFeed />
        </section>
        </>)}

        {activeTab === 'wire' && (<>
        {/* ============ WIRE PORTRAIT LAYOUT VARIANTS ============ */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Wire · portrait layout variants</div>
          <h2 className="mockup__section-h">Wire — portrait layout variants</h2>
          <p className="mockup__section-sub">
            Four side-by-side mockups of the portrait wire (waiver) list. New
            toolbar (full-width search + Position / Club pills only — no Sort,
            no Owned, no Include-drafted) is identical across all four. Only
            the wrapper chrome and edge inset varies. Pick a winner on phone.
          </p>
          <WirePortraitVariants />
        </section>

        {/* ============ WIRE TILE LAYOUT VARIANTS (E/F/G/H) ============ */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Wire · tile layout variants</div>
          <h2 className="mockup__section-h">Wire — tile layout variants</h2>
          <p className="mockup__section-sub">
            Follow-up to the A–D portrait variants. Variant C (full-bleed flat
            grid) shipped, but the user found it horizontally cramped — full
            names truncate and there&apos;s no room for fixture chips. These
            four explore taller-per-row tile compositions that fit ~5–6 tiles
            per phone viewport (not one-per-screen like Variant D). Same
            production toolbar across all four (search + Wire/Owned toggle on
            row 1, Position / Club / Stats pills on row 2). Pick a winner on
            phone.
          </p>
          <WirePortraitTileVariants />
        </section>

        {/* ============ WIRE TILE LAYOUT VARIANTS (I/J/K/L) — right-aligned stats ============ */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Wire · tile layout variants (right-aligned stats)</div>
          <h2 className="mockup__section-h">Wire — tile layout variants (right-aligned stats)</h2>
          <p className="mockup__section-sub">
            Follow-up to E/F/G/H. Those laid stats inline-with-text, so a
            stat column&apos;s x-position shifted from tile to tile — bad
            for at-a-glance comparison when sorting (you can&apos;t scan down
            the Goals column if Goals isn&apos;t at the same x in every
            row). These four lock stats into a fixed-width right column so
            values line up vertically across tiles. Identity (crest +
            name) and Next-3 fixtures live on the left; the right column
            varies per variant.
          </p>
          <WirePortraitTileRightVariants />
        </section>
        </>)}

        {activeTab === 'standings' && (<>
        {/* ============ STANDINGS — PORTRAIT LAYOUT VARIANTS (A–E) ============ */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Standings · portrait layout variants</div>
          <h2 className="mockup__section-h">Standings — portrait layout variants</h2>
          <p className="mockup__section-sub">
            The production Standings is a dense 12-column table that
            horizontal-scrolls on a 390px phone. Five portrait-first
            alternatives mocked up below, all rendering the same 8 teams for
            fair comparison. Each variant carries the league traditions —
            rank #1 leader tint, the 🧩 wooden-spoon marker on rank #8 with a
            divider above, 5 form dots, next-opponent crest, and a muted
            manager name under each team. Pick a winner (or a mix); a
            follow-up worker will port the choice into production.
          </p>
          <StandingsPortraitVariants />
        </section>

        {/* ============ STANDINGS · SUB-NAV + GW SUMMARY TILES ============ */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Standings · sub-nav structure + GW summary tiles</div>
          <h2 className="mockup__section-h">Standings · sub-nav structure + GW summary tiles</h2>
          <p className="mockup__section-sub">
            User direction: consolidate Standings into a top &ldquo;at-a-glance&rdquo;
            band (brand header → standings table → Last/Next GW side-by-side mini
            tiles) followed by a <strong>Schedule · Form · Stats</strong> sub-nav.
            Schedule merges the legacy Complete + Future GW lists; Form owns the
            team-picker H2H deep-dive (with a new league form leaderboard at the
            top); Stats consolidates the four legacy miscellaneous tables
            (wins/losses by margin, weeks at the top/bottom, schedule-luck matrix).
            Five portrait frames below: default landing (Frame 1, pill-tab
            sub-nav), Schedule expanded (Frame 2), Form expanded (Frame 3), Stats
            expanded (Frame 4), and an alternative segmented-control sub-nav
            (Frame 5) for an A/B pick.
          </p>
          <StandingsNavShowcase />
        </section>

        {/* Part 2 surfaces — Standings tab only renders the standings
         * portrait surface; the rest (trophy room, schedule, waivers,
         * trades) live under the Other tab. */}
        {MOCKUP_PART2_SECTIONS.filter((s) => s.id === 'standings-portrait').map((section) => (
          <section key={section.id} className="mockup__section">
            <div className="mockup__eyebrow">{section.label}</div>
            {section.render()}
          </section>
        ))}
        </>)}

        {activeTab === 'other' && (<>
        {/* 17. Part 2 surfaces — staged separately, integrated as a batch */}
        {MOCKUP_PART2_SECTIONS.filter((s) => s.id !== 'standings-portrait').map((section) => (
          <section key={section.id} className="mockup__section">
            <div className="mockup__eyebrow">{section.label}</div>
            {section.render()}
          </section>
        ))}

        {/* 18. Settings — minimal card hosted inside the existing More menu */}
        <section className="mockup__section">
          <div className="mockup__eyebrow">Settings · in the More menu</div>
          <h2 className="mockup__section-h">Two preferences, one card</h2>
          <p className="mockup__section-sub">
            Bare minimum: theme and where the app lands when you open it.
            Lives in the More menu — no new header chrome.
          </p>
          <SettingsShowcase />
        </section>
        </>)}

        <div className="mockup-note">
          <strong style={{ color: 'var(--text-strong)' }}>System coverage:</strong> the
          slim hero, accent + shell, type scale, nav, and player-row atoms cover
          essentially every screen in the app. Sections like FPL Live tabs, Team
          Selection sub-views, the Hall career detail, and the Form/H2H widgets just
          recompose these atoms — no new chrome required.
        </div>
      </div>
    </div>
  )
}
