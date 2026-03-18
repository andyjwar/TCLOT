#!/usr/bin/env node
/**
 * Pre-resizes team logos to 192×192 (cover) in public/team-logos-web/{id}.png.
 * Stops the browser from downscaling 2–4MP phone photos to ~60px (looks blurry).
 */
import { readdirSync, statSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Jimp } from 'jimp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const SRC = join(root, 'public/team-logos')
const OUT = join(root, 'public/team-logos-web')

async function main() {
  if (!existsSync(SRC)) return
  mkdirSync(OUT, { recursive: true })

  for (const f of readdirSync(SRC)) {
    if (!/^\d+\.[a-z0-9]+$/i.test(f)) continue
    const id = f.replace(/\.[^.]+$/, '')
    const inPath = join(SRC, f)
    const outPath = join(OUT, `${id}.png`)
    try {
      const st = statSync(inPath)
      if (existsSync(outPath) && statSync(outPath).mtimeMs >= st.mtimeMs) continue
      const img = await Jimp.read(inPath)
      await img.cover({ w: 192, h: 192 })
      await img.write(outPath)
      console.log('team-logos-web:', `${id}.png`)
    } catch (e) {
      console.warn('team-logos-web skip', f, e.message)
    }
  }
}

main()
