import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  glanceFixture,
  glanceTiles,
  interestingBullets,
  matchupChips,
  personalityRecap,
  polaroidFacts,
  wrapBanner,
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
  sentences: [
    'Mordor S.F.G steamrolled Atlético Bilbo 51–24 — the kind of scoreline that gets screenshotted.',
    "As expected: the model gave Mordor S.F.G 74% pre-match, and that's how it went.",
    'That leaves Mordor S.F.G 3rd (1-0-0); Atlético Bilbo are 8th at 0-0-1.',
    'Plant-based and extremely sure: Mottershead is still talking like he invented veganism.',
    'Atlético Bilbo will point at Shaw: projected for 5.1, he returned 1.',
  ],
}

test('glanceTiles: Best waiver + model says right', () => {
  const tiles = glanceTiles({ recapGw, preview: false, decided: 4 })
  assert.equal(tiles.length, 6)
  assert.equal(tiles.find((t) => t.label === 'Best waiver')?.value, '8')
  assert.equal(tiles.find((t) => t.label === 'Model')?.sub, 'right')
  assert.equal(tiles.find((t) => t.label === 'Model')?.value, '3/4')
  assert.ok(!tiles.some((t) => t.label === 'Waiver'))
  assert.ok(!tiles.some((t) => t.sub === 'called it'))
})

test('polaroidFacts keeps a swipeable handful', () => {
  const facts = polaroidFacts({ recapGw, preview: false, decided: 4 })
  assert.ok(facts.length >= 4 && facts.length <= 5)
  assert.ok(facts[0].caption)
})

test('personalityRecap is always two manager lines', () => {
  const a = personalityRecap(recapMatch)
  const b = personalityRecap(recapMatch)
  assert.equal(a.length, 2)
  assert.deepEqual(a, b)
  assert.match(a.join(' '), /vegan|oat milk|tofu|plant-based/i)
  assert.match(a.join(' '), /Goodacre|spreadsheet|conservative|lampshade|Northern/i)
})

test('glanceFixture recap: stats, two bullets, recap never repeats a bullet', () => {
  const out = glanceFixture(recapMatch)
  assert.ok(out.stats.length >= 2 && out.stats.length <= 3)
  assert.equal(out.stats[0].label, 'Model')
  assert.equal(out.bullets.length, 2)
  assert.equal(out.recap.length, 2)
  for (const b of out.bullets) {
    for (const r of out.recap) {
      assert.notEqual(b.toLowerCase(), r.toLowerCase(), `repeat: ${b}`)
      assert.ok(!b.toLowerCase().includes(r.toLowerCase()), `bullet contains recap: ${b}`)
    }
  }
  assert.ok(!out.bullets.some((b) => /^Book /.test(b)))
  assert.ok(!out.bullets.join(' ').includes('That leaves'))
})

test('interesting preview bullets skip the raw book tape', () => {
  const bullets = interestingBullets(
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
      sentences: [
        "Mike's path is ugly, Hall to blank, plus Virgil to haul.",
        'Luke claimed Tel; Mike added Dorgu.',
      ],
    },
    { preview: true, used: [] },
  )
  assert.equal(bullets.length, 2)
  assert.ok(!bullets.some((b) => /^Book /.test(b)))
  assert.ok(!bullets.some((b) => /^Watch:/.test(b)))
  assert.match(bullets.join(' '), /path is ugly|claimed|favourite|hinge/i)
})

test('every preview fixture still gets a two-sentence recap box', () => {
  const out = glanceFixture(
    {
      gw: 1,
      home: { entryId: 1, name: 'Suffolk Sméagol', manager: 'Andy Ward' },
      away: { entryId: 2, name: 'Rokesly Regorasu', manager: 'David Higman' },
      odds: { favoriteSide: 'away', favoritePct: 58 },
      bookie: { home: '13/8', draw: '25/1', away: '8/11' },
      sentences: [
        'The title board still has Rokesly Regorasu out in front at 21/20, Suffolk Sméagol chasing, while the hinge looks like Kerkez against Guéhi.',
      ],
    },
    { preview: true },
  )
  assert.equal(out.recap.length, 2)
  assert.ok(out.recap.join(' ').length > 40)
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

test('wrapBanner is a single statement', () => {
  assert.equal(
    wrapBanner(['This week features the Battle of Warderloo.']),
    'This week features the Battle of Warderloo',
  )
})
