/**
 * Display string for a gameweek number (e.g. select options).
 * @param {number | string} n
 * @returns {string}
 */
export function gameWeekSelectLabel(n) {
  const g = Number(n)
  if (!Number.isFinite(g)) return 'Game Week'
  return `Game Week ${g}`
}

const SMALL = [
  'Zero',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty']

/** Title-case words for a gameweek number (`1` → `One`, `21` → `Twenty-One`). */
export function gameWeekNumberWords(n) {
  const g = Number(n)
  if (!Number.isFinite(g) || g < 1) return ''
  if (g < 20) return SMALL[g]
  const tens = Math.floor(g / 10)
  const ones = g % 10
  if (!TENS[tens]) return String(g)
  if (ones === 0) return TENS[tens]
  return `${TENS[tens]}-${SMALL[ones]}`
}

/** Spoken heading label (`1` → `Game Week One`). */
export function gameWeekSpokenLabel(n) {
  const words = gameWeekNumberWords(n)
  return words ? `Game Week ${words}` : 'Game Week'
}

/**
 * Compact gameweek label for tight, space-constrained triggers (e.g. mobile
 * pills). Renders "GW38" with no separator.
 * @param {number | string} n
 * @returns {string}
 */
export function gameWeekShortLabel(n) {
  const g = Number(n)
  if (!Number.isFinite(g)) return 'GW'
  return `GW${g}`
}

/**
 * FPL bootstrap often uses a single word ("Gameweek 33"). Normalize to "Game Week 33".
 * @param {string | null | undefined} name
 * @param {number | string} id
 * @returns {string}
 */
export function eventNameToGameWeekLabel(name, id) {
  if (typeof name === 'string' && name.trim()) {
    return name.replace(/\bGameweek\b/gi, 'Game Week')
  }
  return gameWeekSelectLabel(id)
}

/**
 * Split live GW options into { past, current, upcoming } for native `<optgroup>` sections.
 * Uses FPL `finished` (all PL fixtures in that week done) and `is_current` (bootstrap’s live GW).
 *
 * @param {Array<{ id: number, label: string, finished?: boolean, is_current?: boolean }>} options
 * @returns {{ past: typeof options, current: typeof options, upcoming: typeof options }}
 */
export function groupGameWeekOptionsForSelect(options) {
  const past = []
  const current = []
  const upcoming = []
  for (const o of options) {
    if (o.finished) {
      past.push(o)
    } else if (o.is_current) {
      current.push(o)
    } else {
      upcoming.push(o)
    }
  }
  const byId = (a, b) => Number(a.id) - Number(b.id)
  past.sort(byId)
  current.sort(byId)
  upcoming.sort(byId)
  return { past, current, upcoming }
}
