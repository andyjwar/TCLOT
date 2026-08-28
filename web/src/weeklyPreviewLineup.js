/**
 * Upcoming-GW starting XIs for the pre-match look-forward.
 *
 * Watch-list, predicted points, injury notes, and bench-vs-XI questions all
 * hang off the locked (or copied-forward) 11, not the whole 15-man squad.
 */

export const POS_LIMITS = {
  GK: [1, 1],
  DEF: [3, 5],
  MID: [2, 5],
  FWD: [1, 3],
}

/** Same-position xP gap that counts as a "why is this person benched?" call. */
export const BENCH_XP_GAP = 1.5

/** Injured/unavailable name on the bench is only news if they look like a starter. */
export const MISSING_STAR_XP = 4

export function normalizePos(pos) {
  const p = String(pos ?? '').toUpperCase()
  if (p === 'GKP' || p === 'GK' || p === '1') return 'GK'
  if (p === 'DEF' || p === '2') return 'DEF'
  if (p === 'MID' || p === '3') return 'MID'
  if (p === 'FWD' || p === '4') return 'FWD'
  return p
}

/**
 * Split a draft `entry/{id}/event/{gw}` payload into selected XI vs bench.
 * Pre-match does not apply autosubs — those are after kick-off.
 *
 * @param {{ picks?: Array<{ element?: number, position?: number }> } | null} payload
 */
export function parseDraftPicks(payload) {
  const picks = Array.isArray(payload?.picks) ? payload.picks : []
  const rows = picks
    .map((p) => ({
      id: Number(p.element),
      position: Number(p.position),
    }))
    .filter((r) => Number.isFinite(r.id) && Number.isFinite(r.position) && r.id > 0)
    .sort((a, b) => a.position - b.position)
  return {
    starters: rows.filter((r) => r.position >= 1 && r.position <= 11),
    bench: rows.filter((r) => r.position > 11),
  }
}

export function hasFullXi(parsed) {
  return Array.isArray(parsed?.starters) && parsed.starters.length === 11
}

/**
 * FPL availability for recap copy. 75% "might play" niggles are treated as
 * healthy so the preview does not nag every knock. True outs and ≤50% doubts
 * are the impact cases.
 *
 * @param {{ status?: string, chance_of_playing_this_round?: unknown, chance_of_playing_next_round?: unknown, news?: string } | null} el
 */
export function playerAvailability(el) {
  const status = el?.status ?? 'a'
  const raw = el?.chance_of_playing_this_round ?? el?.chance_of_playing_next_round
  const chance =
    raw === null || raw === undefined || raw === '' ? null : Number(raw)
  const news = String(el?.news ?? '').trim()
  if (status === 'i' || status === 'u' || status === 's') {
    return {
      flag: 'out',
      status,
      chance: Number.isFinite(chance) ? chance : 0,
      news,
    }
  }
  if (Number.isFinite(chance) && chance <= 50) {
    return { flag: 'doubt', status, chance, news }
  }
  if (status === 'd' && (!Number.isFinite(chance) || chance < 75)) {
    return { flag: 'doubt', status, chance: Number.isFinite(chance) ? chance : null, news }
  }
  return { flag: 'ok', status, chance: Number.isFinite(chance) ? chance : null, news }
}

/** Short injury clause for copy: "Groin injury - Unknown return date" → "groin injury". */
export function injuryLabel(news, status) {
  const raw = String(news || '').trim()
  if (raw) {
    const head = raw.split(/\s+[-–—]\s+/)[0].trim()
    if (head) return head.charAt(0).toLowerCase() + head.slice(1)
  }
  if (status === 's') return 'suspension'
  if (status === 'u') return 'unavailable'
  return 'injury'
}

function countByPos(players) {
  const c = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
  for (const p of players || []) {
    const pos = normalizePos(p.pos)
    if (c[pos] != null) c[pos] += 1
  }
  return c
}

export function formationOk(players) {
  if (!Array.isArray(players) || players.length !== 11) return false
  const c = countByPos(players)
  if (c.GK + c.DEF + c.MID + c.FWD !== 11) return false
  for (const [pos, [lo, hi]] of Object.entries(POS_LIMITS)) {
    if (c[pos] < lo || c[pos] > hi) return false
  }
  return true
}

/** Could `bench` legally replace `starter` in this XI? */
export function canReplaceInXi(starters, bench, starter) {
  if (!bench?.id || !starter?.id) return false
  const bPos = normalizePos(bench.pos)
  const sPos = normalizePos(starter.pos)
  if (!bPos || !sPos) return false
  if (bPos === 'GK' || sPos === 'GK') return bPos === 'GK' && sPos === 'GK'
  const next = (starters || []).map((p) =>
    Number(p.id) === Number(starter.id) ? { ...p, pos: bench.pos, id: bench.id } : p,
  )
  return formationOk(next)
}

/**
 * Rebuild an XI + leftover bench from last week's archived starters and the
 * current owned squad. Used when the draft picks API is unreachable, and as
 * a copy-forward until managers change the new GW lineup.
 *
 * @param {{
 *   leagueEntryId: number,
 *   fplEntryId?: number,
 *   priorXi: Array<{ id?: number }> | null,
 *   ownedIds: number[],
 * }} args
 */
export function lineupFromPriorXi({ leagueEntryId, fplEntryId, priorXi, ownedIds }) {
  const starters = (priorXi || [])
    .map((p, i) => ({ id: Number(p.id), position: i + 1 }))
    .filter((r) => Number.isFinite(r.id) && r.id > 0)
    .slice(0, 11)
  const startIds = new Set(starters.map((r) => r.id))
  const bench = (ownedIds || [])
    .map(Number)
    .filter((id) => Number.isFinite(id) && id > 0 && !startIds.has(id))
    .map((id, i) => ({ id, position: 12 + i }))
  return {
    leagueEntryId: Number(leagueEntryId),
    fplEntryId: Number.isFinite(Number(fplEntryId)) ? Number(fplEntryId) : null,
    starters,
    bench,
    source: 'prior-xi',
  }
}

/**
 * Injured / doubtful players that actually change the preview.
 *
 * Priority: starting while out, starting at ≤50%, then a missing star
 * (out of the XI, xP ≥ {@link MISSING_STAR_XP} or they started last week).
 *
 * @param {object[]} starters
 * @param {object[]} bench
 * @param {{ prevStartIds?: number[] }} [opts]
 */
export function pickInjuryImpacts(starters, bench, { prevStartIds = [] } = {}) {
  const prev = new Set((prevStartIds || []).map(Number))
  const startIds = new Set((starters || []).map((p) => Number(p.id)))
  const hits = []

  for (const p of starters || []) {
    if (!p?.name) continue
    if (p.flag === 'out') {
      hits.push({ ...p, kind: 'starting-out', inXi: true })
    } else if (p.flag === 'doubt' && Number(p.chance) <= 50) {
      hits.push({ ...p, kind: 'starting-doubt', inXi: true })
    }
  }

  for (const p of [...(starters || []), ...(bench || [])]) {
    if (!p?.name || p.flag !== 'out') continue
    if (startIds.has(Number(p.id))) continue
    const notable = Number(p.xp) >= MISSING_STAR_XP || prev.has(Number(p.id))
    if (notable) hits.push({ ...p, kind: 'missing', inXi: false })
  }

  const rank = { 'starting-out': 0, 'starting-doubt': 1, missing: 2 }
  hits.sort(
    (a, b) =>
      (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9) ||
      (Number(b.xp) || 0) - (Number(a.xp) || 0) ||
      String(a.name).localeCompare(String(b.name)),
  )
  return hits.slice(0, 2).map((p) => ({
    id: p.id ?? null,
    name: p.name,
    pos: p.pos ?? '',
    xp: Number.isFinite(Number(p.xp)) ? Number(p.xp) : null,
    flag: p.flag,
    status: p.status ?? null,
    chance: p.chance ?? null,
    news: p.news ?? '',
    kind: p.kind,
    inXi: p.inXi,
    injury: injuryLabel(p.news, p.status),
  }))
}

/**
 * The worst healthy-bench vs starter decision on this side.
 * Same-position always; cross-position only when the swapped XI is legal.
 *
 * @param {object[]} starters
 * @param {object[]} bench
 */
export function pickBenchBlunder(starters, bench) {
  const xi = starters || []
  const healthyBench = (bench || []).filter(
    (p) => p?.name && p.flag === 'ok' && !String(p.news || '').trim(),
  )
  let best = null
  for (const b of healthyBench) {
    const bx = Number(b.xp)
    if (!Number.isFinite(bx)) continue
    for (const s of xi) {
      if (!s?.name) continue
      if (!canReplaceInXi(xi, b, s)) continue
      const sx = Number(s.xp)
      if (!Number.isFinite(sx)) continue
      const gap = bx - sx
      const injuredStarter = s.flag === 'out' || s.flag === 'doubt'
      const enough = injuredStarter ? gap >= 0.5 : gap >= BENCH_XP_GAP
      if (!enough) continue
      const score = injuredStarter ? gap + 5 : gap
      if (!best || score > best.score) {
        best = { bench: b, starter: s, gap, score }
      }
    }
  }
  if (!best) return null
  const slim = (p) => ({
    id: p.id ?? null,
    name: p.name,
    pos: p.pos ?? '',
    xp: Number.isFinite(Number(p.xp)) ? Number(p.xp) : null,
    flag: p.flag ?? 'ok',
  })
  return {
    bench: slim(best.bench),
    starter: slim(best.starter),
    gap: +best.gap.toFixed(1),
  }
}

export function sumStarterXp(starters) {
  let sum = 0
  let n = 0
  for (const p of starters || []) {
    const xp = Number(p.xp)
    if (!Number.isFinite(xp)) continue
    sum += xp
    n += 1
  }
  if (n === 0) return null
  return Math.round(sum * 10) / 10
}

/** Drop unavailable starters from the watch list so keys are people who can play. */
export function watchableXi(starters) {
  return (starters || []).filter((p) => p && p.flag !== 'out')
}
