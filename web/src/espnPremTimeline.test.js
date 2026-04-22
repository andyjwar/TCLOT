import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectDayMatches,
  mapEspnTeamsToFpl,
  matchFplElementId,
  fetchEspnContributionTimeline,
} from './espnPremTimeline.js';

test('collectDayMatches — picks home/away ids, dedupes repeats', () => {
  const sb = {
    events: [
      {
        id: '740928',
        competitions: [
          {
            competitors: [
              { homeAway: 'home', team: { id: '331', abbreviation: 'BHA' } },
              { homeAway: 'away', team: { id: '363', abbreviation: 'CHE' } },
            ],
          },
        ],
      },
      // Duplicate — should be ignored
      {
        id: '740928',
        competitions: [
          { competitors: [
            { homeAway: 'home', team: { id: '331' } },
            { homeAway: 'away', team: { id: '363' } },
          ] },
        ],
      },
    ],
  };
  const rows = collectDayMatches(sb);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].eventId, 740928);
  assert.equal(rows[0].homeId, 331);
  assert.equal(rows[0].awayId, 363);
  assert.equal(rows[0].homeAbbr, 'BHA');
  assert.equal(rows[0].awayAbbr, 'CHE');
});

test('collectDayMatches — ignores malformed events', () => {
  const sb = {
    events: [
      { id: 'abc' }, // non-numeric id
      { id: 1, competitions: [{ competitors: [{ homeAway: 'home', team: { id: 2 } }] }] }, // 1 competitor
      null,
    ],
  };
  assert.deepEqual(collectDayMatches(sb), []);
  assert.deepEqual(collectDayMatches(null), []);
  assert.deepEqual(collectDayMatches({}), []);
});

test('mapEspnTeamsToFpl — direct abbreviation match', () => {
  const teamById = {
    1: { short_name: 'ARS' },
    6: { short_name: 'BHA' },
    7: { short_name: 'CHE' },
  };
  const espnTeams = [
    { id: 359, abbreviation: 'ARS' },
    { id: 331, abbreviation: 'BHA' },
    { id: 363, abbreviation: 'CHE' },
  ];
  const m = mapEspnTeamsToFpl(teamById, espnTeams);
  assert.equal(m.get(359), 1);
  assert.equal(m.get(331), 6);
  assert.equal(m.get(363), 7);
});

test('mapEspnTeamsToFpl — Manchester abbreviation aliases (MNC→MCI, MAN→MUN)', () => {
  const teamById = {
    13: { short_name: 'MCI' },
    14: { short_name: 'MUN' },
  };
  const espnTeams = [
    { id: 382, abbreviation: 'MNC' },
    { id: 360, abbreviation: 'MAN' },
  ];
  const m = mapEspnTeamsToFpl(teamById, espnTeams);
  assert.equal(m.get(382), 13);
  assert.equal(m.get(360), 14);
});

test('matchFplElementId — full name matches FPL first + second', () => {
  const elementById = {
    321: { id: 321, team: 6, first_name: 'Ferdi', second_name: 'Kadıoğlu', web_name: 'F.Kadıoğlu' },
    322: { id: 322, team: 6, first_name: 'Jack', second_name: 'Hinshelwood', web_name: 'Hinshelwood' },
    400: { id: 400, team: 7, first_name: 'Wesley', second_name: 'Fofana', web_name: 'Fofana' },
  };
  // Diacritics-insensitive match on full name
  assert.equal(matchFplElementId(6, 'Ferdi Kadioglu', elementById), 321);
  // Full-name exact
  assert.equal(matchFplElementId(6, 'Jack Hinshelwood', elementById), 322);
  // Team-scoped — a same-name on a different team shouldn't be confused
  assert.equal(matchFplElementId(7, 'Wesley Fofana', elementById), 400);
});

test('matchFplElementId — returns null for ambiguous or unknown', () => {
  const elementById = {
    1: { id: 1, team: 5, first_name: 'John', second_name: 'Smith', web_name: 'Smith' },
    2: { id: 2, team: 5, first_name: 'James', second_name: 'Smith', web_name: 'J.Smith' },
  };
  assert.equal(matchFplElementId(5, 'Smith', elementById), null); // ambiguous
  assert.equal(matchFplElementId(5, 'Unknown Player', elementById), null);
});

test('matchFplElementId — rejects wrong team', () => {
  const elementById = {
    10: { id: 10, team: 1, first_name: 'Bukayo', second_name: 'Saka', web_name: 'Saka' },
  };
  assert.equal(matchFplElementId(2, 'Bukayo Saka', elementById), null);
});

test('fetchEspnContributionTimeline — mocks end-to-end: BHA goal + assist + Chelsea yellow', async () => {
  const origFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).includes('scoreboard?dates=20260421')) {
      return {
        ok: true,
        json: async () => ({
          events: [{
            id: '740928',
            competitions: [{
              competitors: [
                { homeAway: 'home', team: { id: '331', abbreviation: 'BHA' } },
                { homeAway: 'away', team: { id: '363', abbreviation: 'CHE' } },
              ],
            }],
          }],
        }),
      };
    }
    if (String(url).includes('summary?event=740928')) {
      return {
        ok: true,
        json: async () => ({
          keyEvents: [
            {
              id: '47513214',
              type: { type: 'goal' },
              team: { id: '331' },
              wallclock: '2026-04-21T19:03:34Z',
              participants: [
                { athlete: { id: '238318', displayName: 'Ferdi Kadioglu' } },
              ],
            },
            {
              id: '47514794',
              type: { type: 'goal' },
              team: { id: '331' },
              wallclock: '2026-04-21T20:13:43Z',
              participants: [
                { athlete: { id: '328011', displayName: 'Jack Hinshelwood' } },
                { athlete: { id: '278061', displayName: 'Georginio Rutter' } },
              ],
            },
            {
              id: '47514107',
              type: { type: 'yellow-card' },
              team: { id: '363' },
              wallclock: '2026-04-21T19:45:12Z',
              participants: [
                { athlete: { id: '777', displayName: 'Wesley Fofana' } },
              ],
            },
            // Substitution — should be ignored
            {
              id: '47514452',
              type: { type: 'substitution' },
              team: { id: '363' },
              wallclock: '2026-04-21T20:00:00Z',
              participants: [{ athlete: { displayName: 'Alejandro Garnacho' } }],
            },
          ],
        }),
      };
    }
    throw new Error(`unexpected url: ${url}`);
  };

  try {
    const teamById = {
      6: { short_name: 'BHA' },
      7: { short_name: 'CHE' },
    };
    const elementById = {
      321: { id: 321, team: 6, first_name: 'Ferdi', second_name: 'Kadıoğlu', web_name: 'F.Kadıoğlu' },
      322: { id: 322, team: 6, first_name: 'Jack', second_name: 'Hinshelwood', web_name: 'Hinshelwood' },
      323: { id: 323, team: 6, first_name: 'Georginio', second_name: 'Rutter', web_name: 'Georginio' },
      400: { id: 400, team: 7, first_name: 'Wesley', second_name: 'Fofana', web_name: 'Fofana' },
    };
    const events = await fetchEspnContributionTimeline({
      gameweek: 33,
      gwFixtures: [
        { team_h: 6, team_a: 7, kickoff_time: '2026-04-21T19:00:00Z', id: 333 },
      ],
      elementById,
      teamById,
      trackedElementIds: new Set([321, 322, 323, 400]),
    });

    // Expect 4 events: 2 goals, 1 assist, 1 yellow (substitution ignored)
    assert.equal(events.length, 4);
    const kinds = events.map((e) => e.kind).sort();
    assert.deepEqual(kinds, ['assist', 'goal', 'goal', 'yellow_card']);

    const welbeckish = events.find((e) => e.elementId === 322);
    assert.ok(welbeckish);
    assert.equal(welbeckish.kind, 'goal');
    assert.equal(welbeckish.gameweek, 33);
    assert.equal(welbeckish.source, 'espn');
    assert.ok(welbeckish.stableId.startsWith('espn:740928:'));

    // Rutter's assist should come 1ms after Hinshelwood's goal
    const rutterAssist = events.find(
      (e) => e.elementId === 323 && e.kind === 'assist'
    );
    assert.ok(rutterAssist);
    assert.equal(rutterAssist.sortKey, welbeckish.sortKey + 1);

    // Descending sort: latest wallclock first (Hinshelwood 20:13 > Fofana 19:45 > Kadioglu 19:03)
    assert.ok(events[0].sortKey >= events[events.length - 1].sortKey);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('fetchEspnContributionTimeline — drops events for untracked players', async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes('scoreboard?dates=20260421')) {
      return {
        ok: true,
        json: async () => ({
          events: [{
            id: '740928',
            competitions: [{
              competitors: [
                { homeAway: 'home', team: { id: '331', abbreviation: 'BHA' } },
                { homeAway: 'away', team: { id: '363', abbreviation: 'CHE' } },
              ],
            }],
          }],
        }),
      };
    }
    if (String(url).includes('summary?event=740928')) {
      return {
        ok: true,
        json: async () => ({
          keyEvents: [
            {
              id: 'e1',
              type: { type: 'goal' },
              team: { id: '331' },
              wallclock: '2026-04-21T19:03:34Z',
              participants: [{ athlete: { displayName: 'Ferdi Kadioglu' } }],
            },
          ],
        }),
      };
    }
    throw new Error(`unexpected ${url}`);
  };
  try {
    const events = await fetchEspnContributionTimeline({
      gameweek: 33,
      gwFixtures: [
        { team_h: 6, team_a: 7, kickoff_time: '2026-04-21T19:00:00Z', id: 333 },
      ],
      elementById: {
        321: { id: 321, team: 6, first_name: 'Ferdi', second_name: 'Kadıoğlu', web_name: 'F.Kadıoğlu' },
      },
      teamById: { 6: { short_name: 'BHA' }, 7: { short_name: 'CHE' } },
      trackedElementIds: new Set(), // empty — nobody tracked
    });
    assert.equal(events.length, 0);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('fetchEspnContributionTimeline — returns [] when scoreboard fetch fails', async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({}),
  });
  try {
    const events = await fetchEspnContributionTimeline({
      gameweek: 33,
      gwFixtures: [
        { team_h: 6, team_a: 7, kickoff_time: '2026-04-21T19:00:00Z', id: 333 },
      ],
      elementById: {},
      teamById: { 6: { short_name: 'BHA' }, 7: { short_name: 'CHE' } },
      trackedElementIds: new Set([321]),
    });
    assert.deepEqual(events, []);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('fetchEspnContributionTimeline — empty inputs return []', async () => {
  const a = await fetchEspnContributionTimeline({
    gameweek: NaN,
    gwFixtures: [],
    elementById: {},
    teamById: {},
    trackedElementIds: new Set(),
  });
  assert.deepEqual(a, []);

  const b = await fetchEspnContributionTimeline({
    gameweek: 33,
    gwFixtures: [],
    elementById: {},
    teamById: {},
    trackedElementIds: new Set(),
  });
  assert.deepEqual(b, []);
});
