#!/usr/bin/env node
/**
 * Remove web/public/league-data/draft_picks.json when it was built for a different league
 * than details.json (common after pushing TCLOT to fork repos). Otherwise the client rejects
 * the file and falls back to live draft API calls — which fail on GitHub Pages without
 * VITE_FPL_PROXY_URL (CORS), leaving an empty Draft tab and no roster status.
 */
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const leagueData = join(__dirname, '../public/league-data')
const detailsPath = join(leagueData, 'details.json')
const draftPath = join(leagueData, 'draft_picks.json')

function pickIdsBelongToDetails(draft, details) {
  const ids = new Set(
    (details.league_entries || [])
      .map((e) => e.entry_id)
      .filter((x) => x != null)
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x)),
  )
  if (!ids.size) return true
  const picks = draft?.picks
  if (!Array.isArray(picks) || !picks.length) return true
  return picks.every((p) => ids.has(Number(p.entryId)))
}

function shouldRemove(draft, details) {
  const leagueId = details?.league?.id
  const metaId = draft?._meta?.leagueId
  if (leagueId != null && metaId != null && Number(leagueId) !== Number(metaId)) {
    return `draft_picks _meta.leagueId (${metaId}) ≠ details.league.id (${leagueId})`
  }
  if (!pickIdsBelongToDetails(draft, details)) {
    return 'draft_picks entry_ids do not match details.league_entries (forked file?)'
  }
  return null
}

if (!existsSync(detailsPath) || !existsSync(draftPath)) {
  process.exit(0)
}

try {
  const details = JSON.parse(readFileSync(detailsPath, 'utf8'))
  const draft = JSON.parse(readFileSync(draftPath, 'utf8'))
  const reason = shouldRemove(draft, details)
  if (reason) {
    unlinkSync(draftPath)
    console.warn(`prune-stale-draft-picks: removed draft_picks.json — ${reason}`)
  }
} catch (e) {
  console.warn('prune-stale-draft-picks:', e.message)
}
