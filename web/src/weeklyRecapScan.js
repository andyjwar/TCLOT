/**
 * Scan-first recap/preview copy. Turns baked weekly-recaps.json into
 * tiles, polaroid facts, short bullets, and one quip — no paragraphs.
 */

import { standingsMobileTeamName } from './teamNameUtils.js'

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

export function pickQuip(sentences) {
  const list = (sentences || []).map(stripEnd).filter(Boolean)
  return (
    list.find((s) => QUIPPY.test(s)) ||
    list.find((s) => !TABLE_OPEN.test(s) && !/\d{2}%/.test(s) && s.length < 96) ||
    null
  )
}

function favName(m) {
  if (!m?.odds?.favoriteSide) return null
  return m.odds.favoriteSide === 'home' ? m.home?.name : m.away?.name
}

export function matchupScanLines(m, { preview = false } = {}) {
  const bullets = []
  const sentences = m?.sentences || []
  const quip = pickQuip(sentences)
  const pct = Number.isFinite(m?.odds?.favoritePct)
    ? Math.round(m.odds.favoritePct)
    : null
  const fav = favName(m)

  if (preview) {
    if (m?.bookie) {
      bullets.push(`Book ${m.bookie.home} · ${m.bookie.draw} · ${m.bookie.away}`)
    }
    const watch = [m?.home?.keys?.[0], m?.away?.keys?.[0]].filter((k) => k?.name)
    if (watch.length) {
      bullets.push(
        `Watch: ${watch.map((k) => `${k.name} ${k.xp}`).join(' · ')}`,
      )
    }
    const hinge = sentences.find((s) => /hinge|path is ugly|need .+ to haul/i.test(s))
    if (hinge && bullets.length < 3) bullets.push(stripEnd(hinge))
    const claims = sentences.find((s) => /claimed|added /i.test(s) && s !== hinge)
    if (claims && bullets.length < 3) bullets.push(stripEnd(claims))
  } else {
    if (m?.odds?.outcome === 'miss' && fav && pct != null) {
      bullets.push(`${shortTeam(fav)} were ${pct}%. Script flipped.`)
    } else if (m?.odds?.outcome === 'hit' && pct != null) {
      bullets.push(`Called it at ${pct}%.`)
    } else if (m?.odds && pct != null) {
      bullets.push(`Coin flip (${pct}%).`)
    }
    const tops = [m?.home?.players?.top, m?.away?.players?.top].filter((p) => p?.name)
    const flops = [m?.home?.players?.flop, m?.away?.players?.flop].filter(
      (p) => p?.name && Number.isFinite(p.pts),
    )
    if (tops.length) {
      const best = [...tops].sort((a, b) => (b.pts || 0) - (a.pts || 0))[0]
      bullets.push(`${best.name} ${best.pts}`)
    }
    const flop = flops.find((p) => Number.isFinite(p.xp) && p.pts < p.xp)
    if (flop && bullets.length < 3) {
      bullets.push(`${flop.name}: ${flop.xp} xP, returned ${flop.pts}`)
    }
    if (
      bullets.length < 3 &&
      m?.home?.rank != null &&
      m?.away?.rank != null &&
      m?.home?.record &&
      m?.away?.record
    ) {
      const rec = (t) => `${t.record.w}-${t.record.d}-${t.record.l}`
      bullets.push(
        `${shortTeam(m.home.name)} ${ordinal(m.home.rank)} ${rec(m.home)} · ${shortTeam(m.away.name)} ${ordinal(m.away.rank)} ${rec(m.away)}`,
      )
    }
  }

  const used = new Set(bullets.map((b) => b.toLowerCase()))
  for (const raw of sentences) {
    if (bullets.length >= 3) break
    const s = stripEnd(raw)
    if (!s || s === quip || TABLE_OPEN.test(s)) continue
    if (used.has(s.toLowerCase())) continue
    bullets.push(s)
    used.add(s.toLowerCase())
  }

  return { bullets: bullets.slice(0, 3), quip }
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
      tile('Favourite', s.favourite ? `${s.favourite.pct}%` : null, shortTeam(s.favourite?.name)),
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
        'Waiver',
        s.bestWaiver?.xp ?? s.bestWaiver?.pts ?? null,
        s.bestWaiver?.name,
      ),
      tile(
        'Dud',
        s.dud?.xp ?? s.dud?.pts ?? null,
        s.dud
          ? `${s.dud.name}${s.dud.overallPick ? ` · pick ${s.dud.overallPick}` : ''}`
          : '',
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
      'called it',
      'win',
    ),
    tile('Star', s.starPlayer?.pts, s.starPlayer?.name),
    tile('Waiver', s.bestWaiver?.pts ?? s.bestWaiver?.xp, s.bestWaiver?.name),
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
