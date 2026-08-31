import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TeamAvatar } from './TeamAvatar'
import { PlayerKit } from './PlayerKit.jsx'
import { usePlayerDetailOverlayOptional } from './PlayerDetailOverlay.jsx'
import { useTeamDetailOverlayOptional } from './TeamDetailOverlay.jsx'
import {
  fetchBootstrapDraft,
  fetchLeagueJsonFile,
} from './playersBenchShared.js'
import {
  buildOwnerByElementFromElementStatus,
  POS_LABEL,
  PORTRAIT_POS_LABEL_SINGLE,
} from './playersWireList.js'
import { fplElementWebName, fplElementFullName } from './fplElementNames.js'
import './GlobalSearch.css'

const MAX_MANAGERS = 6
const MAX_PLAYERS = 24

/** Dispatched by the floating mobile Search button (and anything else
 * that wants the palette without rendering a second trigger). */
export const OPEN_GLOBAL_SEARCH_EVENT = 'tclot:open-search'

/** Open the mounted GlobalSearch palette from outside the header trigger. */
export function requestOpenGlobalSearch() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_GLOBAL_SEARCH_EVENT))
}

/** Small magnifying-glass glyph (inherits `currentColor`). */
function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle
        cx="11"
        cy="11"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="16.5"
        y1="16.5"
        x2="21"
        y2="21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Header magnifying-glass search. Opens a command-palette-style overlay that
 * searches every player and manager in the league; picking a result opens the
 * matching player or team detail side card. Player rows show who owns them with
 * a small fantasy crest badge.
 *
 * Player/ownership data is fetched lazily the first time the palette is opened.
 *
 * @param {object} props
 * @param {object[]} props.leagueEntries
 * @param {{ id: number, fplEntryId: number|null, teamName?: string, manager?: string, rank?: number }[]} props.teamsForFormSelect
 * @param {Record<string, string>} [props.teamLogoMap]
 * @param {Record<number, number>} [props.kitIndexByEntry]
 * @param {string} [props.leagueDataRevision]
 */
export function GlobalSearch({
  leagueEntries = [],
  teamsForFormSelect = [],
  teamLogoMap = {},
  kitIndexByEntry = {},
  leagueDataRevision = '',
}) {
  const playerOverlay = usePlayerDetailOverlayOptional()
  const teamOverlay = useTeamDetailOverlayOptional()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [bootstrap, setBootstrap] = useState(null)
  const [ownerByElementId, setOwnerByElementId] = useState(() => new Map())
  const [loadState, setLoadState] = useState('idle') // idle | loading | ready | error
  const inputRef = useRef(null)
  const loadedRef = useRef(false)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  // Lazy data load on first open.
  useEffect(() => {
    if (!open || loadedRef.current) return undefined
    loadedRef.current = true
    let cancel = false
    setLoadState('loading')
    ;(async () => {
      try {
        const cacheKey = String(leagueDataRevision ?? '').trim()
        const [boot, statusPayload] = await Promise.all([
          fetchBootstrapDraft(cacheKey),
          fetchLeagueJsonFile('element_status.json', cacheKey),
        ])
        if (cancel) return
        setBootstrap(boot)
        setOwnerByElementId(
          buildOwnerByElementFromElementStatus(statusPayload, teamsForFormSelect),
        )
        setLoadState('ready')
      } catch {
        if (!cancel) setLoadState('error')
      }
    })()
    return () => {
      cancel = true
    }
  }, [open, leagueDataRevision, teamsForFormSelect])

  // Global Cmd/Ctrl+K to open; Escape closes when open.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen(true)
        return
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, close])

  // Floating mobile Search button (and any other caller) opens the same
  // palette without mounting a second trigger.
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_GLOBAL_SEARCH_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_GLOBAL_SEARCH_EVENT, onOpen)
  }, [])

  // Focus the input when the palette opens.
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
    return undefined
  }, [open])

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const teamById = useMemo(() => {
    const m = new Map()
    for (const t of bootstrap?.teams || []) m.set(Number(t.id), t)
    return m
  }, [bootstrap])

  const playerIndex = useMemo(() => {
    const out = []
    for (const el of bootstrap?.elements || []) {
      const id = Number(el.id)
      const club = teamById.get(Number(el.team))
      const owner = ownerByElementId.get(id) ?? null
      const displayName = fplElementWebName(el, id)
      const badgeUrl =
        club?.code != null
          ? `https://resources.premierleague.com/premierleague/badges/50/t${club.code}.png`
          : null
      out.push({
        id,
        displayName,
        positionLabel: POS_LABEL[Number(el.element_type)] ?? '',
        positionLetter: PORTRAIT_POS_LABEL_SINGLE[Number(el.element_type)] ?? '?',
        clubShort: club?.short_name ?? '',
        badgeUrl,
        owner,
        haystack: normalize(
          `${displayName} ${fplElementFullName(el, id)} ${club?.short_name ?? ''} ${club?.name ?? ''}`,
        ),
      })
    }
    return out
  }, [bootstrap, teamById, ownerByElementId])

  const managerIndex = useMemo(() => {
    const rankById = new Map()
    for (const t of teamsForFormSelect || []) {
      if (t?.id != null) rankById.set(Number(t.id), t.rank ?? null)
    }
    return (leagueEntries || [])
      .filter((e) => e?.id != null)
      .map((e) => {
        const teamName = e.entry_name ?? '—'
        const manager = `${e.player_first_name ?? ''} ${e.player_last_name ?? ''}`.trim()
        return {
          leagueEntryId: Number(e.id),
          teamName,
          manager,
          rank: rankById.get(Number(e.id)) ?? null,
          haystack: normalize(`${teamName} ${manager}`),
        }
      })
  }, [leagueEntries, teamsForFormSelect])

  const results = useMemo(() => {
    const q = normalize(query)
    if (!q) return { managers: [], players: [] }
    const managers = managerIndex
      .filter((m) => m.haystack.includes(q))
      .slice(0, MAX_MANAGERS)
    const players = playerIndex
      .filter((p) => p.haystack.includes(q))
      .sort((a, b) => {
        // Prefer name-start matches, then owned players, then alpha.
        const aStart = a.displayName.toLowerCase().startsWith(q) ? 0 : 1
        const bStart = b.displayName.toLowerCase().startsWith(q) ? 0 : 1
        if (aStart !== bStart) return aStart - bStart
        return a.displayName.localeCompare(b.displayName)
      })
      .slice(0, MAX_PLAYERS)
    return { managers, players }
  }, [query, managerIndex, playerIndex])

  // Flatten for keyboard navigation.
  const flatResults = useMemo(
    () => [
      ...results.managers.map((m) => ({ kind: 'manager', ref: m })),
      ...results.players.map((p) => ({ kind: 'player', ref: p })),
    ],
    [results],
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const selectResult = useCallback(
    (item) => {
      if (!item) return
      if (item.kind === 'manager') {
        close()
        teamOverlay?.openTeamDetail(item.ref.leagueEntryId)
      } else {
        close()
        playerOverlay?.openPlayerDetail({
          element: item.ref.id,
          leagueEntryId: item.ref.owner?.leagueEntryId ?? null,
        })
      }
    },
    [close, teamOverlay, playerOverlay],
  )

  const onInputKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(flatResults.length - 1, i + 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(0, i - 1))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        selectResult(flatResults[activeIndex])
      }
    },
    [close, flatResults, activeIndex, selectResult],
  )

  const hasQuery = normalize(query).length > 0

  const palette =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="gsearch"
            role="dialog"
            aria-modal="true"
            aria-label="Search players and managers"
          >
            <button
              type="button"
              className="gsearch__scrim"
              aria-label="Close search"
              onClick={close}
            />
            <div className="gsearch__panel" role="document">
              <div className="gsearch__inputbar">
                <span className="gsearch__inputicon" aria-hidden="true">
                  <SearchGlyph />
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  className="gsearch__input"
                  placeholder="Search players & managers…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <kbd className="gsearch__esc">esc</kbd>
              </div>

              <div className="gsearch__results">
                {!hasQuery ? (
                  <p className="gsearch__hint">
                    {loadState === 'loading'
                      ? 'Loading league…'
                      : 'Type a player or manager name to jump to their card.'}
                  </p>
                ) : loadState === 'error' ? (
                  <p className="gsearch__hint">Couldn’t load search data.</p>
                ) : flatResults.length === 0 ? (
                  <p className="gsearch__hint">
                    No matches for “{query.trim()}”.
                  </p>
                ) : (
                  <>
                    {results.managers.length > 0 && (
                      <div className="gsearch__group">
                        <div className="gsearch__grouphead">Managers</div>
                        {results.managers.map((m, i) => {
                          const idx = i
                          return (
                            <button
                              type="button"
                              key={`m-${m.leagueEntryId}`}
                              className={
                                'gsearch__row' +
                                (activeIndex === idx ? ' is-active' : '')
                              }
                              onMouseEnter={() => setActiveIndex(idx)}
                              onClick={() =>
                                selectResult({ kind: 'manager', ref: m })
                              }
                            >
                              <span className="gsearch__crest">
                                <TeamAvatar
                                  entryId={m.leagueEntryId}
                                  name={m.teamName}
                                  size="sm"
                                  logoMap={teamLogoMap}
                                  kitIndexByEntry={kitIndexByEntry}
                                  badgeFallback
                                />
                              </span>
                              <span className="gsearch__main">
                                <span className="gsearch__title">
                                  {m.teamName}
                                </span>
                                {m.manager && (
                                  <span className="gsearch__sub">
                                    {m.manager}
                                  </span>
                                )}
                              </span>
                              <span className="gsearch__tag gsearch__tag--mgr">
                                Manager
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {results.players.length > 0 && (
                      <div className="gsearch__group">
                        <div className="gsearch__grouphead">Players</div>
                        {results.players.map((p, i) => {
                          const idx = results.managers.length + i
                          return (
                            <button
                              type="button"
                              key={`p-${p.id}`}
                              className={
                                'gsearch__row gsearch__row--player' +
                                (activeIndex === idx ? ' is-active' : '')
                              }
                              onMouseEnter={() => setActiveIndex(idx)}
                              onClick={() =>
                                selectResult({ kind: 'player', ref: p })
                              }
                            >
                              <span className="gsearch__pident">
                                <span className="gsearch__kit">
                                  <PlayerKit
                                    badgeUrl={p.badgeUrl}
                                    teamShort={p.clubShort}
                                  />
                                </span>
                                <span className="gsearch__pname">
                                  {p.displayName}
                                </span>
                                <span
                                  className="gsearch__poschip"
                                  aria-label={`Position ${p.positionLabel}`}
                                  title={p.positionLabel}
                                >
                                  {p.positionLetter}
                                </span>
                              </span>
                              {p.owner ? (
                                <span className="gsearch__owner">
                                  <span className="gsearch__owner-badge">
                                    <TeamAvatar
                                      entryId={p.owner.leagueEntryId}
                                      name={p.owner.teamName}
                                      size="sm"
                                      logoMap={teamLogoMap}
                                      kitIndexByEntry={kitIndexByEntry}
                                      badgeFallback
                                    />
                                  </span>
                                  <span className="gsearch__owner-name">
                                    {p.owner.teamName}
                                  </span>
                                </span>
                              ) : (
                                <span className="gsearch__tag gsearch__tag--fa">
                                  Free agent
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        type="button"
        className="brand-header__search"
        aria-label="Search players and managers"
        title="Search players & managers (⌘K)"
        onClick={() => setOpen(true)}
      >
        <SearchGlyph />
      </button>
      {palette}
    </>
  )
}
