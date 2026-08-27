import {
  elementSavePoints,
  parseElementStat,
} from './playersWireList.js'

/** @typedef {'current' | 'prior' | 'combined'} TradeSeasonMode */

/**
 * Stats that can be summed (or averaged) across a trade side and plotted
 * as radar axes. `source: 'summary'` reads player-wire-stats; everything
 * else is a bootstrap element field.
 *
 * @type {Record<string, {
 *   id: string,
 *   label: string,
 *   title: string,
 *   group: 'scoring' | 'expected' | 'playing' | 'defensive',
 *   format: 'int' | 'decimal',
 *   aggregate: 'sum' | 'avg',
 *   lowerIsBetter?: boolean,
 *   field?: string,
 *   source?: 'element' | 'summary' | 'savePts',
 *   summaryKey?: 'gamesPlayed' | 'sixtyPlus' | 'defConHits',
 * }>}
 */
export const TRADE_STAT_CATALOG = {
  pts: {
    id: 'pts',
    label: 'PTS',
    title: 'Total points',
    group: 'scoring',
    format: 'int',
    aggregate: 'sum',
    field: 'total_points',
  },
  goals: {
    id: 'goals',
    label: 'G',
    title: 'Goals',
    group: 'scoring',
    format: 'int',
    aggregate: 'sum',
    field: 'goals_scored',
  },
  assists: {
    id: 'assists',
    label: 'A',
    title: 'Assists',
    group: 'scoring',
    format: 'int',
    aggregate: 'sum',
    field: 'assists',
  },
  bonus: {
    id: 'bonus',
    label: 'BON',
    title: 'Bonus points',
    group: 'scoring',
    format: 'int',
    aggregate: 'sum',
    field: 'bonus',
  },
  xg: {
    id: 'xg',
    label: 'xG',
    title: 'Expected goals',
    group: 'expected',
    format: 'decimal',
    aggregate: 'sum',
    field: 'expected_goals',
  },
  xa: {
    id: 'xa',
    label: 'xA',
    title: 'Expected assists',
    group: 'expected',
    format: 'decimal',
    aggregate: 'sum',
    field: 'expected_assists',
  },
  minutes: {
    id: 'minutes',
    label: 'MIN',
    title: 'Minutes',
    group: 'playing',
    format: 'int',
    aggregate: 'sum',
    field: 'minutes',
  },
  starts: {
    id: 'starts',
    label: 'ST',
    title: 'Starts',
    group: 'playing',
    format: 'int',
    aggregate: 'sum',
    field: 'starts',
  },
  gp: {
    id: 'gp',
    label: 'GP',
    title: 'Games played (GWs with minutes)',
    group: 'playing',
    format: 'int',
    aggregate: 'sum',
    source: 'summary',
    summaryKey: 'gamesPlayed',
  },
  sixtyPlus: {
    id: 'sixtyPlus',
    label: '60+',
    title: 'Gameweeks with 60+ minutes',
    group: 'playing',
    format: 'int',
    aggregate: 'sum',
    source: 'summary',
    summaryKey: 'sixtyPlus',
  },
  cs: {
    id: 'cs',
    label: 'CS',
    title: 'Clean sheets',
    group: 'defensive',
    format: 'int',
    aggregate: 'sum',
    field: 'clean_sheets',
  },
  defConHits: {
    id: 'defConHits',
    label: 'DC',
    title: 'DefCon GWs',
    group: 'defensive',
    format: 'int',
    aggregate: 'sum',
    source: 'summary',
    summaryKey: 'defConHits',
  },
  saves: {
    id: 'saves',
    label: 'SV',
    title: 'Saves',
    group: 'defensive',
    format: 'int',
    aggregate: 'sum',
    field: 'saves',
  },
  savePts: {
    id: 'savePts',
    label: 'SVP',
    title: 'Save points (1 per 3 saves)',
    group: 'defensive',
    format: 'int',
    aggregate: 'sum',
    source: 'savePts',
  },
  bps: {
    id: 'bps',
    label: 'BPS',
    title: 'Bonus point system score',
    group: 'defensive',
    format: 'int',
    aggregate: 'sum',
    field: 'bps',
  },
  gc: {
    id: 'gc',
    label: 'GC',
    title: 'Goals conceded (lower is better)',
    group: 'defensive',
    format: 'int',
    aggregate: 'sum',
    lowerIsBetter: true,
    field: 'goals_conceded',
  },
}

export const TRADE_STAT_GROUPS = [
  { id: 'scoring', label: 'Scoring' },
  { id: 'expected', label: 'Expected' },
  { id: 'playing', label: 'Playing time' },
  { id: 'defensive', label: 'Defensive' },
]

/** Six axes — same count as a classic player radar. */
export const DEFAULT_TRADE_STAT_IDS = [
  'pts',
  'goals',
  'assists',
  'cs',
  'bonus',
  'xg',
]

export const TRADE_MAX_STATS = 8
export const TRADE_MIN_STATS = 3
export const TRADE_MAX_PLAYERS_PER_SIDE = 5

/** "2026-27" → "26/27" */
export function seasonShortLabel(label) {
  if (typeof label !== 'string') return ''
  const m = label.match(/^(\d{4})-(\d{2})$/)
  return m ? `${m[1].slice(2)}/${m[2]}` : label
}

/**
 * @param {string[]} selectedIds
 * @returns {string[]}
 */
export function normalizeTradeStatSelection(selectedIds) {
  const seen = new Set()
  const out = []
  for (const id of selectedIds || []) {
    if (!TRADE_STAT_CATALOG[id] || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= TRADE_MAX_STATS) break
  }
  if (out.length >= TRADE_MIN_STATS) return out
  for (const id of DEFAULT_TRADE_STAT_IDS) {
    if (seen.has(id)) continue
    out.push(id)
    seen.add(id)
    if (out.length >= TRADE_MIN_STATS) break
  }
  return out
}

/**
 * @param {object | null | undefined} el
 * @param {{ gamesPlayed?: number, sixtyPlus?: number, defConHits?: number } | null | undefined} summary
 * @param {string} statId
 * @returns {number}
 */
export function readTradeStat(el, summary, statId) {
  const def = TRADE_STAT_CATALOG[statId]
  if (!def) return 0
  if (def.source === 'summary') {
    return Number(summary?.[def.summaryKey]) || 0
  }
  if (def.source === 'savePts') {
    return elementSavePoints(el)
  }
  if (!el) return 0
  return parseElementStat(el[def.field])
}

/**
 * @param {object[]} elements
 * @returns {Map<number, object>}
 */
export function indexElementsByCode(elements) {
  const out = new Map()
  for (const el of elements || []) {
    const code = Number(el?.code)
    if (!Number.isFinite(code) || out.has(code)) continue
    out.set(code, el)
  }
  return out
}

/**
 * @param {object | null | undefined} currentEl
 * @param {Map<number, object>} priorByCode
 * @returns {object | null}
 */
export function joinPriorByCode(currentEl, priorByCode) {
  const code = Number(currentEl?.code)
  if (!Number.isFinite(code) || !priorByCode) return null
  return priorByCode.get(code) ?? null
}

/**
 * @param {object | null | undefined} currentEl
 * @param {object | null | undefined} priorEl
 * @param {object | null | undefined} currentSummary
 * @param {object | null | undefined} priorSummary
 * @param {string} statId
 * @param {TradeSeasonMode} mode
 * @returns {{ value: number, current: number, prior: number, hasPrior: boolean }}
 */
export function seasonStatValue(
  currentEl,
  priorEl,
  currentSummary,
  priorSummary,
  statId,
  mode,
) {
  const current = readTradeStat(currentEl, currentSummary, statId)
  const hasPrior = Boolean(priorEl)
  const prior = hasPrior ? readTradeStat(priorEl, priorSummary, statId) : 0
  if (mode === 'prior') return { value: hasPrior ? prior : 0, current, prior, hasPrior }
  if (mode === 'combined') {
    return { value: current + prior, current, prior, hasPrior }
  }
  return { value: current, current, prior, hasPrior }
}

/**
 * @param {{
 *   currentEl: object | null,
 *   priorEl?: object | null,
 *   currentSummary?: object | null,
 *   priorSummary?: object | null,
 * }[]} players
 * @param {string[]} statIds
 * @param {TradeSeasonMode} mode
 * @returns {Record<string, number>}
 */
export function aggregateSideStats(players, statIds, mode) {
  const ids = normalizeTradeStatSelection(statIds)
  /** @type {Record<string, number>} */
  const sums = {}
  /** @type {Record<string, number>} */
  const counts = {}
  for (const id of ids) {
    sums[id] = 0
    counts[id] = 0
  }
  for (const p of players || []) {
    if (!p?.currentEl && mode !== 'prior') continue
    if (mode === 'prior' && !p?.priorEl) continue
    for (const id of ids) {
      const { value } = seasonStatValue(
        p.currentEl,
        p.priorEl,
        p.currentSummary,
        p.priorSummary,
        id,
        mode,
      )
      sums[id] += value
      counts[id] += 1
    }
  }
  /** @type {Record<string, number>} */
  const out = {}
  for (const id of ids) {
    const def = TRADE_STAT_CATALOG[id]
    if (def?.aggregate === 'avg') {
      out[id] = counts[id] ? sums[id] / counts[id] : 0
    } else {
      out[id] = sums[id]
    }
  }
  return out
}

/**
 * Scale a raw pair onto 0–1 for the radar. The leader of each axis sits on
 * the outer ring; lower-is-better stats invert so the smaller number wins.
 *
 * @param {number} a
 * @param {number} b
 * @param {{ lowerIsBetter?: boolean }} [def]
 * @returns {{ aNorm: number, bNorm: number }}
 */
export function normalizeRadarPair(a, b, def = {}) {
  const av = Number(a) || 0
  const bv = Number(b) || 0
  const scale = Math.max(Math.abs(av), Math.abs(bv), 1)
  if (def.lowerIsBetter) {
    return {
      aNorm: (scale - av) / scale,
      bNorm: (scale - bv) / scale,
    }
  }
  return {
    aNorm: av / scale,
    bNorm: bv / scale,
  }
}

/**
 * @param {string[]} statIds
 * @param {Record<string, number>} sideA
 * @param {Record<string, number>} sideB
 * @returns {{
 *   id: string,
 *   label: string,
 *   title: string,
 *   a: number,
 *   b: number,
 *   aNorm: number,
 *   bNorm: number,
 *   delta: number,
 *   lowerIsBetter: boolean,
 * }[]}
 */
export function buildRadarAxes(statIds, sideA, sideB) {
  const ids = normalizeTradeStatSelection(statIds)
  return ids.map((id) => {
    const def = TRADE_STAT_CATALOG[id]
    const a = Number(sideA?.[id]) || 0
    const b = Number(sideB?.[id]) || 0
    const { aNorm, bNorm } = normalizeRadarPair(a, b, def)
    const delta = def.lowerIsBetter ? b - a : a - b
    return {
      id,
      label: def.label,
      title: def.title,
      a,
      b,
      aNorm,
      bNorm,
      delta,
      lowerIsBetter: Boolean(def.lowerIsBetter),
    }
  })
}

/**
 * @param {number} index
 * @param {number} count
 * @param {number} value01
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {number} [startAngle]
 * @returns {[number, number]}
 */
export function radarVertex(
  index,
  count,
  value01,
  cx,
  cy,
  radius,
  startAngle = -Math.PI / 2,
) {
  const n = Math.max(3, count)
  const angle = startAngle + (index / n) * Math.PI * 2
  const r = radius * Math.max(0, Math.min(1, Number(value01) || 0))
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
}

/**
 * @param {[number, number][]} points
 * @returns {string}
 */
export function polygonPath(points) {
  if (!points?.length) return ''
  const body = points
    .map((p, i) => {
      const cmd = i === 0 ? 'M' : 'L'
      return `${cmd}${p[0].toFixed(2)},${p[1].toFixed(2)}`
    })
    .join(' ')
  return `${body} Z`
}

/**
 * @param {string} statId
 * @param {number} value
 * @returns {string}
 */
export function formatTradeStat(statId, value) {
  const def = TRADE_STAT_CATALOG[statId]
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (def?.format === 'decimal') return n.toFixed(1)
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 10) / 10)
}

/**
 * Toggle a stat in the radar selection, respecting min/max.
 * @param {string[]} selectedIds
 * @param {string} statId
 * @returns {string[]}
 */
export function toggleTradeStat(selectedIds, statId) {
  if (!TRADE_STAT_CATALOG[statId]) return normalizeTradeStatSelection(selectedIds)
  const current = normalizeTradeStatSelection(selectedIds)
  if (current.includes(statId)) {
    if (current.length <= TRADE_MIN_STATS) return current
    return current.filter((id) => id !== statId)
  }
  if (current.length >= TRADE_MAX_STATS) return current
  return [...current, statId]
}
