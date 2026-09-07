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

test('glanceTiles header adds model dots and top scorer', () => {
  const tiles = glanceTiles({
    recapGw: {
      ...recapGw,
      model: {
        ...recapGw.model,
        calls: [
          { outcome: 'hit' },
          { outcome: 'miss' },
          { outcome: 'hit' },
          { outcome: 'hit' },
        ],
      },
    },
    preview: false,
    decided: 4,
  })
  assert.deepEqual(
    tiles.map((t) => t.label),
    ['GW scorer', 'Best waiver', 'Dud', 'Model', 'Top scorer'],
  )
  assert.equal(tiles[0].value, '55')
  assert.equal(tiles[1].value, '8')
  assert.equal(tiles[2].value, '0')
  const model = tiles.find((t) => t.label === 'Model')
  assert.deepEqual(model.dots, ['win', 'loss', 'win', 'win'])
  assert.equal(model.value, '3/4')
  assert.equal(tiles.find((t) => t.label === 'Top scorer')?.value, '13')
  assert.equal(tiles.find((t) => t.label === 'Top scorer')?.sub, 'Stach')
})

test('preview header derives GW scorer when baked topScorer is null', () => {
  const tiles = glanceTiles({
    preview: true,
    previewGw: {
      superlatives: {
        topScorer: null,
        bestWaiver: { name: 'Schade', xp: 4.2 },
        dud: { name: 'Isak', xp: 1.2, overallPick: 3 },
      },
      matchups: [
        {
          home: { keys: [{ name: 'Verbruggen', xp: 3.9 }] },
          away: { keys: [{ name: 'Donnarumma', xp: 4.9 }] },
        },
        {
          home: { keys: [{ name: 'Salah', xp: 6.1 }] },
          away: { keys: [{ name: 'Haaland', xp: 5.5 }] },
        },
      ],
    },
  })
  assert.deepEqual(
    tiles.map((t) => t.label),
    ['GW scorer', 'Best waiver', 'Dud'],
  )
  assert.equal(tiles[0].value, '6.1')
  assert.equal(tiles[0].sub, 'Salah')
})

test('polaroidFacts follows the slim header', () => {
  const facts = polaroidFacts({ recapGw, preview: false, decided: 4 })
  assert.equal(facts.length, 5)
  assert.ok(facts.some((f) => f.label === 'Model'))
  assert.ok(facts.some((f) => f.label === 'Top scorer'))
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

test('preview fixture is two team book squares plus top scorer', () => {
  const out = glanceFixture(
    {
      gw: 1,
      home: {
        entryId: 1,
        name: 'Seoul Shire',
        manager: 'Jon Ward',
        keys: [{ name: 'Verbruggen', xp: 3.9 }],
      },
      away: {
        entryId: 2,
        name: 'Atlético Bilbo',
        manager: 'Mike Sutton',
        keys: [{ name: 'Petrović', xp: 4.8 }],
      },
      odds: { favoriteSide: 'away', favoritePct: 53 },
      bookie: { home: '11/8', draw: '25/1', away: '10/11' },
    },
    { preview: true },
  )
  assert.deepEqual(
    out.stats.map((t) => [t.label, t.value]),
    [
      ['Seoul', '11/8'],
      ['Bilbo', '10/11'],
      ['Top scorer', '4.8'],
    ],
  )
  assert.ok(!out.stats.some((t) => String(t.value).includes('25/1')))
  assert.equal(out.stats[1].tone, 'win')
  assert.equal(out.stats[2].sub, 'Petrović')
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
