/**
 * Fun-stat chips for the Recap header (preview + post-match).
 *
 * Pure pickers so rebuilds stay deterministic: same player lists → same chips.
 */

function numOrNull(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Highest actual points. Tie-break: bigger overperformance vs xP, then name. */
export function pickTopScorer(players) {
  if (!Array.isArray(players) || players.length === 0) return null
  const ranked = players
    .filter((p) => p?.name && numOrNull(p.pts) != null)
    .map((p) => ({
      name: p.name,
      pts: numOrNull(p.pts),
      xp: numOrNull(p.xp),
      teamName: p.teamName ?? null,
      id: p.id ?? null,
    }))
  if (ranked.length === 0) return null
  ranked.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const da = a.xp == null ? 0 : a.pts - a.xp
    const db = b.xp == null ? 0 : b.pts - b.xp
    if (db !== da) return db - da
    return String(a.name).localeCompare(String(b.name))
  })
  const w = ranked[0]
  return { name: w.name, pts: w.pts, teamName: w.teamName, id: w.id }
}

function waiverScore(p) {
  const xp = numOrNull(p.xp)
  if (xp != null) return xp
  const pts = numOrNull(p.pts)
  return pts != null ? pts : Number.NEGATIVE_INFINITY
}

/** Recent waiver / free-agent add with the best looking number (xP, else pts). */
export function pickBestWaiver(pickups) {
  const list = (pickups || []).filter((p) => p?.name)
  if (list.length === 0) return null
  const sorted = [...list].sort(
    (a, b) => waiverScore(b) - waiverScore(a) || String(a.name).localeCompare(String(b.name)),
  )
  const w = sorted[0]
  if (!Number.isFinite(waiverScore(w)) || waiverScore(w) === Number.NEGATIVE_INFINITY) return null
  const xp = numOrNull(w.xp)
  const pts = numOrNull(w.pts)
  return {
    name: w.name,
    kind: w.kind === 'f' ? 'f' : 'w',
    xp: xp != null ? +xp.toFixed(1) : null,
    pts,
    teamName: w.teamName ?? null,
    id: w.id ?? null,
  }
}

/** First two rounds of an 8-team draft. */
export const EARLY_PICK_LIMIT = 16
/** Projecting below this counts as a bust for the predicted-dud chip. */
export const DUD_XP_THRESHOLD = 3.5

/**
 * Highest-drafted player (earliest overall pick) looking poor.
 *
 * Predicted mode: earliest pick among the first two rounds with xP below
 * {@link DUD_XP_THRESHOLD}; if nobody is that low, the lowest-xP round-1 pick.
 * Actual mode (post-match): lowest points among those early picks, earlier
 * pick winning ties.
 */
export function pickDraftDud(drafted, { useActual = false } = {}) {
  const list = (drafted || []).filter(
    (p) => p?.name && Number.isFinite(Number(p.overallPick)),
  )
  const val = (p) => (useActual ? numOrNull(p.pts) : numOrNull(p.xp))
  const early = list.filter((p) => p.overallPick <= EARLY_PICK_LIMIT && val(p) != null)
  if (early.length === 0) return null

  let winner
  if (useActual) {
    const ranked = [...early].sort((a, b) => val(a) - val(b) || a.overallPick - b.overallPick)
    winner = ranked[0]
  } else {
    const busts = early
      .filter((p) => val(p) < DUD_XP_THRESHOLD)
      .sort((a, b) => a.overallPick - b.overallPick)
    if (busts.length) winner = busts[0]
    else {
      const round1 = early
        .filter((p) => p.round === 1 || p.overallPick <= 8)
        .sort((a, b) => val(a) - val(b) || a.overallPick - b.overallPick)
      winner = round1[0] ?? [...early].sort((a, b) => val(a) - val(b))[0]
    }
  }
  if (!winner) return null
  const xp = numOrNull(winner.xp)
  return {
    name: winner.name,
    overallPick: winner.overallPick,
    xp: xp != null ? +xp.toFixed(1) : null,
    pts: numOrNull(winner.pts),
    teamName: winner.teamName ?? null,
    id: winner.id ?? null,
  }
}
