import { lastWordTeamName, standingsMobileTeamName } from './teamNameUtils.js'

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
  return {
    full: standingsMobileTeamName(name),
    short: lastWordTeamName(name) || standingsMobileTeamName(name),
  }
}

/**
 * Compact live-board / ticket label for portrait width, split so the UI can
 * bold the pick: `{ pick: 'Gimli', detail: '(v Bilbo, GW2)' }`. Both teams
 * appear exactly once — the pick up front, the opponent in the detail.
 * Season-place tickets use the last word of the club (`Gimli — titan`).
 */
export function describeBetCompact(bet, marketById, nameByEntry) {
  const market = marketById.get(Number(bet.market_id))
  const place = seasonKindOf(bet, market)
  if (place) {
    const { short } = pickName(bet, nameByEntry)
    return { pick: short, detail: `— ${PLACE_SHORT[place]}` }
  }
  const p = market?.payload
  const gw = p?.gw ?? bet.gw ?? '?'
  if (!p) return { pick: String(bet.selection), detail: `(GW${gw})` }
  const home = lastWordTeamName(p.homeName) || standingsMobileTeamName(p.homeName)
  const away = lastWordTeamName(p.awayName) || standingsMobileTeamName(p.awayName)
  if (bet.selection === 'home') return { pick: home, detail: `(v ${away}, GW${gw})` }
  if (bet.selection === 'away') return { pick: away, detail: `(v ${home}, GW${gw})` }
  if (bet.selection === 'draw') return { pick: 'Draw', detail: `(${home} v ${away}, GW${gw})` }
  return { pick: String(bet.selection), detail: `(GW${gw})` }
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
