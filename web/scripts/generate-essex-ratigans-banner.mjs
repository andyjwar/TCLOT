/**
 * Builds hall-champions/essex-ratigans.png (600×900).
 * Uses the Ratigan source as a full raster (black field + white sticker edge kept as-is).
 *
 * Background: magenta / violet blend (#9e4d84) + grain — same as before.
 * Typography: Pacifico + #ffd54a like other hall banners.
 *
 * Source: `source-assets/essex-ratigans-ratigan.png`
 *
 * Usage: node scripts/generate-essex-ratigans-banner.mjs
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
/** Mid blend of #D1507C and #6B4B8B (cravat) */
const BG = '#9e4d84'
const YELLOW = '#ffd54a'

const SOURCE = join(__dirname, 'source-assets/essex-ratigans-ratigan.png')
const FONT = join(__dirname, 'fonts/Pacifico-Regular.ttf')
const OUT = join(__dirname, '../public/hall-champions/essex-ratigans.png')

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
  <text x="300" y="122" text-anchor="middle" font-family="Pacifico" font-size="56" fill="${YELLOW}" filter="url(#twSh)">Essex Ratigans</text>
  <text x="300" y="832" text-anchor="middle" font-family="Pacifico" font-size="52" fill="${YELLOW}" filter="url(#twSh)">2020-2021</text>
</svg>`
}

async function main() {
  const sprite = await Jimp.read(SOURCE)
  scaleSpriteToHeroBox(sprite)

  const rh = sprite.bitmap.height
  const rw = sprite.bitmap.width
  const rx = Math.round((W - rw) / 2)
  const topBand = 108
  const bottomBand = 98
  const midH = H - topBand - bottomBand
  const ry = Math.max(topBand, Math.round(topBand + (midH - rh) / 2) - 28)

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
