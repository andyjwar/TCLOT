import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { nextCofcLiveSort, sortCofcLiveRows } from './heritageCofcSort.js'

const ROWS = [
  { key: 'Nick M', totalPts: 356, totalPf: 10445, totalPa: 9000, totalW: 117 },
  { key: 'Andy', totalPts: 378, totalPf: 10335, totalPa: 8800, totalW: 125 },
  { key: 'Sam', totalPts: 356, totalPf: 9900, totalPa: 9100, totalW: 110 },
]

describe('sortCofcLiveRows', () => {
  it('defaults to league order: PTS, then For, then Faced', () => {
    const sorted = sortCofcLiveRows(ROWS, null)
    assert.deepEqual(
      sorted.map((r) => r.key),
      ['Andy', 'Nick M', 'Sam'],
    )
  })

  it('breaks a PTS tie by For even when PTS is the explicit column', () => {
    const sorted = sortCofcLiveRows(ROWS, { key: 'totalPts', dir: 'desc' })
    assert.equal(sorted[1].key, 'Nick M')
    assert.equal(sorted[2].key, 'Sam')
  })

  it('sorts a named column without losing a stable manager fallback', () => {
    const sorted = sortCofcLiveRows(ROWS, { key: 'totalW', dir: 'desc' })
    assert.deepEqual(
      sorted.map((r) => r.key),
      ['Andy', 'Nick M', 'Sam'],
    )
  })
})

describe('nextCofcLiveSort', () => {
  it('keeps PTS desc on the first click from league order, then flips', () => {
    const explicit = nextCofcLiveSort(null, 'totalPts')
    assert.deepEqual(explicit, { key: 'totalPts', dir: 'desc' })
    assert.deepEqual(nextCofcLiveSort(explicit, 'totalPts'), {
      key: 'totalPts',
      dir: 'asc',
    })
  })

  it('starts a W sort at desc', () => {
    assert.deepEqual(nextCofcLiveSort(null, 'totalW'), {
      key: 'totalW',
      dir: 'desc',
    })
  })
})
