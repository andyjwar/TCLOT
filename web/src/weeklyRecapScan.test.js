import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  glanceTiles,
  matchupChips,
  matchupScanLines,
  pickQuip,
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

test('pickQuip prefers personality over table copy', () => {
  assert.equal(
    pickQuip([
      'Mordor steamrolled Bilbo 51–24.',
      'That leaves Mordor 3rd (1-0-0).',
      'Mottershead is still talking like he invented veganism.',
    ]),
    'Mottershead is still talking like he invented veganism',
  )
})

test('glanceTiles recap is six scan cards', () => {
  const tiles = glanceTiles({ recapGw, preview: false, decided: 4 })
  assert.equal(tiles.length, 6)
  assert.equal(tiles[0].value, '55')
  assert.equal(tiles[1].value, '23%')
  assert.equal(tiles[2].value, '3/4')
  assert.match(tiles[5].sub, /pick 8/)
})

test('polaroidFacts keeps a swipeable handful', () => {
  const facts = polaroidFacts({ recapGw, preview: false, decided: 4 })
  assert.ok(facts.length >= 4 && facts.length <= 5)
  assert.ok(facts[0].caption)
})

test('matchupScanLines recap: odds + star + quip, no paragraph', () => {
  const out = matchupScanLines({
    home: {
      name: 'Mordor S.F.G',
      rank: 3,
      record: { w: 1, d: 0, l: 0 },
      players: { top: { name: 'João Pedro', pts: 11 } },
    },
    away: {
      name: 'Atlético Bilbo',
      rank: 8,
      record: { w: 0, d: 0, l: 1 },
      players: { flop: { name: 'Shaw', pts: 1, xp: 5.1 } },
    },
    odds: { favoriteSide: 'home', favoritePct: 74, outcome: 'hit' },
    sentences: [
      'Mordor S.F.G steamrolled Atlético Bilbo 51–24 — the kind of scoreline that gets screenshotted.',
      'As expected: the model gave Mordor S.F.G 74% pre-match, and that\'s how it went.',
      'That leaves Mordor S.F.G 3rd (1-0-0); Atlético Bilbo are 8th at 0-0-1.',
      'Plant-based and extremely sure: Mottershead is still talking like he invented veganism.',
    ],
  })
  assert.ok(out.bullets.length >= 2 && out.bullets.length <= 3)
  assert.match(out.bullets[0], /74%/)
  assert.match(out.quip, /veganism/)
  assert.ok(!out.bullets.join(' ').includes('That leaves'))
})

test('matchupScanLines preview uses book + watch', () => {
  const out = matchupScanLines(
    {
      home: { keys: [{ name: 'Roefs', xp: 5.4 }] },
      away: { keys: [{ name: 'Shaw', xp: 5.1 }] },
      bookie: { home: '4/11', draw: '33/1', away: '3/1' },
      sentences: ['The hinge is Saka against Gabriel.'],
    },
    { preview: true },
  )
  assert.match(out.bullets[0], /4\/11/)
  assert.match(out.bullets.join(' '), /Roefs/)
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
