import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  namedFixtureFor,
  managerFunFact,
  hasManagerLore,
  normManager,
} from './leagueLore.js'

const pick = (arr) => arr[0]

test('namedFixtureFor is order-independent and case/space tolerant', () => {
  assert.equal(namedFixtureFor('Jon Ward', 'Andy Ward'), 'the Battle of Warderloo')
  assert.equal(namedFixtureFor('Andy Ward', 'Jon Ward'), 'the Battle of Warderloo')
  assert.equal(namedFixtureFor('  jon   ward ', 'ANDY WARD'), 'the Battle of Warderloo')
  assert.equal(namedFixtureFor('Luke Butcher', 'David Higman'), 'the East Asian derby')
  assert.equal(namedFixtureFor('Nick Mottershead', 'Nick Goodacre'), 'the Battle of the Nicks')
  assert.equal(namedFixtureFor('Eddy Webster', 'Andy Ward'), 'the Battle of Ontario')
})

test('namedFixtureFor returns null for unknown or missing pairings', () => {
  assert.equal(namedFixtureFor('Jon Ward', 'Luke Butcher'), null)
  assert.equal(namedFixtureFor('Jon Ward', null), null)
  assert.equal(namedFixtureFor(null, undefined), null)
})

test('managerFunFact returns lore for known managers, null otherwise', () => {
  assert.match(managerFunFact('Nick Mottershead', pick, 'k'), /vegan|tofu|plant|oat milk/i)
  assert.match(managerFunFact('Mike Sutton', pick, 'k'), /twins/i)
  assert.match(managerFunFact('Luke Butcher', pick, 'k'), /Boxhead/)
  assert.equal(managerFunFact('Andy Ward', pick, 'k'), null)
  assert.equal(managerFunFact(null, pick, 'k'), null)
})

test('hasManagerLore / normManager', () => {
  assert.equal(hasManagerLore('Mike Sutton'), true)
  assert.equal(hasManagerLore('Andy Ward'), false)
  assert.equal(normManager('  Jon   Ward '), 'jon ward')
})
