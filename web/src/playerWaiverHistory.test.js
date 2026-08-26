import assert from 'node:assert/strict'
import test from 'node:test'
import {
  stintPointsFromHistory,
  stintRangeLabel,
  waiverHistoryForElement,
} from './playerWaiverHistory.js'

// Real shape from transactions.json: Toronto Gimli (entry 4895) waived in
// Schade (94) for M.Fernandes (525) in GW1; a lower-priority claim for 315
// on the same drop was denied ('do'); an unrelated claim was denied ('di').
const gw1Waivers = [
  {
    added: '2026-08-18T08:02:03.121599Z',
    element_in: 166,
    element_out: 316,
    entry: 18269,
    event: 1,
    id: 295997,
    kind: 'w',
    result: 'di',
  },
  {
    added: '2026-08-18T20:17:22.412005Z',
    element_in: 94,
    element_out: 525,
    entry: 4895,
    event: 1,
    id: 356349,
    kind: 'w',
    result: 'a',
  },
  {
    added: '2026-08-18T20:17:22.412055Z',
    element_in: 315,
    element_out: 525,
    entry: 4895,
    event: 1,
    id: 356350,
    kind: 'w',
    result: 'do',
  },
]

test('waiver-in produces an ongoing "in" event with the dropped player', () => {
  const { events, failedClaims } = waiverHistoryForElement(gw1Waivers, 94)
  assert.deepEqual(events, [
    {
      type: 'in',
      txId: 356349,
      gw: 1,
      kind: 'w',
      entry: 4895,
      otherElement: 525,
      endGw: null,
    },
  ])
  assert.deepEqual(failedClaims, [])
})

test('the dropped player sees an "out" event naming his replacement', () => {
  const { events } = waiverHistoryForElement(gw1Waivers, 525)
  assert.deepEqual(events, [
    { type: 'out', txId: 356349, gw: 1, kind: 'w', entry: 4895, otherElement: 94 },
  ])
})

test('denied claims become failedClaims, never events', () => {
  const forDenied = waiverHistoryForElement(gw1Waivers, 315)
  assert.deepEqual(forDenied.events, [])
  assert.deepEqual(forDenied.failedClaims, [{ gw: 1, entry: 4895 }])
  // The denied claim's would-be drop (525) gets no extra "out" row either.
  assert.equal(waiverHistoryForElement(gw1Waivers, 525).events.length, 1)
})

test('a later drop by the same entry closes the stint at drop GW − 1', () => {
  const txs = [
    ...gw1Waivers,
    {
      added: '2026-09-20T09:00:00Z',
      element_in: 700,
      element_out: 94,
      entry: 4895,
      event: 6,
      id: 400001,
      kind: 'f',
      result: 'a',
    },
  ]
  const { events } = waiverHistoryForElement(txs, 94)
  assert.equal(events.length, 2)
  assert.equal(events[0].type, 'in')
  assert.equal(events[0].endGw, 5)
  assert.deepEqual(events[1], {
    type: 'out',
    txId: 400001,
    gw: 6,
    kind: 'f',
    entry: 4895,
    otherElement: 700,
  })
})

test('a drop by a DIFFERENT entry does not close the stint', () => {
  const txs = [
    ...gw1Waivers,
    {
      added: '2026-09-20T09:00:00Z',
      element_in: 700,
      element_out: 94,
      entry: 99999,
      event: 6,
      id: 400001,
      kind: 'w',
      result: 'a',
    },
  ]
  const inEvent = waiverHistoryForElement(txs, 94).events.find((e) => e.type === 'in')
  assert.equal(inEvent.endGw, null)
})

test('re-signed after a drop: two stints, each paired with its own drop', () => {
  const txs = [
    { added: '2026-08-18T00:00:00Z', element_in: 94, element_out: 1, entry: 5, event: 1, id: 1, kind: 'w', result: 'a' },
    { added: '2026-09-01T00:00:00Z', element_in: 2, element_out: 94, entry: 5, event: 4, id: 2, kind: 'w', result: 'a' },
    { added: '2026-10-01T00:00:00Z', element_in: 94, element_out: 3, entry: 5, event: 8, id: 3, kind: 'f', result: 'a' },
  ]
  const { events } = waiverHistoryForElement(txs, 94)
  assert.deepEqual(
    events.map((e) => [e.type, e.gw, e.endGw ?? null]),
    [
      ['in', 1, 3],
      ['out', 4, null],
      ['in', 8, null],
    ],
  )
})

test('stintPointsFromHistory sums the range inclusive, DGW rows both count', () => {
  const history = [
    { event: 1, total_points: 3 },
    { event: 2, total_points: 7 },
    { event: 2, total_points: 5 }, // DGW second fixture
    { event: 3, total_points: 2 },
  ]
  assert.equal(stintPointsFromHistory(history, 1, 2), 15)
  assert.equal(stintPointsFromHistory(history, 1, null), 17) // ongoing
  assert.equal(stintPointsFromHistory(history, 2, 1), 0) // never-fielded stint
  assert.equal(stintPointsFromHistory(null, 1, null), null) // not loaded
})

test('stintRangeLabel wording', () => {
  assert.equal(stintRangeLabel(1, null), 'Since GW1')
  assert.equal(stintRangeLabel(1, 12), 'GW1–GW12 · 12 GWs')
  assert.equal(stintRangeLabel(5, 5), 'GW5–GW5 · 1 GW')
  assert.equal(stintRangeLabel(1, 0), 'Never fielded')
})
