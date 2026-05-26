import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react'
import { gameWeekSelectLabel } from './gwLabel.js'
import { NavIcon } from './NavIcon.jsx'

const LEAGUE_TITLE_ABBR = 'TCLOT'
const LEAGUE_TITLE = 'Tri-Continental League of Titans, 2025-26 season'
/** Single source of truth for the header season label. Hardcoded for now — when we
 * introduce dynamic season detection (driven off `events.data[0].deadline_time` or a
 * build-time constant), update this and `brandHeaderStatus.deriveBrandHeaderStatus`'s
 * `season` arg in lockstep. */
const BRAND_HEADER_SEASON = '2025/26'
const BRAND_HEADER_TOP_N = 8

// Lion silhouette extracted verbatim from public/tclot-fantasy-style-banner.svg.
// Kept inline so it inherits currentColor (no second network fetch, themable).
const TCLOT_LION_PATH = "m 60.78468,39.44666 c -1.88455,1.54443 -3.48225,2.4052 -3.48225,2.4052 l 0.0218,4.89541 c 1.34714,1.46649 2.67613,2.68148 3.67106,4.8954 1.88818,-3.31555 1.52507,-8.18972 -0.2106,-12.19601 m -1.53234,16.0252 c 0,0 -0.38489,-2.01909 -2.02253,-3.90357 l -3.73642,0.0886 c 0,0 -5.03636,4.22239 -8.10829,4.32156 0,0 1.6921,3.07115 2.54905,4.6758 1.68847,-0.36132 4.66235,-1.66133 5.86062,-3.02156 0,0 0.79159,2.49022 0.64271,5.43029 1.68121,-0.94932 3.99786,-3.52809 4.81486,-7.59107 m -4.81486,-8.84149 -0.007,-4.8777 c 0,0 -2.23314,-0.69782 -4.61515,-2.50084 -4.78582,0.70492 -10.58109,5.40195 -10.58109,5.40195 0,0 1.95718,3.62375 4.09954,7.53441 3.76547,0.51362 9.31382,-4.12675 11.10396,-5.55782 m 12.76338,20.31134 -3.07919,-3.32618 c -0.87873,8.99027 -5.39221,16.62385 -13.68205,21.94787 l -1.26726,-4.84936 c -7.03711,4.95917 -19.11421,8.17555 -29.48832,2.45125 1.28904,-6.4115 2.43285,-12.90801 -0.0218,-20.68683 -5.74443,8.67855 -10.828,12.07912 -10.828,12.07912 C 4.95285,68.19927 5.30143,55.44358 6.45976,51.68877 L 0,53.64056 C 0,49.35442 3.1627,40.26143 7.74518,35.15348 L 3.711,34.52296 l -0.004,0 C 6.4485,29.05725 10.54077,24.34603 15.54808,20.80731 l 0.007,-0.004 c -1.50328,2.31664 -1.52507,8.03385 2.87948,10.20881 -1.87002,-3.19866 -2.09515,-7.15184 -0.14161,-9.19927 1.95354,-2.06514 5.2397,-1.35668 7.33849,0.24442 -0.62455,-1.7853 -2.45464,-4.031096 -5.19613,-4.183413 l -0.004,0 c 5.17797,-2.600022 11.05676,-4.062977 17.27686,-4.062977 1.16196,0 2.32029,0.04959 3.4532,0.148775 l 0,0 c 1.8083,0.708453 4.46264,3.195123 5.70086,4.743095 0,0 0.0871,-1.82427 -0.95136,-4.027558 6.73573,1.601103 9.94927,4.275518 11.29641,5.564898 0.27597,2.8409 1.14744,4.54473 2.2985,7.24393 -2.1823,-2.38395 -7.66529,-6.23084 -10.28333,-7.15183 0,0 -0.21423,2.46188 -1.11475,3.64499 -5.21429,-3.66978 -7.77423,-4.59432 -7.77423,-4.59432 -5.72264,0.80055 -9.4046,2.95425 -11.40534,4.64746 l 1.74293,1.44877 c -3.44956,1.03435 -5.68996,3.92483 -5.68996,3.92483 0.0254,0.0532 3.08282,0.47821 3.08282,0.47821 0,0 -0.31228,3.5033 4.18305,5.69951 3.85262,1.88094 9.39007,-0.45341 14.60436,1.58693 -3.42777,-3.86106 -5.7989,-5.58615 -5.7989,-5.58615 0,0 -1.36167,-0.27629 -2.32028,-0.26922 -1.19827,0.007 -2.98478,0.23734 -4.94195,-0.50654 -0.93683,-0.35777 -2.0298,-0.98828 -2.88674,-1.51254 0,0 2.40743,-2.41229 5.92598,-2.94363 0,0 3.1736,0.8714 5.68634,2.68504 1.67031,-1.58693 3.41325,-1.53734 3.41325,-1.53734 0,0 -1.72842,1.57276 -1.20553,3.4785 2.5091,2.18204 5.23244,5.30631 5.23244,5.30631 2.77417,-1.48067 8.80546,-1.14061 10.04367,0.26213 -1.56864,-1.9872 -3.83083,-3.64499 -5.58103,-5.06189 -0.21423,-0.74388 -2.1242,-3.33681 -2.44737,-3.57769 0,0 1.81556,0.54551 3.43867,1.96596 0.46478,-0.64824 1.33625,-1.3071 2.52363,-1.59756 1.22005,0.99891 1.43792,2.53271 1.40524,2.78776 -0.5483,0.64115 -1.09297,0.90328 -1.09297,0.90328 l 2.94121,3.10656 0.29412,-2.22809 c 6.77567,9.44014 10.46852,20.36448 5.71901,34.09784 M 13.69195,7.197881 c 3.90709,1.746337 6.41619,3.949626 6.87371,4.286141 -0.20697,-0.984749 -0.97677,-5.7243 -1.41977,-8.667921 2.27671,1.540885 7.55999,5.118572 9.2993,6.280434 0.70807,-2.1289 3.1627,-9.082366 3.1627,-9.082366 0,0 4.43723,7.0066 5.19613,8.143667 C 37.72996,7.212051 43.03139,1.455872 44.40396,0 c 0.22876,3.312017 0.54103,8.048026 0.62092,8.760021 0.26507,-0.350685 2.29487,-3.12782 5.69722,-5.685335 -1.47423,2.833811 -2.17867,6.744471 -2.49094,9.88646 -3.34789,-0.910362 -6.88097,-1.399194 -10.51936,-1.399194 -6.9899,0 -13.55496,1.792386 -19.2304,4.941459 -1.03124,-3.035721 -2.64709,-6.811775 -4.78945,-9.30553"

function TclotLionIcon({ size = 22 }) {
  return (
    <svg
      viewBox="-10 -8 134 144"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block' }}
    >
      <g fill="currentColor" transform="scale(1.58)">
        <path d={TCLOT_LION_PATH} />
      </g>
    </svg>
  )
}

/** Renders the status strip body inside `.brand-header__status-strip`. Branches per
 * `liveStatus.status` ('live' | 'idle' | 'pre-season'). Returns `null` when state is
 * unknown (bootstrap not loaded yet) so the strip collapses rather than flashing
 * placeholder copy. */
function BrandHeaderStatusBody({ liveStatus }) {
  if (!liveStatus || liveStatus.status === 'unknown') return null
  const { status, liveGw, lastFinishedGw, nextGw, nextDeadlineLabel, seasonShort } =
    liveStatus

  if (status === 'live') {
    const liveCount = Number.isFinite(liveStatus.liveFixtureCount)
      ? liveStatus.liveFixtureCount
      : null
    const minute = Number.isFinite(liveStatus.minute) ? liveStatus.minute : null
    return (
      <>
        <span className="brand-header__status-dot" aria-hidden>
          <NavIcon name="pulsing-dot" size={12} className="brand-header__status-dot-svg" />
        </span>
        <span className="brand-header__status-strong">GW {liveGw}</span>
        {liveCount != null ? (
          <>
            <span className="brand-header__status-sep">—</span>
            <span>{liveCount} fixtures live</span>
          </>
        ) : null}
        {minute != null ? (
          <>
            <span className="brand-header__status-sep">·</span>
            <span className="brand-header__status-mono">{minute}&apos;</span>
          </>
        ) : null}
        {liveCount == null && minute == null ? (
          <>
            <span className="brand-header__status-sep">·</span>
            <span>Live</span>
          </>
        ) : null}
      </>
    )
  }

  if (status === 'idle') {
    // Post-season: between FPL seasons, bootstrap reports `events.next` as null.
    // Surface that explicitly instead of leaking a placeholder `GW ?`. Pre-PR-#3.7
    // showcased this as "Season {seasonShort} complete" to keep the strip honest
    // while the new season's deadlines populate.
    if (nextGw == null) {
      return (
        <>
          <span className="brand-header__status-strong">
            GW {lastFinishedGw} complete
          </span>
          <span className="brand-header__status-sep">·</span>
          <span>Season {seasonShort} complete</span>
        </>
      )
    }
    return (
      <>
        <span className="brand-header__status-strong">
          GW {lastFinishedGw} complete
        </span>
        <span className="brand-header__status-sep">·</span>
        <span>
          GW {nextGw} of {seasonShort} starts {nextDeadlineLabel ?? 'soon'}
        </span>
      </>
    )
  }

  // pre-season
  return (
    <>
      <span className="brand-header__status-strong">Pre-season</span>
      <span className="brand-header__status-sep">·</span>
      <span>
        GW {nextGw ?? 1} of {seasonShort} starts {nextDeadlineLabel ?? 'soon'}
      </span>
    </>
  )
}

/**
 * Header tile carrying the brand pill + season meta + top-8 fantasy crests
 * (rank 1 leftmost → rank 8 rightmost), with the status strip beneath. Spec:
 * variant 4 of HEADER · POST-PR-#2 EVOLUTION (Mockup.jsx `HeroVariantBSeasonAndCrests`).
 *
 * @param {{
 *   tableRows?: object[],
 *   leagueEntries?: object[],
 *   teamLogoMap?: Record<string, string>,
 *   kitIndexByEntry?: Record<string, number>,
 *   liveStatus?: object | null,
 * }} props
 */
function BrandHeader({
  tableRows,
  leagueEntries,
  teamLogoMap,
  kitIndexByEntry,
  liveStatus,
}) {
  const entryById = useMemo(() => {
    const m = new Map()
    for (const e of leagueEntries ?? []) {
      if (e?.id != null) m.set(e.id, e)
    }
    return m
  }, [leagueEntries])

  const topRows = useMemo(() => {
    const list = Array.isArray(tableRows) ? tableRows : []
    const sorted = [...list].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    return sorted.slice(0, BRAND_HEADER_TOP_N)
  }, [tableRows])

  const showStatusStrip = !!liveStatus && liveStatus.status !== 'unknown'

  return (
    <section
      className="tile tile--brand-header"
      aria-label={`${LEAGUE_TITLE_ABBR} — ${LEAGUE_TITLE}`}
    >
      <div className="brand-header__row">
        <span className="brand-header__pill" aria-label={LEAGUE_TITLE_ABBR}>
          <TclotLionIcon size={22} />
          <span className="brand-header__wordmark">{LEAGUE_TITLE_ABBR}</span>
        </span>
        <span className="brand-header__meta brand-header__meta--season">
          {BRAND_HEADER_SEASON}
        </span>
        <span
          className="brand-header__crests"
          aria-label="League standings — top 8"
        >
          {topRows.map((r) => {
            const e = entryById.get(r.league_entry) ?? {}
            const teamName = e.entry_name ?? '—'
            const mgr = `${e.player_first_name ?? ''} ${e.player_last_name ?? ''}`.trim()
            const title = mgr
              ? `${r.rank}. ${teamName} — ${mgr}`
              : `${r.rank}. ${teamName}`
            return (
              <span
                className="brand-header__crest"
                key={r.league_entry ?? `${r.rank}-${teamName}`}
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
          })}
        </span>
      </div>
      {showStatusStrip ? (
        <div
          className={`brand-header__status-strip brand-header__status-strip--${liveStatus.status}`}
          role="status"
          aria-live="polite"
        >
          <BrandHeaderStatusBody liveStatus={liveStatus} />
        </div>
      ) : null}
    </section>
  )
}
import {
  useLeagueData,
  FORM_LAST_N,
  FORM_STRIP_N,
  WIN_MARGIN_BUCKET_KEYS,
} from './useLeagueData'
import { TeamAvatar } from './TeamAvatar'
import { useLeagueLeaderFavicon } from './useLeagueLeaderFavicon'
import { useDraftBootstrapEvents } from './useDraftBootstrapEvents'
import { deriveBrandHeaderStatus } from './brandHeaderStatus.js'
import { useFplFixtureLiveSummary } from './useFplFixtureLiveSummary.js'
import { PlayerKit } from './PlayerKit.jsx'
import { LiveScores } from './LiveScores'
import { FplLiveGwTickerBar } from './FplLiveGwTickerBar'
import { PlayerDetailOverlayProvider } from './PlayerDetailOverlay.jsx'
import { PlayerHistoryProvider, ClickablePlayerName } from './PlayerHistoryContext.jsx'
import { PremWindow } from './PremWindow'
import { DraftBoard } from './DraftBoard'
import { ThemeToggle } from './ThemeToggle'
import { DashboardNav, DashboardMorePanel } from './DashboardNav'
import { SettingsPage } from './SettingsPage'
import {
  DEFAULT_TAB_STORAGE_KEY,
  readStoredDefaultTab,
} from './settingsStorage'
import { useAutoHideBottomNav } from './useAutoHideBottomNav'
import { WaiverSummaryShare } from './WaiverSummaryShare'
import {
  sortGroupsByFirstWaiverOrder,
  sortMovesWaiverThenFa,
} from './waiverMovesSort.js'
import {
  HALL_SEASON_FINAL_TABLES,
  computeHallManagerCareerRows,
  computeHallManagerTeamHistory,
  computeLiveHallManagerCareerRows,
} from './hallManagerHistory'
import {
  resolveDefaultWaiverGameweek,
  resolveLiveGameweek,
} from './h2hScheduleGw.js'
import { FixtureScheduleMatrix } from './FixtureScheduleMatrix.jsx'
import { FormAndH2hSection } from './FormAndH2hSection.jsx'
import { PlayersWorkbench } from './PlayersWorkbench.jsx'
import { parsePlayersHash, stripPlayersHash } from './playerRoutes.js'
import './App.css'

/** Sorted ascending unique GWs from schedule rows (1–38). */
function sortedUniqueGwFromMatches(matches, predicate) {
  const s = new Set()
  for (const m of matches ?? []) {
    if (!predicate(m)) continue
    const g = Number(m.event)
    if (Number.isFinite(g) && g >= 1 && g <= 38) s.add(g)
  }
  return [...s].sort((a, b) => a - b)
}
const FORM_STRIP_DESKTOP_N = 7

function useFormStripDisplayCount() {
  const subscribe = useCallback((onChange) => {
    if (typeof window === 'undefined') return () => {}
    const mq = window.matchMedia('(max-width: 560px)')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return FORM_STRIP_DESKTOP_N
    return window.matchMedia('(max-width: 560px)').matches
      ? FORM_STRIP_N
      : FORM_STRIP_DESKTOP_N
  }, [])
  return useSyncExternalStore(subscribe, getSnapshot, () => FORM_STRIP_DESKTOP_N)
}

/** Last whitespace-delimited segment (e.g. "Toronto Oizo" → "Oizo"). Single-word names unchanged. */
function teamNameLastWord(name) {
  if (typeof name !== 'string') return ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return parts[0] ?? ''
  return parts[parts.length - 1]
}

/** Complete / future GW tiles: split so mobile can show first token only (narrow under 560px). */
function teamNameFirstRest(name) {
  if (typeof name !== 'string') return { single: true, first: '', rest: '' }
  const parts = name.trim().split(/\s+/u).filter(Boolean)
  if (parts.length <= 1) return { single: true, first: parts[0] ?? '', rest: '' }
  return { single: false, first: parts[0], rest: parts.slice(1).join(' ') }
}

function GwFixtureTightTeamName({ name }) {
  const { single, first, rest } = teamNameFirstRest(name)
  if (single) {
    return (
      <span className="gw-fixture-name-text team-name team-name--sidebar" title={name || undefined}>
        {first || '—'}
      </span>
    )
  }
  return (
    <span
      className="gw-fixture-name-text team-name team-name--sidebar gw-fixture-name-text--mobile-first-token"
      title={name || undefined}
    >
      <span className="gw-fixture-name-text__first">{first}</span>
      <span className="gw-fixture-name-text__sep" aria-hidden="true">
        {' '}
      </span>
      <span className="gw-fixture-name-text__rest">{rest}</span>
    </span>
  )
}

/** Matches `.trade-card` portrait rules: narrow view + portrait orientation. */
function usePortraitTradeTeamAbbrev() {
  const subscribe = useCallback((onChange) => {
    if (typeof window === 'undefined') return () => {}
    const mq = window.matchMedia(
      '(max-width: 1080px) and (orientation: portrait)',
    )
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(
      '(max-width: 1080px) and (orientation: portrait)',
    ).matches
  }, [])
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/**
 * Past champions — optional `entryId` (team-logos-web), or `bannerImage`.
 * Use `bannerLayout: 'centerImage'` when art should stay centred with title above & season below
 * (`bannerImage`). Otherwise full-bleed cover (titles often baked into the PNG).
 *
 * @type {Array<{
 *   season: string,
 *   team: string,
 *   bannerImage?: string,
 *   bannerLayout?: 'centerImage',
 * }>}
 */
const HALL_OF_CHAMPIONS = [
  {
    season: '2020-21',
    team: 'Essex Ratigans',
    bannerImage: 'hall-champions/essex-ratigans.png',
  },
  {
    season: '2021-22',
    team: 'Dalston Bellsprouts',
    bannerImage: 'hall-champions/dalston-bellsprouts.png',
  },
  {
    season: '2022-23',
    team: 'Dalston Benoit',
    bannerImage: 'hall-champions/dalston-benoit.png',
  },
  {
    season: '2023-24',
    team: 'Toronto Wiggum',
    bannerImage: 'hall-champions/toronto-wiggum.png',
  },
  {
    season: '2024-25',
    team: 'Soul Ze Moles',
    bannerImage: 'hall-champions/soul-ze-moles.png',
  },
  {
    season: '2025-26',
    team: 'Crouch End Oashisu',
    bannerImage: 'hall-champions/crouch-end-oashisu.png',
  },
]

/** Sortable career-totals header (Hall of Champions manager table). */
function HallManagerSortTh({ columnKey, sortState, onSort, label, title, className, stringSort = false }) {
  const active = sortState.key === columnKey
  const dir = active ? sortState.dir : null
  let arrowGlyph = '↕'
  let arrowClass = 'standings-sort-arrow'
  if (active) {
    arrowGlyph = dir === 'asc' ? '↑' : '↓'
    arrowClass += ` standings-sort-arrow--active standings-sort-arrow--${dir}`
  }
  const ariaSort = active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined
  const ariaLabel = active
    ? stringSort
      ? `${label}: sorted ${dir === 'asc' ? 'A to Z' : 'Z to A'}. Click to reverse.`
      : `${label}: sorted ${dir === 'desc' ? 'high to low' : 'low to high'}. Click to reverse.`
    : `Sort by ${label}`

  return (
    <th scope="col" className={className} title={title}>
      <button
        type="button"
        className="standings-sort-btn hall-manager-sort-btn"
        onClick={() => onSort(columnKey)}
        aria-sort={ariaSort}
        aria-label={ariaLabel}
      >
        <span className="standings-sort-btn__label">{label}</span>
        <span className={arrowClass} aria-hidden>
          {arrowGlyph}
        </span>
      </button>
    </th>
  )
}

function HallManagerCareerTable({ title, headingId, explanation, careerRows }) {
  const [sort, setSort] = useState({ key: 'totalPts', dir: 'desc' })

  const handleSort = useCallback((columnKey) => {
    setSort((prev) => {
      if (prev.key === columnKey) {
        return { key: columnKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      }
      const defaultDir = columnKey === 'key' ? 'asc' : 'desc'
      return { key: columnKey, dir: defaultDir }
    })
  }, [])

  const sortedRows = useMemo(() => {
    const { key: sk, dir } = sort
    const mult = dir === 'asc' ? 1 : -1
    const out = [...careerRows]
    out.sort((a, b) => {
      switch (sk) {
        case 'key':
          return mult * a.key.localeCompare(b.key, undefined, { sensitivity: 'base' })
        case 'seasons':
          return mult * (a.seasons - b.seasons)
        case 'titles':
          return mult * (a.titles - b.titles)
        case 'lastPlaceCount':
          return mult * (a.lastPlaceCount - b.lastPlaceCount)
        case 'avgRank':
          return mult * (a.avgRank - b.avgRank)
        case 'totalPf':
          return mult * (a.totalPf - b.totalPf)
        case 'totalPts':
          return mult * (a.totalPts - b.totalPts)
        case 'totalPlacementPts':
          return mult * (a.totalPlacementPts - b.totalPlacementPts)
        default:
          return 0
      }
    })
    return out
  }, [careerRows, sort])

  return (
    <section
      className="tile hall-of-champions tile--standings hall-standings-sheet"
      aria-labelledby={headingId}
    >
      <div className="tile-head-row tile-head-row--tight">
        <div className="hall-standings-sheet__headstack">
          <h2 id={headingId} className="tile-title tile-title--sm hall-standings-sheet__title">
            {title}
          </h2>
          {explanation ? (
            <p className="hall-standings-sheet__explanation muted">{explanation}</p>
          ) : null}
        </div>
      </div>
      <div className="table-scroll table-scroll--standings-open">
        <table className="standings-table standings-table--sidebar standings-table--hall-career">
          <thead>
            <tr>
              <th scope="col" className="col-team" title="Manager">
                Manager
              </th>
              <HallManagerSortTh
                columnKey="seasons"
                sortState={sort}
                onSort={handleSort}
                label="Seasons"
                title="Seasons in TCLOT"
                className="col-num tabular hall-manager-th--num"
              />
              <HallManagerSortTh
                columnKey="titles"
                sortState={sort}
                onSort={handleSort}
                label="Titles"
                title="League titles (finished 1st)"
                className="col-num tabular hall-manager-th--num"
              />
              <HallManagerSortTh
                columnKey="lastPlaceCount"
                sortState={sort}
                onSort={handleSort}
                label="Last"
                title="Times finished last in the table that season"
                className="col-num tabular hall-manager-th--num hall-manager-col--hide-portrait"
              />
              <HallManagerSortTh
                columnKey="avgRank"
                sortState={sort}
                onSort={handleSort}
                label="Average Rank"
                title="Mean finishing position (lower is better)"
                className="col-num tabular hall-manager-th--num hall-manager-col--hide-portrait"
              />
              <HallManagerSortTh
                columnKey="totalPf"
                sortState={sort}
                onSort={handleSort}
                label="For"
                title="Total FPL points scored (sum of For across seasons)"
                className="col-num tabular hall-manager-th--num"
              />
              <HallManagerSortTh
                columnKey="totalPts"
                sortState={sort}
                onSort={handleSort}
                label="Total Pts"
                title="Total table points (3 / 1 / 0 per H2H), summed across seasons"
                className="col-num tabular hall-manager-th--num col-pts"
              />
              <HallManagerSortTh
                columnKey="totalPlacementPts"
                sortState={sort}
                onSort={handleSort}
                label="Algorithm"
                title="Placement score: 8 for 1st, 7 for 2nd, … 1 for 8th each season"
                className="col-num tabular hall-manager-th--num"
              />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => (
              <tr key={r.key}>
                <th scope="row" className="col-team hall-career-mgr hall-manager-name--gold">
                  {r.key}
                </th>
                <td className="col-num tabular">{r.seasons}</td>
                <td className="col-num tabular">{r.titles}</td>
                <td className="col-num tabular hall-manager-col--hide-portrait">
                  {r.lastPlaceCount}
                </td>
                <td className="col-num tabular hall-manager-col--hide-portrait">
                  {r.avgRank.toFixed(2)}
                </td>
                <td className="col-num tabular">{r.totalPf}</td>
                <td className="col-num col-pts tabular">
                  <strong>{r.totalPts}</strong>
                </td>
                <td className="col-num tabular">
                  <strong>{r.totalPlacementPts}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function HallManagerCareerDashboard({ tableRows = [] }) {
  const staticRows = useMemo(() => computeHallManagerCareerRows(), [])
  const liveRows = useMemo(
    () => computeLiveHallManagerCareerRows(tableRows),
    [tableRows],
  )

  return (
    <>
      <HallManagerCareerTable
        headingId="hall-champions-static-heading"
        title="TCLOT Champion of Champions"
        careerRows={staticRows}
      />
      <HallManagerCareerTable
        headingId="hall-champions-live-heading"
        title="Live Champions of Champions"
        explanation="Includes current 2025/26 season"
        careerRows={liveRows}
      />
    </>
  )
}

/** e.g. "2024-25" → "2024/25" for season labels */
function formatHallSeasonLabel(seasonKey) {
  const [y1, y2] = String(seasonKey ?? '').split('-')
  if (y1 && y2) return `${y1}/${y2}`
  return seasonKey
}

function HistoricStandingsSection() {
  const seasonOptions = useMemo(
    () => [...HALL_SEASON_FINAL_TABLES].reverse(),
    [],
  )
  const [selectedSeason, setSelectedSeason] = useState(
    () =>
      HALL_SEASON_FINAL_TABLES[HALL_SEASON_FINAL_TABLES.length - 1]?.season ?? '',
  )

  const activeTable = useMemo(
    () => HALL_SEASON_FINAL_TABLES.find((s) => s.season === selectedSeason),
    [selectedSeason],
  )
  const rows = activeTable?.rows ?? []
  const nTeams = rows.length

  return (
    <section
      className="tile hall-of-champions tile--standings hall-standings-sheet"
      aria-labelledby="hall-historic-standings-heading"
    >
      <div className="tile-head-row tile-head-row--tight">
        <h2
          id="hall-historic-standings-heading"
          className="tile-title tile-title--sm tile-title--with-select hall-standings-sheet__title"
        >
          <span className="tile-title__text">Historic Standings</span>
          {seasonOptions.length > 0 ? (
            <select
              className="hall-historic-season-select"
              aria-label="Completed season"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
            >
              {seasonOptions.map(({ season }) => (
                <option key={season} value={season}>
                  Season {formatHallSeasonLabel(season)}
                </option>
              ))}
            </select>
          ) : null}
        </h2>
      </div>
      <div className="table-scroll table-scroll--standings-open">
        <table className="standings-table standings-table--sidebar standings-table--historic">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-team">Team</th>
              <th className="col-num col-pl">PL</th>
              <th className="col-num col-wdl">W</th>
              <th className="col-num col-wdl">D</th>
              <th className="col-num col-wdl">L</th>
              <th
                className="col-num col-for"
                title="Total FPL points scored across H2H gameweeks that season"
              >
                For
              </th>
              <th
                className="col-num col-pts"
                title="League points (3 / 1 / 0 per H2H)"
              >
                PTS
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const pl = row.w + row.d + row.l
              const isLeader = row.rank === 1
              const isLast = nTeams > 0 && row.rank === nTeams
              const rowClass = [
                isLeader ? 'row-highlight' : '',
                isLeader ? 'standings-row--divider-below' : '',
                isLast ? 'standings-row--divider-above standings-row--8th' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <tr
                  key={`${selectedSeason}-${row.team}-${row.rank}`}
                  className={rowClass || undefined}
                >
                  <td className="col-rank">
                    {isLast ? (
                      <span
                        role="img"
                        className="standings-rank-8"
                        aria-label={String(nTeams)}
                      >
                        🧩
                      </span>
                    ) : (
                      row.rank
                    )}
                  </td>
                  <td className="col-team">
                    <span className="historic-standings-team">
                      <span className="historic-standings-team__name">{row.team}</span>
                      <span className="historic-standings-team__mgr muted tabular">
                        {row.manager}
                      </span>
                    </span>
                  </td>
                  <td className="col-num col-pl tabular">{pl}</td>
                  <td className="col-num col-wdl">{row.w}</td>
                  <td className="col-num col-wdl">{row.d}</td>
                  <td className="col-num col-wdl">{row.l}</td>
                  <td className="col-num col-for tabular" title="Points for, that season">
                    {row.pf}
                  </td>
                  <td className="col-num col-pts tabular">
                    <strong>{row.pts}</strong>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function HallTeamHistorySection({ tableRows = [] }) {
  const rows = useMemo(
    () => computeHallManagerTeamHistory(tableRows),
    [tableRows],
  )

  return (
    <section
      className="tile hall-of-champions tile--compact hall-team-history"
      aria-labelledby="hall-team-history-heading"
    >
      <div className="tile-head-row tile-head-row--tight">
        <h2
          id="hall-team-history-heading"
          className="tile-title tile-title--sm hall-manager-dash__title"
        >
          Team History
        </h2>
      </div>
      <div className="latest-waivers hall-team-history__list">
        {rows.map(({ key, entries }) => (
          <div key={key} className="latest-waivers__team-block hall-team-history__block">
            <h3 className="latest-waivers__team-title hall-team-history__manager">
              <span>{key}</span>
            </h3>
            <ul
              className="latest-waivers__move-list hall-team-history__teams"
              aria-label={`Teams managed by ${key}, chronological`}
            >
              {entries.map((e) => (
                <li
                  key={`${e.season}-${e.team}`}
                  className="latest-waivers__move hall-team-history__team-cell"
                >
                  <div className="hall-team-history__team-stack">
                    <span className="hall-team-history__team-name">{e.team}</span>
                    <span className="hall-team-history__season muted tabular">{e.season}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function HallOfChampions({ logoMap, kitIndexByEntry = {}, tableRows = [] }) {
  return (
    <>
      <section
        className="tile hall-of-champions"
        aria-labelledby="hall-champions-heading"
      >
        <h2
          id="hall-champions-heading"
          className="tile-title tile-title--sm hall-of-champions__main-title"
        >
          TCLOT Hall of Champions
        </h2>
        <div className="hall-of-champions__rule" aria-hidden="true" />
        <ul className="hall-of-champions__list">
          {HALL_OF_CHAMPIONS.map((row) => {
            const centerImageLayout = row.bannerLayout === 'centerImage'
            const sheetMods = [
              'hall-champion-banner__sheet',
              row.bannerImage && !centerImageLayout
                ? 'hall-champion-banner__sheet--fullbleed'
                : null,
              row.bannerImage && centerImageLayout
                ? 'hall-champion-banner__sheet--center-image'
                : null,
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <li key={row.season} className="hall-champion-banner">
                <div className="hall-champion-banner__rigging" aria-hidden="true">
                  <div className="hall-champion-banner__rod" />
                  <div className="hall-champion-banner__cords">
                    <span className="hall-champion-banner__cord" />
                    <span className="hall-champion-banner__cord" />
                  </div>
                </div>
                <div className={sheetMods}>
                  {row.bannerImage && !centerImageLayout ? (
                    <img
                      className="hall-champion-banner__fullbleed-img"
                      src={`${import.meta.env.BASE_URL}${row.bannerImage}`}
                      alt={`${row.team}, ${row.season} season champion`}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                  <div
                    className={
                      'hall-champion-banner__sheet-content' +
                      (centerImageLayout ? ' hall-champion-banner__sheet-content--center-image' : '')
                    }
                  >
                    <p className="hall-champion-banner__team">{row.team}</p>
                    {row.bannerImage && centerImageLayout ? (
                      <div className="hall-champion-banner__center-image-wrap">
                        <img
                          className="hall-champion-banner__center-image-img"
                          src={`${import.meta.env.BASE_URL}${row.bannerImage}`}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ) : row.bannerImage ? (
                      <div
                        className="hall-champion-banner__sheet-spacer"
                        aria-hidden="true"
                      />
                    ) : (
                      <div className="hall-champion-banner__avatar">
                        <TeamAvatar
                          entryId={row.entryId ?? null}
                          name={row.team}
                          size="lg"
                          logoMap={logoMap ?? {}}
                          kitIndexByEntry={kitIndexByEntry}
                        />
                      </div>
                    )}
                    <p className="hall-champion-banner__season">
                      {centerImageLayout ? row.season : `${row.season} season`}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
      <HistoricStandingsSection />
      <HallManagerCareerDashboard tableRows={tableRows} />
      <HallTeamHistorySection tableRows={tableRows} />
    </>
  )
}

function FormCircles({ form }) {
  return (
    <div className="form-circles" aria-label="Last matches form">
      {form.map((r, i) => {
        if (r == null) {
          return <span key={i} className="form-dot form-dot--empty" aria-label="No result" />
        }
        const result = typeof r === 'object' ? r.result : r
        const tooltip =
          typeof r === 'object' && r.opponentName
            ? `GW${r.event} · ${r.scoreStr} · vs ${r.opponentName}`
            : result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Draw'
        return (
          <span
            key={i}
            className={`form-dot form-dot--${result === 'W' ? 'win' : result === 'L' ? 'loss' : 'draw'}`}
            data-tooltip={tooltip}
            aria-label={tooltip}
          >
            {result}
          </span>
        )
      })}
    </div>
  )
}

/** One player row inside a trade tile (offered or received leg). */
function TradePlayerLine({ leg }) {
  if (!leg) return null
  const teamShort = leg.gained.teamShort
  return (
    <div className="trade-player-line">
      <PlayerKit
        shirtUrl={leg.gained.shirtUrl}
        badgeUrl={leg.gained.badgeUrl}
        teamShort={teamShort}
      />
      <div className="trade-player-line__text">
        <ClickablePlayerName
          element={leg.gained.elementId}
          web_name={leg.gained.web_name}
          teamShort={teamShort}
          className="trade-player-line__name"
        >
          <span className="trade-player-line__name-text">{leg.gained.web_name}</span>
          {teamShort ? (
            <span className="trade-player-line__team-abbr muted"> ({teamShort})</span>
          ) : null}
        </ClickablePlayerName>
        {leg.gwRangeLabel != null ? (
          <span className="trade-player-line__pts muted tabular">
            GW {leg.gwRangeLabel}
            {leg.stillOnTeam ? ' · on squad' : ''}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** Single processed-trade card (GW, date, managers, pairs + tenure points). */
function TradeCardArticle({ trade, teamLogoMap, kitIndexByEntry = {} }) {
  const portraitAbbrev = usePortraitTradeTeamAbbrev()
  const pairs = trade.pairs || []
  const offeredPtsTotal = pairs.reduce(
    (s, p) => s + (Number(p.offeredLeg?.totalPoints) || 0),
    0,
  )
  const receivedPtsTotal = pairs.reduce(
    (s, p) => s + (Number(p.receivedLeg?.totalPoints) || 0),
    0,
  )
  const multiPair = pairs.length > 1
  return (
    <article className="trade-card">
      <div className="trade-card__head">
        {trade.event != null ? (
          <span className="league-pill league-pill--sm">GW {trade.event}</span>
        ) : null}
        {trade.responseTime ? (
          <time className="muted trade-card__date" dateTime={trade.responseTime}>
            {new Date(trade.responseTime).toLocaleDateString(undefined, {
              dateStyle: 'medium',
            })}
          </time>
        ) : null}
      </div>
      <div
        className="trade-card__teams-row"
        aria-label="Teams and cumulative tenure points from this trade"
      >
        <div className="trade-card__mgr trade-card__mgr--left">
          <TeamAvatar
            entryId={trade.offeredLeagueEntry ?? trade.offeredFplEntry}
            name={trade.offeredTeamName}
            size="sm"
            logoMap={teamLogoMap}
            kitIndexByEntry={kitIndexByEntry}
          />
          <span
            className="trade-card__mgr-name"
            title={trade.offeredTeamName}
            aria-label={trade.offeredTeamName}
          >
            {portraitAbbrev
              ? teamNameLastWord(trade.offeredTeamName)
              : trade.offeredTeamName}
          </span>
        </div>
        <div
          className="trade-card__pts-summary trade-card__pts-summary--center"
          aria-label="Total tenure points for players each side acquired in this trade"
        >
          <span className="trade-card__pts-summary-side tabular">
            <strong>{offeredPtsTotal}</strong>
            <span className="muted trade-card__pts-summary-label"> pts</span>
          </span>
          <span className="trade-card__vs trade-card__vs--summary" aria-hidden>
            ·
          </span>
          <span className="trade-card__pts-summary-side tabular">
            <strong>{receivedPtsTotal}</strong>
            <span className="muted trade-card__pts-summary-label"> pts</span>
          </span>
        </div>
        <div className="trade-card__mgr trade-card__mgr--right">
          <TeamAvatar
            entryId={trade.receivedLeagueEntry ?? trade.receivedFplEntry}
            name={trade.receivedTeamName}
            size="sm"
            logoMap={teamLogoMap}
            kitIndexByEntry={kitIndexByEntry}
          />
          <span
            className="trade-card__mgr-name"
            title={trade.receivedTeamName}
            aria-label={trade.receivedTeamName}
          >
            {portraitAbbrev
              ? teamNameLastWord(trade.receivedTeamName)
              : trade.receivedTeamName}
          </span>
        </div>
      </div>
      <div className="trade-pairs-grid">
        {multiPair ? (
          <div className="trade-pair trade-pair--bundled">
            <div className="trade-player-tile trade-player-tile--group">
              {pairs.map((pair, pidx) => (
                <TradePlayerLine key={`o-${pidx}`} leg={pair.offeredLeg} />
              ))}
            </div>
            <span className="trade-pair__swap" aria-hidden="true" title="Swap">
              ↔
            </span>
            <div className="trade-player-tile trade-player-tile--group">
              {pairs.map((pair, pidx) => (
                <TradePlayerLine key={`r-${pidx}`} leg={pair.receivedLeg} />
              ))}
            </div>
          </div>
        ) : (
          pairs.map((pair, pidx) => (
            <div key={pidx} className="trade-pair">
              <div className="trade-player-tile">
                <TradePlayerLine leg={pair.offeredLeg} />
              </div>
              <span
                className="trade-pair__swap"
                aria-hidden="true"
                title="Swap"
              >
                ↔
              </span>
              <div className="trade-player-tile">
                <TradePlayerLine leg={pair.receivedLeg} />
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  )
}

/** Resolve initial dashboard view: players hash > stored default-tab pref > Standings.
 * Standings is the new global default (PR #3 deliberate change). The viewport-based
 * mobile-defaults-to-Live behaviour from PR #1 is intentionally dropped — users who
 * want Live as their landing page can pick it in Settings. */
function initialDashboardViewForViewport() {
  if (typeof window === 'undefined') return 'standings'
  if (parsePlayersHash()) return /** @type {const} */ ('players')
  return readStoredDefaultTab()
}

/** Match `max-width: 600px` mobile layout — default waivers tab to compact Waiver summary. */
function initialWaiverFeedTabForViewport() {
  if (typeof window === 'undefined') return 'latest'
  return window.matchMedia('(max-width: 600px)').matches ? 'summary' : 'latest'
}

const STANDINGS_SORT_KEYS = /** @type {const} */ (['gf', 'ga', 'gd', 'total'])

/** Sortable header for For / Faced / GD / PTS — `null` sortState = league order. */
function StandingsSortTh({ columnKey, sortState, onSort, label, title, className }) {
  const isPts = columnKey === 'total'
  const active = sortState?.key === columnKey
  const dir = active ? sortState.dir : null
  /** League table is ordered by points high → low; show green ↓ on PTS when using that order */
  const ptsLeagueDefault = isPts && sortState === null

  let arrowGlyph = '↕'
  let arrowClass = 'standings-sort-arrow'
  if (isPts) {
    if (ptsLeagueDefault) {
      arrowGlyph = '↓'
      arrowClass += ' standings-sort-arrow--active standings-sort-arrow--desc'
    } else if (active) {
      arrowGlyph = dir === 'asc' ? '↑' : '↓'
      arrowClass += ` standings-sort-arrow--active standings-sort-arrow--${dir}`
    }
  } else if (active) {
    arrowGlyph = dir === 'asc' ? '↑' : '↓'
    arrowClass += ` standings-sort-arrow--active standings-sort-arrow--${dir}`
  }

  const ariaSort =
    ptsLeagueDefault
      ? 'descending'
      : active
        ? dir === 'asc'
          ? 'ascending'
          : 'descending'
        : undefined

  const ariaLabel = isPts
    ? ptsLeagueDefault
      ? 'League order (points high to low). Click to sort by points.'
      : active
        ? `PTS: sorted ${dir === 'desc' ? 'high to low' : 'low to high'}. Click to reverse.`
        : 'Sort by points'
    : active
      ? `${label}: sorted ${dir === 'desc' ? 'high to low' : 'low to high'}. Click to reverse.`
      : `Sort by ${label}`

  return (
    <th scope="col" className={className} title={title}>
      <button
        type="button"
        className="standings-sort-btn"
        onClick={() => onSort(columnKey)}
        aria-sort={ariaSort}
        aria-label={ariaLabel}
      >
        <span className="standings-sort-btn__label">{label}</span>
        <span className={arrowClass} aria-hidden>
          {arrowGlyph}
        </span>
      </button>
    </th>
  )
}

const EMPTY_LEAGUE_ENTRIES = []
const EMPTY_TEAM_LOGO_MAP = {}

/** localStorage key for the user's theme preference. Key name preserved
 * across the PR #3 ThemeToggle redesign so existing users who already
 * picked light/dark keep their choice. */
const THEME_STORAGE_KEY = 'tclot-theme'

/** Possible values: 'light' | 'dark' | 'system'. 'system' is new in PR #3
 * and means "follow `prefers-color-scheme`". Older stored values
 * ('light'/'dark') remain valid prefs — no migration needed. */
function readStoredThemePref() {
  if (typeof window === 'undefined') return 'light'
  try {
    const s = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (s === 'light' || s === 'dark' || s === 'system') return s
  } catch {
    /* ignore */
  }
  return 'light'
}

/** Resolve `'system'` to a concrete 'light' | 'dark' via prefers-color-scheme. */
function resolveSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const { data, error, loading } = useLeagueData()
  const {
    tableRows = [],
    teamFormStripByEntry = {},
    teamsForFormSelect = [],
    nextEvent = null,
    previousGameweek = null,
    isSampleData = false,
    fetchFailedDemo = false,
    teamLogoMap = {},
    defaultKitIndexByLeagueEntry: kitIndexByEntry = {},
    mostWaiveredPlayers = [],
    waiverOutPointsByTeam = [],
    waiverInTenureTopRows = [],
    waiverInPointsByTeam = [],
    winMarginBucketRows = [],
    lossMarginBucketRows = [],
    tradesPanelRows = [],
    matches = [],
    waiverOutGwRows = [],
    firstWaiverOrderPicks = [],
    gwRankExtremesMeta = { maxGw: 0, teamCount: 0 },
    gwWeeksAtFirst = [],
    gwWeeksAtLast = [],
  } = data ?? {}
  const leagueEntries = data?.leagueEntries ?? EMPTY_LEAGUE_ENTRIES
  const [formTeamId, setFormTeamId] = useState(null)
  const [waiverOutTeamFilter, setWaiverOutTeamFilter] = useState('all')
  const [waiverOutGwFilter, setWaiverOutGwFilter] = useState('all')
  const [waiverGwTableMode, setWaiverGwTableMode] = useState('out')
  const [dashboardView, setDashboardView] = useState(initialDashboardViewForViewport) // standings | teamSelection | hall | fplLive
  const [teamSelectionTab, setTeamSelectionTab] = useState(
    /** @type {'waivers' | 'trades' | 'draft'} */ ('waivers'),
  )
  const [fplLiveTab, setFplLiveTab] = useState(
    /** @type {'squads' | 'live' | 'projections'} */ ('live'),
  )
  /** `null` = API league order; otherwise sort by numeric column */
  const [standingsSort, setStandingsSort] = useState(null)
  const [liveGw, setLiveGw] = useState(null)
  /** Draft bootstrap `events.current` — default Live tab GW when user has not chosen one. */
  const [fplLiveLandingGw, setFplLiveLandingGw] = useState(null)
  const [waiverGwView, setWaiverGwView] = useState(null)
  /** latest = rich cards; summary = compact share / screenshot layout */
  const [waiverFeedTab, setWaiverFeedTab] = useState(initialWaiverFeedTabForViewport)
  const [completeGwView, setCompleteGwView] = useState(null)
  const [futureGwView, setFutureGwView] = useState(null)
  const formStripDisplayCount = useFormStripDisplayCount()
  const [themePref, setThemePref] = useState(() => readStoredThemePref())
  const [systemTheme, setSystemTheme] = useState(() => resolveSystemTheme())
  const colorTheme = themePref === 'system' ? systemTheme : themePref
  const [wireDetailOpen, setWireDetailOpen] = useState(false)
  const [playerDetailOverlayOpen, setPlayerDetailOverlayOpen] = useState(false)

  const bottomNavHidden = useAutoHideBottomNav({
    enabled:
      dashboardView !== 'more' &&
      !wireDetailOpen &&
      !playerDetailOverlayOpen,
  })

  const selectDashboardView = useCallback((view) => {
    setDashboardView(view)
    setPlayerDetailOverlayOpen(false)
    if (view !== 'players') {
      stripPlayersHash()
      setWireDetailOpen(false)
    }
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0)
    }
  }, [])

  useLayoutEffect(() => {
    document.body.dataset.tclotTheme = colorTheme
  }, [colorTheme])



  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    function onPlayersHashNavigate() {
      if (parsePlayersHash()) setDashboardView('players')
    }
    window.addEventListener('hashchange', onPlayersHashNavigate)
    return () => window.removeEventListener('hashchange', onPlayersHashNavigate)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themePref)
    } catch {
      /* ignore */
    }
  }, [themePref])

  /** Listen for OS-level prefers-color-scheme flips so 'system' mode
   * tracks the OS without a reload. No-op when the user picked an
   * explicit light/dark pref. */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setSystemTheme(e.matches ? 'dark' : 'light')
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  /** Default landing tab (Settings → Default landing tab). Stored in
   * localStorage (key DEFAULT_TAB_STORAGE_KEY); state is mirrored in
   * React so the Settings page's <select> reflects changes immediately. */
  const [defaultTabPref, setDefaultTabPrefState] = useState(() => readStoredDefaultTab())
  const setDefaultTabPref = useCallback((tabId) => {
    setDefaultTabPrefState(tabId)
    try {
      window.localStorage.setItem(DEFAULT_TAB_STORAGE_KEY, tabId)
    } catch {
      /* ignore */
    }
  }, [])

  const onBootstrapLiveMeta = useCallback((meta) => {
    setFplLiveLandingGw(meta?.currentGw ?? null)
  }, [])

  /** FPL draft calendar — fetched on mount so Waivers tab does not depend on opening Live first. */
  const draftBootstrapEvents = useDraftBootstrapEvents()

  /**
   * Page-global fixture summary for the brand-header status strip. PR #4 chose
   * Option B (a thin hook that polls only `classic fixtures?event={gw}` while
   * the GW is actually live) over hoisting `useLiveScores` — that hook also
   * pulls draft bootstrap, event/live, ESPN Prem, and per-team picks, which
   * would have multiplied off-tab network traffic for header data we don't
   * need. Shared `fetchFplJsonCached` means the Live tab still gets a warm
   * cache when the user opens it.
   */
  const { liveFixtureCount: brandLiveFixtureCount, minute: brandLiveMinute } =
    useFplFixtureLiveSummary({
      currentEvent: draftBootstrapEvents.currentEvent,
    })

  /**
   * Brand-header status strip state. Derived from the cheap bootstrap pull
   * plus the lightweight fixture summary above. Re-derives every render
   * (cheap object construction) so the strip stays correct after the
   * bootstrap auto-refetches across the GW deadline.
   */
  const brandHeaderStatus = useMemo(
    () =>
      deriveBrandHeaderStatus({
        currentEvent: draftBootstrapEvents.currentEvent,
        nextEvent: draftBootstrapEvents.nextEvent,
        lastFinishedEvent: draftBootstrapEvents.lastFinishedEvent,
        season: BRAND_HEADER_SEASON,
        liveFixtureCount: brandLiveFixtureCount,
        minute: brandLiveMinute,
      }),
    [
      draftBootstrapEvents.currentEvent,
      draftBootstrapEvents.nextEvent,
      draftBootstrapEvents.lastFinishedEvent,
      brandLiveFixtureCount,
      brandLiveMinute,
    ],
  )

  /** drops-gw-live rows: waivers only (excludes free-agency rows used in All Waivers). */
  const waiverOutRowsWaiverOnly = useMemo(
    () => (data?.waiverOutGwRows ?? []).filter((r) => r.transactionKind !== 'f'),
    [data?.waiverOutGwRows],
  )

  const waiverOutTeamOptions = useMemo(() => {
    const rows = waiverOutRowsWaiverOnly
    const m = new Map()
    for (const r of rows) {
      if (r.entry != null && !m.has(r.entry)) {
        m.set(r.entry, r.teamName ?? `Team ${r.entry}`)
      }
    }
    return [...m.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])))
  }, [waiverOutRowsWaiverOnly])

  const waiverOutGwOptions = useMemo(() => {
    const rows = waiverOutRowsWaiverOnly
    const s = new Set(rows.map((r) => r.gameweek).filter((g) => g != null))
    return [...s].sort((a, b) => a - b)
  }, [waiverOutRowsWaiverOnly])

  const filteredWaiverOutRows = useMemo(() => {
    const rows = waiverOutRowsWaiverOnly
    return rows.filter((r) => {
      if (
        waiverOutTeamFilter !== 'all' &&
        Number(r.entry) !== Number(waiverOutTeamFilter)
      ) {
        return false
      }
      if (
        waiverOutGwFilter !== 'all' &&
        Number(r.gameweek) !== Number(waiverOutGwFilter)
      ) {
        return false
      }
      return true
    })
  }, [waiverOutRowsWaiverOnly, waiverOutTeamFilter, waiverOutGwFilter])

  const waiverOutTeamPointsTotal = useMemo(() => {
    if (waiverOutTeamFilter === 'all') return null
    let sum = 0
    let missing = 0
    for (const r of filteredWaiverOutRows) {
      const v =
        waiverGwTableMode === 'out'
          ? r.droppedPlayerGwPoints
          : r.pickedUpPlayerGwPoints
      if (typeof v === 'number') sum += v
      else missing += 1
    }
    return {
      sum,
      missing,
      rowCount: filteredWaiverOutRows.length,
      mode: waiverGwTableMode,
    }
  }, [filteredWaiverOutRows, waiverOutTeamFilter, waiverGwTableMode])

  const rankByEntryId = useMemo(() => {
    const m = new Map()
    for (const row of data?.tableRows ?? []) {
      m.set(row.league_entry, row.rank)
    }
    return m
  }, [data?.tableRows])

  /** `league_entries.id` for the best current rank (usually 1 — league leader). */
  const leagueLeaderEntryId = useMemo(() => {
    const rows = data?.tableRows
    if (!Array.isArray(rows) || rows.length === 0) return null
    let bestEntry = null
    let bestRank = Infinity
    for (const r of rows) {
      const rank = Number(r.rank)
      if (!Number.isFinite(rank)) continue
      if (rank < bestRank) {
        bestRank = rank
        bestEntry = Number(r.league_entry)
      }
    }
    return bestEntry != null && Number.isFinite(bestEntry) ? bestEntry : null
  }, [data?.tableRows])

  useLeagueLeaderFavicon(
    leagueLeaderEntryId,
    data?.teamLogoMap ?? EMPTY_TEAM_LOGO_MAP
  )

  /** GWs present in waiver / FA analytics (drops-gw-live). */
  const processedWaiverGws = useMemo(() => {
    const s = new Set()
    for (const r of waiverOutGwRows) {
      const g = Number(r.gameweek)
      if (Number.isFinite(g) && g >= 1 && g <= 38) s.add(g)
    }
    return [...s].sort((a, b) => a - b)
  }, [waiverOutGwRows])

  /** GWs with at least one finished H2H in league schedule. */
  const processedCompleteGws = useMemo(
    () => sortedUniqueGwFromMatches(matches, (m) => m.finished),
    [matches],
  )

  /** GWs with at least one unfinished H2H in league schedule. */
  const processedFutureGws = useMemo(
    () => sortedUniqueGwFromMatches(matches, (m) => !m.finished),
    [matches],
  )

  const firstUpcomingGw = useMemo(() => {
    const ev = (matches ?? [])
      .filter((m) => !m.finished)
      .map((m) => Number(m.event))
      .filter(Number.isFinite)
    if (!ev.length) return null
    return Math.min(...ev)
  }, [matches])

  const latestProcessedWaiverGw =
    processedWaiverGws.length > 0
      ? processedWaiverGws[processedWaiverGws.length - 1]
      : null
  const latestProcessedCompleteGw =
    processedCompleteGws.length > 0
      ? processedCompleteGws[processedCompleteGws.length - 1]
      : null

  /**
   * `useDraftBootstrapEvents` can be one snapshot behind; `fplLiveLandingGw` updates on each
   * live load. Take the max so Squads & Results / Live roll forward when FPL bumps `current`.
   */
  const mergedFplCalendarCurrent = useMemo(() => {
    const a = Number(draftBootstrapEvents.current)
    const b = Number(fplLiveLandingGw)
    const aOk = Number.isFinite(a) && a >= 1 && a <= 38
    const bOk = Number.isFinite(b) && b >= 1 && b <= 38
    if (aOk && bOk) return Math.max(a, b)
    if (aOk) return a
    if (bOk) return b
    return null
  }, [draftBootstrapEvents.current, fplLiveLandingGw])

  const draftGwCalendarCurrent =
    mergedFplCalendarCurrent ??
    draftBootstrapEvents.current ??
    fplLiveLandingGw
  const draftGwCalendarNext = draftBootstrapEvents.next

  /**
   * Last draft-bootstrap “current” GW we saw. Used so we only clear `liveGw` when the calendar
   * actually rolls forward past the GW the user had pinned — not when they pick an earlier GW to
   * browse history while `mergedFplCalendarCurrent` stays higher (that used to snap the select back).
   */
  const liveGwCalendarRollRef = useRef(/** @type {number | null} */ (null))

  /** Drop explicit GW pick when the live calendar advances across the pinned GW (season rolls on). */
  useEffect(() => {
    const curNum = Number(mergedFplCalendarCurrent)
    if (!Number.isFinite(curNum)) return

    const prevCal = liveGwCalendarRollRef.current
    liveGwCalendarRollRef.current = curNum

    const pinned = liveGw
    if (pinned == null || !Number.isFinite(Number(pinned))) return

    const pinNum = Number(pinned)
    if (
      prevCal != null &&
      Number.isFinite(prevCal) &&
      curNum > prevCal &&
      curNum > pinNum
    ) {
      setLiveGw(null)
    }
  }, [mergedFplCalendarCurrent, liveGw])

  /** Waiver GW picker: drops-gw-live GWs plus draft bootstrap current/next (shows GW35 before redeploy). */
  const waiverGwPickerOptions = useMemo(() => {
    const s = new Set(processedWaiverGws)
    const cur = Number(draftGwCalendarCurrent)
    const nxt = Number(draftGwCalendarNext)
    if (Number.isFinite(cur) && cur >= 1 && cur <= 38) s.add(cur)
    if (Number.isFinite(nxt) && nxt >= 1 && nxt <= 38) s.add(nxt)
    return [...s].sort((a, b) => a - b)
  }, [processedWaiverGws, draftGwCalendarCurrent, draftGwCalendarNext])

  /**
   * Default waiver tab GW: when static JSON lags FPL (e.g. GW35 waivers in API but build not yet),
   * follow `events.next` so the upcoming waiver week is selected automatically.
   */
  const waiverGwNumericFallback = useMemo(
    () =>
      resolveDefaultWaiverGameweek({
        matches,
        latestProcessedWaiverGw,
        waiverOutGwRows,
        bootstrapCurrent: draftGwCalendarCurrent,
        bootstrapNext: draftGwCalendarNext,
        previousGameweek,
      }),
    [
      matches,
      latestProcessedWaiverGw,
      waiverOutGwRows,
      draftGwCalendarCurrent,
      draftGwCalendarNext,
      previousGameweek,
    ],
  )

  const waiverGwEffective = useMemo(() => {
    const opts = waiverGwPickerOptions
    const fallback = waiverGwNumericFallback
    const raw = waiverGwView ?? fallback
    if (!opts.length) {
      return Number.isFinite(raw) && raw >= 1 ? raw : 1
    }
    if (opts.includes(raw)) return raw
    if (opts.includes(fallback)) return fallback
    return opts[opts.length - 1]
  }, [waiverGwView, waiverGwNumericFallback, waiverGwPickerOptions])

  const completeGwEffective = (() => {
    const fallback =
      latestProcessedCompleteGw ?? previousGameweek ?? 1
    const raw = completeGwView ?? fallback
    if (
      processedCompleteGws.length > 0 &&
      !processedCompleteGws.includes(raw)
    ) {
      return latestProcessedCompleteGw ?? processedCompleteGws[0]
    }
    return raw
  })()

  const futureGwEffective = (() => {
    /** Earliest GW with an unfinished fixture — “next” gameweek, not the last in the schedule */
    const nextFutureGw =
      firstUpcomingGw ??
      (processedFutureGws.length > 0 ? processedFutureGws[0] : null)
    const fallback = nextFutureGw ?? nextEvent ?? 1
    const raw = futureGwView ?? fallback
    if (
      processedFutureGws.length > 0 &&
      !processedFutureGws.includes(raw)
    ) {
      return processedFutureGws[0] ?? nextFutureGw ?? 1
    }
    return raw
  })()

  const entryNameByLeagueId = useMemo(() => {
    const m = new Map()
    for (const r of tableRows ?? []) {
      m.set(r.league_entry, r.teamName)
    }
    return m
  }, [tableRows])

  const handleStandingsSort = useCallback((columnKey) => {
    if (!STANDINGS_SORT_KEYS.includes(columnKey)) return
    setStandingsSort((prev) => {
      if (prev?.key === columnKey) {
        return { key: columnKey, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
      }
      return { key: columnKey, dir: 'desc' }
    })
  }, [])

  const sortedStandingsRows = useMemo(() => {
    if (!standingsSort) return tableRows
    const { key, dir } = standingsSort
    const out = [...tableRows]
    out.sort((a, b) => {
      const va = Number(a[key])
      const vb = Number(b[key])
      if (!Number.isFinite(va) && !Number.isFinite(vb)) return 0
      if (!Number.isFinite(va)) return 1
      if (!Number.isFinite(vb)) return -1
      const cmp = dir === 'desc' ? vb - va : va - vb
      if (cmp !== 0) return cmp
      return Number(a.rank) - Number(b.rank)
    })
    return out
  }, [tableRows, standingsSort])

  const completeGwFixtures = useMemo(() => {
    const gw = Number(completeGwEffective)
    return (matches ?? [])
      .filter((m) => m.finished && Number(m.event) === gw)
      .map((m) => ({
        event: m.event,
        homeId: m.league_entry_1,
        awayId: m.league_entry_2,
        homeName: entryNameByLeagueId.get(m.league_entry_1) ?? '?',
        awayName: entryNameByLeagueId.get(m.league_entry_2) ?? '?',
        homePts: m.league_entry_1_points,
        awayPts: m.league_entry_2_points,
      }))
  }, [matches, completeGwEffective, entryNameByLeagueId])

  const futureGwFixtures = useMemo(() => {
    const gw = Number(futureGwEffective)
    return (matches ?? [])
      .filter((m) => !m.finished && Number(m.event) === gw)
      .map((m) => ({
        event: m.event,
        homeId: m.league_entry_1,
        awayId: m.league_entry_2,
        homeName: entryNameByLeagueId.get(m.league_entry_1) ?? '?',
        awayName: entryNameByLeagueId.get(m.league_entry_2) ?? '?',
      }))
  }, [matches, futureGwEffective, entryNameByLeagueId])

  const waiversForSelectedGw = useMemo(() => {
    const rows = waiverOutGwRows
    const fplToLeague = new Map()
    for (const t of teamsForFormSelect ?? []) {
      if (t.fplEntryId != null) fplToLeague.set(Number(t.fplEntryId), t.id)
    }
    const gw = Number(waiverGwEffective)
    if (!rows.length || !Number.isFinite(gw)) return { gw: null, groups: [] }
    const inGw = rows.filter((r) => Number(r.gameweek) === gw)
    if (!inGw.length) return { gw, groups: [] }
    /** League waiver run order — same keys as First Waiver Picks: `index` then `id` on cleared waivers. */
    const txKey = (id) => {
      const n = Number(id)
      return Number.isFinite(n) ? n : String(id ?? '')
    }
    const waiverRows = inGw.filter((r) => r.transactionKind === 'w')
    const leagueRunOrder = [...waiverRows].sort((a, b) => {
      const ia = Number(a.waiverWireIndex)
      const ib = Number(b.waiverWireIndex)
      const aHas = Number.isFinite(ia)
      const bHas = Number.isFinite(ib)
      if (aHas && bHas && ia !== ib) return ia - ib
      if (aHas && !bHas) return -1
      if (!aHas && bHas) return 1
      if (!aHas && !bHas) {
        const da = a.added ? Date.parse(a.added) : 0
        const db = b.added ? Date.parse(b.added) : 0
        if (da !== db) return da - db
      }
      return (Number(a.transactionId) || 0) - (Number(b.transactionId) || 0)
    })
    const waiverRunRankByTxId = new Map(
      leagueRunOrder.map((r, i) => [txKey(r.transactionId), i + 1]),
    )
    const byEntry = new Map()
    for (const r of inGw) {
      const k = r.entry
      if (!byEntry.has(k)) {
        const leagueEntryId = fplToLeague.get(Number(k)) ?? Number(k)
        byEntry.set(k, {
          entry: k,
          leagueEntryId,
          teamName: r.teamName,
          moves: [],
        })
      }
      const waiverProcessOrder =
        r.transactionKind === 'w'
          ? (waiverRunRankByTxId.get(txKey(r.transactionId)) ?? null)
          : null
      byEntry.get(k).moves.push({ ...r, waiverProcessOrder })
    }
    for (const g of byEntry.values()) {
      g.moves.sort(sortMovesWaiverThenFa)
    }
    const groups = sortGroupsByFirstWaiverOrder([...byEntry.values()])
    return { gw, groups }
  }, [waiverOutGwRows, teamsForFormSelect, waiverGwEffective])

  const defaultFormEntry = teamsForFormSelect[0]?.id
  const activeFormEntry = formTeamId ?? defaultFormEntry
  const formStripRowsRaw =
    activeFormEntry != null ? teamFormStripByEntry[activeFormEntry] ?? [] : []
  const formStripRows = useMemo(
    () => formStripRowsRaw.slice(-formStripDisplayCount),
    [formStripRowsRaw, formStripDisplayCount],
  )

  if (loading) {
    return (
      <div className="app fotmob" data-theme={colorTheme}>
        <div className="load-screen">
          <div className="load-screen__toolbar">
            <ThemeToggle value={themePref} onChange={setThemePref} />
          </div>
          Loading league…
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="app fotmob" data-theme={colorTheme}>
        <header className="page-header">
          <BrandHeader liveStatus={brandHeaderStatus} />
        </header>
        <main className="main-tiles">
          <section className="tile error-tile">
            <p className="error-msg">{error ?? 'No data'}</p>
            <p className="muted">
              Run <code>python3 ingest.py &lt;LEAGUE_ID&gt;</code> then{' '}
              <code>npm run dev</code> to copy data into the site.
            </p>
          </section>
        </main>
      </div>
    )
  }

  const liveGameweek = resolveLiveGameweek({
    matches,
    bootstrapCurrent: mergedFplCalendarCurrent,
    previousGameweek,
    nextEvent,
    fplLiveLandingGw,
    explicitLiveGw: liveGw,
  })

  const renderGwFixture = (fx, i) => {
    const homeRank = rankByEntryId.get(fx.homeId)
    const awayRank = rankByEntryId.get(fx.awayId)
    const homeWin =
      fx.homePts != null && fx.awayPts != null && fx.homePts > fx.awayPts
    const awayWin =
      fx.homePts != null && fx.awayPts != null && fx.awayPts > fx.homePts
    return (
      <li key={`${fx.event}-${fx.homeId}-${fx.awayId}-${i}`} className="gw-fixture-row">
        <div className="gw-fixture-teams">
          <span className="gw-fixture-avatar gw-fixture-avatar--home">
            <TeamAvatar
              entryId={fx.homeId}
              name={fx.homeName}
              size="sm"
              logoMap={teamLogoMap}
              kitIndexByEntry={kitIndexByEntry}
            />
          </span>
          <span
            className={`gw-fixture-name-cell gw-fixture-name-cell--home${homeWin ? ' gw-fixture-name--winner' : ''}`}
          >
            <GwFixtureTightTeamName name={fx.homeName} />
            {homeRank != null ? (
              <span className="gw-fixture-rank muted"> ({homeRank})</span>
            ) : null}
          </span>
          {fx.homePts != null ? (
            <span className="gw-fixture-score gw-fixture-mid">
              {fx.homePts} – {fx.awayPts}
            </span>
          ) : (
            <span className="gw-fixture-vs gw-fixture-mid">v</span>
          )}
          <span
            className={`gw-fixture-name-cell gw-fixture-name-cell--away${awayWin ? ' gw-fixture-name--winner' : ''}`}
          >
            <GwFixtureTightTeamName name={fx.awayName} />
            {awayRank != null ? (
              <span className="gw-fixture-rank muted"> ({awayRank})</span>
            ) : null}
          </span>
          <span className="gw-fixture-avatar gw-fixture-avatar--away">
            <TeamAvatar
              entryId={fx.awayId}
              name={fx.awayName}
              size="sm"
              logoMap={teamLogoMap}
              kitIndexByEntry={kitIndexByEntry}
            />
          </span>
        </div>
      </li>
    )
  }

  return (
    <PlayerDetailOverlayProvider
      dashboardView={dashboardView}
      teamsForFormSelect={teamsForFormSelect}
      leagueDataRevision={String(
        import.meta.env.VITE_LEAGUE_DATA_REVISION ?? '',
      ).trim()}
      logoMap={teamLogoMap}
      kitIndexByEntry={kitIndexByEntry}
      onOpenChange={setPlayerDetailOverlayOpen}
    >
    <PlayerHistoryProvider>
    <div
      className="app fotmob"
      data-theme={colorTheme}
      data-bottom-nav-hidden={bottomNavHidden ? 'true' : undefined}
    >
      <main className="dashboard-layout dashboard-layout--with-nav">
        <div className="dashboard-page-hero">
          <header className="page-header">
            <BrandHeader
              tableRows={tableRows}
              leagueEntries={leagueEntries}
              teamLogoMap={teamLogoMap}
              kitIndexByEntry={kitIndexByEntry}
              liveStatus={brandHeaderStatus}
            />
            {fetchFailedDemo && (
              <div className="data-banner data-banner--error" role="alert">
                <strong>League file didn’t load</strong> (wrong URL or deploy). Showing demo only.{' '}
                Use <code>https://YOUR_USER.github.io/repo-name/</code> with your real repo name (often
                lowercase). If the repo is <code>you.github.io</code>, use <code>https://you.github.io/</code>{' '}
                — no <code>/repo/</code> path.
              </div>
            )}
            {isSampleData && !fetchFailedDemo && (
              <div className="data-banner" role="status">
                <strong>Demo data</strong> — site owner: add GitHub secret{' '}
                <code>FPL_LEAGUE_ID</code> (your draft league number) under Settings → Secrets, then redeploy.
                Or publish files: <code>python3 ingest.py ID</code>,{' '}
                <code>cd web && npm run publish-real-league</code>, commit{' '}
                <code>web/public/league-data/</code>. ID: <code>draft.premierleague.com/league/YOUR_ID</code>
              </div>
            )}
          </header>
        </div>
        <DashboardNav
          variant="top"
          dashboardView={dashboardView}
          onSelect={selectDashboardView}
        />
        <div className="dashboard-content">
          {dashboardView === 'standings' && (
            <>
              <section
                className="tile tile--standings"
                aria-labelledby="standings-heading"
              >
            <div className="tile-head-row tile-head-row--tight">
              <h2 id="standings-heading" className="tile-title tile-title--sm">
                Standings
              </h2>
            </div>
            <div className="table-scroll table-scroll--standings-open">
              <table className="standings-table standings-table--sidebar">
                <thead>
                  <tr>
                    <th className="col-rank">#</th>
                    <th className="col-team">Team</th>
                    <th className="col-num col-pl">PL</th>
                    <th className="col-num col-wdl">W</th>
                    <th className="col-num col-wdl">D</th>
                    <th className="col-num col-wdl">L</th>
                    <StandingsSortTh
                      columnKey="gf"
                      sortState={standingsSort}
                      onSort={handleStandingsSort}
                      label="For"
                      title="Your team’s total FPL points across all H2H gameweeks"
                      className="col-num col-for"
                    />
                    <StandingsSortTh
                      columnKey="ga"
                      sortState={standingsSort}
                      onSort={handleStandingsSort}
                      label="Faced"
                      title="Points against, all H2H gameweeks"
                      className="col-num col-faced"
                    />
                    <StandingsSortTh
                      columnKey="gd"
                      sortState={standingsSort}
                      onSort={handleStandingsSort}
                      label="GD"
                      title="Goal difference (points for minus points against)"
                      className="col-num col-gd"
                    />
                    <StandingsSortTh
                      columnKey="total"
                      sortState={standingsSort}
                      onSort={handleStandingsSort}
                      label="PTS"
                      title="League points (3 / 1 / 0 per H2H)"
                      className="col-num col-pts"
                    />
                    <th
                      className="col-form"
                      title={`Last ${FORM_LAST_N} H2H matches (W / D / L)`}
                    >
                      Form
                    </th>
                    <th className="col-next">Nxt</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStandingsRows.map((row) => {
                    const isLeader = row.rank === 1
                    const rowClass = [
                      isLeader ? 'row-highlight' : '',
                      row.rank === 1 ? 'standings-row--divider-below' : '',
                      row.rank === 8 ? 'standings-row--divider-above standings-row--8th' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                    return (
                      <tr key={row.league_entry} className={rowClass || undefined}>
                        <td className="col-rank">
                          {row.rank === 8 ? (
                            <span role="img" className="standings-rank-8" aria-label="8">
                              🧩
                            </span>
                          ) : (
                            row.rank
                          )}
                        </td>
                        <td className="col-team">
                          <span className="team-cell">
                            <TeamAvatar
                              entryId={row.league_entry}
                              name={row.teamName}
                              size="sm"
                              logoMap={teamLogoMap}
                              kitIndexByEntry={kitIndexByEntry}
                            />
                            <span className="team-name team-name--sidebar">{row.teamName}</span>
                          </span>
                        </td>
                        <td className="col-num col-pl">{row.pl}</td>
                        <td className="col-num col-wdl">{row.matches_won}</td>
                        <td className="col-num col-wdl">{row.matches_drawn}</td>
                        <td className="col-num col-wdl">{row.matches_lost}</td>
                        <td className="col-num col-for tabular" title="Your points for, all GWs">
                          {row.gf}
                        </td>
                        <td className="col-num col-faced tabular">
                          {row.ga}
                        </td>
                        <td className="col-num col-gd tabular">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                        <td className="col-num col-pts tabular">
                          <strong>{row.total}</strong>
                        </td>
                        <td className="col-form">
                          <FormCircles form={row.form} />
                        </td>
                        <td className="col-next">
                          {row.next ? (
                            <TeamAvatar
                              entryId={row.next.id}
                              name={row.next.name}
                              size="sm"
                              logoMap={teamLogoMap}
                              kitIndexByEntry={kitIndexByEntry}
                            />
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

              <div className="dashboard-stack">
                <div className="dashboard-gw-two">
                  <section className="tile tile--compact">
                    <div className="tile-head-row tile-head-row--tight">
                      <h2 className="tile-title tile-title--sm tile-title--with-select">
                        <span className="tile-title__text">Complete game weeks</span>
                        {processedCompleteGws.length > 0 ? (
                          <select
                            className="tile-gw-select tile-gw-select--inline"
                            aria-label="Complete game week"
                            value={completeGwEffective}
                            onChange={(e) => setCompleteGwView(Number(e.target.value))}
                          >
                            {processedCompleteGws.map((gw) => (
                              <option key={gw} value={gw}>
                                {gameWeekSelectLabel(gw)}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </h2>
                    </div>
                    {completeGwFixtures?.length ? (
                      <ul className="gw-fixture-list gw-fixture-list--tight">
                        {completeGwFixtures.map(renderGwFixture)}
                      </ul>
                    ) : (
                      <p className="muted muted--tight">No finished matches in this gameweek.</p>
                    )}
                  </section>

                  <section className="tile tile--compact">
                    <div className="tile-head-row tile-head-row--tight">
                      <h2 className="tile-title tile-title--sm tile-title--with-select">
                        <span className="tile-title__text">Future Game Weeks</span>
                        {processedFutureGws.length > 0 ? (
                          <select
                            className="tile-gw-select tile-gw-select--inline"
                            aria-label="Future game week"
                            value={futureGwEffective}
                            onChange={(e) => setFutureGwView(Number(e.target.value))}
                          >
                            {processedFutureGws.map((gw) => (
                              <option key={gw} value={gw}>
                                {gameWeekSelectLabel(gw)}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </h2>
                    </div>
                    {futureGwFixtures?.length ? (
                      <ul className="gw-fixture-list gw-fixture-list--tight">
                        {futureGwFixtures.map((fx, i) => renderGwFixture(fx, i))}
                      </ul>
                    ) : (
                      <p className="muted muted--tight">No upcoming fixtures in data for this gameweek.</p>
                    )}
                  </section>
                </div>

                <FormAndH2hSection
                  formStripRows={formStripRows}
                  teamsForFormSelect={teamsForFormSelect}
                  activeFormEntry={activeFormEntry}
                  onFormTeamChange={setFormTeamId}
                  matches={matches}
                  tableRows={tableRows}
                  leagueEntries={leagueEntries}
                  teamLogoMap={teamLogoMap}
                  kitIndexByEntry={kitIndexByEntry}
                />

          <FixtureScheduleMatrix
            matches={matches}
            leagueEntries={leagueEntries}
            tableRows={tableRows}
            teamLogoMap={teamLogoMap}
            kitIndexByEntry={kitIndexByEntry}
          />

          <section
            className="tile tile--compact"
            aria-labelledby="win-margin-buckets-heading"
          >
            <h2 id="win-margin-buckets-heading" className="tile-title tile-title--sm">
              Wins by margin
            </h2>
            {winMarginBucketRows?.some((r) => r.totalWins > 0) ? (
              <div className="table-scroll table-scroll--win-margin">
                <table className="win-margin-table">
                  <thead>
                    <tr>
                      <th scope="col" className="win-margin-table__team">
                        Team
                      </th>
                      {WIN_MARGIN_BUCKET_KEYS.map((k) => (
                        <th
                          key={k}
                          scope="col"
                          className="win-margin-table__n tabular"
                          title={
                            k === '21+'
                              ? 'Won by 21 or more'
                              : k.includes('-')
                                ? `Won by ${k.replace('-', '–')} pts`
                                : `Won by exactly ${k}`
                          }
                        >
                          {k}
                        </th>
                      ))}
                      <th scope="col" className="win-margin-table__sum tabular" title="Total wins">
                        Σ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {winMarginBucketRows.map((row) => (
                      <tr key={row.league_entry}>
                        <th scope="row" className="win-margin-table__team">
                          <span className="win-margin-table__team-inner">
                            <TeamAvatar
                              entryId={row.league_entry}
                              name={row.teamName}
                              size="sm"
                              logoMap={teamLogoMap}
                              kitIndexByEntry={kitIndexByEntry}
                            />
                            <span className="win-margin-table__name">{row.teamName}</span>
                          </span>
                        </th>
                        {WIN_MARGIN_BUCKET_KEYS.map((k) => (
                          <td key={k} className="tabular win-margin-table__n">
                            {row.buckets[k] ?? 0}
                          </td>
                        ))}
                        <td className="tabular win-margin-table__sum">
                          <strong>{row.totalWins}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted muted--tight">No wins in finished matches yet.</p>
            )}
          </section>

          <section
            className="tile tile--compact"
            aria-labelledby="loss-margin-buckets-heading"
          >
            <h2 id="loss-margin-buckets-heading" className="tile-title tile-title--sm">
              Losses by margin
            </h2>
            {lossMarginBucketRows?.some((r) => r.totalLosses > 0) ? (
              <div className="table-scroll table-scroll--win-margin">
                <table className="win-margin-table">
                  <thead>
                    <tr>
                      <th scope="col" className="win-margin-table__team">
                        Team
                      </th>
                      {WIN_MARGIN_BUCKET_KEYS.map((k) => (
                        <th
                          key={k}
                          scope="col"
                          className="win-margin-table__n tabular"
                          title={
                            k === '21+'
                              ? 'Lost by 21 or more'
                              : k.includes('-')
                                ? `Lost by ${k.replace('-', '–')} pts`
                                : `Lost by exactly ${k}`
                          }
                        >
                          {k}
                        </th>
                      ))}
                      <th scope="col" className="win-margin-table__sum tabular" title="Total losses">
                        Σ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lossMarginBucketRows.map((row) => (
                      <tr key={row.league_entry}>
                        <th scope="row" className="win-margin-table__team">
                          <span className="win-margin-table__team-inner">
                            <TeamAvatar
                              entryId={row.league_entry}
                              name={row.teamName}
                              size="sm"
                              logoMap={teamLogoMap}
                              kitIndexByEntry={kitIndexByEntry}
                            />
                            <span className="win-margin-table__name">{row.teamName}</span>
                          </span>
                        </th>
                        {WIN_MARGIN_BUCKET_KEYS.map((k) => (
                          <td key={k} className="tabular win-margin-table__n">
                            {row.buckets[k] ?? 0}
                          </td>
                        ))}
                        <td className="tabular win-margin-table__sum">
                          <strong>{row.totalLosses}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted muted--tight">No losses in finished matches yet.</p>
            )}
          </section>

                <div className="dashboard-gw-two">
                  <section className="tile tile--compact" aria-labelledby="gw-weeks-first-heading">
                    <div className="tile-head-row tile-head-row--tight">
                      <h2 id="gw-weeks-first-heading" className="tile-title tile-title--sm">
                        Game weeks in 1st
                      </h2>
                    </div>
                    <p className="tile-hint muted tile-hint--tight">
                      Weeks where this team sat <strong>top</strong> of the cumulative H2H table after
                      that gameweek (PTS, then For, then Faced).
                      {gwRankExtremesMeta.maxGw > 0 ? (
                        <>
                          {' '}
                          Through <span className="tabular">GW {gwRankExtremesMeta.maxGw}</span>.
                        </>
                      ) : null}
                    </p>
                    {gwWeeksAtFirst.length > 0 ? (
                      <ol className="gw-rank-extremes-list">
                        {gwWeeksAtFirst.map((r) => (
                          <li key={r.league_entry} className="gw-rank-extremes-item">
                            <span className="gw-rank-extremes-item__rank tabular">{r.listRank}</span>
                            <TeamAvatar
                              entryId={r.league_entry}
                              name={r.teamName}
                              size="sm"
                              logoMap={teamLogoMap}
                              kitIndexByEntry={kitIndexByEntry}
                            />
                            <div className="gw-rank-extremes-item__main">
                              <span className="gw-rank-extremes-item__team">{r.teamName}</span>
                              <span
                                className="gw-rank-extremes-item__weeks muted"
                                title={r.weeksTitle || undefined}
                              >
                                {r.weeksLabel}
                              </span>
                            </div>
                            <span className="gw-rank-extremes-item__count tabular" title="Gameweeks">
                              {r.count}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="muted muted--tight">
                        {gwRankExtremesMeta.maxGw > 0
                          ? 'No team data for weeks at 1st.'
                          : 'No finished gameweeks in the schedule yet.'}
                      </p>
                    )}
                  </section>

                  <section className="tile tile--compact" aria-labelledby="gw-weeks-last-heading">
                    <div className="tile-head-row tile-head-row--tight">
                      <h2 id="gw-weeks-last-heading" className="tile-title tile-title--sm">
                        Game weeks in last
                      </h2>
                    </div>
                    <p className="tile-hint muted tile-hint--tight">
                      Weeks where this team sat <strong>last</strong> in the cumulative H2H table after
                      that gameweek (same ordering as the standings table).
                      {gwRankExtremesMeta.teamCount > 0 ? (
                        <>
                          {' '}
                          <span className="tabular">{gwRankExtremesMeta.teamCount}</span>-team league.
                        </>
                      ) : null}
                      {gwRankExtremesMeta.maxGw > 0 ? (
                        <>
                          {' '}
                          Through <span className="tabular">GW {gwRankExtremesMeta.maxGw}</span>.
                        </>
                      ) : null}
                    </p>
                    {gwWeeksAtLast.length > 0 ? (
                      <ol className="gw-rank-extremes-list">
                        {gwWeeksAtLast.map((r) => (
                          <li key={r.league_entry} className="gw-rank-extremes-item">
                            <span className="gw-rank-extremes-item__rank tabular">{r.listRank}</span>
                            <TeamAvatar
                              entryId={r.league_entry}
                              name={r.teamName}
                              size="sm"
                              logoMap={teamLogoMap}
                              kitIndexByEntry={kitIndexByEntry}
                            />
                            <div className="gw-rank-extremes-item__main">
                              <span className="gw-rank-extremes-item__team">{r.teamName}</span>
                              <span
                                className="gw-rank-extremes-item__weeks muted"
                                title={r.weeksTitle || undefined}
                              >
                                {r.weeksLabel}
                              </span>
                            </div>
                            <span className="gw-rank-extremes-item__count tabular" title="Gameweeks">
                              {r.count}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="muted muted--tight">
                        {gwRankExtremesMeta.maxGw > 0
                          ? 'No team data for weeks at last.'
                          : 'No finished gameweeks in the schedule yet.'}
                      </p>
                    )}
                  </section>
                </div>
              </div>
            </>
          )}

          {dashboardView === 'hall' ? (
            <HallOfChampions
              logoMap={teamLogoMap}
              kitIndexByEntry={kitIndexByEntry}
              tableRows={tableRows}
            />
          ) : null}

          {dashboardView === 'players' ? (
            <div className="dashboard-stack">
              <PlayersWorkbench
                leagueEntries={leagueEntries}
                teamsForFormSelect={teamsForFormSelect}
                leagueDataRevision={String(
                  import.meta.env.VITE_LEAGUE_DATA_REVISION ?? '',
                ).trim()}
                logoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
                onDetailOpenChange={setWireDetailOpen}
              />
            </div>
          ) : null}

          {dashboardView === 'teamSelection' && (
            <section
              className="tile tile--compact tile--team-selection"
              aria-label="Transactions"
            >
              <div className="section-chrome section-chrome--sticky">
              <div
                className="team-selection-submenu"
                role="tablist"
                aria-label="Transactions views"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-team-selection-waivers"
                  aria-selected={teamSelectionTab === 'waivers'}
                  className={
                    'team-selection-submenu__btn' +
                    (teamSelectionTab === 'waivers' ? ' team-selection-submenu__btn--active' : '')
                  }
                  onClick={() => setTeamSelectionTab('waivers')}
                >
                  <span className="team-selection-submenu__emoji" aria-hidden="true">
                    🏃
                  </span>
                  Waivers
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-team-selection-trades"
                  aria-selected={teamSelectionTab === 'trades'}
                  className={
                    'team-selection-submenu__btn' +
                    (teamSelectionTab === 'trades' ? ' team-selection-submenu__btn--active' : '')
                  }
                  onClick={() => setTeamSelectionTab('trades')}
                >
                  <span className="team-selection-submenu__emoji" aria-hidden="true">
                    🤝
                  </span>
                  Trades
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-team-selection-draft"
                  aria-selected={teamSelectionTab === 'draft'}
                  className={
                    'team-selection-submenu__btn' +
                    (teamSelectionTab === 'draft' ? ' team-selection-submenu__btn--active' : '')
                  }
                  onClick={() => setTeamSelectionTab('draft')}
                >
                  <span className="team-selection-submenu__emoji" aria-hidden="true">
                    📋
                  </span>
                  Draft
                </button>
              </div>
              </div>
              <div className="section-body">
              {teamSelectionTab === 'waivers' && (
            <div className="dashboard-stack">
              <section className="tile tile--compact" aria-labelledby="all-waivers-heading">
                <div className="tile-head-row tile-head-row--tight">
                  <h2
                    id="all-waivers-heading"
                    className="tile-title tile-title--sm tile-title--waiver-feed"
                  >
                    <span className="waiver-panel-tabs" role="tablist" aria-label="Waivers view">
                      <button
                        type="button"
                        role="tab"
                        id="tab-waiver-all"
                        aria-controls="waiver-feed-panel"
                        aria-selected={waiverFeedTab === 'latest'}
                        className={
                          waiverFeedTab === 'latest'
                            ? 'waiver-panel-tabs__btn waiver-panel-tabs__btn--active'
                            : 'waiver-panel-tabs__btn'
                        }
                        onClick={() => setWaiverFeedTab('latest')}
                      >
                        All Waivers
                      </button>
                      <button
                        type="button"
                        role="tab"
                        id="tab-waiver-summary"
                        aria-controls="waiver-feed-panel"
                        aria-selected={waiverFeedTab === 'summary'}
                        className={
                          waiverFeedTab === 'summary'
                            ? 'waiver-panel-tabs__btn waiver-panel-tabs__btn--active'
                            : 'waiver-panel-tabs__btn'
                        }
                        onClick={() => setWaiverFeedTab('summary')}
                      >
                        Waiver summary
                      </button>
                    </span>
                    {waiverGwPickerOptions.length > 0 && waiverFeedTab === 'latest' ? (
                      <select
                        className="tile-gw-select tile-gw-select--inline"
                        aria-label="Waivers game week"
                        value={waiverGwEffective}
                        onChange={(e) => setWaiverGwView(Number(e.target.value))}
                      >
                        {waiverGwPickerOptions.map((gw) => (
                          <option key={gw} value={gw}>
                            {gameWeekSelectLabel(gw)}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </h2>
                </div>
                <div
                  id="waiver-feed-panel"
                  role="tabpanel"
                  aria-labelledby={
                    waiverFeedTab === 'latest' ? 'tab-waiver-all' : 'tab-waiver-summary'
                  }
                >
                  {waiverFeedTab === 'summary' ? (
                    <WaiverSummaryShare
                      gw={waiversForSelectedGw.gw}
                      groups={waiversForSelectedGw.groups}
                      leagueTitleAbbr={LEAGUE_TITLE_ABBR}
                      leagueTitle={LEAGUE_TITLE}
                      teamLogoMap={teamLogoMap}
                      kitIndexByEntry={kitIndexByEntry}
                      gwPickerOptions={waiverGwPickerOptions}
                      gwValue={waiverGwEffective}
                      onGwChange={setWaiverGwView}
                    />
                  ) : waiversForSelectedGw.groups.length ? (
                    <div className="latest-waivers">
                      {waiversForSelectedGw.groups.map((g) => (
                        <div key={g.entry} className="latest-waivers__team-block">
                          <h3 className="latest-waivers__team-title">
                            <TeamAvatar
                              entryId={g.leagueEntryId}
                              name={g.teamName}
                              size="sm"
                              logoMap={teamLogoMap}
                              kitIndexByEntry={kitIndexByEntry}
                            />
                            <span>{g.teamName}</span>
                          </h3>
                          <ul className="latest-waivers__move-list">
                            {g.moves.map((r) => (
                              <li
                                key={r.transactionId}
                                className={`latest-waivers__move${r.transactionKind === 'f' ? ' latest-waivers__move--fa' : ''}`}
                              >
                                <div className="latest-waivers__move-stack">
                                  <div className="latest-waivers__fa-row">
                                    {r.transactionKind === 'f' ? (
                                      <span
                                        className="latest-waivers__txn-badge"
                                        title="Free agency pickup"
                                      >
                                        FA
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="latest-waivers__swap-line">
                                    <span className="latest-waivers__io-label muted">In</span>
                                    <PlayerKit
                                      shirtUrl={r.pickedShirtUrl}
                                      badgeUrl={r.pickedBadgeUrl}
                                      teamShort={r.pickedTeamShort}
                                    />
                                    <ClickablePlayerName
                                      element={r.element_in}
                                      web_name={r.pickedName}
                                      teamShort={r.pickedTeamShort}
                                      className="latest-waivers__player-name"
                                    >
                                      {r.pickedName}
                                    </ClickablePlayerName>
                                    {r.waiverProcessOrder != null ? (
                                      <span
                                        className="latest-waivers__move-order muted tabular"
                                        title="League waiver run order this GW (1 = first): FPL index then transaction id — same rule as First Waiver Picks; cleared waivers only"
                                      >
                                        {' '}
                                        ({r.waiverProcessOrder})
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="latest-waivers__swap-line">
                                    <span className="latest-waivers__io-label muted">Out</span>
                                    <PlayerKit
                                      shirtUrl={r.droppedShirtUrl}
                                      badgeUrl={r.droppedBadgeUrl}
                                      teamShort={r.droppedTeamShort}
                                    />
                                    <ClickablePlayerName
                                      element={r.element_out}
                                      web_name={r.droppedName}
                                      teamShort={r.droppedTeamShort}
                                      className="latest-waivers__player-name"
                                    >
                                      {r.droppedName}
                                    </ClickablePlayerName>
                                  </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted muted--tight">
                      {waiverOutGwRows.length ? (
                        <>No waiver or free-agency activity in GW {waiverGwEffective}.</>
                      ) : (
                        <>
                          No waiver / free-agency rows in <code>drops-gw-live.json</code> yet. Run{' '}
                          <code>npm run dev</code> / <code>npm run build</code> (runs waiver analytics)
                          after <code>transactions.json</code> is present.
                        </>
                      )}
                    </p>
                  )}
                </div>
              </section>

              <section className="tile tile--compact" aria-labelledby="first-waiver-picks-heading">
                <div className="tile-head-row tile-head-row--tight">
                  <h2 id="first-waiver-picks-heading" className="tile-title tile-title--sm">
                    First Waiver Picks
                  </h2>
                </div>
                <p className="tile-hint muted tile-hint--tight">Scroll sideways for earlier weeks.</p>
                {firstWaiverOrderPicks.length > 0 ? (
                  <div className="first-waiver-picks-wrap">
                    <div
                      className="first-waiver-picks-strip"
                      role="list"
                      aria-label="First waiver slot by gameweek, newest first"
                    >
                      {firstWaiverOrderPicks.map((row) => (
                        <article
                          key={row.gameweek}
                          className="first-waiver-pick-card"
                          role="listitem"
                        >
                          <div className="first-waiver-pick-card__gw tabular">GW {row.gameweek}</div>
                          <div className="first-waiver-pick-card__team">
                            <TeamAvatar
                              entryId={row.leagueEntryId}
                              name={row.teamName}
                              size="sm"
                              logoMap={teamLogoMap}
                              kitIndexByEntry={kitIndexByEntry}
                            />
                            <span className="first-waiver-pick-card__team-name">{row.teamName}</span>
                          </div>
                          <div className="first-waiver-pick-card__player">
                            <PlayerKit
                              shirtUrl={row.pickedShirtUrl}
                              badgeUrl={row.pickedBadgeUrl}
                              teamShort={row.pickedTeamShort}
                            />
                            <ClickablePlayerName
                              element={row.element_in}
                              web_name={row.pickedName}
                              teamShort={row.pickedTeamShort}
                              className="first-waiver-pick-card__player-name"
                            >
                              {row.pickedName}
                            </ClickablePlayerName>
                          </div>
                          <div className="first-waiver-pick-card__pts muted">
                            <span className="first-waiver-pick-card__pts-label">GW pts</span>
                            <span className="tabular first-waiver-pick-card__pts-num">
                              {row.pickedUpPlayerGwPoints != null ? row.pickedUpPlayerGwPoints : '—'}
                            </span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="muted muted--tight">
                    Need <code>transactions.json</code> with waiver <code>index</code> fields. Run a
                    full ingest, then <code>npm run dev</code> / build for GW points in{' '}
                    <code>drops-gw-live.json</code>.
                  </p>
                )}
              </section>

          <section className="tile tile--compact" aria-labelledby="waiver-in-by-team-heading">
            <div className="tile-head-row tile-head-row--tight">
              <h2 id="waiver-in-by-team-heading" className="tile-title tile-title--sm">
                Waiver in - team totals
              </h2>
            </div>
            <p className="tile-hint muted tile-hint--tight">
              Total FPL points scored by every player this team has <strong>waivered in</strong>, from
              pickup until they left.
            </p>
            {waiverInPointsByTeam?.length ? (
              <div className="waiver-in-team-wrap">
                <table className="waiver-in-team-table">
                  <colgroup>
                    <col className="waiver-in-team-col-rank" />
                    <col className="waiver-in-team-col-logo" />
                    <col />
                    <col className="waiver-in-team-col-num" />
                    <col className="waiver-in-team-col-num" />
                    <col className="waiver-in-team-col-total" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="waiver-in-team__rank" scope="col">
                        #
                      </th>
                      <th className="waiver-in-team__logo" scope="col" aria-hidden>
                        {' '}
                      </th>
                      <th className="waiver-in-team__team" scope="col">
                        Team
                      </th>
                      <th className="waiver-in-team__num" scope="col">
                        Pl.
                      </th>
                      <th className="waiver-in-team__num" scope="col">
                        Avg
                      </th>
                      <th className="waiver-in-team__num" scope="col">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {waiverInPointsByTeam.map((t, i) => (
                      <tr key={t.league_entry}>
                        <td className="waiver-in-team__rank tabular">{i + 1}</td>
                        <td className="waiver-in-team__logo">
                          <TeamAvatar
                            entryId={t.league_entry}
                            name={t.teamName}
                            size="sm"
                            logoMap={teamLogoMap}
                            kitIndexByEntry={kitIndexByEntry}
                          />
                        </td>
                        <td className="waiver-in-team__team">
                          <span className="waiver-in-team__name">{t.teamName}</span>
                        </td>
                        <td className="waiver-in-team__num tabular">{t.distinctWaiverPlayers}</td>
                        <td
                          className="waiver-in-team__num tabular"
                          title={
                            t.averageWaiverInPerPlayer != null
                              ? `${t.totalWaiverInPoints} ÷ ${t.distinctWaiverPlayers} players`
                              : undefined
                          }
                        >
                          {t.averageWaiverInPerPlayer != null
                            ? t.averageWaiverInPerPlayer.toFixed(1)
                            : '—'}
                        </td>
                        <td className="waiver-in-team__num waiver-in-team__num--total tabular">
                          {t.totalWaiverInPoints}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted muted--tight">
                Run a full build to generate <code>pickups-tenure.json</code>. If data loads
                locally but not on the live site, try disabling ad blockers (some block
                &quot;waiver&quot; in URLs — we use neutral filenames now).
              </p>
            )}
          </section>

          <section className="tile tile--compact" aria-labelledby="waiver-out-totals-heading">
            <div className="tile-head-row tile-head-row--tight">
              <h2 id="waiver-out-totals-heading" className="tile-title tile-title--sm">
                Waived out - team totals
              </h2>
            </div>
            <p className="tile-hint muted tile-hint--tight">
              Sum of dropped players’ FPL points in the gameweek each waiver hit.
            </p>
            {waiverOutPointsByTeam?.some((t) => t.waiverOutCount > 0) ? (
              <>
                <div className="waiver-totals-grid-head" aria-hidden>
                  <span className="waiver-totals-grid-head__rank">#</span>
                  <span className="waiver-totals-grid-head__avatar" />
                  <span className="waiver-totals-grid-head__team">Team</span>
                  <span
                    className="waiver-totals-grid-head__num tabular"
                    title="Total dropped-player GW points"
                  >
                    Total
                  </span>
                  <span
                    className="waiver-totals-grid-head__num tabular"
                    title="Average GW points per waived-out player (total ÷ number of waivers)"
                  >
                    Avg
                  </span>
                </div>
                <ol className="pa-list waiver-totals-list waiver-totals-list--grid">
                  {waiverOutPointsByTeam.map((t, i) => (
                    <li key={t.league_entry} className="waiver-total-row">
                      <span className="waiver-total-row__rank">{i + 1}</span>
                      <TeamAvatar
                        entryId={t.league_entry}
                        name={t.teamName}
                        size="sm"
                        logoMap={teamLogoMap}
                        kitIndexByEntry={kitIndexByEntry}
                      />
                      <div className="waiver-total-main">
                        <span className="pa-team">{t.teamName}</span>
                        <span className="waiver-totals-meta muted">
                          {t.waiverOutCount} waiver{t.waiverOutCount === 1 ? '' : 's'}
                          {t.knownPtsCount < t.waiverOutCount
                            ? ` · ${t.knownPtsCount}/${t.waiverOutCount} GW pts known`
                            : ''}
                        </span>
                      </div>
                      <span className="waiver-total-row__total tabular">{t.totalDroppedGwPoints}</span>
                      <span
                        className="waiver-total-row__avg tabular"
                        title={
                          t.waiverOutCount > 0
                            ? `${t.totalDroppedGwPoints} ÷ ${t.waiverOutCount} waivers`
                            : ''
                        }
                      >
                        {t.waiverOutCount > 0 && t.averageDroppedGwPoints != null
                          ? t.averageDroppedGwPoints.toFixed(1)
                          : '—'}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="muted muted--tight">No waiver-out data yet — run a full ingest + build.</p>
            )}
          </section>

          <section className="tile tile--compact" aria-labelledby="waiver-out-gw-heading">
            <div className="tile-head-row tile-head-row--tight">
              <h2 id="waiver-out-gw-heading" className="tile-title tile-title--sm">
                Waived out — GW points
              </h2>
            </div>
            {waiverOutRowsWaiverOnly.length ? (
              <>
                <div className="waiver-out-filters">
                  <div className="waiver-out-filter">
                    <label htmlFor="waiver-gw-mode-filter">Type</label>
                    <select
                      id="waiver-gw-mode-filter"
                      className="waiver-out-filter__select"
                      value={waiverGwTableMode}
                      onChange={(e) =>
                        setWaiverGwTableMode(e.target.value === 'in' ? 'in' : 'out')
                      }
                    >
                      <option value="out">Waivers out</option>
                      <option value="in">Waivers in</option>
                    </select>
                  </div>
                  <div className="waiver-out-filter">
                    <label htmlFor="waiver-out-team-filter">Team</label>
                    <select
                      id="waiver-out-team-filter"
                      className="waiver-out-filter__select"
                      value={waiverOutTeamFilter}
                      onChange={(e) => setWaiverOutTeamFilter(e.target.value)}
                    >
                      <option value="all">All teams</option>
                      {waiverOutTeamOptions.map(([entry, name]) => (
                        <option key={entry} value={String(entry)}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="waiver-out-filter">
                    <select
                      id="waiver-out-gw-filter"
                      className="waiver-out-filter__select"
                      aria-label="Gameweek filter"
                      value={waiverOutGwFilter}
                      onChange={(e) => setWaiverOutGwFilter(e.target.value)}
                    >
                      <option value="all">All gameweeks</option>
                      {waiverOutGwOptions.map((gw) => (
                        <option key={gw} value={String(gw)}>
                          GW {gw}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {waiverOutTeamPointsTotal && (
                  <p className="waiver-out-sum-banner">
                    <strong>Total</strong>{' '}
                    {waiverOutTeamPointsTotal.mode === 'in'
                      ? 'picked-up player GW points'
                      : 'dropped-player GW points'}
                    :{' '}
                    <span className="tabular waiver-out-sum-banner__num">
                      {waiverOutTeamPointsTotal.sum}
                    </span>
                    <span className="muted">
                      {' '}
                      ({waiverOutTeamPointsTotal.rowCount} waiver
                      {waiverOutTeamPointsTotal.rowCount === 1 ? '' : 's'}
                      {waiverOutGwFilter !== 'all' ? ` · GW ${waiverOutGwFilter}` : ''}
                      {waiverOutTeamPointsTotal.missing > 0
                        ? ` · ${waiverOutTeamPointsTotal.missing} row(s) no GW data`
                        : ''}
                      )
                    </span>
                  </p>
                )}
                <div className="waiver-gw-table-wrap">
                  {filteredWaiverOutRows.length ? (
                    <table className="waiver-gw-table">
                      <thead>
                        <tr>
                          <th>Team</th>
                          <th>GW</th>
                          <th>
                            {waiverGwTableMode === 'out' ? 'Waived out' : 'Waived in'}
                          </th>
                          <th className="tabular">Pts</th>
                          <th className="muted">
                            {waiverGwTableMode === 'out' ? 'Waived in' : 'Waived out'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWaiverOutRows.map((r) => {
                          const primaryPts =
                            waiverGwTableMode === 'out'
                              ? r.droppedPlayerGwPoints
                              : r.pickedUpPlayerGwPoints
                          const primaryName =
                            waiverGwTableMode === 'out' ? r.droppedName : r.pickedName
                          const otherName =
                            waiverGwTableMode === 'out' ? r.pickedName : r.droppedName
                          const primaryEl =
                            waiverGwTableMode === 'out' ? r.element_out : r.element_in
                          const otherEl =
                            waiverGwTableMode === 'out' ? r.element_in : r.element_out
                          const primaryTeamShort =
                            waiverGwTableMode === 'out' ? r.droppedTeamShort : r.pickedTeamShort
                          const otherTeamShort =
                            waiverGwTableMode === 'out' ? r.pickedTeamShort : r.droppedTeamShort
                          return (
                            <tr key={r.transactionId}>
                              <td className="waiver-gw-team">{r.teamName}</td>
                              <td className="tabular">{r.gameweek}</td>
                              <td>
                                <ClickablePlayerName
                                  element={primaryEl}
                                  web_name={primaryName}
                                  teamShort={primaryTeamShort}
                                >
                                  {primaryName}
                                </ClickablePlayerName>
                              </td>
                              <td className="tabular fw-600">
                                {primaryPts == null ? '—' : primaryPts}
                              </td>
                              <td className="muted">
                                <ClickablePlayerName
                                  element={otherEl}
                                  web_name={otherName}
                                  teamShort={otherTeamShort}
                                >
                                  {otherName}
                                </ClickablePlayerName>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="muted muted--tight waiver-out-empty">
                      No waivers match these filters.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="muted muted--tight">
                Run a full build after <code>ingest</code> — this table is built from{' '}
                <code>transactions.json</code> + FPL event/live per GW.
              </p>
            )}
          </section>

          <section className="tile tile--compact" aria-labelledby="waiver-in-tenure-heading">
            <h2 id="waiver-in-tenure-heading" className="tile-title tile-title--sm">
              Best waiver pickups
            </h2>
            <p className="tile-hint muted tile-hint--tight">
              Top 10 player–team pairs by total FPL points from each <strong>waiver in</strong> until
              that player left the squad. Same player re-waived later: stints added together. Uses
              official GW live scores through the last finished gameweek.
            </p>
            {waiverInTenureTopRows?.length ? (
              <ol className="waiver-list waiver-list--tight waiver-pickup-list">
                {waiverInTenureTopRows.map((r) => (
                  <li
                    key={`${r.entry}-${r.elementId}`}
                    className="waiver-row waiver-pickup-row"
                  >
                    <span className="waiver-rank">{r.rank}</span>
                    <PlayerKit
                      shirtUrl={r.shirtUrl}
                      badgeUrl={r.badgeUrl}
                      teamShort={r.teamShort}
                    />
                    <div className="waiver-info waiver-pickup-info">
                      <ClickablePlayerName
                        element={r.elementId}
                        displayName={r.playerName}
                        web_name={r.playerName}
                        teamShort={r.teamShort}
                        className="waiver-name"
                      >
                        {r.playerName}
                      </ClickablePlayerName>
                      <span className="waiver-pickup-team">{r.teamName}</span>
                      <span className="waiver-club muted">
                        GW {r.firstGw}–{r.lastGw}
                        {r.waiverStints > 1 ? ` · ${r.waiverStints} pickups` : ''}
                      </span>
                    </div>
                    <span className="waiver-count tabular" title="Total pts for this team over those weeks">
                      {r.totalPointsForTeam}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted muted--tight">
                Run <code>npm run dev</code> / build so <code>pickups-tenure.json</code> is
                generated (needs <code>transactions.json</code> + finished GWs).
              </p>
            )}
          </section>

          <section className="tile tile--compact">
            <h2 className="tile-title tile-title--sm">Most waivered players</h2>
            {mostWaiveredPlayers?.length ? (
              <ol className="waiver-list waiver-list--tight">
                {mostWaiveredPlayers.map((p, i) => (
                  <li key={p.elementId} className="waiver-row">
                    <span className="waiver-rank">{i + 1}</span>
                    <PlayerKit shirtUrl={p.shirtUrl} badgeUrl={p.badgeUrl} teamShort={p.teamShort} />
                    <div className="waiver-info">
                      <ClickablePlayerName
                        element={p.elementId}
                        web_name={p.web_name}
                        teamShort={p.teamShort}
                        className="waiver-name"
                      >
                        {p.web_name}
                      </ClickablePlayerName>
                      <span className="waiver-club muted">{p.teamShort}</span>
                    </div>
                    <span className="waiver-count">{p.claims}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">
                Run full <code>ingest.py</code> (includes <code>transactions.json</code> and{' '}
                <code>bootstrap_draft.json</code>) then <code>npm run dev</code> to build waiver stats.
              </p>
            )}
          </section>
            </div>
              )}

              {teamSelectionTab === 'trades' && (
            <div className="dashboard-stack">
              <section className="tile tile--compact" aria-labelledby="trades-heading">
                <h2 id="trades-heading" className="tile-title tile-title--sm">
                  Trades
                </h2>
                {tradesPanelRows?.length ? (
                  <div className="trades-list">
                    {tradesPanelRows.map((trade) => (
                      <TradeCardArticle
                        key={trade.id}
                        trade={trade}
                        teamLogoMap={teamLogoMap}
                        kitIndexByEntry={kitIndexByEntry}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="muted muted--tight">
                    No trade analytics yet. Ingest <code>trades.json</code> (included in{' '}
                    <code>ingest.py</code> / local fetch), run <code>npm run dev</code> or{' '}
                    <code>npm run build</code> to generate <code>trades-panel.json</code>.
                  </p>
                )}
              </section>
            </div>
              )}

              {teamSelectionTab === 'draft' && (
            <div className="dashboard-stack">
              <DraftBoard
                league={data?.league}
                leagueEntries={leagueEntries}
                tableRows={tableRows}
                teamLogoMap={teamLogoMap}
                kitIndexByEntry={kitIndexByEntry}
              />
            </div>
              )}
              </div>
            </section>
          )}

          {dashboardView === 'more' ? (
            <DashboardMorePanel
              onNavigate={selectDashboardView}
              badgeTeams={teamsForFormSelect}
              teamLogoMap={teamLogoMap}
              kitIndexByEntry={kitIndexByEntry}
            />
          ) : null}

          {dashboardView === 'settings' ? (
            <SettingsPage
              themePref={themePref}
              onThemePrefChange={setThemePref}
              defaultTab={defaultTabPref}
              onDefaultTabChange={setDefaultTabPref}
            />
          ) : null}

          {dashboardView === 'fplLive' && (
            <section
              className="tile tile--compact tile--team-selection"
              aria-label="FPL Live"
            >
              <div className="section-chrome section-chrome--sticky">
              {/* FPL Live sub-nav — variant A (text-only segmented control) from the
                  SUB-NAV · FPL LIVE mockup showcase. "Live GW" carries a pulsing-dot
                  prefix (same icon family as the main nav's FPL Live tab, scaled to
                  ~12px). See `.subnav*` rules in App.css. */}
              <div
                className="subnav"
                role="tablist"
                aria-label="FPL Live views"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-fpl-live-scores"
                  aria-selected={fplLiveTab === 'live'}
                  className={
                    'subnav__tab' +
                    (fplLiveTab === 'live' ? ' subnav__tab--active' : '')
                  }
                  onClick={() => setFplLiveTab('live')}
                >
                  <span className="subnav__dot" aria-hidden="true">
                    <NavIcon name="pulsing-dot" size={12} />
                  </span>
                  Live GW
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-fpl-live-squads"
                  aria-selected={fplLiveTab === 'squads'}
                  className={
                    'subnav__tab' +
                    (fplLiveTab === 'squads' ? ' subnav__tab--active' : '')
                  }
                  onClick={() => setFplLiveTab('squads')}
                >
                  Lineups
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-fpl-live-projections"
                  aria-selected={fplLiveTab === 'projections'}
                  className={
                    'subnav__tab' +
                    (fplLiveTab === 'projections' ? ' subnav__tab--active' : '')
                  }
                  onClick={() => setFplLiveTab('projections')}
                >
                  Projections
                </button>
              </div>
              {/* The generative hero banner (LiveBannerConcept) was removed
                  in PR #5 cleanup — user confirmed the slot is no longer
                  needed. The horizontal H2H mini-ticker (FplLiveGwTickerBar)
                  is now scoped to the Lineups + Projections sub-tabs only;
                  on the Live GW sub-tab, the new 4-fixture grid below
                  (LiveScores → live-banner-group-tile) plus its
                  LiveSharedStatusHeader already cover the same job at
                  full size, so the mini-ticker is redundant there. */}
              {fplLiveTab !== 'live' ? (
                <FplLiveGwTickerBar
                  teams={teamsForFormSelect}
                  matches={matches ?? []}
                  gameweek={liveGameweek}
                  onBootstrapLiveMeta={onBootstrapLiveMeta}
                  teamLogoMap={teamLogoMap}
                  kitIndexByEntry={kitIndexByEntry}
                />
              ) : null}
              </div>
              <div className="section-body">
              {fplLiveTab === 'squads' ? (
                <PremWindow
                  teams={teamsForFormSelect}
                  gameweek={liveGameweek}
                  onGameweekChange={setLiveGw}
                  onBootstrapLiveMeta={onBootstrapLiveMeta}
                  teamLogoMap={teamLogoMap}
                  kitIndexByEntry={kitIndexByEntry}
                />
              ) : null}
              {fplLiveTab === 'live' ? (
                <LiveScores
                  teams={teamsForFormSelect}
                  tableRows={tableRows}
                  matches={matches ?? []}
                  gameweek={liveGameweek}
                  onGameweekChange={setLiveGw}
                  onBootstrapLiveMeta={onBootstrapLiveMeta}
                  teamLogoMap={teamLogoMap}
                  kitIndexByEntry={kitIndexByEntry}
                  leagueId={data?.league?.id ?? null}
                  waiverOutGwRows={waiverOutGwRows}
                  fplDraftCurrentGw={mergedFplCalendarCurrent ?? fplLiveLandingGw}
                  compactMobileChrome
                />
              ) : null}
              {fplLiveTab === 'projections' ? (
                <LiveScores
                  teams={teamsForFormSelect}
                  tableRows={tableRows}
                  matches={matches ?? []}
                  gameweek={liveGameweek}
                  onGameweekChange={setLiveGw}
                  onBootstrapLiveMeta={onBootstrapLiveMeta}
                  teamLogoMap={teamLogoMap}
                  kitIndexByEntry={kitIndexByEntry}
                  leagueId={data?.league?.id ?? null}
                  waiverOutGwRows={waiverOutGwRows}
                  fplDraftCurrentGw={mergedFplCalendarCurrent ?? fplLiveLandingGw}
                  projectionsOnly
                  compactMobileChrome
                />
              ) : null}
              </div>
            </section>
          )}

        </div>
      </main>
      <DashboardNav
        variant="bottom"
        dashboardView={dashboardView}
        onSelect={selectDashboardView}
      />
      <footer className="page-footer--script">Tery is a Racist</footer>
    </div>
    </PlayerHistoryProvider>
    </PlayerDetailOverlayProvider>
  )
}

export default App
