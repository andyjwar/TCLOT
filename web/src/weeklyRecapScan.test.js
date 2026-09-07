import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  glanceFixture,
  glanceTiles,
  matchupChips,
  personalityRecap,
  polaroidFacts,
} from './weeklyRecapScan.js'

const recapGw = {
  model: {
    hits: 3,
    misses: 1,
    upset: { winnerName: 'Seoul Shire', loserName: 'Hackney Rohirrim', winnerPct: 23 },
  },
  superlatives: {
    weekHigh: { name: 'Rokesly Regorasu', points: 55 },
    starPlayer: { name: 'Stach', pts: 13 },
    bestWaiver: { name: 'Barry', pts: 8 },
    dud: { name: 'Watkins', pts: 0, overallPick: 8 },
  },
}

const recapMatch = {
  gw: 1,
  home: {
    entryId: 18279,
    name: 'Mordor S.F.G',
    manager: 'Nick Mottershead',
    points: 51,
    rank: 3,
    record: { w: 1, d: 0, l: 0 },
    players: { top: { name: 'João Pedro', pts: 11 }, flop: { name: 'Roefs', pts: 1, xp: 5.4 } },
  },
  away: {
    entryId: 4259,
    name: 'Atlético Bilbo',
    manager: 'Nick Goodacre',
    points: 24,
    rank: 8,
    record: { w: 0, d: 0, l: 1 },
    players: { top: { name: 'Branthwaite', pts: 6 }, flop: { name: 'Shaw', pts: 1, xp: 5.1 } },
  },
  odds: { favoriteSide: 'home', favoritePct: 74, outcome: 'hit' },
  margin: 27,
}

test('glanceTiles header is GW scorer, best waiver, dud', () => {
  const tiles = glanceTiles({ recapGw, preview: false, decided: 4 })
  assert.deepEqual(
    tiles.map((t) => t.label),
    ['GW scorer', 'Best waiver', 'Dud'],
  )
  assert.equal(tiles[0].value, '55')
  assert.equal(tiles[1].value, '8')
  assert.equal(tiles[2].value, '0')
  assert.ok(!tiles.some((t) => t.label === 'Model' || t.label === 'Upset'))
})

test('polaroidFacts follows the slim header', () => {
  const facts = polaroidFacts({ recapGw, preview: false, decided: 4 })
  assert.equal(facts.length, 3)
})

test('personalityRecap is two lines and never the stale take', () => {
  const a = personalityRecap(recapMatch)
  const b = personalityRecap(recapMatch)
  assert.equal(a.length, 2)
  assert.deepEqual(a, b)
  assert.doesNotMatch(a.join(' '), /will have a take/i)
})

test('personality lines rotate when a joke is already used', () => {
  const first = personalityRecap({
    gw: 1,
    home: { entryId: 1, name: 'Toronto Gimli', manager: 'Jon Ward' },
    away: { entryId: 2, name: 'Hackney Rohirrim', manager: 'Mike Sutton' },
  })
  const second = personalityRecap(
    {
      gw: 1,
      home: { entryId: 1, name: 'Toronto Gimli', manager: 'Jon Ward' },
      away: { entryId: 3, name: 'Seoul Shire', manager: 'Luke Butcher' },
    },
    false,
    first,
  )
  const jonFirst = first.find((s) => /Jon|Brother Ward/i.test(s))
  const jonSecond = second.find((s) => /Jon|Brother Ward/i.test(s))
  assert.ok(jonFirst)
  assert.ok(jonSecond)
  assert.notEqual(jonFirst, jonSecond)
  assert.doesNotMatch([...first, ...second].join(' '), /will have a take/i)
})

test('recap fixture: model who, top scorer, dud', () => {
  const out = glanceFixture(recapMatch)
  assert.deepEqual(
    out.stats.map((t) => t.label),
    ['Model', 'Top scorer', 'Dud'],
  )
  assert.equal(out.stats[0].value, 'Right')
  assert.match(out.stats[0].sub, /Mordor|MSFG/)
  assert.equal(out.stats[1].value, '11')
  assert.equal(out.stats[2].label, 'Dud')
  assert.equal(out.recap.length, 2)
})

test('preview fixture is book odds plus highest predicted scorer', () => {
  const out = glanceFixture(
    {
      gw: 1,
      home: {
        entryId: 1,
        name: 'Toronto Gimli',
        manager: 'Jon Ward',
        keys: [{ name: 'Verbruggen', xp: 3.9 }],
      },
      away: {
        entryId: 2,
        name: 'Hackney Rohirrim',
        manager: 'Mike Sutton',
        keys: [{ name: 'Donnarumma', xp: 4.9 }],
      },
      odds: { favoriteSide: 'home', favoritePct: 67 },
      bookie: { home: '1/2', draw: '25/1', away: '5/2' },
    },
    { preview: true },
  )
  assert.deepEqual(
    out.stats.map((t) => t.label),
    ['Book', 'Top scorer'],
  )
  assert.equal(out.stats[0].value, '1/2 · 25/1 · 5/2')
  assert.equal(out.stats[1].value, '4.9')
  assert.equal(out.stats[1].sub, 'Donnarumma')
  assert.equal(out.recap.length, 2)
})

test('matchupChips flags upset and derby', () => {
  const chips = matchupChips({
    derby: 'the Battle of Warderloo',
    odds: { outcome: 'miss' },
    away: { isWeekHigh: true },
  })
  assert.deepEqual(
    chips.map((c) => c.label),
    ['Battle of Warderloo', 'Upset', 'Week high'],
  )
})
