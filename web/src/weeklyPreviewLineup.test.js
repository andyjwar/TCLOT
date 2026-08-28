import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseDraftPicks,
  hasFullXi,
  playerAvailability,
  injuryLabel,
  formationOk,
  canReplaceInXi,
  lineupFromPriorXi,
  pickInjuryImpacts,
  pickBenchBlunder,
  sumStarterXp,
  watchableXi,
} from './weeklyPreviewLineup.js'

const p = (over) => ({
  id: 1,
  name: 'Saka',
  pos: 'MID',
  xp: 6,
  flag: 'ok',
  status: 'a',
  chance: 100,
  news: '',
  ...over,
})

test('parseDraftPicks splits selected 11 vs bench and ignores autosubs', () => {
  const parsed = parseDraftPicks({
    automatic_subs: [{ element_in: 99, element_out: 1 }],
    picks: [
      { element: 10, position: 2 },
      { element: 11, position: 1 },
      { element: 12, position: 12 },
      { element: 13, position: 13 },
    ],
  })
  assert.deepEqual(
    parsed.starters.map((r) => r.id),
    [11, 10],
  )
  assert.deepEqual(
    parsed.bench.map((r) => r.id),
    [12, 13],
  )
  assert.equal(hasFullXi(parsed), false)
  assert.equal(hasFullXi({ starters: Array.from({ length: 11 }, (_, i) => ({ id: i + 1, position: i + 1 })) }), true)
  assert.deepEqual(parseDraftPicks(null).starters, [])
})

test('playerAvailability treats 75% niggles as healthy and true outs as out', () => {
  assert.equal(playerAvailability({ status: 'a', chance_of_playing_next_round: null }).flag, 'ok')
  assert.equal(
    playerAvailability({
      status: 'd',
      chance_of_playing_next_round: 75,
      news: 'Groin injury - 75% chance of playing',
    }).flag,
    'ok',
  )
  assert.equal(
    playerAvailability({ status: 'd', chance_of_playing_next_round: 50 }).flag,
    'doubt',
  )
  assert.equal(playerAvailability({ status: 'i', chance_of_playing_next_round: 0 }).flag, 'out')
  assert.equal(playerAvailability({ status: 's' }).flag, 'out')
  assert.equal(playerAvailability({ status: 'u' }).flag, 'out')
})

test('injuryLabel takes the clause before the dash', () => {
  assert.equal(injuryLabel('Groin injury - Unknown return date', 'i'), 'groin injury')
  assert.equal(injuryLabel('', 's'), 'suspension')
  assert.equal(injuryLabel('', 'i'), 'injury')
})

test('formationOk enforces draft min/max', () => {
  const xi = [
    p({ pos: 'GK' }),
    p({ pos: 'DEF' }),
    p({ pos: 'DEF' }),
    p({ pos: 'DEF' }),
    p({ pos: 'DEF' }),
    p({ pos: 'MID' }),
    p({ pos: 'MID' }),
    p({ pos: 'MID' }),
    p({ pos: 'MID' }),
    p({ pos: 'FWD' }),
    p({ pos: 'FWD' }),
  ]
  assert.equal(formationOk(xi), true)
  assert.equal(formationOk(xi.slice(0, 10)), false)
})

test('canReplaceInXi allows same-pos and legal FWD-for-MID, not a second GK', () => {
  const xi = [
    p({ id: 1, pos: 'GK' }),
    p({ id: 2, pos: 'DEF' }),
    p({ id: 3, pos: 'DEF' }),
    p({ id: 4, pos: 'DEF' }),
    p({ id: 5, pos: 'DEF' }),
    p({ id: 6, pos: 'MID' }),
    p({ id: 7, pos: 'MID' }),
    p({ id: 8, pos: 'MID' }),
    p({ id: 9, pos: 'MID' }),
    p({ id: 10, pos: 'FWD' }),
    p({ id: 11, pos: 'FWD' }),
  ]
  assert.equal(canReplaceInXi(xi, p({ id: 20, pos: 'MID' }), xi[5]), true)
  assert.equal(canReplaceInXi(xi, p({ id: 21, pos: 'FWD' }), xi[8]), true)
  assert.equal(canReplaceInXi(xi, p({ id: 22, pos: 'GK' }), xi[5]), false)
})

test('lineupFromPriorXi copies last week XI and leftover owned as bench', () => {
  const row = lineupFromPriorXi({
    leagueEntryId: 10,
    fplEntryId: 20,
    priorXi: [{ id: 1 }, { id: 2 }],
    ownedIds: [1, 2, 3, 4],
  })
  assert.deepEqual(
    row.starters.map((r) => r.id),
    [1, 2],
  )
  assert.deepEqual(
    row.bench.map((r) => r.id),
    [3, 4],
  )
  assert.equal(row.source, 'prior-xi')
})

test('pickInjuryImpacts flags a started out player and a missing star, not a 75% niggle', () => {
  const starters = [
    p({ id: 1, name: 'Isak', pos: 'FWD', xp: 1.7, flag: 'out', status: 'i', news: 'Groin injury - Unknown return date' }),
    p({ id: 2, name: 'Saka', pos: 'MID', xp: 6, flag: 'ok' }),
  ]
  const bench = [
    p({ id: 3, name: 'Saliba', pos: 'DEF', xp: 4.2, flag: 'out', status: 'i', news: 'Back injury - Unknown return date' }),
    p({ id: 4, name: 'Madjo', pos: 'FWD', xp: 0.4, flag: 'out', status: 'i' }),
    p({ id: 5, name: 'Bruno G.', pos: 'MID', xp: 4.7, flag: 'ok', status: 'd', chance: 75 }),
  ]
  const hits = pickInjuryImpacts(starters, bench, { prevStartIds: [3] })
  assert.equal(hits[0].name, 'Isak')
  assert.equal(hits[0].kind, 'starting-out')
  assert.equal(hits[0].injury, 'groin injury')
  assert.equal(hits[1].name, 'Saliba')
  assert.equal(hits[1].kind, 'missing')
  assert.ok(!hits.some((h) => h.name === 'Madjo'))
  assert.ok(!hits.some((h) => h.name === 'Bruno G.'))
})

test('pickInjuryImpacts mentions a ≤50% starter', () => {
  const hits = pickInjuryImpacts(
    [p({ name: 'Kudus', xp: 4, flag: 'doubt', chance: 50, news: 'Thigh injury - 50% chance of playing' })],
    [],
  )
  assert.equal(hits[0].kind, 'starting-doubt')
  assert.equal(hits[0].name, 'Kudus')
})

test('pickBenchBlunder catches a healthy high-xP bench vs a poor starter', () => {
  const starters = [
    p({ id: 1, name: 'Roefs', pos: 'GK', xp: 5 }),
    p({ id: 2, name: 'Tarkowski', pos: 'DEF', xp: 3 }),
    p({ id: 3, name: 'Mosquera', pos: 'DEF', xp: 2 }),
    p({ id: 4, name: 'N.Williams', pos: 'DEF', xp: 4 }),
    p({ id: 5, name: 'Rúben', pos: 'DEF', xp: 4 }),
    p({ id: 6, name: 'Cunha', pos: 'MID', xp: 4 }),
    p({ id: 7, name: 'Foden', pos: 'MID', xp: 5 }),
    p({ id: 8, name: 'Ndiaye', pos: 'MID', xp: 3 }),
    p({ id: 9, name: 'Gibbs-White', pos: 'MID', xp: 2 }),
    p({ id: 10, name: 'João Pedro', pos: 'FWD', xp: 5 }),
    p({ id: 11, name: 'Emersonn', pos: 'FWD', xp: 0.5 }),
  ]
  const bench = [
    p({ id: 20, name: 'Woltemade', pos: 'FWD', xp: 3.9, flag: 'ok' }),
    p({ id: 21, name: 'J.Timber', pos: 'DEF', xp: 4.8, flag: 'out' }),
  ]
  const call = pickBenchBlunder(starters, bench)
  assert.equal(call.bench.name, 'Woltemade')
  assert.equal(call.starter.name, 'Emersonn')
  assert.ok(call.gap >= 1.5)
})

test('pickBenchBlunder skips injured bench and tiny gaps', () => {
  const starters = [
    p({ id: 1, pos: 'GK', xp: 5 }),
    p({ id: 2, pos: 'DEF', xp: 4 }),
    p({ id: 3, pos: 'DEF', xp: 4 }),
    p({ id: 4, pos: 'DEF', xp: 4 }),
    p({ id: 5, pos: 'MID', xp: 5 }),
    p({ id: 6, pos: 'MID', xp: 5 }),
    p({ id: 7, pos: 'MID', xp: 4 }),
    p({ id: 8, pos: 'MID', xp: 4 }),
    p({ id: 9, pos: 'MID', xp: 3.8 }),
    p({ id: 10, pos: 'FWD', xp: 5 }),
    p({ id: 11, pos: 'FWD', xp: 4 }),
  ]
  assert.equal(
    pickBenchBlunder(starters, [p({ id: 20, pos: 'MID', xp: 6, flag: 'out', name: 'Saka' })]),
    null,
  )
  assert.equal(
    pickBenchBlunder(starters, [p({ id: 21, pos: 'MID', xp: 4.2, flag: 'ok', name: 'Eze' })]),
    null,
  )
})

test('pickBenchBlunder skips a healthy-flagged player who still has injury news', () => {
  const starters = [
    p({ id: 1, pos: 'GK', xp: 5 }),
    p({ id: 2, pos: 'DEF', xp: 0.5, name: 'Davis' }),
    p({ id: 3, pos: 'DEF', xp: 4 }),
    p({ id: 4, pos: 'DEF', xp: 4 }),
    p({ id: 5, pos: 'MID', xp: 5 }),
    p({ id: 6, pos: 'MID', xp: 5 }),
    p({ id: 7, pos: 'MID', xp: 4 }),
    p({ id: 8, pos: 'MID', xp: 4 }),
    p({ id: 9, pos: 'MID', xp: 3 }),
    p({ id: 10, pos: 'FWD', xp: 5 }),
    p({ id: 11, pos: 'FWD', xp: 4 }),
  ]
  assert.equal(
    pickBenchBlunder(starters, [
      p({
        id: 208,
        pos: 'MID',
        xp: 6,
        flag: 'ok',
        name: 'Sarr',
        news: 'Groin injury - 75% chance of playing',
      }),
    ]),
    null,
  )
})

test('sumStarterXp and watchableXi drop unavailable players from the watch list', () => {
  const xi = [
    p({ xp: 5, flag: 'ok' }),
    p({ name: 'Isak', xp: 1.7, flag: 'out' }),
    p({ xp: 4.3, flag: 'ok' }),
  ]
  assert.equal(sumStarterXp(xi), 11)
  assert.deepEqual(
    watchableXi(xi).map((r) => r.flag),
    ['ok', 'ok'],
  )
})
