/**
 * Scan-first recap/preview copy. Turns baked weekly-recaps.json into
 * header tiles, per-fixture stat boxes, two interesting bullets, and a
 * two-sentence personality recap — no paragraphs, no repeated lines.
 */

import {
  allManagerJokes,
  isTitanicPair,
  namedFixtureFor,
  titanicAside,
} from './leagueLore.js'
import { standingsMobileTeamName } from './teamNameUtils.js'
import { variantIndex } from './weeklyRecapText.js'

export const RECAP_LAYOUTS = ['glance', 'polaroid', 'combo', 'classic']
export const RECAP_LAYOUT_STORAGE = 'tclot-recap-layout'

const TABLE_OPEN = /^(That leaves|That keeps|Both sides finished)\b/
const QUIPPY =
  /vegan|twin|sleep|complimentary|people'?s champion|invented|cheerfully|plant-based|whatever sleep/i
const STALE_TAKE = /will have a take/i

export function shortTeam(name) {
  return standingsMobileTeamName(name) || name || '–'
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

export function stripEnd(s) {
  return String(s || '')
    .replace(/[.!?]+$/, '')
    .trim()
}

const pick = (arr, key) => arr[variantIndex(key, arr.length)]

function firstName(mgr) {
  const s = String(mgr ?? '').trim()
  return s ? s.split(/\s+/)[0] : null
}

function who(side) {
  return firstName(side?.manager) || side?.name || 'they'
}

function favSide(m) {
  if (m?.odds?.favoriteSide === 'away') return m.away
  if (m?.odds?.favoriteSide === 'home') return m.home
  return null
}

function sameLine(a, b) {
  return stripEnd(a).toLowerCase() === stripEnd(b).toLowerCase()
}

function overlaps(line, used) {
  const n = stripEnd(line).toLowerCase()
  if (!n) return true
  for (const u of used) {
    const other = stripEnd(u).toLowerCase()
    if (!other) continue
    if (n === other) return true
    if (n.length > 24 && other.includes(n)) return true
    if (other.length > 24 && n.includes(other)) return true
  }
  return false
}

function fixtureKey(m, preview) {
  const gw = m?.gw ?? ''
  return `${preview ? 'p' : 'r'}-${gw}-${m?.home?.entryId ?? ''}-${m?.away?.entryId ?? ''}`
}

export function pickQuip(sentences) {
  const list = (sentences || []).map(stripEnd).filter(Boolean)
  return (
    list.find((s) => QUIPPY.test(s)) ||
    list.find((s) => !TABLE_OPEN.test(s) && !/\d{2}%/.test(s) && s.length < 96) ||
    null
  )
}

function jokeFromPool(manager, salt, usedSet) {
  const pool = allManagerJokes(manager).filter((t) => !STALE_TAKE.test(t))
  if (!pool.length) return null
  const fresh = pool.filter((t) => !usedSet.has(stripEnd(t).toLowerCase()))
  const choice = pick(fresh.length ? fresh : pool, salt)
  return stripEnd(choice)
}

/** Always two personality sentences, rotating the full lore pool. */
export function personalityRecap(m, preview = false, used = []) {
  const key = fixtureKey(m, preview)
  const usedSet = new Set(
    (used || []).map((s) => stripEnd(s).toLowerCase()).filter(Boolean),
  )
  const lines = []

  const add = (line) => {
    const s = stripEnd(line)
    if (!s || usedSet.has(s.toLowerCase()) || STALE_TAKE.test(s)) return
    usedSet.add(s.toLowerCase())
    lines.push(s)
  }

  for (const [side, salt] of [
    [m?.home, `${key}-h`],
    [m?.away, `${key}-a`],
  ]) {
    if (!side || lines.length >= 2) continue
    add(jokeFromPool(side.manager, salt, usedSet))
  }

  if (lines.length < 2 && isTitanicPair(m?.home?.manager, m?.away?.manager)) {
    add(titanicAside(pick, `${key}-titanic`))
  }

  const derby = m?.derby || namedFixtureFor(m?.home?.manager, m?.away?.manager)
  if (lines.length < 2 && derby) {
    add(
      pick(
        [
          `${derby.replace(/^the /i, '')} again, and neither of them will let it pass quietly`,
          `This is ${derby}, so the group chat is already writing the minutes`,
        ],
        `${key}-derby`,
      ),
    )
  }

  if (lines.length < 2) {
    add(
      pick(
        [
          `${who(m.home)} is already narrating this like it was the plan`,
          `${who(m.away)} has a theory, and the scoreboard is the footnote`,
        ],
        `${key}-fallback`,
      ),
    )
  }

  return lines.slice(0, 2)
}

function recapStatTiles(m) {
  const fav = favSide(m)
  const whoFor = shortTeam(fav?.name)
  const call =
    m?.odds?.outcome === 'miss'
      ? tile('Model', 'Wrong', whoFor, 'loss')
      : m?.odds?.outcome === 'hit'
        ? tile('Model', 'Right', whoFor, 'win')
        : tile('Model', whoFor, 'pre-match')

  const tops = [m?.home?.players?.top, m?.away?.players?.top].filter((p) => p?.name)
  const best = [...tops].sort((a, b) => (b.pts || 0) - (a.pts || 0))[0]
  const star = tile('Top scorer', best?.pts, best?.name)

  const flops = [m?.home?.players?.flop, m?.away?.players?.flop].filter(
    (p) => p?.name && Number.isFinite(p.pts),
  )
  const flop = flops.find((p) => Number.isFinite(p.xp) && p.pts < p.xp) || flops[0]
  const dud = flop
    ? tile('Dud', flop.pts, flop.name, 'loss')
    : null

  return [call, star, dud].filter(Boolean).slice(0, 3)
}

function squareTeam(name) {
  const s = shortTeam(name)
  if (!s || s === '–') return s
  if (/^msfg$/i.test(s)) return s
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length > 1 && /^(atl[eé]tico|fc|afc|the)$/i.test(parts[0])) {
    return parts[1]
  }
  return parts[0]
}

function previewStatTiles(m) {
  const fav = m?.odds?.favoriteSide
  const home = tile(
    squareTeam(m?.home?.name),
    m?.bookie?.home,
    '',
    fav === 'home' ? 'win' : 'neutral',
  )
  const away = tile(
    squareTeam(m?.away?.name),
    m?.bookie?.away,
    '',
    fav === 'away' ? 'win' : 'neutral',
  )
  const watch = [m?.home?.keys?.[0], m?.away?.keys?.[0]]
    .filter((k) => k?.name)
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))[0]
  const eye = tile('Top scorer', watch?.xp, watch?.name)

  return [home, away, eye].filter(Boolean)
}

export function fixtureStatTiles(m, { preview = false } = {}) {
  return preview ? previewStatTiles(m) : recapStatTiles(m)
}

function recapBullets(m, used) {
  const out = []
  const key = fixtureKey(m, false)
  const winner =
    m?.winner === m?.home?.entryId
      ? m.home
      : m?.winner === m?.away?.entryId
        ? m.away
        : null
  const loser =
    winner && winner.entryId === m?.home?.entryId ? m.away : winner ? m.home : null

  if (Number.isFinite(m?.margin) && m.margin >= 15 && winner) {
    out.push(
      pick(
        [
          `${m.margin} points — the kind of scoreline that gets screenshotted`,
          `${shortTeam(winner.name)} by ${m.margin}, and it never looked like a scrap`,
        ],
        `${key}-margin`,
      ),
    )
  } else if (Number.isFinite(m?.margin) && m.margin <= 5 && winner) {
    out.push(`Decided by ${m.margin} — one bad bench call from a draw`)
  }

  const titleSwing = [m?.home, m?.away]
    .map((s) => {
      const before = s?.titleOdds?.before
      const after = s?.titleOdds?.after
      if (!Number.isFinite(before) || !Number.isFinite(after)) return null
      return { name: s.name, delta: after - before, after }
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0]
  if (titleSwing && Math.abs(titleSwing.delta) >= 1.5) {
    const dir = titleSwing.delta > 0 ? 'up' : 'down'
    out.push(
      `${shortTeam(titleSwing.name)} ${dir} to ${titleSwing.after.toFixed(1)}% for the title`,
    )
  }

  const pickup = [m?.home?.pickup, m?.away?.pickup].find((p) => p?.name)
  if (pickup) {
    const kind = pickup.kind === 'f' ? 'free-agent' : 'waiver'
    out.push(
      `${pickup.name} the ${kind} paid ${pickup.pts != null ? pickup.pts : 'a visit'}`,
    )
  }

  if (winner?.isWeekHigh) {
    out.push(`${shortTeam(winner.name)} posted the week high`)
  } else if (loser && winner) {
    out.push(
      pick(
        [
          `${who(loser)} will be talking about the one that got away`,
          `${shortTeam(loser.name)} never found a second gear`,
        ],
        `${key}-loser`,
      ),
    )
  }

  return out.filter((b) => !overlaps(b, used)).slice(0, 2)
}

function previewBullets(m, used) {
  const out = []
  const sentences = (m?.sentences || []).map(stripEnd)
  const hinge = sentences.find((s) =>
    /hinge|path is ugly|need .+ to haul|to blank/i.test(s),
  )
  if (hinge) out.push(hinge)

  const claims = sentences.find(
    (s) => /claimed|added /i.test(s) && !sameLine(s, hinge),
  )
  if (claims) out.push(claims)

  const fav = favSide(m)
  const bookPrice =
    m?.odds?.favoriteSide === 'away' ? m?.bookie?.away : m?.bookie?.home
  if (bookPrice && fav && out.length < 2) {
    out.push(`The book makes ${shortTeam(fav.name)} a ${bookPrice} favourite`)
  }

  const title = [m?.home, m?.away]
    .filter((s) => s?.titlePrice)
    .sort((a, b) => (b.titlePct || 0) - (a.titlePct || 0))[0]
  if (title && out.length < 2) {
    out.push(
      `The title board still has ${shortTeam(title.name)} out in front at ${title.titlePrice}`,
    )
  }

  const watch = [m?.home?.keys?.[0], m?.away?.keys?.[0]].filter((k) => k?.name)
  if (watch.length === 2 && out.length < 2) {
    out.push(
      `${watch[0].name} ${watch[0].xp} against ${watch[1].name} ${watch[1].xp} is the hinge`,
    )
  }

  return out.filter((b) => !overlaps(b, used)).slice(0, 2)
}

export function interestingBullets(m, { preview = false, used = [] } = {}) {
  const raw = preview ? previewBullets(m, used) : recapBullets(m, used)
  if (raw.length >= 2) return raw.slice(0, 2)

  const extra = []
  for (const s of m?.sentences || []) {
    const line = stripEnd(s)
    if (!line || TABLE_OPEN.test(line) || QUIPPY.test(line)) continue
    if (overlaps(line, [...used, ...raw, ...extra])) continue
    extra.push(line)
    if (raw.length + extra.length >= 2) break
  }
  return [...raw, ...extra].slice(0, 2)
}

export function glanceFixture(m, { preview = false, used = [] } = {}) {
  const recap = personalityRecap(m, preview, used)
  const stats = fixtureStatTiles(m, { preview })
  return { stats, bullets: [], recap }
}

export function matchupScanLines(m, { preview = false } = {}) {
  const { bullets, recap } = glanceFixture(m, { preview })
  return { bullets, quip: recap.join(' ') }
}

export function matchupChips(m, { preview = false } = {}) {
  const chips = []
  if (m?.derby) chips.push({ label: m.derby.replace(/^the /i, ''), tone: 'gold' })
  if (preview) {
    if (m?.odds?.favoritePct >= 70) chips.push({ label: 'Lock', tone: 'win' })
    else if (m?.odds && Math.abs((m.odds.home || 0) - (m.odds.away || 0)) <= 6) {
      chips.push({ label: 'Coin', tone: 'gold' })
    }
    return chips
  }
  if (m?.odds?.outcome === 'miss') chips.push({ label: 'Upset', tone: 'loss' })
  else if (m?.odds?.outcome === 'hit') chips.push({ label: 'Called it', tone: 'win' })
  if (m?.home?.isWeekHigh || m?.away?.isWeekHigh) {
    chips.push({ label: 'Week high', tone: 'gold' })
  }
  return chips
}

function tile(label, value, sub, tone) {
  if (value == null || value === '') return null
  return { label, value: String(value), sub: sub || '', tone: tone || 'neutral' }
}

function highestPredicted(previewGw) {
  const baked = previewGw?.superlatives?.topScorer
  if (baked?.name) return baked
  let best = null
  for (const m of previewGw?.matchups || []) {
    for (const k of [m?.home?.keys?.[0], m?.away?.keys?.[0]]) {
      if (!k?.name) continue
      if (!best || (k.xp || 0) > (best.xp || 0)) best = k
    }
  }
  return best
}

function modelDots(recapGw) {
  const calls = (recapGw?.model?.calls || []).filter(
    (c) => c.outcome === 'hit' || c.outcome === 'miss',
  )
  let dots = calls.map((c) => (c.outcome === 'hit' ? 'win' : 'loss'))
  if (!dots.length) {
    const hits = Number(recapGw?.model?.hits) || 0
    const misses = Number(recapGw?.model?.misses) || 0
    if (hits + misses === 0) return []
    dots = [...Array(hits).fill('win'), ...Array(misses).fill('loss')]
  }
  return dots
}

function modelTile(recapGw) {
  const dots = modelDots(recapGw)
  if (!dots.length) return null
  const right = dots.filter((d) => d === 'win').length
  return {
    label: 'Model',
    value: `${right}/${dots.length}`,
    sub: `${right}/${dots.length}`,
    tone: 'neutral',
    dots,
  }
}

export function glanceTiles({ recapGw, previewGw, preview }) {
  const s = (preview ? previewGw?.superlatives : recapGw?.superlatives) || {}
  const predicted = preview ? highestPredicted(previewGw) : null
  const scorer = preview
    ? tile(
        'GW scorer',
        predicted?.xp ?? predicted?.pts ?? predicted?.name ?? null,
        predicted?.name,
        'win',
      )
    : tile('GW scorer', s.weekHigh?.points, shortTeam(s.weekHigh?.name), 'win')
  if (preview) {
    return [
      scorer,
      tile(
        'Best waiver',
        s.bestWaiver?.pts ?? s.bestWaiver?.xp,
        s.bestWaiver?.name,
      ),
      tile(
        'Dud',
        s.dud?.pts ?? s.dud?.xp,
        s.dud
          ? `${s.dud.name}${s.dud.overallPick ? ` · pick ${s.dud.overallPick}` : ''}`
          : '',
        'loss',
      ),
    ].filter(Boolean)
  }
  return [
    scorer,
    tile(
      'Best waiver',
      s.bestWaiver?.pts ?? s.bestWaiver?.xp,
      s.bestWaiver?.name,
    ),
    tile(
      'Dud',
      s.dud?.pts ?? s.dud?.xp,
      s.dud
        ? `${s.dud.name}${s.dud.overallPick ? ` · pick ${s.dud.overallPick}` : ''}`
        : '',
      'loss',
    ),
    modelTile(recapGw),
    tile('Top scorer', s.starPlayer?.pts, s.starPlayer?.name),
  ].filter(Boolean)
}

export function polaroidFacts({ recapGw, previewGw, preview, decided }) {
  const tiles = glanceTiles({ recapGw, previewGw, preview, decided })
  return tiles.slice(0, 5).map((t) => ({
    ...t,
    caption: t.sub || t.label,
  }))
}

export function wrapBanner(sentences) {
  const first = (sentences || []).find(Boolean)
  return first ? stripEnd(first) : null
}

export function readRecapLayout() {
  if (typeof window === 'undefined') return 'glance'
  try {
    const q = new URLSearchParams(window.location.search).get('recapui')
    if (RECAP_LAYOUTS.includes(q)) return q
    const stored = localStorage.getItem(RECAP_LAYOUT_STORAGE)
    if (RECAP_LAYOUTS.includes(stored)) return stored
  } catch {
    /* private mode */
  }
  return 'glance'
}

export function writeRecapLayout(layout) {
  if (!RECAP_LAYOUTS.includes(layout)) return
  try {
    localStorage.setItem(RECAP_LAYOUT_STORAGE, layout)
  } catch {
    /* ignore */
  }
}
