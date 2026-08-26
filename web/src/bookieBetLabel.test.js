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

test('describeBetCompact — home pick is (v opponent last word, GW)', () => {
  assert.equal(
    describeBetCompact({ market_id: 10, selection: 'home' }, marketById, names),
    '(v Gimli, GW2)',
  )
})

test('describeBetCompact — away pick is (v opponent last word, GW)', () => {
  assert.equal(
    describeBetCompact({ market_id: 10, selection: 'away' }, marketById, names),
    '(v Bilbo, GW2)',
  )
})

test('describeBetCompact — draw keeps both last words', () => {
  assert.equal(
    describeBetCompact({ market_id: 10, selection: 'draw' }, marketById, names),
    'Draw (Bilbo v Gimli, GW2)',
  )
})

test('describeBetCompact — outright uses last word', () => {
  assert.equal(
    describeBetCompact({ market_id: 99, kind: 'outright', selection: '1' }, marketById, names),
    'Gimli — outright',
  )
  assert.equal(
    describeBetCompact({ market_id: 99, kind: 'outright', selection: '2' }, marketById, names),
    'Mordor — outright',
  )
})

test('describeBet — full names for title text', () => {
  assert.equal(
    describeBet({ market_id: 10, selection: 'away' }, marketById, names),
    'Toronto Gimli (Atlético Bilbo v Toronto Gimli, GW2)',
  )
})
