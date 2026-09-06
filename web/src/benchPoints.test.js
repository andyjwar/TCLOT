import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildBenchPointsReport,
  fixtureTablePtsLabel,
  fixtureTableSummary,
  fixturesForGw,
  formatBenchMisses,
  formatSatPlayers,
  tablePtsFromResult,
} from './benchPoints.js'

function p(id, pos, pts, name = `P${id}`) {
  return { id, pos, pts, name }
}

function xiSquad(gkPts, extraFwdPts) {
  return [
    p(1, 'GK', gkPts, 'Sels'),
    p(2, 'GK', 8, 'Raya'),
    p(10, 'DEF', 6),
    p(11, 'DEF', 5),
    p(12, 'DEF', 4),
    p(13, 'DEF', 2),
    p(20, 'MID', 7),
    p(21, 'MID', 6),
    p(22, 'MID', 5),
    p(23, 'MID', 4),
    p(30, 'FWD', 8),
    p(31, 'FWD', extraFwdPts, 'Haaland'),
    p(32, 'FWD', 1),
  ]
}

const started = [1, 10, 11, 12, 13, 20, 21, 22, 23, 30, 31]

test('buildBenchPointsReport totals leftover and flips a fixture', () => {
  // Home started 2pt GK (Raya 8 on bench). Away already optimal.
  const homePlayers = xiSquad(2, 3)
  const awayPlayers = xiSquad(8, 3).map((x) => ({ ...x, id: x.id + 100 }))
  const awayStarted = started.map((id) => id + 100)
  const homeActual = 2 + 6 + 5 + 4 + 2 + 7 + 6 + 5 + 4 + 8 + 3
  const awayActual = 8 + 6 + 5 + 4 + 2 + 7 + 6 + 5 + 4 + 8 + 3

  const report = buildBenchPointsReport({
    teams: [
      { leagueEntryId: 1, fplEntryId: 11, teamName: 'Home FC' },
      { leagueEntryId: 2, fplEntryId: 22, teamName: 'Away FC' },
    ],
    weeks: [
      {
        gw: 1,
        squads: {
          1: {
            players: homePlayers,
            actualXiIds: started,
            actualPts: homeActual,
            officialBenchPts: 8,
          },
          2: {
            players: awayPlayers,
            actualXiIds: awayStarted,
            actualPts: awayActual,
            officialBenchPts: 2,
          },
        },
        fixtures: [
          {
            homeId: 1,
            awayId: 2,
            homeName: 'Home FC',
            awayName: 'Away FC',
            homePts: homeActual,
            awayPts: awayActual,
          },
        ],
      },
    ],
  })

  assert.equal(report.gameweeks[0], 1)
  assert.equal(report.teams.length, 2)
  const home = report.teams.find((t) => t.leagueEntryId === 1)
  const away = report.teams.find((t) => t.leagueEntryId === 2)
  assert.equal(home.benchLeft, 6)
  assert.equal(home.bestXiPts, homeActual + 6)
  assert.equal(away.benchLeft, 0)
  // Actual 52–58 is an away win; best 58–58 draws — the leftover GK flips it.
  assert.equal(home.bestRecord, '0–1–0')
  assert.equal(away.bestRecord, '0–1–0')
  assert.equal(home.actualRecord, '0–0–1')
  assert.equal(home.actualLeaguePts, 0)
  assert.equal(home.bestLeaguePts, 1)
  assert.equal(home.leaguePtsSwing, 1)
  assert.equal(away.actualLeaguePts, 3)
  assert.equal(away.bestLeaguePts, 1)
  assert.equal(away.leaguePtsSwing, -2)

  assert.equal(report.fixtures.length, 1)
  const fx = report.fixtures[0]
  assert.equal(fx.flipped, true)
  assert.equal(fx.actualResult, 'A')
  assert.equal(fx.bestResult, 'D')
  assert.equal(fx.bestHome, homeActual + 6)
  assert.equal(fx.bestAway, awayActual)
  assert.equal(fx.actualHomeTablePts, 0)
  assert.equal(fx.actualAwayTablePts, 3)
  assert.equal(fx.bestHomeTablePts, 1)
  assert.equal(fx.bestAwayTablePts, 1)
})

test('fixturesForGw and formatBenchMisses', () => {
  assert.equal(fixturesForGw([{ gw: 1 }, { gw: 2 }, { gw: 1 }], 1).length, 2)
  assert.equal(
    formatBenchMisses([
      { name: 'Salah', pts: 12 },
      { name: 'Saka', pts: 8 },
      { name: 'Blank', pts: 0 },
    ]),
    'Salah 12, Saka 8',
  )
  assert.equal(formatBenchMisses([{ name: 'Blank', pts: 0 }]), '')
  assert.equal(
    formatSatPlayers([
      { name: 'Tavernier', pts: 10 },
      { name: 'Thiaw', pts: 3 },
    ]),
    'Tavernier (10), Thiaw (3)',
  )
})

test('fixture table-pt labels and flip summaries', () => {
  assert.equal(tablePtsFromResult('H', 'H'), 3)
  assert.equal(tablePtsFromResult('H', 'A'), 0)
  assert.equal(tablePtsFromResult('D', 'A'), 1)
  assert.equal(fixtureTablePtsLabel('D', 'Home FC', 'Away FC'), '1 pt each')
  assert.equal(fixtureTablePtsLabel('H', 'Home FC', 'Away FC'), 'Home FC +3')
  assert.equal(fixtureTablePtsLabel('A', 'Home FC', 'Away FC'), 'Away FC +3')
  assert.equal(
    fixtureTableSummary({
      flipped: false,
      actualResult: 'H',
      bestResult: 'H',
      homeName: 'Home FC',
      awayName: 'Away FC',
    }),
    'Home FC keep the 3 table pts.',
  )
  assert.equal(
    fixtureTableSummary({
      flipped: true,
      actualResult: 'A',
      bestResult: 'D',
      homeName: 'Home FC',
      awayName: 'Away FC',
    }),
    'Would be a draw. 1 table pt each instead of Away FC taking 3.',
  )
  assert.equal(
    fixtureTableSummary({
      flipped: true,
      actualResult: 'D',
      bestResult: 'H',
      homeName: 'Home FC',
      awayName: 'Away FC',
    }),
    'Would flip: Home FC take 3 table pts (was a draw).',
  )
})

test('worst manager sorts to the top', () => {
  const mk = (id, leftOfficial, name) => {
    const players = xiSquad(leftOfficial === 6 ? 2 : 8, 3)
    const actual = (leftOfficial === 6 ? 2 : 8) + 6 + 5 + 4 + 2 + 7 + 6 + 5 + 4 + 8 + 3
    return {
      players: players.map((x) => ({ ...x, id: x.id + id * 100 })),
      actualXiIds: started.map((x) => x + id * 100),
      actualPts: actual,
    }
  }
  const report = buildBenchPointsReport({
    teams: [
      { leagueEntryId: 1, teamName: 'Clean' },
      { leagueEntryId: 2, teamName: 'Wasteful' },
    ],
    weeks: [
      {
        gw: 1,
        squads: {
          1: mk(1, 0),
          2: mk(2, 6),
        },
        fixtures: [{ homeId: 1, awayId: 2, homePts: 0, awayPts: 0 }],
      },
    ],
  })
  assert.equal(report.teams[0].teamName, 'Wasteful')
  assert.ok(report.teams[0].benchLeft > report.teams[1].benchLeft)
})
