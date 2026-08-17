/** All Time Standings columns for Champion of Champions (live view). */
export const COFC_LIVE_COLUMNS = [
  { key: 'key', label: 'Manager', numeric: false, align: 'left', mobile: true },
  { key: 'seasons', label: 'Seasons', numeric: true, align: 'right', mobile: false },
  { key: 'totalW', label: 'W', numeric: true, align: 'right', mobile: true, title: 'Wins (cumulative)' },
  { key: 'totalD', label: 'D', numeric: true, align: 'right', mobile: true, title: 'Draws (cumulative)' },
  { key: 'totalL', label: 'L', numeric: true, align: 'right', mobile: true, title: 'Losses (cumulative)' },
  { key: 'totalPf', label: 'For', numeric: true, align: 'right', mobile: true, title: 'Total FPL points scored' },
  { key: 'totalPa', label: 'Faced', numeric: true, align: 'right', mobile: false, title: 'Total FPL points faced (live season only — historic data not yet transcribed)' },
  { key: 'totalPts', label: 'PTS', numeric: true, align: 'right', mobile: true, title: 'League points (3 / 1 / 0 per H2H)' },
  { key: 'titles', label: 'Titles', numeric: true, align: 'right', mobile: false, title: 'Seasons finished 1st' },
  { key: 'lastRank', label: 'Last', numeric: true, align: 'right', mobile: false, title: 'Most recent finishing position' },
  { key: 'avgRank', label: 'Avg Rank', numeric: true, align: 'right', mobile: false, title: 'Mean finishing position (lower is better)' },
]

function num(value) {
  return Number(value ?? 0)
}

/**
 * Sort All Time rows.
 *
 * `sort === null` (and a PTS column click that is still the default
 * direction) uses the same order as the live league table: PTS desc,
 * then For desc, then Faced asc (fewer points conceded ranks higher).
 *
 * @param {object[]} rows
 * @param {{ key: string, dir: 'asc' | 'desc' } | null} sort
 */
export function sortCofcLiveRows(rows, sort) {
  const arr = [...(rows || [])]
  const key = sort?.key ?? 'totalPts'
  const dir = sort?.dir ?? 'desc'
  const dirMul = dir === 'asc' ? 1 : -1
  const col = COFC_LIVE_COLUMNS.find((c) => c.key === key)

  arr.sort((a, b) => {
    if (!col || key === 'totalPts') {
      const league =
        (num(a.totalPts) - num(b.totalPts)) * dirMul ||
        (num(a.totalPf) - num(b.totalPf)) * dirMul ||
        (num(b.totalPa) - num(a.totalPa)) * dirMul
      if (league !== 0) return league
      return String(a.key ?? '').localeCompare(String(b.key ?? ''))
    }
    if (col.numeric) {
      const cmp = (num(a[key]) - num(b[key])) * dirMul
      if (cmp !== 0) return cmp
      return String(a.key ?? '').localeCompare(String(b.key ?? ''))
    }
    return String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * dirMul
  })
  return arr
}

/**
 * Cycle sort like the main Standings table: `null` = league order.
 * First click on a column sorts it desc (asc for names); further
 * clicks flip direction.
 *
 * @param {{ key: string, dir: 'asc' | 'desc' } | null} prev
 * @param {string} key
 */
export function nextCofcLiveSort(prev, key) {
  const col = COFC_LIVE_COLUMNS.find((c) => c.key === key)
  const defaultDir = col?.numeric ? 'desc' : 'asc'
  if (prev?.key === key) {
    return { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
  }
  return { key, dir: defaultDir }
}
