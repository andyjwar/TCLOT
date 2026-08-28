/**
 * Template prose for the weekly recap — one short paragraph per MATCHUP,
 * generated deterministically from match facts (same inputs → same words,
 * so rebuilds never churn the JSON).
 *
 *  1. Result — what happened, scaled to the margin, winner first.
 *  2. Odds vs reality — what the model said pre-match and how that aged
 *     (omitted when no pre-match call exists).
 *  3. Table context — where the result leaves both sides (rank, move, record).
 *  4. Players — only when there's a story: someone carried their side, hauled,
 *     or a headline pick blanked (omitted otherwise; the card already lists
 *     top scorers).
 *  5. Fun fact / theme — the most interesting thing the data offers: a
 *     season-high, a streak, a title-odds swing, or the fixture's weight.
 */

import {
  namedFixtureFor,
  matchupPersonalitySentences,
  managerFunFact,
  sprinkleInto,
  uniqueDerbies,
  titanicAside,
  canonicalManager,
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

function resultSentence(m, key) {
  const { winner, loser } = sides(m)
  if (!winner) {
    const score = `${m.home.points}–${m.away.points}`
    return pick(
      [
        `Nothing between ${m.home.name} and ${m.away.name} — a ${score} stalemate, a point apiece.`,
        `${m.home.name} and ${m.away.name} couldn't be separated at ${score}.`,
        `Deadlock: ${m.home.name} and ${m.away.name} shared the spoils at ${score}.`,
      ],
      key,
    )
  }
  const score = `${winner.points}–${loser.points}`
  const margin = winner.points - loser.points
  if (margin >= 25) {
    return pick(
      [
        `${winner.name} steamrolled ${loser.name} ${score} — the kind of scoreline that gets screenshotted.`,
        `A statement from ${winner.name}: ${loser.name} were blown away ${score}.`,
      ],
      key,
    )
  }
  if (margin <= 5) {
    return pick(
      [
        `${winner.name} edged ${loser.name} ${score} in a proper nail-biter.`,
        `${winner.name} squeaked past ${loser.name} ${score} — margins don't come much finer.`,
      ],
      key,
    )
  }
  return pick(
    [
      `${winner.name} took care of ${loser.name}, ${score}.`,
      `A solid week's work from ${winner.name}: ${score} over ${loser.name}.`,
      `${winner.name} had enough in the tank to see off ${loser.name}, ${score}.`,
    ],
    key,
  )
}

function oddsSentence(m, key) {
  if (!m.odds || !Number.isFinite(m.odds.favoritePct)) return null
  const fav = m.odds.favoriteSide === 'home' ? m.home : m.away
  const dog = m.odds.favoriteSide === 'home' ? m.away : m.home
  const p = Math.round(m.odds.favoritePct)
  const { winner } = sides(m)
  if (!winner) {
    return `The model leaned ${fav.name} at ${p}% pre-match, but the scoreboard refused to pick a side.`
  }
  if (winner.entryId === fav.entryId) {
    if (p >= 65) {
      return pick(
        [
          `No drama for the model — it had ${fav.name} at ${p}% and they delivered.`,
          `As expected: the model gave ${fav.name} ${p}% pre-match, and that's how it went.`,
        ],
        key,
      )
    }
    if (p >= 55) {
      return pick(
        [
          `The model leaned ${fav.name} at ${p}%, and the lean paid off.`,
          `Pre-match the model fancied ${fav.name} (${p}%) — right call.`,
        ],
        key,
      )
    }
    return `The model called it a near coin flip (${p}–${100 - p}) and ${fav.name} shaded it.`
  }
  if (p >= 65) {
    return pick(
      [
        `That's a proper upset — the model gave ${dog.name} just ${100 - p}% pre-match.`,
        `The model had ${fav.name} at ${p}% and ${dog.name} tore up the script.`,
      ],
      key,
    )
  }
  return pick(
    [
      `Mild upset: the model narrowly fancied ${fav.name} (${p}%), but ${dog.name} had other ideas.`,
      `The model's slight lean toward ${fav.name} (${p}%) didn't survive contact with the scoreboard.`,
    ],
    key,
  )
}

function rankClause(t, kind) {
  const pos = ordinal(t.rank)
  const moved = t.prevRank != null && t.prevRank !== t.rank
  if (kind === 'winner') {
    if (t.rank === 1 && moved) return `sends ${t.name} top of the table`
    if (t.rank === 1) return `keeps ${t.name} top of the pile`
    if (moved && t.rank < t.prevRank) return `lifts ${t.name} to ${pos}`
    return `leaves ${t.name} ${pos}`
  }
  if (kind === 'loser') {
    if (moved && t.rank > t.prevRank) return `drops ${t.name} to ${pos}`
    return `leaves ${t.name} ${pos}`
  }
  return `${t.name} sit ${pos}`
}

function contextSentence(m, key) {
  const { winner, loser } = sides(m)
  if (!winner) {
    return pick(
      [
        `The point leaves ${m.home.name} ${ordinal(m.home.rank)} at ${rec(m.home)}, with ${m.away.name} ${ordinal(m.away.rank)} at ${rec(m.away)}.`,
        `In the table, ${m.home.name} sit ${ordinal(m.home.rank)} (${rec(m.home)}) and ${m.away.name} ${ordinal(m.away.rank)} (${rec(m.away)}).`,
      ],
      key,
    )
  }
  return pick(
    [
      `The win ${rankClause(winner, 'winner')} at ${rec(winner)}, while the defeat ${rankClause(loser, 'loser')} at ${rec(loser)}.`,
      `That ${rankClause(winner, 'winner')} (${rec(winner)}); ${loser.name} are ${ordinal(loser.rank)} at ${rec(loser)}.`,
    ],
    key,
  )
}

/**
 * Player storyline, when one exists. Facts come from the archived XI
 * (m.home.players / m.away.players via sidePlayerFacts): `top` scorer,
 * `share` of team points, `haul` and `flop`. Returns null when the week was
 * unremarkable or no player data is archived.
 */
function playerSentence(m, key) {
  const { winner, loser } = sides(m)
  const ph = m.home.players
  const pa = m.away.players
  if (!ph && !pa) return null
  const pWinner = winner ? (winner === m.home ? ph : pa) : null
  const pLoser = loser ? (loser === m.home ? ph : pa) : null

  // Carried: the winner's top scorer did over a third of the work.
  if (pWinner?.top && pWinner.top.pts >= 15 && pWinner.share >= 0.33) {
    if (pWinner.share >= 0.4 && pWinner.top.pts >= 20) {
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

  // Haul + opposite-side blank is the juiciest combination.
  if (pWinner?.haul && pLoser?.flop) {
    return `${pWinner.haul.name} hauled ${pWinner.haul.pts} for ${winner.name} while ${loser.name}'s ${pLoser.flop.name} — pegged for ${pLoser.flop.xp} — managed just ${pLoser.flop.pts}.`
  }
  if (pWinner?.haul) {
    return pick(
      [
        `${pWinner.haul.name} led the charge for ${winner.name} with a ${pWinner.haul.pts}-point haul.`,
        `The difference-maker: ${pWinner.haul.name}'s ${pWinner.haul.pts} for ${winner.name}.`,
      ],
      key,
    )
  }
  if (pLoser?.flop) {
    return pick(
      [
        `${loser.name} will point at ${pLoser.flop.name}: projected for ${pLoser.flop.xp}, he returned ${pLoser.flop.pts}.`,
        `The blank that hurt: ${loser.name}'s ${pLoser.flop.name} (${pLoser.flop.pts} against a ${pLoser.flop.xp}-point call).`,
      ],
      key,
    )
  }
  // Losing side's haul wasted, or a draw with a standout.
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

function funFactSentence(m, key) {
  const { winner, loser } = sides(m)
  const candidates = []
  // Skip the season-high fact in the first two GWs — beating one prior week
  // isn't a story yet.
  if (winner && winner.isSeasonHigh && m.gw > 2) {
    candidates.push(
      `${winner.name}'s ${winner.points} is their best week of the season so far.`,
    )
  }
  const weekHighSide = [m.home, m.away].find((t) => t.isWeekHigh)
  if (weekHighSide) {
    candidates.push(
      `Nobody in the league scored more than ${weekHighSide.name}'s ${weekHighSide.points} this week.`,
    )
  }
  if (winner && winner.streak?.type === 'W' && winner.streak.len >= 3) {
    candidates.push(`That's ${winner.streak.len} straight wins for ${winner.name}.`)
  }
  if (loser && loser.streak?.type === 'L' && loser.streak.len >= 3) {
    candidates.push(
      `Alarm bells for ${loser.name} — ${loser.streak.len} defeats on the spin now.`,
    )
  }
  for (const t of [m.home, m.away]) {
    const o = t.titleOdds
    if (o && Number.isFinite(o.before) && Number.isFinite(o.after) && Math.abs(o.after - o.before) >= 5) {
      candidates.push(
        `The result moved ${t.name}'s title odds ${o.after > o.before ? 'up' : 'down'}: ${o.before}% → ${o.after}%.`,
      )
      break
    }
  }
  if (Number.isFinite(m.leagueAvg) && m.leagueAvg > 0) {
    const sum = m.home.points + m.away.points
    const par = m.leagueAvg * 2
    if (sum >= par + 12) {
      candidates.push(
        `At ${sum} combined points this was the week's heavyweight fixture.`,
      )
    } else if (sum <= par - 12) {
      candidates.push(
        `One for the purists: ${sum} combined points, well under the league's weekly par.`,
      )
    }
  }
  if (candidates.length === 0) {
    candidates.push(
      pick(
        [
          `Both sides finished within touching distance of their season averages — a matchup that went to form.`,
          `Nothing here to scare the algorithm: both teams landed close to their usual output.`,
        ],
        key,
      ),
    )
  }
  return candidates[0]
}

/**
 * Waiver / free-agent storyline, when the week's standout (or its biggest
 * blank) traces back to a transaction. Facts come from `sidePickupFacts` in
 * build-weekly-recaps.mjs (`side.pickup.star` / `side.pickup.flop`). Returns
 * null when nobody's roster moves are worth a mention.
 */
function waiverSentence(m, key) {
  const { winner, loser } = sides(m)
  const cands = []
  const when = (p) => (p.recent ? 'this week' : `back in GW${p.gw}`)

  // Winner rode a claimed player to the result — the juiciest waiver story.
  const ws = winner?.pickup?.star
  if (ws && (ws.wasHaul || ws.pts >= 12)) {
    cands.push(
      pick(
        [
          `${who(winner)}'s ${pickupLabel(ws.kind)} ${ws.name} (added ${when(ws)}) repaid the faith with ${ws.pts}.`,
          `That ${pickupLabel(ws.kind)} is ageing well: ${ws.name} chipped in ${ws.pts} for ${who(winner)}.`,
          `Shrewd business — ${who(winner)} plucked ${ws.name} off the wire and got ${ws.pts} out of him.`,
        ],
        key,
      ),
    )
  }

  // A pickup that starred for the losing or drawing side still deserves a nod.
  for (const side of [m.home, m.away]) {
    const s = side?.pickup?.star
    if (s && side !== winner && s.pts >= 12) {
      cands.push(
        `${who(side)}'s ${pickupLabel(s.kind)} ${s.name} justified the claim with ${s.pts} in a losing cause.`,
      )
    }
  }

  // A pickup that blanked — the decision that aged badly.
  const flopSide = [m.home, m.away].find((s) => s?.pickup?.flop)
  if (flopSide) {
    const f = flopSide.pickup.flop
    cands.push(
      pick(
        [
          `The ${puntLabel(f.kind)} on ${f.name} backfired for ${who(flopSide)} — ${f.pts} off a projected ${f.xp}.`,
          `${who(flopSide)} won't want to relive the ${puntLabel(f.kind)}: ${f.name} returned just ${f.pts}.`,
        ],
        key,
      ),
    )
  }

  return cands.length ? cands[0] : null
}

/**
 * Season head-to-head rivalry line between the two managers, once they've met
 * more than once (so it's a series, not a debut). Reads from `m.h2h`
 * (`homeWins` / `awayWins` / `draws`, oriented home/away). Null otherwise.
 */
function rivalrySentence(m) {
  const h = m.h2h
  if (!h || h.games < 2) return null
  const drawn = h.draws ? ` (${h.draws} drawn)` : ''
  const { winner, loser } = sides(m)
  // Two managers can share a first name (real leagues have brothers, repeats),
  // which makes "Nick vs Nick" gibberish — fall back to team names then.
  const hn = who(m.home)
  const an = who(m.away)
  const ambiguous =
    hn != null && an != null && String(hn).toLowerCase() === String(an).toLowerCase()
  const label = (side) => (ambiguous ? side.name : who(side))
  if (!winner) {
    return `Honours even again — the season series between ${label(m.home)} and ${label(m.away)} stays level at ${h.homeWins}–${h.awayWins}${drawn}.`
  }
  const winnerIsHome = winner === m.home
  const wWins = winnerIsHome ? h.homeWins : h.awayWins
  const lWins = winnerIsHome ? h.awayWins : h.homeWins
  if (wWins > lWins) {
    return `Bragging rights to ${label(winner)}: the season head-to-head with ${label(loser)} now reads ${wWins}–${lWins}${drawn}.`
  }
  if (wWins === lWins) {
    return `That squares their season series — ${label(m.home)} and ${label(m.away)} are locked at ${h.homeWins}–${h.awayWins}${drawn}.`
  }
  return `${label(winner)} got one back, but ${label(loser)} still lead the season series ${lWins}–${wWins}${drawn}.`
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/**
 * Named-fixture lead — when the two managers have a grudge-match nickname (see
 * leagueLore.js) it opens the recap, every single time they meet. Uses the
 * running meeting count for a "Round N" flavour when the series is known.
 */
function namedFixtureSentence(m, key) {
  const name = namedFixtureFor(m.home?.manager, m.away?.manager)
  if (!name) return null
  const round = m.h2h && Number.isFinite(m.h2h.games) ? m.h2h.games : null
  return pick(
    [
      `Another edition of ${name}.`,
      `${capitalize(name)} is back on the fixture list.`,
      round ? `Round ${round} of ${name}.` : `${capitalize(name)}, renewed.`,
    ],
    key,
  )
}

/**
 * Manager jokes. Mottershead always gets the vegan line, plus one extra
 * when the week hooks him. Everyone else is still a sprinkle (~1 in 3).
 */
function managerFunFactSentences(m, key) {
  return matchupPersonalitySentences(m, pick, key, variantIndex, {
    gate: 3,
    veganAlways: true,
  })
}

/**
 * The recap paragraph for one matchup: 3–7 sentences depending on whether the
 * fixture has a nickname, a pre-match model call, a player or roster-move
 * story, a manager running joke, and a season rivalry.
 *
 * @param {{
 *   gw: number,
 *   home: object, away: object,   // team facts (points, rank, record, streak,
 *                                 //  titleOdds, players via sidePlayerFacts, …)
 *   odds: { favoriteSide: 'home'|'away', favoritePct: number } | null,
 *   leagueAvg?: number | null,    // average team score this GW
 *   h2h?: { games, homeWins, awayWins, draws } | null,  // season series so far
 * }} m
 *
 * Sides may also carry `manager` (human name) and `pickup` (waiver/free-agent
 * storyline via sidePickupFacts) — both optional and used only for flavour.
 */
export function matchupRecapSentences(m) {
  const key = `${m.home.entryId}-${m.away.entryId}-gw${m.gw}-${m.home.points}-${m.away.points}`
  const out = []
  const named = namedFixtureSentence(m, `${key}-n`)
  if (named) out.push(named)
  out.push(resultSentence(m, `${key}-r`))
  const odds = oddsSentence(m, `${key}-o`)
  if (odds) out.push(odds)
  out.push(contextSentence(m, `${key}-c`))
  const players = playerSentence(m, `${key}-p`)
  if (players) out.push(players)
  const waiver = waiverSentence(m, `${key}-w`)
  if (waiver) out.push(waiver)
  const jokes = managerFunFactSentences(m, `${key}-mff`)
  const sprinkled = sprinkleInto(out, jokes, variantIndex, `${key}-mff`)
  // The season rivalry is the freshest bit of colour once it exists; otherwise
  // fall back to the best available fun fact.
  sprinkled.push(rivalrySentence(m) ?? funFactSentence(m, `${key}-f`))
  return sprinkled
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
      [`This week features ${names[0]}.`, `${capitalize(names[0])} is on the card.`],
      key,
    )
  }
  const last = names[names.length - 1]
  const head = names.slice(0, -1).map(capitalize).join(', ')
  return `${head} and ${last} headline the week.`
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
