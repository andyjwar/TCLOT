import { useEffect, useRef, useState } from 'react'
import {
  fetchBootstrapDraft,
  fetchLeagueJsonFile,
} from './playersBenchShared.js'
import {
  buildOwnerByElementFromElementStatus,
  POS_LABEL,
} from './playersWireList.js'
import {
  buildJoinedGameweekMap,
  draftCurrentGameweek,
} from './draftBoardRosterStatus.js'
import { fplElementWebName } from './fplElementNames.js'
import { draftResourceUrl } from './fplDraftUrl.js'
import { fetchFplJsonCached } from './fplFetchCache.js'
import { liveStatsByElementId } from './useLiveScores.js'

/**
 * @typedef {object} ManagerSquadPlayer
 * @property {number} element
 * @property {string} name
 * @property {1|2|3|4} positionType
 * @property {number|null} lastGwPoints season-to-date last finished GW score
 * @property {number} seasonPoints
 * @property {number|null} joinedGw
 * @property {number|null} gwsOwned
 * @property {'draft'|'transfer'|'trade'|null} joinedKind
 * @property {string|null} teamShort PL club short name
 * @property {string|null} badgeUrl official PL club crest URL
 */

/**
 * @typedef {object} ManagerSquadGroup
 * @property {1|2|3|4} type
 * @property {string} label
 * @property {ManagerSquadPlayer[]} players
 */

/** Order of position sections in the squad view. */
const POSITION_ORDER = /** @type {(1|2|3|4)[]} */ ([1, 2, 3, 4])

/**
 * Resolve the last finished gameweek from a draft bootstrap `events` block.
 * @param {object} boot
 * @returns {number|null}
 */
function lastFinishedGameweek(boot) {
  const data = boot?.events?.data
  if (Array.isArray(data)) {
    const finished = data.filter((x) => x?.finished)
    if (finished.length) return Number(finished[finished.length - 1].id)
  }
  const cur = draftCurrentGameweek(boot)
  return Number.isFinite(cur) ? Math.max(0, cur - 0) : null
}

/**
 * Load a manager's *current* squad (from league ownership), grouped by
 * position, enriched with last-GW score, total season points and how long each
 * player has been on the squad.
 *
 * Ownership + season points + tenure all come from local league-data files so
 * the view always renders something; the last-GW score is a best-effort fetch
 * from the FPL draft live endpoint and degrades gracefully to `null`.
 *
 * @param {object} params
 * @param {number|null} params.leagueEntryId
 * @param {number|null} params.fplEntryId
 * @param {boolean} params.enabled fetch only when the tab is actually shown
 * @param {string} [params.leagueDataRevision]
 * @returns {{
 *   status: 'idle' | 'loading' | 'ready' | 'error',
 *   groups: ManagerSquadGroup[],
 *   gameweek: number | null,
 *   currentGameweek: number | null,
 *   totalSeasonPoints: number,
 *   error: string | null,
 * }}
 */
export function useManagerSquad({
  leagueEntryId,
  fplEntryId,
  enabled,
  leagueDataRevision = '',
}) {
  const [state, setState] = useState({
    status: 'idle',
    groups: [],
    gameweek: null,
    currentGameweek: null,
    totalSeasonPoints: 0,
    error: null,
  })
  const reqRef = useRef(0)

  useEffect(() => {
    if (!enabled || leagueEntryId == null) return undefined
    const reqId = (reqRef.current += 1)
    setState((s) => ({ ...s, status: 'loading', error: null }))

    ;(async () => {
      try {
        const cacheKey = String(leagueDataRevision ?? '').trim()
        const [boot, statusPayload, transactions, trades, draftPicks] =
          await Promise.all([
            fetchBootstrapDraft(cacheKey),
            fetchLeagueJsonFile('element_status.json', cacheKey),
            fetchLeagueJsonFile('transactions.json', cacheKey).catch(() => null),
            fetchLeagueJsonFile('trades.json', cacheKey).catch(() => null),
            fetchLeagueJsonFile('draft_picks.json', cacheKey).catch(() => null),
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

        const currentGw = draftCurrentGameweek(boot)
        const lastGw = lastFinishedGameweek(boot)

        // Ownership → the set of elements this league entry currently holds.
        const teamsForOwner =
          fplEntryId != null
            ? [{ id: leagueEntryId, fplEntryId, teamName: '' }]
            : []
        const ownerByElementId = buildOwnerByElementFromElementStatus(
          statusPayload,
          teamsForOwner,
        )
        const ownedIds = []
        for (const [pid, owner] of ownerByElementId) {
          if (Number(owner.leagueEntryId) === Number(leagueEntryId)) {
            ownedIds.push(Number(pid))
          }
        }

        const joinedMap = buildJoinedGameweekMap(transactions, trades, draftPicks)

        // Best-effort last-GW per-element scoring (draft live endpoint).
        let liveByEl = {}
        if (lastGw && lastGw >= 1) {
          try {
            const liveJson = await fetchFplJsonCached(
              draftResourceUrl(`event/${lastGw}/live`),
              { label: 'draft event/live (manager squad)' },
            )
            if (reqRef.current !== reqId) return
            liveByEl = liveStatsByElementId(liveJson)
          } catch {
            liveByEl = {}
          }
        }

        const byType = new Map(POSITION_ORDER.map((t) => [t, []]))
        let totalSeasonPoints = 0
        for (const pid of ownedIds) {
          const el = elemsById.get(pid)
          if (!el) continue
          const type = /** @type {1|2|3|4} */ (Number(el.element_type))
          if (!byType.has(type)) continue
          const seasonPoints = Number(el.total_points) || 0
          totalSeasonPoints += seasonPoints
          const joined = joinedMap.get(`${fplEntryId}:${pid}`) ?? null
          const joinedGw = joined?.gw ?? null
          const gwsOwned =
            joinedGw != null && Number.isFinite(currentGw)
              ? Math.max(1, currentGw - joinedGw + 1)
              : null
          const liveRow = liveByEl[pid]
          const lastGwPoints =
            liveRow && typeof liveRow.total_points === 'number'
              ? liveRow.total_points
              : null
          const plTeam = teamById.get(Number(el.team))
          const teamShort =
            plTeam?.short_name != null ? String(plTeam.short_name) : null
          const badgeUrl =
            plTeam?.code != null
              ? `https://resources.premierleague.com/premierleague/badges/50/t${plTeam.code}.png`
              : null
          byType.get(type).push({
            element: pid,
            name: fplElementWebName(el, pid),
            positionType: type,
            lastGwPoints,
            seasonPoints,
            joinedGw,
            gwsOwned,
            joinedKind: joined?.kind ?? null,
            teamShort,
            badgeUrl,
          })
        }

        const groups = POSITION_ORDER.map((type) => {
          const players = byType.get(type) || []
          players.sort(
            (a, b) =>
              b.seasonPoints - a.seasonPoints ||
              a.name.localeCompare(b.name),
          )
          return { type, label: POS_LABEL[type], players }
        }).filter((g) => g.players.length > 0)

        setState({
          status: 'ready',
          groups,
          gameweek: lastGw,
          currentGameweek: Number.isFinite(currentGw) ? currentGw : null,
          totalSeasonPoints,
          error: null,
        })
      } catch (err) {
        if (reqRef.current !== reqId) return
        setState({
          status: 'error',
          groups: [],
          gameweek: null,
          currentGameweek: null,
          totalSeasonPoints: 0,
          error: err?.message || String(err),
        })
      }
    })()

    return undefined
  }, [enabled, leagueEntryId, fplEntryId, leagueDataRevision])

  return state
}
