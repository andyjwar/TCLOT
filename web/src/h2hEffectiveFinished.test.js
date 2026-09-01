import assert from 'node:assert/strict'
import test from 'node:test'
import {
  completedFootballGameweeks,
  finishedEventIdsFromEvents,
  matchEffectivelyFinished,
  normalizeMatchesFinished,
  deriveStandingsFromFinishedMatches,
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
    league_entry_1: 10,
    league_entry_2: 20,
    league_entry_1_points: 40,
    league_entry_2_points: 23,
  },
  {
    event: 1,
    finished: false,
    started: true,
    league_entry_1: 30,
    league_entry_2: 40,
    league_entry_1_points: 35,
    league_entry_2_points: 53,
  },
  {
    event: 2,
    finished: false,
    started: true,
    league_entry_1: 10,
    league_entry_2: 30,
    league_entry_1_points: 10,
    league_entry_2_points: 12,
  },
  {
    event: 3,
    finished: false,
    started: false,
    league_entry_1: 10,
    league_entry_2: 40,
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

test('finishedEventIdsFromEvents — highest finished ids from bootstrap shapes', () => {
  const fromObj = finishedEventIdsFromEvents({
    events: {
      current: 3,
      data: [
        { id: 1, finished: true },
        { id: 2, finished: true },
        { id: 3, finished: false },
      ],
    },
  })
  assert.equal(fromObj.has(1), true)
  assert.equal(fromObj.has(2), true)
  assert.equal(fromObj.has(3), false)
  const fromList = finishedEventIdsFromEvents([{ id: 2, finished: true }])
  assert.equal(fromList.has(2), true)
  assert.equal(finishedEventIdsFromEvents(null).size, 0)
})

test('completedFootballGameweeks — bootstrap finished closes a GW fixtures still show open', () => {
  const set = completedFootballGameweeks(fixturesGw1Done, [2])
  assert.equal(set.has(1), true)
  assert.equal(set.has(2), true)
})

test('normalizeMatchesFinished — event.finished promotes GW2 even if one PL fixture lags', () => {
  const staleMondayNight = [
    { event: 2, finished: false, finished_provisional: true },
    { event: 2, finished: false, finished_provisional: false, started: false },
  ]
  const out = normalizeMatchesFinished(matches, staleMondayNight, new Set([2]))
  assert.equal(out[2].finished, true)
  assert.equal(out[3].finished, false)
})

test('deriveStandingsFromFinishedMatches — W/L/PF from finished H2H rows', () => {
  const finished = normalizeMatchesFinished(matches, fixturesGw1Done)
  const entries = [{ id: 10 }, { id: 20 }, { id: 30 }, { id: 40 }]
  const rows = deriveStandingsFromFinishedMatches(entries, finished)
  assert.equal(rows.length, 4)
  assert.equal(rows[0].league_entry, 40) // 53 pts win
  assert.equal(rows[0].matches_won, 1)
  assert.equal(rows[0].matches_played, 1)
  assert.equal(rows[0].points_for, 53)
  assert.equal(rows[0].total, 3)
  const loser = rows.find((r) => r.league_entry === 20)
  assert.equal(loser.matches_lost, 1)
  assert.equal(loser.points_for, 23)
  assert.equal(loser.total, 0)
})
