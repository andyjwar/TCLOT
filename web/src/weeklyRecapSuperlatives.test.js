import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  pickTopScorer,
  pickBestWaiver,
  pickDraftDud,
} from './weeklyRecapSuperlatives.js'

test('pickTopScorer takes the highest pts and ties on overperformance', () => {
  const top = pickTopScorer([
    { name: 'Palmer', pts: 13, xp: 4.5, teamName: 'Suffolk Sméagol' },
    { name: 'Stach', pts: 13, xp: 3.4, teamName: 'Hackney Rohirrim' },
    { name: 'Gakpo', pts: 12, xp: 3.5, teamName: 'Rokesly Regorasu' },
  ])
  assert.equal(top.name, 'Stach')
  assert.equal(top.pts, 13)
  assert.equal(top.teamName, 'Hackney Rohirrim')
  assert.equal(pickTopScorer([]), null)
  assert.equal(pickTopScorer(null), null)
})

test('pickBestWaiver prefers the highest xP among recent claims', () => {
  const best = pickBestWaiver([
    { name: 'N.Jackson', kind: 'w', xp: 0.4, teamName: 'Brampton Balrogs' },
    { name: 'Schade', kind: 'w', xp: 5.5, teamName: 'Toronto Gimli' },
    { name: 'Dorgu', kind: 'w', xp: 3.1, teamName: 'Hackney Rohirrim' },
  ])
  assert.equal(best.name, 'Schade')
  assert.equal(best.xp, 5.5)
  assert.equal(best.kind, 'w')
  const byPts = pickBestWaiver([
    { name: 'Tel', kind: 'f', pts: 2, teamName: 'Seoul Shire' },
    { name: 'Barry', kind: 'f', pts: 8, teamName: 'Brampton Balrogs' },
  ])
  assert.equal(byPts.name, 'Barry')
  assert.equal(pickBestWaiver([]), null)
})

test('pickDraftDud is the earliest early-round pick projecting poorly', () => {
  const dud = pickDraftDud([
    { name: 'Haaland', overallPick: 1, round: 1, xp: 6.6, teamName: 'Toronto Gimli' },
    { name: 'Isak', overallPick: 3, round: 1, xp: 1.7, teamName: 'Atlético Bilbo' },
    { name: 'Havertz', overallPick: 15, round: 2, xp: 1.2, teamName: 'Rokesly Regorasu' },
    { name: 'Watkins', overallPick: 8, round: 1, xp: 2.4, teamName: 'Hackney Rohirrim' },
  ])
  assert.equal(dud.name, 'Isak')
  assert.equal(dud.overallPick, 3)
  assert.equal(dud.xp, 1.7)
})

test('pickDraftDud in actual mode takes the lowest score among early picks', () => {
  const dud = pickDraftDud(
    [
      { name: 'Haaland', overallPick: 1, round: 1, pts: 2, teamName: 'Toronto Gimli' },
      { name: 'Watkins', overallPick: 8, round: 1, pts: 0, teamName: 'Hackney Rohirrim' },
      { name: 'Thiago', overallPick: 10, round: 2, pts: 0, teamName: 'Brampton Balrogs' },
    ],
    { useActual: true },
  )
  assert.equal(dud.name, 'Watkins')
  assert.equal(dud.overallPick, 8)
  assert.equal(dud.pts, 0)
})
