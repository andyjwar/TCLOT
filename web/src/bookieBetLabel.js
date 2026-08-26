import {
  lastWordTeamName,
  standingsMobileTeamName,
  threeLetterTeamName,
} from './teamNameUtils.js'

/**
 * Longest compact label the description column fits before the browser
 * ellipsises it. Over this, club names collapse to three-letter codes rather
 * than losing the tail of the row ("Sméagol (v Balrogs…").
 */
const COMPACT_LABEL_BUDGET = 20

export const SEASON_PLACE_KINDS = ['outright', 'titan', 'minnow', 'last']

const PLACE_SHORT = {
  outright: 'outright',
  titan: 'titan',
  minnow: 'minnow',
  last: 'last',
}

const PLACE_FULL = {
  outright: 'outright champion',
  titan: 'titan (top 4)',
  minnow: 'minnow (bottom 4)',
  last: 'last place',
}

function seasonKindOf(bet, market) {
  const kind = bet.kind || market?.kind
  return SEASON_PLACE_KINDS.includes(kind) ? kind : null
}

function pickName(bet, nameByEntry) {
  const name = nameByEntry.get(Number(bet.selection)) ?? `Entry ${bet.selection}`
  const short = lastWordTeamName(name) || standingsMobileTeamName(name)
  return {
    full: standingsMobileTeamName(name),
    short,
    code: threeLetterTeamName(name) || short,
  }
}

/**
 * Compact live-board / ticket label for portrait width, split so the UI can
 * bold the pick: `{ pick: 'Gimli', detail: '(v Bilbo)' }`. Both teams appear
 * exactly once — the pick up front, the opponent in the detail. Season-place
 * tickets use the last word of the club (`Gimli — titan`).
 *
 * No gameweek is shown: only one gameweek is ever open to bet on, so it was
 * the same number on every row. Labels too wide for the column fall back to
 * three-letter codes (`Draw (REG v SHI)`).
 */
export function describeBetCompact(bet, marketById, nameByEntry) {
  const market = marketById.get(Number(bet.market_id))
  const place = seasonKindOf(bet, market)
  if (place) {
    const { short, code } = pickName(bet, nameByEntry)
    const tag = `— ${PLACE_SHORT[place]}`
    return fit({ pick: short, detail: tag }, { pick: code, detail: tag })
  }
  const p = market?.payload
  if (!p) return { pick: String(bet.selection), detail: '' }

  const home = lastWordTeamName(p.homeName) || standingsMobileTeamName(p.homeName)
  const away = lastWordTeamName(p.awayName) || standingsMobileTeamName(p.awayName)
  const homeCode = threeLetterTeamName(p.homeName) || home
  const awayCode = threeLetterTeamName(p.awayName) || away

  if (bet.selection === 'home') {
    return fit({ pick: home, detail: `(v ${away})` }, { pick: homeCode, detail: `(v ${awayCode})` })
  }
  if (bet.selection === 'away') {
    return fit({ pick: away, detail: `(v ${home})` }, { pick: awayCode, detail: `(v ${homeCode})` })
  }
  if (bet.selection === 'draw') {
    return fit(
      { pick: 'Draw', detail: `(${home} v ${away})` },
      { pick: 'Draw', detail: `(${homeCode} v ${awayCode})` },
    )
  }
  return { pick: String(bet.selection), detail: '' }
}

/** The full label when it fits the column, else the abbreviated one. */
function fit(full, short) {
  const width = ({ pick, detail }) => pick.length + (detail ? detail.length + 1 : 0)
  return width(full) <= COMPACT_LABEL_BUDGET ? full : short
}

/** Longer label for titles / desktop context (full club names). */
export function describeBet(bet, marketById, nameByEntry) {
  const market = marketById.get(Number(bet.market_id))
  const place = seasonKindOf(bet, market)
  if (place) {
    const { full } = pickName(bet, nameByEntry)
    return `${full} — ${PLACE_FULL[place]}`
  }
  const p = market?.payload
  if (!p) return `GW${bet.gw ?? '?'} matchup — ${bet.selection}`
  const home = standingsMobileTeamName(p.homeName)
  const away = standingsMobileTeamName(p.awayName)
  const pick = bet.selection === 'home' ? home : bet.selection === 'away' ? away : 'Draw'
  return `${pick} (${home} v ${away}, GW${p.gw})`
}
