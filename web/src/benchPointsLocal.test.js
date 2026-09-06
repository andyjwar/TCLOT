import assert from 'node:assert/strict'
import test from 'node:test'
import { ownedIdsAtGw, reconstructWeekSquads, xiFromHistory } from './benchPointsLocal.js'

test('ownedIdsAtGw applies draft then accepted waivers', () => {
  const owned = ownedIdsAtGw({
    leagueEntryId: 10,
    fplEntryId: 100,
    gw: 1,
    draftPicks: [
      { leagueEntryId: 10, element: 1 },
      { leagueEntryId: 10, element: 2 },
      { leagueEntryId: 11, element: 9 },
    ],
    transactions: [
      { entry: 100, event: 1, result: 'a', element_in: 3, element_out: 2, id: 1 },
      { entry: 100, event: 1, result: 'di', element_in: 4, element_out: 1, id: 2 },
      { entry: 100, event: 2, result: 'a', element_in: 5, element_out: 3, id: 3 },
    ],
  })
  assert.deepEqual([...owned].sort((a, b) => a - b), [1, 3])
})

test('xiFromHistory picks the matching side', () => {
  const row = {
    league_entry_1: 1,
    league_entry_2: 2,
    xi1: [{ id: 11 }],
    xi2: [{ id: 22 }],
  }
  assert.deepEqual(
    xiFromHistory(row, 2).map((p) => p.id),
    [22],
  )
})

test('reconstructWeekSquads uses history XI pts and event_points for bench', () => {
  const squads = reconstructWeekSquads({
    gw: 1,
    teams: [{ leagueEntryId: 1, fplEntryId: 100, teamName: 'A' }],
    matches: [
      {
        event: 1,
        league_entry_1: 1,
        league_entry_1_points: 20,
        league_entry_2: 2,
        league_entry_2_points: 10,
      },
    ],
    boot: {
      events: { current: 1 },
      elements: [
        { id: 1, web_name: 'Sels', element_type: 1, event_points: 2 },
        { id: 2, web_name: 'Raya', element_type: 1, event_points: 8 },
        ...[10, 11, 12, 13, 20, 21, 22, 23, 30].map((id, i) => ({
          id,
          web_name: `P${id}`,
          element_type: i < 4 ? 2 : i < 8 ? 3 : 4,
          event_points: 1,
        })),
      ],
    },
    draftPicks: [1, 2, 10, 11, 12, 13, 20, 21, 22, 23, 30].map((element) => ({
      leagueEntryId: 1,
      element,
    })),
    transactions: [],
    trades: [],
    historyH2h: [
      {
        league_entry_1: 1,
        league_entry_2: 2,
        xi1: [
          { id: 1, name: 'Sels', pos: 'GK', pts: 2 },
          { id: 10, pos: 'DEF', pts: 2 },
          { id: 11, pos: 'DEF', pts: 2 },
          { id: 12, pos: 'DEF', pts: 2 },
          { id: 13, pos: 'DEF', pts: 2 },
          { id: 20, pos: 'MID', pts: 2 },
          { id: 21, pos: 'MID', pts: 2 },
          { id: 22, pos: 'MID', pts: 2 },
          { id: 23, pos: 'MID', pts: 2 },
          { id: 30, pos: 'FWD', pts: 2 },
          { id: 11, pos: 'DEF', pts: 2 },
        ],
      },
    ],
  })
  assert.ok(squads[1])
  const raya = squads[1].players.find((p) => p.id === 2)
  assert.equal(raya.pts, 8)
  assert.equal(raya.pos, 'GK')
})
