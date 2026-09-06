/**
 * Season + per-GW fixture report for the Stats "bench points" section.
 *
 * Input is one row per team per finished GW (already scored). Output is
 * season totals, adjusted W–D–L from best-XI scores, and the H2H cards
 * for each gameweek.
 */

import { formatRecord, h2hOutcome, weekBenchForSquad } from './bestXi.js'

function emptyRecord() {
  return { w: 0, d: 0, l: 0 }
}

function applyOutcome(rec, outcome) {
  if (outcome === 'W') rec.w += 1
  else if (outcome === 'L') rec.l += 1
  else rec.d += 1
}

function slimPlayer(p) {
  if (!p) return null
  return {
    id: Number(p.id),
    name: p.name ?? '',
    pos: p.pos,
    pts: Number(p.pts) || 0,
  }
}

/**
 * @param {{
 *   teams: { leagueEntryId: number, fplEntryId?: number, teamName: string }[],
 *   weeks: {
 *     gw: number,
 *     squads: Record<number, {
 *       players: { id: number, pos: string, pts: number, name?: string }[],
 *       actualXiIds: number[],
 *       actualPts: number,
 *       officialBenchPts?: number | null,
 *     }>,
 *     fixtures: {
 *       homeId: number,
 *       awayId: number,
 *       homeName?: string,
 *       awayName?: string,
 *       homePts: number,
 *       awayPts: number,
 *     }[],
 *   }[],
 * }} input
 */
export function buildBenchPointsReport(input) {
  const teams = (input?.teams || []).map((t) => ({
    leagueEntryId: Number(t.leagueEntryId),
    fplEntryId: t.fplEntryId != null ? Number(t.fplEntryId) : null,
    teamName: t.teamName || `Team ${t.leagueEntryId}`,
  }))
  const byId = new Map(teams.map((t) => [t.leagueEntryId, t]))

  /** @type {Map<number, {
   *   leagueEntryId: number,
   *   fplEntryId: number | null,
   *   teamName: string,
   *   actualPts: number,
   *   bestXiPts: number,
   *   benchLeft: number,
   *   officialBenchPts: number,
   *   weeksPlayed: number,
   *   actualRecord: ReturnType<typeof emptyRecord>,
   *   bestRecord: ReturnType<typeof emptyRecord>,
   *   weeks: object[],
   * }>} */
  const season = new Map()
  for (const t of teams) {
    season.set(t.leagueEntryId, {
      ...t,
      actualPts: 0,
      bestXiPts: 0,
      benchLeft: 0,
      officialBenchPts: 0,
      weeksPlayed: 0,
      actualRecord: emptyRecord(),
      bestRecord: emptyRecord(),
      weeks: [],
    })
  }

  const fixtures = []
  const gameweeks = []

  for (const week of input?.weeks || []) {
    const gw = Number(week.gw)
    if (!Number.isFinite(gw) || gw < 1) continue
    gameweeks.push(gw)
    const weekRows = new Map()
    for (const [idRaw, squad] of Object.entries(week.squads || {})) {
      const id = Number(idRaw)
      if (!season.has(id) || !squad) continue
      const row = weekBenchForSquad(
        squad.players || [],
        squad.actualXiIds || [],
        squad.actualPts,
      )
      const officialBench =
        squad.officialBenchPts == null ? 0 : Number(squad.officialBenchPts) || 0
      weekRows.set(id, { ...row, officialBenchPts: officialBench })
      const acc = season.get(id)
      acc.actualPts += row.actualPts
      acc.bestXiPts += row.bestXiPts
      acc.benchLeft += row.benchLeft
      acc.officialBenchPts += officialBench
      acc.weeksPlayed += 1
      acc.weeks.push({
        gw,
        actualPts: row.actualPts,
        bestXiPts: row.bestXiPts,
        benchLeft: row.benchLeft,
        officialBenchPts: officialBench,
        leftOnBench: row.leftOnBench.map(slimPlayer),
        satOut: row.satOut.map(slimPlayer),
      })
    }

    for (const fx of week.fixtures || []) {
      const homeId = Number(fx.homeId)
      const awayId = Number(fx.awayId)
      if (!Number.isFinite(homeId) || !Number.isFinite(awayId)) continue
      const homeWeek = weekRows.get(homeId)
      const awayWeek = weekRows.get(awayId)
      if (!homeWeek || !awayWeek) continue
      const homeName = fx.homeName || byId.get(homeId)?.teamName || `Team ${homeId}`
      const awayName = fx.awayName || byId.get(awayId)?.teamName || `Team ${awayId}`
      const actualHome = homeWeek.actualPts
      const actualAway = awayWeek.actualPts
      const bestHome = homeWeek.bestXiPts
      const bestAway = awayWeek.bestXiPts
      const actualHomeOut = h2hOutcome(actualHome, actualAway)
      const actualAwayOut = h2hOutcome(actualAway, actualHome)
      const bestHomeOut = h2hOutcome(bestHome, bestAway)
      const bestAwayOut = h2hOutcome(bestAway, bestHome)
      const homeAcc = season.get(homeId)
      const awayAcc = season.get(awayId)
      if (homeAcc) {
        applyOutcome(homeAcc.actualRecord, actualHomeOut)
        applyOutcome(homeAcc.bestRecord, bestHomeOut)
      }
      if (awayAcc) {
        applyOutcome(awayAcc.actualRecord, actualAwayOut)
        applyOutcome(awayAcc.bestRecord, bestAwayOut)
      }
      fixtures.push({
        gw,
        homeId,
        awayId,
        homeName,
        awayName,
        actualHome,
        actualAway,
        bestHome,
        bestAway,
        actualResult: actualHomeOut === 'W' ? 'H' : actualHomeOut === 'L' ? 'A' : 'D',
        bestResult: bestHomeOut === 'W' ? 'H' : bestHomeOut === 'L' ? 'A' : 'D',
        flipped: actualHomeOut !== bestHomeOut,
        homeLeft: homeWeek.benchLeft,
        awayLeft: awayWeek.benchLeft,
        homeLeftOnBench: homeWeek.leftOnBench.map(slimPlayer),
        awayLeftOnBench: awayWeek.leftOnBench.map(slimPlayer),
      })
    }
  }

  const teamRows = [...season.values()]
    .map((t) => ({
      leagueEntryId: t.leagueEntryId,
      fplEntryId: t.fplEntryId,
      teamName: t.teamName,
      actualPts: t.actualPts,
      bestXiPts: t.bestXiPts,
      benchLeft: t.benchLeft,
      officialBenchPts: t.officialBenchPts,
      weeksPlayed: t.weeksPlayed,
      actualRecord: formatRecord(t.actualRecord),
      bestRecord: formatRecord(t.bestRecord),
      actualW: t.actualRecord.w,
      actualD: t.actualRecord.d,
      actualL: t.actualRecord.l,
      bestW: t.bestRecord.w,
      bestD: t.bestRecord.d,
      bestL: t.bestRecord.l,
      weeks: t.weeks,
    }))
    .sort((a, b) => {
      const left = b.benchLeft - a.benchLeft
      if (left !== 0) return left
      const best = b.bestXiPts - a.bestXiPts
      if (best !== 0) return best
      return (a.teamName || '').localeCompare(b.teamName || '')
    })

  gameweeks.sort((a, b) => a - b)

  return {
    schemaVersion: 1,
    gameweeks,
    teams: teamRows,
    fixtures,
  }
}

/**
 * @param {object[]} fixtures
 * @param {number} gw
 */
export function fixturesForGw(fixtures, gw) {
  const n = Number(gw)
  return (fixtures || []).filter((f) => Number(f.gw) === n)
}

/**
 * Short "Salah 12" list for the leftover starters they sat.
 *
 * @param {{ name?: string, pts?: number }[]} players
 * @param {number} [limit]
 */
export function formatBenchMisses(players, limit = 2) {
  const rows = (players || []).filter((p) => (Number(p.pts) || 0) > 0)
  if (!rows.length) return ''
  return rows
    .slice(0, limit)
    .map((p) => `${p.name || 'Player'} ${Number(p.pts) || 0}`)
    .join(', ')
}
