import assert from 'node:assert/strict'
import test from 'node:test'
import {
  effectiveXiIds,
  formatRecord,
  formatSwing,
  h2hOutcome,
  leaguePtsFromOutcome,
  leaguePtsFromRecord,
  legalFormations,
  pickOptimalXi,
  weekBenchForSquad,
} from './bestXi.js'

function p(id, pos, pts, name = `P${id}`) {
  return { id, pos, pts, name }
}

/** 1 GK + 5 DEF + 5 MID + 3 FWD — a full draft outfield plus backup GK. */
function squad(overrides = {}) {
  const base = [
    p(1, 'GK', 2),
    p(2, 'GK', 6),
    p(10, 'DEF', 6),
    p(11, 'DEF', 5),
    p(12, 'DEF', 4),
    p(13, 'DEF', 1),
    p(14, 'DEF', 0),
    p(20, 'MID', 12),
    p(21, 'MID', 8),
    p(22, 'MID', 3),
    p(23, 'MID', 2),
    p(24, 'MID', 1),
    p(30, 'FWD', 9),
    p(31, 'FWD', 2),
    p(32, 'FWD', 1),
  ]
  const byId = new Map(base.map((x) => [x.id, x]))
  for (const [id, patch] of Object.entries(overrides)) {
    const cur = byId.get(Number(id))
    if (cur) Object.assign(cur, patch)
  }
  return [...byId.values()]
}

test('legalFormations are the eight draft 11s', () => {
  const forms = legalFormations()
  assert.equal(forms.length, 8)
  for (const f of forms) {
    assert.equal(f.GK + f.DEF + f.MID + f.FWD, 11)
    assert.equal(f.GK, 1)
  }
})

test('pickOptimalXi starts the 6pt GK and leaves the 2pt GK', () => {
  const best = pickOptimalXi(squad())
  assert.ok(best)
  assert.equal(best.xi.filter((x) => x.pos === 'GK').length, 1)
  assert.ok(best.xi.some((x) => x.id === 2 && x.pts === 6))
  assert.ok(!best.xi.some((x) => x.id === 1))
})

test('pickOptimalXi cannot start a fourth FWD even if they haul', () => {
  const players = [
    p(1, 'GK', 4),
    p(10, 'DEF', 6),
    p(11, 'DEF', 5),
    p(12, 'DEF', 4),
    p(13, 'DEF', 2),
    p(20, 'MID', 5),
    p(21, 'MID', 4),
    p(22, 'MID', 3),
    p(30, 'FWD', 8),
    p(31, 'FWD', 7),
    p(32, 'FWD', 6),
    p(33, 'FWD', 20),
  ]
  const best = pickOptimalXi(players)
  assert.ok(best)
  assert.equal(best.xi.filter((x) => x.pos === 'FWD').length, 3)
  assert.ok(best.xi.some((x) => x.id === 33))
  const fwdIds = best.xi.filter((x) => x.pos === 'FWD').map((x) => x.id)
  assert.deepEqual(fwdIds.sort((a, b) => a - b), [30, 31, 33])
})

test('pickOptimalXi prefers actual overlap when two XIs tie', () => {
  const players = [
    p(1, 'GK', 4),
    p(10, 'DEF', 5),
    p(11, 'DEF', 5),
    p(12, 'DEF', 5),
    p(13, 'DEF', 1),
    p(20, 'MID', 6),
    p(21, 'MID', 6),
    p(22, 'MID', 6),
    p(23, 'MID', 6),
    p(24, 'MID', 6),
    p(30, 'FWD', 3),
    p(31, 'FWD', 3),
  ]
  const started = [1, 10, 11, 12, 20, 21, 22, 23, 24, 30, 31]
  const best = pickOptimalXi(players, { preferIds: started })
  assert.ok(best)
  const ids = new Set(best.xi.map((x) => x.id))
  for (const id of started) assert.ok(ids.has(id))
})

test('effectiveXiIds applies official autosubs', () => {
  const picks = [
    { element: 1, position: 1 },
    { element: 2, position: 2 },
    { element: 3, position: 12 },
  ]
  const ids = effectiveXiIds(picks, [{ element_out: 2, element_in: 3 }])
  assert.deepEqual([...ids].sort((a, b) => a - b), [1, 3])
})

test('weekBenchForSquad leftover is best minus official actual', () => {
  const players = squad()
  // Started the 2pt GK; bench GK scored 6. Best XI uses the 6.
  const actualIds = [1, 10, 11, 12, 13, 20, 21, 22, 23, 30, 31]
  const actualPts = 2 + 6 + 5 + 4 + 1 + 12 + 8 + 3 + 2 + 9 + 2
  const week = weekBenchForSquad(players, actualIds, actualPts)
  assert.equal(week.bestXiPts, actualPts - 2 + 6)
  assert.equal(week.benchLeft, 4)
  assert.equal(week.leftOnBench[0].id, 2)
  assert.equal(week.satOut[0].id, 1)
})

test('weekBenchForSquad is zero when they already picked the best 11', () => {
  const players = squad()
  const best = pickOptimalXi(players)
  const week = weekBenchForSquad(
    players,
    best.xi.map((x) => x.id),
    best.pts,
  )
  assert.equal(week.benchLeft, 0)
  assert.equal(week.leftOnBench.length, 0)
})

test('h2hOutcome and formatRecord', () => {
  assert.equal(h2hOutcome(50, 40), 'W')
  assert.equal(h2hOutcome(40, 50), 'L')
  assert.equal(h2hOutcome(40, 40), 'D')
  assert.equal(formatRecord({ w: 3, d: 1, l: 2 }), '3–1–2')
  assert.equal(leaguePtsFromOutcome('W'), 3)
  assert.equal(leaguePtsFromOutcome('D'), 1)
  assert.equal(leaguePtsFromOutcome('L'), 0)
  assert.equal(leaguePtsFromRecord({ w: 2, d: 1, l: 1 }), 7)
  assert.equal(formatSwing(3), '+3')
  assert.equal(formatSwing(0), '0')
  assert.equal(formatSwing(-3), '-3')
})
