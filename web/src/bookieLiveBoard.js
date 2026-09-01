import { PLAYER_MARKET_KINDS, SEASON_PLACE_KINDS } from './bookieBetLabel.js'

/** Weekly tickets — H2H plus the per-matchup player specials. */
export const WEEKLY_MARKET_KINDS = ['h2h', ...PLAYER_MARKET_KINDS]

export const SETTLED_BET_STATUSES = ['won', 'lost', 'void', 'cashed_out']

export function isOpenBet(bet) {
  return bet?.status === 'open' || bet?.status == null
}

export function isSettledBet(bet) {
  return SETTLED_BET_STATUSES.includes(bet?.status)
}

/**
 * Deadline (ms) of the next weekly H2H board after `afterGw`, or null when
 * no later week has been ingested yet. That deadline is when the next
 * gameweek starts for the bookie — last week's settled tickets drop off.
 */
export function nextWeeklyDeadlineMs(markets, afterGw) {
  const gw = Number(afterGw)
  if (!Number.isFinite(gw)) return null
  let nextGw = Infinity
  let deadline = null
  for (const m of Array.isArray(markets) ? markets : []) {
    if (m?.kind !== 'h2h') continue
    const marketGw = Number(m.gw)
    if (!Number.isFinite(marketGw) || marketGw <= gw) continue
    const closes = Date.parse(m.closesAt ?? '')
    if (!Number.isFinite(closes)) continue
    if (marketGw < nextGw || (marketGw === nextGw && closes < deadline)) {
      nextGw = marketGw
      deadline = closes
    }
  }
  return deadline
}

/**
 * Whether a ticket belongs on the league-wide live board.
 *
 * Open tickets always show (season boards included). Settled weekly tickets
 * stay until the next gameweek's deadline, then drop off. Settled season
 * tickets never linger — those boards resolve at the end of the year.
 */
export function isLiveBoardBet(bet, markets, nowMs) {
  if (!bet) return false
  if (isOpenBet(bet)) return true
  if (!isSettledBet(bet)) return false
  const kind = bet.kind
  if (SEASON_PLACE_KINDS.includes(kind)) return false
  if (!WEEKLY_MARKET_KINDS.includes(kind)) return false
  const gw = Number(bet.gw)
  if (!Number.isFinite(gw)) return false
  const nextDeadline = nextWeeklyDeadlineMs(markets, gw)
  if (nextDeadline == null) return true
  return Number(nowMs) < nextDeadline
}

/** Open bets plus this-week settled tickets, newest first. */
export function liveBoardBets({
  openBets = [],
  closedBets = [],
  markets = [],
  nowMs = Date.now(),
} = {}) {
  const seen = new Set()
  const out = []
  for (const bet of [...openBets, ...closedBets]) {
    const id = bet?.id
    if (id != null && seen.has(id)) continue
    if (!isLiveBoardBet(bet, markets, nowMs)) continue
    if (id != null) seen.add(id)
    out.push(bet)
  }
  return out.sort((a, b) => Number(b.id) - Number(a.id))
}
