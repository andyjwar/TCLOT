/**
 * Live overlay for the Waivers tab: map FPL Draft `transactions` onto the
 * same row shape as `drops-gw-live.json` so processed claims can appear
 * before the next static ingest/deploy.
 */
import { fplElementWebName } from './fplElementNames.js'
import { fplShirtImageUrl } from './fplShirtUrl.js'
import { WAIVER_FRESH_WINDOW_MS } from './waiverRefreshSchedule.js'

export const POS_BY_TYPE = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' }

/** How often to ask FPL while the selected GW is still missing from static JSON. */
export const LIVE_WAIVER_POLL_FAST_MS = 30_000
/** After the first successful claims land, back off until the static deploy catches up. */
export const LIVE_WAIVER_POLL_SLOW_MS = 120_000

/**
 * Most recent GW whose `waivers_time` has passed and is still inside the
 * 36h post-waiver window. Polling starts at `waivers_time` (not after the
 * ingest grace) so results appear as soon as FPL publishes them.
 *
 * @param {object[] | null | undefined} eventList
 * @param {number} [nowMs]
 * @returns {{ id: number, waiversTime: string, waiversTimeMs: number } | null}
 */
export function liveWaiverPollTarget(eventList, nowMs = Date.now()) {
  if (!Array.isArray(eventList)) return null
  const now = Number(nowMs)
  if (!Number.isFinite(now)) return null

  let best = null
  for (const e of eventList) {
    const raw = e?.waivers_time
    if (typeof raw !== 'string' || !raw) continue
    const wt = Date.parse(raw)
    if (!Number.isFinite(wt)) continue
    if (now < wt || now >= wt + WAIVER_FRESH_WINDOW_MS) continue
    const id = Number(e.id)
    if (!Number.isFinite(id)) continue
    if (!best || wt > best.waiversTimeMs) {
      best = { id, waiversTime: raw, waiversTimeMs: wt }
    }
  }
  return best
}

/**
 * @param {{
 *   archiveView?: boolean,
 *   leagueId?: number | string | null,
 *   targetGw?: number | null,
 *   staticHasTargetGw?: boolean,
 * }} p
 */
export function shouldPollLiveWaivers({
  archiveView = false,
  leagueId,
  targetGw,
  staticHasTargetGw = false,
} = {}) {
  if (archiveView) return false
  const id = Number(leagueId)
  if (!Number.isFinite(id) || id < 1) return false
  const gw = Number(targetGw)
  if (!Number.isFinite(gw) || gw < 1) return false
  if (staticHasTargetGw) return false
  return true
}

export function isSuccessfulSwap(t) {
  if (!t || t.result !== 'a') return false
  if (t.element_out == null) return false
  if (t.kind !== 'w' && t.kind !== 'f') return false
  return Number(t.event) > 0
}

/**
 * @param {object} t draft API transaction
 * @returns {object} drops-gw-live row (points left null until ingest)
 */
export function transactionToWaiverOutRow(t) {
  const kind = t.kind === 'f' ? 'f' : 'w'
  const inId =
    t.element_in != null && t.element_in !== '' ? Number(t.element_in) : null
  return {
    transactionId: t.id,
    entry: t.entry,
    gameweek: Number(t.event),
    element_in: Number.isFinite(inId) ? inId : t.element_in,
    element_out: Number(t.element_out),
    added: t.added ?? null,
    waiverPriority:
      kind === 'w' && t.priority != null && t.priority !== ''
        ? Number(t.priority)
        : null,
    waiverWireIndex:
      kind === 'w' && t.index != null && t.index !== ''
        ? Number(t.index)
        : null,
    droppedPlayerGwPoints: null,
    pickedUpPlayerGwPoints: null,
    transactionKind: kind,
    liveFromFpl: true,
  }
}

export function waiverOutRowsFromTransactions(transactions) {
  if (!Array.isArray(transactions)) return []
  return transactions.filter(isSuccessfulSwap).map(transactionToWaiverOutRow)
}

/**
 * Static ingest rows win (they carry GW points). Live rows fill gaps by
 * `transactionId`.
 *
 * @param {object[] | null | undefined} staticRows
 * @param {object[] | null | undefined} liveRows
 */
export function mergeWaiverOutGwRows(staticRows, liveRows) {
  const out = []
  const seen = new Set()
  for (const r of staticRows || []) {
    const id = Number(r?.transactionId)
    if (Number.isFinite(id)) seen.add(id)
    out.push(r)
  }
  for (const r of liveRows || []) {
    const id = Number(r?.transactionId)
    if (Number.isFinite(id) && seen.has(id)) continue
    out.push(r)
  }
  return out
}

function teamsMapFromEntries(leagueEntries) {
  const teams = {}
  for (const e of leagueEntries || []) {
    if (!e || e.id == null) continue
    teams[e.id] = e
    if (e.entry_id != null && e.entry_id !== e.id) teams[e.entry_id] = e
  }
  return teams
}

function badgeUrlForTeam(plTeam) {
  return plTeam?.code != null
    ? `https://resources.premierleague.com/premierleague/badges/50/t${plTeam.code}.png`
    : null
}

/**
 * Attach manager names + player/club labels used by WeeklyWaivers.
 *
 * @param {object[]} rows
 * @param {{
 *   leagueEntries?: object[],
 *   elements?: object[],
 *   plTeams?: object[],
 * }} ctx
 */
export function decorateWaiverSwapRows(
  rows,
  { leagueEntries = [], elements = [], plTeams = [] } = {},
) {
  const teams = teamsMapFromEntries(leagueEntries)
  const elemById = Object.fromEntries(
    (elements || []).map((e) => [e.id, e]),
  )
  const teamById = Object.fromEntries((plTeams || []).map((t) => [t.id, t]))
  return (rows || []).map((row) => {
    const dropEl = elemById[row.element_out]
    const pickEl = elemById[row.element_in]
    const dropTm = dropEl ? teamById[dropEl.team] : null
    const pickTm = pickEl ? teamById[pickEl.team] : null
    return {
      ...row,
      teamName: teams[row.entry]?.entry_name ?? `Team ${row.entry}`,
      droppedName:
        fplElementWebName(dropEl, row.element_out) ??
        `Player #${row.element_out}`,
      pickedName:
        fplElementWebName(pickEl, row.element_in) ??
        `Player #${row.element_in}`,
      droppedTeamShort: dropTm?.short_name ?? '—',
      pickedTeamShort: pickTm?.short_name ?? '—',
      pickedPos: POS_BY_TYPE[pickEl?.element_type] ?? null,
      droppedPos: POS_BY_TYPE[dropEl?.element_type] ?? null,
      droppedShirtUrl: fplShirtImageUrl(dropTm?.code, dropEl?.element_type),
      droppedBadgeUrl: badgeUrlForTeam(dropTm),
      pickedShirtUrl: fplShirtImageUrl(pickTm?.code, pickEl?.element_type),
      pickedBadgeUrl: badgeUrlForTeam(pickTm),
    }
  })
}

export function rowsCoverGameweek(rows, gw) {
  const g = Number(gw)
  if (!Number.isFinite(g)) return false
  return (rows || []).some((r) => Number(r?.gameweek) === g)
}
