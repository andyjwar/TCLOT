import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLatestDropByElementOut,
  buildOwnerByElementId,
  buildTrackedElementIdSet,
  buildTrackedElementIdSetWithFixtures,
  compareContributionEventsDesc,
  contributionApproxTimelineSortKey,
  diffContributionEvents,
  elementIdsFromGwFixtureTeams,
  saveFantasyPointsFromSaves,
} from './playerContributionEvents.js';

test('saveFantasyPointsFromSaves — only GKP, 1 pt per 3 saves', () => {
  assert.equal(saveFantasyPointsFromSaves(0, 1), 0);
  assert.equal(saveFantasyPointsFromSaves(2, 1), 0);
  assert.equal(saveFantasyPointsFromSaves(3, 1), 1);
  assert.equal(saveFantasyPointsFromSaves(6, 1), 2);
  assert.equal(saveFantasyPointsFromSaves(9, 2), 0);
});

test('elementIdsFromGwFixtureTeams picks players on teams in GW', () => {
  const elementById = {
    1: { id: 1, team: 10 },
    2: { id: 2, team: 99 },
  };
  const s = elementIdsFromGwFixtureTeams(elementById, [10]);
  assert.deepEqual([...s], [1]);
});

test('buildTrackedElementIdSetWithFixtures includes fixture-team players', () => {
  const squads = [
    {
      leagueEntryId: 1,
      teamName: 'A',
      starters: [{ element: 5 }],
      bench: [],
    },
  ];
  const elementById = {
    5: { id: 5, team: 1 },
    9: { id: 9, team: 2 },
  };
  const s = buildTrackedElementIdSetWithFixtures(squads, [], elementById, [2]);
  assert.ok(s.has(5));
  assert.ok(s.has(9));
});

test('buildTrackedElementIdSet unions squads and waiver drops', () => {
  const squads = [
    {
      leagueEntryId: 1,
      teamName: 'A',
      starters: [{ element: 10 }],
      bench: [{ element: 20 }],
    },
  ];
  const waivers = [{ element_out: 99, entry: 1, gameweek: 5, transactionId: 1 }];
  const s = buildTrackedElementIdSet(squads, waivers);
  assert.deepEqual([...s].sort((a, b) => a - b), [10, 20, 99]);
});

test('buildOwnerByElementId — first squad wins on duplicate', () => {
  const squads = [
    {
      leagueEntryId: 1,
      teamName: 'First',
      starters: [{ element: 5 }],
      bench: [],
    },
    {
      leagueEntryId: 2,
      teamName: 'Second',
      starters: [{ element: 5 }],
      bench: [],
    },
  ];
  const m = buildOwnerByElementId(squads);
  assert.equal(m.get(5).teamName, 'First');
});

test('buildLatestDropByElementOut — highest GW wins', () => {
  const rows = [
    {
      element_out: 7,
      entry: 1,
      gameweek: 10,
      transactionId: 100,
      teamName: 'Old',
    },
    {
      element_out: 7,
      entry: 2,
      gameweek: 12,
      transactionId: 50,
      teamName: 'NewerGW',
    },
  ];
  const m = buildLatestDropByElementOut(rows);
  assert.equal(m.get(7).gameweek, 12);
  assert.equal(m.get(7).teamName, 'NewerGW');
});

test('diffContributionEvents — no prev snapshot → no events', () => {
  const next = {
    12: {
      stats: { goals_scored: 2, assists: 0, saves: 0, minutes: 90 },
      explain: [],
    },
  };
  const out = diffContributionEvents({
    prevLiveByElementId: null,
    nextLiveByElementId: next,
    elementById: { 12: { element_type: 3 } },
    trackedElementIds: new Set([12]),
    gameweek: 5,
    nowIso: '2026-01-01T12:00:00.000Z',
  });
  assert.equal(out.length, 0);
});

test('diffContributionEvents — yellow and red card deltas', () => {
  const prev = {
    5: {
      stats: { yellow_cards: 0, red_cards: 0, minutes: 90 },
      explain: [],
    },
  };
  const next = {
    5: {
      stats: { yellow_cards: 1, red_cards: 1, minutes: 90 },
      explain: [],
    },
  };
  const out = diffContributionEvents({
    prevLiveByElementId: prev,
    nextLiveByElementId: next,
    elementById: { 5: { element_type: 3 } },
    trackedElementIds: new Set([5]),
    gameweek: 3,
    nowIso: '2026-01-01T12:00:00.000Z',
  });
  const kinds = new Set(out.map((e) => e.kind));
  assert.ok(kinds.has('yellow_card'));
  assert.ok(kinds.has('red_card'));
});

test('contributionApproxTimelineSortKey — later kickoff sorts higher', () => {
  const gwFixtures = [
    {
      id: 100,
      team_h: 1,
      team_a: 2,
      kickoff_time: '2026-04-12T14:00:00Z',
      minutes: 45,
    },
    {
      id: 101,
      team_h: 3,
      team_a: 4,
      kickoff_time: '2026-04-12T17:30:00Z',
      minutes: 20,
    },
  ];
  const elEarly = { team: 1 };
  const elLate = { team: 3 };
  const rowEarly = {
    stats: { goals_scored: 1, minutes: 45 },
    explain: [[[{ stat: 'minutes', value: 45 }], 100]],
  };
  const rowLate = {
    stats: { goals_scored: 1, minutes: 20 },
    explain: [[[{ stat: 'minutes', value: 20 }], 101]],
  };
  const kEarly = contributionApproxTimelineSortKey(rowEarly, elEarly, 'goal', gwFixtures);
  const kLate = contributionApproxTimelineSortKey(rowLate, elLate, 'goal', gwFixtures);
  assert.ok(kLate > kEarly, 'later TV window should sort after earlier kickoff + clock');
});

test('compareContributionEventsDesc — prefers sortKey over recordedAt', () => {
  const a = { sortKey: 100, recordedAt: '2026-01-02T00:00:00.000Z', stableId: 'a' };
  const b = { sortKey: 200, recordedAt: '2026-01-01T00:00:00.000Z', stableId: 'b' };
  assert.ok(compareContributionEventsDesc(a, b) > 0, 'b should come before a (higher sortKey first in desc list sort)');
});

test('diffContributionEvents — omitKinds skips goal', () => {
  const prev = {
    12: {
      stats: { goals_scored: 0, assists: 0, saves: 0, minutes: 45 },
      explain: [],
    },
  };
  const next = {
    12: {
      stats: { goals_scored: 1, assists: 0, saves: 0, minutes: 90 },
      explain: [],
    },
  };
  const out = diffContributionEvents({
    prevLiveByElementId: prev,
    nextLiveByElementId: next,
    elementById: { 12: { element_type: 3 } },
    trackedElementIds: new Set([12]),
    gameweek: 8,
    nowIso: '2026-01-01T12:00:00.000Z',
    omitKinds: new Set(['goal']),
  });
  assert.equal(out.length, 0);
});

test('diffContributionEvents — goals and assists deltas', () => {
  const prev = {
    12: {
      stats: { goals_scored: 0, assists: 1, saves: 0, minutes: 45 },
      explain: [],
    },
  };
  const next = {
    12: {
      stats: { goals_scored: 1, assists: 3, saves: 0, minutes: 90 },
      explain: [],
    },
  };
  const out = diffContributionEvents({
    prevLiveByElementId: prev,
    nextLiveByElementId: next,
    elementById: { 12: { element_type: 3 } },
    trackedElementIds: new Set([12]),
    gameweek: 8,
    nowIso: '2026-01-01T12:00:00.000Z',
  });
  const kinds = new Set(out.map((e) => e.kind));
  assert.ok(kinds.has('goal'));
  assert.ok(kinds.has('assist'));
  const goalEv = out.find((e) => e.kind === 'goal');
  assert.equal(goalEv.delta, 1);
  const asEv = out.find((e) => e.kind === 'assist');
  assert.equal(asEv.delta, 2);
});
