import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assignGwFinishRankAndPositionPoints,
  buildGwRawPointsRankSeasonTotals,
  fplGwScoreOrdinalFromPointsMap,
  heroDefeatEntryIds,
  villainVictoryEntryIds,
} from './gwRawPointsRankSeason.js';

test('fplGwScoreOrdinalFromPointsMap — tie breaks by entry id', () => {
  const m = fplGwScoreOrdinalFromPointsMap(
    new Map([
      [10, 50],
      [20, 50],
      [30, 40],
    ]),
  );
  assert.equal(m.get(10), 1);
  assert.equal(m.get(20), 2);
  assert.equal(m.get(30), 3);
});

test('villainVictoryEntryIds — win H2H at 7th in league raw GW', () => {
  const pts = new Map([
    [1, 80],
    [2, 70],
    [3, 60],
    [4, 50],
    [5, 40],
    [6, 30],
    [7, 25],
    [8, 20],
  ]);
  const gwMatches = [{ league_entry_1: 7, league_entry_2: 8, league_entry_1_points: 25, league_entry_2_points: 20 }];
  const v = villainVictoryEntryIds(pts, gwMatches);
  assert.equal(v.size, 1);
  assert.ok(v.has(7));
});

test('heroDefeatEntryIds — lose H2H at 2nd in league raw GW', () => {
  const pts = new Map([
    [1, 80],
    [2, 70],
    [3, 60],
    [4, 50],
    [5, 40],
    [6, 30],
    [7, 25],
    [8, 20],
  ]);
  const gwMatches = [
    { league_entry_1: 2, league_entry_2: 1, league_entry_1_points: 70, league_entry_2_points: 80 },
  ];
  const h = heroDefeatEntryIds(pts, gwMatches);
  assert.equal(h.size, 1);
  assert.ok(h.has(2));
});

test('assignGwFinishRankAndPositionPoints — two-way tie averages rank points', () => {
  const rows = [
    { id: 1, pts: 10 },
    { id: 2, pts: 10 },
    { id: 3, pts: 5 },
  ];
  assignGwFinishRankAndPositionPoints(rows, 3);
  assert.equal(rows[0].positionPoints, 1.5);
  assert.equal(rows[1].positionPoints, 1.5);
  assert.equal(rows[2].positionPoints, 3);
});

test('buildGwRawPointsRankSeasonTotals — aggregates villain and hero per GW', () => {
  const teams = { 1: { entry_name: 'A' }, 2: { entry_name: 'B' } };
  const matches = [
    {
      event: 1,
      finished: true,
      league_entry_1: 1,
      league_entry_2: 2,
      league_entry_1_points: 10,
      league_entry_2_points: 5,
    },
  ];
  const { gwRawPointsRankRows } = buildGwRawPointsRankSeasonTotals(
    matches,
    [{ id: 1 }, { id: 2 }],
    teams,
  );
  assert.equal(gwRawPointsRankRows.length, 2);
  const a = gwRawPointsRankRows.find((r) => r.league_entry === 1);
  assert.equal(a.totalPositionPoints, 1);
  assert.equal(a.villainVictories, 0);
});
