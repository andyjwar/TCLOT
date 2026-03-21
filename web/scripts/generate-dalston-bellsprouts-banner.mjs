/**
 * Builds hall-champions/dalston-bellsprouts.png (600×900) from the Bellsprout art.
 * Forest-green field + grain; typography matches Toronto (Pacifico + #ffd54a, same positions).
 *
 * Source: `source-assets/dalston-bellsprout.png` — promo-style art on a blue gradient with a
 * caption bar; we crop the bar and edge-flood the blue. If you drop a JPEG/WebP, convert first:
 * `sips -s format png in.jpg --out source-assets/dalston-bellsprout.png`
 *
 * Usage: node scripts/generate-dalston-bellsprouts-banner.mjs
 */
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { Jimp, JimpMime } from 'jimp'
import { scaleSpriteToHeroBox } from './hall-banner-hero-scale.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const W = 600
const H = 900
const BG = '#3d6b52'
const YELLOW = '#ffd54a'

/** Nudge sprite upward vs true vertical center (subtle; hero box already fills the band). */
const SPRITE_LIFT_PX = 28

const SOURCE = join(__dirname, 'source-assets/dalston-bellsprout.png')
const FONT = join(__dirname, 'fonts/Pacifico-Regular.ttf')
const OUT = join(__dirname, '../public/hall-champions/dalston-bellsprouts.png')

/** Strip bottom pixels (caption / logo text on the promo still). */
const CROP_BOTTOM_CAPTION = 52

/**
 * RGB step limit for edge flood. Blue gradients need ~30+; lower values leak less into AA edges.
 */
const FLOOD_TOLERANCE = 32

/**
 * Remove backdrop connected to image edges (blue gradient, greens, etc.).
 */
function floodEraseEdgeBackdrop(jimp, tolerance = FLOOD_TOLERANCE) {
  const w = jimp.bitmap.width
  const h = jimp.bitmap.height
  const data = jimp.bitmap.data
  const r0 = new Uint8Array(w * h)
  const g0 = new Uint8Array(w * h)
  const b0 = new Uint8Array(w * h)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    r0[p] = data[i]
    g0[p] = data[i + 1]
    b0[p] = data[i + 2]
  }
  const visited = new Uint8Array(w * h)
  const queue = []
  const pix = (x, y) => y * w + x
  const dist = (p, q) => {
    const dr = r0[p] - r0[q]
    const dg = g0[p] - g0[q]
    const db = b0[p] - b0[q]
    return Math.sqrt(dr * dr + dg * dg + db * db)
  }
  const enqueue = (x, y) => {
    const p = pix(x, y)
    if (visited[p]) return
    visited[p] = 1
    data[p * 4 + 3] = 0
    queue.push(p)
  }
  for (let x = 0; x < w; x++) {
    enqueue(x, 0)
    enqueue(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y)
    enqueue(w - 1, y)
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const p = queue[qi]
    const x = p % w
    const y = (p / w) | 0
    const nbs = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]
    for (const [nx, ny] of nbs) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      const np = pix(nx, ny)
      if (visited[np]) continue
      if (dist(p, np) > tolerance) continue
      visited[np] = 1
      data[np * 4 + 3] = 0
      queue.push(np)
    }
  }
}

/**
 * Flat white / neutral grey (caption residue, fringes). Keeps tinted character pixels.
 */
function keyWhiteBackdrop(jimp) {
  jimp.scan(function (_x, _y, idx) {
    const d = this.bitmap.data
    const r = d[idx]
    const g = d[idx + 1]
    const b = d[idx + 2]
    const a0 = d[idx + 3]
    if (a0 === 0) return
    const min = Math.min(r, g, b)
    const max = Math.max(r, g, b)
    const spread = max - min
    const lum = (r + g + b) / 3
    if (spread > 22 || lum < 198) return
    if (min > 252) {
      d[idx + 3] = 0
      return
    }
    if (min > 228) {
      const t = (min - 215) / 40
      d[idx + 3] = Math.round(a0 * (1 - Math.min(1, Math.max(0, t))))
    }
  })
}

/** Key blue-dominant pixels still opaque (inner fringes not reached by flood). */
function keyBlueFringe(jimp) {
  jimp.scan(function (_x, _y, idx) {
    const d = this.bitmap.data
    const r = d[idx]
    const g = d[idx + 1]
    const b = d[idx + 2]
    const a0 = d[idx + 3]
    if (a0 === 0) return
    if (!(b > r + 14 && b > g + 6)) return
    const dist = Math.hypot(r - 55, g - 115, b - 185)
    if (dist <= 62) {
      d[idx + 3] = 0
      return
    }
    if (dist < 100) {
      const t = (dist - 62) / 38
      d[idx + 3] = Math.round(a0 * (1 - Math.min(1, Math.max(0, t))))
    }
  })
}

/** Tight crop to non-transparent pixels so no backdrop margin remains. */
function cropToOpaque(jimp) {
  const bw = jimp.bitmap.width
  const bh = jimp.bitmap.height
  const data = jimp.bitmap.data
  let minX = bw
  let minY = bh
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const a = data[(y * bw + x) * 4 + 3]
      if (a > 12) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX) return
  jimp.crop({
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  })
}

function addMonoNoise(jimp, amount, sizeMix = 1) {
  jimp.scan(function (_x, _y, idx) {
    const n = (Math.random() - 0.5) * amount * sizeMix
    const d = this.bitmap.data
    d[idx] = Math.min(255, Math.max(0, d[idx] + n))
    d[idx + 1] = Math.min(255, Math.max(0, d[idx + 1] + n))
    d[idx + 2] = Math.min(255, Math.max(0, d[idx + 2] + n))
  })
}

function buildTextSvg() {
  const shadow =
    '<filter id="twSh" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">' +
    '<feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#000000" flood-opacity="0.3"/>' +
    '</filter>'

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${shadow}</defs>
  <text x="300" y="122" text-anchor="middle" font-family="Pacifico" font-size="56" fill="${YELLOW}" filter="url(#twSh)">Dalston Bellsprouts</text>
  <text x="300" y="832" text-anchor="middle" font-family="Pacifico" font-size="52" fill="${YELLOW}" filter="url(#twSh)">2021-2022</text>
</svg>`
}

async function main() {
  const sprite = await Jimp.read(SOURCE)
  const ch = sprite.bitmap.height
  sprite.crop({
    x: 0,
    y: 0,
    w: sprite.bitmap.width,
    h: Math.max(1, ch - CROP_BOTTOM_CAPTION),
  })

  floodEraseEdgeBackdrop(sprite)
  keyBlueFringe(sprite)
  keyWhiteBackdrop(sprite)
  cropToOpaque(sprite)
  scaleSpriteToHeroBox(sprite)

  const rh = sprite.bitmap.height
  const rw = sprite.bitmap.width
  const rx = Math.round((W - rw) / 2)
  const topBand = 108
  const bottomBand = 98
  const midH = H - topBand - bottomBand
  const ry = Math.max(
    topBand,
    Math.round(topBand + (midH - rh) / 2) - SPRITE_LIFT_PX,
  )

  const base = new Jimp({ width: W, height: H, color: BG })
  addMonoNoise(base, 10, 1)
  addMonoNoise(base, 5, 0.45)

  base.composite(sprite, rx, ry)

  const svg = buildTextSvg()
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [FONT],
      cursiveFamily: 'Pacifico',
      loadSystemFonts: false,
    },
    shapeRendering: 0,
    textRendering: 2,
  })
  const overlayPng = Buffer.from(resvg.render().asPng())

  const textLayer = await Jimp.read(overlayPng)
  base.composite(textLayer, 0, 0)

  await writeFile(OUT, await base.getBuffer(JimpMime.png))
  console.log('Wrote', OUT)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
