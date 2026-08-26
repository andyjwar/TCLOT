import assert from 'node:assert/strict'
import test from 'node:test'
import { rewindSquadsToDraft } from './draftBoardPicks.js'

// The real Schade case: Toronto Gimli (4895) drafted M.Fernandes (525) then
// waived him for Schade (94) before the GW1 deadline, so the GW1 squad the
// reconstruction fallback fetches already contains Schade.
test('rewinds a pre-deadline waiver back to the drafted player', () => {
  const gw1Squads = new Map([
    [4895, [10, 94, 300]],
    [18269, [166, 200]],
  ])
  const txs = [
    { added: '2026-08-18T20:17:22Z', element_in: 94, element_out: 525, entry: 4895, event: 1, id: 356349, kind: 'w', result: 'a' },
    // Denied claims must not rewind anything.
    { added: '2026-08-18T08:02:03Z', element_in: 166, element_out: 316, entry: 18269, event: 1, id: 295997, kind: 'w', result: 'di' },
  ]
  const out = rewindSquadsToDraft(gw1Squads, txs, 1)
  assert.deepEqual(out.get(4895), [10, 525, 300])
  assert.deepEqual(out.get(18269), [166, 200])
  // Input untouched.
  assert.deepEqual(gw1Squads.get(4895), [10, 94, 300])
})

test('chained moves unwind newest-first (A→B then B→C restores A)', () => {
  const squads = new Map([[5, [30]]])
  const txs = [
    { added: '2026-08-10T00:00:00Z', element_in: 20, element_out: 10, entry: 5, event: 1, id: 1, kind: 'w', result: 'a' },
    { added: '2026-08-12T00:00:00Z', element_in: 30, element_out: 20, entry: 5, event: 1, id: 2, kind: 'f', result: 'a' },
  ]
  assert.deepEqual(rewindSquadsToDraft(squads, txs, 1).get(5), [10])
})

test('transactions after startGw are ignored', () => {
  const squads = new Map([[5, [10]]])
  const txs = [
    { added: '2026-09-01T00:00:00Z', element_in: 10, element_out: 99, entry: 5, event: 3, id: 1, kind: 'w', result: 'a' },
  ]
  assert.deepEqual(rewindSquadsToDraft(squads, txs, 1).get(5), [10])
})
