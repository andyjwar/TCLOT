/**
 * Bankroll leaderboard columns: season won / lost / live, plus sort.
 *
 * Won  — net profit on winning tickets (payout − stake), including a
 *        cash-out that finished ahead.
 * Lost — stake written off on losers, plus the shortfall on a cash-out
 *        that finished behind.
 * Live — stake still riding on open tickets (same "riding" figure as
 *        the live bets board).
 *
 * Void tickets are ignored. API-supplied won/lost/live win over a
 * client-side rollup of the recent bet lists (those are capped).
 */

export const LB_SORT_KEYS = ['balance', 'won', 'lost', 'live']

export function betResultBuckets(bet) {
  const stake = Number(bet?.stake) || 0
  const payout = Number(bet?.payout) || 0
  const status = bet?.status
  if (status === 'open' || status == null) return { won: 0, lost: 0, live: stake }
  if (status === 'won') return { won: Math.max(0, payout - stake), lost: 0, live: 0 }
  if (status === 'lost') return { won: 0, lost: stake, live: 0 }
  if (status === 'cashed_out') {
    const net = payout - stake
    return net >= 0 ? { won: net, lost: 0, live: 0 } : { won: 0, lost: -net, live: 0 }
  }
  return { won: 0, lost: 0, live: 0 }
}

/** @returns {Map<number, { won: number, lost: number, live: number }>} */
export function aggregateLeaderboardStats(bets) {
  const by = new Map()
  for (const bet of Array.isArray(bets) ? bets : []) {
    const id = Number(bet?.entry_id ?? bet?.entryId)
    if (!Number.isFinite(id)) continue
    const cur = by.get(id) ?? { won: 0, lost: 0, live: 0 }
    const add = betResultBuckets(bet)
    by.set(id, {
      won: cur.won + add.won,
      lost: cur.lost + add.lost,
      live: cur.live + add.live,
    })
  }
  return by
}

/**
 * Merge bankroll rows with won/lost/live. Prefer figures already on the
 * user row (Worker season totals); otherwise roll up open + closed bets.
 */
export function enrichLeaderboardRows(users, bets) {
  const rolled = aggregateLeaderboardStats(bets)
  return (Array.isArray(users) ? users : []).map((u) => {
    const id = Number(u.entryId ?? u.entry_id)
    const fromBets = rolled.get(id) ?? { won: 0, lost: 0, live: 0 }
    const pick = (key) => {
      const raw = u[key]
      if (raw != null && Number.isFinite(Number(raw))) return Number(raw)
      return fromBets[key]
    }
    return {
      ...u,
      entryId: id,
      name: u.name,
      balance: Number(u.balance) || 0,
      won: pick('won'),
      lost: pick('lost'),
      live: pick('live'),
    }
  })
}

export function defaultSortDir(sortKey) {
  return LB_SORT_KEYS.includes(sortKey) ? 'desc' : 'desc'
}

/**
 * Numeric desc/asc with name as the tie-break so rank is stable.
 */
export function sortLeaderboardRows(rows, sortKey, sortDir) {
  const key = LB_SORT_KEYS.includes(sortKey) ? sortKey : 'balance'
  const dir = sortDir === 'asc' ? 1 : -1
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const av = Number(a[key]) || 0
    const bv = Number(b[key]) || 0
    if (av !== bv) return (av - bv) * dir
    return String(a.name ?? '').localeCompare(String(b.name ?? ''))
  })
}

export function nextLeaderboardSort(currentKey, currentDir, clickedKey) {
  if (currentKey === clickedKey) {
    return { sortKey: clickedKey, sortDir: currentDir === 'desc' ? 'asc' : 'desc' }
  }
  return { sortKey: clickedKey, sortDir: defaultSortDir(clickedKey) }
}

/** Weekly tickets that can land on the Weekly winners sheet. */
export const WEEKLY_WINNER_KINDS = ['h2h', 'scorer', 'toppoints']

export function isWeeklyWinnerKind(kind) {
  return kind == null || WEEKLY_WINNER_KINDS.includes(kind)
}

/** Ticket that paid (or cashed out ahead) — listed under Weekly winners. */
export function isWinningWeeklyBet(bet) {
  if (!bet) return false
  if (!isWeeklyWinnerKind(bet.kind)) return false
  if (bet.status === 'won') return true
  if (bet.status === 'cashed_out') return Number(bet.payout) > Number(bet.stake)
  return false
}

/** P/L of one settled weekly ticket (voids are 0). */
export function weeklyBetNet(bet) {
  const stake = Number(bet?.stake) || 0
  const payout = Number(bet?.payout) || 0
  if (bet?.status === 'won' || bet?.status === 'cashed_out') return payout - stake
  if (bet?.status === 'lost') return -stake
  return 0
}

/**
 * Winning weekly tickets for one punter in one GW — H2H and player
 * specials. Season-long slips stay off this list.
 */
export function winningWeeklyBets(bets, { entryId, gw } = {}) {
  const id = Number(entryId)
  const week = Number(gw)
  if (!Number.isFinite(id) || !Number.isFinite(week)) return []
  return (Array.isArray(bets) ? bets : []).filter((b) => {
    if (Number(b.entry_id ?? b.entryId) !== id) return false
    if (Number(b.gw) !== week) return false
    return isWinningWeeklyBet(b)
  })
}

/**
 * Every punter who landed a winning weekly ticket that GW — not just
 * the single biggest net. Newest GW first; within a week, biggest net
 * first. `weeklyNet` fills in a row when the recent-bet list is capped.
 *
 * @returns {Array<{ gw: number, teams: Array<{ entryId: number, gw: number, net: number, tickets: object[] }> }>}
 */
export function weeklyWinnerGroups(bets, weeklyNet = []) {
  const byKey = new Map()
  const take = (gw, entryId) => {
    const key = `${gw}:${entryId}`
    let cur = byKey.get(key)
    if (!cur) {
      cur = { gw, entryId, net: 0, tickets: [] }
      byKey.set(key, cur)
    }
    return cur
  }

  for (const bet of Array.isArray(bets) ? bets : []) {
    if (!isWeeklyWinnerKind(bet?.kind)) continue
    const gw = Number(bet.gw)
    const entryId = Number(bet.entry_id ?? bet.entryId)
    if (!Number.isFinite(gw) || !Number.isFinite(entryId)) continue
    const cur = take(gw, entryId)
    cur.net += weeklyBetNet(bet)
    if (isWinningWeeklyBet(bet)) cur.tickets.push(bet)
  }

  for (const row of Array.isArray(weeklyNet) ? weeklyNet : []) {
    const gw = Number(row.gw)
    const entryId = Number(row.entryId ?? row.entry_id)
    if (!Number.isFinite(gw) || !Number.isFinite(entryId)) continue
    const cur = byKey.get(`${gw}:${entryId}`)
    const apiNet = Number(row.net)
    if (cur) {
      if (Number.isFinite(apiNet)) cur.net = apiNet
    } else if (Number.isFinite(apiNet) && apiNet > 0) {
      byKey.set(`${gw}:${entryId}`, { gw, entryId, net: apiNet, tickets: [] })
    }
  }

  const byGw = new Map()
  for (const row of byKey.values()) {
    if (row.tickets.length === 0 && !(row.net > 0)) continue
    const list = byGw.get(row.gw) ?? []
    list.push(row)
    byGw.set(row.gw, list)
  }

  return [...byGw.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([gw, teams]) => ({
      gw,
      teams: teams.sort((a, b) => {
        if (a.net !== b.net) return b.net - a.net
        return a.entryId - b.entryId
      }),
    }))
}

/** Net profit on a winning ticket (what the green winnings pill shows). */
export function betWinnings(bet) {
  const stake = Number(bet?.stake) || 0
  const payout = Number(bet?.payout) || 0
  return Math.max(0, payout - stake)
}
