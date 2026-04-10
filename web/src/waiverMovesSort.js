/**
 * All Waivers + Waiver summary: waivers first by league run rank (asc), then free agency
 * (by added, then transaction id).
 */
export function sortMovesWaiverThenFa(a, b) {
  const wa = a.transactionKind === 'w'
  const wb = b.transactionKind === 'w'
  if (wa && !wb) return -1
  if (!wa && wb) return 1
  if (wa && wb) {
    const oa = Number(a.waiverProcessOrder)
    const ob = Number(b.waiverProcessOrder)
    const ha = Number.isFinite(oa)
    const hb = Number.isFinite(ob)
    if (ha && hb && oa !== ob) return oa - ob
    if (ha && !hb) return -1
    if (!ha && hb) return 1
  }
  const da = a.added ? Date.parse(a.added) : 0
  const db = b.added ? Date.parse(b.added) : 0
  if (da !== db) return da - db
  return (Number(a.transactionId) || 0) - (Number(b.transactionId) || 0)
}

/** Flatten grouped waiver/FA moves with team fields for one list sorted by `sortMovesWaiverThenFa`. */
export function flattenWaiverGroups(groups) {
  const out = []
  for (const g of groups ?? []) {
    for (const m of g.moves ?? []) {
      out.push({
        ...m,
        teamName: g.teamName,
        leagueEntryId: g.leagueEntryId,
        entry: g.entry,
      })
    }
  }
  return out
}

/**
 * All Waivers tab: teams by earliest league waiver run that GW (rank 1 = first run),
 * then teams with no waiver moves A–Z.
 */
export function sortGroupsByFirstWaiverOrder(groups) {
  const firstWaiverRank = (g) => {
    let min = Infinity
    for (const m of g.moves ?? []) {
      if (m.transactionKind !== 'w') continue
      const o = Number(m.waiverProcessOrder)
      if (Number.isFinite(o) && o < min) min = o
    }
    return min
  }
  return [...(groups ?? [])].sort((a, b) => {
    const ra = firstWaiverRank(a)
    const rb = firstWaiverRank(b)
    const aHas = Number.isFinite(ra)
    const bHas = Number.isFinite(rb)
    if (aHas && bHas && ra !== rb) return ra - rb
    if (aHas && !bHas) return -1
    if (!aHas && bHas) return 1
    return (a.teamName || '').localeCompare(b.teamName || '', undefined, {
      sensitivity: 'base',
    })
  })
}

/** Waiver summary “by team”: A–Z by team name; moves waivers-first then FA within each team. */
export function sortGroupsByTeamName(groups) {
  return [...(groups ?? [])]
    .filter((g) => (g.moves || []).length > 0)
    .map((g) => ({
      ...g,
      moves: [...(g.moves || [])].sort(sortMovesWaiverThenFa),
    }))
    .sort((a, b) =>
      (a.teamName || '').localeCompare(b.teamName || '', undefined, { sensitivity: 'base' }),
    )
}
