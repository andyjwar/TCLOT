/**
 * Builds hall-champions/toronto-wiggum.png (600×900) from the source portrait.
 * Uses Jimp for raster work and @resvg/resvg-js for Pacifico typography (SVG).
 *
 * Usage: node scripts/generate-toronto-wiggum-banner.mjs
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
const BG = '#2d86d1'
const YELLOW = '#ffd54a'

const SOURCE = join(__dirname, 'source-assets/ralph-wiggum-portrait.jpg')
const FONT = join(__dirname, 'fonts/Pacifico-Regular.ttf')
const OUT = join(__dirname, '../public/hall-champions/toronto-wiggum.png')

/** Crop pixels from bottom of source (removes baked-in “Ralph Wiggum” lettering). */
const CROP_BOTTOM_TRIM = 114

/**
 * Key out the source’s flat blue so the textured canvas shows through.
 * Uses a short alpha ramp at the boundary to avoid blue halos above hard transparency edges.
 */
function keySourceBackdrop(jimp, inner = 50, outer = 86) {
  const br = 0x2d
  const bg = 0x86
  const bb = 0xd1
  jimp.scan(function (_x, _y, idx) {
    const d = this.bitmap.data
    const r = d[idx]
    const g = d[idx + 1]
    const b = d[idx + 2]
    const a0 = d[idx + 3]
    if (a0 === 0) return
    if (!(b > r + 18 && b > g + 8)) return
    const dist = Math.hypot(r - br, g - bg, b - bb)
    if (dist <= inner) {
      d[idx + 3] = 0
      return
    }
    if (dist < outer) {
      const t = (dist - inner) / (outer - inner)
      d[idx + 3] = Math.round(a0 * t)
    }
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

  // resvg does not reliably honor data: @font-face — load the TTF via ResvgRenderOptions.font.fontFiles
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${shadow}</defs>
  <text x="300" y="122" text-anchor="middle" font-family="Pacifico" font-size="56" fill="${YELLOW}" filter="url(#twSh)">Toronto Wiggum</text>
  <text x="300" y="832" text-anchor="middle" font-family="Pacifico" font-size="52" fill="${YELLOW}" filter="url(#twSh)">2023-2024</text>
</svg>`
}

async function main() {
  const portrait = await Jimp.read(SOURCE)

  const pw = portrait.bitmap.width
  const ph = portrait.bitmap.height
  const cropH = Math.max(1, ph - CROP_BOTTOM_TRIM)
  portrait.crop({ x: 0, y: 0, w: pw, h: cropH })
  keySourceBackdrop(portrait)
  scaleSpriteToHeroBox(portrait)

  const rh = portrait.bitmap.height
  const rw = portrait.bitmap.width
  const rx = Math.round((W - rw) / 2)
  const topBand = 108
  const bottomBand = 98
  const midH = H - topBand - bottomBand
  const ry = Math.round(topBand + (midH - rh) / 2)

  const base = new Jimp({ width: W, height: H, color: BG })
  addMonoNoise(base, 10, 1)
  addMonoNoise(base, 5, 0.45)

  base.composite(portrait, rx, ry)

  const svg = buildTextSvg()
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [FONT],
      cursiveFamily: 'Pacifico',
      // Avoid mixing in a system UI font for digits / punctuation
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
