import { defensiveContributionPointThreshold } from './fplBonusFromBps.js'
import { isCleanSheetEligible } from './liveScoresDerivations.js'

/**
 * Local copy of POS_LABEL — avoids transitively importing
 * `./playersWireList.js`, which uses extensionless module specifiers
 * Vite-only Node `--test` cannot resolve. Kept in sync with that file.
 */
const POS_LABEL = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' }

/**
 * Premier-League-FPL-style FDR ramp 1..5 → tone bucket consumed by CSS class
 * suffix `pdetail-fdr--{n}`. Mirror of `mockup-pdetail-fdr--{n}` from
 * `web/src/Mockup.css` (lines ~4614-4618).
 *
 * @param {number | null | undefined} difficulty
 * @returns {1 | 2 | 3 | 4 | 5}
 */
export function fdrTone(difficulty) {
  if (difficulty == null) return 3
  const n = Number(difficulty)
  if (!Number.isFinite(n)) return 3
  if (n <= 1) return 1
  if (n >= 5) return 5
  return /** @type {1|2|3|4|5} */ (Math.round(n))
}

/**
 * Return the last `count` history rows in chronological order. Newest gets
 * the right-most bar in the mini chart.
 *
 * @template T
 * @param {T[] | null | undefined} historyRows
 * @param {number} [count]
 * @returns {T[]}
 */
export function lastNHistoryRows(historyRows, count = 5) {
  if (!Array.isArray(historyRows) || historyRows.length === 0) return []
  if (count <= 0) return []
  const n = Math.min(count, historyRows.length)
  return historyRows.slice(historyRows.length - n)
}

/**
 * Average / last / total summary for the last 5 GW totals row.
 *
 * @param {number[]} values
 * @returns {{ avg: number, last: number, total: number }}
 */
export function summarizeRecentPoints(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return { avg: 0, last: 0, total: 0 }
  }
  let total = 0
  for (const v of values) {
    const n = Number(v)
    total += Number.isFinite(n) ? n : 0
  }
  const last = Number.isFinite(Number(values[values.length - 1]))
    ? Number(values[values.length - 1])
    : 0
  return {
    avg: total / values.length,
    last,
    total,
  }
}

/**
 * "pos / neg / neutral" bucket for the mini chart, comparing each value
 * against the average of the same series. Mirrors the `pos-neg` accent
 * variant from `MiniBars` in the locked Mockup (`web/src/Mockup.jsx`
 * lines ~4260-4267 — but the mockup uses a hard-coded `>= 6` threshold for
 * its season-MID sample; production uses the running average so the chart
 * remains meaningful for low-scoring positions like GK / DEF).
 *
 * @param {number} value
 * @param {number} average
 * @returns {'pos' | 'neg' | 'neutral'}
 */
export function miniBarTone(value, average) {
  const v = Number(value)
  const a = Number(average)
  if (!Number.isFinite(v) || !Number.isFinite(a)) return 'neutral'
  const delta = v - a
  if (delta > 0.5) return 'pos'
  if (delta < -0.5) return 'neg'
  return 'neutral'
}

/**
 * Build a compact stat-row catalog for the Performance table.
 *
 * @returns {{ id: string, label: string, title: string }[]}
 */
export function performanceStatCatalog() {
  return [
    { id: 'pts', label: 'PTS', title: 'Total points' },
    { id: 'min', label: 'MIN', title: 'Minutes' },
    { id: 'g',   label: 'G',   title: 'Goals' },
    { id: 'a',   label: 'A',   title: 'Assists' },
    { id: 'cs',  label: 'CS',  title: 'Clean sheets' },
    { id: 'dc',  label: 'DC',  title: 'Defensive contributions' },
    { id: 'bns', label: 'BNS', title: 'Bonus' },
    { id: 'bps', label: 'BPS', title: 'Bonus point system' },
    { id: 'xg',  label: 'xG',  title: 'Expected goals' },
    { id: 'xa',  label: 'xA',  title: 'Expected assists' },
    { id: 'sav', label: 'SAV', title: 'Saves' },
    { id: 'gc',  label: 'GC',  title: 'Goals conceded' },
    { id: 'yel', label: 'YEL', title: 'Yellow cards' },
    { id: 'red', label: 'RED', title: 'Red cards' },
    { id: 'fdr', label: 'FDR', title: 'Fixture difficulty rating' },
  ]
}

/** Default visible columns (7 of 15). */
export const DEFAULT_PERFORMANCE_COL_IDS = [
  'pts',
  'min',
  'g',
  'a',
  'dc',
  'bns',
  'fdr',
]

/**
 * Stat-cell tone matching LiveScores rules. `'good'` → green-on cell,
 * `'neutral'` → default. FWDs never get a CS tone (`isCleanSheetEligible` is
 * false). DC is gated by `defensiveContributionPointThreshold` for the
 * player's position.
 *
 * @param {string} statId
 * @param {number | null | undefined} value
 * @param {number | null | undefined} elementType
 * @returns {'good' | 'neutral'}
 */
export function statCellTone(statId, value, elementType) {
  const v = Number(value)
  if (!Number.isFinite(v) || v <= 0) return 'neutral'
  const posLabel = POS_LABEL[elementType] ?? null
  switch (statId) {
    case 'g':
    case 'a':
    case 'bns':
      return 'good'
    case 'cs':
      return isCleanSheetEligible(posLabel) ? 'good' : 'neutral'
    case 'dc': {
      const t = defensiveContributionPointThreshold(elementType)
      if (t == null) return 'neutral'
      return v >= t ? 'good' : 'neutral'
    }
    default:
      return 'neutral'
  }
}

/**
 * Build a per-GW row map keyed by gameweek number.
 *
 *   - completed GW: `{ gw, kind: 'past', history: <historyRow>, fixture: <fxRow|null> }`
 *   - upcoming GW: `{ gw, kind: 'future', history: null, fixture: <fxRow> }`
 *
 * For double-game-weeks (DGW) the row carries `extras` for the additional
 * fixtures. The Performance table only renders one row per GW number; DGW
 * extras are surfaced inline via the OPP column.
 *
 * @param {object} elementSummary FPL element-summary payload
 * @returns {Array<{
 *   gw: number,
 *   kind: 'past' | 'future',
 *   history: object | null,
 *   fixture: object | null,
 *   extras: object[],
 * }>}
 */
export function performanceTableRows(elementSummary) {
  const history = Array.isArray(elementSummary?.history) ? elementSummary.history : []
  const fixtures = Array.isArray(elementSummary?.fixtures) ? elementSummary.fixtures : []

  /** @type {Map<number, { history: object | null, extras: object[], kind: 'past' }>} */
  const pastByGw = new Map()
  for (const h of history) {
    const gw = Number(h?.round ?? h?.event)
    if (!Number.isFinite(gw)) continue
    const cur = pastByGw.get(gw)
    if (!cur) {
      pastByGw.set(gw, { history: h, extras: [], kind: 'past' })
    } else {
      cur.extras.push(h)
    }
  }

  /** @type {Map<number, { fixture: object | null, extras: object[] }>} */
  const futureByGw = new Map()
  for (const f of fixtures) {
    const gw = Number(f?.event)
    if (!Number.isFinite(gw)) continue
    const cur = futureByGw.get(gw)
    if (!cur) {
      futureByGw.set(gw, { fixture: f, extras: [] })
    } else {
      cur.extras.push(f)
    }
  }

  const allGws = new Set()
  for (const gw of pastByGw.keys()) allGws.add(gw)
  for (const gw of futureByGw.keys()) allGws.add(gw)
  const sorted = [...allGws].sort((a, b) => a - b)

  return sorted.map((gw) => {
    const past = pastByGw.get(gw)
    if (past) {
      return {
        gw,
        kind: /** @type {'past'} */ ('past'),
        history: past.history,
        fixture: futureByGw.get(gw)?.fixture ?? null,
        extras: past.extras,
      }
    }
    const fut = futureByGw.get(gw)
    return {
      gw,
      kind: /** @type {'future'} */ ('future'),
      history: null,
      fixture: fut?.fixture ?? null,
      extras: fut?.extras ?? [],
    }
  })
}

/**
 * First N upcoming fixtures, with `home` flag derived from `is_home` and
 * the opponent team-id derived from `team_h` / `team_a`.
 *
 * @param {object} elementSummary FPL element-summary payload
 * @param {number} playerTeamId FPL bootstrap `element.team`
 * @param {number} [count]
 * @returns {Array<{
 *   gw: number,
 *   teamId: number,
 *   home: boolean,
 *   difficulty: 1 | 2 | 3 | 4 | 5,
 * }>}
 */
export function upcomingFixturesNext(elementSummary, playerTeamId, count = 5) {
  const fixtures = Array.isArray(elementSummary?.fixtures) ? elementSummary.fixtures : []
  if (fixtures.length === 0) return []
  const home = Number(playerTeamId)
  const out = []
  for (const f of fixtures) {
    const gw = Number(f?.event)
    if (!Number.isFinite(gw)) continue
    const isHome = f?.is_home != null
      ? Boolean(f.is_home)
      : Number(f?.team_h) === home
    const oppId = isHome ? Number(f?.team_a) : Number(f?.team_h)
    if (!Number.isFinite(oppId)) continue
    out.push({
      gw,
      teamId: oppId,
      home: isHome,
      difficulty: fdrTone(f?.difficulty),
    })
    if (out.length >= count) break
  }
  return out
}

/**
 * Pull a stat value from an element-summary `history` row by Performance
 * stat id. Returns `null` if the value is missing or non-numeric. DNP rows
 * (minutes === 0) still surface their numeric stats — the table greys the
 * row in CSS instead of zeroing them out, so we return raw values here.
 *
 * @param {string} statId
 * @param {object} historyRow
 * @returns {number | null}
 */
export function performanceStatValue(statId, historyRow) {
  if (!historyRow) return null
  let raw
  switch (statId) {
    case 'pts': raw = historyRow.total_points; break
    case 'min': raw = historyRow.minutes; break
    case 'g':   raw = historyRow.goals_scored; break
    case 'a':   raw = historyRow.assists; break
    case 'cs':  raw = historyRow.clean_sheets; break
    case 'dc':  raw = historyRow.defensive_contribution ?? historyRow.dc; break
    case 'bns': raw = historyRow.bonus; break
    case 'bps': raw = historyRow.bps; break
    case 'xg':  raw = historyRow.expected_goals; break
    case 'xa':  raw = historyRow.expected_assists; break
    case 'sav': raw = historyRow.saves; break
    case 'gc':  raw = historyRow.goals_conceded; break
    case 'yel': raw = historyRow.yellow_cards; break
    case 'red': raw = historyRow.red_cards; break
    default:    return null
  }
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/**
 * Format a stat value for the Performance table. xG / xA show 2 decimals;
 * everything else shows the integer string. `null` → em-dash.
 *
 * @param {string} statId
 * @param {number | null | undefined} value
 * @returns {string}
 */
export function formatPerformanceStat(statId, value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const n = Number(value)
  if (statId === 'xg' || statId === 'xa') return n.toFixed(2)
  return String(n)
}
