import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  fixtureStoryLines,
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
    titleOdds: { before: 8.2, after: 11.6 },
  },
  away: {
    entryId: 4259,
    name: 'Atlético Bilbo',
    manager: 'Nick Goodacre',
    points: 24,
    rank: 8,
    record: { w: 0, d: 0, l: 1 },
    players: { top: { name: 'Branthwaite', pts: 6 }, flop: { name: 'Shaw', pts: 1, xp: 5.1 } },
    titleOdds: { before: 6.4, after: 4.1 },
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

test('personalityRecap is vegan for Mottershead and not a two-manager checklist', () => {
  const a = personalityRecap(recapMatch)
  const b = personalityRecap(recapMatch)
  assert.ok(a.length >= 1 && a.length <= 3)
  assert.deepEqual(a, b)
  assert.match(a.join(' '), /vegan|oat milk|tofu|plant-based/i)
  assert.doesNotMatch(a.join(' '), /will have a take/i)
})

test('fixture stories cover waiver, projected, scorer, dud, streak and bad record', () => {
  const recap = fixtureStoryLines(
    {
      home: {
        name: 'Toronto Gimli',
        manager: 'Jon Ward',
        rank: 8,
        record: { w: 0, d: 0, l: 4 },
        streak: { type: 'L', len: 3 },
        pickup: { name: 'Schade', pts: 2, xp: 5.1, kind: 'w' },
        players: { top: { name: 'White', pts: 11 }, flop: { name: 'Isak', pts: 1, xp: 6.2 } },
      },
      away: {
        name: 'Hackney Rohirrim',
        manager: 'Mike Sutton',
        record: { w: 5, d: 0, l: 0 },
        streak: { type: 'W', len: 5 },
        players: { top: { name: 'Stach', pts: 13 } },
      },
    },
    false,
    'recap-stories',
  )
  const blob = recap.join(' ')
  assert.match(blob, /Schade|waiver/i)
  assert.match(blob, /White|Stach/i)
  assert.match(blob, /Isak|dud/i)
  assert.match(blob, /3-game losing|5-game winning/i)
  assert.match(blob, /0-0-4|first win|8th/i)

  const preview = fixtureStoryLines(
    {
      home: {
        name: 'Seoul Shire',
        manager: 'Luke Butcher',
        recentPickups: [{ name: 'Tel', kind: 'w' }],
        keys: [{ name: 'Saka', xp: 6.1 }],
      },
      away: {
        name: 'Atlético Bilbo',
        manager: 'Nick Goodacre',
        keys: [{ name: 'Petrović', xp: 4.8 }],
      },
    },
    true,
    'preview-stories',
  )
  const pre = preview.join(' ')
  assert.match(pre, /Tel|waiver/i)
  assert.match(pre, /Saka|Petrović/i)
})

test('recap fixture: model, top scorer, both title odds', () => {
  const out = glanceFixture(recapMatch)
  assert.deepEqual(
    out.stats.map((t) => [t.label, t.value]),
    [
      ['Model', 'Right'],
      ['Top scorer', '11'],
      ['Mordor', '11.6%'],
      ['Bilbo', '4.1%'],
    ],
  )
  assert.equal(out.stats[2].sub, 'title')
  assert.equal(out.stats[2].tone, 'win')
  assert.equal(out.stats[3].tone, 'loss')
  assert.ok(out.recap.length >= 1 && out.recap.length <= 3)
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
  assert.ok(out.recap.length >= 1 && out.recap.length <= 3)
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
