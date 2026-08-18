/**
 * Template prose for the weekly recap: three sentences per team, generated
 * deterministically from match facts (same inputs → same words, so rebuilds
 * never churn the JSON).
 *
 *  1. Result — what happened, scaled to the margin.
 *  2. Trend — streak, rank move, or record.
 *  3. Model — title-odds swing when it moved, points-vs-average otherwise.
 */

/** Small deterministic hash for stable template variation per team+GW. */
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

function resultSentence(f, key) {
  const score = `${f.points}–${f.oppPoints}`
  if (f.result === 'D') {
    return pick(
      [
        `Nothing between ${f.name} and ${f.oppName} — a ${score} stalemate.`,
        `${f.name} and ${f.oppName} played out a ${score} draw, a point apiece.`,
      ],
      key,
    )
  }
  if (f.result === 'W') {
    if (f.margin >= 25) {
      return pick(
        [
          `${f.name} steamrolled ${f.oppName} ${score} — the kind of scoreline that gets screenshotted.`,
          `A statement from ${f.name}: ${f.oppName} were blown away ${score}.`,
        ],
        key,
      )
    }
    if (f.margin <= 5) {
      return pick(
        [
          `${f.name} edged ${f.oppName} ${score} in a proper nail-biter.`,
          `${f.name} squeaked past ${f.oppName} ${score} — margins don't come much finer.`,
        ],
        key,
      )
    }
    return pick(
      [
        `${f.name} took care of ${f.oppName}, ${score}.`,
        `A solid week's work from ${f.name}: ${score} over ${f.oppName}.`,
      ],
      key,
    )
  }
  // loss
  if (f.margin >= 25) {
    return pick(
      [
        `A week to forget for ${f.name}, flattened ${score} by ${f.oppName}.`,
        `${f.name} were on the wrong end of a ${score} hammering from ${f.oppName}.`,
      ],
      key,
    )
  }
  if (f.margin <= 5) {
    return pick(
      [
        `${f.name} fell just short against ${f.oppName}, ${score} — fine margins, wrong side.`,
        `So close for ${f.name}: ${f.oppName} nicked it ${score}.`,
      ],
      key,
    )
  }
  return pick(
    [
      `${f.name} came up short against ${f.oppName}, ${score}.`,
      // Opponent named first → score flips to their perspective.
      `${f.oppName} had too much for ${f.name}, ${f.oppPoints}–${f.points}.`,
    ],
    key,
  )
}

function trendSentence(f, key) {
  const rec = `${f.record.w}-${f.record.d}-${f.record.l}`
  if (f.streak && f.streak.len >= 3) {
    return f.streak.type === 'W'
      ? `That's ${f.streak.len} wins on the spin — ${rec} and rolling.`
      : f.streak.type === 'L'
        ? `The slide is real: ${f.streak.len} straight defeats and a ${rec} record.`
        : `A third draw in a row — ${rec} overall.`
  }
  if (f.prevRank != null && f.rank != null && f.rank !== f.prevRank) {
    const dir = f.rank < f.prevRank ? 'up' : 'down'
    const moved = Math.abs(f.rank - f.prevRank)
    if (f.rank === 1 && dir === 'up') {
      return `That result sends them top of the table at ${rec}.`
    }
    return pick(
      [
        `They move ${dir} ${moved === 1 ? 'a place' : `${moved} places`} to ${ordinal(f.rank)}, ${rec} on the season.`,
        `The table says ${ordinal(f.rank)} now — ${dir} from ${ordinal(f.prevRank)} at ${rec}.`,
      ],
      key,
    )
  }
  if (f.rank === 1) {
    return `They stay top of the pile at ${rec}.`
  }
  return pick(
    [
      `They sit ${ordinal(f.rank)} at ${rec}.`,
      `That leaves them ${ordinal(f.rank)} on the season, ${rec}.`,
    ],
    key,
  )
}

function modelSentence(f, odds, key) {
  const before = odds?.before
  const after = odds?.after
  if (
    Number.isFinite(before) &&
    Number.isFinite(after) &&
    Math.abs(after - before) >= 1.5
  ) {
    const dir = after > before ? 'up' : 'down'
    return `The model moved their title odds ${dir}: ${before}% → ${after}%.`
  }
  if (f.isSeasonHigh && f.points > 0) {
    return `The ${f.points} is a season-high — their best week of the campaign so far.`
  }
  if (f.isWeekHigh) {
    return `Their ${f.points} was the biggest score anyone managed this week.`
  }
  const diff = f.points - f.seasonAvg
  if (Math.abs(diff) >= 8) {
    return diff > 0
      ? `The ${f.points} came in well above their ${f.seasonAvg}-point season average.`
      : `The ${f.points} was well below their ${f.seasonAvg}-point season average — a quiet week from the squad.`
  }
  return pick(
    [
      `The ${f.points} sits right on their season average of ${f.seasonAvg}.`,
      `About par for them: ${f.points} against a season average of ${f.seasonAvg}.`,
    ],
    key,
  )
}

/**
 * Three sentences for one team's gameweek.
 *
 * @param {object} facts one team's entry from `recapFactsForGw`
 * @param {{ before: number, after: number } | null} odds title odds around the GW
 */
export function teamRecapSentences(facts, odds) {
  const key = `${facts.entryId}-gw${facts.gw ?? ''}-${facts.points}-${facts.oppPoints}`
  return [
    resultSentence(facts, `${key}-r`),
    trendSentence(facts, `${key}-t`),
    modelSentence(facts, odds, `${key}-m`),
  ]
}

export function ordinal(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return String(n)
  const s = ['th', 'st', 'nd', 'rd']
  const mod = v % 100
  return `${v}${s[(mod - 20) % 10] || s[mod] || s[0]}`
}
