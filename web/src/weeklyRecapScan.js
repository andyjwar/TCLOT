/**
 * Scan-first recap/preview copy. Header tiles, per-fixture stat boxes, and
 * a reporter-style recap box: one unused news angle per card, jokes as
 * asides, Mottershead vegan required but not always first.
 */

import {
  allManagerJokes,
  isMottershead,
  loreTagsFromSide,
  managerFunFact,
  mottersheadVeganLine,
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

const STEM_RULES = [
  ['projected-stack', /projected stack/i],
  ['hinge', /hinge is|\bhinge\b/i],
  ['biggest-return', /biggest return/i],
  ['led-with', /\bled\b.+\bwith\b/i],
  ['heavy-lift', /heavy lifting/i],
  ['rode', /\brode\b/i],
  ['dud-for', /the dud for/i],
  ['clip', /will not want the clip/i],
  ['blanked', /blanked from/i],
  ['stale-take', /will have a take/i],
  ['waiver-claimed', /claimed .+ on the /i],
  ['waiver-new', /is the new (waiver|free-agent)/i],
  ['waiver-dud', /returned \d/i],
  ['waiver-paid', / paid \d/i],
  ['streak', /\d+-game (winning|losing) streak/i],
  ['winless', /waiting on a first win|kind of record/i],
  ['table-talk', /not being subtle|doing some talking/i],
  ['vegan', /vegan|oat milk|tofu|plant-based/i],
  ['call-hit', /was the call|night agreed/i],
  ['call-miss', /scoreboard disagreed|wrecked a/i],
]

export function recapStem(text) {
  const s = String(text || '')
  for (const [id, re] of STEM_RULES) {
    if (re.test(s)) return id
  }
  const fallback = stripEnd(s).toLowerCase()
  return fallback.slice(0, 48) || 'other'
}

function usedBag(used) {
  if (Array.isArray(used)) return { lines: [...used], kinds: [], stems: [] }
  return {
    lines: [...(used?.lines || [])],
    kinds: [...(used?.kinds || [])],
    stems: [...(used?.stems || [])],
  }
}

function angle(kind, text) {
  const t = stripEnd(text)
  if (!t) return null
  return { kind, text: t, stem: recapStem(t) }
}

function isFree(a, bag) {
  if (!a?.text || STALE_TAKE.test(a.text)) return false
  if (overlaps(a.text, bag.lines)) return false
  if (bag.stems.includes(a.stem)) return false
  return true
}

const FOLLOW_ON =
  /^(The|A|An|That|This|His|Her|Their|For|If|When|While|After|With|Question|Somewhere|Plant-based)\b/

function lcFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

function asFollowOn(s) {
  const t = stripEnd(s)
  return FOLLOW_ON.test(t) ? lcFirst(t) : t
}

function weave(lead, aside) {
  if (!aside) return stripEnd(lead)
  if (!lead) return stripEnd(aside)
  return `${stripEnd(lead)}, ${asFollowOn(aside)}`
}

function pickupKind(kind) {
  return kind === 'f' ? 'free-agent' : 'waiver'
}

function pickupBits(side) {
  const bits = []
  const p = side?.pickup
  if (p?.name) bits.push(p)
  if (p?.star?.name) bits.push(p.star)
  if (p?.flop?.name) bits.push({ ...p.flop, dud: true })
  for (const r of side?.recentPickups || []) {
    if (r?.name) bits.push(r)
  }
  return bits
}

function recordLine(side, key) {
  const rec = side?.record
  if (!rec) return null
  const w = Number(rec.w) || 0
  const d = Number(rec.d) || 0
  const l = Number(rec.l) || 0
  const played = w + d + l
  const rank = Number(side?.rank)
  if (played >= 3 && w === 0) {
    return pick(
      [
        `${who(side)} is ${w}-${d}-${l} and still waiting on a first win`,
        `${who(side)}'s ${w}-${d}-${l} is the kind of record that gets a subcommittee`,
      ],
      `${key}-winless`,
    )
  }
  if (played >= 4 && l >= 3 && l >= w * 2) {
    return `${who(side)} sits ${w}-${d}-${l}, which is doing some talking of its own`
  }
  if (Number.isFinite(rank) && rank >= 7 && played >= 2) {
    return `${who(side)} is ${ordinal(rank)}, and the table is not being subtle about it`
  }
  return null
}

function streakLine(side) {
  const st = side?.streak
  if (!st || !Number.isFinite(st.len) || st.len <= 2) return null
  const kind = st.type === 'W' ? 'winning' : st.type === 'L' ? 'losing' : 'unbeaten'
  if (st.type === 'D') return null
  return `${who(side)} is on a ${st.len}-game ${kind} streak`
}

function pushVariants(out, kind, texts) {
  for (const t of texts) {
    const a = angle(kind, t)
    if (a) out.push(a)
  }
}

function callAngles(m) {
  const fav = favSide(m)
  const dog = fav && fav.entryId === m?.home?.entryId ? m.away : m.home
  if (m?.odds?.outcome === 'hit' && fav) {
    return [
      angle('call', `${who(fav)} was the call and it stood`),
      angle('call', `The book had ${shortTeam(fav.name)} and the night agreed`),
    ].filter(Boolean)
  }
  if (m?.odds?.outcome === 'miss' && fav) {
    const pct = Number.isFinite(m.odds.favoritePct)
      ? `${Math.round(m.odds.favoritePct)}%`
      : 'pre-match'
    return [
      angle('call', `The model had ${who(fav)} and the scoreboard disagreed`),
      angle('call', `${who(dog)} wrecked a ${pct} favourite`),
    ].filter(Boolean)
  }
  return []
}

/** Tagged fixture notes: one kind per angle, several stems to rotate. */
export function fixtureStoryAngles(m, preview = false, key = 's') {
  const out = []
  for (const [side, salt] of [
    [m?.home, `${key}-h`],
    [m?.away, `${key}-a`],
  ]) {
    if (!side) continue
    for (const p of pickupBits(side)) {
      const label = pickupKind(p.kind)
      if (p.dud || (Number.isFinite(p.xp) && Number.isFinite(p.pts) && p.pts <= 2 && p.xp >= 4)) {
        pushVariants(out, 'waiver', [
          `${who(side)}'s ${label} ${p.name} returned ${p.pts ?? 0}${p.xp != null ? ` off ${p.xp}` : ''}`,
        ])
      } else if (Number.isFinite(p.pts) && p.pts >= 8) {
        pushVariants(out, 'waiver', [`${who(side)}'s ${label} ${p.name} paid ${p.pts}`])
      } else {
        pushVariants(out, 'waiver', [
          `${who(side)} claimed ${p.name} on the ${label}`,
          `${p.name} is the new ${label} in ${shortTeam(side.name)}`,
        ])
      }
    }

    if (preview) {
      const watch = [...(side.keys || [])]
        .filter((k) => k?.name)
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))[0]
      if (watch) {
        pushVariants(out, 'projected', [
          `${who(side)}'s hinge is ${watch.name} at ${watch.xp}`,
          `The projected stack for ${shortTeam(side.name)} runs through ${watch.name} (${watch.xp})`,
          `${watch.name} is the ${watch.xp} watch for ${who(side)}`,
        ])
      }
    } else {
      const top = side.players?.top
      if (top?.name && Number.isFinite(top.pts)) {
        pushVariants(out, 'haul', [
          `${top.name} led ${shortTeam(side.name)} with ${top.pts}`,
          `Biggest return in ${shortTeam(side.name)}: ${top.name} on ${top.pts}`,
          `${who(side)} rode ${top.name} to ${top.pts}`,
          `${top.name}'s ${top.pts} did the heavy lifting for ${shortTeam(side.name)}`,
        ])
      }
      const flop = side.players?.flop
      if (flop?.name && Number.isFinite(flop.pts)) {
        pushVariants(out, 'dud', [
          `${flop.name} the dud for ${who(side)}: ${flop.pts}${flop.xp != null ? ` from ${flop.xp}` : ''}`,
          `${who(side)} will not want the clip of ${flop.name} walking off with ${flop.pts}`,
          `${flop.name} blanked from ${flop.xp ?? 'a decent projection'} for ${who(side)}`,
        ])
      }
    }

    const streak = streakLine(side)
    if (streak) out.push(angle('streak', streak))
    const rec = recordLine(side, salt)
    if (rec) out.push(angle('record', rec))
  }
  if (!preview) out.push(...callAngles(m))
  return out.filter(Boolean)
}

export function fixtureStoryLines(m, preview = false, key = 's') {
  const seen = new Set()
  const out = []
  for (const a of fixtureStoryAngles(m, preview, key)) {
    if (seen.has(a.text)) continue
    seen.add(a.text)
    out.push(a.text)
  }
  return out
}

const JOKE_SKIP = new Set(['waiver', 'dud', 'streak', 'record'])

function assignNews(angles, bag, key) {
  const unusedKind = angles.filter((a) => isFree(a, bag) && !bag.kinds.includes(a.kind))
  const pool = unusedKind.length ? unusedKind : angles.filter((a) => isFree(a, bag))
  if (!pool.length) return null
  return pick(pool, `${key}-news`)
}

function jokeAngle(side, salt, bag) {
  if (!side?.manager || isMottershead(side.manager)) return null
  const tags = loreTagsFromSide(side)
  const hooked = managerFunFact(side.manager, pick, salt, tags)
  const pool = [hooked, ...allManagerJokes(side.manager)]
    .map((t) => angle('joke', t))
    .filter((a) => isFree(a, bag))
  if (!pool.length) return null
  return pick(pool, salt)
}

function veganAngle(key, bag) {
  const line = mottersheadVeganLine(pick, `${key}-vegan`)
  const a = angle('vegan', line)
  if (a && isFree(a, bag)) return a
  const fresh = ['a', 'b', 'c', 'd', 'e']
    .map((slot) => angle('vegan', mottersheadVeganLine(pick, `${key}-vegan-${slot}`)))
    .filter((x) => isFree(x, bag))
  return fresh[0] || a
}

function noteAngle(bag, kinds, stems, a) {
  if (!a) return
  kinds.push(a.kind)
  stems.push(a.stem)
  bag.lines.push(a.text)
  bag.kinds.push(a.kind)
  bag.stems.push(a.stem)
}

/**
 * One news angle per card, assigned so the page does not repeat a kind or
 * stem. Jokes hang off the news as a clause. Mottershead vegan is required
 * but not always first.
 */
export function personalityRecap(m, preview = false, used = []) {
  const key = fixtureKey(m, preview)
  const bag = usedBag(used)
  const mottOn =
    isMottershead(m?.home?.manager) || isMottershead(m?.away?.manager)

  const news = assignNews(fixtureStoryAngles(m, preview, key), bag, key)
  const skipJoke = news && JOKE_SKIP.has(news.kind)
  let joke = null
  if (!skipJoke) {
    const sides = [m?.home, m?.away].filter(
      (s) => s?.manager && !isMottershead(s.manager),
    )
    const side = sides.length > 1 ? pick(sides, `${key}-jside`) : sides[0]
    joke = jokeAngle(side, `${key}-joke`, bag)
  }
  const vegan = mottOn ? veganAngle(key, bag) : null

  const kinds = []
  const stems = []
  const lines = []

  if (news && joke) {
    lines.push(weave(news.text, joke.text))
    noteAngle(bag, kinds, stems, news)
    noteAngle(bag, kinds, stems, joke)
  } else if (news) {
    lines.push(news.text)
    noteAngle(bag, kinds, stems, news)
  }

  if (vegan) {
    if (!lines.length) {
      lines.push(vegan.text)
      noteAngle(bag, kinds, stems, vegan)
    } else if (pick(['aside', 'aside', 'lead'], `${key}-vegan-slot`) === 'lead') {
      lines.unshift(vegan.text)
      noteAngle(bag, kinds, stems, vegan)
    } else {
      lines[0] = weave(lines[0], vegan.text)
      noteAngle(bag, kinds, stems, vegan)
    }
  }

  if (!lines.length) {
    const fb = pick(
      [
        `${who(m.home)} is already narrating this like it was the plan`,
        `${who(m.away)} has a theory, and the scoreboard is the footnote`,
      ],
      `${key}-fallback`,
    )
    lines.push(fb)
    kinds.push('fallback')
    stems.push(recapStem(fb))
  }

  const out = lines.slice(0, 2)
  out.kinds = kinds
  out.stems = stems
  return out
}

function formatTitlePct(n) {
  if (!Number.isFinite(n)) return null
  const rounded = Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1)
  return `${rounded}%`
}

function titleOddsTile(side) {
  const name = squareTeam(side?.name)
  const after = side?.titleOdds?.after
  const before = side?.titleOdds?.before
  const pct = Number.isFinite(after) ? after : side?.titlePct
  const value = formatTitlePct(pct) || side?.titlePrice
  if (!name || value == null || value === '') return null
  let tone = 'neutral'
  if (Number.isFinite(after) && Number.isFinite(before)) {
    if (after > before + 0.15) tone = 'win'
    else if (after < before - 0.15) tone = 'loss'
  }
  return tile(name, value, 'title', tone)
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

  return [call, star, titleOddsTile(m?.home), titleOddsTile(m?.away)].filter(Boolean)
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
  return {
    stats,
    bullets: [],
    recap,
    kinds: recap.kinds || [],
    stems: recap.stems || [],
  }
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
