#!/usr/bin/env node
/**
 * Writes web/public/league-data/draft_picks.json from live draft API + local bootstrap_draft.
 * Run when a league id is resolvable (committed league-id / .fpl-league-id / env).
 * Runs on GitHub Actions when the workflow passes the league ID so Pages builds are not stuck
 * with a forked TCLOT draft_picks.json. Lets the Draft tab work without browser→draft CORS.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { reconstructDraftPicks, rewindSquadsToDraft } from '../src/draftBoardPicks.js'
import { draftIdFromDetails, picksFromDraftChoices } from '../src/draftChoicesPicks.js'
import { readLeagueId } from './readLeagueId.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../..')
const webPublic = join(repoRoot, 'web/public/league-data')
const leagueId = readLeagueId(repoRoot)
if (!leagueId) {
  process.exit(0)
}

const DRAFT = 'https://draft.premierleague.com/api'

async function fetchJson(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url} → ${r.status}`)
  return r.json()
}

/** The existing draft_picks.json iff it is for this league and was built from the /choices pick log. */
function readExistingChoicesBuiltPicks(path, leagueId) {
  if (!existsSync(path)) return null
  try {
    const j = JSON.parse(readFileSync(path, 'utf8'))
    const sameLeague = Number(j?._meta?.leagueId) === Number(leagueId)
    const fromChoices = /\/choices \(true pick order\)/.test(String(j?._meta?.note ?? ''))
    return sameLeague && fromChoices && Array.isArray(j?.picks) && j.picks.length ? j : null
  } catch {
    return null
  }
}

/** League transactions from the file fetch-league-if-needed wrote earlier in this build. */
function readLocalTransactions(path) {
  if (!existsSync(path)) return []
  try {
    const j = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(j?.transactions) ? j.transactions : []
  } catch {
    return []
  }
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
  } else {
    console.warn(
      'build-draft-picks: no draft_round1_order.json — using FPL entry_id fallback for round 1 (not real draft order). Add draft_round1_order.json (FPL entry_id per round-1 slot; see TCLOT web/public/league-data/draft_round1_order.json).',
    )
  }

  const startGw = Number(details.league?.start_event) >= 1 ? Number(details.league.start_event) : 1

  // Preferred: the draft's true pick log (/draft/{id}/choices) — exact order the
  // picks were made, so reaches (e.g. João Pedro before a lower-draft_rank
  // Gibbs-White) land in the right slot. Reconstruction is only a fallback.
  let picks = null
  let note = ''
  const draftId = draftIdFromDetails(details)
  if (draftId != null) {
    try {
      const choices = await fetchJson(`${DRAFT}/draft/${draftId}/choices`)
      const fromChoices = picksFromDraftChoices(choices, leagueEntries, elementById, teamById, 15)
      if (fromChoices?.length) {
        picks = fromChoices
        note = `Built directly from draft API /draft/${draftId}/choices (true pick order).`
      } else {
        console.warn(
          `build-draft-picks: /draft/${draftId}/choices unusable (empty/partial) — using reconstruction fallback.`,
        )
      }
    } catch (e) {
      console.warn(`build-draft-picks: /draft/${draftId}/choices failed (${e.message}) — using reconstruction fallback.`)
    }
  } else {
    console.warn('build-draft-picks: no draft id in details.league.drafts — using reconstruction fallback.')
  }

  if (!picks) {
    // Draft picks are immutable after draft day: a previously committed file
    // built from the true /choices pick log always beats a fresh
    // reconstruction (which back-fills waiver pickups into draft slots).
    const existing = readExistingChoicesBuiltPicks(join(webPublic, 'draft_picks.json'), leagueId)
    if (existing) {
      console.log(
        'build-draft-picks: /choices unavailable — keeping existing choices-built draft_picks.json unchanged.',
      )
      process.exit(0)
    }

    let picksByFpl = new Map()
    for (const le of leagueEntries) {
      const j = await fetchJson(`${DRAFT}/entry/${le.entry_id}/event/${startGw}`)
      picksByFpl.set(
        le.entry_id,
        (j.picks || []).map((p) => p.element).filter((x) => x != null),
      )
    }
    // GW-startGw squads already include pre-deadline waivers/free agents —
    // undo them so reconstruction attributes draft slots to the drafted players.
    const transactions = readLocalTransactions(join(webPublic, 'transactions.json'))
    if (transactions.length) {
      picksByFpl = rewindSquadsToDraft(picksByFpl, transactions, startGw)
    }
    picks = reconstructDraftPicks(leagueEntries, picksByFpl, elementById, teamById, 15, {
      round1FplEntryIds,
    })
    note = round1FplEntryIds?.length
      ? 'Snake round 1 from draft_round1_order.json; player order within team from draft_rank (reaches may be mis-ordered).'
      : 'Snake round 1 from fallback FPL entry_id order (add draft_round1_order.json for true draft slots); within team from draft_rank.'
  }

  const out = {
    _meta: {
      built: new Date().toISOString(),
      leagueId: Number(leagueId),
      startGw,
      note,
    },
    picks,
  }

  mkdirSync(webPublic, { recursive: true })
  writeFileSync(join(webPublic, 'draft_picks.json'), JSON.stringify(out, null, 2))
  console.log(`build-draft-picks: wrote ${picks.length} picks → draft_picks.json`)
} catch (e) {
  console.warn('build-draft-picks: skipped —', e.message)
  // Avoid shipping another league's draft_picks.json after failed regenerate (Pages CORS fallback).
  const draftPath = join(webPublic, 'draft_picks.json')
  const detailsPath = join(webPublic, 'details.json')
  try {
    if (existsSync(draftPath) && existsSync(detailsPath)) {
      const draft = JSON.parse(readFileSync(draftPath, 'utf8'))
      const details = JSON.parse(readFileSync(detailsPath, 'utf8'))
      const lid = details?.league?.id
      const mid = draft?._meta?.leagueId
      if (lid != null && mid != null && Number(lid) !== Number(mid)) {
        unlinkSync(draftPath)
        console.warn(
          `build-draft-picks: removed stale draft_picks.json (league ${mid} ≠ details ${lid})`,
        )
      }
    }
  } catch {
    /* ignore */
  }
  process.exit(0)
}
