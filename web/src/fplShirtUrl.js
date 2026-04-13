/**
 * Official FPL kit PNG on fantasy.premierleague.com.
 * Uses team *code* (`teams[].code`, badge `t{code}.png`), not internal FPL `team` id (1–20).
 * Filenames match the live site: `shirt_{code}[_1]-{width}.png` (GKP adds `_1` before the dash).
 * @param {number|string|null|undefined} teamCode
 * @param {number|string|null|undefined} elementTypeId — `1` = goalkeeper strip
 * @param {{ width?: 66|110|220, folder?: 'standard'|'special' }} [opts]
 * @returns {string|null}
 */
export function fplShirtImageUrl(teamCode, elementTypeId, opts = {}) {
  const folder = opts.folder === 'special' ? 'special' : 'standard';
  let width = Number(opts.width);
  if (![66, 110, 220].includes(width)) width = 66;
  const c = Number(teamCode);
  if (!Number.isFinite(c)) return null;
  const gk = Number(elementTypeId) === 1 ? '_1' : '';
  return `https://fantasy.premierleague.com/dist/img/shirts/${folder}/shirt_${c}${gk}-${width}.png`;
}
