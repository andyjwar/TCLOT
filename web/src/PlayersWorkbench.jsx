import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { draftCurrentGameweek } from './draftBoardRosterStatus'
import {
  fplElementDisplayName,
  fplElementKnownName,
  fplElementWebName,
} from './fplElementNames.js'
import { PlayerKit } from './PlayerKit.jsx'
import { TeamAvatar } from './TeamAvatar.jsx'
import { fplShirtImageUrl } from './fplShirtUrl'
import { ClickablePlayerName } from './PlayerHistoryContext.jsx'
import { usePlayerDetailOverlayOptional } from './PlayerDetailOverlay.jsx'
import {
  POS_FILTER_ALL,
  POS_LABEL,
  buildNextFixturesByTeam,
  buildOwnerByElementFromElementStatus,
  compareWireElements,
  defaultSortDirForKey,
  elementSummaryStatsFromPayload,
  fetchElementSummariesBatched,
  formatWireStatValue,
  ownedElementIdsFromElementStatus,
  portraitMaxStatColumns,
  portraitDefaultWireStatIdsForPosition,
  readWireStatSelection,
  visibleWireColumns,
  wireColumnIsGroupStart,
  wireColumnToSortKey,
  wireStatsMapFromPayload,
  wireStatToneClass,
  wireTableGridTemplate,
  WIRE_STAT_CATALOG,
  writeWireStatSelection,
} from './playersWireList.js'
import './PlayersWorkbench.css'
import {
  PositionFilterPill,
  StatsColumnsPill,
  PillClearButton,
  OwnedFilterPill,
  SortPill,
  IncludeDraftedToggle,
} from './playersFilterPills.jsx'
import { usePortraitMobile, useMobileLayout } from './usePortraitMobile.js'
import { usePillMenuDismiss } from './usePillMenuDismiss.js'
import {
  fetchBootstrapDraft,
  fetchLeagueJsonFile,
} from './playersBenchShared.js'

const WIRE_STATS_SESSION_PREFIX = 'tclot-player-wire-stats-gw-'

function readWireStatsSession(gw) {
  if (typeof sessionStorage === 'undefined' || gw == null) return null
  try {
    const raw = sessionStorage.getItem(`${WIRE_STATS_SESSION_PREFIX}${gw}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return wireStatsMapFromPayload(parsed)
  } catch {
    return null
  }
}

function writeWireStatsSession(gw, map) {
  if (typeof sessionStorage === 'undefined' || gw == null) return
  try {
    const byElement = {}
    for (const [id, stats] of map) {
      byElement[String(id)] = stats
    }
    sessionStorage.setItem(
      `${WIRE_STATS_SESSION_PREFIX}${gw}`,
      JSON.stringify({ _meta: { gameweek: gw }, byElement }),
    )
  } catch {
    /* quota */
  }
}

/**
 * Phase-2 availability mark: 🚑 ambulance for injured OR doubtful, red dot
 * for suspended, nothing for available.
 *
 * @param {object} el bootstrap element
 */
function playerAvailabilityMark(el) {
  const status = el?.status != null ? String(el.status) : 'a'
  const news = typeof el?.news === 'string' ? el.news.trim() : ''
  if (status === 'i') {
    return { kind: 'emoji', emoji: '🚑', label: 'Injured', title: news || 'Injured' }
  }
  if (status === 'd') {
    const chance = el?.chance_of_playing_next_round
    const chanceLabel =
      chance != null && Number.isFinite(Number(chance)) ? `${chance}% chance` : ''
    return {
      kind: 'emoji',
      emoji: '🚑',
      label: 'Doubtful',
      title: news || chanceLabel || 'Doubtful',
    }
  }
  if (status === 's') {
    return { kind: 'dot', label: 'Suspended', title: news || 'Suspended' }
  }
  return null
}

/**
 * Trailing inline indicator cluster rendered after the player name (right edge
 * of the Player cell). Up to two items: an ownership signal (owner avatar OR
 * green FA dot) plus an availability signal (🚑 OR red suspended dot). Mutually
 * exclusive on ownership; stacking allowed across the two axes.
 *
 * @param {{
 *   el: object,
 *   owner: { leagueEntryId: number, teamName: string } | null | undefined,
 *   rostersHealthy: boolean,
 *   logoMap: Record<string, string>,
 *   kitIndexByEntry: Record<number, number>,
 * }} props
 */
function PlayerInlineIndicators({ el, owner, rostersHealthy, logoMap, kitIndexByEntry }) {
  const mark = playerAvailabilityMark(el)
  const showOwner = rostersHealthy && owner
  const showFa = rostersHealthy && !owner
  if (!mark && !showOwner && !showFa) return null
  return (
    <span className="players-table__name-indicators" aria-hidden={false}>
      {showOwner ? (
        <span
          className="players-table__name-indicator players-table__name-indicator--owner"
          title={`Owned by ${owner.teamName}`}
          aria-label={`Owned by ${owner.teamName}`}
        >
          <TeamAvatar
            entryId={owner.leagueEntryId}
            name={owner.teamName}
            size="sm"
            logoMap={logoMap}
            kitIndexByEntry={kitIndexByEntry}
            badgeFallback
          />
        </span>
      ) : null}
      {showFa ? (
        <span
          className="players-table__name-indicator players-table__name-indicator--fa"
          title="Free agent"
          aria-label="Free agent"
          role="img"
        />
      ) : null}
      {mark && mark.kind === 'emoji' ? (
        <span
          className="players-table__name-indicator players-table__name-indicator--injury"
          title={mark.title}
          aria-label={mark.label}
          role="img"
        >
          {mark.emoji}
        </span>
      ) : null}
      {mark && mark.kind === 'dot' ? (
        <span
          className="players-table__name-indicator players-table__name-indicator--sus"
          title={mark.title}
          aria-label={mark.label}
          role="img"
        />
      ) : null}
    </span>
  )
}

/**
 * @param {{ pos: 'GKP'|'DEF'|'MID'|'FWD'|string }} props
 */
function PositionChip({ pos }) {
  if (!pos) return null
  return <span className={`position-chip position-chip--${pos}`}>{pos}</span>
}

function plClubBadgeUrl(code) {
  return code != null
    ? `https://resources.premierleague.com/premierleague/badges/50/t${code}.png`
    : null
}

/**
 * @param {{
 *   clubFilter: number | 'all',
 *   clubOptions: object[],
 *   onSelect: (id: number | 'all') => void,
 * }} props
 */
function ClubFilterPill({ clubFilter, clubOptions, onSelect, compact = false }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const selectedTeam =
    clubFilter === 'all'
      ? null
      : clubOptions.find((t) => Number(t.id) === Number(clubFilter)) ?? null

  const selectedBadgeUrl = plClubBadgeUrl(selectedTeam?.code)
  const selectedLabel = selectedTeam
    ? String(selectedTeam.short_name ?? selectedTeam.name ?? 'Club')
    : 'Club'

  const dismiss = useCallback(() => setOpen(false), [])
  usePillMenuDismiss(rootRef, open, dismiss)

  const pick = (id) => {
    onSelect(id)
    setOpen(false)
  }

  const isActive = clubFilter !== 'all'
  const badgeOnly = compact && isActive

  return (
    <div
      className={`players-club-pill${badgeOnly ? ' players-club-pill--badge-only' : ''}`}
      ref={rootRef}
    >
      <button
        type="button"
        className={`team-selection-submenu__btn players-club-pill__btn${
          clubFilter !== 'all' ? ' team-selection-submenu__btn--active' : ''
        }${open ? ' players-menu-pill__btn--open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={
          clubFilter === 'all'
            ? 'Filter by club'
            : `Club filter: ${selectedLabel}`
        }
        onClick={() => setOpen((v) => !v)}
      >
        {selectedBadgeUrl ? (
          <img
            src={selectedBadgeUrl}
            alt=""
            className="players-club-pill__badge"
            width={18}
            height={18}
            loading="lazy"
          />
        ) : null}
        <span className="players-club-pill__label">{selectedLabel}</span>
        {clubFilter !== 'all' ? (
          <PillClearButton
            label="Show all clubs"
            onClear={() => onSelect('all')}
          />
        ) : null}
        <span className="players-menu-pill__chev" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul className="players-menu-pill__menu" role="listbox" aria-label="Clubs">
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={clubFilter === 'all'}
              className={`players-menu-pill__option${
                clubFilter === 'all' ? ' players-menu-pill__option--active' : ''
              }`}
              onClick={() => pick('all')}
            >
              <span className="players-menu-pill__option-text">All clubs</span>
            </button>
          </li>
          {clubOptions.map((t) => {
            const tid = Number(t.id)
            const active = Number(clubFilter) === tid
            const badge = plClubBadgeUrl(t.code)
            const short = String(t.short_name ?? t.name ?? '?')
            return (
              <li key={t.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`players-menu-pill__option${
                    active ? ' players-menu-pill__option--active' : ''
                  }`}
                  onClick={() => pick(tid)}
                >
                  {badge ? (
                    <img
                      src={badge}
                      alt=""
                      className="players-club-pill__badge"
                      width={20}
                      height={20}
                      loading="lazy"
                    />
                  ) : (
                    <span className="players-club-pill__badge-fallback">{short.slice(0, 3)}</span>
                  )}
                  <span className="players-menu-pill__option-text">{short}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

const PORTRAIT_POSITION_OPTIONS = [
  { id: '1', label: 'GK' },
  { id: '2', label: 'DEF' },
  { id: '3', label: 'MID' },
  { id: '4', label: 'FWD' },
]

/**
 * Caret SVG used for the portrait multi-select pill triggers.
 */
function PortraitPillCaret({ open = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`players-portrait-pill__caret${open ? ' players-portrait-pill__caret--open' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

/**
 * Generic multi-select dropdown pill (portrait). Used for Position and Stats.
 * For grouped sections (e.g. Club), use `MultiSelectGroupedDropdownPill` below.
 *
 * @param {{
 *   label: string,
 *   options: { id: string|number, label: string, disabled?: boolean, hint?: string }[],
 *   selectedIds: Array<string|number>,
 *   onSelectionChange: (next: Array<string|number>) => void,
 *   minSelection?: number,
 *   maxSelection?: number,
 *   allLabel?: string,
 *   summaryLabel?: (count: number, total: number) => string,
 * }} props
 */
function MultiSelectDropdownPill({
  label,
  options,
  selectedIds,
  onSelectionChange,
  minSelection = 0,
  maxSelection,
  allLabel = 'All',
  summaryLabel,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const dismiss = useCallback(() => setOpen(false), [])
  usePillMenuDismiss(rootRef, open, dismiss)

  const selectedSet = useMemo(
    () => new Set(selectedIds.map((id) => String(id))),
    [selectedIds],
  )
  const allCount = options.length
  const selectedCount = options.filter((o) => selectedSet.has(String(o.id))).length
  const isAll = selectedCount === allCount
  const isActive = !isAll
  const atMax = typeof maxSelection === 'number' && selectedCount >= maxSelection

  const value = isAll
    ? allLabel
    : summaryLabel
      ? summaryLabel(selectedCount, allCount)
      : String(selectedCount)

  const toggleOne = (optId) => {
    const key = String(optId)
    const next = new Set(selectedSet)
    if (next.has(key)) {
      if (next.size <= minSelection) return
      next.delete(key)
    } else {
      if (atMax) return
      next.add(key)
    }
    const ordered = options
      .map((o) => String(o.id))
      .filter((id) => next.has(id))
    onSelectionChange(ordered)
  }

  const toggleAll = () => {
    if (isAll) {
      // Selecting "All" when already all-selected is a no-op (keeps everything on).
      // Tapping "All" when partial selection → select everything.
      return
    }
    onSelectionChange(options.map((o) => String(o.id)))
  }

  return (
    <div className="players-portrait-pill" ref={rootRef}>
      <button
        type="button"
        className={`players-portrait-pill__btn${
          isActive ? ' players-portrait-pill__btn--active' : ''
        }${open ? ' players-portrait-pill__btn--open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${value}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="players-portrait-pill__label">{label}</span>
        <span className="players-portrait-pill__sep" aria-hidden>·</span>
        <span className="players-portrait-pill__value">{value}</span>
        <PortraitPillCaret open={open} />
      </button>
      {open ? (
        <div
          className="players-portrait-pill__pop"
          role="dialog"
          aria-label={`${label} options`}
        >
          <label className="players-portrait-pill__item">
            <input
              type="checkbox"
              className="players-portrait-pill__check"
              checked={isAll}
              onChange={toggleAll}
            />
            <span>All {label.toLowerCase()}</span>
          </label>
          <div className="players-portrait-pill__divider" aria-hidden />
          {options.map((opt) => {
            const checked = selectedSet.has(String(opt.id))
            const lockedMin = checked && selectedCount <= minSelection
            const blocked = !checked && atMax
            const disabled = Boolean(opt.disabled) || lockedMin || blocked
            return (
              <label
                key={opt.id}
                className={`players-portrait-pill__item${
                  disabled ? ' players-portrait-pill__item--disabled' : ''
                }${checked ? ' players-portrait-pill__item--checked' : ''}`}
                title={
                  opt.hint ??
                  (blocked && typeof maxSelection === 'number'
                    ? `Deselect another first (${maxSelection} max)`
                    : undefined)
                }
              >
                <input
                  type="checkbox"
                  className="players-portrait-pill__check"
                  checked={checked}
                  disabled={Boolean(opt.disabled) || (blocked && !checked)}
                  onChange={() => toggleOne(opt.id)}
                />
                <span>{opt.label}</span>
                {opt.hint ? (
                  <span className="players-portrait-pill__hint">{opt.hint}</span>
                ) : null}
              </label>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Multi-select dropdown pill with two grouped sections (used for Club: PL clubs + fantasy teams).
 *
 * @param {{
 *   label: string,
 *   sections: { id: string, label: string, options: { id: string|number, label: string }[], selectedIds: Array<string|number>, onSelectionChange: (next: Array<string|number>) => void }[],
 *   allLabel?: string,
 * }} props
 */
function MultiSelectGroupedDropdownPill({ label, sections, allLabel = 'All' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const dismiss = useCallback(() => setOpen(false), [])
  usePillMenuDismiss(rootRef, open, dismiss)

  const sectionSummaries = sections.map((s) => {
    const set = new Set(s.selectedIds.map((id) => String(id)))
    const total = s.options.length
    const selected = s.options.filter((o) => set.has(String(o.id))).length
    return { id: s.id, set, total, selected }
  })

  const totalOptions = sectionSummaries.reduce((acc, s) => acc + s.total, 0)
  const totalSelected = sectionSummaries.reduce((acc, s) => acc + s.selected, 0)
  const isAll = totalSelected === totalOptions
  const isActive = !isAll
  const value = isAll ? allLabel : String(totalSelected)

  const toggleOption = (sectionIdx, optId) => {
    const s = sections[sectionIdx]
    const set = new Set(s.selectedIds.map((id) => String(id)))
    const key = String(optId)
    if (set.has(key)) set.delete(key)
    else set.add(key)
    const ordered = s.options
      .map((o) => String(o.id))
      .filter((id) => set.has(id))
    s.onSelectionChange(ordered)
  }

  const toggleSectionAll = (sectionIdx) => {
    const s = sections[sectionIdx]
    const summary = sectionSummaries[sectionIdx]
    if (summary.selected === summary.total) {
      // Tapping "All {section}" when full → clear that section.
      s.onSelectionChange([])
    } else {
      s.onSelectionChange(s.options.map((o) => String(o.id)))
    }
  }

  return (
    <div className="players-portrait-pill" ref={rootRef}>
      <button
        type="button"
        className={`players-portrait-pill__btn${
          isActive ? ' players-portrait-pill__btn--active' : ''
        }${open ? ' players-portrait-pill__btn--open' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${value}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="players-portrait-pill__label">{label}</span>
        <span className="players-portrait-pill__sep" aria-hidden>·</span>
        <span className="players-portrait-pill__value">{value}</span>
        <PortraitPillCaret open={open} />
      </button>
      {open ? (
        <div
          className="players-portrait-pill__pop players-portrait-pill__pop--grouped"
          role="dialog"
          aria-label={`${label} options`}
        >
          {sections.map((s, sIdx) => {
            const summary = sectionSummaries[sIdx]
            if (s.options.length === 0) return null
            const allOn = summary.selected === summary.total
            return (
              <section key={s.id} className="players-portrait-pill__section">
                <header className="players-portrait-pill__section-head">
                  <span className="players-portrait-pill__section-label">{s.label}</span>
                  <button
                    type="button"
                    className="players-portrait-pill__section-toggle"
                    onClick={() => toggleSectionAll(sIdx)}
                  >
                    {allOn ? 'Clear' : 'All'}
                  </button>
                </header>
                {s.options.map((opt) => {
                  const checked = summary.set.has(String(opt.id))
                  return (
                    <label
                      key={opt.id}
                      className={`players-portrait-pill__item${
                        checked ? ' players-portrait-pill__item--checked' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="players-portrait-pill__check"
                        checked={checked}
                        onChange={() => toggleOption(sIdx, opt.id)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  )
                })}
              </section>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Wire / Owned segmented toggle (portrait). Binary either/or replacing the
 * Owned filter pill + Include-drafted toggle.
 *
 * @param {{ value: 'wire' | 'owned', onChange: (next: 'wire' | 'owned') => void, disabled?: boolean }} props
 */
function WireOwnedSegmentedToggle({ value, onChange, disabled = false }) {
  return (
    <div
      className={`players-portrait-segment${disabled ? ' players-portrait-segment--disabled' : ''}`}
      role="group"
      aria-label="Player ownership filter"
    >
      <button
        type="button"
        className={`players-portrait-segment__btn${
          value === 'wire' ? ' players-portrait-segment__btn--active' : ''
        }`}
        aria-pressed={value === 'wire'}
        disabled={disabled}
        onClick={() => onChange('wire')}
      >
        Wire
      </button>
      <button
        type="button"
        className={`players-portrait-segment__btn${
          value === 'owned' ? ' players-portrait-segment__btn--active' : ''
        }`}
        aria-pressed={value === 'owned'}
        disabled={disabled}
        onClick={() => onChange('owned')}
      >
        Owned
      </button>
    </div>
  )
}

/**
 * Stats column multi-select dropdown — portrait variant. Wraps the same
 * `MultiSelectDropdownPill` pattern around the existing
 * position-aware stat catalog so the trigger chrome matches the other
 * portrait pills (Position, Club).
 *
 * @param {{
 *   selectedIds: string[],
 *   onChange: (ids: string[]) => void,
 *   positionFilter: import('./playersWireList.js').PositionFilterId,
 *   maxStatColumns: number,
 * }} props
 */
function PortraitStatsDropdownPill({
  selectedIds,
  onChange,
  positionFilter,
  maxStatColumns,
}) {
  const options = useMemo(() => {
    const list = []
    for (const stat of Object.values(WIRE_STAT_CATALOG)) {
      if (stat.id === 'pos') continue
      if (stat.hideWhenPos?.length && positionFilter !== POS_FILTER_ALL) {
        if (stat.hideWhenPos.includes(positionFilter)) continue
      }
      list.push({ id: stat.id, label: stat.label })
    }
    return list
  }, [positionFilter])

  return (
    <MultiSelectDropdownPill
      label="Stats"
      options={options}
      selectedIds={selectedIds}
      onSelectionChange={onChange}
      minSelection={1}
      maxSelection={maxStatColumns}
      allLabel={String(selectedIds.length)}
      summaryLabel={(count) => String(count)}
    />
  )
}

/** @param {{ fixtures: object[], nextOnly?: boolean }} props */
function NextFixtureBadges({ fixtures, nextOnly = false }) {
  const list = nextOnly && fixtures?.length ? [fixtures[0]] : fixtures
  if (!list?.length) {
    return <span className="players-fixtures-empty">—</span>
  }
  return (
    <span
      className={`players-fixtures-badges${nextOnly ? ' players-fixtures-badges--next-only' : ''}`}
      role="list"
      aria-label={nextOnly ? 'Next fixture' : 'Next three opponents'}
    >
      {list.map((fx, i) => (
        <span
          key={`${fx.oppTeamId}-${fx.isHome ? 'H' : 'A'}-${i}`}
          className={`players-fixture-badge${
            fx.isHome ? ' players-fixture-badge--home' : ' players-fixture-badge--away'
          }`}
          role="listitem"
          title={`${fx.isHome ? 'Home' : 'Away'} vs ${fx.shortName}`}
          aria-label={`${fx.isHome ? 'Home' : 'Away'} vs ${fx.shortName}`}
        >
          {fx.badgeUrl ? (
            <img
              src={fx.badgeUrl}
              alt=""
              className="players-fixture-badge__crest"
              width={28}
              height={28}
              loading="lazy"
            />
          ) : (
            <span className="players-fixture-badge__crest players-fixture-badge__crest--fallback">
              {fx.shortName?.slice(0, 3) ?? '?'}
            </span>
          )}
        </span>
      ))}
    </span>
  )
}

function enrichElementRow(el, teamByCode) {
  const tm = el ? teamByCode.get(el.team) : null
  const shirtUrl = fplShirtImageUrl(tm?.code, el?.element_type)
  const badgeUrl =
    tm?.code != null
      ? `https://resources.premierleague.com/premierleague/badges/50/t${tm.code}.png`
      : null
  const posLabel = POS_LABEL[el.element_type] ?? '?'
  return {
    raw: el,
    shirtUrl,
    badgeUrl,
    posLabel,
    teamShort: tm?.short_name ?? '—',
  }
}

/** @param {string} colId @param {string | null} activeSortColId @param {string} [extra] @param {boolean} [groupStart] */
function wireCellClass(colId, activeSortColId, extra = '', groupStart = false) {
  return [
    'players-table__cell',
    extra,
    colId === activeSortColId ? 'players-table__cell--sorted' : '',
    groupStart ? 'players-table__col--group-start' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Waiver-wire browser. Player detail opens via the shared full-screen
 * `PlayerDetailOverlay` (same path as Live / Compare flows).
 *
 * @param {{
 *   leagueEntries: object[],
 *   teamsForFormSelect: { id: number|null, teamName?: string|null, fplEntryId?: number|null }[],
 *   leagueDataRevision?: string,
 *   logoMap?: Record<string, string>,
 *   kitIndexByEntry?: Record<number, number>,
 * }} props
 */
export function PlayersWorkbench({
  leagueEntries = [],
  teamsForFormSelect = [],
  leagueDataRevision = '',
  logoMap = {},
  kitIndexByEntry = {},
}) {
  const portrait = usePortraitMobile()
  const mobileLayout = useMobileLayout()
  const [bootstrap, setBootstrap] = useState(null)
  const [squadsErr, setSquadsErr] = useState(null)
  const [currentGw, setCurrentGw] = useState(null)
  /** element id → owner (from ingested element_status.json) */
  const [ownerByElementId, setOwnerByElementId] = useState(() => new Map())
  /** All rostered element ids league-wide */
  const [ownedIds, setOwnedIds] = useState(() => new Set())
  const [rostersHealthy, setRostersHealthy] = useState(false)

  const [availableOnly, setAvailableOnly] = useState(true)
  const [search, setSearch] = useState('')
  /** @type {[import('./playersWireList.js').PositionFilterId, (v: import('./playersWireList.js').PositionFilterId)=>void]} */
  const [positionFilter, setPositionFilter] = useState(POS_FILTER_ALL)
  /** @type {[number|'all', (v: number|'all')=>void]} */
  const [clubFilter, setClubFilter] = useState('all')
  /** @type {[import('./playersWireList.js').WireSortKey, (v: import('./playersWireList.js').WireSortKey)=>void]} */
  const [sortKey, setSortKey] = useState('total_points')
  /** @type {[import('./playersWireList.js').WireSortDir, (v: import('./playersWireList.js').WireSortDir)=>void]} */
  const [sortDir, setSortDir] = useState('desc')
  /** element id → { defConHits, gamesPlayed, sixtyPlus } from element-summary */
  const [summaryByElement, setSummaryByElement] = useState(() => new Map())
  const [summaryLoading, setSummaryLoading] = useState(false)
  /** @type {[number|null, (id: number|null)=>void]} */
  const [myTeamLeagueEntryId, setMyTeamLeagueEntryId] = useState(null)
  /** @type {[string[], (ids: string[]) => void]} */
  const [selectedStatIds, setSelectedStatIds] = useState(() =>
    readWireStatSelection(POS_FILTER_ALL),
  )

  /* ============================================================
   * Portrait-only multi-select state. Desktop continues to use the
   * single-select positionFilter / clubFilter / availableOnly /
   * myTeamLeagueEntryId state above — this state is layered on top
   * for the ≤600px toolbar and read only when `portrait === true`.
   *
   * For the Club + Fantasy multi-selects, `null` is the "uninitialized,
   * everything on" sentinel — the option list isn't available until
   * bootstrap + leagueEntries arrive. As soon as the user makes any
   * change, the value flips to an explicit `number[]`.
   * ============================================================ */
  /** @type {[string[], (ids: string[]) => void]} */
  const [portraitPositions, setPortraitPositions] = useState(() => [
    '1', '2', '3', '4',
  ])
  /** @type {[number[] | null, (ids: number[] | null) => void]} */
  const [portraitPlClubs, setPortraitPlClubs] = useState(null)
  /** @type {[number[] | null, (ids: number[] | null) => void]} */
  const [portraitFantasyTeams, setPortraitFantasyTeams] = useState(null)
  /** @type {['wire' | 'owned', (v: 'wire' | 'owned') => void]} */
  const [portraitWireOwned, setPortraitWireOwned] = useState('wire')

  /** Player detail launches via the shared overlay (no inline view). */
  const playerDetailOverlay = usePlayerDetailOverlayOptional()

  const elemsById = useMemo(() => {
    const m = new Map()
    if (!bootstrap?.elements) return m
    for (const el of bootstrap.elements) {
      m.set(Number(el.id), el)
    }
    return m
  }, [bootstrap])

  const teamById = useMemo(() => {
    const m = new Map()
    if (!bootstrap?.teams) return m
    for (const t of bootstrap.teams) {
      m.set(t.id, t)
    }
    return m
  }, [bootstrap])

  /** Every squad element rostered league-wide */
  const rosterIdsForMine = useMemo(() => {
    if (myTeamLeagueEntryId == null) return new Set()
    const s = new Set()
    for (const [pid, owner] of ownerByElementId) {
      if (Number(owner.leagueEntryId) === Number(myTeamLeagueEntryId)) {
        s.add(Number(pid))
      }
    }
    return s
  }, [myTeamLeagueEntryId, ownerByElementId])

  const nextFixturesByTeam = useMemo(() => {
    if (!bootstrap) return new Map()
    return buildNextFixturesByTeam(bootstrap, teamById, 3)
  }, [bootstrap, teamById])

  /**
   * Effective position filter — drives column visibility + Stats picker.
   * Portrait derives this from `portraitPositions` (multi-select): if exactly
   * one position is selected, treat it as a per-position filter; otherwise
   * collapse to 'all' (mixed selection → All-style columns).
   */
  const effectivePositionFilter = useMemo(() => {
    if (!portrait) return positionFilter
    if (portraitPositions.length === 1) return portraitPositions[0]
    return POS_FILTER_ALL
  }, [portrait, positionFilter, portraitPositions])

  const visibleCols = useMemo(
    () => visibleWireColumns(effectivePositionFilter, selectedStatIds, { portrait }),
    [effectivePositionFilter, selectedStatIds, portrait],
  )
  const tableGridTemplate = useMemo(
    () => wireTableGridTemplate(visibleCols),
    [visibleCols],
  )
  const statColumnMax = portrait ? portraitMaxStatColumns(effectivePositionFilter) : undefined
  const handleStatSelectionChange = useCallback(
    (ids) => {
      const next = statColumnMax ? ids.slice(0, statColumnMax) : ids
      setSelectedStatIds(next)
      writeWireStatSelection(effectivePositionFilter, next)
    },
    [effectivePositionFilter, statColumnMax],
  )

  useEffect(() => {
    if (portrait) {
      setSelectedStatIds(portraitDefaultWireStatIdsForPosition(effectivePositionFilter))
      return
    }
    setSelectedStatIds(readWireStatSelection(effectivePositionFilter))
  }, [effectivePositionFilter, portrait])

  const clubOptions = useMemo(() => {
    if (!bootstrap?.teams?.length) return []
    return [...bootstrap.teams].sort((a, b) =>
      String(a.short_name || a.name).localeCompare(String(b.short_name || b.name)),
    )
  }, [bootstrap])

  /* Portrait multi-select effective lists.
   * `portraitPlClubs` / `portraitFantasyTeams` default to `null` meaning
   * "user hasn't customized, treat as all-on". We materialize the full
   * id lists here once option data exists so the dropdown UI can show
   * "All …" checked correctly and the filter logic has a concrete set. */
  const effectivePortraitPlClubs = useMemo(() => {
    if (portraitPlClubs != null) return portraitPlClubs
    return clubOptions.map((t) => Number(t.id))
  }, [portraitPlClubs, clubOptions])

  const fantasyEntryIds = useMemo(
    () =>
      leagueEntries
        .map((e) => Number(e?.id))
        .filter((n) => Number.isFinite(n)),
    [leagueEntries],
  )

  const effectivePortraitFantasyTeams = useMemo(() => {
    if (portraitFantasyTeams != null) return portraitFantasyTeams
    return fantasyEntryIds
  }, [portraitFantasyTeams, fantasyEntryIds])

  const nextFixtureSortKey = useCallback(
    (el) => {
      const fixtures = nextFixturesByTeam.get(Number(el?.team)) ?? []
      return fixtures
        .map((fx) => `${fx.isHome ? 'H' : 'A'}${fx.shortName}`)
        .join('|')
    },
    [nextFixturesByTeam],
  )

  const summaryExtraFor = useCallback(
    (el) => {
      const s = summaryByElement.get(Number(el?.id))
      return {
        defConHits: s?.defConHits,
        gamesPlayed: s?.gamesPlayed,
        sixtyPlus: s?.sixtyPlus,
      }
    },
    [summaryByElement],
  )

  const handleColumnSort = useCallback((colId) => {
    const key = wireColumnToSortKey(colId)
    if (!key) return
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
      return
    }
    setSortKey(key)
    setSortDir(defaultSortDirForKey(key))
  }, [sortKey])

  const effectiveSortKey = useMemo(() => {
    const col = visibleCols.find((c) => wireColumnToSortKey(c.id) === sortKey)
    return col ? sortKey : 'total_points'
  }, [sortKey, visibleCols])

  const activeSortColId = useMemo(
    () => visibleCols.find((c) => wireColumnToSortKey(c.id) === effectiveSortKey)?.id ?? null,
    [visibleCols, effectiveSortKey],
  )

  const outfieldList = useMemo(() => {
    if (!bootstrap?.elements?.length) return []
    let list = [...bootstrap.elements]

    if (portrait) {
      // Portrait — multi-select filters. Empty arrays mean "nothing checked"
      // and produce zero matches (empty state).
      const posSet = new Set(portraitPositions.map(String))
      list = list.filter((el) => posSet.has(String(el.element_type)))

      // PL clubs: pre-init (null) is treated as "all on" by the effective
      // list, so no extra branch needed.
      if (portraitPlClubs != null) {
        const plSet = new Set(portraitPlClubs.map(Number))
        list = list.filter((el) => plSet.has(Number(el.team)))
      }

      if (rostersHealthy && portraitFantasyTeams != null) {
        const fantasySet = new Set(portraitFantasyTeams.map(Number))
        const allFantasyOn =
          fantasyEntryIds.length > 0 &&
          fantasyEntryIds.every((id) => fantasySet.has(id))
        if (!allFantasyOn) {
          list = list.filter((el) => {
            const owner = ownerByElementId.get(Number(el.id))
            if (!owner) {
              // Free agents only included if "Wire" mode is selected; in
              // "Owned" mode FAs are excluded by the wire-owned filter below.
              return portraitWireOwned === 'wire'
            }
            return fantasySet.has(Number(owner.leagueEntryId))
          })
        }
      }

      if (rostersHealthy) {
        if (portraitWireOwned === 'wire') {
          list = list.filter((el) => !ownedIds.has(Number(el.id)))
        } else {
          list = list.filter((el) => ownedIds.has(Number(el.id)))
        }
      }
    } else {
      if (positionFilter !== POS_FILTER_ALL) {
        list = list.filter((el) => String(el.element_type) === positionFilter)
      }
      if (clubFilter !== 'all') {
        list = list.filter((el) => Number(el.team) === Number(clubFilter))
      }
      if (availableOnly && rostersHealthy) {
        if (myTeamLeagueEntryId != null) {
          list = list.filter((el) => !rosterIdsForMine.has(Number(el.id)))
        } else {
          list = list.filter((el) => !ownedIds.has(Number(el.id)))
        }
      } else if (myTeamLeagueEntryId != null && rostersHealthy) {
        list = list.filter((el) => rosterIdsForMine.has(Number(el.id)))
      }
    }

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((el) => {
        const known = fplElementKnownName(el, el.id).toLowerCase()
        const web = fplElementWebName(el, el.id).toLowerCase()
        return known.includes(q) || web.includes(q)
      })
    }

    list.sort((a, b) =>
      compareWireElements(a, b, effectiveSortKey, sortDir, {
        extraFor: summaryExtraFor,
        nextFixtureSortKey,
      }),
    )
    return list
  }, [
    bootstrap,
    search,
    availableOnly,
    rostersHealthy,
    ownedIds,
    ownerByElementId,
    rosterIdsForMine,
    myTeamLeagueEntryId,
    positionFilter,
    clubFilter,
    portrait,
    portraitPositions,
    portraitPlClubs,
    portraitFantasyTeams,
    fantasyEntryIds,
    portraitWireOwned,
    effectiveSortKey,
    sortDir,
    summaryExtraFor,
    nextFixtureSortKey,
  ])

  /** GP / 60+ / DefCon — static file at build time; session cache or one-time API fallback per GW. */
  useEffect(() => {
    if (currentGw == null || !bootstrap?.elements?.length) return undefined
    let cancel = false

    void (async () => {
      const cacheKey =
        leagueDataRevision && String(leagueDataRevision).trim()
          ? String(leagueDataRevision).trim()
          : ''

      try {
        const wirePayload = await fetchLeagueJsonFile('player-wire-stats.json', cacheKey)
        if (cancel) return
        const fromFile = wireStatsMapFromPayload(wirePayload)
        if (fromFile.size > 0 && Number(wirePayload?._meta?.gameweek) === Number(currentGw)) {
          setSummaryByElement(fromFile)
          setSummaryLoading(false)
          return
        }
      } catch {
        /* no prebuilt file — dev / demo */
      }

      const fromSession = readWireStatsSession(currentGw)
      if (fromSession?.size) {
        setSummaryByElement(fromSession)
        setSummaryLoading(false)
        return
      }

      setSummaryLoading(true)
      const ids = bootstrap.elements.map((el) => Number(el.id)).filter(Number.isFinite)
      const next = new Map()
      await fetchElementSummariesBatched(ids, (id, payload) => {
        if (cancel) return
        const el = elemsById.get(id)
        next.set(
          id,
          payload
            ? elementSummaryStatsFromPayload(payload, el?.element_type)
            : { defConHits: null, gamesPlayed: null, sixtyPlus: null },
        )
      })
      if (cancel) return
      setSummaryByElement(next)
      writeWireStatsSession(currentGw, next)
      setSummaryLoading(false)
    })()

    return () => {
      cancel = true
    }
  }, [currentGw, bootstrap, leagueDataRevision, elemsById])

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        setSquadsErr(null)
        const cacheKey =
          leagueDataRevision && String(leagueDataRevision).trim()
            ? String(leagueDataRevision).trim()
            : ''
        const boot = await fetchBootstrapDraft(cacheKey)
        if (cancel) return
        setBootstrap(boot)
        setCurrentGw(draftCurrentGameweek(boot))

        const statusPayload = await fetchLeagueJsonFile('element_status.json', cacheKey)
        if (cancel) return

        const owners = buildOwnerByElementFromElementStatus(statusPayload, teamsForFormSelect)
        const owned = ownedElementIdsFromElementStatus(statusPayload)
        setOwnerByElementId(owners)
        setOwnedIds(owned)
        setRostersHealthy(owned.size > 0)
      } catch (e) {
        if (!cancel) {
          const msg = e?.message ?? String(e)
          setSquadsErr(msg)
          setRostersHealthy(false)
        }
      }
    })()
    return () => {
      cancel = true
    }
  }, [teamsForFormSelect, leagueDataRevision])

  /**
   * Open the full-screen `PlayerDetailOverlay`. Passes `myTeamLeagueEntryId` so the
   * overlay's compare picker preselects the user's roster when available.
   */
  const openPlayerDetail = useCallback(
    (el) => {
      if (!playerDetailOverlay) return
      const id = Number(el?.id)
      if (!Number.isFinite(id)) return
      const payload = { element: id }
      if (myTeamLeagueEntryId != null) {
        payload.leagueEntryId = Number(myTeamLeagueEntryId)
      }
      const team = teamById.get(Number(el?.team))
      if (team?.short_name) payload.teamShort = team.short_name
      const display = fplElementDisplayName(el, id)
      if (display) payload.displayName = display
      if (el?.web_name) payload.web_name = el.web_name
      playerDetailOverlay.openPlayerDetail(payload)
    },
    [playerDetailOverlay, myTeamLeagueEntryId, teamById],
  )

  /* Phase-2 Owned filter — collapses (availableOnly, myTeamLeagueEntryId)
   * into a single enum: 'free' | 'any' | { teamId }. Currently there is no
   * app-level "my team" identity to anchor a "On my squad" preset, so the
   * pill skips that promoted row and surfaces per-team rows directly. */
  const ownedMode = useMemo(() => {
    if (myTeamLeagueEntryId != null) return { teamId: Number(myTeamLeagueEntryId) }
    return availableOnly ? 'free' : 'any'
  }, [availableOnly, myTeamLeagueEntryId])

  const handleOwnedModeChange = useCallback((mode) => {
    if (mode === 'free') {
      setAvailableOnly(true)
      setMyTeamLeagueEntryId(null)
      return
    }
    if (mode === 'any') {
      setAvailableOnly(false)
      setMyTeamLeagueEntryId(null)
      return
    }
    if (mode === 'mySquad') {
      // No app-level "my team" — fall back to any-owner (no-op narrow).
      setAvailableOnly(false)
      setMyTeamLeagueEntryId(null)
      return
    }
    if (typeof mode === 'object' && mode != null && Number.isFinite(Number(mode.teamId))) {
      setAvailableOnly(false)
      setMyTeamLeagueEntryId(Number(mode.teamId))
    }
  }, [])

  /* The Include-drafted toggle is the inverse of `availableOnly` and only
   * meaningful in the FA / Any-owner spectrum (decision 9). When the user
   * has narrowed to a specific squad, the toggle is disabled. */
  const includeDrafted = !availableOnly
  const includeDraftedDisabled = ownedMode !== 'free' && ownedMode !== 'any'
  const handleIncludeDraftedChange = useCallback((next) => {
    if (next) handleOwnedModeChange('any')
    else handleOwnedModeChange('free')
  }, [handleOwnedModeChange])

  const handleSortKeyChange = useCallback((key) => setSortKey(key), [])
  const handleSortDirChange = useCallback((dir) => setSortDir(dir), [])

  /* Header meta line — "2025/26 · GW {gw} · {n} {label}" (e.g. "12 free-agent MIDs"). */
  const positionLabelForMeta = useMemo(() => {
    if (effectivePositionFilter === POS_FILTER_ALL) return 'players'
    // POS_LABEL is uppercase ("GKP", "DEF", "MID", "FWD"); pluralize as-is.
    return `${POS_LABEL[Number(effectivePositionFilter)] ?? 'players'}s`
  }, [effectivePositionFilter])
  const headerMeta = useMemo(() => {
    const parts = ['2025/26']
    if (currentGw != null) parts.push(`GW ${currentGw}`)
    if (bootstrap) {
      const n = outfieldList.length
      const noun = positionLabelForMeta
      const freeAgentPrefix = portrait
        ? portraitWireOwned === 'wire'
          ? 'free-agent '
          : ''
        : ownedMode === 'free'
          ? 'free-agent '
          : ''
      parts.push(`${n} ${freeAgentPrefix}${noun}`)
    }
    return parts.join(' · ')
  }, [
    currentGw,
    bootstrap,
    outfieldList.length,
    positionLabelForMeta,
    ownedMode,
    portrait,
    portraitWireOwned,
  ])

  const searchPlaceholder = portrait ? 'Search players' : '👀 Search players, clubs, owners…'

  const searchSvg = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="players-bench-search-field__icon"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )

  const searchField = (
    <label className="players-bench-search-field">
      {searchSvg}
      <input
        type="search"
        placeholder={searchPlaceholder}
        className="players-bench-search"
        enterKeyHint="search"
        aria-label="Search players"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </label>
  )

  const includeDraftedToggle = (
    <IncludeDraftedToggle
      checked={includeDrafted}
      onChange={handleIncludeDraftedChange}
      disabled={includeDraftedDisabled || !rostersHealthy}
      compact={portrait}
    />
  )

  return (
    <section
      className={`tile tile--standings players-bench-tile${portrait ? ' players-bench-tile--portrait-list' : ''}`}
      aria-label="Players wire list"
    >
      {squadsErr ? (
        <p className="players-bench-banner" role="alert">
          Could not load player data. {squadsErr}
        </p>
      ) : null}

      <div className="players-bench-chrome section-chrome section-chrome--sticky">
        {/* Header band — title meta + (desktop only) search + include-drafted */}
        <div className="players-bench-header">
          <div className="players-bench-header__titles">
            <h2 className="players-bench-header__title">Players</h2>
            <span className="players-bench-header__meta">{headerMeta}</span>
          </div>
          {!portrait ? (
            <>
              {searchField}
              {includeDraftedToggle}
            </>
          ) : null}
        </div>

        {portrait ? (
          <>
            {/* Portrait toolbar — Row 1: search bar + Wire/Owned segmented toggle */}
            <div className="players-bench-search-row players-bench-search-row--portrait">
              {searchField}
              <WireOwnedSegmentedToggle
                value={portraitWireOwned}
                onChange={setPortraitWireOwned}
                disabled={!rostersHealthy}
              />
            </div>

            {/* Portrait toolbar — Row 2: filter pills (Position / Club / Stats) */}
            <div
              className="players-bench-filters players-bench-filters--portrait"
              role="toolbar"
              aria-label="Player filters"
            >
              <MultiSelectDropdownPill
                label="Position"
                options={PORTRAIT_POSITION_OPTIONS}
                selectedIds={portraitPositions}
                onSelectionChange={(ids) => setPortraitPositions(ids.map(String))}
                allLabel="All"
              />
              <MultiSelectGroupedDropdownPill
                label="Club"
                allLabel="All"
                sections={[
                  {
                    id: 'pl',
                    label: 'Premier League',
                    options: clubOptions.map((t) => ({
                      id: Number(t.id),
                      label: String(t.short_name ?? t.name ?? '?'),
                    })),
                    selectedIds: effectivePortraitPlClubs,
                    onSelectionChange: (ids) => setPortraitPlClubs(ids.map(Number)),
                  },
                  {
                    id: 'fantasy',
                    label: 'Fantasy teams',
                    options: leagueEntries
                      .filter((e) => Number.isFinite(Number(e?.id)))
                      .map((e) => ({
                        id: Number(e.id),
                        label: String(e?.teamName ?? `Team ${e?.id}`),
                      })),
                    selectedIds: effectivePortraitFantasyTeams,
                    onSelectionChange: (ids) =>
                      setPortraitFantasyTeams(ids.map(Number)),
                  },
                ]}
              />
              <PortraitStatsDropdownPill
                selectedIds={selectedStatIds}
                onChange={handleStatSelectionChange}
                positionFilter={effectivePositionFilter}
                maxStatColumns={statColumnMax ?? 5}
              />
            </div>
          </>
        ) : (
          /* Desktop filter pill row — Position · Club · Owned · spacer · Sort · Stats */
          <div className="players-bench-filters" role="toolbar" aria-label="Player filters">
            <PositionFilterPill
              positionFilter={positionFilter}
              onSelect={setPositionFilter}
              compact={portrait}
            />
            <ClubFilterPill
              clubFilter={clubFilter}
              clubOptions={clubOptions}
              onSelect={setClubFilter}
              compact={portrait}
            />
            <OwnedFilterPill
              ownedMode={ownedMode}
              onOwnedModeChange={handleOwnedModeChange}
              teams={teamsForFormSelect}
              myFantasyEntryId={null}
              logoMap={logoMap}
              kitIndexByEntry={kitIndexByEntry}
              compact={portrait}
              rostersHealthy={rostersHealthy}
            />
            <span className="players-bench-filters__spacer" aria-hidden />
            <SortPill
              sortKey={sortKey}
              sortDir={sortDir}
              onSortKeyChange={handleSortKeyChange}
              onSortDirChange={handleSortDirChange}
              positionFilter={positionFilter}
            />
            <StatsColumnsPill
              selectedIds={selectedStatIds}
              onChange={handleStatSelectionChange}
              positionFilter={positionFilter}
              maxStatColumns={statColumnMax ?? 8}
              compact={portrait}
            />
          </div>
        )}
      </div>

      <div className="players-table-scroll">
        <div
          className={`players-table players-table--wide${portrait ? ' players-table--portrait' : ''}`}
          role="table"
          aria-label="Waiver wire players"
          style={{ '--wire-cols': tableGridTemplate }}
        >
          <div className="players-table__head" role="rowgroup">
            <div className="players-table__head-row" role="row">
            {visibleCols.map((col, colIndex) => {
              const colSortKey = wireColumnToSortKey(col.id)
              const isActive = col.id === activeSortColId
              const groupStart = wireColumnIsGroupStart(col.id, visibleCols, colIndex)
              const ariaSort = isActive
                ? sortDir === 'asc'
                  ? 'ascending'
                  : 'descending'
                : colSortKey
                  ? 'none'
                  : undefined
              const thClass = [
                'players-table__th',
                col.id === 'player' ? 'players-table__th--player' : '',
                // Desktop-only fixed POS column (chip render) — center alignment.
                col.id === 'pos' && !portrait ? 'players-table__th--pos' : '',
                col.id === 'pts' ? 'players-table__th--pts' : '',
                col.id === 'next3' ? 'players-table__th--next3' : '',
                isActive ? 'players-table__th--sorted' : '',
                groupStart ? 'players-table__col--group-start' : '',
              ]
                .filter(Boolean)
                .join(' ')

              if (!colSortKey) {
                return (
                  <span key={col.id} className={thClass} role="columnheader" title={col.title}>
                    {col.label}
                  </span>
                )
              }

              return (
                <button
                  key={col.id}
                  type="button"
                  className={`${thClass} players-table__th-btn`}
                  role="columnheader"
                  aria-sort={ariaSort}
                  title={col.title ? `${col.title} · click to sort` : 'Click to sort'}
                  onClick={() => handleColumnSort(col.id)}
                >
                  <span className="players-table__th-label">{col.label}</span>
                  {!mobileLayout ? (
                    isActive ? (
                      <span className="players-table__sort-indicator" aria-hidden>
                        {sortDir === 'asc' ? '↑' : '↓'}
                      </span>
                    ) : (
                      <span
                        className="players-table__sort-indicator players-table__sort-indicator--idle"
                        aria-hidden
                      >
                        ↕
                      </span>
                    )
                  ) : null}
                </button>
              )
            })}
            </div>
          </div>

          <div className="players-table__body" role="rowgroup">
            {(bootstrap ? outfieldList : []).map((el) => {
              const row = enrichElementRow(el, teamById)
              const elId = Number(el.id)
              const summary = summaryByElement.get(elId)
              const nextFixtures = nextFixturesByTeam.get(Number(el.team)) ?? []

              const displayName = fplElementDisplayName(el, el.id)
              const rowTappable = Boolean(playerDetailOverlay)
              const posLabel = POS_LABEL[el.element_type]
              return (
                <div
                  key={el.id}
                  className={`players-table__row${rowTappable ? ' players-table__row--tappable' : ''}`}
                  role="row"
                  tabIndex={rowTappable ? 0 : undefined}
                  onClick={
                    rowTappable
                      ? (e) => {
                          if (e.target.closest('button, a')) return
                          openPlayerDetail(el)
                        }
                      : undefined
                  }
                  onKeyDown={
                    rowTappable
                      ? (e) => {
                          if (e.target !== e.currentTarget) return
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openPlayerDetail(el)
                          }
                        }
                      : undefined
                  }
                >
                  {visibleCols.map((col, colIndex) => {
                    const groupStart = wireColumnIsGroupStart(col.id, visibleCols, colIndex)
                    if (col.id === 'player') {
                      const owner = ownerByElementId.get(elId)
                      return (
                        <span
                          key={col.id}
                          className={wireCellClass(
                            col.id,
                            activeSortColId,
                            'players-table__cell--player',
                            groupStart,
                          )}
                          role="cell"
                        >
                          <span className="players-table__kit">
                            <PlayerKit
                              badgeUrl={row.badgeUrl}
                              teamShort={row.teamShort}
                            />
                          </span>
                          <span className="players-table__player-text">
                            <span className="players-table__name-row">
                              <ClickablePlayerName
                                element={el.id}
                                displayName={displayName}
                                web_name={el.web_name}
                                teamShort={row.teamShort}
                                className="players-table__name"
                              >
                                {displayName}
                              </ClickablePlayerName>
                              <PlayerInlineIndicators
                                el={el}
                                owner={owner}
                                rostersHealthy={rostersHealthy}
                                logoMap={logoMap}
                                kitIndexByEntry={kitIndexByEntry}
                              />
                            </span>
                          </span>
                        </span>
                      )
                    }
                    // Desktop fixed POS column — chip render. Portrait keeps the
                    // existing 'pos' stat-column code path (falls through below).
                    if (col.id === 'pos' && !portrait) {
                      return (
                        <span
                          key={col.id}
                          className={wireCellClass(
                            col.id,
                            activeSortColId,
                            'players-table__cell--pos',
                            groupStart,
                          )}
                          role="cell"
                        >
                          {posLabel ? <PositionChip pos={posLabel} /> : null}
                        </span>
                      )
                    }
                    if (col.id === 'pts') {
                      const pts = Number.isFinite(Number(el.total_points)) ? el.total_points : '—'
                      return (
                        <span
                          key={col.id}
                          className={wireCellClass(
                            col.id,
                            activeSortColId,
                            'players-table__cell--pts',
                            groupStart,
                          )}
                          role="cell"
                        >
                          {pts}
                        </span>
                      )
                    }
                    if (WIRE_STAT_CATALOG[col.id]) {
                      const statDef = WIRE_STAT_CATALOG[col.id]
                      const value = formatWireStatValue(col.id, el, summary, summaryLoading, {
                        portraitPosSingleLetter:
                          portrait && col.id === 'pos',
                      })
                      const tone = wireStatToneClass(value)
                      return (
                        <span
                          key={col.id}
                          className={wireCellClass(
                            col.id,
                            activeSortColId,
                            `players-table__cell--stat${tone ? ` ${tone}` : ''}`,
                            groupStart,
                          )}
                          role="cell"
                          title={statDef.title}
                        >
                          {value}
                        </span>
                      )
                    }
                    if (col.id === 'next3') {
                      return (
                        <span
                          key={col.id}
                          className={wireCellClass(
                            col.id,
                            activeSortColId,
                            'players-table__cell--next3',
                            groupStart,
                          )}
                          role="cell"
                        >
                          <NextFixtureBadges
                            fixtures={nextFixtures}
                            nextOnly={portrait}
                          />
                        </span>
                      )
                    }
                    return null
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {!bootstrap ? (
        <p className="muted players-bench-loading">Loading waiver pool…</p>
      ) : bootstrap && outfieldList.length === 0 ? (
        <p className="players-bench-empty">No players match these filters.</p>
      ) : null}
    </section>
  )
}
