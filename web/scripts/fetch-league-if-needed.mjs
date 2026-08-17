#!/usr/bin/env node
/**
 * Local dev/build: pulls your league into data/ so copy-data uses the right JSON.
 * CI (GITHUB_ACTIONS/CI): skipped — GitHub runs ingest.py instead.
 *
 * Create repo-root `.fpl-league-id` with one line: your draft league number
 * (same as draft.premierleague.com/league/THIS_NUMBER)
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '../..')
const dataDir = join(repoRoot, 'data')
const idFile = join(repoRoot, '.fpl-league-id')

if (process.env.SKIP_LEAGUE_FETCH === '1') {
  process.exit(0)
}
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

const id = readId()
if (!id) {
  process.exit(0)
}

const DRAFT = 'https://draft.premierleague.com/api'
/** Classic API — fixtures only (no draft player id space). */
const FPL_CLASSIC = 'https://fantasy.premierleague.com/api'

async function save(name, url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`)
  writeFileSync(
    join(dataDir, `${name}.json`),
    JSON.stringify(await r.json(), null, 2)
  )
}

const norm = (v) => String(v ?? '').trim().toLowerCase()

/** FPL Draft reissues league ids each season — a stale id resolves to a
 *  stranger's league. Reject the fetch when the managers don't overlap
 *  with the committed snapshot's managers (by last name, ≥ half). */
function assertLeagueIdentity(details) {
  if (process.env.ALLOW_LEAGUE_IDENTITY_MISMATCH === '1') return
  const committedPath = join(repoRoot, 'web/public/league-data/details.json')
  if (!existsSync(committedPath)) return
  let committed
  try {
    committed = JSON.parse(readFileSync(committedPath, 'utf8'))
  } catch {
    return
  }
  if (committed.isSample) return
  const known = new Set(
    (committed.league_entries ?? [])
      .map((e) => norm(e.player_last_name))
      .filter(Boolean)
  )
  const entries = details.league_entries ?? []
  if (!known.size || !entries.length) return
  const matches = entries.filter((e) => known.has(norm(e.player_last_name))).length
  if (matches * 2 >= entries.length) return
  const managers = entries
    .map((e) => `${e.player_first_name ?? ''} ${e.player_last_name ?? ''}`.trim())
    .join(', ')
  console.error(
    `fetch-league-if-needed: league ${id} is a DIFFERENT league — refusing to overwrite data/.\n` +
      `  Fetched "${details.league?.name ?? '?'}" with managers: ${managers}\n` +
      `  FPL Draft issues a NEW league id every season. Update .fpl-league-id (or FPL_LEAGUE_ID)\n` +
      `  to the new season's id from draft.premierleague.com/league/<ID>.\n` +
      `  Intentionally switching leagues? Re-run with ALLOW_LEAGUE_IDENTITY_MISMATCH=1.`
  )
  process.exit(1)
}

try {
  mkdirSync(dataDir, { recursive: true })
  console.log(`fetch-league-if-needed: downloading league ${id}…`)
  const detailsResp = await fetch(`${DRAFT}/league/${id}/details`)
  if (!detailsResp.ok) throw new Error(`details: HTTP ${detailsResp.status}`)
  const details = await detailsResp.json()
  assertLeagueIdentity(details)
  writeFileSync(join(dataDir, 'details.json'), JSON.stringify(details, null, 2))
  await save('element_status', `${DRAFT}/league/${id}/element-status`)
  await save('transactions', `${DRAFT}/draft/league/${id}/transactions`)
  await save('trades', `${DRAFT}/draft/league/${id}/trades`)
  await save('bootstrap_draft', `${DRAFT}/bootstrap-static`)
  const fx = await fetch(`${FPL_CLASSIC}/fixtures`)
  if (fx.ok) {
    writeFileSync(
      join(dataDir, 'fixtures.json'),
      JSON.stringify(await fx.json(), null, 2)
    )
  }
  const d = JSON.parse(readFileSync(join(dataDir, 'details.json'), 'utf8'))
  console.log(
    `fetch-league-if-needed: OK — "${d.league?.name ?? '?'}" (${d.league_entries?.length ?? 0} teams)`
  )
} catch (e) {
  console.error('fetch-league-if-needed FAILED:', e.message)
  console.error(
    '  Fix: check league ID, network, or run: python3 ingest.py',
    id,
    'from repo root'
  )
  process.exit(1)
}
