/**
 * Remove solid black that touches the image border (outer backdrop only).
 * Stops at the white sticker ring — does not key the sticker or the subject.
 */

function isOuterBlackField(r, g, b) {
  const lum = (r + g + b) / 3
  const mx = Math.max(r, g, b)
  return lum < 55 && mx < 70
}

export function keyBlackConnectedToImageEdges(jimp) {
  const w = jimp.bitmap.width
  const h = jimp.bitmap.height
  const d = jimp.bitmap.data
  const inQ = new Uint8Array(w * h)
  const q = []

  function trySeed(y, x) {
    if (x < 0 || x >= w || y < 0 || y >= h) return
    const i = y * w + x
    if (inQ[i]) return
    const idx = i * 4
    const r = d[idx]
    const g = d[idx + 1]
    const b = d[idx + 2]
    if (!isOuterBlackField(r, g, b)) return
    inQ[i] = 1
    q.push(i)
  }

  for (let x = 0; x < w; x++) {
    trySeed(0, x)
    trySeed(h - 1, x)
  }
  for (let y = 1; y < h - 1; y++) {
    trySeed(y, 0)
    trySeed(y, w - 1)
  }

  let head = 0
  while (head < q.length) {
    const i = q[head++]
    const x = i % w
    const y = (i / w) | 0
    const idx = i * 4
    d[idx + 3] = 0
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      const ni = ny * w + nx
      if (inQ[ni]) continue
      const j = ni * 4
      const r = d[j]
      const g = d[j + 1]
      const b = d[j + 2]
      if (isOuterBlackField(r, g, b)) {
        inQ[ni] = 1
        q.push(ni)
      }
    }
  }
}
