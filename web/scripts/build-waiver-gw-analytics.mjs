#!/usr/bin/env node
/**
 * Fetches FPL event/live per GW, then:
 * 1) drops-gw-live.json — dropped player’s pts that GW for successful waivers + free-agency swaps (neutral path name)
 * 2) pickups-tenure.json — top 10 pickup pairs + team tenure totals
 *    from each waiver-in or free-agent add until that player left the squad (same entry).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  aggregatePickupTenure,
  compareTx,
  isSuccessfulSwap,
  resolveWaiverAnalyticsLastGw,
  sumPlayerRange,
} from '../src/waiverPickupAnalytics.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const leagueDataDir = join(__dirname, '../public/league-data')
const txPath = join(leagueDataDir, 'transactions.json')
const tradesPath = join(leagueDataDir, 'trades.json')
const detailsPath = join(leagueDataDir, 'details.json')
const fixturesPath = join(leagueDataDir, 'fixtures.json')
const outWaiverOut = join(leagueDataDir, 'drops-gw-live.json')
const outWaiverInTop = join(leagueDataDir, 'pickups-tenure.json')
const outTradesPanel = join(leagueDataDir, 'trades-panel.json')

function leagueEntryMaps(details) {
  const leagueEntries = details.league_entries || []
  const entryName = new Map()
  const fplToLeague = new Map()
  for (const e of leagueEntries) {
    if (e.entry_id != null) {
      entryName.set(Number(e.entry_id), e.entry_name ?? `Entry ${e.entry_id}`)
      if (e.id != null) fplToLeague.set(Number(e.entry_id), Number(e.id))
    }
  }
  return { entryName, fplToLeague }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function isTxStrictlyAfterTrade(tx, trade) {
  const ta = tx.added ? Date.parse(tx.added) : 0
  const tr = trade.response_time ? Date.parse(trade.response_time) : 0
  if (ta > tr) return true
  if (ta < tr) return false
  return (tx.id ?? 0) > (trade.id ?? 0)
}

function findDropAfterTrade(sortedTx, fplEntry, elementId, trade) {
  for (const t of sortedTx) {
    if (!isTxStrictlyAfterTrade(t, trade)) continue
    if (Number(t.entry) !== fplEntry) continue
    if (t.result !== 'a') continue
    if (t.element_out == null || Number(t.element_out) !== elementId) continue
    return t
  }
  return null
}

function computeTradeStint(
  fplEntry,
  gainedElementId,
  trade,
  sortedTx,
  cache,
  lastGw,
  startGw
) {
  const drop = findDropAfterTrade(sortedTx, fplEntry, gainedElementId, trade)
  let endGw = lastGw
  let stillOnTeam = true
  if (drop) {
    endGw = Math.min(Number(drop.event) - 1, lastGw)
    stillOnTeam = false
  }
  if (endGw < startGw) {
    return {
      startGw,
      endGw,
      totalPoints: 0,
      stillOnTeam: false,
      gwRangeLabel:
        startGw === endGw ? `${startGw}` : `${startGw}–${endGw}`,
    }
  }
  const totalPoints = sumPlayerRange(
    cache,
    Number(gainedElementId),
    startGw,
    endGw
  )
  return {
    startGw,
    endGw,
    totalPoints,
    stillOnTeam,
    gwRangeLabel: startGw === endGw ? `${startGw}` : `${startGw}–${endGw}`,
  }
}

function buildTradesPanelJson(tradesList, sortedTx, details, cache, lastGw) {
  const { entryName, fplToLeague } = leagueEntryMaps(details)

  const executed = [...tradesList]
    .filter((t) => t.state === 'p')
    .sort((a, b) => a.event - b.event || a.id - b.id)

  const tradesOut = []
  for (const trade of executed) {
    const offeredFpl = Number(trade.offered_entry)
    const receivedFpl = Number(trade.received_entry)
    const startGw = Number(trade.event)
    const legs = []
    for (const item of trade.tradeitem_set || []) {
      const inId = Number(item.element_in)
      const outId = Number(item.element_out)
      legs.push({
        side: 'offered',
        fplEntryId: offeredFpl,
        leagueEntryId: fplToLeague.get(offeredFpl),
        teamName: entryName.get(offeredFpl) ?? `Team ${offeredFpl}`,
        gainedElementId: inId,
        gaveElementId: outId,
        ...computeTradeStint(
          offeredFpl,
          inId,
          trade,
          sortedTx,
          cache,
          lastGw,
          startGw
        ),
      })
      legs.push({
        side: 'received',
        fplEntryId: receivedFpl,
        leagueEntryId: fplToLeague.get(receivedFpl),
        teamName: entryName.get(receivedFpl) ?? `Team ${receivedFpl}`,
        gainedElementId: outId,
        gaveElementId: inId,
        ...computeTradeStint(
          receivedFpl,
          outId,
          trade,
          sortedTx,
          cache,
          lastGw,
          startGw
        ),
      })
    }
    const pairs = []
    for (let i = 0; i < legs.length; i += 2) {
      pairs.push({ offeredLeg: legs[i], receivedLeg: legs[i + 1] })
    }
    tradesOut.push({
      id: trade.id,
      event: trade.event,
      offerTime: trade.offer_time ?? null,
      responseTime: trade.response_time ?? null,
      offeredFplEntry: offeredFpl,
      receivedFplEntry: receivedFpl,
      offeredLeagueEntry: fplToLeague.get(offeredFpl),
      receivedLeagueEntry: fplToLeague.get(receivedFpl),
      offeredTeamName: entryName.get(offeredFpl) ?? `Team ${offeredFpl}`,
      receivedTeamName: entryName.get(receivedFpl) ?? `Team ${receivedFpl}`,
      legs,
      pairs,
      completed: true,
    })
  }
  return tradesOut
}

const DRAFT_API = 'https://draft.premierleague.com/api'

/**
 * Draft event/live — same element id space as transactions & trades.
 * (Classic live uses different id→player mapping; do not use here.)
 */
function livePointsMapFromDraftJson(j) {
  const m = {}
  const raw = j?.elements
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      const id = Number(k)
      if (!Number.isFinite(id)) continue
      const pts = v?.stats?.total_points
      m[id] = typeof pts === 'number' ? pts : 0
    }
    return m
  }
  if (Array.isArray(raw)) {
    for (const el of raw) {
      const pts = el.stats?.total_points
      m[el.id] = typeof pts === 'number' ? pts : 0
    }
  }
  return m
}

async function fetchGwMaps(lastGw) {
  /** @type {Record<number, Record<number, number>>} */
  const cache = {}
  for (let gw = 1; gw <= lastGw; gw++) {
    try {
      const r = await fetch(`${DRAFT_API}/event/${gw}/live`)
      if (!r.ok) {
        console.warn(`waiver-analytics: GW${gw} HTTP ${r.status}`)
        cache[gw] = {}
        continue
      }
      const j = await r.json()
      cache[gw] = livePointsMapFromDraftJson(j)
    } catch (e) {
      console.warn(`waiver-analytics: GW${gw}`, e.message)
      cache[gw] = {}
    }
    await sleep(120)
  }
  return cache
}

async function main() {
  if (process.env.SKIP_WAIVER_GW_SCORES === '1') {
    console.log('build-waiver-gw-analytics: SKIP_WAIVER_GW_SCORES=1, skip waiver/trade GW scores')
    return
  }

  let transactions = []
  const hasTxFile = existsSync(txPath)
  if (hasTxFile) {
    try {
      const payload = JSON.parse(readFileSync(txPath, 'utf8'))
      transactions = payload.transactions || []
    } catch {
      console.warn('build-waiver-gw-analytics: invalid transactions.json')
    }
  }

  let tradesRaw = []
  if (existsSync(tradesPath)) {
    try {
      const tp = JSON.parse(readFileSync(tradesPath, 'utf8'))
      tradesRaw = tp.trades || []
    } catch {
      console.warn('build-waiver-gw-analytics: invalid trades.json')
    }
  }
  const executedTrades = tradesRaw.filter((t) => t.state === 'p')

  if (transactions.length === 0 && executedTrades.length === 0) {
    console.log(
      'build-waiver-gw-analytics: no transactions and no executed trades, skip'
    )
    return
  }

  let details = {}
  try {
    details = JSON.parse(readFileSync(detailsPath, 'utf8'))
  } catch {
    /* ok */
  }

  let fixtures = []
  try {
    if (existsSync(fixturesPath)) {
      fixtures = JSON.parse(readFileSync(fixturesPath, 'utf8'))
    }
  } catch {
    /* ok */
  }

  /* Transactions use the target GW before every league match in that GW is
   * `finished` in details — waivers for GW N+1 can exist while last finished is N.
   * Also follow started/finished PL fixtures so tenure points roll forward when
   * H2H `finished` still lags (or during a live GW). */
  const lastGw = resolveWaiverAnalyticsLastGw({
    details,
    fixtures,
    transactions,
    trades: executedTrades,
  })

  console.log(
    `build-waiver-gw-analytics: fetching event/live for GWs 1–${lastGw}…`
  )
  const cache = await fetchGwMaps(lastGw)

  const sorted = [...transactions].sort(compareTx)

  /* —— waiver + free-agency swap (drop GW only) —— */
  function mapSwapRow(t, transactionKind) {
    const gw = Number(t.event)
    const outId = Number(t.element_out)
    const inId =
      t.element_in != null && t.element_in !== '' ? Number(t.element_in) : null
    const map = cache[gw]
    const ptsOut =
      map && Object.prototype.hasOwnProperty.call(map, outId)
        ? map[outId]
        : null
    const ptsIn =
      inId != null &&
      !Number.isNaN(inId) &&
      map &&
      Object.prototype.hasOwnProperty.call(map, inId)
        ? map[inId]
        : null
    return {
      transactionId: t.id,
      entry: t.entry,
      gameweek: gw,
      element_in: t.element_in,
      element_out: outId,
      added: t.added ?? null,
      /** FPL draft: position on that team’s waiver list for this GW (1 = top priority claim). */
      waiverPriority:
        transactionKind === 'w' && t.priority != null && t.priority !== ''
          ? Number(t.priority)
          : null,
      /** Same field as First Waiver Picks: waiver wire slot when the claim ran (`transactions.index`). */
      waiverWireIndex:
        transactionKind === 'w' && t.index != null && t.index !== ''
          ? Number(t.index)
          : null,
      droppedPlayerGwPoints: ptsOut,
      pickedUpPlayerGwPoints: ptsIn,
      transactionKind,
    }
  }

  const waiversDrop = transactions.filter((t) => t.kind === 'w' && isSuccessfulSwap(t))
  const freeAgentDrop = transactions.filter((t) => t.kind === 'f' && isSuccessfulSwap(t))

  const rowsOut = [
    ...waiversDrop.map((t) => mapSwapRow(t, 'w')),
    ...freeAgentDrop.map((t) => mapSwapRow(t, 'f')),
  ]
  rowsOut.sort((a, b) => {
    const ta = a.added ? Date.parse(a.added) : 0
    const tb = b.added ? Date.parse(b.added) : 0
    if (tb !== ta) return tb - ta
    return (b.transactionId ?? 0) - (a.transactionId ?? 0)
  })
  if (transactions.length > 0) {
    writeFileSync(
      outWaiverOut,
      JSON.stringify(
        {
          generated: new Date().toISOString(),
          note: 'Successful waiver (transactionKind w) and free-agency (f) swaps. droppedPlayerGwPoints / pickedUpPlayerGwPoints = FPL pts that GW for element_out / element_in (event/live)',
          rows: rowsOut,
        },
        null,
        2
      )
    )
  } else {
    console.log(
      'build-waiver-gw-analytics: no transactions; skipping drops-gw-live write'
    )
  }

  /* —— pickup tenure: waiver + free-agent adds until dropped —— */
  const fplEntryToLeagueId = new Map(
    (details.league_entries || [])
      .filter((e) => e.entry_id != null && e.id != null)
      .map((e) => [Number(e.entry_id), Number(e.id)])
  )
  const { rows: top10, teamWaiverInTotals: teamTotalsRaw } =
    aggregatePickupTenure(transactions, lastGw, cache)
  const teamWaiverInTotals = teamTotalsRaw.map((t) => ({
    ...t,
    leagueEntry: fplEntryToLeagueId.get(t.entry) ?? undefined,
  }))

  if (transactions.length > 0) {
    writeFileSync(
      outWaiverInTop,
      JSON.stringify(
        {
          generated: new Date().toISOString(),
          note: 'Total FPL pts while on squad after waiver-in or free-agent add, through GW before drop (or last finished/live GW). Same player re-claimed: stints summed. Never-fielded (in and out same GW) omitted. teamWaiverInTotals.waiverInCount = successful pickup stints (w + f, matches drops-gw-live volume); distinctPlayers = unique elements.',
          lastGwUsed: lastGw,
          rows: top10,
          teamWaiverInTotals,
        },
        null,
        2
      )
    )
  }

  /* —— executed trades: points after trade until dropped (or last GW) —— */
  if (executedTrades.length > 0) {
    const tradesPanel = buildTradesPanelJson(
      tradesRaw,
      sorted,
      details,
      cache,
      lastGw
    )
    writeFileSync(
      outTradesPanel,
      JSON.stringify(
        {
          generated: new Date().toISOString(),
          lastGwUsed: lastGw,
          note: 'Per player acquired in a processed trade (state p): FPL pts from trade.event through first drop by that manager, or last finished GW. GW range like 9–28 = inclusive gameweeks on that squad.',
          trades: tradesPanel,
        },
        null,
        2
      )
    )
  }

  console.log(
    `build-waiver-gw-analytics: drops-gw-live ${rowsOut.length} rows (${waiversDrop.length} w + ${freeAgentDrop.length} fa); pickups-tenure ${transactions.length ? `${top10.length} top + ${teamWaiverInTotals.length} team` : 'skipped'}; trades-panel ${executedTrades.length} trade(s)`
  )
}

main().catch((e) => {
  console.error('build-waiver-gw-analytics FAILED:', e)
  process.exit(1)
})
