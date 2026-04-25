import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEffectiveLineup, projectAutosubFromLive } from './fplAutosubProjection.js';

/**
 * @param {number} pick
 * @param {string} pos
 * @param {number} element
 * @param {number} min
 * @param {object} [opt]
 */
function r(pick, pos, element, min, opt = {}) {
  return {
    element,
    pickPosition: pick,
    posSingular: pos,
    minutes: min,
    clubGwFixturesFinished: opt.clubGwFixturesFinished,
    hasGwFixture: opt.hasGwFixture,
    stillYetToPlayPl: opt.stillYetToPlayPl,
  };
}

test('no GW fixture: bench DEF (not played yet) can replace BGW starter MID; formation stays valid', () => {
  const xi = [
    r(1, 'GKP', 1, 90, { clubGwFixturesFinished: true, hasGwFixture: true }),
    r(2, 'DEF', 2, 90, { hasGwFixture: true }),
    r(3, 'DEF', 3, 90, { hasGwFixture: true }),
    r(4, 'DEF', 4, 90, { hasGwFixture: true }),
    r(5, 'MID', 5, 0, { hasGwFixture: false, clubGwFixturesFinished: false, stillYetToPlayPl: false }),
    r(6, 'MID', 6, 90, { hasGwFixture: true }),
    r(7, 'MID', 7, 90, { hasGwFixture: true }),
    r(8, 'MID', 8, 90, { hasGwFixture: true }),
    r(9, 'FWD', 9, 90, { hasGwFixture: true }),
    r(10, 'FWD', 10, 90, { hasGwFixture: true }),
    r(11, 'FWD', 11, 90, { hasGwFixture: true }),
  ];
  const bench = [
    r(12, 'DEF', 12, 0, {
      hasGwFixture: true,
      stillYetToPlayPl: true,
    }),
    r(13, 'MID', 13, 0, { hasGwFixture: true, stillYetToPlayPl: true }),
  ];
  const { displayStarters, projectedAutoSubs } = projectAutosubFromLive(xi, bench);
  const ids = new Set(displayStarters.map((x) => x.element));
  assert.ok(!ids.has(5), 'BGW mid should be out of XI');
  assert.ok(ids.has(12), 'bench DEF with fixture should come in for BGW mid');
  assert.equal(projectedAutoSubs.length, 1);
  assert.equal(projectedAutoSubs[0].element_out, 5);
  assert.equal(projectedAutoSubs[0].element_in, 12);
});

test('DNP GKP with no reserve GKP: still processes BGW / DNP outfield', () => {
  const xi = [
    r(1, 'GKP', 1, 0, { clubGwFixturesFinished: true, hasGwFixture: true }),
    r(2, 'DEF', 2, 90, { hasGwFixture: true }),
    r(3, 'DEF', 3, 90, { hasGwFixture: true }),
    r(4, 'DEF', 4, 90, { hasGwFixture: true }),
    r(5, 'MID', 5, 0, { hasGwFixture: false, clubGwFixturesFinished: false, stillYetToPlayPl: false }),
    r(6, 'MID', 6, 90, { hasGwFixture: true }),
    r(7, 'MID', 7, 90, { hasGwFixture: true }),
    r(8, 'MID', 8, 90, { hasGwFixture: true }),
    r(9, 'FWD', 9, 90, { hasGwFixture: true }),
    r(10, 'FWD', 10, 90, { hasGwFixture: true }),
    r(11, 'FWD', 11, 90, { hasGwFixture: true }),
  ];
  const bench = [
    r(12, 'DEF', 12, 0, { hasGwFixture: true, stillYetToPlayPl: true }),
  ];
  const { displayStarters, projectedAutoSubs } = projectAutosubFromLive(xi, bench);
  const ids = new Set(displayStarters.map((x) => x.element));
  assert.equal(projectedAutoSubs[0].element_in, 12);
  assert.ok(!ids.has(5));
  assert.ok(ids.has(12));
  assert.ok(ids.has(1), 'GKP with no sub stays when no reserve keeper');
});

test('classic DNP: bench with 0 min and game still to come does not sub in (must have played)', () => {
  const xi = [
    r(1, 'GKP', 1, 0, { clubGwFixturesFinished: true, hasGwFixture: true }),
    r(2, 'DEF', 2, 90, { hasGwFixture: true }),
    r(3, 'DEF', 3, 90, { hasGwFixture: true }),
    r(4, 'DEF', 4, 90, { hasGwFixture: true }),
    r(5, 'MID', 5, 0, { clubGwFixturesFinished: true, hasGwFixture: true }),
    r(6, 'MID', 6, 90, { hasGwFixture: true }),
    r(7, 'MID', 7, 90, { hasGwFixture: true }),
    r(8, 'MID', 8, 90, { hasGwFixture: true }),
    r(9, 'FWD', 9, 90, { hasGwFixture: true }),
    r(10, 'FWD', 10, 90, { hasGwFixture: true }),
    r(11, 'FWD', 11, 90, { hasGwFixture: true }),
  ];
  const bench = [
    r(12, 'DEF', 12, 0, { hasGwFixture: true, stillYetToPlayPl: true }),
  ];
  const { displayStarters, projectedAutoSubs } = projectAutosubFromLive(xi, bench);
  const ids = displayStarters.map((x) => x.element);
  assert.ok(ids.includes(5), 'DNP mid stays until bench has actually played');
  assert.equal(projectedAutoSubs.length, 0);
});

test('no GW fixture GKP: reserve GKP with upcoming fixture can replace first-team GKP', () => {
  const xi = [
    r(1, 'GKP', 1, 0, { hasGwFixture: false, clubGwFixturesFinished: false, stillYetToPlayPl: false }),
    r(2, 'DEF', 2, 90, { hasGwFixture: true }),
    r(3, 'DEF', 3, 90, { hasGwFixture: true }),
    r(4, 'DEF', 4, 90, { hasGwFixture: true }),
    r(5, 'MID', 5, 90, { hasGwFixture: true }),
    r(6, 'MID', 6, 90, { hasGwFixture: true }),
    r(7, 'MID', 7, 90, { hasGwFixture: true }),
    r(8, 'MID', 8, 90, { hasGwFixture: true }),
    r(9, 'FWD', 9, 90, { hasGwFixture: true }),
    r(10, 'FWD', 10, 90, { hasGwFixture: true }),
    r(11, 'FWD', 11, 90, { hasGwFixture: true }),
  ];
  const bench = [
    r(12, 'GKP', 12, 0, { hasGwFixture: true, stillYetToPlayPl: true }),
    r(13, 'DEF', 13, 0, { hasGwFixture: true, stillYetToPlayPl: true }),
  ];
  const { displayStarters, projectedAutoSubs } = projectAutosubFromLive(xi, bench);
  const gk = displayStarters.find((x) => x.posSingular === 'GKP');
  assert.equal(gk?.element, 12);
  assert.equal(projectedAutoSubs[0].element_in, 12);
  assert.equal(projectedAutoSubs[0].element_out, 1);
});

test('official automatic_subs bypasses projection', () => {
  const s = [
    r(1, 'GKP', 101, 90, { hasGwFixture: true }),
    r(2, 'DEF', 102, 0, { clubGwFixturesFinished: true, hasGwFixture: true }),
    r(3, 'DEF', 103, 90, { hasGwFixture: true }),
    r(4, 'DEF', 104, 90, { hasGwFixture: true }),
    r(5, 'MID', 105, 90, { hasGwFixture: true }),
    r(6, 'MID', 106, 90, { hasGwFixture: true }),
    r(7, 'MID', 107, 90, { hasGwFixture: true }),
    r(8, 'MID', 108, 90, { hasGwFixture: true }),
    r(9, 'FWD', 109, 90, { hasGwFixture: true }),
    r(10, 'FWD', 110, 90, { hasGwFixture: true }),
    r(11, 'FWD', 111, 90, { hasGwFixture: true }),
  ];
  const bench = [r(12, 'DEF', 201, 90, { hasGwFixture: true })];
  const out = buildEffectiveLineup({
    starters: s,
    bench,
    autoSubs: [{ element_out: 102, element_in: 201 }],
  });
  assert.equal(out.autosubSource, 'official');
  assert.equal(out.projectedAutoSubs.length, 0);
  const ids = out.displayStarters.map((x) => x.element);
  assert.ok(!ids.includes(102));
  assert.ok(ids.includes(201));
});
