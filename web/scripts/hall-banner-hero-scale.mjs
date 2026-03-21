/**
 * Shared hero scale for 600×900 hall banners — matches Toronto Wiggum’s ~472×511 footprint
 * while allowing wider subjects (e.g. Bellsprout) to use more horizontal space.
 */
export const HERO_MAX_W = 580
export const HERO_MAX_H = 511

/** Uniform scale so the sprite fits inside [HERO_MAX_W × HERO_MAX_H] (same “contain” box for every banner). */
export function scaleSpriteToHeroBox(jimp, opts = {}) {
  const maxW = opts.maxW ?? HERO_MAX_W
  const maxH = opts.maxH ?? HERO_MAX_H
  const w = jimp.bitmap.width
  const h = jimp.bitmap.height
  if (w < 1 || h < 1) return
  const scale = Math.min(maxW / w, maxH / h)
  const nw = Math.max(1, Math.round(w * scale))
  const nh = Math.max(1, Math.round(h * scale))
  jimp.resize({ w: nw, h: nh })
}

/** Trim fully transparent margins (wide canvases with small RGBA subjects scale up much larger). */
export function cropToOpaque(jimp) {
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
