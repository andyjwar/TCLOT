import test from 'node:test';
import assert from 'node:assert/strict';
import { firstWord } from './teamNameUtils.js';

test('firstWord — multi-word names collapse to leading token', () => {
  assert.equal(firstWord('Crouch End Oashisu'), 'Crouch');
  assert.equal(firstWord('Hanson of York AFC'), 'Hanson');
  assert.equal(firstWord('Toronto Wiggum'), 'Toronto');
});

test('firstWord — single-word names pass through unchanged', () => {
  assert.equal(firstWord('Brampton'), 'Brampton');
  assert.equal(firstWord('Hackney'), 'Hackney');
});

test('firstWord — null/empty/whitespace inputs return empty string', () => {
  assert.equal(firstWord(null), '');
  assert.equal(firstWord(undefined), '');
  assert.equal(firstWord(''), '');
  assert.equal(firstWord('   '), '');
});

test('firstWord — leading whitespace is trimmed before splitting', () => {
  assert.equal(firstWord('  Toronto Wiggum'), 'Toronto');
  assert.equal(firstWord('\tHanson of York AFC'), 'Hanson');
});

test('firstWord — non-string inputs are coerced via String()', () => {
  assert.equal(firstWord(42), '42');
});

test('firstWord — 2026-27 squads use curated mobile labels', () => {
  assert.equal(firstWord('Atlético Bilbo'), 'Atleti Bilbo');
  assert.equal(firstWord('Toronto Gimli'), 'To. Gimli');
  assert.equal(firstWord('Suffolk Sméagol'), 'Sméagol');
  assert.equal(firstWord('Rokesly Regorasu'), 'Regorasu');
  assert.equal(firstWord('Hackney Rohirrim'), 'Rohirrim');
  assert.equal(firstWord('Mordor S.F.G'), 'MSFG');
  assert.equal(firstWord('Seoul Shire'), 'Seoul Shire');
  assert.equal(firstWord('Brampton Balrogs'), 'Balrogs');
});

test('firstWord — curated labels match on trimmed input', () => {
  assert.equal(firstWord('  Toronto Gimli  '), 'To. Gimli');
});
