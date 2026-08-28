import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  namedFixtureFor,
  managerFunFact,
  hasManagerLore,
  normManager,
  canonicalManager,
  isTitanicPair,
  loreTagsFromSide,
  matchupPersonalitySentence,
  derbyChipLabel,
  uniqueDerbies,
} from './leagueLore.js'

const pick = (arr) => arr[0]
const variant = () => 0

test('namedFixtureFor is order-independent and case/space tolerant', () => {
  assert.equal(namedFixtureFor('Jon Ward', 'Andy Ward'), 'the Battle of Warderloo')
  assert.equal(namedFixtureFor('Andy Ward', 'Jon Ward'), 'the Battle of Warderloo')
  assert.equal(namedFixtureFor('  jon   ward ', 'ANDY WARD'), 'the Battle of Warderloo')
  assert.equal(namedFixtureFor('John Ward', 'Andrew Ward'), 'the Battle of Warderloo')
  assert.equal(namedFixtureFor('Luke Butcher', 'David Higman'), 'the East Asian Derby')
  assert.equal(namedFixtureFor('Andy Ward', 'Nick Goodacre'), 'the Bad Blood Derby')
  assert.equal(namedFixtureFor('Andrew Ward', 'Nick Goodacre'), 'the Bad Blood Derby')
  assert.equal(namedFixtureFor('David Higman', 'Mike Sutton'), 'the Respect Derby')
})

test('namedFixtureFor returns null for unknown or missing pairings', () => {
  assert.equal(namedFixtureFor('Jon Ward', 'Luke Butcher'), null)
  assert.equal(namedFixtureFor('Nick Mottershead', 'Nick Goodacre'), null)
  assert.equal(namedFixtureFor('Eddy Webster', 'Andy Ward'), null)
  assert.equal(namedFixtureFor('Jon Ward', null), null)
  assert.equal(namedFixtureFor(null, undefined), null)
})

test('canonicalManager maps Eddie/Andrew/John onto site names', () => {
  assert.equal(canonicalManager('Eddie Webster'), 'eddy webster')
  assert.equal(canonicalManager('Andrew Ward'), 'andy ward')
  assert.equal(canonicalManager('John Ward'), 'jon ward')
  assert.equal(canonicalManager('Eddy Webster'), 'eddy webster')
})

test('managerFunFact covers every manager and prefers tagged facts', () => {
  assert.match(managerFunFact('Nick Mottershead', pick, 'k'), /vegan|Titanic|arts school|swagger|big-move|fallen-empire|trade flurry|extremely sure/i)
  assert.match(managerFunFact('Mike Sutton', pick, 'k'), /twins|wildcard|theorised|classified/i)
  assert.match(managerFunFact('Luke Butcher', pick, 'k'), /manifesto|Prime Minister|Samsung|Norfolk|harmony/i)
  assert.match(managerFunFact('Eddie Webster', pick, 'k', ['waiver']), /waiver/i)
  assert.match(managerFunFact('Nick Goodacre', pick, 'k', ['conservative']), /safest|conservative|last/i)
  assert.match(managerFunFact('Andy Ward', pick, 'k'), /comeback|big game|Titanic|battle|Canada/i)
  assert.match(managerFunFact('Jon Ward', pick, 'k', ['last']), /bottom|commentary/i)
  assert.match(managerFunFact('David Higman', pick, 'k'), /BBC|Glastonbury|devil|people's champion/i)
  assert.equal(managerFunFact(null, pick, 'k'), null)
})

test('hasManagerLore / normManager / Titanic pair', () => {
  assert.equal(hasManagerLore('Mike Sutton'), true)
  assert.equal(hasManagerLore('Andy Ward'), true)
  assert.equal(hasManagerLore('Eddie Webster'), true)
  assert.equal(hasManagerLore('Nobody Here'), false)
  assert.equal(normManager('  Jon   Ward '), 'jon ward')
  assert.equal(isTitanicPair('Andy Ward', 'Nick Mottershead'), true)
  assert.equal(isTitanicPair('Andrew Ward', 'Nick Mottershead'), true)
  assert.equal(isTitanicPair('Andy Ward', 'Jon Ward'), false)
})

test('loreTagsFromSide follows waivers, bench calls, and last place', () => {
  assert.deepEqual(loreTagsFromSide({ recentPickups: [{ name: 'Schade' }] }).sort(), ['waiver'])
  assert.ok(loreTagsFromSide({ benchCall: { bench: { name: 'A' } } }).includes('conservative'))
  assert.ok(loreTagsFromSide({ rank: 8, record: { w: 0, d: 0, l: 1 } }).includes('last'))
})

test('matchupPersonalitySentence is gated and deterministic', () => {
  const m = {
    home: { manager: 'Eddy Webster', recentPickups: [{ name: 'X' }] },
    away: { manager: 'Mike Sutton' },
  }
  const a = matchupPersonalitySentence(m, pick, 'k', variant, { gate: 2 })
  const b = matchupPersonalitySentence(m, pick, 'k', variant, { gate: 2 })
  assert.equal(a, b)
  assert.ok(a == null || typeof a === 'string')
})

test('Titanic Duo line can fire when Andy plays Mottershead', () => {
  const m = {
    home: { manager: 'Andy Ward' },
    away: { manager: 'Nick Mottershead' },
  }
  const line = matchupPersonalitySentence(m, pick, 'k', variant, { gate: 2 })
  assert.match(line, /Titanic/)
})

test('derbyChipLabel and uniqueDerbies', () => {
  assert.equal(derbyChipLabel('the Battle of Warderloo'), 'Battle of Warderloo')
  assert.equal(derbyChipLabel('the Bad Blood Derby'), 'Bad Blood Derby')
  const list = uniqueDerbies([
    { home: { manager: 'Andy Ward' }, away: { manager: 'Nick Goodacre' } },
    { home: { manager: 'David Higman' }, away: { manager: 'Luke Butcher' } },
    { home: { manager: 'Mike Sutton' }, away: { manager: 'Eddy Webster' } },
    { home: { manager: 'Andrew Ward' }, away: { manager: 'Nick Goodacre' } },
  ])
  assert.deepEqual(list, ['the Bad Blood Derby', 'the East Asian Derby'])
})
