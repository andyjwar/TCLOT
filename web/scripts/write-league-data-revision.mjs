#!/usr/bin/env node
/** Bust browser cache for static league-data JSON after each build. */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const detailsPath = join(__dirname, '../public/league-data/details.json')
const outPath = join(__dirname, '../public/league-data/revision.json')

if (!existsSync(detailsPath)) {
  console.warn('write-league-data-revision: no details.json — skip')
  process.exit(0)
}

let maxFinishedGw = 0
try {
  const d = JSON.parse(readFileSync(detailsPath, 'utf8'))
  for (const m of d.matches || []) {
    if (m?.finished !== true) continue
    const ev = Number(m.event)
    if (Number.isFinite(ev) && ev > maxFinishedGw) maxFinishedGw = ev
  }
} catch (e) {
  console.warn('write-league-data-revision: parse error', e.message)
  process.exit(0)
}

const sha = (process.env.GITHUB_SHA || '').trim().slice(0, 12)
const v = sha ? `gw${maxFinishedGw}-${sha}` : `gw${maxFinishedGw}-${Date.now()}`

writeFileSync(
  outPath,
  JSON.stringify(
    {
      v,
      maxFinishedH2hGameweek: maxFinishedGw,
      builtAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)
console.log(`write-league-data-revision: ${v}`)
