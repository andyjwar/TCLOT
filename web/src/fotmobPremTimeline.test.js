import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectDayMatches,
  extractLeagueTeams,
  mapFplTeamsToFotmob,
  matchFplElementId,
  parseFotmobEventMinute,
} from './fotmobPremTimeline.js';

test('collectDayMatches finds nested fixtures', () => {
  const j = {
    leagues: [
      {
        matches: [
          { id: 999, home: { id: 1, name: 'A' }, away: { id: 2, name: 'B' } },
        ],
      },
    ],
  };
  const rows = collectDayMatches(j);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].matchId, 999);
  assert.equal(rows[0].homeId, 1);
  assert.equal(rows[0].awayId, 2);
});

test('mapFplTeamsToFotmob matches short names', () => {
  const teamById = {
    1: { id: 1, name: 'Arsenal', short_name: 'ARS' },
    2: { id: 2, name: 'Aston Villa', short_name: 'AVL' },
  };
  const fm = [
    { id: 9825, shortName: 'ARS', name: 'Arsenal' },
    { id: 10261, shortName: 'AVL', name: 'Aston Villa' },
  ];
  const m = mapFplTeamsToFotmob(teamById, fm);
  assert.equal(m.get(1), 9825);
  assert.equal(m.get(2), 10261);
});

test('matchFplElementId resolves web_name on team', () => {
  const elementById = {
    10: { id: 10, team: 1, web_name: 'Saka', second_name: 'Saka', first_name: 'Bukayo' },
    11: { id: 11, team: 2, web_name: 'Other', second_name: 'Other' },
  };
  assert.equal(matchFplElementId(1, 'Saka', elementById), 10);
  assert.equal(matchFplElementId(1, 'Unknown', elementById), null);
});

test('parseFotmobEventMinute — numeric `time` + overloadTime', () => {
  assert.deepEqual(parseFotmobEventMinute({ time: 45, overloadTime: 2 }), {
    minute: 45,
    stoppage: 2,
  });
  assert.deepEqual(parseFotmobEventMinute({ time: 89 }), {
    minute: 89,
    stoppage: 0,
  });
});

test('parseFotmobEventMinute — stoppage-time string like "90+3\'"', () => {
  assert.deepEqual(parseFotmobEventMinute({ timeStr: "90+3'" }), {
    minute: 90,
    stoppage: 3,
  });
  assert.deepEqual(parseFotmobEventMinute({ timeStr: "45+2'" }), {
    minute: 45,
    stoppage: 2,
  });
  assert.deepEqual(parseFotmobEventMinute({ timeStr: "23'" }), {
    minute: 23,
    stoppage: 0,
  });
});

test('parseFotmobEventMinute — string in `time` field ("90+3")', () => {
  assert.deepEqual(parseFotmobEventMinute({ time: '90+3' }), {
    minute: 90,
    stoppage: 3,
  });
});

test('parseFotmobEventMinute — minute/matchMinute fallbacks', () => {
  assert.deepEqual(parseFotmobEventMinute({ minute: 67 }), {
    minute: 67,
    stoppage: 0,
  });
  assert.deepEqual(parseFotmobEventMinute({ matchMinute: 12 }), {
    minute: 12,
    stoppage: 0,
  });
});

test('parseFotmobEventMinute — unparseable returns null minute (not sorted to kickoff)', () => {
  assert.deepEqual(parseFotmobEventMinute({}), { minute: null, stoppage: 0 });
  assert.deepEqual(parseFotmobEventMinute({ time: null }), {
    minute: null,
    stoppage: 0,
  });
});

test('extractLeagueTeams picks table rows', () => {
  const leagueJson = {
    tables: [
      {
        table: {
          all: [
            { id: 100, shortName: 'TST', name: 'Test United' },
            { id: 101, shortName: 'ABCDEFG', name: 'SkipMe' },
          ],
        },
      },
    ],
  };
  const teams = extractLeagueTeams(leagueJson);
  const ids = new Set(teams.map((t) => t.id));
  assert.ok(ids.has(100));
  assert.ok(!ids.has(101));
});
