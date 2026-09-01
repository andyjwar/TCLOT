import { PLAYER_MARKET_KINDS } from './bookieBetLabel.js'

/** Weekly tickets (H2H + player specials). Season-place boards stay open all year. */
export function isWeeklyBetKind(kind) {
  return kind === 'h2h' || PLAYER_MARKET_KINDS.includes(kind)
}

export function isSettledBetStatus(status) {
  return status != null && status !== 'open'
}

/**
 * Gameweek whose tickets still belong on the live board.
 *
 * Prefer a weekly market that is still taking bets. After that deadline
 * passes, keep the newest weekly board on the sheet so just-settled GW N
 * tickets stay visible until GW N+1's markets print.
 *
 * @param {Array<{ kind?: string, gw?: number, open?: boolean }> | null | undefined} markets
 * @returns {number | null}
 */
export function liveBoardGameweek(markets) {
  const weekly = (Array.isArray(markets) ? markets : []).filter((m) => isWeeklyBetKind(m?.kind))
  const stillOpen = weekly.find((m) => m.open)
  if (stillOpen != null && Number.isFinite(Number(stillOpen.gw))) return Number(stillOpen.gw)
  let max = null
  for (const m of weekly) {
    const gw = Number(m.gw)
    if (!Number.isFinite(gw)) continue
    if (max == null || gw > max) max = gw
  }
  return max
}

/**
 * Settled weekly tickets stay highlighted on My bets / the live board until
 * the next gameweek's markets replace this one.
 */
export function highlightSettledOnLiveBoard(bet, liveGw) {
  if (!bet || !isSettledBetStatus(bet.status) || !isWeeklyBetKind(bet.kind)) return false
  if (liveGw == null || !Number.isFinite(Number(liveGw))) return false
  return Number(bet.gw) === Number(liveGw)
}

/**
 * League-wide live board: every still-open ticket (including season-long)
 * plus this week's settled weekly tickets.
 *
 * @param {{
 *   openBets?: object[],
 *   closedBets?: object[],
 *   markets?: object[],
 * }} state
 * @returns {object[]}
 */
export function liveBoardTickets(state) {
  const open = Array.isArray(state?.openBets) ? state.openBets : []
  const closed = Array.isArray(state?.closedBets) ? state.closedBets : []
  const liveGw = liveBoardGameweek(state?.markets)
  const settledThisWeek = closed.filter((b) => highlightSettledOnLiveBoard(b, liveGw))
  return [...open, ...settledThisWeek]
}
