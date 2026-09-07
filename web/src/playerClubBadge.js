/**
 * Official PL club crest for a bootstrap team `code`.
 *
 * @param {number | string | null | undefined} teamCode
 * @returns {string | null}
 */
export function plClubBadgeUrl(teamCode) {
  const n = Number(teamCode)
  if (!Number.isFinite(n) || n <= 0) return null
  return `https://resources.premierleague.com/premierleague/badges/50/t${n}.png`
}

/**
 * Map FPL element id → club crest + short name from `bootstrap_draft.json`.
 *
 * @param {{ teams?: { id?: number, code?: number, short_name?: string }[], elements?: { id?: number, team?: number }[] } | null | undefined} boot
 * @returns {Map<number, { badgeUrl: string | null, teamShort: string }>}
 */
export function clubBadgeIndexFromBootstrap(boot) {
  const teams = new Map()
  for (const t of boot?.teams || []) {
    const id = Number(t?.id)
    if (Number.isFinite(id)) teams.set(id, t)
  }
  /** @type {Map<number, { badgeUrl: string | null, teamShort: string }>} */
  const out = new Map()
  for (const el of boot?.elements || []) {
    const id = Number(el?.id)
    if (!Number.isFinite(id)) continue
    const tm = teams.get(Number(el.team))
    out.set(id, {
      badgeUrl: plClubBadgeUrl(tm?.code),
      teamShort: tm?.short_name ? String(tm.short_name) : '',
    })
  }
  return out
}
