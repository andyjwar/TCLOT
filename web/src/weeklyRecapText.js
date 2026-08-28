/**
 * Template prose for the weekly recap — a short match report per MATCHUP,
 * generated deterministically (same inputs → same words).
 *
 * Written like a Monday sports desk, not a checklist:
 *  1. Lead — result, score, and how the pre-match call aged, in one breath.
 *     Named derbies open as a clause, not their own sentence.
 *  2. Reporting — the player or waiver story, when there is one.
 *  3. Kicker — what it means (table, streak, series) plus a bit of speculation.
 *
 * Cards already show ranks, records, and top scorers. Prose interprets.
 */

import {
  namedFixtureFor,
  matchupPersonalitySentences,
  managerFunFact,
  uniqueDerbies,
  titanicAside,
  canonicalManager,
  derbyChipLabel,
  sprinkleInto,
} from './leagueLore.js'

/** Small deterministic hash for stable template variation per matchup+GW. */
export function variantIndex(key, n) {
  let h = 2166136261
  const s = String(key)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0) % n
}

const pick = (arr, key) => arr[variantIndex(key, arr.length)]

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const lcFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)

/** Lowercase a follow-on clause only when it starts with a sentence opener,
 * so manager names stay capitalised after a join. */
const FOLLOW_ON = /^(The|A|An|That|This|His|Her|Their|For|If|When|While|After|With|Question)\b/
function asFollowOn(s) {
  const t = String(s || '').replace(/[.!?]+$/, '')
  return FOLLOW_ON.test(t) ? lcFirst(t) : t
}

const rec = (t) => `${t.record.w}-${t.record.d}-${t.record.l}`

/** Manager's first name, when we have one — the friendly handle for prose. */
const firstName = (mgr) => {
  const s = String(mgr ?? '').trim()
  return s ? s.split(/\s+/)[0] : null
}

/** How to address a side in flavour text: the manager's first name if known,
 * otherwise the team name. Keeps rivalry/waiver lines personal. */
const who = (side) => firstName(side?.manager) || side?.name

/** Waiver vs free-agent wording, so a shrewd claim reads differently from a
 * casual free-agent add. */
const pickupLabel = (kind) => (kind === 'f' ? 'free-agent pickup' : 'waiver pickup')
const puntLabel = (kind) => (kind === 'f' ? 'free-agent punt' : 'waiver gamble')

function oddsShape(m) {
  if (!m.odds || !Number.isFinite(m.odds.favoritePct)) return null
  const fav = m.odds.favoriteSide === 'home' ? m.home : m.away
  const dog = m.odds.favoriteSide === 'home' ? m.away : m.home
  const p = Math.round(m.odds.favoritePct)
  const { winner } = sides(m)
  if (!winner) return { kind: 'draw', fav, dog, p }
  if (winner.entryId === fav.entryId) {
    if (p >= 65) return { kind: 'lock', fav, dog, p }
    if (p >= 55) return { kind: 'lean', fav, dog, p }
    return { kind: 'coin', fav, dog, p }
  }
  if (p >= 65) return { kind: 'shock', fav, dog, p }
  return { kind: 'nudge', fav, dog, p }
}

function derbyOpen(m, key) {
  const name = namedFixtureFor(m.home?.manager, m.away?.manager)
  if (!name) return ''
  const chip = derbyChipLabel(name)
  const round = m.h2h && Number.isFinite(m.h2h.games) ? m.h2h.games : null
  if (round && round > 1) {
    return pick([`Round ${round} of ${name}, `, `In ${name}, `], key)
  }
  return pick([`In ${name}, `, `${chip} again, and `], `${key}-d`)
}

function recapLead(m, key) {
  const { winner, loser } = sides(m)
  const open = derbyOpen(m, `${key}-n`)
  const o = oddsShape(m)

  if (!winner) {
    const score = `${m.home.points}–${m.away.points}`
    if (o) {
      return pick(
        [
          `${open}${m.home.name} and ${m.away.name} shared a ${score} stalemate, the model having leaned ${o.fav.name} at ${o.p}% and then watched the scoreboard freeze.`,
          `${open}Nothing in it at ${score} — ${o.fav.name} were ${o.p}% pre-match and still couldn't find a winner.`,
        ],
        key,
      )
    }
    return pick(
      [
        `${open}${m.home.name} and ${m.away.name} couldn't be separated at ${score}.`,
        `${open}Deadlock: ${m.home.name} and ${m.away.name} shared the spoils at ${score}.`,
      ],
      key,
    )
  }

  const score = `${winner.points}–${loser.points}`
  const margin = winner.points - loser.points

  if (o?.kind === 'shock') {
    return pick(
      [
        `${open}${winner.name} tore up a ${o.p}% script and beat ${loser.name} ${score}.`,
        `${open}${loser.name} were ${o.p}% favourite and still lost to ${winner.name} ${score} — a result ${winner.name} will dine out on.`,
      ],
      key,
    )
  }
  if (o?.kind === 'nudge') {
    return pick(
      [
        `${open}${winner.name} had other ideas, beating ${loser.name} ${score} after the model had narrowly fancied ${o.fav.name} at ${o.p}%.`,
        `${open}${o.fav.name} were ${o.p}% on the board and still lost ${score} to ${winner.name}.`,
      ],
      key,
    )
  }
  if (margin >= 25) {
    if (o?.kind === 'lock' || o?.kind === 'lean') {
      return pick(
        [
          `${open}${winner.name} ran up ${score} on ${loser.name}, a ${o.p}% favourite who looked every bit as short as advertised.`,
          `${open}${winner.name} steamrolled ${loser.name} ${score}, the ${o.p}% call only louder.`,
        ],
        key,
      )
    }
    return pick(
      [
        `${open}${winner.name} steamrolled ${loser.name} ${score}, the kind of scoreline that gets screenshotted.`,
        `${open}${winner.name} blew ${loser.name} away ${score}, a statement the rest of the league will have noticed.`,
      ],
      key,
    )
  }
  if (o?.kind === 'lock') {
    return pick(
      [
        `${open}${winner.name} beat ${loser.name} ${score}, and at ${o.p}% pre-match nobody should be pretending to be surprised.`,
        `${open}${winner.name} had ${loser.name} ${score}, which is roughly what a ${o.p}% favourite is supposed to look like.`,
      ],
      key,
    )
  }
  if (o?.kind === 'lean') {
    return pick(
      [
        `${open}${winner.name} justified a ${o.p}% lean, seeing off ${loser.name} ${score}.`,
        `${open}${winner.name} took ${loser.name} ${score}, which is roughly what a ${o.p}% favourite is supposed to look like.`,
      ],
      key,
    )
  }
  if (o?.kind === 'coin') {
    return `${open}${winner.name} shaded ${loser.name} ${score} in the coin-flip the model had at ${o.p}–${100 - o.p}.`
  }
  if (margin <= 5) {
    return pick(
      [
        `${open}${winner.name} edged ${loser.name} ${score} in a proper nail-biter.`,
        `${open}${winner.name} squeaked past ${loser.name} ${score} — margins don't come much finer.`,
      ],
      key,
    )
  }
  return pick(
    [
      `${open}${winner.name} took care of ${loser.name}, ${score}.`,
      `${open}A solid week's work from ${winner.name}: ${score} over ${loser.name}.`,
      `${open}${winner.name} had enough in the tank to see off ${loser.name}, ${score}.`,
    ],
    key,
  )
}

function playerReport(m, key) {
  const { winner, loser } = sides(m)
  const ph = m.home.players
  const pa = m.away.players
  if (!ph && !pa) return null
  const pWinner = winner ? (winner === m.home ? ph : pa) : null
  const pLoser = loser ? (loser === m.home ? ph : pa) : null
  const ws = winner?.pickup?.star
  const haulIsWaiver =
    ws && pWinner?.haul && String(ws.name) === String(pWinner.haul.name)

  if (pWinner?.top && pWinner.top.pts >= 15 && pWinner.share >= 0.33) {
    if (pWinner.share >= 0.4 && pWinner.top.pts >= 20) {
      if (haulIsWaiver) {
        return `${pWinner.top.name}, the ${pickupLabel(ws.kind)} ${who(winner)} added ${ws.recent ? 'this week' : `back in GW${ws.gw}`}, practically won it single-handed — ${pWinner.top.pts} of ${winner.name}'s ${winner.points}.`
      }
      return pick(
        [
          `${pWinner.top.name} practically won it single-handed — ${pWinner.top.pts} of ${winner.name}'s ${winner.points}.`,
          `Strip out ${pWinner.top.name}'s ${pWinner.top.pts} and ${winner.name} lose this one; one-man-army stuff.`,
        ],
        key,
      )
    }
    return pick(
      [
        `${pWinner.top.name} did the heavy lifting for ${winner.name} with ${pWinner.top.pts} — over a third of their total.`,
        `${winner.name} leaned hard on ${pWinner.top.name}, whose ${pWinner.top.pts} carried the scoring.`,
      ],
      key,
    )
  }

  if (pWinner?.haul && pLoser?.flop) {
    return `${pWinner.haul.name} hauled ${pWinner.haul.pts} for ${winner.name} while ${loser.name}'s ${pLoser.flop.name} — pegged for ${pLoser.flop.xp} — managed just ${pLoser.flop.pts}.`
  }
  if (pWinner?.haul) {
    if (haulIsWaiver) {
      return `Shrewd business: ${who(winner)}'s ${pickupLabel(ws.kind)} ${ws.name} hauled ${ws.pts} and decided the week.`
    }
    return pick(
      [
        `${pWinner.haul.name} led the charge for ${winner.name} with a ${pWinner.haul.pts}-point haul.`,
        `${pWinner.haul.name}'s ${pWinner.haul.pts} was the difference for ${winner.name} on the night.`,
      ],
      key,
    )
  }
  if (pLoser?.flop) {
    return pick(
      [
        `${loser.name} will point at ${pLoser.flop.name}, projected for ${pLoser.flop.xp} and back with ${pLoser.flop.pts}.`,
        `The blank that hurt was ${loser.name}'s ${pLoser.flop.name}, ${pLoser.flop.pts} against a ${pLoser.flop.xp}-point call.`,
      ],
      key,
    )
  }
  const pDrawSides = [
    { facts: ph, team: m.home },
    { facts: pa, team: m.away },
  ]
  for (const { facts, team } of pDrawSides) {
    if (facts?.haul && (!winner || team === loser)) {
      return `${facts.haul.name}'s ${facts.haul.pts} for ${team.name} deserved more than it got.`
    }
  }
  return null
}

function waiverReport(m, key) {
  const { winner, loser } = sides(m)
  const ws = winner?.pickup?.star
  const pWinner = winner ? (winner === m.home ? m.home.players : m.away.players) : null
  if (ws && pWinner?.haul && String(ws.name) === String(pWinner.haul.name)) return null

  const when = (p) => (p.recent ? 'this week' : `back in GW${p.gw}`)
  if (ws && (ws.wasHaul || ws.pts >= 12)) {
    return pick(
      [
        `${who(winner)}'s ${pickupLabel(ws.kind)} ${ws.name} (added ${when(ws)}) repaid the faith with ${ws.pts}.`,
        `That ${pickupLabel(ws.kind)} is ageing well: ${ws.name} chipped in ${ws.pts} for ${who(winner)}.`,
        `Shrewd business — ${who(winner)} plucked ${ws.name} off the wire and got ${ws.pts} out of him.`,
      ],
      key,
    )
  }
  for (const side of [m.home, m.away]) {
    const s = side?.pickup?.star
    if (s && side !== winner && s.pts >= 12) {
      return `${who(side)}'s ${pickupLabel(s.kind)} ${s.name} justified the claim with ${s.pts} in a losing cause.`
    }
  }
  const flopSide = [m.home, m.away].find((s) => s?.pickup?.flop)
  if (flopSide) {
    const f = flopSide.pickup.flop
    return pick(
      [
        `The ${puntLabel(f.kind)} on ${f.name} backfired for ${who(flopSide)} — ${f.pts} off a projected ${f.xp}.`,
        `${who(flopSide)} won't want to relive the ${puntLabel(f.kind)}: ${f.name} returned just ${f.pts}.`,
      ],
      key,
    )
  }
  return null
}

function recapReport(m, key) {
  const player = playerReport(m, `${key}-p`)
  const waiver = waiverReport(m, `${key}-w`)
  if (player && waiver) {
    const a = String(player).replace(/\.$/, '')
    const b = asFollowOn(waiver)
    return `${a}; ${b}.`
  }
  return player || waiver
}

function seriesClause(m) {
  const h = m.h2h
  if (!h || h.games < 2) return null
  const drawn = h.draws ? ` (${h.draws} drawn)` : ''
  const { winner, loser } = sides(m)
  const hn = who(m.home)
  const an = who(m.away)
  const ambiguous =
    hn != null && an != null && String(hn).toLowerCase() === String(an).toLowerCase()
  const label = (side) => (ambiguous ? side.name : who(side))
  if (!winner) {
    return `the season series between ${label(m.home)} and ${label(m.away)} stays level at ${h.homeWins}–${h.awayWins}${drawn}`
  }
  const winnerIsHome = winner === m.home
  const wWins = winnerIsHome ? h.homeWins : h.awayWins
  const lWins = winnerIsHome ? h.awayWins : h.homeWins
  if (wWins > lWins) {
    return `bragging rights to ${label(winner)}, the season head-to-head with ${label(loser)} now ${wWins}–${lWins}${drawn}`
  }
  if (wWins === lWins) {
    return `that squares the season series — ${label(m.home)} and ${label(m.away)} locked at ${h.homeWins}–${h.awayWins}${drawn}`
  }
  return `${label(winner)} got one back, but ${label(loser)} still lead the season series ${lWins}–${wWins}${drawn}`
}

function recapKicker(m, key) {
  const { winner, loser } = sides(m)
  const series = seriesClause(m)
  const spec = recapSpeculation(m, key)

  if (!winner) {
    const parked = `${m.home.name} ${ordinal(m.home.rank)} at ${rec(m.home)} and ${m.away.name} ${ordinal(m.away.rank)} at ${rec(m.away)}`
    if (series && spec) return `The point leaves ${parked}; ${series}, and ${spec}.`
    if (series) return `The point leaves ${parked}; ${series}.`
    if (spec) return `The point leaves ${parked} — ${spec}.`
    return pick(
      [
        `The point leaves ${parked}, a week that asked a question and then shrugged.`,
        `In the table that parks ${parked}. You wouldn't call it a statement from either side.`,
      ],
      key,
    )
  }

  let table
  if (winner.rank === 1 && winner.prevRank != null && winner.prevRank !== winner.rank) {
    table = `the win sends ${winner.name} top at ${rec(winner)}`
  } else if (winner.rank === 1) {
    table = `the win keeps ${winner.name} top of the pile at ${rec(winner)}`
  } else if (winner.prevRank != null && winner.rank < winner.prevRank) {
    table = `the win lifts ${winner.name} to ${ordinal(winner.rank)} at ${rec(winner)}`
  } else {
    table = `${winner.name} sit ${ordinal(winner.rank)} at ${rec(winner)}`
  }
  const loserBit =
    loser.prevRank != null && loser.rank > loser.prevRank
      ? `${loser.name} drop to ${ordinal(loser.rank)} at ${rec(loser)}`
      : `${loser.name} are ${ordinal(loser.rank)} at ${rec(loser)}`

  const extra = series || spec
  if (extra) {
    return pick(
      [
        `${capitalize(table)}, while ${loserBit}; ${extra}.`,
        `${capitalize(table)}. ${capitalize(loserBit)}; ${extra}.`,
      ],
      key,
    )
  }
  return pick(
    [
      `${capitalize(table)}, while ${loserBit} — three points in the bag, and a week to think about how it happened.`,
      `${capitalize(table)}; ${loserBit}. ${winner.name} will take it; ${loser.name} will spend the week picking at the tape.`,
    ],
    key,
  )
}

function recapSpeculation(m, key) {
  const { winner, loser } = sides(m)
  if (loser?.rank === 8) {
    return pick(
      [
        'the trapdoor is already making a noise',
        'last place after a week like that is a long way back',
      ],
      `${key}-last`,
    )
  }
  if (winner?.streak?.type === 'W' && winner.streak.len >= 3) {
    return `that's ${winner.streak.len} on the spin for ${winner.name}, which is how a season starts to look deliberate`
  }
  if (loser?.streak?.type === 'L' && loser.streak.len >= 3) {
    return `alarm bells for ${loser.name} — ${loser.streak.len} defeats on the spin now`
  }
  if (winner?.isWeekHigh) {
    return `nobody in the league scored more than ${winner.name}'s ${winner.points} this week, and if that's their floor the rest have a problem`
  }
  if (winner?.isSeasonHigh && m.gw > 2) {
    return `${winner.name}'s ${winner.points} is their best week of the season so far, a template worth repeating`
  }
  for (const t of [m.home, m.away]) {
    const o = t.titleOdds
    if (o && Number.isFinite(o.before) && Number.isFinite(o.after) && Math.abs(o.after - o.before) >= 5) {
      return `the result moved ${t.name}'s title odds ${o.after > o.before ? 'up' : 'down'} from ${o.before}% to ${o.after}%, the board finally paying attention`
    }
  }
  if (Number.isFinite(m.leagueAvg) && m.leagueAvg > 0) {
    const sum = m.home.points + m.away.points
    const par = m.leagueAvg * 2
    if (sum >= par + 12) {
      return `at ${sum} combined points this was the week's heavyweight, and it played like one`
    }
    if (sum <= par - 12) {
      return `one for the purists at ${sum} combined, well under par — you wouldn't want a season of them`
    }
  }
  if (m.gw <= 2) {
    return pick(
      [
        'one week is a small sample, but templates have a way of sticking',
        "early days, though you wouldn't fancy the beaten side to reverse this in a hurry",
      ],
      `${key}-early`,
    )
  }
  return null
}

function managerFunFactSentences(m, key) {
  return matchupPersonalitySentences(m, pick, key, variantIndex, {
    gate: 3,
    veganAlways: true,
  })
}

/**
 * The recap paragraph for one matchup: a lead, optional reporting, a kicker,
 * then any personality asides. Not a checklist of independent facts.
 *
 * @param {{
 *   gw: number,
 *   home: object, away: object,
 *   odds: { favoriteSide: 'home'|'away', favoritePct: number } | null,
 *   leagueAvg?: number | null,
 *   h2h?: { games, homeWins, awayWins, draws } | null,
 * }} m
 */
export function matchupRecapSentences(m) {
  const key = `${m.home.entryId}-${m.away.entryId}-gw${m.gw}-${m.home.points}-${m.away.points}`
  const out = [recapLead(m, `${key}-lead`)]
  const report = recapReport(m, `${key}-rep`)
  if (report) out.push(report)
  out.push(recapKicker(m, `${key}-kick`))
  return sprinkleInto(out, managerFunFactSentences(m, `${key}-mff`), variantIndex, `${key}-mff`)
}

/** Winner/loser orientation for one matchup; both null for draws. */
function sides(m) {
  if (m.home.points > m.away.points) return { winner: m.home, loser: m.away }
  if (m.away.points > m.home.points) return { winner: m.away, loser: m.home }
  return { winner: null, loser: null }
}

export function ordinal(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return String(n)
  const s = ['th', 'st', 'nd', 'rd']
  const mod = v % 100
  return `${v}${s[(mod - 20) % 10] || s[mod] || s[0]}`
}

/**
 * One-line derby headline for a GW, or null when no named fixtures land.
 * Used as the week wrap on previews and recaps.
 */
export function weekDerbySentence(matchups, key) {
  const names = uniqueDerbies(matchups)
  if (!names.length) return null
  if (names.length === 1) {
    return pick(
      [
        `Headline fixture was ${names[0]}.`,
        `${capitalize(names[0])} sat in the middle of the card.`,
      ],
      key,
    )
  }
  const last = names[names.length - 1]
  const head = names.slice(0, -1).map(capitalize).join(', ')
  return pick(
    [
      `${head} and ${last} dotted the card.`,
      `Named derbies all week: ${head} and ${last}.`,
    ],
    key,
  )
}

/**
 * Short weekly wrap: named derbies first, then an occasional last-place or
 * Titanic Duo aside. Stats still live on the matchup cards.
 *
 * @param {{ gw: number, matchups: object[] }} args
 * @returns {string[]}
 */
export function recapWeekWrapSentences({ gw, matchups }) {
  const key = `gw${gw}-wrap`
  const out = []
  const derby = weekDerbySentence(matchups, `${key}-d`)
  if (derby) out.push(derby)

  const sides = (matchups || []).flatMap((m) => [m.home, m.away]).filter((s) => s?.manager)
  const last = [...sides].sort((a, b) => (Number(b.rank) || 0) - (Number(a.rank) || 0))[0]
  if (last && Number(last.rank) >= 7 && variantIndex(`${key}-last-gate`, 3) === 0) {
    const line = managerFunFact(last.manager, pick, `${key}-last`, ['last'])
    if (line) out.push(line)
  }

  const andy = sides.find((s) => canonicalManager(s.manager) === 'andy ward')
  const nickm = sides.find((s) => canonicalManager(s.manager) === 'nick mottershead')
  const bothSinking =
    andy &&
    nickm &&
    Number(andy.record?.l) > Number(andy.record?.w) &&
    Number(nickm.record?.l) > Number(nickm.record?.w)
  if (bothSinking && variantIndex(`${key}-titanic`, 4) === 0) {
    out.push(titanicAside(pick, `${key}-titanic-line`))
  }
  return out
}
