import { lastWordTeamName, standingsMobileTeamName } from './teamNameUtils.js'

/**
 * Compact live-board / ticket label for portrait width.
 * H2H backs name the opponent only (`(v Bilbo, GW2)`); outright uses the
 * last word of the club (`Gimli — outright`).
 *
 * @param {{ selection: string, kind?: string, market_id?: number, gw?: number }} bet
 * @param {Map<number, { kind?: string, payload?: { homeName?: string, awayName?: string, gw?: number } }>} marketById
 * @param {Map<number, string>} nameByEntry
 * @returns {string}
 */
export function describeBetCompact(bet, marketById, nameByEntry) {
  const market = marketById.get(Number(bet.market_id))
  if (bet.kind === 'outright' || market?.kind === 'outright') {
    const name = nameByEntry.get(Number(bet.selection)) ?? `Entry ${bet.selection}`
    const short = lastWordTeamName(name) || standingsMobileTeamName(name)
    return `${short} — outright`
  }
  const p = market?.payload
  const gw = p?.gw ?? bet.gw ?? '?'
  if (!p) return `GW${gw} · ${bet.selection}`
  const home = lastWordTeamName(p.homeName) || standingsMobileTeamName(p.homeName)
  const away = lastWordTeamName(p.awayName) || standingsMobileTeamName(p.awayName)
  if (bet.selection === 'home') return `(v ${away}, GW${gw})`
  if (bet.selection === 'away') return `(v ${home}, GW${gw})`
  if (bet.selection === 'draw') return `Draw (${home} v ${away}, GW${gw})`
  return `${bet.selection} (GW${gw})`
}

/**
 * Longer label for titles / desktop context (full club names).
 *
 * @param {Parameters<typeof describeBetCompact>[0]} bet
 * @param {Parameters<typeof describeBetCompact>[1]} marketById
 * @param {Parameters<typeof describeBetCompact>[2]} nameByEntry
 * @returns {string}
 */
export function describeBet(bet, marketById, nameByEntry) {
  const market = marketById.get(Number(bet.market_id))
  if (bet.kind === 'outright' || market?.kind === 'outright') {
    const name = nameByEntry.get(Number(bet.selection)) ?? `Entry ${bet.selection}`
    return `${standingsMobileTeamName(name)} — outright champion`
  }
  const p = market?.payload
  if (!p) return `GW${bet.gw ?? '?'} matchup — ${bet.selection}`
  const home = standingsMobileTeamName(p.homeName)
  const away = standingsMobileTeamName(p.awayName)
  const pick = bet.selection === 'home' ? home : bet.selection === 'away' ? away : 'Draw'
  return `${pick} (${home} v ${away}, GW${p.gw})`
}
