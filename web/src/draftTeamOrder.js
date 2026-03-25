/**
 * Draft-slot order for UI (team filter, Draft Quality table): by each manager's
 * earliest overall pick (their round-1 slot in a standard snake draft).
 */

/** @param {{ entryId?: unknown, overallPick?: unknown }[]} picks */
export function minOverallPickByEntryId(picks) {
  const m = new Map()
  for (const p of picks || []) {
    const oid = Number(p.overallPick)
    if (!Number.isFinite(oid)) continue
    const eid = Number(p.entryId)
    if (!Number.isFinite(eid)) continue
    const prev = m.get(eid)
    if (prev == null || oid < prev) m.set(eid, oid)
  }
  return m
}

/**
 * @param {{ entry_id?: unknown, entry_name?: string }[]} leagueEntries
 * @param {Map<number, number>} minByEntry from `minOverallPickByEntryId`
 */
export function compareLeagueEntriesByDraftSlot(a, b, minByEntry) {
  const fa = minByEntry.get(Number(a?.entry_id))
  const fb = minByEntry.get(Number(b?.entry_id))
  if (fa != null && fb != null && fa !== fb) return fa - fb
  if (fa != null && fb == null) return -1
  if (fa == null && fb != null) return 1
  return String(a?.entry_name ?? '').localeCompare(String(b?.entry_name ?? ''), undefined, {
    sensitivity: 'base',
  })
}
