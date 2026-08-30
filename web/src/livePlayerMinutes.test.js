import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blendLivePlayerMinutes,
  elapsedMatchMinutesFromKickoff,
  fixtureLiveClockMinutes,
  isFixtureInPlay,
  parseLiveClockMinutes,
  resolveDisplayedMinutes,
  retickRowMinutes,
  substitutionStateForElement,
} from './livePlayerMinutes.js';

test('parseLiveClockMinutes — Pulselive and ESPN labels', () => {
  assert.equal(parseLiveClockMinutes("36'00"), 36);
  assert.equal(parseLiveClockMinutes("36'"), 36);
  assert.equal(parseLiveClockMinutes("45+2'00"), 47);
  assert.equal(parseLiveClockMinutes("90+4'"), 94);
  assert.equal(parseLiveClockMinutes('1H 36\''), 36);
  assert.equal(parseLiveClockMinutes('36:00'), 36);
  assert.equal(parseLiveClockMinutes('HT'), 45);
  assert.equal(parseLiveClockMinutes('Half Time'), 45);
  assert.equal(parseLiveClockMinutes('FT'), null);
  assert.equal(parseLiveClockMinutes(''), null);
  assert.equal(parseLiveClockMinutes(null), null);
});

test('fixtureLiveClockMinutes — Prem clock beats stale FPL fixture minutes', () => {
  const prem = { score: { liveMinute: "36'00", statusText: 'Live' } };
  const fx = { minutes: 9, started: true };
  assert.equal(fixtureLiveClockMinutes(prem, fx), 36);
});

test('fixtureLiveClockMinutes — HT status without liveMinute → 45', () => {
  assert.equal(
    fixtureLiveClockMinutes({ score: { liveMinute: null, statusText: 'Half Time' } }, {}),
    45,
  );
});

test('fixtureLiveClockMinutes — falls back to FPL fixture minutes', () => {
  assert.equal(fixtureLiveClockMinutes(null, { minutes: 12 }), 12);
  assert.equal(fixtureLiveClockMinutes({}, { minutes: 0 }), null);
});

test('elapsedMatchMinutesFromKickoff — first half / HT / second half', () => {
  const ko = Date.parse('2026-08-30T13:00:00Z');
  assert.equal(elapsedMatchMinutesFromKickoff('2026-08-30T13:00:00Z', ko + 36 * 60_000), 36);
  assert.equal(elapsedMatchMinutesFromKickoff('2026-08-30T13:00:00Z', ko + 50 * 60_000), 45);
  assert.equal(elapsedMatchMinutesFromKickoff('2026-08-30T13:00:00Z', ko + 75 * 60_000), 60);
  assert.equal(elapsedMatchMinutesFromKickoff('2026-08-30T13:00:00Z', ko - 60_000), null);
  assert.equal(elapsedMatchMinutesFromKickoff('2026-08-30T13:00:00Z', ko + 200 * 60_000), null);
  assert.equal(elapsedMatchMinutesFromKickoff(null, ko), null);
});

test('fixtureLiveClockMinutes — kickoff clock beats stalled FPL 9 (Aaronson)', () => {
  const ko = '2026-08-30T13:00:00Z';
  const now = Date.parse(ko) + 36 * 60_000;
  assert.equal(
    fixtureLiveClockMinutes(null, { minutes: 9, kickoff_time: ko }, now),
    36,
  );
  assert.equal(
    fixtureLiveClockMinutes(
      { score: { liveMinute: "36'00" } },
      { minutes: 9, kickoff_time: ko },
      now,
    ),
    36,
  );
});

test('isFixtureInPlay — kickoff in the past even when FPL started is still false', () => {
  const ko = '2026-08-30T13:00:00Z';
  const now = Date.parse(ko) + 36 * 60_000;
  assert.equal(
    isFixtureInPlay(
      {
        started: false,
        finished: false,
        finished_provisional: false,
        minutes: 9,
        kickoff_time: ko,
      },
      now,
    ),
    true,
  );
  assert.equal(
    isFixtureInPlay(
      {
        started: false,
        finished: false,
        finished_provisional: false,
        minutes: 0,
        kickoff_time: ko,
      },
      now,
    ),
    true,
  );
  assert.equal(
    isFixtureInPlay(
      { started: true, finished: true, finished_provisional: true, minutes: 90 },
      now,
    ),
    false,
  );
});

test('blendLivePlayerMinutes — starter FPL 9 + clock 36 → 36 (the reported bug)', () => {
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 9,
      clockMinutes: 36,
      fixtureLive: true,
      matchdayRole: 'xi',
    }),
    36,
  );
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 7,
      clockMinutes: 36,
      fixtureLive: true,
      matchdayRole: 'xi',
    }),
    36,
  );
});

test('blendLivePlayerMinutes — confirmed XI at FPL 0 lifts to the clock (Shaw / Mbeumo)', () => {
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 0,
      clockMinutes: 36,
      fixtureLive: true,
      matchdayRole: 'xi',
    }),
    36,
  );
});

test('blendLivePlayerMinutes — never invents minutes for unused / unknown players', () => {
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 0,
      clockMinutes: 36,
      fixtureLive: true,
      matchdayRole: 'absent',
    }),
    0,
  );
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 0,
      clockMinutes: 36,
      fixtureLive: true,
      matchdayRole: null,
    }),
    0,
  );
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 0,
      clockMinutes: 36,
      fixtureLive: true,
      matchdayRole: 'bench',
    }),
    0,
  );
});

test('blendLivePlayerMinutes — FPL already banked PTS with 0 minutes still lifts (Shaw 3 PTS)', () => {
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 0,
      clockMinutes: 40,
      fixtureLive: true,
      matchdayRole: null,
      fplHasLiveReturn: true,
    }),
    40,
  );
});

test('blendLivePlayerMinutes — bench ON event at FPL 0 still gets cameo minutes', () => {
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 0,
      clockMinutes: 67,
      fixtureLive: true,
      matchdayRole: 'bench',
      cameOnMinute: 60,
    }),
    7,
  );
});

test('blendLivePlayerMinutes — subbed-off starter keeps FPL minutes', () => {
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 9,
      clockMinutes: 36,
      fixtureLive: true,
      matchdayRole: 'xi',
      subbedOff: true,
    }),
    9,
  );
});

test('blendLivePlayerMinutes — red card keeps FPL minutes', () => {
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 22,
      clockMinutes: 36,
      fixtureLive: true,
      matchdayRole: 'xi',
      redCards: 1,
    }),
    22,
  );
});

test('blendLivePlayerMinutes — bench cameo without ON minute stays on FPL', () => {
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 4,
      clockMinutes: 36,
      fixtureLive: true,
      matchdayRole: 'bench',
    }),
    4,
  );
});

test('blendLivePlayerMinutes — bench with ON at 60 + clock 67 → 7', () => {
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 2,
      clockMinutes: 67,
      fixtureLive: true,
      matchdayRole: 'bench',
      cameOnMinute: 60,
    }),
    7,
  );
});

test('blendLivePlayerMinutes — finished / no clock leaves FPL alone', () => {
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 90,
      clockMinutes: 36,
      fixtureLive: false,
      matchdayRole: 'xi',
    }),
    90,
  );
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 9,
      clockMinutes: null,
      fixtureLive: true,
      matchdayRole: 'xi',
    }),
    9,
  );
});

test('blendLivePlayerMinutes — never steps backwards from official FPL minutes', () => {
  assert.equal(
    blendLivePlayerMinutes({
      fplMinutes: 40,
      clockMinutes: 36,
      fixtureLive: true,
      matchdayRole: 'xi',
    }),
    40,
  );
});

test('substitutionStateForElement — last action wins', () => {
  const prem = {
    substitutions: [
      { elementId: 10, action: 'off', minute: 9 },
      { elementId: 11, action: 'on', minute: 9 },
    ],
  };
  assert.deepEqual(substitutionStateForElement(prem, 10), {
    subbedOff: true,
    cameOnMinute: null,
  });
  assert.deepEqual(substitutionStateForElement(prem, 11), {
    subbedOff: false,
    cameOnMinute: 9,
  });
  assert.deepEqual(substitutionStateForElement(prem, 99), {
    subbedOff: false,
    cameOnMinute: null,
  });
});

function liveFx(id, teamId, minutes = 9) {
  return {
    id,
    team_h: teamId,
    team_a: 99,
    started: true,
    finished: false,
    finished_provisional: false,
    minutes,
  };
}

test('resolveDisplayedMinutes — Aaronson: no Prem clock, FPL started false, kickoff 36 ago', () => {
  const ko = '2026-08-30T13:00:00Z';
  const now = Date.parse(ko) + 36 * 60_000;
  const gw = [
    {
      id: 501,
      team_h: 7,
      team_a: 4,
      started: false,
      finished: false,
      finished_provisional: false,
      minutes: 9,
      kickoff_time: ko,
    },
  ];
  assert.equal(
    resolveDisplayedMinutes({
      fplMinutes: 9,
      teamId: 7,
      elementId: 1,
      gwFixtures: gw,
      premRows: [],
      matchdayRole: 'absent',
      nowMs: now,
    }),
    36,
  );
});

test('retickRowMinutes — advances from stored official FPL minutes', () => {
  const ko = '2026-08-30T13:00:00Z';
  const now = Date.parse(ko) + 40 * 60_000;
  const row = {
    element: 1,
    teamId: 7,
    fplMinutes: 9,
    minutes: 9,
    espnMatchdayRole: 'xi',
    redCards: 0,
  };
  const out = retickRowMinutes(row, {
    gwFixtures: [
      {
        id: 501,
        team_h: 7,
        team_a: 4,
        started: true,
        finished: false,
        finished_provisional: false,
        minutes: 9,
        kickoff_time: ko,
      },
    ],
    premRows: [],
    nowMs: now,
  });
  assert.equal(out.minutes, 40);
  assert.equal(out.fplMinutes, 9);
});

test('resolveDisplayedMinutes — Shaw/Mbeumo: FPL 0 minutes, confirmed XI, clock 40', () => {
  const gw = [liveFx(610, 14, 0)];
  const premRows = [
    {
      fplFixture: { id: 610 },
      score: { liveMinute: "40'00", started: true, finished: false },
      substitutions: [],
    },
  ];
  assert.equal(
    resolveDisplayedMinutes({
      fplMinutes: 0,
      teamId: 14,
      elementId: 233,
      gwFixtures: gw,
      premRows,
      matchdayRole: 'xi',
    }),
    40,
  );
});

test('resolveDisplayedMinutes — screenshot case: Collins/Gomez/Aaronson at 7–9, clock 36', () => {
  const gw = [liveFx(501, 7, 9)];
  const premRows = [
    {
      fplFixture: { id: 501 },
      score: { liveMinute: "36'00", started: true, finished: false },
      substitutions: [],
    },
  ];
  assert.equal(
    resolveDisplayedMinutes({
      fplMinutes: 9,
      teamId: 7,
      elementId: 1,
      gwFixtures: gw,
      premRows,
      matchdayRole: 'xi',
    }),
    36,
  );
  assert.equal(
    resolveDisplayedMinutes({
      fplMinutes: 7,
      teamId: 7,
      elementId: 2,
      gwFixtures: gw,
      premRows,
      matchdayRole: 'xi',
    }),
    36,
  );
});

test('resolveDisplayedMinutes — early sub-off is not lifted to the clock', () => {
  const gw = [liveFx(501, 7, 36)];
  const premRows = [
    {
      fplFixture: { id: 501 },
      score: { liveMinute: "36'00" },
      substitutions: [{ elementId: 8, action: 'off', minute: 9 }],
    },
  ];
  assert.equal(
    resolveDisplayedMinutes({
      fplMinutes: 9,
      teamId: 7,
      elementId: 8,
      gwFixtures: gw,
      premRows,
      matchdayRole: 'xi',
    }),
    9,
  );
});

test('resolveDisplayedMinutes — no live fixture keeps official minutes', () => {
  const gw = [
    {
      id: 1,
      team_h: 7,
      team_a: 2,
      started: true,
      finished: true,
      finished_provisional: true,
      minutes: 90,
    },
  ];
  assert.equal(
    resolveDisplayedMinutes({
      fplMinutes: 90,
      teamId: 7,
      elementId: 1,
      gwFixtures: gw,
      premRows: [],
      matchdayRole: 'xi',
    }),
    90,
  );
});

test('resolveDisplayedMinutes — DGW without explain does not invent a second-match clock', () => {
  const gw = [
    {
      id: 1,
      team_h: 7,
      team_a: 2,
      started: true,
      finished: true,
      finished_provisional: true,
      minutes: 90,
    },
    liveFx(2, 7, 36),
  ];
  const premRows = [
    {
      fplFixture: { id: 2 },
      score: { liveMinute: "36'00" },
      substitutions: [],
    },
  ];
  assert.equal(
    resolveDisplayedMinutes({
      fplMinutes: 90,
      liveFullRow: { stats: { minutes: 90 } },
      teamId: 7,
      elementId: 1,
      gwFixtures: gw,
      premRows,
      matchdayRole: 'xi',
    }),
    90,
  );
});

test('resolveDisplayedMinutes — DGW with explain lifts only the live slice', () => {
  const gw = [
    {
      id: 1,
      team_h: 7,
      team_a: 2,
      started: true,
      finished: true,
      finished_provisional: true,
      minutes: 90,
    },
    liveFx(2, 7, 9),
  ];
  const premRows = [
    {
      fplFixture: { id: 2 },
      score: { liveMinute: "36'00" },
      substitutions: [],
    },
  ];
  const liveFullRow = {
    stats: { minutes: 99 },
    explain: [
      [[{ stat: 'minutes', value: 90 }], 1],
      [[{ stat: 'minutes', value: 9 }], 2],
    ],
  };
  assert.equal(
    resolveDisplayedMinutes({
      fplMinutes: 99,
      liveFullRow,
      teamId: 7,
      elementId: 1,
      gwFixtures: gw,
      premRows,
      matchdayRole: 'xi',
    }),
    126,
  );
});
