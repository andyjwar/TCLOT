import assert from 'node:assert/strict';
import test from 'node:test';
import { fplFixtureId, isValidPulseId } from './fplPulseId.js';
import {
  joinPremWindowRows,
  partitionPremWindowCache,
} from './premWindowRows.js';

test('isValidPulseId rejects FPL placeholders', () => {
  assert.equal(isValidPulseId(125161), true);
  assert.equal(isValidPulseId(0), false);
  assert.equal(isValidPulseId(null), false);
  assert.equal(isValidPulseId(undefined), false);
  assert.equal(isValidPulseId(-3), false);
});

test('joinPremWindowRows keeps one row per FPL fixture when pulse_id is 0', () => {
  const gwFixtures = [
    { id: 1, pulse_id: 0, team_h: 1, team_a: 7 },
    { id: 10, pulse_id: 0, team_h: 10, team_a: 6 },
  ];
  const freshRows = gwFixtures.map((fx) => ({ fplFixture: fx, matchId: null }));
  const joined = joinPremWindowRows(gwFixtures, new Map(), freshRows);
  assert.equal(joined.length, 2);
  assert.equal(joined[0].fplFixture.team_h, 1);
  assert.equal(joined[1].fplFixture.team_h, 10);
});

test('partitionPremWindowCache does not treat pulse_id 0 as a cache hit', () => {
  const cache = new Map([
    [
      0,
      {
        score: { finished: true, homeScore: 0, awayScore: 0 },
        lineups: null,
        events: [],
      },
    ],
  ]);
  const { cachedByFxId, uncachedFixtures } = partitionPremWindowCache(
    [
      { id: 1, pulse_id: 0 },
      { id: 2, pulse_id: 0 },
    ],
    (pid) => cache.get(pid) ?? null,
  );
  assert.equal(cachedByFxId.size, 0);
  assert.equal(uncachedFixtures.length, 2);
});

test('fplFixtureId ignores non-positive ids', () => {
  assert.equal(fplFixtureId({ id: 10 }), 10);
  assert.equal(fplFixtureId({ id: 0 }), null);
});
