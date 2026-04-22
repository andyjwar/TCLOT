import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScore, parseEvents, parseLineups } from './fotmobPremWindow.js';

test('parseScore picks header.teams scores + statusText + liveMinute', () => {
  const mj = {
    general: {
      matchTimeUTCDate: '2026-04-22T14:30:00.000Z',
      started: true,
      finished: false,
    },
    header: {
      teams: [{ score: 2 }, { score: 1 }],
      status: {
        started: true,
        finished: false,
        reason: { short: 'HT' },
        liveTime: { short: "45+2'" },
      },
    },
  };
  const s = parseScore(mj);
  assert.equal(s.homeScore, 2);
  assert.equal(s.awayScore, 1);
  assert.equal(s.started, true);
  assert.equal(s.finished, false);
  assert.equal(s.statusText, 'HT');
  assert.equal(s.liveMinute, "45+2'");
  assert.equal(s.kickoffIso, '2026-04-22T14:30:00.000Z');
});

test('parseScore falls back to general.homeTeam / awayTeam score', () => {
  const mj = {
    general: {
      homeTeam: { score: 0 },
      awayTeam: { score: 3 },
    },
  };
  const s = parseScore(mj);
  assert.equal(s.homeScore, 0);
  assert.equal(s.awayScore, 3);
});

test('parseEvents normalizes goals, yellow cards, red cards, and attaches assist rows', () => {
  const mj = {
    content: {
      matchFacts: {
        events: {
          events: [
            {
              type: 'Goal',
              time: 23,
              isHome: true,
              player: { name: 'Saka' },
              nameStr: 'Goal! Assisted by Rice.',
              eventId: 100,
            },
            {
              type: 'Card',
              card: 'Yellow',
              time: 45,
              isHome: false,
              player: { name: 'Pedro' },
              eventId: 101,
            },
            {
              type: 'Card',
              card: 'Red',
              time: 67,
              isHome: false,
              player: { name: 'Doku' },
              eventId: 102,
            },
            {
              type: 'Goal',
              timeStr: "90+3'",
              isHome: true,
              player: { name: 'Ødegaard' },
              nameStr: 'Goal',
              eventId: 103,
            },
          ],
        },
      },
    },
  };
  const ev = parseEvents(mj);
  assert.equal(ev.length, 5);

  const goal1 = ev[0];
  assert.equal(goal1.kind, 'goal');
  assert.equal(goal1.teamSide, 'home');
  assert.equal(goal1.playerName, 'Saka');
  assert.equal(goal1.minuteLabel, "23'");

  const assist1 = ev[1];
  assert.equal(assist1.kind, 'assist');
  assert.equal(assist1.playerName, 'Rice');
  assert.equal(assist1.minuteLabel, "23'");

  assert.equal(ev[2].kind, 'yellow_card');
  assert.equal(ev[2].playerName, 'Pedro');
  assert.equal(ev[3].kind, 'red_card');
  assert.equal(ev[3].playerName, 'Doku');

  assert.equal(ev[4].kind, 'goal');
  assert.equal(ev[4].playerName, 'Ødegaard');
  assert.equal(ev[4].minuteLabel, "90+3'");
});

test('parseEvents sorts by minute regardless of source order', () => {
  const mj = {
    content: {
      matchFacts: {
        events: [
          { type: 'Goal', time: 80, isHome: true, player: { name: 'Z' }, eventId: 2 },
          { type: 'Goal', time: 10, isHome: false, player: { name: 'A' }, eventId: 1 },
        ],
      },
    },
  };
  const ev = parseEvents(mj);
  assert.equal(ev[0].playerName, 'A');
  assert.equal(ev[1].playerName, 'Z');
});

test('parseLineups returns null when no lineup node present', () => {
  assert.equal(parseLineups({}), null);
  assert.equal(parseLineups({ content: {} }), null);
});

test('parseLineups — confirmed XI + bench, formation-matrix shape', () => {
  /**
   * Minimal but realistic shape: `content.lineup.lineup[]` has two team nodes; each `.lineup`
   * is an array of rows of players.
   */
  const mk = (teamId, confirmed, starters) => ({
    teamId,
    lineupConfirmed: confirmed,
    formation: '4-3-3',
    coach: [{ name: 'Manager ' + teamId }],
    lineup: [
      starters.slice(0, 1), // GK row
      starters.slice(1, 5), // DEF row
      starters.slice(5, 8), // MID row
      starters.slice(8, 11), // FWD row
    ],
    bench: [
      { id: 900 + teamId, name: 'Sub A', shirt: 12 },
      { id: 901 + teamId, name: 'Sub B', shirt: 13 },
    ],
  });
  const makePlayer = (id, name, shirt) => ({ id, name, shirt, usualPosition: 'ST' });
  const homeXI = Array.from({ length: 11 }, (_, i) =>
    makePlayer(1000 + i, `Home ${i}`, i + 1),
  );
  const awayXI = Array.from({ length: 11 }, (_, i) =>
    makePlayer(2000 + i, `Away ${i}`, i + 1),
  );

  const mj = {
    content: {
      lineup: {
        lineup: [mk(8456, true, homeXI), mk(9879, true, awayXI)],
      },
    },
  };

  const out = parseLineups(mj, { homeFotmobId: 8456, awayFotmobId: 9879 });
  assert.ok(out);
  assert.equal(out.home.teamId, 8456);
  assert.equal(out.away.teamId, 9879);
  assert.equal(out.home.confirmed, true);
  assert.equal(out.home.formation, '4-3-3');
  assert.equal(out.home.coach, 'Manager 8456');
  assert.equal(out.home.xi.length, 11);
  assert.equal(out.home.xi[0].name, 'Home 0');
  assert.equal(out.home.xi[0].shirt, 1);
  assert.equal(out.home.xi[0].fotmobPlayerId, 1000);
  assert.equal(out.home.bench.length, 2);
  assert.equal(out.away.xi.length, 11);
});

test('parseLineups swaps home/away when FotMob returns them in reverse', () => {
  const mk = (teamId, confirmed) => ({
    teamId,
    lineupConfirmed: confirmed,
    lineup: [[{ id: teamId * 10, name: 'Player ' + teamId, shirt: 1 }]],
    bench: [],
  });
  const mj = {
    content: {
      lineup: {
        lineup: [mk(9999, true), mk(1111, true)],
      },
    },
  };
  const out = parseLineups(mj, { homeFotmobId: 1111, awayFotmobId: 9999 });
  assert.equal(out.home.teamId, 1111);
  assert.equal(out.away.teamId, 9999);
});

test('parseLineups surfaces lineupConfirmed=false so callers can gate display', () => {
  const mk = (teamId) => ({
    teamId,
    lineupConfirmed: false,
    lineup: [[{ id: 1, name: 'Stale', shirt: 1 }]],
    bench: [],
  });
  const mj = { content: { lineup: { lineup: [mk(1), mk(2)] } } };
  const out = parseLineups(mj);
  assert.equal(out.home.confirmed, false);
  assert.equal(out.away.confirmed, false);
});
