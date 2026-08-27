import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CompactSelectPill } from './CompactSelectPill.jsx'
import { PlayerKit } from './PlayerKit.jsx'
import { TeamAvatar } from './TeamAvatar.jsx'
import { TradeRadar } from './TradeRadar.jsx'
import { fplElementWebName } from './fplElementNames.js'
import { fplShirtImageUrl } from './fplShirtUrl.js'
import {
  fetchBootstrapDraft,
  fetchLeagueJsonFile,
} from './playersBenchShared.js'
import {
  POS_LABEL,
  buildOwnerByElementFromElementStatus,
  wireStatsMapFromPayload,
} from './playersWireList.js'
import { archivedSeasonLabel } from './seasonArchive.js'
import {
  DEFAULT_TRADE_STAT_IDS,
  TRADE_MAX_PLAYERS_PER_SIDE,
  TRADE_MAX_STATS,
  TRADE_MIN_STATS,
  TRADE_STAT_CATALOG,
  TRADE_STAT_GROUPS,
  aggregateSideStats,
  buildRadarAxes,
  formatTradeStat,
  indexElementsByCode,
  joinPriorByCode,
  normalizeTradeStatSelection,
  seasonShortLabel,
  toggleTradeStat,
} from './tradeToolStats.js'
import { usePillMenuDismiss } from './usePillMenuDismiss.js'
import './TradeTool.css'

const POSITION_ORDER = /** @type {(1|2|3|4)[]} */ ([1, 2, 3, 4])

function badgeUrlFor(team) {
  return team?.code != null
    ? `https://resources.premierleague.com/premierleague/badges/50/t${team.code}.png`
    : null
}

async function fetchOptionalUrl(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Current-season bootstrap + ownership, plus optional prior-season bootstrap
 * joined later via Opta `code`.
 */
function useTradeToolData({
  enabled,
  leagueEntries,
  leagueDataRevision,
  priorSeasonLabel,
}) {
  const [state, setState] = useState({
    status: 'idle',
    error: null,
    squadsByEntry: new Map(),
    hasPrior: false,
  })
  const reqRef = useRef(0)

  useEffect(() => {
    if (!enabled) return undefined
    const reqId = (reqRef.current += 1)
    setState((s) => ({ ...s, status: 'loading', error: null }))

    ;(async () => {
      try {
        const cacheKey = String(leagueDataRevision ?? '').trim()
        const viewingPrior =
          priorSeasonLabel && archivedSeasonLabel() === priorSeasonLabel
        const priorBase =
          priorSeasonLabel && !viewingPrior
            ? `${import.meta.env.BASE_URL}league-data/seasons/${priorSeasonLabel}`
            : null
        const priorQs = cacheKey ? `?v=${encodeURIComponent(cacheKey)}` : ''

        const [boot, statusPayload, wireStats, priorBoot, priorWire] =
          await Promise.all([
            fetchBootstrapDraft(cacheKey),
            fetchLeagueJsonFile('element_status.json', cacheKey),
            fetchLeagueJsonFile('player-wire-stats.json', cacheKey).catch(
              () => null,
            ),
            priorBase
              ? fetchOptionalUrl(`${priorBase}/bootstrap_draft.json${priorQs}`)
              : Promise.resolve(null),
            priorBase
              ? fetchOptionalUrl(`${priorBase}/player-wire-stats.json${priorQs}`)
              : Promise.resolve(null),
          ])
        if (reqRef.current !== reqId) return

        const elemsById = new Map()
        for (const el of boot?.elements || []) {
          elemsById.set(Number(el.id), el)
        }
        const teamById = new Map()
        for (const t of boot?.teams || []) {
          teamById.set(Number(t.id), t)
        }
        const priorByCode = indexElementsByCode(priorBoot?.elements || [])
        const currentSummary = wireStatsMapFromPayload(wireStats)
        const priorSummaryById = wireStatsMapFromPayload(priorWire)

        const teamsForOwner = (leagueEntries || []).map((e) => ({
          id: e.id,
          fplEntryId: e.entry_id,
          teamName: e.entry_name,
        }))
        const ownerByElement = buildOwnerByElementFromElementStatus(
          statusPayload,
          teamsForOwner,
        )

        const byEntry = new Map()
        for (const e of leagueEntries || []) {
          byEntry.set(Number(e.id), [])
        }
        for (const [pid, owner] of ownerByElement) {
          const lid = Number(owner.leagueEntryId)
          if (!byEntry.has(lid)) continue
          const el = elemsById.get(Number(pid))
          if (!el) continue
          const type = /** @type {1|2|3|4} */ (Number(el.element_type))
          if (!POSITION_ORDER.includes(type)) continue
          const plTeam = teamById.get(Number(el.team))
          const priorEl = joinPriorByCode(el, priorByCode)
          const priorSummary =
            priorEl != null
              ? priorSummaryById.get(Number(priorEl.id)) ?? null
              : null
          byEntry.get(lid).push({
            element: Number(pid),
            name: fplElementWebName(el, pid),
            positionType: type,
            seasonPoints: Number(el.total_points) || 0,
            teamShort: plTeam?.short_name != null ? String(plTeam.short_name) : null,
            badgeUrl: badgeUrlFor(plTeam),
            shirtUrl: fplShirtImageUrl(plTeam?.code, el.element_type),
            currentEl: el,
            priorEl,
            currentSummary: currentSummary.get(Number(pid)) ?? null,
            priorSummary,
            hasPrior: Boolean(priorEl),
          })
        }
        for (const list of byEntry.values()) {
          list.sort(
            (a, b) =>
              a.positionType - b.positionType ||
              b.seasonPoints - a.seasonPoints ||
              a.name.localeCompare(b.name),
          )
        }

        setState({
          status: 'ready',
          error: null,
          squadsByEntry: byEntry,
          hasPrior: priorByCode.size > 0,
        })
      } catch (err) {
        if (reqRef.current !== reqId) return
        setState({
          status: 'error',
          error: err?.message || String(err),
          squadsByEntry: new Map(),
          hasPrior: false,
        })
      }
    })()

    return undefined
  }, [enabled, leagueEntries, leagueDataRevision, priorSeasonLabel])

  return state
}

function TradeStatsPill({ selectedIds, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selection = normalizeTradeStatSelection(selectedIds)
  const dismiss = useCallback(() => setOpen(false), [])
  usePillMenuDismiss(rootRef, open, dismiss)

  return (
    <div className="trade-tool__stats-pill" ref={rootRef}>
      <button
        type="button"
        className={
          'cpsp__btn trade-tool__stats-btn' + (open ? ' cpsp__btn--open' : '')
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Radar stats, ${selection.length} of ${TRADE_MAX_STATS} selected`}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden>Stats</span>
        <span className="trade-tool__stats-count">
          {selection.length}/{TRADE_MAX_STATS}
        </span>
      </button>
      {open ? (
        <div className="trade-tool__stats-panel" role="dialog" aria-label="Radar stats">
          <div className="trade-tool__stats-head">
            <span>Radar axes</span>
            <span className="muted">
              {selection.length} of {TRADE_MAX_STATS} · min {TRADE_MIN_STATS}
            </span>
          </div>
          {TRADE_STAT_GROUPS.map((group) => (
            <section key={group.id} className="trade-tool__stats-group">
              <h4>{group.label}</h4>
              <div className="trade-tool__stats-grid">
                {Object.values(TRADE_STAT_CATALOG)
                  .filter((s) => s.group === group.id)
                  .map((stat) => {
                    const checked = selection.includes(stat.id)
                    const blocked =
                      (!checked && selection.length >= TRADE_MAX_STATS) ||
                      (checked && selection.length <= TRADE_MIN_STATS)
                    return (
                      <label
                        key={stat.id}
                        className={
                          'trade-tool__stats-opt' +
                          (checked ? ' is-checked' : '') +
                          (blocked && !checked ? ' is-disabled' : '')
                        }
                        title={stat.title}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={blocked && !checked}
                          onChange={() => onChange(toggleTradeStat(selection, stat.id))}
                        />
                        {stat.label}
                        <span className="trade-tool__stats-opt-title">{stat.title}</span>
                      </label>
                    )
                  })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function PickedChip({ player, side, onRemove }) {
  return (
    <span className={`trade-tool__chip trade-tool__chip--${side}`}>
      <PlayerKit badgeUrl={player.badgeUrl} teamShort={player.teamShort} />
      <span className="trade-tool__chip-name">{player.name}</span>
      <span className="trade-tool__chip-pos">{POS_LABEL[player.positionType]}</span>
      <button
        type="button"
        className="trade-tool__chip-x"
        aria-label={`Remove ${player.name}`}
        onClick={() => onRemove(player.element)}
      >
        ×
      </button>
    </span>
  )
}

function SquadRow({ player, selected, side, onToggle, missingPrior, seasonMode }) {
  return (
    <button
      type="button"
      className={
        'trade-tool__row' +
        (selected ? ` is-selected is-selected--${side}` : '')
      }
      aria-pressed={selected}
      onClick={() => onToggle(player.element)}
    >
      <PlayerKit
        shirtUrl={player.shirtUrl}
        badgeUrl={player.badgeUrl}
        teamShort={player.teamShort}
      />
      <span className="trade-tool__row-id">
        <span className="trade-tool__row-name">{player.name}</span>
        <span className="trade-tool__row-meta">
          <span className={`trade-tool__pos trade-tool__pos--${POS_LABEL[player.positionType]}`}>
            {POS_LABEL[player.positionType]}
          </span>
          {player.teamShort ? <span>{player.teamShort}</span> : null}
          {missingPrior && seasonMode !== 'current' ? (
            <span className="trade-tool__no-prior">no 25/26</span>
          ) : null}
        </span>
      </span>
      <span className="trade-tool__row-pts tabular">{player.seasonPoints}</span>
    </button>
  )
}

/**
 * Manager-vs-manager trade builder. Analyzer only — nothing is sent to FPL.
 *
 * @param {{
 *   leagueEntries: object[],
 *   teamLogoMap: Record<string, string>,
 *   kitIndexByEntry: Record<string, number>,
 *   leagueDataRevision?: string,
 *   currentSeasonLabel?: string,
 *   priorSeasonLabel?: string | null,
 * }} props
 */
export function TradeTool({
  leagueEntries = [],
  teamLogoMap = {},
  kitIndexByEntry = {},
  leagueDataRevision = '',
  currentSeasonLabel = '',
  priorSeasonLabel = null,
}) {
  const { status, error, squadsByEntry, hasPrior } = useTradeToolData({
    enabled: true,
    leagueEntries,
    leagueDataRevision,
    priorSeasonLabel,
  })

  const managers = useMemo(() => {
    return [...(leagueEntries || [])]
      .filter((e) => e?.id != null)
      .sort((a, b) =>
        String(a.entry_name || '').localeCompare(String(b.entry_name || '')),
      )
  }, [leagueEntries])

  const managerOptions = useMemo(
    () =>
      managers.map((m) => ({
        value: String(m.id),
        label: m.entry_name || `Team ${m.id}`,
      })),
    [managers],
  )

  const [entryA, setEntryA] = useState(null)
  const [entryB, setEntryB] = useState(null)
  const [idsA, setIdsA] = useState(/** @type {number[]} */ ([]))
  const [idsB, setIdsB] = useState(/** @type {number[]} */ ([]))
  const [seasonMode, setSeasonMode] = useState(
    /** @type {'current' | 'prior' | 'combined'} */ ('current'),
  )
  const [statIds, setStatIds] = useState(() => [...DEFAULT_TRADE_STAT_IDS])

  useEffect(() => {
    if (entryA != null || entryB != null || managers.length < 2) return
    setEntryA(Number(managers[0].id))
    setEntryB(Number(managers[1].id))
  }, [managers, entryA, entryB])

  const pickManager = (side, raw) => {
    const next = Number(raw)
    if (!Number.isFinite(next)) return
    if (side === 'a') {
      setEntryA(next)
      setIdsA([])
      if (next === entryB) {
        setEntryB(null)
        setIdsB([])
      }
    } else {
      setEntryB(next)
      setIdsB([])
      if (next === entryA) {
        setEntryA(null)
        setIdsA([])
      }
    }
  }

  const squadA = squadsByEntry.get(Number(entryA)) || []
  const squadB = squadsByEntry.get(Number(entryB)) || []
  const pickedA = squadA.filter((p) => idsA.includes(p.element))
  const pickedB = squadB.filter((p) => idsB.includes(p.element))

  const togglePlayer = (side, elementId) => {
    const id = Number(elementId)
    if (side === 'a') {
      setIdsB((prev) => prev.filter((x) => x !== id))
      setIdsA((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id)
        if (prev.length >= TRADE_MAX_PLAYERS_PER_SIDE) return prev
        return [...prev, id]
      })
    } else {
      setIdsA((prev) => prev.filter((x) => x !== id))
      setIdsB((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id)
        if (prev.length >= TRADE_MAX_PLAYERS_PER_SIDE) return prev
        return [...prev, id]
      })
    }
  }

  const sideAStats = useMemo(
    () => aggregateSideStats(pickedA, statIds, seasonMode),
    [pickedA, statIds, seasonMode],
  )
  const sideBStats = useMemo(
    () => aggregateSideStats(pickedB, statIds, seasonMode),
    [pickedB, statIds, seasonMode],
  )
  const axes = useMemo(
    () => buildRadarAxes(statIds, sideAStats, sideBStats),
    [statIds, sideAStats, sideBStats],
  )

  const nameA =
    managers.find((m) => Number(m.id) === Number(entryA))?.entry_name || 'Side A'
  const nameB =
    managers.find((m) => Number(m.id) === Number(entryB))?.entry_name || 'Side B'
  const currentShort = seasonShortLabel(currentSeasonLabel) || 'This season'
  const priorShort = seasonShortLabel(priorSeasonLabel) || 'Last season'
  const showRadar = pickedA.length > 0 && pickedB.length > 0

  const renderSquad = (side) => {
    const entryId = side === 'a' ? entryA : entryB
    const squad = side === 'a' ? squadA : squadB
    const selected = side === 'a' ? idsA : idsB
    const groups = POSITION_ORDER.map((type) => ({
      type,
      label: POS_LABEL[type],
      players: squad.filter((p) => p.positionType === type),
    })).filter((g) => g.players.length)

    return (
      <div className={`trade-tool__side trade-tool__side--${side}`}>
        <div className="trade-tool__side-head">
          <TeamAvatar
            entryId={entryId}
            name={side === 'a' ? nameA : nameB}
            size="sm"
            logoMap={teamLogoMap}
            kitIndexByEntry={kitIndexByEntry}
          />
          <CompactSelectPill
            ariaLabel={side === 'a' ? 'Give manager' : 'Get manager'}
            value={entryId != null ? String(entryId) : ''}
            onChange={(v) => pickManager(side, v)}
            options={managerOptions}
            placeholder="Pick a manager"
            isActive={entryId != null}
          />
        </div>
        {status === 'loading' ? (
          <p className="muted muted--tight">Loading squad…</p>
        ) : !groups.length ? (
          <p className="muted muted--tight">No squad on record yet.</p>
        ) : (
          <div className="trade-tool__roster">
            {groups.map((g) => (
              <div key={g.type} className="trade-tool__pos-block">
                <div className="trade-tool__pos-h">{g.label}</div>
                {g.players.map((p) => (
                  <SquadRow
                    key={p.element}
                    player={p}
                    selected={selected.includes(p.element)}
                    side={side}
                    onToggle={(id) => togglePlayer(side, id)}
                    missingPrior={!p.hasPrior}
                    seasonMode={seasonMode}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="dashboard-stack">
      <section className="tile tile--compact" aria-labelledby="trade-tool-heading">
        <div className="tile-head-row tile-head-row--tight">
          <h2 id="trade-tool-heading" className="tile-title tile-title--sm">
            Trade Tool
          </h2>
        </div>
        <p className="tile-hint muted tile-hint--tight">
          Build a proposed swap and compare season stats. Nothing is sent to FPL
          Draft — agree the deal, then offer it in the official app.
        </p>

        <div className="trade-tool__controls">
          {hasPrior ? (
            <div className="trade-tool__season" role="group" aria-label="Season">
              <button
                type="button"
                className={
                  'trade-tool__season-btn' +
                  (seasonMode === 'current' ? ' is-active' : '')
                }
                onClick={() => setSeasonMode('current')}
              >
                {currentShort}
              </button>
              <button
                type="button"
                className={
                  'trade-tool__season-btn' +
                  (seasonMode === 'prior' ? ' is-active' : '')
                }
                onClick={() => setSeasonMode('prior')}
              >
                {priorShort}
              </button>
              <button
                type="button"
                className={
                  'trade-tool__season-btn' +
                  (seasonMode === 'combined' ? ' is-active' : '')
                }
                onClick={() => setSeasonMode('combined')}
              >
                Both
              </button>
            </div>
          ) : null}
          <TradeStatsPill selectedIds={statIds} onChange={setStatIds} />
        </div>

        {status === 'error' ? (
          <p className="muted muted--tight" role="alert">
            Couldn’t load squads. {error}
          </p>
        ) : (
          <div className="trade-tool">
            <div className="trade-tool__board">
              {renderSquad('a')}
              <div className="trade-tool__swap" aria-hidden>
                ⇄
              </div>
              {renderSquad('b')}
            </div>

            <div className="trade-tool__picked" aria-label="Players in the trade">
              <div className="trade-tool__picked-col">
                {pickedA.length ? (
                  pickedA.map((p) => (
                    <PickedChip
                      key={p.element}
                      player={p}
                      side="a"
                      onRemove={(id) => togglePlayer('a', id)}
                    />
                  ))
                ) : (
                  <span className="muted">Tap players to give</span>
                )}
              </div>
              <span className="trade-tool__picked-swap" aria-hidden>
                ⇄
              </span>
              <div className="trade-tool__picked-col trade-tool__picked-col--b">
                {pickedB.length ? (
                  pickedB.map((p) => (
                    <PickedChip
                      key={p.element}
                      player={p}
                      side="b"
                      onRemove={(id) => togglePlayer('b', id)}
                    />
                  ))
                ) : (
                  <span className="muted">Tap players to get</span>
                )}
              </div>
            </div>

            {showRadar ? (
              <>
                <TradeRadar axes={axes} labelA={nameA} labelB={nameB} />
                <div className="trade-tool__table" role="table" aria-label="Trade totals">
                  <div className="trade-tool__th" role="row">
                    <span>Stat</span>
                    <span className="trade-tool__th-a">{nameA}</span>
                    <span className="trade-tool__th-b">{nameB}</span>
                    <span>Δ</span>
                  </div>
                  {axes.map((ax) => {
                    const winA = ax.lowerIsBetter ? ax.a < ax.b : ax.a > ax.b
                    const winB = ax.lowerIsBetter ? ax.b < ax.a : ax.b > ax.a
                    const sign = ax.delta > 0 ? '+' : ax.delta < 0 ? '−' : '±'
                    return (
                      <div className="trade-tool__tr" role="row" key={ax.id}>
                        <span className="trade-tool__tk" title={ax.title}>
                          {ax.label}
                        </span>
                        <span className={'trade-tool__tv' + (winA ? ' is-win' : '')}>
                          {formatTradeStat(ax.id, ax.a)}
                        </span>
                        <span className={'trade-tool__tv' + (winB ? ' is-win' : '')}>
                          {formatTradeStat(ax.id, ax.b)}
                        </span>
                        <span
                          className={
                            'trade-tool__td' +
                            (ax.delta > 0
                              ? ' is-pos'
                              : ax.delta < 0
                                ? ' is-neg'
                                : '')
                          }
                        >
                          {sign}
                          {formatTradeStat(ax.id, Math.abs(ax.delta))}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="muted muted--tight trade-tool__empty">
                Pick at least one player on each side to compare.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
