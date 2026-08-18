import assert from 'node:assert/strict'
import test from 'node:test'
import { gameWeekNumberWords, gameWeekSpokenLabel } from './gwLabel.js'

test('gameWeekSpokenLabel spells out GW 1 as Game Week One', () => {
  assert.equal(gameWeekSpokenLabel(1), 'Game Week One')
  assert.equal(gameWeekNumberWords(1), 'One')
})

test('gameWeekSpokenLabel covers teens, tens, and hyphenated compounds', () => {
  assert.equal(gameWeekSpokenLabel(12), 'Game Week Twelve')
  assert.equal(gameWeekSpokenLabel(20), 'Game Week Twenty')
  assert.equal(gameWeekSpokenLabel(21), 'Game Week Twenty-One')
  assert.equal(gameWeekSpokenLabel(38), 'Game Week Thirty-Eight')
})

test('gameWeekSpokenLabel falls back when the number is missing', () => {
  assert.equal(gameWeekSpokenLabel(null), 'Game Week')
  assert.equal(gameWeekSpokenLabel('nope'), 'Game Week')
})
