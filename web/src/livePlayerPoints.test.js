import test from 'node:test';
import assert from 'node:assert/strict';
import {
  liftScoreFromEvents,
  resolveDisplayedPoints,
  scoreFromPremEvents,
  tallyPremEventsForElement,
} from './livePlayerPoints.js';

const LEE_BRE = {
  fplFixture: { id: 501, team_h: 2, team_a: 4 },
  score: { homeScore: 0, awayScore: 0, statusText: 'Live' },
  events: [
    { kind: 'goal', elementId: 10, teamSide: 'home', isOwnGoal: false },
    { kind: 'assist', elementId: 11, teamSide: 'home' },
    { kind: 'goal', elementId: 20, teamSide: 'away', isOwnGoal: false },
    { kind: 'assist', elementId: 21, teamSide: 'away' },
    { kind: 'yellow', elementId: 22, teamSide: 'away' },
  ],
};

test('scoreFromPremEvents — Leeds 1–1 Brentford from the fixture log', () => {
  assert.deepEqual(scoreFromPremEvents(LEE_BRE.events), {
    homeScore: 1,
    awayScore: 1,
  });
});

test('liftScoreFromEvents — headline 0–0 lifts to event-log 1–1', () => {
  const lifted = liftScoreFromEvents(LEE_BRE.score, LEE_BRE.events);
  assert.equal(lifted.homeScore, 1);
  assert.equal(lifted.awayScore, 1);
});

test('tallyPremEventsForElement — Schade goal + Ajer yellow', () => {
  assert.deepEqual(tallyPremEventsForElement([LEE_BRE], 20), {
    goals: 1,
    assists: 0,
    yellows: 0,
    reds: 0,
    ownGoals: 0,
  });
  assert.deepEqual(tallyPremEventsForElement([LEE_BRE], 22), {
    goals: 0,
    assists: 0,
    yellows: 1,
    reds: 0,
    ownGoals: 0,
  });
});

test('resolveDisplayedPoints — Schade MID: FPL 1 pt, Prem goal → 6', () => {
  const out = resolveDisplayedPoints({
    fpl: { minutes: 9, goals: 0, assists: 0, totalPoints: 1, bonusApi: 0 },
    displayedMinutes: 36,
    elementId: 20,
    elementTypeId: 3,
    teamId: 4,
    premRows: [LEE_BRE],
  });
  assert.equal(out.goalsScored, 1);
  assert.equal(out.total_points, 6);
});

test('resolveDisplayedPoints — Calvert-Lewin FWD: FPL 1 pt, Prem goal → 5', () => {
  const out = resolveDisplayedPoints({
    fpl: { minutes: 9, goals: 0, totalPoints: 1 },
    displayedMinutes: 36,
    elementId: 10,
    elementTypeId: 4,
    teamId: 2,
    premRows: [LEE_BRE],
  });
  assert.equal(out.goalsScored, 1);
  assert.equal(out.total_points, 5);
});

test('resolveDisplayedPoints — Nmecha assist on top of appearance', () => {
  const out = resolveDisplayedPoints({
    fpl: { minutes: 9, assists: 0, totalPoints: 1 },
    displayedMinutes: 36,
    elementId: 11,
    elementTypeId: 3,
    teamId: 2,
    premRows: [LEE_BRE],
  });
  assert.equal(out.assists, 1);
  assert.equal(out.total_points, 4);
});

test('resolveDisplayedPoints — never invents a goal before FPL records minutes', () => {
  const out = resolveDisplayedPoints({
    fpl: { minutes: 0, goals: 0, totalPoints: 0 },
    displayedMinutes: 0,
    elementId: 20,
    elementTypeId: 3,
    teamId: 4,
    premRows: [LEE_BRE],
  });
  assert.equal(out.goalsScored, 0);
  assert.equal(out.total_points, 0);
});

test('resolveDisplayedPoints — never steps backwards from official FPL total', () => {
  const out = resolveDisplayedPoints({
    fpl: { minutes: 90, goals: 1, totalPoints: 13, bonusApi: 3 },
    displayedMinutes: 90,
    elementId: 20,
    elementTypeId: 3,
    teamId: 4,
    premRows: [LEE_BRE],
  });
  assert.equal(out.goalsScored, 1);
  assert.equal(out.total_points, 13);
});

test('resolveDisplayedPoints — 1–1 kills a stale FPL clean sheet', () => {
  const out = resolveDisplayedPoints({
    fpl: {
      minutes: 70,
      cleanSheets: 1,
      goalsConceded: 0,
      totalPoints: 6,
    },
    displayedMinutes: 70,
    elementId: 99,
    elementTypeId: 2,
    teamId: 2,
    premRows: [LEE_BRE],
  });
  assert.equal(out.cleanSheets, 0);
  assert.equal(out.goalsConceded, 1);
});

test('scoreFromPremEvents — own goal credits the other side', () => {
  assert.deepEqual(
    scoreFromPremEvents([
      { kind: 'goal', teamSide: 'home', isOwnGoal: true },
    ]),
    { homeScore: 0, awayScore: 1 },
  );
});
