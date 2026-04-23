import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLatestDropByElementOut,
  buildOwnerByElementId,
  buildTrackedElementIdSet,
  buildTrackedElementIdSetWithFixtures,
  compareContributionEventsAsc,
  compareContributionEventsDesc,
  contributionApproxTimelineSortKey,
  compareContributionEventsAscWithContext,
  contributionCoverageKey,
  effectiveContributionSortKey,
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
  assert.equal(m.get(7).leagueEntryId, 2);
});

test('diffContributionEvents — bootstrap (no prev): goals/assists/saves/dc vs zero; cards need delta tick', () => {
  const next = {
    12: {
      stats: {
        goals_scored: 2,
        assists: 1,
        saves: 0,
        yellow_cards: 1,
        red_cards: 0,
        minutes: 90,
      },
      explain: [],
    },
    99: {
      stats: { goals_scored: 0, assists: 0, saves: 6, minutes: 90 },
      explain: [],
    },
  };
  const out = diffContributionEvents({
    prevLiveByElementId: null,
    nextLiveByElementId: next,
    elementById: {
      12: { element_type: 3 },
      99: { element_type: 1 },
    },
    trackedElementIds: new Set([12, 99]),
    gameweek: 5,
    nowIso: '2026-01-01T12:00:00.000Z',
  });
  const kinds = new Set(out.map((e) => e.kind));
  assert.ok(kinds.has('goal'));
  assert.ok(kinds.has('assist'));
  assert.ok(!kinds.has('yellow_card'));
  assert.ok(kinds.has('save_points'));
  const saveEv = out.find((e) => e.kind === 'save_points');
  assert.equal(saveEv?.elementId, 99);
  assert.equal(saveEv?.delta, 2);
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

test('contributionApproxTimelineSortKey — explain fixture minutes trump blind stats.minutes', () => {
  const gwFixtures = [
    {
      id: 100,
      team_h: 1,
      team_a: 2,
      kickoff_time: '2026-04-12T14:00:00Z',
    },
  ];
  const el = { id: 5, team: 1 };
  const withExplain = {
    stats: { goals_scored: 1, minutes: 90 },
    explain: [[[{ stat: 'minutes', value: 34 }], 100]],
  };
  const statsOnly = {
    stats: { goals_scored: 1, minutes: 90 },
    explain: [],
  };
  const kExpl = contributionApproxTimelineSortKey(withExplain, el, 'goal', gwFixtures, 5);
  const kAgg = contributionApproxTimelineSortKey(statsOnly, el, 'goal', gwFixtures, 5);
  assert.ok(
    kExpl < kAgg,
    'per-fixture explain minutes align with clock; aggregate 90 would mis-order vs real 34′'
  );
});

test('contributionApproxTimelineSortKey — later emit sequence nudges key (same-minute ties)', () => {
  const gwFixtures = [
    {
      id: 100,
      team_h: 1,
      team_a: 2,
      kickoff_time: '2026-04-12T14:00:00Z',
    },
  ];
  const el = { id: 5, team: 1 };
  const row = {
    stats: { goals_scored: 1, minutes: 60 },
    explain: [],
  };
  const k0 = contributionApproxTimelineSortKey(row, el, 'goal', gwFixtures, 5, 0);
  const k1 = contributionApproxTimelineSortKey(row, el, 'goal', gwFixtures, 5, 1);
  assert.equal(k1 - k0, 4, 'emit sequence nudge stays within one match minute');
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

test('compareContributionEventsAsc — earlier sortKey sorts first (match order)', () => {
  const a = { sortKey: 100, recordedAt: '2026-01-02T00:00:00.000Z', stableId: 'a' };
  const b = { sortKey: 200, recordedAt: '2026-01-01T00:00:00.000Z', stableId: 'b' };
  assert.ok(compareContributionEventsAsc(a, b) < 0, 'earlier timeline key (a) before later (b)');
});

test('effectiveContributionSortKey — recomputes FPL rows from live + fixtures; preserves FotMob/ESPN wall keys', () => {
  const gwFixtures = [
    {
      id: 100,
      team_h: 1,
      team_a: 2,
      kickoff_time: '2026-04-12T14:00:00Z',
    },
  ];
  const elementById = {
    5: { id: 5, team: 1 },
  };
  const liveFullByElementId = {
    5: {
      stats: { goals_scored: 1, minutes: 90 },
      explain: [[[{ stat: 'minutes', value: 45 }], 100]],
    },
  };
  const sortCtx = { liveFullByElementId, elementById, gwFixtures };
  const fplEv = {
    stableId: '8:5:goal:tot1',
    kind: 'goal',
    elementId: 5,
    sortKey: 1,
  };
  const kFpl = effectiveContributionSortKey(fplEv, sortCtx);
  assert.ok(kFpl > 1e12, 'recomputed from kickoff + explain minute');
  const fm = {
    stableId: 'fotmob:9:yellow_card:5:x:1',
    kind: 'yellow_card',
    elementId: 5,
    sortKey: 1.717e12,
  };
  assert.equal(effectiveContributionSortKey(fm, sortCtx), 1.717e12);
  const es = {
    stableId: 'espn:740928:x:goal:1:5',
    kind: 'goal',
    elementId: 5,
    sortKey: 1.8e12,
  };
  assert.equal(effectiveContributionSortKey(es, sortCtx), 1.8e12);
});

test('compareContributionEventsAscWithContext — earlier effective key sorts first (chronological top)', () => {
  const sortCtx = {
    liveFullByElementId: {},
    elementById: {},
    gwFixtures: [],
  };
  const cmp = compareContributionEventsAscWithContext(sortCtx);
  const early = { sortKey: 100, recordedAt: '2026-01-01T12:00:00.000Z', stableId: 'a' };
  const late = { sortKey: 200, recordedAt: '2026-01-01T12:00:00.000Z', stableId: 'b' };
  assert.ok(cmp(early, late) < 0, 'lower key first');
});

test('compareContributionEventsDesc — later sortKey sorts first (newest at top of feed)', () => {
  const a = { sortKey: 100, recordedAt: '2026-01-02T00:00:00.000Z', stableId: 'a' };
  const b = { sortKey: 200, recordedAt: '2026-01-01T00:00:00.000Z', stableId: 'b' };
  assert.ok(compareContributionEventsDesc(b, a) < 0, 'later timeline key (b) before earlier (a) in feed');
});

test('diffContributionEvents — omitByElementKind skips covered (element, kind, fixture) only', () => {
  const prev = {
    12: {
      stats: { goals_scored: 0, assists: 0, saves: 0, minutes: 45 },
      explain: [],
    },
    15: {
      stats: { goals_scored: 0, assists: 0, saves: 0, minutes: 45 },
      explain: [],
    },
  };
  const next = {
    12: {
      stats: { goals_scored: 1, assists: 0, saves: 0, minutes: 90 },
      explain: [],
    },
    15: {
      stats: { goals_scored: 1, assists: 1, saves: 0, minutes: 90 },
      explain: [],
    },
  };
  const out = diffContributionEvents({
    prevLiveByElementId: prev,
    nextLiveByElementId: next,
    elementById: { 12: { element_type: 3 }, 15: { element_type: 3 } },
    trackedElementIds: new Set([12, 15]),
    gameweek: 8,
    nowIso: '2026-01-01T12:00:00.000Z',
    omitByElementKind: new Set([contributionCoverageKey(12, 'goal', null)]),
  });
  const byKey = out.map((e) => `${e.elementId}:${e.kind}`).sort();
  assert.deepEqual(byKey, ['15:assist', '15:goal']);
});

test('diffContributionEvents — FPL assist still emits if ESPN only covered a different fixture', () => {
  const gwFixtures = [
    { id: 100, team_h: 5, team_a: 6, kickoff_time: '2026-04-10T12:00:00Z' },
  ];
  const prev = {
    20: {
      stats: { goals_scored: 0, assists: 0, saves: 0, minutes: 0 },
      explain: [[[{ stat: 'minutes', value: 90 }], 100]],
    },
  };
  const next = {
    20: {
      stats: { goals_scored: 0, assists: 1, saves: 0, minutes: 90 },
      explain: [[[{ stat: 'minutes', value: 90 }], 100]],
    },
  };
  const out = diffContributionEvents({
    prevLiveByElementId: prev,
    nextLiveByElementId: next,
    elementById: { 20: { element_type: 2, team: 5 } },
    trackedElementIds: new Set([20]),
    gameweek: 8,
    nowIso: '2026-01-01T12:00:00.000Z',
    gwFixtures,
    omitByElementKind: new Set([contributionCoverageKey(20, 'assist', 999)]),
  });
  const assistEv = out.find((e) => e.kind === 'assist');
  assert.ok(assistEv, 'omit key was wrong fixture; assist in fixture 100 should still emit');
  assert.equal(assistEv.fplFixtureId, 100);
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
