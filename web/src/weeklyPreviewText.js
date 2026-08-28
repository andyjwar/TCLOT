/**
 * Template prose for the pre-match look-forward — one short paragraph per
 * MATCHUP, generated deterministically from model odds + watch-list players
 * (same inputs → same words, so rebuilds never churn the JSON).
 *
 *  1. Named fixture — when the pairing has a nickname, it leads.
 *  2. Favourite — who the model fancies, by how much, and why.
 *  3. Watch list — the highest-xP players on each side.
 *  4. Underdog path — what has to break for the dog to win.
 *  5. Manager joke / tidbit — vegan, Boxhead, twins, etc. Always on for
 *     Mottershead (the vegan brief); otherwise ~half the time.
 */

import { namedFixtureFor, managerFunFact, hasManagerLore, normManager } from './leagueLore.js'
import { variantIndex, ordinal } from './weeklyRecapText.js'

const pick = (arr, key) => arr[variantIndex(key, arr.length)]

const firstName = (mgr) => {
  const s = String(mgr ?? '').trim()
  return s ? s.split(/\s+/)[0] : null
}

const who = (side) => firstName(side?.manager) || side?.name

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Nick Mottershead's vegan jokes should always land in the preview. */
export function isVeganManager(manager) {
  return normManager(manager) === 'nick mottershead'
}

/**
 * Round a 3-way probability triple to integer percents that sum to 100.
 * @param {{ home?: number, draw?: number, away?: number }} probs
 *   Fractions (0–1) or already-percent (0–100); auto-detected.
 * @returns {{ home: number, draw: number, away: number }}
 */
export function oddsPercents(probs) {
  const h = Number(probs?.home)
  const d = Number(probs?.draw)
  const a = Number(probs?.away)
  const raw = [h, d, a].map((n) => (Number.isFinite(n) ? n : 0))
  const sum = raw[0] + raw[1] + raw[2]
  if (!(sum > 0)) return { home: 50, draw: 0, away: 50 }
  const normalised = raw.map((n) => (n * 100) / sum)
  const floored = normalised.map((n) => Math.floor(n))
  let leftover = 100 - floored.reduce((s, n) => s + n, 0)
  const order = normalised
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac)
  for (const { i } of order) {
    if (leftover <= 0) break
    floored[i] += 1
    leftover -= 1
  }
  return { home: floored[0], draw: floored[1], away: floored[2] }
}

/**
 * Top-N watch-list players from an archived XI (sorted by pre-match xP).
 * @param {Array<{ id?: number, name?: string, pos?: string, xp?: number }>|null} xi
 * @param {number} [n]
 */
export function watchPlayersFromXi(xi, n = 2) {
  if (!Array.isArray(xi) || xi.length === 0) return []
  return [...xi]
    .filter((p) => p && p.name && Number.isFinite(Number(p.xp)))
    .sort((a, b) => Number(b.xp) - Number(a.xp))
    .slice(0, n)
    .map((p) => ({
      id: p.id ?? null,
      name: p.name,
      pos: p.pos ?? '',
      xp: +Number(p.xp).toFixed(1),
    }))
}

/**
 * Top-N watch-list players from current-squad forecasts
 * (`predictions.json` totalPoints).
 * @param {Array<{ id?: number, name?: string, pos?: string, xp?: number }>|null} players
 * @param {number} [n]
 */
export function watchPlayersFromForecasts(players, n = 2) {
  return watchPlayersFromXi(players, n)
}

function formatXp(xp) {
  const n = Number(xp)
  if (!Number.isFinite(n)) return ''
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function isKeeper(p) {
  const pos = String(p?.pos ?? '').toUpperCase()
  return pos === 'GK' || pos === 'GKP'
}

function leadWatch(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return null
  return keys.find((p) => !isKeeper(p)) ?? keys[0]
}

function playerChip(p) {
  if (!p?.name) return null
  const xp = formatXp(p.xp)
  return xp ? `${p.name} (${xp})` : p.name
}

function favoriteSide(m) {
  if (!m?.odds) return { fav: null, dog: null, p: null }
  const side = m.odds.favoriteSide
  const fav = side === 'away' ? m.away : m.home
  const dog = side === 'away' ? m.home : m.away
  const p = Number.isFinite(m.odds.favoritePct) ? Math.round(m.odds.favoritePct) : null
  return { fav, dog, p }
}

function predictedFor(m, side) {
  if (!m?.predicted) return null
  const n = Number(side === m.home ? m.predicted.home : m.predicted.away)
  return Number.isFinite(n) ? n : null
}

function namedFixtureSentence(m, key) {
  const name = namedFixtureFor(m.home?.manager, m.away?.manager)
  if (!name) return null
  const round = m.h2h && Number.isFinite(m.h2h.games) ? m.h2h.games + 1 : null
  return pick(
    [
      `${capitalize(name)} is up next.`,
      `This week's edition of ${name}.`,
      round && round > 1 ? `Round ${round} of ${name}.` : `${capitalize(name)} returns.`,
    ],
    key,
  )
}

function whyFavorite(m, fav, dog) {
  const favPred = predictedFor(m, fav)
  const dogPred = predictedFor(m, dog)
  if (Number.isFinite(favPred) && Number.isFinite(dogPred) && Math.abs(favPred - dogPred) >= 1) {
    return `Projected points: ${Math.round(favPred)} to ${Math.round(dogPred)}.`
  }
  const favRank = Number(fav?.rank)
  const dogRank = Number(dog?.rank)
  if (Number.isFinite(favRank) && Number.isFinite(dogRank) && favRank !== dogRank) {
    return `${fav.name} sit ${ordinal(favRank)}; ${dog.name} are ${ordinal(dogRank)}.`
  }
  const favTitle = Number(fav?.titlePct)
  const dogTitle = Number(dog?.titlePct)
  if (Number.isFinite(favTitle) && Number.isFinite(dogTitle) && Math.abs(favTitle - dogTitle) >= 3) {
    return `Title odds: ${fav.name} ${favTitle}% vs ${dog.name} ${dogTitle}%.`
  }
  return null
}

function favoriteSentence(m, key) {
  const { fav, dog, p } = favoriteSide(m)
  if (!fav || !dog || !Number.isFinite(p)) {
    return pick(
      [
        `${m.home.name} vs ${m.away.name} — the model has no lean yet.`,
        `No favourite here: ${m.home.name} and ${m.away.name} are unpriced.`,
      ],
      key,
    )
  }
  const why = whyFavorite(m, fav, dog)
  if (p >= 70) {
    const lead = pick(
      [
        `The model has ${fav.name} as heavy favourites at ${p}%.`,
        `Clear chalk: ${fav.name} at ${p}%, ${dog.name} the long shot.`,
      ],
      key,
    )
    return why ? `${lead} ${why}` : lead
  }
  if (p >= 58) {
    const lead = pick(
      [
        `The model fancies ${fav.name} (${p}%) over ${dog.name}.`,
        `${fav.name} are favourites at ${p}% — not a lock, but the lean is real.`,
      ],
      key,
    )
    return why ? `${lead} ${why}` : lead
  }
  const lead = pick(
    [
      `This one's tight. ${fav.name} just shade it at ${p}%.`,
      `Coin-flip territory: ${fav.name} ${p}%, ${dog.name} ${100 - p}%.`,
    ],
    key,
  )
  return why ? `${lead} ${why}` : lead
}

function keysSentence(m, key) {
  const homeKeys = Array.isArray(m.home?.keys) ? m.home.keys : []
  const awayKeys = Array.isArray(m.away?.keys) ? m.away.keys : []
  const h = homeKeys[0] ? playerChip(homeKeys[0]) : null
  const a = awayKeys[0] ? playerChip(awayKeys[0]) : null
  if (!h && !a) return null
  const h2 = homeKeys[1] ? playerChip(homeKeys[1]) : null
  const a2 = awayKeys[1] ? playerChip(awayKeys[1]) : null
  if (h && a) {
    const extra = [h2, a2].filter(Boolean)
    const base = pick(
      [
        `Players to watch: ${h} for ${m.home.name}, ${a} for ${m.away.name}.`,
        `The model's scoring runs through ${h} for ${m.home.name} and ${a} for ${m.away.name}.`,
      ],
      key,
    )
    if (extra.length === 0) return base
    return `${base} Also in the mix: ${extra.join(' and ')}.`
  }
  const only = h
    ? `${h} is the one to watch for ${m.home.name}.`
    : `${a} is the one to watch for ${m.away.name}.`
  return only
}

function underdogSentence(m, key) {
  const { fav, dog, p } = favoriteSide(m)
  if (!fav || !dog || !Number.isFinite(p)) return null
  const favKey = playerChip(leadWatch(fav.keys))
  const dogKey = playerChip(leadWatch(dog.keys))
  const favPred = predictedFor(m, fav)
  const dogPred = predictedFor(m, dog)
  const gap =
    Number.isFinite(favPred) && Number.isFinite(dogPred)
      ? Math.max(1, Math.round(Math.abs(favPred - dogPred)))
      : null

  if (p >= 70) {
    const haul = dogKey ? `${dogKey} to haul` : 'a haul from somewhere unexpected'
    const blank = favKey ? `${favKey} to blank` : `${fav.name}'s big name to blank`
    return pick(
      [
        `For ${dog.name} to win, they need ${haul} and ${blank}. The model is not waiting up.`,
        `${who(dog)}'s path is ugly: ${blank}, plus ${haul}.`,
      ],
      key,
    )
  }
  if (gap != null && gap >= 2) {
    const extra = `${gap} extra point${gap === 1 ? '' : 's'}`
    const orBlank = favKey ? `, or ${favKey} to have a quiet one` : ''
    return pick(
      [
        `${dog.name} need roughly ${extra} on the projection${orBlank}.`,
        `The gap is about ${extra} — doable if ${who(dog)}'s ${dogKey ? dogKey.replace(/ \(.+\)$/, '') : 'attack'} turns up${orBlank}.`,
      ],
      key,
    )
  }
  return pick(
    [
      `${dog.name} are close enough that one good captain-week flips it.`,
      `Not much in it: ${who(dog)} just needs their XI to actually play.`,
    ],
    key,
  )
}

/**
 * Manager running joke. Vegan (Mottershead) always fires when he's in the
 * fixture. Everyone else with lore lands about half the time.
 */
function managerFunFactSentence(m, key) {
  const home = m.home?.manager
  const away = m.away?.manager
  const veganHome = isVeganManager(home)
  const veganAway = isVeganManager(away)
  if (veganHome || veganAway) {
    const manager = veganHome ? home : away
    return managerFunFact(manager, pick, key)
  }
  const homeHas = hasManagerLore(home)
  const awayHas = hasManagerLore(away)
  if (!homeHas && !awayHas) return null
  if (variantIndex(`${key}-gate`, 2) !== 0) return null
  let manager
  if (homeHas && awayHas) manager = variantIndex(`${key}-side`, 2) === 0 ? home : away
  else manager = homeHas ? home : away
  return managerFunFact(manager, pick, key)
}

function rivalrySentence(m) {
  const h = m.h2h
  if (!h || h.games < 1) return null
  const hn = who(m.home)
  const an = who(m.away)
  const ambiguous =
    hn != null && an != null && String(hn).toLowerCase() === String(an).toLowerCase()
  const label = (side) => (ambiguous ? side.name : who(side))
  if (h.games === 1) {
    const last =
      h.homeWins > h.awayWins
        ? `${label(m.home)} took the first meeting`
        : h.awayWins > h.homeWins
          ? `${label(m.away)} took the first meeting`
          : 'they drew last time'
    return `${last} — this is round two.`
  }
  const drawn = h.draws ? ` (${h.draws} drawn)` : ''
  if (h.homeWins === h.awayWins) {
    return `Season series locked at ${h.homeWins}–${h.awayWins}${drawn} heading in.`
  }
  const leader = h.homeWins > h.awayWins ? m.home : m.away
  const lw = Math.max(h.homeWins, h.awayWins)
  const tw = Math.min(h.homeWins, h.awayWins)
  return `${label(leader)} lead the season series ${lw}–${tw}${drawn}.`
}

/**
 * The pre-match paragraph for one matchup.
 *
 * @param {{
 *   gw: number,
 *   home: object, away: object,  // name, manager, rank, record, titlePct, keys
 *   odds: { favoriteSide: 'home'|'away', favoritePct: number } | null,
 *   predicted?: { home: number, away: number } | null,
 *   h2h?: { games, homeWins, awayWins, draws } | null,
 * }} m
 */
export function matchupPreviewSentences(m) {
  const key = `${m.home.entryId}-${m.away.entryId}-gw${m.gw}-preview`
  const out = []
  const named = namedFixtureSentence(m, `${key}-n`)
  if (named) out.push(named)
  out.push(favoriteSentence(m, `${key}-f`))
  const keys = keysSentence(m, `${key}-k`)
  if (keys) out.push(keys)
  const dog = underdogSentence(m, `${key}-u`)
  if (dog) out.push(dog)
  const joke = managerFunFactSentence(m, `${key}-mff`)
  if (joke) out.push(joke)
  const series = rivalrySentence(m)
  if (series) out.push(series)
  return out
}
