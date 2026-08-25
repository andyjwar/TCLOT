/**
 * Build the draft board from the FPL Draft API's true pick log.
 *
 * `GET draft.premierleague.com/api/draft/{draftId}/choices` returns every pick in
 * the exact order it was made (auto-picks included), so it is the source of truth
 * for the board. Prefer it over `reconstructDraftPicks` (which infers within-team
 * order from pre-draft `draft_rank` and therefore mis-orders reaches — e.g. a
 * manager taking João Pedro before Gibbs-White shows Gibbs-White in the earlier
 * slot because his `draft_rank` is lower).
 *
 * Choice fields used: `element` (draft element id), `entry` (league_entry id —
 * matches `league_entries[].id`, NOT `entry_id`), `index` (1-based overall pick),
 * and optionally `round` / `pick` (within-round). Missing round/pick are derived
 * from the overall index and team count.
 */

const POS_SHORT = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' }

/** Accept `{ choices: [...] }`, `{ picks: [...] }`, or a bare array. */
export function extractChoicesArray(raw) {
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.choices)) return raw.choices
  if (Array.isArray(raw?.picks)) return raw.picks
  return null
}

/**
 * Pick the relevant draft id from `details.league.drafts`.
 * FPL keeps one draft per league; when several exist prefer the one for the
 * league start event, then the completed one, then the first.
 * @param {object} details league details.json
 * @returns {number|null}
 */
export function draftIdFromDetails(details) {
  const drafts = details?.league?.drafts
  if (!Array.isArray(drafts) || !drafts.length) return null
  const startEvent = Number(details?.league?.start_event)
  const valid = drafts.filter((d) => Number.isFinite(Number(d?.id)))
  if (!valid.length) return null
  const byStart = Number.isFinite(startEvent)
    ? valid.find((d) => Number(d?.event) === startEvent)
    : null
  const completed = valid.find((d) => d?.draft_completed)
  const chosen = byStart || completed || valid[0]
  return Number(chosen.id)
}

/**
 * @param {object[]} choicesRaw from `/draft/{id}/choices` (any of the accepted shapes)
 * @param {object[]} leagueEntries details.json `league_entries`
 * @param {Map<number, object>} elementById bootstrap_draft.elements by id
 * @param {Map<number, object>} [teamById] bootstrap teams by id
 * @param {number} [squadSize] expected picks per team (default 15)
 * @returns {object[]|null} pick rows in overall order, or null when the log is unusable
 */
export function picksFromDraftChoices(
  choicesRaw,
  leagueEntries,
  elementById,
  teamById = new Map(),
  squadSize = 15,
) {
  const choices = extractChoicesArray(choicesRaw)
  if (!Array.isArray(choices) || !choices.length) return null

  const n = (leagueEntries || []).length
  if (n === 0) return null

  // league_entry id → entry. Choices reference `entry` = league_entry `id`.
  const entryByLeagueId = new Map()
  for (const e of leagueEntries) {
    if (e?.id != null) entryByLeagueId.set(Number(e.id), e)
  }

  const usable = choices
    .filter((c) => c && c.element != null && c.entry != null && Number.isFinite(Number(c.index)))
    .map((c) => ({
      index: Number(c.index),
      round: Number.isFinite(Number(c.round)) ? Number(c.round) : null,
      pick: Number.isFinite(Number(c.pick)) ? Number(c.pick) : null,
      element: Number(c.element),
      entry: Number(c.entry),
    }))
  if (!usable.length) return null

  usable.sort((a, b) => a.index - b.index)

  const out = []
  for (const c of usable) {
    const entry = entryByLeagueId.get(c.entry)
    if (!entry) return null // choices reference a manager not in this league → unusable
    const el = elementById.get(c.element)
    const tm = teamById.get(el?.team)
    const overall = c.index
    out.push({
      overallPick: overall,
      round: c.round ?? Math.ceil(overall / n),
      pickInRound: c.pick ?? ((overall - 1) % n) + 1,
      entryId: entry.entry_id,
      leagueEntryId: entry.id,
      teamName: String(entry.entry_name ?? '').trim() || `Team ${entry.entry_id}`,
      element: c.element,
      playerName: el?.web_name ?? `Player #${c.element}`,
      teamShort: tm?.short_name ?? '—',
      pos: POS_SHORT[el?.element_type] ?? '—',
    })
  }

  // Require a full board (n * squadSize) so a truncated/in-progress log never
  // silently replaces the reconstruction fallback with a partial one.
  if (Number.isFinite(squadSize) && squadSize > 0 && out.length !== n * squadSize) {
    return null
  }
  return out
}
