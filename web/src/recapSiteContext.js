/**
 * Index the site datasets Glance recap/preview copy can quote:
 * bench points, season title model, draft picks, projections-history XIs,
 * and finished H2Hs.
 */

export function padGw(n) {
  return String(Number(n)).padStart(2, '0')
}

export function indexRecapSite({
  benchPoints = null,
  seasonPredictions = null,
  draftPicks = null,
  historyByGw = {},
  matches = [],
} = {}) {
  const benchByEntry = new Map()
  for (const t of benchPoints?.teams || []) {
    const id = Number(t.leagueEntryId)
    if (Number.isFinite(id)) benchByEntry.set(id, t)
  }
  const predByEntry = new Map()
  for (const t of seasonPredictions?.current?.teams || []) {
    const id = Number(t.leagueEntryId)
    if (Number.isFinite(id)) predByEntry.set(id, t)
  }
  const pickByElement = new Map()
  for (const p of draftPicks?.picks || []) {
    const id = Number(p.element)
    if (Number.isFinite(id)) pickByElement.set(id, p)
  }
  return {
    benchByEntry,
    predByEntry,
    pickByElement,
    historyByGw: historyByGw || {},
    matches: Array.isArray(matches) ? matches : [],
  }
}

export function benchWeek(site, entryId, gw) {
  const t = site?.benchByEntry?.get(Number(entryId))
  if (!t) return null
  return (t.weeks || []).find((w) => Number(w.gw) === Number(gw)) || null
}

function historyDoc(site, gw) {
  const bag = site?.historyByGw || {}
  return bag[gw] || bag[String(gw)] || null
}

function flattenXi(row) {
  return [...(row?.xi1 || []), ...(row?.xi2 || [])]
}

export function playerPtsInHistory(site, playerId, gw) {
  const id = Number(playerId)
  if (!Number.isFinite(id)) return null
  const hist = historyDoc(site, gw)
  for (const row of hist?.h2h || []) {
    for (const p of flattenXi(row)) {
      if (Number(p.id) === id && Number.isFinite(p.pts)) return p.pts
    }
  }
  return null
}

export function playerPriorPts(site, playerId, beforeGw) {
  const gws = Object.keys(site?.historyByGw || {})
    .map(Number)
    .filter((g) => Number.isFinite(g) && g < Number(beforeGw))
    .sort((a, b) => a - b)
  const out = []
  for (const gw of gws) {
    const pts = playerPtsInHistory(site, playerId, gw)
    if (pts != null) out.push({ gw, pts })
  }
  return out
}

export function draftPickFor(site, playerId) {
  return site?.pickByElement?.get(Number(playerId)) || null
}

export function titleModelFor(site, entryId) {
  return site?.predByEntry?.get(Number(entryId)) || null
}

function pointsFor(match, entryId) {
  if (match.league_entry_1 === entryId) return Number(match.league_entry_1_points)
  if (match.league_entry_2 === entryId) return Number(match.league_entry_2_points)
  return NaN
}

/** Finished H2H form through `gw` (inclusive on recap, exclusive on preview). */
export function formThrough(site, entryId, gw, preview = false) {
  const id = Number(entryId)
  const cutoff = preview ? Number(gw) : Number(gw) + 1
  const mine = (site?.matches || []).filter((m) => {
    if (!m?.finished) return false
    const ev = Number(m.event)
    if (Number.isFinite(ev) && ev >= cutoff) return false
    return m.league_entry_1 === id || m.league_entry_2 === id
  })
  let w = 0
  let d = 0
  let l = 0
  const recent = []
  for (const m of mine) {
    const ours = pointsFor(m, id)
    const theirs = pointsFor(
      m,
      m.league_entry_1 === id ? m.league_entry_2 : m.league_entry_1,
    )
    if (!Number.isFinite(ours) || !Number.isFinite(theirs)) continue
    if (ours > theirs) {
      w += 1
      recent.push('W')
    } else if (ours < theirs) {
      l += 1
      recent.push('L')
    } else {
      d += 1
      recent.push('D')
    }
  }
  return { w, d, l, played: w + d + l, recent }
}
