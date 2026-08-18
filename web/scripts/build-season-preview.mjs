/**
 * Build the static 26/27 Season Preview (web/public/league-data/season-preview.json).
 *
 * Draft-strength model, per team:
 *  - Each drafted player gets a "weekly score": a 50/50 blend of the
 *    fpl-predictions GW1 forecast (FPL + Understat engine) and their 25/26
 *    FPL total / 38 (players new to the league use the forecast alone, since
 *    the engine already cold-starts them).
 *  - Team strength = the best legal XI (1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD)
 *    maximizing summed weekly score. Bench strength = the other four.
 *  - Weekly sigma per team from the forecast percentile spreads
 *    ((p90 - p10) / 2.56 per player, summed in quadrature).
 *
 * Season projection: Monte Carlo over the real 38-GW H2H schedule in
 * details.json — each match samples both teams' weekly scores
 * (normal, rounded to ints so draws can happen), H2H 3/1/0, then a final
 * table by points → points-for. 5000 iterations.
 *
 * Editorial verdicts live in VERDICTS below so a data refresh never
 * clobbers the writing.
 *
 * Run: node scripts/build-season-preview.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'public/league-data')
const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'))

const picksDoc = read('draft_picks.json')
const predictions = read('predictions.json')
const bootstrap = read('bootstrap_draft.json')
const details = read('details.json')

const SIMS = 5000
const forecastById = new Map(predictions.players.map((p) => [p.id, p]))
const carryById = new Map(bootstrap.elements.map((e) => [e.id, e.total_points]))

/** 3-sentence pundit verdicts, keyed by leagueEntryId. Written against the
 * simulated numbers — regenerate data freely, edit prose here only. */
const VERDICTS = {
  18279:
    'João Pedro in round one is the market’s favourite forward outside Haaland, and Cunha, Gibbs-White and Foden behind him make this the deepest midfield in the draft. Roefs in round 14 is the steal of the entire league — a projected weekly starter with the 109th pick. Best blend of floor and ceiling on any board: the simulation’s title favourite.',
  6849: 'Bruno Fernandes at pick two is the consensus best non-Haaland asset in FPL, and the champions’ defensive stock — Calafiori in round four, Saliba somehow still there in round 14 — gives this squad the strongest back line in the league. The fifteen also carried the second-most 25/26 points of any draft. Runs the favourite to the wire in the simulation: a genuine title side.',
  10173:
    'Nobody drafted more proven scoring: this fifteen returned more 25/26 points than any squad in the league, anchored by Gabriel, Watkins and Bruno Guimarães. Doubling up on keepers with Pickford and Donnarumma by round ten was luxury shopping, but Reijnders in round 14 was a heist. No weakness anywhere — the model’s dark horse with a live title shout.',
  4898: 'Haaland first overall is the no-brainer of the summer — the projected MVP and the one player in this league who wins weeks on his own. The model’s worry is everything after him: Wirtz and Rice are class, but the forward line behind the big man is Šeško and round-13 Solanke. Top-heavy and hostage to one hamstring; brilliant when it clicks.',
  5220: 'Palmer, Gyökeres, Mateta and Ødegaard inside four rounds is the flashiest start anyone had, and Estêvão in round 14 could be the pick of the summer by May. The catch: all that youth and churn returned the second-fewest 25/26 points of any squad, so the floor is unproven. Highest variance in the league — a top-two ceiling with a bottom-three tail.',
  44904:
    'Thiago spearheads the most attack-committed board in the draft — 22 league goals last season — with Semenyo, Szoboszlai and Ekitiké stacked behind him. Gvardiol and Pedro Porro are proper defenders, but the model rates the XI mid-pack once the blend of new clubs and new roles is priced in. Will win shootouts; needs the arm-wrestles to break even.',
  30728:
    'Saka and Cherki are a top-heavy one-two with genuine captain-grade ceilings, and Alisson in round 11 was smart business. Below the front pair it thins fast — Brobbey in round four is a big swing, and the squad carried the third-fewest 25/26 points in the league. Lives and dies by two players; the simulation says more Tuesday nights than title nights.',
  4259: 'Isak in round one is the draft’s boldest bet — Liverpool’s post-Salah striker coming off a season even his backers call a horror show. Mbeumo and Doku bring real pace, but this fifteen carried the fewest 25/26 points of any squad and the model has noticed. If Isak bounces back it looks clever fast; the simulation isn’t waiting up.',
}

/** Group picks by league entry. */
const teams = new Map()
for (const p of picksDoc.picks) {
  if (!teams.has(p.leagueEntryId)) {
    teams.set(p.leagueEntryId, { leagueEntryId: p.leagueEntryId, name: p.teamName, picks: [] })
  }
  teams.get(p.leagueEntryId).picks.push(p)
}

/** Blended weekly score + sigma for one drafted player. */
function playerWeekly(pick) {
  const f = forecastById.get(pick.element)
  const ev = f?.forecast?.totalPoints ?? 0
  const p10 = f?.forecast?.percentiles?.p10 ?? 0
  const p90 = f?.forecast?.percentiles?.p90 ?? 0
  const carry = carryById.get(pick.element) ?? 0
  const weekly = carry > 0 ? 0.5 * ev + 0.5 * (carry / 38) : ev
  return { ev, weekly: +weekly.toFixed(2), sd: (p90 - p10) / 2.56, carry }
}

/** Best legal XI by blended weekly score. */
function bestXI(players) {
  const by = { GKP: [], DEF: [], MID: [], FWD: [] }
  for (const p of players) by[p.pos === 'GK' ? 'GKP' : p.pos]?.push(p)
  for (const k of Object.keys(by)) by[k].sort((a, b) => b.weekly - a.weekly)
  let best = null
  for (let d = 3; d <= 5; d++) {
    for (let m = 2; m <= 5; m++) {
      for (let f = 1; f <= 3; f++) {
        if (1 + d + m + f !== 11) continue
        if (by.DEF.length < d || by.MID.length < m || by.FWD.length < f || by.GKP.length < 1) {
          continue
        }
        const xi = [by.GKP[0], ...by.DEF.slice(0, d), ...by.MID.slice(0, m), ...by.FWD.slice(0, f)]
        const total = xi.reduce((s, p) => s + p.weekly, 0)
        if (!best || total > best.total) best = { total, xi, shape: `${d}-${m}-${f}` }
      }
    }
  }
  return best
}

/** Per-team model inputs. */
const modeled = [...teams.values()].map((t) => {
  const players = t.picks.map((p) => ({ ...p, ...playerWeekly(p) }))
  const { total, xi, shape } = bestXI(players)
  const xiSet = new Set(xi.map((p) => p.overallPick))
  const bench = players.filter((p) => !xiSet.has(p.overallPick))
  const benchTotal = bench.reduce((s, p) => s + p.weekly, 0)
  const sigma = Math.sqrt(xi.reduce((s, p) => s + p.sd * p.sd, 0))
  const carryTotal = players.reduce((s, p) => s + p.carry, 0)
  const keyPlayer = [...players].sort((a, b) => b.weekly - a.weekly)[0]
  return {
    ...t,
    players,
    xi,
    shape,
    strength: total,
    benchStrength: benchTotal,
    sigma,
    carryTotal,
    keyPlayer,
  }
})

/** Steal of the draft per team: biggest gap between league-wide weekly rank
 * and where the player actually went. Only counts picks after round 3 so
 * "Haaland at 1" doesn't register. */
const allDrafted = modeled
  .flatMap((t) => t.players)
  .sort((a, b) => b.weekly - a.weekly)
const weeklyRank = new Map(allDrafted.map((p, i) => [p.overallPick, i + 1]))
for (const t of modeled) {
  t.steal = [...t.players]
    .filter((p) => p.round > 3)
    .sort(
      (a, b) =>
        b.overallPick - weeklyRank.get(b.overallPick) - (a.overallPick - weeklyRank.get(a.overallPick)),
    )[0]
}

/** Monte Carlo over the real schedule. */
const schedule = details.matches.map((m) => ({
  a: Number(m.league_entry_1),
  b: Number(m.league_entry_2),
}))
const ids = modeled.map((t) => t.leagueEntryId)
const idx = new Map(ids.map((id, i) => [id, i]))
const mu = modeled.map((t) => t.strength)
const sd = modeled.map((t) => t.sigma)

let seed = 20262027
function rand() {
  // xorshift32 — deterministic output so rebuilds don't churn the JSON
  seed ^= seed << 13
  seed ^= seed >>> 17
  seed ^= seed << 5
  seed >>>= 0
  return seed / 4294967296
}
function gauss() {
  const u = Math.max(rand(), 1e-9)
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const n = ids.length
const sumPts = new Array(n).fill(0)
const sumPf = new Array(n).fill(0)
const sumWins = new Array(n).fill(0)
const sumDraws = new Array(n).fill(0)
const finishCounts = Array.from({ length: n }, () => new Array(n).fill(0))

for (let s = 0; s < SIMS; s++) {
  const pts = new Array(n).fill(0)
  const pf = new Array(n).fill(0)
  const w = new Array(n).fill(0)
  const d = new Array(n).fill(0)
  for (const m of schedule) {
    const i = idx.get(m.a)
    const j = idx.get(m.b)
    const si = Math.max(0, Math.round(mu[i] + sd[i] * gauss()))
    const sj = Math.max(0, Math.round(mu[j] + sd[j] * gauss()))
    pf[i] += si
    pf[j] += sj
    if (si > sj) {
      pts[i] += 3
      w[i]++
    } else if (sj > si) {
      pts[j] += 3
      w[j]++
    } else {
      pts[i] += 1
      pts[j] += 1
      d[i]++
      d[j]++
    }
  }
  const order = [...Array(n).keys()].sort((a, b) => pts[b] - pts[a] || pf[b] - pf[a])
  order.forEach((teamIdx, rank) => {
    finishCounts[teamIdx][rank]++
  })
  for (let i = 0; i < n; i++) {
    sumPts[i] += pts[i]
    sumPf[i] += pf[i]
    sumWins[i] += w[i]
    sumDraws[i] += d[i]
  }
}

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C']
const byStrength = [...modeled].sort((a, b) => b.strength - a.strength)
const gradeByEntry = new Map(byStrength.map((t, i) => [t.leagueEntryId, GRADES[i]]))

const outTeams = modeled.map((t) => {
  const i = idx.get(t.leagueEntryId)
  const finishes = finishCounts[i]
  const avgFinish = finishes.reduce((s, c, r) => s + c * (r + 1), 0) / SIMS
  return {
    leagueEntryId: t.leagueEntryId,
    name: t.name,
    grade: gradeByEntry.get(t.leagueEntryId),
    shape: `1-${t.shape}`,
    weeklyProjection: +t.strength.toFixed(1),
    benchProjection: +t.benchStrength.toFixed(1),
    carryTotal: t.carryTotal,
    keyPlayer: {
      name: t.keyPlayer.playerName,
      teamShort: t.keyPlayer.teamShort,
      pos: t.keyPlayer.pos,
      weekly: t.keyPlayer.weekly,
      overallPick: t.keyPlayer.overallPick,
    },
    steal: t.steal
      ? {
          name: t.steal.playerName,
          teamShort: t.steal.teamShort,
          pos: t.steal.pos,
          round: t.steal.round,
          overallPick: t.steal.overallPick,
          weekly: t.steal.weekly,
        }
      : null,
    sim: {
      avgFinish: +avgFinish.toFixed(2),
      titlePct: +((finishes[0] / SIMS) * 100).toFixed(1),
      topHalfPct: +((finishes.slice(0, 4).reduce((a, b) => a + b, 0) / SIMS) * 100).toFixed(1),
      lastPct: +((finishes[n - 1] / SIMS) * 100).toFixed(1),
      avgPts: +(sumPts[i] / SIMS).toFixed(1),
      avgPf: Math.round(sumPf[i] / SIMS),
      avgW: +(sumWins[i] / SIMS).toFixed(1),
      avgD: +(sumDraws[i] / SIMS).toFixed(1),
      finishDistribution: finishes.map((c) => +((c / SIMS) * 100).toFixed(1)),
    },
    verdict: VERDICTS[t.leagueEntryId] ?? '',
  }
})

outTeams.sort((a, b) => a.sim.avgFinish - b.sim.avgFinish)

const steals = outTeams
  .map((t) => t.steal && { ...t.steal, teamName: t.name })
  .filter(Boolean)
  .sort((a, b) => b.overallPick - weeklyRank.get(b.overallPick) - (a.overallPick - weeklyRank.get(a.overallPick)))

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  season: '2026-27',
  method: {
    engine: 'fpl-predictions (FPL + Understat)',
    blend: '50% GW1 forecast + 50% 25/26 points ÷ 38 (forecast only for players new to the league)',
    simulations: SIMS,
    schedule: 'real 38-GW H2H fixture list',
  },
  awards: {
    mvp: (() => {
      const t = [...outTeams].sort((a, b) => b.keyPlayer.weekly - a.keyPlayer.weekly)[0]
      return { ...t.keyPlayer, teamName: t.name }
    })(),
    steal: steals[0] ?? null,
  },
  teams: outTeams,
}

writeFileSync(join(dataDir, 'season-preview.json'), JSON.stringify(output, null, 1))
console.log('season-preview.json written:', outTeams.map((t) => `${t.name} ${t.sim.avgFinish}`).join(' | '))
