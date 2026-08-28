/**
 * Template prose for the pre-match look-forward — one short paragraph per
 * MATCHUP, generated deterministically from the bookie board + squad facts
 * (same inputs → same words, so rebuilds never churn the JSON).
 *
 * The card chrome already shows win%, rank, record, key xP, and title %.
 * Prose therefore does not restate those numbers. It weaves:
 *  1. Named fixture — when the pairing has a nickname, it leads.
 *  2. Bookie lean — fractional prices (from the bookie sheet when present).
 *  3. Stakes — must-win / last-place / title chalk, when that actually matters.
 *  4. Waivers — a recent claim or free-agent add.
 *  5. Form — last week's over/underperformers.
 *  6. Watch list — names only (xP lives in the footer).
 *  7. Underdog path — qualitative, and only when it's a real chalk.
 *  8. Manager joke — vegan always-on for Mottershead; otherwise ~half the time.
 */

import { namedFixtureFor, managerFunFact, hasManagerLore, normManager } from './leagueLore.js'
import { variantIndex } from './weeklyRecapText.js'
import { probToFractionalOdds } from './oddsFormat.js'

const pick = (arr, key) => arr[variantIndex(key, arr.length)]

const firstName = (mgr) => {
  const s = String(mgr ?? '').trim()
  return s ? s.split(/\s+/)[0] : null
}

const who = (side) => firstName(side?.manager) || side?.name

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

const rec = (t) =>
  t?.record ? `${t.record.w}-${t.record.d}-${t.record.l}` : null

const played = (t) =>
  (Number(t?.record?.w) || 0) + (Number(t?.record?.d) || 0) + (Number(t?.record?.l) || 0)

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

/**
 * Last-week over/under from an archived XI (pts vs pre-match xP).
 * Over: beat xP by 4+ or scored 10+. Under: xP >= 4 and missed by 3+ (or blanked).
 * @param {Array<{ name?: string, pts?: number, xp?: number }>|null} xi
 * @returns {{ over: { name: string, pts: number, xp: number } | null, under: { name: string, pts: number, xp: number } | null } | null}
 */
export function formFromXi(xi) {
  if (!Array.isArray(xi) || xi.length === 0) return null
  let over = null
  let under = null
  for (const p of xi) {
    if (!p?.name) continue
    const pts = Number(p.pts)
    const xp = Number(p.xp)
    if (!Number.isFinite(pts) || !Number.isFinite(xp)) continue
    const delta = pts - xp
    if (delta >= 4 || pts >= 10) {
      if (!over || delta > over.delta) {
        over = { name: p.name, pts, xp: +xp.toFixed(1), delta }
      }
    }
    if (xp >= 4 && (delta <= -3 || pts <= 2)) {
      if (!under || delta < under.delta) {
        under = { name: p.name, pts, xp: +xp.toFixed(1), delta }
      }
    }
  }
  if (!over && !under) return null
  const strip = (row) => (row ? { name: row.name, pts: row.pts, xp: row.xp } : null)
  return { over: strip(over), under: strip(under) }
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

function favoriteSide(m) {
  if (!m?.odds) return { fav: null, dog: null, p: null }
  const side = m.odds.favoriteSide
  const fav = side === 'away' ? m.away : m.home
  const dog = side === 'away' ? m.home : m.away
  const p = Number.isFinite(m.odds.favoritePct) ? Math.round(m.odds.favoritePct) : null
  return { fav, dog, p }
}

function weeklyPrice(m, side) {
  if (!m?.bookie || !side) return null
  if (side === m.home) return m.bookie.home || null
  if (side === m.away) return m.bookie.away || null
  return null
}

function priceFor(m, side, fallbackPct) {
  return weeklyPrice(m, side) || probToFractionalOdds(fallbackPct)
}

/**
 * Fractional triple for the precall strip. Prefers the bookie sheet; falls
 * back to the model percents snapped onto the same ladder.
 * @param {{ bookie?: { home?: string, draw?: string, away?: string }, odds?: { home?: number, draw?: number, away?: number } }} m
 * @returns {{ home: string, draw: string, away: string } | null}
 */
export function bookiePrecall(m) {
  const h = m?.bookie?.home || probToFractionalOdds(m?.odds?.home)
  const d = m?.bookie?.draw || probToFractionalOdds(m?.odds?.draw)
  const a = m?.bookie?.away || probToFractionalOdds(m?.odds?.away)
  if (!h && !a) return null
  return { home: h || '–', draw: d || '–', away: a || '–' }
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

function favoriteSentence(m, key) {
  const { fav, dog, p } = favoriteSide(m)
  if (!fav || !dog || !Number.isFinite(p)) {
    return pick(
      [
        `${m.home.name} vs ${m.away.name} — the board has no lean yet.`,
        `No favourite here: ${m.home.name} and ${m.away.name} are unpriced.`,
      ],
      key,
    )
  }
  const favFrac = priceFor(m, fav, p)
  const dogFrac = priceFor(m, dog, Math.max(1, 100 - p))
  if (p >= 70) {
    if (favFrac && dogFrac) {
      return pick(
        [
          `The book has ${fav.name} as a short ${favFrac}; ${dog.name} are the long shot at ${dogFrac}.`,
          `Clear chalk on the board: ${fav.name} ${favFrac}, ${dog.name} ${dogFrac}.`,
        ],
        key,
      )
    }
    return `Clear chalk: ${fav.name} over ${dog.name}.`
  }
  if (p >= 58) {
    if (favFrac && dogFrac) {
      return pick(
        [
          `The book fancies ${fav.name} at ${favFrac}; ${dog.name} are ${dogFrac}.`,
          `${fav.name} the lean at ${favFrac} — ${dog.name} sit ${dogFrac}.`,
        ],
        key,
      )
    }
    return `${fav.name} are the lean over ${dog.name}.`
  }
  if (favFrac && dogFrac) {
    return pick(
      [
        `Tight on the board: ${fav.name} ${favFrac}, ${dog.name} ${dogFrac}.`,
        `Coin-flip prices: ${fav.name} ${favFrac} and ${dog.name} ${dogFrac}.`,
      ],
      key,
    )
  }
  return pick(
    [
      `This one's tight. ${fav.name} just shade it.`,
      `Coin-flip territory between ${fav.name} and ${dog.name}.`,
    ],
    key,
  )
}

function isDesperate(t) {
  if (!t || played(t) < 1 || (t.record?.w ?? 0) > 0) return false
  const lastPct = Number(t.lastPct)
  return t.rank === 8 || (Number.isFinite(lastPct) && lastPct >= 20)
}

function stakesSentence(m, key) {
  const desperate = [m.home, m.away].find(isDesperate)
  if (desperate) {
    const lastPrice = desperate.lastPrice
    if (desperate.rank === 8 && lastPrice) {
      return pick(
        [
          `${desperate.name} are ${rec(desperate)} and last; the book has them ${lastPrice} to finish bottom.`,
          `${desperate.name} sit last at ${rec(desperate)} — ${lastPrice} with the book to go last, so this one matters.`,
        ],
        key,
      )
    }
    if (desperate.rank === 8) {
      return `${desperate.name} are ${rec(desperate)} and last. They need this one.`
    }
    if (lastPrice) {
      return `${desperate.name} are ${rec(desperate)}; the book has them ${lastPrice} to finish last.`
    }
    return `${desperate.name} are ${rec(desperate)} and can't afford another L.`
  }

  const homeTitle = Number(m.home?.titlePct)
  const awayTitle = Number(m.away?.titlePct)
  if (!Number.isFinite(homeTitle) || !Number.isFinite(awayTitle)) return null
  const lead = homeTitle >= awayTitle ? m.home : m.away
  const trail = lead === m.home ? m.away : m.home
  const gap = Math.abs(homeTitle - awayTitle)
  if (Number(lead.titlePct) < 20 || gap < 8) return null
  const price = lead.titlePrice
  if (price) {
    return pick(
      [
        `${lead.name} are the title chalk at ${price}.`,
        `Title board still has ${lead.name} out in front at ${price}; ${trail.name} are chasing.`,
      ],
      key,
    )
  }
  return `${lead.name} still lead the title board.`
}

function pickupOf(side) {
  const list = Array.isArray(side?.recentPickups) ? side.recentPickups : []
  const p = list.find((row) => row?.name)
  if (!p) return null
  return { side, name: p.name, kind: p.kind === 'f' ? 'free-agent' : 'waiver' }
}

function waiverSentence(m, key) {
  const bits = [pickupOf(m.home), pickupOf(m.away)].filter(Boolean)
  if (bits.length === 0) return null
  if (bits.length === 1) {
    const b = bits[0]
    return pick(
      [
        `${who(b.side)} brought in ${b.name} on the ${b.kind} last week.`,
        `${b.name} is the new ${b.kind} piece for ${b.side.name}.`,
      ],
      key,
    )
  }
  return `${who(bits[0].side)} claimed ${bits[0].name}; ${who(bits[1].side)} added ${bits[1].name}.`
}

function sideLabel(m, side) {
  const hn = who(m.home)
  const an = who(m.away)
  if (hn && an && String(hn).toLowerCase() === String(an).toLowerCase()) return side.name
  return who(side)
}

function formSentence(m) {
  const pack = (side, row) => (row?.name ? { side, ...row } : null)
  const homeO = pack(m.home, m.home?.form?.over)
  const homeU = pack(m.home, m.home?.form?.under)
  const awayO = pack(m.away, m.away?.form?.over)
  const awayU = pack(m.away, m.away?.form?.under)

  const juice = (o, u) => (o.pts - o.xp) + (u.xp - u.pts)
  const cross = []
  if (homeO && awayU) cross.push({ o: homeO, u: awayU })
  if (awayO && homeU) cross.push({ o: awayO, u: homeU })
  if (cross.length) {
    cross.sort((a, b) => juice(b.o, b.u) - juice(a.o, a.u))
    const { o, u } = cross[0]
    return `${o.name} already overdelivered for ${sideLabel(m, o.side)} last week (${o.pts}); ${u.name} returned ${u.pts} from ${formatXp(u.xp)} for ${sideLabel(m, u.side)}.`
  }

  const o = homeO || awayO
  const u = homeU || awayU
  if (o && u && o.name !== u.name) {
    return `${o.name} already overdelivered for ${sideLabel(m, o.side)} last week (${o.pts}); ${u.name} returned ${u.pts} from ${formatXp(u.xp)} for ${sideLabel(m, u.side)}.`
  }
  if (o) {
    return `${o.name} overperformed for ${sideLabel(m, o.side)} last week with ${o.pts}.`
  }
  if (u) {
    return `${u.name} underperformed for ${sideLabel(m, u.side)} last week: ${u.pts} from ${formatXp(u.xp)}.`
  }
  return null
}

function namedAlready(mentioned, p) {
  return p?.name && mentioned.has(p.name)
}

function keysSentence(m, key, mentioned) {
  const homeKeys = Array.isArray(m.home?.keys) ? m.home.keys : []
  const awayKeys = Array.isArray(m.away?.keys) ? m.away.keys : []
  const h = homeKeys[0]?.name && !namedAlready(mentioned, homeKeys[0]) ? homeKeys[0].name : null
  const a = awayKeys[0]?.name && !namedAlready(mentioned, awayKeys[0]) ? awayKeys[0].name : null
  if (!h && !a) return null
  if (h && a) {
    return pick(
      [
        `Players to watch: ${h} for ${m.home.name}, ${a} for ${m.away.name}.`,
        `The hinge is ${h} against ${a}.`,
      ],
      key,
    )
  }
  return h
    ? `${h} is the one to watch for ${m.home.name}.`
    : `${a} is the one to watch for ${m.away.name}.`
}

function underdogSentence(m, key) {
  const { fav, dog, p } = favoriteSide(m)
  if (!fav || !dog || !Number.isFinite(p) || p < 65) return null
  const favKey = leadWatch(fav.keys)?.name
  const dogKey = leadWatch(dog.keys)?.name
  const haul = dogKey ? `${dogKey} to haul` : 'a haul from somewhere unexpected'
  const blank = favKey ? `${favKey} to blank` : `${fav.name}'s big name to blank`
  return pick(
    [
      `For ${dog.name} to win, they need ${haul} and ${blank}.`,
      `${who(dog)}'s path is ugly: ${blank}, plus ${haul}.`,
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

function mentionedPlayers(m) {
  const names = new Set()
  for (const side of [m.home, m.away]) {
    for (const p of side?.recentPickups ?? []) {
      if (p?.name) names.add(p.name)
    }
    if (side?.form?.over?.name) names.add(side.form.over.name)
    if (side?.form?.under?.name) names.add(side.form.under.name)
  }
  return names
}

/**
 * The pre-match paragraph for one matchup.
 *
 * @param {{
 *   gw: number,
 *   home: object, away: object,
 *   odds: { favoriteSide: 'home'|'away', favoritePct: number, home?: number, draw?: number, away?: number } | null,
 *   bookie?: { home?: string, draw?: string, away?: string } | null,
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
  const stakes = stakesSentence(m, `${key}-s`)
  if (stakes) out.push(stakes)
  const waiver = waiverSentence(m, `${key}-w`)
  if (waiver) out.push(waiver)
  const form = formSentence(m)
  if (form) out.push(form)
  const keys = keysSentence(m, `${key}-k`, mentionedPlayers(m))
  if (keys) out.push(keys)
  const dog = underdogSentence(m, `${key}-u`)
  if (dog) out.push(dog)
  const joke = managerFunFactSentence(m, `${key}-mff`)
  if (joke) out.push(joke)
  const series = rivalrySentence(m)
  if (series) out.push(series)
  return out
}
