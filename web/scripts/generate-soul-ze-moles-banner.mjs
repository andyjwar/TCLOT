/**
 * Builds hall-champions/soul-ze-moles.png (600×900).
 * Pink field + grain; Christophe cut-out (RGBA).
 * Title/season typography matches Toronto Wiggum / Dalston (Pacifico + #ffd54a, same positions).
 * Source has large transparent margins — cropToOpaque before scaling so the mole fills the hero box.
 *
 * Usage: node scripts/generate-soul-ze-moles-banner.mjs
 */
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { Jimp, JimpMime } from 'jimp'
import {
  cropToOpaque,
  scaleSpriteToHeroBox,
} from './hall-banner-hero-scale.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const W = 600
const H = 900
const BG = '#e81c76'
const YELLOW = '#ffd54a'

const SOURCE = join(__dirname, 'source-assets/soul-ze-moles-christophe.png')
const FONT = join(__dirname, 'fonts/Pacifico-Regular.ttf')
const OUT = join(__dirname, '../public/hall-champions/soul-ze-moles.png')

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
  <text x="300" y="122" text-anchor="middle" font-family="Pacifico" font-size="56" fill="${YELLOW}" filter="url(#twSh)">Soul Ze Moles</text>
  <text x="300" y="832" text-anchor="middle" font-family="Pacifico" font-size="52" fill="${YELLOW}" filter="url(#twSh)">2024-25</text>
</svg>`
}

async function main() {
  const portrait = await Jimp.read(SOURCE)
  cropToOpaque(portrait)
  /* Between the old full-canvas scale (~326px tall) and max hero (~511px): ~midpoint height */
  scaleSpriteToHeroBox(portrait, { maxW: 570, maxH: 430 })

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
