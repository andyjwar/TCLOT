import assert from 'node:assert/strict'
import test from 'node:test'
import {
  completedFootballGameweeks,
  finishedEventIdsFromEvents,
  matchEffectivelyFinished,
  normalizeMatchesFinished,
  deriveStandingsFromFinishedMatches,
  reconcileMatchPointsFromStandings,
  overlayFresherMatchPoints,
  mergeStandingsPreferringHigherFor,
  applyLeagueResults,
  compareStandingsRows,
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

test('compareStandingsRows — official FPL order is PTS, FOR, then fewer against (not waivers)', () => {
  const suffolk = { total: 3, points_for: 131, points_against: 132, waiver_pick: 4 }
  const seoul = { total: 3, points_for: 131, points_against: 135, waiver_pick: 5 }
  const toronto = { total: 3, points_for: 131, points_against: 149, waiver_pick: 3 }
  const rows = [toronto, seoul, suffolk].sort(compareStandingsRows)
  assert.deepEqual(
    rows.map((r) => r.points_against),
    [132, 135, 149],
  )
  // Fewer waivers / lower waiver_pick would have put Toronto first — official does not.
  assert.equal(rows[0], suffolk)
})

test('reconcileMatchPointsFromStandings — lifts Saturday leftovers to official FOR', () => {
  const matches = [
    {
      event: 1,
      finished: true,
      league_entry_1: 30728,
      league_entry_2: 10173,
      league_entry_1_points: 47,
      league_entry_2_points: 31,
    },
    {
      event: 2,
      finished: true,
      league_entry_1: 6849,
      league_entry_2: 30728,
      league_entry_1_points: 61,
      league_entry_2_points: 44,
    },
    {
      event: 2,
      finished: true,
      league_entry_1: 4259,
      league_entry_2: 5220,
      league_entry_1_points: 40,
      league_entry_2_points: 38,
    },
    {
      event: 1,
      finished: true,
      league_entry_1: 4259,
      league_entry_2: 18279,
      league_entry_1_points: 31,
      league_entry_2_points: 50,
    },
    {
      event: 3,
      finished: true,
      league_entry_1: 30728,
      league_entry_2: 4259,
      league_entry_1_points: 9,
      league_entry_2_points: 31,
    },
  ]
  const official = [
    { league_entry: 30728, points_for: 131 },
    { league_entry: 4259, points_for: 114 },
  ]
  const gw3In = matches.find((m) => m.event === 3)
  const out = reconcileMatchPointsFromStandings(matches, official)
  const gw3 = out.find((m) => m.event === 3)
  assert.equal(gw3.league_entry_1_points, 40)
  assert.equal(gw3.league_entry_2_points, 43)
  assert.equal(gw3In.league_entry_1_points, 9, 'input left untouched')
})

test('overlayFresherMatchPoints — live details win when they have more points', () => {
  const base = [
    {
      event: 3,
      finished: true,
      started: true,
      league_entry_1: 30728,
      league_entry_2: 4259,
      league_entry_1_points: 9,
      league_entry_2_points: 31,
    },
  ]
  const live = [
    {
      event: 3,
      finished: true,
      started: true,
      league_entry_1: 4259,
      league_entry_2: 30728,
      league_entry_1_points: 43,
      league_entry_2_points: 40,
    },
  ]
  const out = overlayFresherMatchPoints(base, live)
  assert.equal(out[0].league_entry_1_points, 40)
  assert.equal(out[0].league_entry_2_points, 43)
})

test('applyLeagueResults — official FOR beats leftover H2H and rewrites the table', () => {
  const details = {
    league_entries: [{ id: 30728 }, { id: 4259 }],
    matches: [
      {
        event: 3,
        finished: true,
        started: true,
        league_entry_1: 30728,
        league_entry_2: 4259,
        league_entry_1_points: 9,
        league_entry_2_points: 31,
      },
    ],
    standings: [
      { league_entry: 30728, points_for: 40, points_against: 43, total: 0 },
      { league_entry: 4259, points_for: 43, points_against: 40, total: 3 },
    ],
  }
  const { matches, standings } = applyLeagueResults(details, [], new Set())
  assert.equal(matches[0].league_entry_1_points, 40)
  assert.equal(matches[0].league_entry_2_points, 43)
  const seoul = standings.find((s) => s.league_entry === 30728)
  const bilbo = standings.find((s) => s.league_entry === 4259)
  assert.equal(seoul.points_for, 40)
  assert.equal(bilbo.points_for, 43)
  assert.equal(bilbo.total, 3)
  assert.equal(seoul.total, 0)
})

test('mergeStandingsPreferringHigherFor — keeps the website-fresh FOR', () => {
  const baked = [{ league_entry: 30728, points_for: 100, points_against: 104, total: 3 }]
  const live = [{ league_entry: 30728, points_for: 131, points_against: 135, total: 3 }]
  const out = mergeStandingsPreferringHigherFor(baked, live)
  assert.equal(out[0].points_for, 131)
  assert.equal(out[0].points_against, 135)
})
