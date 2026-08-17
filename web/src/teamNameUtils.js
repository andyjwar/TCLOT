/**
 * Shared team-name display helpers.
 *
 * Mobile surfaces (Standings hero/table, Live GW fixture rows, etc.) collapse
 * full team names down to a short label so they fit on a phone without
 * `text-overflow: ellipsis` truncating mid-word. Co-locating the helper here
 * keeps that mapping consistent across screens.
 *
 * Known teams get a curated label from {@link MOBILE_SHORT_NAMES}; anything
 * else falls back to the first whitespace-delimited word —
 * `firstWord('Crouch End Oashisu') === 'Crouch'`.
 */

/** Curated mobile labels for the 2026-27 squads, keyed by full `entry_name`. */
const MOBILE_SHORT_NAMES = new Map([
  ['Atlético Bilbo', 'Atleti Bilbo'],
  ['Toronto Gimli', 'To. Gimli'],
  ['Suffolk Sméagol', 'Sméagol'],
  ['Rokesly Regorasu', 'Regorasu'],
  ['Hackney Rohirrim', 'Rohirrim'],
  ['Mordor S.F.G', 'MSFG'],
  ['Seoul Shire', 'Seoul Shire'],
  ['Brampton Balrogs', 'Balrogs'],
]);

/**
 * Short display label for a team name: curated override when known, otherwise
 * the first whitespace-delimited word (or empty string when the input is
 * missing). Pure helper — no DOM access; safe in tests.
 *
 * @param {string | null | undefined} name
 * @returns {string}
 */
export function firstWord(name) {
  if (name == null) return '';
  const trimmed = String(name).trim();
  const curated = MOBILE_SHORT_NAMES.get(trimmed);
  if (curated) return curated;
  return trimmed.split(/\s+/)[0] ?? '';
}
