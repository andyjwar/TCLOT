#!/usr/bin/env node
/**
 * Writes web/public/league-data/draft_picks.json from live draft API + local bootstrap_draft.
 * Run from repo root when FPL_LEAGUE_ID / .fpl-league-id is set (same as fetch-league-if-needed).
 * Skipped in CI. Lets the Draft tab work without browser→draft CORS.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { reconstructDraftPicks } from '../src/draftBoardPicks.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../..')
const webPublic = join(repoRoot, 'web/public/league-data')
const idFile = join(repoRoot, '.fpl-league-id')

if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
  process.exit(0)
}

function readId() {
  if (existsSync(idFile)) {
    const t = readFileSync(idFile, 'utf8').trim().split(/\r?\n/)[0]?.trim()
    if (t && /^\d+$/.test(t)) return t
  }
  const e = process.env.FPL_LEAGUE_ID?.trim() || process.env.LEAGUE_ID?.trim()
  if (e && /^\d+$/.test(e)) return e
  return null
}

const leagueId = readId()
if (!leagueId) {
  process.exit(0)
}

const DRAFT = 'https://draft.premierleague.com/api'

async function fetchJson(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} → ${r.status}`)
  return r.json()
}

try {
  const details = await fetchJson(`${DRAFT}/league/${leagueId}/details`)
  const leagueEntries = details.league_entries || []
  if (!leagueEntries.length) {
    console.warn('build-draft-picks: no league_entries')
    process.exit(0)
  }

  const bootPath = join(webPublic, 'bootstrap_draft.json')
  if (!existsSync(bootPath)) {
    console.warn('build-draft-picks: skip — no bootstrap_draft.json')
    process.exit(0)
  }
  const boot = JSON.parse(readFileSync(bootPath, 'utf8'))
  const elementById = new Map((boot.elements || []).map((e) => [e.id, e]))
  const teamById = new Map((boot.teams || []).map((t) => [t.id, t]))

  const orderPath = join(webPublic, 'draft_round1_order.json')
  let round1FplEntryIds = null
  if (existsSync(orderPath)) {
    try {
      const raw = JSON.parse(readFileSync(orderPath, 'utf8'))
      if (Array.isArray(raw.fplEntryIds)) round1FplEntryIds = raw.fplEntryIds
    } catch {
      /* ignore */
    }
  }

  const startGw = Number(details.league?.start_event) >= 1 ? Number(details.league.start_event) : 1
  const picksByFpl = new Map()

  for (const le of leagueEntries) {
    const j = await fetchJson(`${DRAFT}/entry/${le.entry_id}/event/${startGw}`)
    picksByFpl.set(
      le.entry_id,
      (j.picks || []).map((p) => p.element).filter((x) => x != null),
    )
  }

  const picks = reconstructDraftPicks(leagueEntries, picksByFpl, elementById, teamById, 15, {
    round1FplEntryIds,
  })
  const out = {
    _meta: {
      built: new Date().toISOString(),
      leagueId: Number(leagueId),
      startGw,
      note: round1FplEntryIds?.length
        ? 'Snake round 1 from draft_round1_order.json; player order within team from draft_rank.'
        : 'Snake round 1 from waiver_pick (approximate once waivers have moved); within team from draft_rank.',
    },
    picks,
  }

  mkdirSync(webPublic, { recursive: true })
  writeFileSync(join(webPublic, 'draft_picks.json'), JSON.stringify(out, null, 2))
  console.log(`build-draft-picks: wrote ${picks.length} picks → draft_picks.json`)
} catch (e) {
  console.warn('build-draft-picks: skipped —', e.message)
  process.exit(0)
}
