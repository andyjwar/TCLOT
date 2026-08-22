import test from 'node:test';
import assert from 'node:assert/strict';
import { findChampionFixture } from './championOfRecord.js';

test('findChampionFixture', async (t) => {
  // 2026/27 GW1 shape: Brampton Balrogs (44904) host Rokesly Regorasu (6849).
  const gw1Matches = [
    { league_entry_1: 18279, league_entry_2: 4259 },
    { league_entry_1: 30728, league_entry_2: 10173 },
    { league_entry_1: 44904, league_entry_2: 6849 },
    { league_entry_1: 4898, league_entry_2: 5220 },
  ];

  await t.test('finds the champion on the away side', () => {
    assert.deepEqual(findChampionFixture(gw1Matches, 6849), {
      championLeagueEntryId: 6849,
      opponentLeagueEntryId: 44904,
      championIsHome: false,
    });
  });

  await t.test('finds the champion on the home side', () => {
    assert.deepEqual(findChampionFixture(gw1Matches, 44904), {
      championLeagueEntryId: 44904,
      opponentLeagueEntryId: 6849,
      championIsHome: true,
    });
  });

  await t.test('returns null when the champion id is not in any match', () => {
    // The stale 2025/26 id — the exact failure mode this guards against.
    assert.equal(findChampionFixture(gw1Matches, 27370), null);
    assert.equal(findChampionFixture([], 6849), null);
    assert.equal(findChampionFixture(null, 6849), null);
  });
});
