/**
 * Template prose for the weekly recap — one short paragraph per MATCHUP,
 * generated deterministically from match facts (same inputs → same words,
 * so rebuilds never churn the JSON).
 *
 *  1. Result — what happened, scaled to the margin, winner first.
 *  2. Odds vs reality — what the model said pre-match and how that aged
 *     (omitted when no pre-match call exists).
 *  3. Table context — where the result leaves both sides (rank, move, record).
 *  4. Fun fact / theme — the most interesting thing the data offers: a
 *     season-high, a streak, a title-odds swing, or the fixture's weight.
 */

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

function resultSentence(m, key) {
  const { winner, loser } = sides(m)
  if (!winner) {
    const score = `${m.home.points}–${m.away.points}`
    return pick(
      [
        `Nothing between ${m.home.name} and ${m.away.name} — a ${score} stalemate, a point apiece.`,
        `${m.home.name} and ${m.away.name} couldn't be separated at ${score}.`,
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
          `Chalk: the model gave ${fav.name} ${p}% pre-match, and that's how it went.`,
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
 * The recap paragraph for one matchup: 3 sentences (4 when a pre-match model
 * call exists).
 *
 * @param {{
 *   gw: number,
 *   home: object, away: object,   // team facts (points, rank, record, streak, titleOdds, …)
 *   odds: { favoriteSide: 'home'|'away', favoritePct: number } | null,
 *   leagueAvg?: number | null,    // average team score this GW
 * }} m
 */
export function matchupRecapSentences(m) {
  const key = `${m.home.entryId}-${m.away.entryId}-gw${m.gw}-${m.home.points}-${m.away.points}`
  const out = [resultSentence(m, `${key}-r`)]
  const odds = oddsSentence(m, `${key}-o`)
  if (odds) out.push(odds)
  out.push(contextSentence(m, `${key}-c`))
  out.push(funFactSentence(m, `${key}-f`))
  return out
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
