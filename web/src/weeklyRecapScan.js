/**
 * Scan-first recap/preview copy. Turns baked weekly-recaps.json into
 * header tiles, per-fixture stat boxes, two interesting bullets, and a
 * two-sentence personality recap — no paragraphs, no repeated lines.
 */

import {
  isMottershead,
  isTitanicPair,
  loreTagsFromSide,
  managerFunFact,
  mottersheadVeganLine,
  namedFixtureFor,
  titanicAside,
} from './leagueLore.js'
import { standingsMobileTeamName } from './teamNameUtils.js'
import { variantIndex } from './weeklyRecapText.js'

export const RECAP_LAYOUTS = ['glance', 'polaroid', 'combo', 'classic']
export const RECAP_LAYOUT_STORAGE = 'tclot-recap-layout'

const TABLE_OPEN = /^(That leaves|That keeps|Both sides finished)\b/
const QUIPPY =
  /vegan|twin|sleep|complimentary|people'?s champion|invented|cheerfully|plant-based|will have a take|whatever sleep/i

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

function favName(m) {
  if (!m?.odds?.favoriteSide) return null
  return m.odds.favoriteSide === 'home' ? m.home?.name : m.away?.name
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

/** Always two personality sentences — one flavour of each manager. */
export function personalityRecap(m, preview = false) {
  const key = fixtureKey(m, preview)
  const lines = []
  const used = new Set()

  const add = (line) => {
    const s = stripEnd(line)
    if (!s || used.has(s.toLowerCase())) return
    used.add(s.toLowerCase())
    lines.push(s)
  }

  for (const side of [m?.home, m?.away]) {
    if (!side || lines.length >= 2) continue
    if (isMottershead(side.manager)) {
      add(mottersheadVeganLine(pick, `${key}-vegan`))
      continue
    }
    add(
      managerFunFact(
        side.manager,
        pick,
        `${key}-${side.entryId || side.manager}`,
        loreTagsFromSide(side),
      ),
    )
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
          `${who(m.home)} will have a take, whether the scoreboard asked for one or not`,
          `${who(m.away)} is already narrating this like it was the plan`,
        ],
        `${key}-fallback`,
      ),
    )
  }

  if (lines.length < 2) {
    add(`${who(m.away)} will have a take ready either way`)
  }

  return lines.slice(0, 2)
}

function recapStatTiles(m) {
  const pct = Number.isFinite(m?.odds?.favoritePct)
    ? Math.round(m.odds.favoritePct)
    : null
  const call =
    m?.odds?.outcome === 'miss'
      ? tile('Model', pct != null ? `${pct}%` : 'Upset', 'got it wrong', 'loss')
      : m?.odds?.outcome === 'hit'
        ? tile('Model', pct != null ? `${pct}%` : 'Hit', 'got it right', 'win')
        : tile('Model', pct != null ? `${pct}%` : null, 'pre-match', 'neutral')

  const tops = [m?.home?.players?.top, m?.away?.players?.top].filter((p) => p?.name)
  const best = [...tops].sort((a, b) => (b.pts || 0) - (a.pts || 0))[0]
  const star = tile('Star', best?.pts, best?.name)

  const flops = [m?.home?.players?.flop, m?.away?.players?.flop].filter(
    (p) => p?.name && Number.isFinite(p.pts),
  )
  const flop = flops.find((p) => Number.isFinite(p.xp) && p.pts < p.xp) || flops[0]
  const dud = flop
    ? tile('Flop', flop.pts, `${flop.name} from ${flop.xp ?? '?'}`, 'loss')
    : Number.isFinite(m?.margin)
      ? tile('Margin', m.margin, 'points')
      : null

  return [call, star, dud].filter(Boolean).slice(0, 3)
}

function previewStatTiles(m) {
  const fav = favSide(m)
  const pct = Number.isFinite(m?.odds?.favoritePct)
    ? Math.round(m.odds.favoritePct)
    : null
  const lean = tile(
    'Favourite',
    pct != null ? `${pct}%` : null,
    shortTeam(fav?.name),
    pct >= 70 ? 'win' : 'neutral',
  )

  const bookPrice =
    m?.odds?.favoriteSide === 'away' ? m?.bookie?.away : m?.bookie?.home
  const book = tile('Book', bookPrice, shortTeam(fav?.name) || 'favourite')

  const watch = [m?.home?.keys?.[0], m?.away?.keys?.[0]]
    .filter((k) => k?.name)
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))[0]
  const eye = tile('Watch', watch?.xp, watch?.name)

  return [lean, book, eye].filter(Boolean).slice(0, 3)
}

export function fixtureStatTiles(m, { preview = false } = {}) {
  return preview ? previewStatTiles(m) : recapStatTiles(m)
}

function recapBullets(m, used) {
  const out = []
  const pct = Number.isFinite(m?.odds?.favoritePct)
    ? Math.round(m.odds.favoritePct)
    : null
  const fav = favName(m)
  const key = fixtureKey(m, false)

  if (m?.odds?.outcome === 'miss' && fav && pct != null) {
    out.push(
      pick(
        [
          `${shortTeam(fav)} were ${pct}% on the board and still walked away with nothing`,
          `The model loved ${shortTeam(fav)} at ${pct}%. The scoreboard did not`,
        ],
        `${key}-odds`,
      ),
    )
  } else if (m?.odds?.outcome === 'hit' && pct != null && pct >= 65) {
    out.push(
      pick(
        [
          `A ${pct}% lean that played like a statement win`,
          `Priced at ${pct}% and it never really looked like anything else`,
        ],
        `${key}-odds`,
      ),
    )
  } else if (m?.odds && pct != null) {
    out.push(`A coin-flip at ${pct}% that the favourite just about collected`)
  }

  const tops = [m?.home?.players?.top, m?.away?.players?.top].filter((p) => p?.name)
  const best = [...tops].sort((a, b) => (b.pts || 0) - (a.pts || 0))[0]
  const sideOf = (p) =>
    [m.home, m.away].find(
      (s) => s?.players?.top?.id === p?.id || s?.players?.top?.name === p?.name,
    )
  if (best && Number.isFinite(best.pts) && sideOf(best)?.points) {
    out.push(`${best.name} did ${best.pts} of ${sideOf(best).points}`)
  }

  const flops = [m?.home?.players?.flop, m?.away?.players?.flop].filter(
    (p) => p?.name && Number.isFinite(p.pts) && Number.isFinite(p.xp) && p.pts < p.xp,
  )
  if (flops[0] && out.length < 3) {
    out.push(
      `${flops[0].name} was down for ${flops[0].xp} and came back with ${flops[0].pts}`,
    )
  }

  const pickup = [m?.home?.pickup, m?.away?.pickup].find((p) => p?.name)
  if (pickup && out.length < 3) {
    const kind = pickup.kind === 'f' ? 'free-agent' : 'waiver'
    out.push(
      `${pickup.name} the ${kind} paid ${pickup.pts != null ? pickup.pts : 'a visit'}`,
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

export function glanceFixture(m, { preview = false } = {}) {
  const recap = personalityRecap(m, preview)
  const bullets = interestingBullets(m, { preview, used: recap })
  const stats = fixtureStatTiles(m, { preview })
  return { stats, bullets, recap }
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

export function glanceTiles({ recapGw, previewGw, preview, decided }) {
  if (preview) {
    const s = previewGw?.superlatives || {}
    const tiles = [
      tile(
        'Favourite',
        s.favourite ? `${s.favourite.pct}%` : null,
        shortTeam(s.favourite?.name),
        'win',
      ),
      tile(
        'Toss-up',
        s.closest ? `${s.closest.favoritePct}%` : null,
        s.closest
          ? `${shortTeam(s.closest.homeName)}–${shortTeam(s.closest.awayName)}`
          : '',
      ),
      tile(
        'Watch',
        s.topScorer?.pts ?? s.topScorer?.name ?? null,
        s.topScorer ? `${s.topScorer.name}` : '',
      ),
      tile(
        'Best waiver',
        s.bestWaiver?.xp ?? s.bestWaiver?.pts ?? null,
        s.bestWaiver?.name,
      ),
      tile(
        'Dud',
        s.dud?.xp ?? s.dud?.pts ?? null,
        s.dud
          ? `${s.dud.name}${s.dud.overallPick ? ` · pick ${s.dud.overallPick}` : ''}`
          : '',
        'loss',
      ),
    ]
    const derbies = (previewGw?.matchups || []).filter((m) => m.derby)
    if (derbies[0]?.derby) {
      tiles.splice(
        2,
        0,
        tile('Derby', derbies.length, derbies[0].derby.replace(/^the /i, '')),
      )
    }
    return tiles.filter(Boolean).slice(0, 6)
  }

  const s = recapGw?.superlatives || {}
  const upset = recapGw?.model?.upset
  return [
    tile('Week high', s.weekHigh?.points, shortTeam(s.weekHigh?.name), 'win'),
    tile(
      'Upset',
      upset ? `${upset.winnerPct}%` : null,
      upset ? `${shortTeam(upset.winnerName)} over ${shortTeam(upset.loserName)}` : '',
      'loss',
    ),
    tile(
      'Model',
      decided > 0 ? `${recapGw.model.hits}/${decided}` : null,
      'right',
      'win',
    ),
    tile('Star', s.starPlayer?.pts, s.starPlayer?.name),
    tile('Best waiver', s.bestWaiver?.pts ?? s.bestWaiver?.xp, s.bestWaiver?.name),
    tile(
      'Dud',
      s.dud?.pts ?? s.dud?.xp,
      s.dud
        ? `${s.dud.name}${s.dud.overallPick ? ` · pick ${s.dud.overallPick}` : ''}`
        : '',
    ),
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
