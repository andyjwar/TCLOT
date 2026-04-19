import test from 'node:test';
import assert from 'node:assert/strict';
import { countElementGamesLeftToPlay } from './fplBonusFromBps.js';

const TEAM = 14;

function fx(id, th, ta, opts = {}) {
  return {
    id,
    team_h: th,
    team_a: ta,
    event: 34,
    finished_provisional: opts.finished_provisional ?? false,
    finished: opts.finished ?? false,
  };
}

test('countElementGamesLeftToPlay — empty fixture list, 0 minutes → 1 slot', () => {
  assert.equal(countElementGamesLeftToPlay({ team: TEAM }, null, [], TEAM, 0), 1);
});

test('countElementGamesLeftToPlay — DGW both unfinished, 0 minutes → 2', () => {
  const gw = [
    fx(101, TEAM, 1, { finished_provisional: false }),
    fx(102, 2, TEAM, { finished_provisional: false }),
  ];
  assert.equal(
    countElementGamesLeftToPlay({ team: TEAM }, null, gw, TEAM, 0),
    2
  );
});

test('countElementGamesLeftToPlay — DGW one done one left, 0 minutes → 1', () => {
  const gw = [
    fx(101, TEAM, 1, { finished_provisional: true }),
    fx(102, 2, TEAM, { finished_provisional: false }),
  ];
  assert.equal(
    countElementGamesLeftToPlay({ team: TEAM }, null, gw, TEAM, 0),
    1
  );
});

test('countElementGamesLeftToPlay — DGW first done, minutes from explain on fx1, second open → 1', () => {
  const gw = [
    fx(201, TEAM, 3, { finished_provisional: true }),
    fx(202, 4, TEAM, { finished_provisional: false }),
  ];
  const liveRow = {
    explain: [[[{ stat: 'minutes', value: 90 }], 201]],
    stats: { minutes: 90 },
  };
  assert.equal(
    countElementGamesLeftToPlay({ team: TEAM }, liveRow, gw, TEAM, 90),
    1
  );
});

test('countElementGamesLeftToPlay — DGW first done, 90 mins, no explain → 1 remaining', () => {
  const gw = [
    fx(301, TEAM, 3, { finished_provisional: true }),
    fx(302, 4, TEAM, { finished_provisional: false }),
  ];
  const liveRow = { stats: { minutes: 90 }, explain: [] };
  assert.equal(
    countElementGamesLeftToPlay({ team: TEAM }, liveRow, gw, TEAM, 90),
    1
  );
});

test('countElementGamesLeftToPlay — SGW in progress, minutes, no explain → 0', () => {
  const gw = [fx(401, TEAM, 5, { finished_provisional: false })];
  const liveRow = { stats: { minutes: 67 }, explain: [] };
  assert.equal(
    countElementGamesLeftToPlay({ team: TEAM }, liveRow, gw, TEAM, 67),
    0
  );
});

test('countElementGamesLeftToPlay — DGW both unfinished, minutes only in first explain → 1', () => {
  const gw = [
    fx(501, TEAM, 6, { finished_provisional: false }),
    fx(502, 7, TEAM, { finished_provisional: false }),
  ];
  const liveRow = {
    explain: [[[{ stat: 'minutes', value: 45 }], 501]],
    stats: { minutes: 45 },
  };
  assert.equal(
    countElementGamesLeftToPlay({ team: TEAM }, liveRow, gw, TEAM, 45),
    1
  );
});
