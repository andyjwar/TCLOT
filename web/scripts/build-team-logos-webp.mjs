#!/usr/bin/env node
/**
 * Pre-resizes team logos to 192×192 (cover) in public/team-logos-web/{id}.png.
 * Stops the browser from downscaling 2–4MP phone photos to ~60px (looks blurry).
 *
 * Sources:
 *  - `{id}.{ext}` files in public/team-logos/ (legacy / archive crests)
 *  - public/team-logos/manifest.json maps new-season entry ids → named files
 *    (Bilbo.JPG, …). Named art may live in team-logos/ or team-logos-web/.
 */
import {
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Jimp } from 'jimp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const SRC = join(root, 'public/team-logos')
const OUT = join(root, 'public/team-logos-web')

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

/** Resolve a manifest filename from team-logos/ first, then team-logos-web/. */
function resolveNamedSource(filename) {
  const inSrc = join(SRC, filename)
  if (existsSync(inSrc)) return inSrc
  const inOut = join(OUT, filename)
  if (existsSync(inOut)) return inOut
  return null
}

/** Mean luminance (Rec. 709) over non-transparent pixels, 0–255. */
function meanLuminance(img) {
  const { data, width, height } = img.bitmap
  let sum = 0
  let n = 0
  for (let i = 0; i < width * height * 4; i += 4) {
    if (data[i + 3] > 128) {
      sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      n += 1
    }
  }
  return n ? sum / n : 255
}

/**
 * Lift dark badge art toward a target mean luminance via gamma. The LOTR
 * crests average ~85–140/255 and turn into dark blobs at 20–36px; a gamma
 * lift keeps highlights while opening the shadows. `maxGamma` caps the lift
 * so near-black art (Brampton ~19/255) stays moody instead of washing gray.
 * Already-bright badges are left untouched.
 */
function brightenAdaptive(img, target = 135, maxGamma = 0.45) {
  const lum = meanLuminance(img)
  if (lum >= target) return
  const gamma = Math.max(
    Math.log(target / 255) / Math.log(Math.max(lum, 1) / 255),
    maxGamma,
  )
  const lut = new Uint8Array(256)
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.round(255 * (i / 255) ** gamma)
  }
  const { data, width, height } = img.bitmap
  for (let i = 0; i < width * height * 4; i += 4) {
    data[i] = lut[data[i]]
    data[i + 1] = lut[data[i + 1]]
    data[i + 2] = lut[data[i + 2]]
  }
}

async function writeCoverPng(inPath, outPath, size = 192, { brighten = false } = {}) {
  const st = statSync(inPath)
  if (existsSync(outPath) && statSync(outPath).mtimeMs >= st.mtimeMs) return false
  const img = await Jimp.read(inPath)
  await img.cover({ w: size, h: size })
  if (brighten) brightenAdaptive(img)
  await img.write(outPath)
  return true
}

async function main() {
  if (!existsSync(SRC)) return
  mkdirSync(OUT, { recursive: true })

  for (const f of readdirSync(SRC)) {
    if (!/^\d+\.[a-z0-9]+$/i.test(f)) continue
    const id = f.replace(/\.[^.]+$/, '')
    const inPath = join(SRC, f)
    const outPath = join(OUT, `${id}.png`)
    try {
      if (await writeCoverPng(inPath, outPath, 192, { brighten: true })) {
        console.log('team-logos-web:', `${id}.png`)
      }
    } catch (e) {
      console.warn('team-logos-web skip', f, e.message)
    }
  }

  const manifest = readJson(join(SRC, 'manifest.json'))
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return

  for (const [id, filename] of Object.entries(manifest)) {
    if (!/^\d+$/.test(id) || typeof filename !== 'string' || !filename) continue
    const inPath = resolveNamedSource(filename)
    if (!inPath) {
      console.warn('team-logos-web manifest miss', id, filename)
      continue
    }
    const outPath = join(OUT, `${id}.png`)
    try {
      if (await writeCoverPng(inPath, outPath, 192, { brighten: true })) {
        console.log('team-logos-web:', `${id}.png`, '←', filename)
      }
    } catch (e) {
      console.warn('team-logos-web manifest skip', id, filename, e.message)
    }

    // Named copy for consumers that address logos by manifest filename
    // (LeagueRing preseason splash loads team-logos-web/{file} directly).
    const namedSrc = join(SRC, filename)
    if (existsSync(namedSrc)) {
      const namedOut = join(OUT, filename)
      try {
        if (await writeCoverPng(namedSrc, namedOut, 384)) {
          console.log('team-logos-web:', filename)
        }
      } catch (e) {
        console.warn('team-logos-web named skip', filename, e.message)
      }
    }
  }
}

main()
