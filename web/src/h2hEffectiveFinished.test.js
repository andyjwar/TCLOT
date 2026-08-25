import assert from 'node:assert/strict'
import test from 'node:test'
import {
  completedFootballGameweeks,
  matchEffectivelyFinished,
  normalizeMatchesFinished,
} from './h2hEffectiveFinished.js'

const fixturesGw1Done = [
  { event: 1, finished: false, finished_provisional: true },
  { event: 1, finished: true, finished_provisional: true },
  { event: 2, finished: false, finished_provisional: false },
  { event: 2, finished: false, finished_provisional: true },
]

const matches = [
  {
    event: 1,
    finished: false,
    started: true,
    league_entry_1_points: 40,
    league_entry_2_points: 23,
  },
  {
    event: 1,
    finished: false,
    started: true,
    league_entry_1_points: 35,
    league_entry_2_points: 53,
  },
  {
    event: 2,
    finished: false,
    started: true,
    league_entry_1_points: 10,
    league_entry_2_points: 12,
  },
  {
    event: 3,
    finished: false,
    started: false,
    league_entry_1_points: 0,
    league_entry_2_points: 0,
  },
]

test('completedFootballGameweeks — only GWs where every fixture is done', () => {
  const set = completedFootballGameweeks(fixturesGw1Done)
  assert.equal(set.has(1), true)
  assert.equal(set.has(2), false)
})

test('completedFootballGameweeks — empty / bad input', () => {
  assert.equal(completedFootballGameweeks(null).size, 0)
  assert.equal(completedFootballGameweeks([]).size, 0)
  assert.equal(completedFootballGameweeks([{ event: null }]).size, 0)
})

test('matchEffectivelyFinished — promotes when football done + points present', () => {
  const done = completedFootballGameweeks(fixturesGw1Done)
  assert.equal(matchEffectivelyFinished(matches[0], done), true)
  assert.equal(matchEffectivelyFinished(matches[2], done), false) // GW2 incomplete
  assert.equal(matchEffectivelyFinished(matches[3], done), false) // not started
})

test('matchEffectivelyFinished — trusts FPL finished flag regardless of fixtures', () => {
  assert.equal(
    matchEffectivelyFinished({ event: 9, finished: true, started: false }, new Set()),
    true,
  )
})

test('matchEffectivelyFinished — refuses rows without finite points', () => {
  const done = new Set([1])
  assert.equal(
    matchEffectivelyFinished(
      { event: 1, finished: false, started: true, league_entry_1_points: null },
      done,
    ),
    false,
  )
})

test('normalizeMatchesFinished — promotes GW1 rows only', () => {
  const out = normalizeMatchesFinished(matches, fixturesGw1Done)
  assert.equal(out[0].finished, true)
  assert.equal(out[1].finished, true)
  assert.equal(out[2].finished, false)
  assert.equal(out[3].finished, false)
  // Original array left untouched
  assert.equal(matches[0].finished, false)
})

test('normalizeMatchesFinished — no-op when no fixtures complete', () => {
  const out = normalizeMatchesFinished(matches, [
    { event: 1, finished: false, finished_provisional: false },
  ])
  assert.equal(out, matches)
})
