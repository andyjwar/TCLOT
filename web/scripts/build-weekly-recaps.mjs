#!/usr/bin/env node
/**
 * Weekly recaps + pre-match look-forwards (web/public/league-data/weekly-recaps.json).
 *
 * Recap entries (`gameweeks`) — one per finished gameweek:
 *  - `model`: odds vs reality for the week
 *  - `matchups`: score, pre-match call, template recap paragraph, table context
 *  - `superlatives`: week high, closest match, star player
 *
 * Preview entries (`previews`) — one per finished GW (frozen from the archive)
 * and the next unfinished GW (live model / bookie sheet):
 *  - win/draw/win percents, projected points, watch-list players
 *  - bookie fractions, recent waivers, last-week form
 *  - template look-forward paragraph (bookie lean / stakes / waivers / form / lore)
 *
 * Fully regenerated each build from details.json + season-predictions.json —
 * historical recaps stay deterministic once a GW is done.
 *
 * Run AFTER build-season-predictions.mjs (and bookie-markets when present):
 *   node scripts/build-weekly-recaps.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  recapFactsForGw,
  findArchivedH2hRow,
  archivedXi,
  sidePlayerFacts,
  h2hSeriesAsOf,
  ranksAsOf,
  bankedTable,
  streakAsOf,
  matchFavorite,
} from '../src/seasonPredictionsModel.js'
import { matchupRecapSentences } from '../src/weeklyRecapText.js'
import {
  matchupPreviewSentences,
  oddsPercents,
  watchPlayersFromXi,
  watchPlayersFromForecasts,
  formFromXi,
} from '../src/weeklyPreviewText.js'
import { decimalOddsToFraction, probToFractionalOdds } from '../src/oddsFormat.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'public/league-data')
const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'))

/* Fail soft: no inputs → no tab, but never a broken deploy. */
let details
let predictions
try {
  details = read('details.json')
  predictions = read('season-predictions.json')
} catch (err) {
  console.warn('build-weekly-recaps: skip —', err.message)
  process.exit(0)
}
if (!predictions?.current?.teams?.length) {
  console.warn('build-weekly-recaps: skip — season-predictions.json has no teams')
  process.exit(0)
}

const matches = details.matches ?? []
const entryIds = predictions.current.teams.map((t) => Number(t.leagueEntryId))
const nameById = new Map(
  predictions.current.teams.map((t) => [Number(t.leagueEntryId), t.name]),
)

/* Manager (human) names + the FPL entry-id bridge. details.json league_entries
 * carry both the league id (`id`) and the FPL entry id (`entry_id`) plus the
 * manager's name — transactions key off the FPL entry id, recaps off the
 * league id, so we need the map in both directions. */
const leagueEntries = details.league_entries ?? []
const managerById = new Map()
const leagueIdByFplEntry = new Map()
for (const e of leagueEntries) {
  const leagueId = Number(e.id)
  const fplEntry = Number(e.entry_id)
  const first = (e.player_first_name ?? '').trim()
  const last = (e.player_last_name ?? '').trim()
  const manager = [first, last].filter(Boolean).join(' ') || null
  if (Number.isFinite(leagueId)) managerById.set(leagueId, manager)
  if (Number.isFinite(fplEntry) && Number.isFinite(leagueId)) {
    leagueIdByFplEntry.set(fplEntry, leagueId)
  }
}

/* Successful waiver ('w') / free-agent ('f') pickups, grouped by league id.
 * Each entry records the element added, the GW it landed, and the channel so
 * the recap can say "waiver pickup" vs "free-agent punt". Fail soft: no file
 * or an empty list just means no pickup storylines. */
function loadAcquisitions() {
  let raw
  try {
    raw = read('transactions.json')
  } catch {
    return new Map()
  }
  const txs = Array.isArray(raw?.transactions) ? raw.transactions : []
  const byLeagueId = new Map()
  for (const tx of txs) {
    if (tx.result !== 'a') continue
    const elementIn = tx.element_in == null ? null : Number(tx.element_in)
    if (!Number.isFinite(elementIn)) continue
    const leagueId = leagueIdByFplEntry.get(Number(tx.entry))
    if (!Number.isFinite(leagueId)) continue
    if (!byLeagueId.has(leagueId)) byLeagueId.set(leagueId, [])
    byLeagueId.get(leagueId).push({
      elementIn,
      gw: Number(tx.event) || 0,
      kind: tx.kind === 'f' ? 'f' : 'w',
    })
  }
  return byLeagueId
}
const acquisitionsByLeagueId = loadAcquisitions()

/** The most relevant acquisition for `elementId` on `leagueId` at or before
 * `gw` — latest landing wins (a re-add resets the "recent" clock). Null when
 * the player wasn't picked up off waivers/free agency (e.g. drafted). */
function acquisitionFor(leagueId, elementId, gw) {
  if (elementId == null) return null
  const list = acquisitionsByLeagueId.get(Number(leagueId))
  if (!list) return null
  let best = null
  for (const a of list) {
    if (a.elementIn !== Number(elementId) || a.gw > gw) continue
    if (!best || a.gw > best.gw) best = a
  }
  return best
}

/** Pickup storyline for one side: does its standout (haul/top) or its flop
 * trace back to a waiver/free-agent move? `recent` flags a move made this GW
 * or the one before, when the decision is freshest. */
function sidePickupFacts(side, gw) {
  const players = side.players
  if (!players) return null
  const out = {}
  const star = players.haul ?? players.top
  if (star && star.id != null) {
    const acq = acquisitionFor(side.entryId, star.id, gw)
    if (acq) {
      out.star = {
        name: star.name,
        pts: star.pts,
        kind: acq.kind,
        gw: acq.gw,
        recent: gw - acq.gw <= 1,
        wasHaul: players.haul != null && players.haul.id === star.id,
      }
    }
  }
  if (players.flop && players.flop.id != null) {
    const acq = acquisitionFor(side.entryId, players.flop.id, gw)
    if (acq) {
      out.flop = {
        name: players.flop.name,
        pts: players.flop.pts,
        xp: players.flop.xp,
        kind: acq.kind,
        gw: acq.gw,
        recent: gw - acq.gw <= 1,
      }
    }
  }
  return out.star || out.flop ? out : null
}
const snapshotByGw = new Map(predictions.snapshots.map((s) => [s.asOfGw, s]))
const recordByGw = new Map(
  (predictions.modelRecord?.gameweeks ?? []).map((g) => [g.gw, g]),
)

function loadHistory(gw) {
  const p = join(dataDir, 'projections-history', `gw-${String(gw).padStart(2, '0')}.json`)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function titleOddsAt(asOfGw, entryId) {
  const snap = snapshotByGw.get(asOfGw)
  const row = snap?.teams.find((t) => Number(t.leagueEntryId) === Number(entryId))
  return row ? Number(row.titlePct) : null
}

function lastPctAt(asOfGw, entryId) {
  const snap = snapshotByGw.get(asOfGw)
  const row = snap?.teams.find((t) => Number(t.leagueEntryId) === Number(entryId))
  return row ? Number(row.lastPct) : null
}

function teamOut(facts, gw) {
  const before = titleOddsAt(gw - 1, facts.entryId)
  const after = titleOddsAt(gw, facts.entryId)
  return {
    entryId: facts.entryId,
    name: facts.name,
    manager: managerById.get(facts.entryId) ?? null,
    points: facts.points,
    rank: facts.rank,
    prevRank: facts.prevRank,
    record: facts.record,
    streak: facts.streak,
    seasonAvg: facts.seasonAvg,
    isSeasonHigh: facts.isSeasonHigh,
    isWeekHigh: facts.isWeekHigh,
    titleOdds:
      Number.isFinite(before) && Number.isFinite(after) ? { before, after } : null,
  }
}

const lastFinishedGw = matches.reduce(
  (max, m) => (m.finished && Number(m.event) > max ? Number(m.event) : max),
  0,
)

const gameweeks = []
for (let gw = 1; gw <= lastFinishedGw; gw++) {
  const facts = recapFactsForGw(matches, entryIds, nameById, gw)
  if (!facts) continue
  const gwRecord = recordByGw.get(gw)
  const history = loadHistory(gw)
  const recordRows = new Map(
    (gwRecord?.matches ?? []).map((r) => [`${r.home}-${r.away}`, r]),
  )
  const leagueAvg =
    facts.matches.reduce((s, r) => s + r.homePts + r.awayPts, 0) /
    (facts.matches.length * 2)

  const matchups = facts.matches.map((row) => {
    const home = teamOut(facts.teams.get(row.home), gw)
    const away = teamOut(facts.teams.get(row.away), gw)
    const archRow = findArchivedH2hRow(history, row.home, row.away)
    home.players = sidePlayerFacts(archivedXi(archRow, row.home))
    away.players = sidePlayerFacts(archivedXi(archRow, row.away))
    home.pickup = sidePickupFacts(home, gw)
    away.pickup = sidePickupFacts(away, gw)
    const series = h2hSeriesAsOf(matches, row.home, row.away, gw)
    const h2h = series
      ? {
          games: series.games,
          homeWins: series.aWins,
          awayWins: series.bWins,
          draws: series.draws,
        }
      : null
    const rec = recordRows.get(`${row.home}-${row.away}`)
    const odds =
      rec && Number.isFinite(rec.homeWinPct) && rec.favorite != null
        ? {
            favoriteSide: rec.favorite === row.home ? 'home' : 'away',
            favoritePct: rec.favorite === row.home ? rec.homeWinPct : rec.awayWinPct,
            source: rec.favoriteSource,
            outcome: rec.outcome,
          }
        : null
    const predicted =
      rec && Number.isFinite(rec.predHome) && Number.isFinite(rec.predAway)
        ? { home: rec.predHome, away: rec.predAway }
        : null
    return {
      home,
      away,
      winner:
        home.points > away.points
          ? home.entryId
          : away.points > home.points
            ? away.entryId
            : null,
      margin: Math.abs(home.points - away.points),
      odds,
      predicted,
      h2h,
      sentences: matchupRecapSentences({ gw, home, away, odds, leagueAvg, h2h }),
    }
  })

  // Star of the week: the top player score across every archived XI.
  let starPlayer = null
  for (const m of matchups) {
    for (const side of [m.home, m.away]) {
      const top = side.players?.top
      if (top && (!starPlayer || top.pts > starPlayer.pts)) {
        starPlayer = { name: top.name, pts: top.pts, teamName: side.name }
      }
    }
  }

  // Odds vs reality summary: every decided pre-match call, plus the upset the
  // model rated least likely.
  const calls = matchups
    .filter((m) => m.odds)
    .map((m) => {
      const fav = m.odds.favoriteSide === 'home' ? m.home : m.away
      return {
        homeName: m.home.name,
        awayName: m.away.name,
        favoriteName: fav.name,
        favoritePct: Math.round(m.odds.favoritePct),
        outcome: m.odds.outcome,
      }
    })
  let upset = null
  for (const m of matchups) {
    if (!m.odds || m.odds.outcome !== 'miss' || m.winner == null) continue
    const winnerSide = m.winner === m.home.entryId ? m.home : m.away
    const winnerPct = Math.round(
      100 - (Number.isFinite(m.odds.favoritePct) ? m.odds.favoritePct : 50),
    )
    if (!upset || winnerPct < upset.winnerPct) {
      upset = {
        winnerName: winnerSide.name,
        loserName: (m.winner === m.home.entryId ? m.away : m.home).name,
        winnerPct,
      }
    }
  }

  gameweeks.push({
    gw,
    model: {
      hits: gwRecord?.hits ?? 0,
      misses: gwRecord?.misses ?? 0,
      draws: gwRecord?.draws ?? 0,
      avgAbsErr: gwRecord?.avgAbsErr ?? null,
      upset,
      calls,
    },
    superlatives: {
      weekHigh: facts.superlatives.weekHigh
        ? {
            name: facts.superlatives.weekHigh.name,
            points: facts.superlatives.weekHigh.points,
          }
        : null,
      closest: facts.superlatives.closest
        ? {
            homeName: nameById.get(facts.superlatives.closest.home),
            awayName: nameById.get(facts.superlatives.closest.away),
            margin: facts.superlatives.closest.margin,
          }
        : null,
      starPlayer,
    },
    matchups,
  })
}

/* ---- pre-match look-forwards (finished GWs from archive + next GW live) ---- */

function readOptional(name) {
  try {
    return read(name)
  } catch {
    return null
  }
}

const bookie = readOptional('bookie-markets.json')
const playerPredictions = readOptional('predictions.json')
const elementStatus = readOptional('element_status.json')
const bootstrapDraft = readOptional('bootstrap_draft.json')

const elementNameById = new Map(
  (bootstrapDraft?.elements ?? []).map((e) => [
    Number(e.id),
    e.web_name || e.second_name || String(e.id),
  ]),
)

const outrightPriceById = new Map(
  (bookie?.outright?.selections ?? []).map((s) => [
    Number(s.entryId),
    decimalOddsToFraction(s.odds),
  ]),
)
const lastPriceById = new Map(
  (bookie?.last?.selections ?? []).map((s) => [
    Number(s.entryId),
    decimalOddsToFraction(s.odds),
  ]),
)

const upcomingGw = (() => {
  const unfinished = (matches ?? [])
    .map((m) => Number(m.event))
    .filter((ev) => Number.isFinite(ev) && ev > lastFinishedGw)
  return unfinished.length ? Math.min(...unfinished) : null
})()

const leagueEntryByFpl = new Map(
  (details.league_entries ?? []).map((e) => [Number(e.entry_id), Number(e.id)]),
)
const ownedByLeagueEntry = new Map()
for (const row of elementStatus?.element_status ?? []) {
  const owner = leagueEntryByFpl.get(Number(row.owner))
  if (owner == null) continue
  if (!ownedByLeagueEntry.has(owner)) ownedByLeagueEntry.set(owner, [])
  ownedByLeagueEntry.get(owner).push(Number(row.element))
}
const predById = new Map((playerPredictions?.players ?? []).map((p) => [Number(p.id), p]))

const strengthById = new Map(
  (predictions.current?.teams ?? []).map((t) => [
    Number(t.leagueEntryId),
    { mu: Number(t.strength) || 0, sigma: 11, se: 3 },
  ]),
)

const bookieByPair = new Map()
for (const row of bookie?.weekly?.matches ?? []) {
  bookieByPair.set(`${Number(row.homeEntryId)}-${Number(row.awayEntryId)}`, row)
}

function liveWatchKeys(leagueEntryId) {
  const owned = ownedByLeagueEntry.get(Number(leagueEntryId)) ?? []
  const players = owned
    .map((id) => {
      const pred = predById.get(id)
      const xp = Number(pred?.forecast?.totalPoints)
      if (!pred || !Number.isFinite(xp) || xp <= 0) return null
      return {
        id,
        name: pred.name ?? String(id),
        pos: pred.position ?? '',
        xp,
      }
    })
    .filter(Boolean)
  return watchPlayersFromForecasts(players, 2)
}

function playerNameFor(elementId) {
  const id = Number(elementId)
  return elementNameById.get(id) || predById.get(id)?.name || `#${id}`
}

/** Accepted waivers / free-agent adds for this GW or the one before. */
function recentPickupsFor(leagueId, gw, n = 2) {
  const list = acquisitionsByLeagueId.get(Number(leagueId)) ?? []
  return list
    .filter((a) => a.gw === gw || a.gw === gw - 1)
    .sort((a, b) => b.gw - a.gw || (a.kind === 'w' ? -1 : 1))
    .slice(0, n)
    .map((a) => ({
      name: playerNameFor(a.elementIn),
      kind: a.kind,
      gw: a.gw,
    }))
}

function bookieFractionsFor(bookieRow, homeId, pcts) {
  const fromPcts = {
    home: probToFractionalOdds(pcts.home),
    draw: probToFractionalOdds(pcts.draw),
    away: probToFractionalOdds(pcts.away),
  }
  if (!bookieRow?.odds) return fromPcts
  const swapped = Number(bookieRow.homeEntryId) !== Number(homeId)
  const homeDec = swapped ? bookieRow.odds.away : bookieRow.odds.home
  const awayDec = swapped ? bookieRow.odds.home : bookieRow.odds.away
  return {
    home: decimalOddsToFraction(homeDec) || fromPcts.home,
    draw: decimalOddsToFraction(bookieRow.odds.draw) || fromPcts.draw,
    away: decimalOddsToFraction(awayDec) || fromPcts.away,
  }
}

/** Last week's XI for a side, regardless of who they played. */
function findSideXi(history, entryId) {
  if (!history) return null
  const id = Number(entryId)
  for (const row of history.h2h ?? []) {
    if (Number(row.league_entry_1) === id || Number(row.league_entry_2) === id) {
      return archivedXi(row, id)
    }
  }
  return null
}

function previewTeam(entryId, asOfGw) {
  const id = Number(entryId)
  const through = Math.max(0, asOfGw)
  const table = bankedTable(matches, entryIds, through)
  const ranks = through > 0 ? ranksAsOf(matches, entryIds, through) : null
  const row = table.get(id)
  const predRow = (predictions.current?.teams ?? []).find(
    (t) => Number(t.leagueEntryId) === id,
  )
  const titleBefore = titleOddsAt(through, id)
  const lastBefore = lastPctAt(through, id)
  return {
    entryId: id,
    name: nameById.get(id) ?? String(id),
    manager: managerById.get(id) ?? null,
    rank: ranks ? ranks.get(id) ?? null : null,
    record: row ? { w: row.w, d: row.d, l: row.l } : { w: 0, d: 0, l: 0 },
    streak: through > 0 ? streakAsOf(matches, id, through) : null,
    titlePct: Number.isFinite(titleBefore)
      ? titleBefore
      : Number.isFinite(Number(predRow?.titlePct))
        ? Number(predRow.titlePct)
        : null,
    lastPct: Number.isFinite(lastBefore)
      ? lastBefore
      : Number.isFinite(Number(predRow?.lastPct))
        ? Number(predRow.lastPct)
        : null,
    titlePrice: outrightPriceById.get(id) ?? null,
    lastPrice: lastPriceById.get(id) ?? null,
    strength: Number.isFinite(Number(predRow?.strength)) ? Number(predRow.strength) : null,
  }
}

function previewOddsFor(match, history, bookieRow) {
  const h = Number(match.league_entry_1)
  const a = Number(match.league_entry_2)
  const arch = findArchivedH2hRow(history, h, a)
  const mc = arch?.xPtsMc
  if (mc && Number.isFinite(Number(mc.homeWinPct)) && Number.isFinite(Number(mc.awayWinPct))) {
    const homeIsH = Number(arch.league_entry_1) === h
    const hw = homeIsH ? Number(mc.homeWinPct) : Number(mc.awayWinPct)
    const aw = homeIsH ? Number(mc.awayWinPct) : Number(mc.homeWinPct)
    const dw = Number.isFinite(Number(mc.drawPct)) ? Number(mc.drawPct) : 0
    return { hw, dw, aw, source: 'engine', arch }
  }
  if (bookieRow?.probs) {
    return {
      hw: Number(bookieRow.probs.home) * 100,
      dw: Number(bookieRow.probs.draw) * 100,
      aw: Number(bookieRow.probs.away) * 100,
      source: 'strength',
      arch: null,
    }
  }
  const fav = matchFavorite(match, history, strengthById)
  if (Number.isFinite(fav.homePct) && Number.isFinite(fav.awayPct)) {
    return { hw: fav.homePct, dw: 0, aw: fav.awayPct, source: fav.source, arch: null }
  }
  return null
}

function buildPreviewForGw(gw) {
  const gwMatches = (matches ?? []).filter((m) => Number(m.event) === gw)
  if (gwMatches.length === 0) return null
  const history = loadHistory(gw)
  const prevHistory = gw > 1 ? loadHistory(gw - 1) : null
  const asOfGw = gw - 1
  const bookieGw = Number(bookie?.weekly?.gw) === gw ? bookie.weekly : null

  const matchups = gwMatches.map((match) => {
    const homeId = Number(match.league_entry_1)
    const awayId = Number(match.league_entry_2)
    const bookieRow = bookieGw
      ? (bookieByPair.get(`${homeId}-${awayId}`) ?? bookieByPair.get(`${awayId}-${homeId}`))
      : null
    const priced = previewOddsFor(match, history, bookieRow)
    const pcts = priced
      ? oddsPercents({ home: priced.hw, draw: priced.dw, away: priced.aw })
      : { home: 50, draw: 0, away: 50 }
    const favoriteSide = pcts.home === pcts.away ? null : pcts.home > pcts.away ? 'home' : 'away'
    const odds = favoriteSide
      ? {
          home: pcts.home,
          draw: pcts.draw,
          away: pcts.away,
          favoriteSide,
          favoritePct: favoriteSide === 'home' ? pcts.home : pcts.away,
          source: priced?.source ?? 'strength',
        }
      : {
          home: pcts.home,
          draw: pcts.draw,
          away: pcts.away,
          favoriteSide: 'home',
          favoritePct: 50,
          source: priced?.source ?? 'strength',
        }

    const arch = priced?.arch ?? findArchivedH2hRow(history, homeId, awayId)
    const homeKeys = watchPlayersFromXi(archivedXi(arch, homeId), 2)
    const awayKeys = watchPlayersFromXi(archivedXi(arch, awayId), 2)
    const home = {
      ...previewTeam(homeId, asOfGw),
      keys: homeKeys.length ? homeKeys : liveWatchKeys(homeId),
      recentPickups: recentPickupsFor(homeId, gw),
      form: formFromXi(findSideXi(prevHistory, homeId)),
    }
    const away = {
      ...previewTeam(awayId, asOfGw),
      keys: awayKeys.length ? awayKeys : liveWatchKeys(awayId),
      recentPickups: recentPickupsFor(awayId, gw),
      form: formFromXi(findSideXi(prevHistory, awayId)),
    }

    let predicted = null
    if (arch && Number.isFinite(Number(arch.xPtsXi1)) && Number.isFinite(Number(arch.xPtsXi2))) {
      const homeIsE1 = Number(arch.league_entry_1) === homeId
      predicted = {
        home: homeIsE1 ? Number(arch.xPtsXi1) : Number(arch.xPtsXi2),
        away: homeIsE1 ? Number(arch.xPtsXi2) : Number(arch.xPtsXi1),
      }
    } else if (Number.isFinite(home.strength) && Number.isFinite(away.strength)) {
      predicted = { home: home.strength, away: away.strength }
    }

    const series = h2hSeriesAsOf(matches, homeId, awayId, asOfGw)
    const h2h = series
      ? {
          games: series.games,
          homeWins: series.aWins,
          awayWins: series.bWins,
          draws: series.draws,
        }
      : null

    const bookiePrices = bookieFractionsFor(bookieRow, homeId, pcts)

    return {
      home,
      away,
      odds,
      bookie: bookiePrices,
      predicted,
      h2h,
      sentences: matchupPreviewSentences({
        gw,
        home,
        away,
        odds,
        bookie: bookiePrices,
        predicted,
        h2h,
      }),
    }
  })

  const favourite = [...matchups].sort(
    (a, b) => (b.odds?.favoritePct ?? 0) - (a.odds?.favoritePct ?? 0),
  )[0]
  const closest = [...matchups].sort(
    (a, b) => Math.abs(50 - (a.odds?.favoritePct ?? 50)) - Math.abs(50 - (b.odds?.favoritePct ?? 50)),
  )[0]

  return {
    gw,
    source: history ? 'archive' : 'live',
    superlatives: {
      favourite: favourite
        ? {
            name: favourite.odds.favoriteSide === 'home' ? favourite.home.name : favourite.away.name,
            pct: favourite.odds.favoritePct,
          }
        : null,
      closest: closest
        ? {
            homeName: closest.home.name,
            awayName: closest.away.name,
            favoritePct: closest.odds.favoritePct,
          }
        : null,
    },
    matchups,
  }
}

const previewGws = new Set()
for (const g of gameweeks) previewGws.add(g.gw)
if (Number.isFinite(upcomingGw)) previewGws.add(upcomingGw)
const previews = [...previewGws]
  .sort((a, b) => a - b)
  .map((gw) => buildPreviewForGw(gw))
  .filter(Boolean)

const output = {
  schemaVersion: 4,
  generatedAt: new Date().toISOString(),
  season: predictions.season,
  lastFinishedGw,
  upcomingGw,
  gameweeks,
  previews,
}

writeFileSync(join(dataDir, 'weekly-recaps.json'), JSON.stringify(output, null, 1))
console.log(
  `weekly-recaps.json written: ${gameweeks.length} recap(s), ${previews.length} preview(s)`,
)
