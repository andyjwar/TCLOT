/**
 * Legal best-XI from a 15-man FPL Draft squad.
 *
 * Draft formations: 1 GK, 3–5 DEF, 2–5 MID, 1–3 FWD, exactly 11 starters.
 * "Points left on the bench" here is the usable gap — optimal XI minus the
 * official GW total (autosubs already counted) — not the raw sum of every
 * unused bench player (a third GK cannot start).
 */

import { POS_LIMITS, normalizePos } from './weeklyPreviewLineup.js'

const POS_KEYS = /** @type {const} */ (['GK', 'DEF', 'MID', 'FWD'])

/**
 * Every (GK, DEF, MID, FWD) combo that sums to 11 inside {@link POS_LIMITS}.
 *
 * @returns {{ GK: number, DEF: number, MID: number, FWD: number }[]}
 */
export function legalFormations() {
  const out = []
  const [gkLo, gkHi] = POS_LIMITS.GK
  const [defLo, defHi] = POS_LIMITS.DEF
  const [midLo, midHi] = POS_LIMITS.MID
  const [fwdLo, fwdHi] = POS_LIMITS.FWD
  for (let gk = gkLo; gk <= gkHi; gk++) {
    for (let def = defLo; def <= defHi; def++) {
      for (let mid = midLo; mid <= midHi; mid++) {
        for (let fwd = fwdLo; fwd <= fwdHi; fwd++) {
          if (gk + def + mid + fwd === 11) {
            out.push({ GK: gk, DEF: def, MID: mid, FWD: fwd })
          }
        }
      }
    }
  }
  return out
}

const FORMATIONS = legalFormations()

/**
 * @param {{ id?: number, pos?: string, pts?: number, name?: string }[]} players
 * @param {number} n
 */
function pickTop(players, n) {
  return [...players]
    .sort((a, b) => {
      const d = (Number(b.pts) || 0) - (Number(a.pts) || 0)
      if (d !== 0) return d
      return (Number(a.id) || 0) - (Number(b.id) || 0)
    })
    .slice(0, n)
}

/**
 * Highest-scoring legal 11. When two XIs tie on points, prefer the one that
 * overlaps the manager's actual XI so "who they should have started" is a
 * real swap, not an arbitrary reshuffle.
 *
 * @param {{ id?: number, pos?: string, pts?: number, name?: string }[]} squad
 * @param {{ preferIds?: Iterable<number> }} [opts]
 * @returns {{
 *   xi: { id: number, pos: string, pts: number, name?: string }[],
 *   pts: number,
 *   formation: { GK: number, DEF: number, MID: number, FWD: number },
 * } | null}
 */
export function pickOptimalXi(squad, opts = {}) {
  const byPos = { GK: [], DEF: [], MID: [], FWD: [] }
  for (const p of squad || []) {
    const pos = normalizePos(p?.pos)
    if (!byPos[pos]) continue
    const id = Number(p.id)
    if (!Number.isFinite(id) || id <= 0) continue
    byPos[pos].push({
      id,
      pos,
      pts: Number(p.pts) || 0,
      name: p.name,
    })
  }

  const prefer = new Set(
    [...(opts.preferIds || [])].map(Number).filter((n) => Number.isFinite(n)),
  )

  let best = null
  for (const formation of FORMATIONS) {
    let ok = true
    for (const pos of POS_KEYS) {
      if (byPos[pos].length < formation[pos]) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const xi = POS_KEYS.flatMap((pos) => pickTop(byPos[pos], formation[pos]))
    const pts = xi.reduce((sum, p) => sum + p.pts, 0)
    const overlap = prefer.size
      ? xi.reduce((n, p) => n + (prefer.has(p.id) ? 1 : 0), 0)
      : 0
    if (
      !best ||
      pts > best.pts ||
      (pts === best.pts && overlap > best.overlap)
    ) {
      best = { xi, pts, formation, overlap }
    }
  }
  if (!best) return null
  return { xi: best.xi, pts: best.pts, formation: best.formation }
}

/**
 * Players who ended up in the official XI after autosubs.
 *
 * @param {Array<{ element?: number, position?: number }>} picks
 * @param {Array<{ element_in?: number, element_out?: number }>} autoSubs
 * @returns {number[]}
 */
export function effectiveXiIds(picks, autoSubs) {
  const starters = (picks || [])
    .filter((p) => Number(p.position) >= 1 && Number(p.position) <= 11)
    .map((p) => Number(p.element))
    .filter((id) => Number.isFinite(id) && id > 0)
  const set = new Set(starters)
  for (const s of autoSubs || []) {
    const out = Number(s.element_out)
    const inn = Number(s.element_in)
    if (Number.isFinite(out)) set.delete(out)
    if (Number.isFinite(inn) && inn > 0) set.add(inn)
  }
  return [...set]
}

/**
 * @param {{ id?: number, pos?: string, pts?: number, name?: string }[]} squad
 * @param {number[]} actualXiIds
 * @param {number} actualPts
 */
export function weekBenchForSquad(squad, actualXiIds, actualPts) {
  const official = Number(actualPts)
  const actual = Number.isFinite(official) ? official : 0
  const actualSet = new Set(
    (actualXiIds || []).map(Number).filter((n) => Number.isFinite(n)),
  )
  const best = pickOptimalXi(squad, { preferIds: actualSet })
  const bestXiPts = best ? best.pts : actual
  const benchLeft = Math.max(0, bestXiPts - actual)
  const bestIds = new Set((best?.xi || []).map((p) => p.id))
  const leftOnBench = (best?.xi || [])
    .filter((p) => !actualSet.has(p.id))
    .sort((a, b) => b.pts - a.pts || a.id - b.id)
  const satOut = (squad || [])
    .filter((p) => actualSet.has(Number(p.id)) && !bestIds.has(Number(p.id)))
    .map((p) => ({
      id: Number(p.id),
      pos: normalizePos(p.pos),
      pts: Number(p.pts) || 0,
      name: p.name,
    }))
    .sort((a, b) => a.pts - b.pts || a.id - b.id)
  return {
    actualPts: actual,
    bestXiPts,
    benchLeft,
    formation: best?.formation ?? null,
    leftOnBench,
    satOut,
  }
}

/**
 * @param {number} forPts
 * @param {number} againstPts
 * @returns {'W' | 'D' | 'L'}
 */
export function h2hOutcome(forPts, againstPts) {
  if (forPts > againstPts) return 'W'
  if (forPts < againstPts) return 'L'
  return 'D'
}

/**
 * @param {{ w?: number, d?: number, l?: number }} rec
 */
export function formatRecord(rec) {
  return `${rec?.w ?? 0}–${rec?.d ?? 0}–${rec?.l ?? 0}`
}

/**
 * H2H table points: 3 for a win, 1 for a draw, 0 for a loss.
 *
 * @param {'W' | 'D' | 'L'} outcome
 */
export function leaguePtsFromOutcome(outcome) {
  if (outcome === 'W') return 3
  if (outcome === 'D') return 1
  return 0
}

/**
 * @param {{ w?: number, d?: number, l?: number }} rec
 */
export function leaguePtsFromRecord(rec) {
  return 3 * (Number(rec?.w) || 0) + (Number(rec?.d) || 0)
}

/**
 * @param {number} n
 */
export function formatSwing(n) {
  const v = Number(n) || 0
  return v > 0 ? `+${v}` : `${v}`
}
