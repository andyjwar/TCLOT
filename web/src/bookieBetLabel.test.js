import test from 'node:test'
import assert from 'node:assert/strict'
import { describeBet, describeBetCompact } from './bookieBetLabel.js'

const h2h = {
  id: 10,
  kind: 'h2h',
  payload: { homeName: 'Atlético Bilbo', awayName: 'Toronto Gimli', gw: 2 },
}
const marketById = new Map([[10, h2h], [99, { id: 99, kind: 'outright' }]])
const names = new Map([
  [1, 'Toronto Gimli'],
  [2, 'Mordor SFG'],
])

test('describeBetCompact — home pick is bold home + (v opponent), no gameweek', () => {
  assert.deepEqual(
    describeBetCompact({ market_id: 10, selection: 'home' }, marketById, names),
    { pick: 'Bilbo', detail: '(v Gimli)' },
  )
})

test('describeBetCompact — away pick is bold away + (v opponent)', () => {
  assert.deepEqual(
    describeBetCompact({ market_id: 10, selection: 'away' }, marketById, names),
    { pick: 'Gimli', detail: '(v Bilbo)' },
  )
})

test('describeBetCompact — draw keeps both last words in the detail', () => {
  assert.deepEqual(
    describeBetCompact({ market_id: 10, selection: 'draw' }, marketById, names),
    { pick: 'Draw', detail: '(Bilbo v Gimli)' },
  )
})

test('describeBetCompact — a label too wide for the column drops to 3-letter codes', () => {
  const wide = new Map([
    [
      11,
      {
        id: 11,
        kind: 'h2h',
        payload: { homeName: 'Rokesly Regorasu', awayName: 'Seoul Shire', gw: 2 },
      },
    ],
  ])
  // 'Draw (Regorasu v Shire)' is 23 chars — over budget, so codes win.
  assert.deepEqual(describeBetCompact({ market_id: 11, selection: 'draw' }, wide, names), {
    pick: 'Draw',
    detail: '(REG v SHI)',
  })
  // The single-team backs still fit, so they keep the readable names.
  assert.deepEqual(describeBetCompact({ market_id: 11, selection: 'home' }, wide, names), {
    pick: 'Regorasu',
    detail: '(v Shire)',
  })
})

test('describeBetCompact — season places use last word + market tag', () => {
  const byId = new Map([
    [99, { id: 99, kind: 'outright' }],
    [100, { id: 100, kind: 'titan' }],
    [101, { id: 101, kind: 'minnow' }],
    [102, { id: 102, kind: 'last' }],
  ])
  assert.deepEqual(
    describeBetCompact({ market_id: 99, kind: 'outright', selection: '1' }, byId, names),
    { pick: 'Gimli', detail: '— outright' },
  )
  assert.deepEqual(
    describeBetCompact({ market_id: 100, kind: 'titan', selection: '1' }, byId, names),
    { pick: 'Gimli', detail: '— titan' },
  )
  assert.deepEqual(
    describeBetCompact({ market_id: 101, kind: 'minnow', selection: '2' }, byId, names),
    { pick: 'Mordor', detail: '— minnow' },
  )
  assert.deepEqual(
    describeBetCompact({ market_id: 102, kind: 'last', selection: '1' }, byId, names),
    { pick: 'Gimli', detail: '— last' },
  )
})

test('describeBet — full names for title text', () => {
  assert.equal(
    describeBet({ market_id: 10, selection: 'away' }, marketById, names),
    'Toronto Gimli (Atlético Bilbo v Toronto Gimli, GW2)',
  )
})

/* player specials — selection is a draft element id, name from the payload */

const playerMarkets = new Map([
  [
    20,
    {
      id: 20,
      kind: 'scorer',
      payload: {
        homeName: 'Atlético Bilbo',
        awayName: 'Toronto Gimli',
        gw: 2,
        selections: [
          { elementId: 401, name: 'Haaland' },
          { elementId: 402, name: 'Calvert-Lewin' },
        ],
      },
    },
  ],
  [
    21,
    {
      id: 21,
      kind: 'toppoints',
      payload: {
        homeName: 'Atlético Bilbo',
        awayName: 'Toronto Gimli',
        gw: 2,
        selections: [{ elementId: 401, name: 'Haaland' }],
      },
    },
  ],
])

test('describeBetCompact — player specials show the player + market tag', () => {
  assert.deepEqual(
    describeBetCompact({ market_id: 20, kind: 'scorer', selection: '401' }, playerMarkets, names),
    { pick: 'Haaland', detail: '— to score' },
  )
  assert.deepEqual(
    describeBetCompact(
      { market_id: 21, kind: 'toppoints', selection: '401' },
      playerMarkets,
      names,
    ),
    { pick: 'Haaland', detail: '— top pts' },
  )
})

test('describeBetCompact — a long player name drops to the tiny tag', () => {
  // 'Calvert-Lewin — to score' is over budget; the tiny form still names him.
  assert.deepEqual(
    describeBetCompact({ market_id: 20, kind: 'scorer', selection: '402' }, playerMarkets, names),
    { pick: 'Calvert-Lewin', detail: '(goal)' },
  )
})

test('describeBet — player specials in full', () => {
  assert.equal(
    describeBet({ market_id: 20, kind: 'scorer', selection: '401' }, playerMarkets, names),
    'Haaland to score anytime (Atlético Bilbo v Toronto Gimli, GW2)',
  )
  assert.equal(
    describeBet({ market_id: 21, kind: 'toppoints', selection: '401' }, playerMarkets, names),
    'Haaland top point scorer (Atlético Bilbo v Toronto Gimli, GW2)',
  )
})

test('describeBet — player special with a vanished market falls back to the id', () => {
  assert.equal(
    describeBet({ market_id: 77, kind: 'scorer', selection: '401' }, playerMarkets, names),
    '401 to score anytime',
  )
})
