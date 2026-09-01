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
