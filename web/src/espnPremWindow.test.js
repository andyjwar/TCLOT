import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseEspnScoreForFplFixture,
  parseEspnKeyEventsForPrem,
} from './espnPremWindow.js';

const espnToFpl = new Map([
  [368, 11], // FPL h
  [331, 6], // FPL a
]);
const fplFixture = { team_h: 11, team_a: 6 };

test('parseEspnScoreForFplFixture — maps scores to FPL home/away', () => {
  const summary = {
    header: {
      competitions: [
        {
          id: '740611',
          date: '2025-08-24T13:00Z',
          status: {
            type: {
              name: 'STATUS_FULL_TIME',
              state: 'post',
              completed: true,
              shortDetail: 'FT',
            },
          },
          competitors: [
            { homeAway: 'home', team: { id: '368' }, score: '2' },
            { homeAway: 'away', team: { id: '331' }, score: '0' },
          ],
        },
      ],
    },
  };
  const s = parseEspnScoreForFplFixture(summary, fplFixture, espnToFpl);
  assert.equal(s?.homeScore, 2);
  assert.equal(s?.awayScore, 0);
  assert.equal(s?.finished, true);
});

test('parseEspnKeyEventsForPrem — goal + assist from keyEvents', () => {
  const summary = {
    keyEvents: [
      {
        id: '1',
        type: { type: 'goal' },
        team: { id: '368' },
        clock: { value: 1380, displayValue: "23'" },
        wallclock: '2025-08-24T13:23:00Z',
        text: 'Goal x',
        shortText: 'Goal x',
        participants: [
          { athlete: { displayName: 'A Player' } },
          { athlete: { displayName: 'B Assist' } },
        ],
      },
    ],
  };
  const ev = parseEspnKeyEventsForPrem(summary, fplFixture, espnToFpl);
  assert.equal(ev.length, 2);
  assert.equal(ev[0].kind, 'goal');
  assert.equal(ev[0].playerName, 'A Player');
  assert.equal(ev[1].kind, 'assist');
  assert.equal(ev[1].playerName, 'B Assist');
  assert.equal(ev[0].teamSide, 'home');
});
