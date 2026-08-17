/**
 * Shared team-name display helpers.
 *
 * Mobile surfaces outside Standings (Live GW fixture rows, waivers,
 * draft board, etc.) collapse full team names down to the first word
 * so they fit on a phone without `text-overflow: ellipsis` truncating
 * mid-word. Co-locating the helper here keeps that mapping consistent
 * across screens — `firstWord('Crouch End Oashisu') === 'Crouch'`,
 * `firstWord('Hanson of York AFC') === 'Hanson'`.
 *
 * Mobile Standings dropped that first-word collapse: without the
 * manager subtitle there is room for the full club name. The one
 * exception is MSFG, which stays `MSFG` even when the FPL entry is
 * the long Mordorlicious form.
 */

/**
 * First whitespace-delimited word of a team name (or empty string when the
 * input is missing). Pure helper — no DOM access; safe in tests.
 *
 * @param {string | null | undefined} name
 * @returns {string}
 */
export function firstWord(name) {
  if (name == null) return '';
  const parts = String(name).trim().split(/\s+/);
  return parts[0] ?? '';
}

/** Mobile Standings label for Mr Mordorlicious School for Girls. */
export const MSFG_STANDINGS_LABEL = 'MSFG'

/**
 * Whether a team name is the MSFG club (long form, "Mr. MSFG", or "MSFG").
 *
 * @param {string | null | undefined} name
 * @returns {boolean}
 */
export function isMsfgTeamName(name) {
  const n = String(name ?? '').trim().toLowerCase()
  if (!n) return false
  if (n.includes('mordorlicious')) return true
  const compact = n.replace(/[^a-z0-9]/g, '')
  return compact === 'msfg' || compact === 'mrmsfg'
}

/**
 * Team name shown on mobile Standings (hero + table, and Live Table).
 * Full name for every club except MSFG, which always renders as `MSFG`.
 *
 * @param {string | null | undefined} name
 * @returns {string}
 */
export function standingsMobileTeamName(name) {
  if (name == null) return ''
  const trimmed = String(name).trim()
  if (!trimmed) return ''
  if (isMsfgTeamName(trimmed)) return MSFG_STANDINGS_LABEL
  return trimmed
}
