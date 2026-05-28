/**
 * Final TCLOT league tables by season (manually transcribed from end-of-season standings).
 * Two managers share "Nick": explicit Nick G teams first, then Nick M substrings, else Nick G.
 */

/** Substrings (lowercase) — team name must include one to count as Nick G (checked before Nick M). */
const NICK_G_TEAM_MATCHERS = ['hanson of york']

/** Substrings (lowercase) — team name must include one to count as Nick M */
const NICK_M_TEAM_MATCHERS = [
  'macclesfield',
  'dalston benoit',
  'dalston bell', // Bellsprouts
  'dalston montgomery',
  'london gaston',
  'hackney meat',
]

export function hallManagerDisplayKey(teamName, managerFirstName) {
  const raw = String(managerFirstName ?? '').trim()
  if (!raw) return '—'
  if (raw.toLowerCase() !== 'nick') return raw
  const t = String(teamName ?? '').toLowerCase()
  for (const frag of NICK_G_TEAM_MATCHERS) {
    if (t.includes(frag)) return 'Nick G'
  }
  for (const frag of NICK_M_TEAM_MATCHERS) {
    if (t.includes(frag)) return 'Nick M'
  }
  return 'Nick G'
}

/** First whitespace-delimited token (FPL manager full name → first name for hall keys). */
export function managerFirstNameFromFull(managerFull) {
  const s = String(managerFull ?? '').trim()
  if (!s) return ''
  return s.split(/\s+/)[0]
}

/**
 * Static fallback: historic display key → manager full name.
 *
 * Source of truth is the live FPL data — see `buildManagerFullNameByHallKey()` below
 * which extracts the resolved name from the current season's `tableRows`. This map only
 * kicks in when a manager from an archived season is missing from the live roster, or
 * when `tableRows` haven't loaded yet (initial render).
 *
 * Extend this map when:
 *  - A new manager joins the league (add their `<First>` or `Nick X` key).
 *  - A current manager leaves so their historic seasons survive in the heritage view.
 */
export const HISTORIC_MANAGER_FULL_NAMES = {
  Andy: 'Andy Ward',
  David: 'David Higman',
  Eddy: 'Eddy Webster',
  Jon: 'Jon Ward',
  Luke: 'Luke Butcher',
  Mike: 'Mike Sutton',
  'Nick G': 'Nick Goodacre',
  'Nick M': 'Nick Mottershead',
}

/**
 * First-letter-of-first-name + first-letter-of-last-name, uppercased.
 * Falls back to first two letters when only one name token is available.
 * "Luke Butcher" → "LB", "Nick Mottershead" → "NM", "Andy" → "AN".
 * @param {string | null | undefined} fullName
 */
export function managerInitialsFromFull(fullName) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Build display-key → full manager name lookup from live `tableRows`.
 * Falls back to `HISTORIC_MANAGER_FULL_NAMES` for any key not represented in
 * the current roster (e.g. archived managers).
 *
 * @param {{ teamName?: string, manager?: string }[] | null | undefined} tableRows
 * @returns {Map<string, string>}
 */
export function buildManagerFullNameByHallKey(tableRows) {
  const map = new Map()
  for (const row of Array.isArray(tableRows) ? tableRows : []) {
    const full = String(row?.manager ?? '').trim()
    if (!full) continue
    const first = managerFirstNameFromFull(full)
    const key = hallManagerDisplayKey(row?.teamName, first)
    if (!map.has(key)) map.set(key, full)
  }
  for (const [k, v] of Object.entries(HISTORIC_MANAGER_FULL_NAMES)) {
    if (!map.has(k)) map.set(k, v)
  }
  return map
}

/** @type {{ season: string, rows: { team: string, manager: string, rank: number, w: number, d: number, l: number, pf: number, pts: number }[] }[]} */
export const HALL_SEASON_FINAL_TABLES = [
  {
    season: '2020-21',
    rows: [
      { team: 'Essex Ratigans', manager: 'Mike', rank: 1, w: 24, d: 2, l: 12, pf: 1790, pts: 74 },
      { team: 'Toronto Potato Heads', manager: 'Andy', rank: 2, w: 24, d: 0, l: 14, pf: 1867, pts: 72 },
      { team: 'London Gaston', manager: 'Nick', rank: 3, w: 19, d: 1, l: 18, pf: 1721, pts: 58 },
      { team: 'Seoul Man Village', manager: 'Luke', rank: 4, w: 19, d: 0, l: 19, pf: 1750, pts: 57 },
      { team: 'The Stokey Simbas', manager: 'David', rank: 5, w: 18, d: 0, l: 20, pf: 1800, pts: 54 },
      { team: "Milton Mushu's", manager: 'Eddy', rank: 6, w: 16, d: 1, l: 21, pf: 1587, pts: 49 },
      { team: 'Yorkshire McQueens', manager: 'Nick', rank: 7, w: 15, d: 1, l: 22, pf: 1668, pts: 46 },
      { team: "The Limehouse Lilo's", manager: 'Jon', rank: 8, w: 14, d: 1, l: 23, pf: 1659, pts: 43 },
    ],
  },
  {
    season: '2021-22',
    rows: [
      { team: 'Dalston Bellsprouts', manager: 'Nick', rank: 1, w: 24, d: 1, l: 13, pf: 1916, pts: 73 },
      { team: 'Plumstead Victreebel', manager: 'Jon', rank: 2, w: 20, d: 2, l: 16, pf: 1691, pts: 62 },
      { team: 'Milton Psyducks', manager: 'Eddy', rank: 3, w: 20, d: 1, l: 17, pf: 1809, pts: 61 },
      { team: 'Poppleton Jynx', manager: 'Nick', rank: 4, w: 17, d: 4, l: 17, pf: 1726, pts: 55 },
      { team: 'Essex Arboks', manager: 'Mike', rank: 5, w: 18, d: 1, l: 19, pf: 1675, pts: 55 },
      { team: 'Toronto Alakazam', manager: 'Andy', rank: 6, w: 17, d: 0, l: 21, pf: 1739, pts: 51 },
      { team: 'Harringay Haunters', manager: 'David', rank: 7, w: 16, d: 2, l: 20, pf: 1835, pts: 50 },
      { team: 'Seoul Slowpoke', manager: 'Luke', rank: 8, w: 14, d: 1, l: 23, pf: 1630, pts: 43 },
    ],
  },
  {
    season: '2022-23',
    rows: [
      { team: 'Dalston Benoit', manager: 'Nick', rank: 1, w: 21, d: 1, l: 16, pf: 1588, pts: 64 },
      { team: 'Funaki Finsbury', manager: 'David', rank: 2, w: 20, d: 1, l: 17, pf: 1729, pts: 61 },
      { team: 'Seoul Cold Stunners', manager: 'Luke', rank: 3, w: 19, d: 2, l: 17, pf: 1731, pts: 59 },
      { team: 'Ontario Guerrero', manager: 'Andy', rank: 4, w: 19, d: 1, l: 18, pf: 1694, pts: 58 },
      { team: 'Toronto Blackman', manager: 'Eddy', rank: 5, w: 18, d: 2, l: 18, pf: 1652, pts: 56 },
      { team: 'Suffolk Rikishi', manager: 'Jon', rank: 6, w: 18, d: 1, l: 19, pf: 1700, pts: 55 },
      { team: 'Yorkshire Jerichos', manager: 'Nick', rank: 7, w: 16, d: 1, l: 21, pf: 1682, pts: 49 },
      { team: 'Southend Cty Stratus', manager: 'Mike', rank: 8, w: 16, d: 1, l: 21, pf: 1507, pts: 49 },
    ],
  },
  {
    season: '2023-24',
    rows: [
      { team: 'Toronto Wiggum', manager: 'Andy', rank: 1, w: 27, d: 0, l: 11, pf: 1820, pts: 81 },
      { team: 'Yeomchang Kangs', manager: 'Luke', rank: 2, w: 25, d: 1, l: 12, pf: 1839, pts: 76 },
      { team: 'Finsbury Mr Sparkles', manager: 'David', rank: 3, w: 18, d: 1, l: 19, pf: 1654, pts: 55 },
      { team: 'Poppleton Brockmans', manager: 'Nick', rank: 4, w: 18, d: 0, l: 20, pf: 1625, pts: 54 },
      { team: 'Dalston Montgomery', manager: 'Nick', rank: 5, w: 17, d: 1, l: 20, pf: 1759, pts: 52 },
      { team: 'Essex Szyslak', manager: 'Mike', rank: 6, w: 17, d: 0, l: 21, pf: 1562, pts: 51 },
      { team: 'Milton McClures', manager: 'Eddy', rank: 7, w: 16, d: 1, l: 21, pf: 1443, pts: 49 },
      { team: 'Suffolk Skinners', manager: 'Jon', rank: 8, w: 11, d: 2, l: 25, pf: 1626, pts: 35 },
    ],
  },
  {
    season: '2024-25',
    rows: [
      { team: 'Seoul Ze Moles', manager: 'Luke', rank: 1, w: 22, d: 0, l: 16, pf: 1746, pts: 66 },
      { team: 'Garrison of York AFC', manager: 'Nick', rank: 2, w: 20, d: 2, l: 16, pf: 1788, pts: 62 },
      { team: 'London City Sushi', manager: 'David', rank: 3, w: 19, d: 3, l: 16, pf: 1625, pts: 60 },
      { team: 'Macclesfield People', manager: 'Nick', rank: 4, w: 19, d: 1, l: 18, pf: 1751, pts: 58 },
      { team: 'Milton Terrance', manager: 'Eddy', rank: 5, w: 17, d: 2, l: 19, pf: 1578, pts: 53 },
      { team: 'Southend City Wok', manager: 'Mike', rank: 6, w: 17, d: 2, l: 19, pf: 1478, pts: 53 },
      { team: 'Toronto Timmy!', manager: 'Andy', rank: 7, w: 16, d: 2, l: 20, pf: 1580, pts: 50 },
      { team: 'Ipswich Towelie', manager: 'Jon', rank: 8, w: 15, d: 2, l: 21, pf: 1672, pts: 47 },
    ],
  },
]

export const LIVE_HALL_SEASON_LABEL = '2025-26'

/**
 * @param {object[] | null | undefined} tableRows from useLeagueData (current standings)
 */
export function buildLiveSeasonHallRows(tableRows) {
  if (!tableRows?.length) return []
  return tableRows.map((row) => ({
    team: row.teamName ?? '—',
    manager: managerFirstNameFromFull(row.manager),
    /** Full FPL manager name where available — gives the CofC table real "EW"-style initials. */
    managerFull: row.manager ?? null,
    rank: Number(row.rank) || 0,
    w: row.matches_won ?? 0,
    d: row.matches_drawn ?? 0,
    l: row.matches_lost ?? 0,
    pf: row.gf ?? 0,
    /** Optional Points-Against; historic seasons don't carry this yet. */
    pa: row.ga ?? null,
    pts: row.total ?? 0,
  }))
}

/** 1st → 8, 2nd → 7, … 8th → 1 (nine minus rank). */
export function hallPlacementPointsForRank(rank) {
  const r = Number(rank)
  if (!Number.isFinite(r) || r < 1 || r > 8) return 0
  return 9 - r
}

/**
 * @param {{ season: string, rows: { team: string, manager: string, rank: number, pts: number, pf: number, pa?: number|null, w?: number, d?: number, l?: number, managerFull?: string|null }[] }[]} seasonDefs
 * @returns {{ key: string, titles: number, runnerUps: number, titanCount: number, minnowCount: number, seasons: number, lastPlaceCount: number, totalPts: number, totalPlacementPts: number, totalPf: number, totalPa: number, hasFaced: boolean, totalW: number, totalD: number, totalL: number, avgRank: number, bestRank: number, worstRank: number, lastRank: number|null, managerFull: string|null }[]}
 */
function aggregateHallManagerCareerFromSeasons(seasonDefs) {
  const acc = new Map()

  for (const { rows } of seasonDefs) {
    const nTeams = rows.length
    for (const r of rows) {
      const key = hallManagerDisplayKey(r.team, r.manager)
      if (!acc.has(key)) {
        acc.set(key, {
          titles: 0,
          runnerUps: 0,
          titanCount: 0,
          minnowCount: 0,
          totalPts: 0,
          totalPlacementPts: 0,
          totalPf: 0,
          totalPa: 0,
          hasFaced: false,
          totalW: 0,
          totalD: 0,
          totalL: 0,
          ranks: [],
          lastPlaceCount: 0,
          managerFull: null,
        })
      }
      const a = acc.get(key)
      a.totalPts += r.pts
      a.totalPf += r.pf
      if (r.pa != null && Number.isFinite(Number(r.pa))) {
        a.totalPa += Number(r.pa)
        a.hasFaced = true
      }
      a.totalW += Number(r.w ?? 0)
      a.totalD += Number(r.d ?? 0)
      a.totalL += Number(r.l ?? 0)
      a.totalPlacementPts += hallPlacementPointsForRank(r.rank)
      a.ranks.push(r.rank)
      if (r.rank === 1) a.titles += 1
      if (r.rank === 2) a.runnerUps += 1
      if (r.rank >= 1 && r.rank <= 4) a.titanCount += 1
      if (r.rank >= 5 && r.rank <= 8) a.minnowCount += 1
      const rk = Number(r.rank)
      if (Number.isFinite(rk) && nTeams > 0 && rk === nTeams) {
        a.lastPlaceCount += 1
      }
      if (r.managerFull && !a.managerFull) a.managerFull = r.managerFull
    }
  }

  const out = [...acc.entries()].map(([key, a]) => {
    const n = a.ranks.length
    const avgRank = n ? a.ranks.reduce((s, x) => s + x, 0) / n : 0
    return {
      key,
      titles: a.titles,
      runnerUps: a.runnerUps,
      titanCount: a.titanCount,
      minnowCount: a.minnowCount,
      seasons: n,
      lastPlaceCount: a.lastPlaceCount,
      totalPts: a.totalPts,
      totalPlacementPts: a.totalPlacementPts,
      totalPf: a.totalPf,
      totalPa: a.totalPa,
      hasFaced: a.hasFaced,
      totalW: a.totalW,
      totalD: a.totalD,
      totalL: a.totalL,
      avgRank,
      bestRank: n ? Math.min(...a.ranks) : 0,
      worstRank: n ? Math.max(...a.ranks) : 0,
      lastRank: n ? a.ranks[a.ranks.length - 1] : null,
      managerFull: a.managerFull,
    }
  })

  return out
}

export function computeHallManagerCareerRows() {
  return aggregateHallManagerCareerFromSeasons(HALL_SEASON_FINAL_TABLES)
}

/**
 * Historical seasons plus current league table as LIVE_HALL_SEASON_LABEL.
 * @param {object[] | null | undefined} tableRows
 */
export function computeLiveHallManagerCareerRows(tableRows) {
  const liveRows = buildLiveSeasonHallRows(tableRows)
  if (!liveRows.length) {
    return computeHallManagerCareerRows()
  }
  return aggregateHallManagerCareerFromSeasons([
    ...HALL_SEASON_FINAL_TABLES,
    { season: LIVE_HALL_SEASON_LABEL, rows: liveRows },
  ])
}

/**
 * Per manager (display key): teams managed in season order — archived tables plus current
 * season when `tableRows` is available. Each entry carries the rank for heatmap tinting.
 * @param {object[] | null | undefined} tableRows
 * @returns {{ key: string, entries: { season: string, team: string, rank: number|null }[] }[]}
 */
export function computeHallManagerTeamHistory(tableRows) {
  const liveRows = buildLiveSeasonHallRows(tableRows)
  const seasonDefs =
    liveRows.length > 0
      ? [...HALL_SEASON_FINAL_TABLES, { season: LIVE_HALL_SEASON_LABEL, rows: liveRows }]
      : HALL_SEASON_FINAL_TABLES

  const byKey = new Map()
  for (const { season, rows } of seasonDefs) {
    for (const r of rows) {
      const key = hallManagerDisplayKey(r.team, r.manager)
      if (!byKey.has(key)) byKey.set(key, [])
      const team = String(r.team ?? '').trim() || '—'
      const rank = Number.isFinite(Number(r.rank)) ? Number(r.rank) : null
      byKey.get(key).push({ season, team, rank })
    }
  }

  const keys = [...byKey.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  )
  return keys.map((key) => ({ key, entries: byKey.get(key) }))
}

/**
 * Build per-manager career profile: title/runner-up/titan/minnow counts + season cards
 * for the manager journey timeline (TH-D mockup).
 * @param {object[] | null | undefined} tableRows
 */
export function computeHallManagerJourney(tableRows) {
  const careerRows = computeLiveHallManagerCareerRows(tableRows)
  const teamHistory = computeHallManagerTeamHistory(tableRows)
  const careerByKey = new Map(careerRows.map((r) => [r.key, r]))
  return teamHistory.map(({ key, entries }) => {
    const career = careerByKey.get(key)
    return {
      key,
      managerFull: career?.managerFull ?? null,
      titles: career?.titles ?? 0,
      runnerUps: career?.runnerUps ?? 0,
      titanCount: career?.titanCount ?? 0,
      minnowCount: career?.minnowCount ?? 0,
      seasons: entries,
    }
  })
}

/**
 * Algorithm-view rows: per manager, the finishing position is the cell value
 * (1 for 1st ... 8 for 8th, lowest total wins). Returns rank per season label
 * plus the algorithm total.
 * @param {object[] | null | undefined} tableRows
 */
export function computeHallAlgorithmRows(tableRows) {
  const liveRows = buildLiveSeasonHallRows(tableRows)
  const seasonDefs =
    liveRows.length > 0
      ? [...HALL_SEASON_FINAL_TABLES, { season: LIVE_HALL_SEASON_LABEL, rows: liveRows }]
      : HALL_SEASON_FINAL_TABLES
  const seasonLabels = seasonDefs.map((s) => s.season)
  const byKey = new Map()
  for (const { season, rows } of seasonDefs) {
    for (const r of rows) {
      const key = hallManagerDisplayKey(r.team, r.manager)
      if (!byKey.has(key)) byKey.set(key, { ranks: {}, managerFull: null })
      const a = byKey.get(key)
      a.ranks[season] = Number.isFinite(Number(r.rank)) ? Number(r.rank) : null
      if (r.managerFull && !a.managerFull) a.managerFull = r.managerFull
    }
  }
  const out = [...byKey.entries()].map(([key, a]) => {
    const ranks = seasonLabels.map((s) => a.ranks[s] ?? null)
    const total = ranks.reduce((sum, r) => sum + (r ?? 0), 0)
    return { key, managerFull: a.managerFull, ranks, total }
  })
  return { seasonLabels, rows: out }
}

/**
 * Manager initials for the in-line bubble.
 *
 * Always prefers FN+LN initials derived from the manager's full name (e.g.
 * "Luke Butcher" → "LB"). Falls back to the display key's two-letter form only
 * when no full name is available (initial render, before `tableRows` load).
 */
export function hallManagerInitials(displayKey, managerFull) {
  const full = String(managerFull ?? '').trim()
  if (full) return managerInitialsFromFull(full)
  const key = String(displayKey ?? '').trim()
  if (!key) return '—'
  const parts = key.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}
