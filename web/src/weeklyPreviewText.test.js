import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  matchupPreviewSentences,
  oddsPercents,
  watchPlayersFromXi,
  isVeganManager,
} from './weeklyPreviewText.js'

const team = (over = {}) => ({
  entryId: 1,
  name: 'Mordor S.F.G',
  manager: 'Nick Mottershead',
  rank: 3,
  record: { w: 1, d: 0, l: 0 },
  titlePct: 28.5,
  keys: [{ id: 10, name: 'João Pedro', pos: 'FWD', xp: 6.4 }],
  ...over,
})

const base = {
  gw: 2,
  home: team(),
  away: team({
    entryId: 2,
    name: 'Atlético Bilbo',
    manager: 'Nick Goodacre',
    rank: 8,
    record: { w: 0, d: 0, l: 1 },
    titlePct: 0.8,
    keys: [
      { id: 20, name: 'Enzo', pos: 'MID', xp: 5.3 },
      { id: 21, name: 'Mbeumo', pos: 'MID', xp: 5.1 },
    ],
  }),
  odds: { favoriteSide: 'home', favoritePct: 74 },
  predicted: { home: 44, away: 31 },
  h2h: { games: 1, homeWins: 1, awayWins: 0, draws: 0 },
}

test('oddsPercents rounds fractions and percents to a 100-sum triple', () => {
  const fromFrac = oddsPercents({ home: 0.74, draw: 0.03, away: 0.23 })
  assert.equal(fromFrac.home + fromFrac.draw + fromFrac.away, 100)
  assert.ok(fromFrac.home > fromFrac.away)
  const fromPct = oddsPercents({ home: 58.72, draw: 2.41, away: 38.87 })
  assert.equal(fromPct.home + fromPct.draw + fromPct.away, 100)
  assert.equal(oddsPercents({ home: 0, draw: 0, away: 0 }).home + oddsPercents({}).away, 100)
})

test('watchPlayersFromXi sorts by xP and keeps the top N', () => {
  const xi = [
    { id: 1, name: 'Shaw', pos: 'DEF', xp: 5.1 },
    { id: 2, name: 'Isak', pos: 'FWD', xp: 1.2 },
    { id: 3, name: 'Enzo', pos: 'MID', xp: 4.1 },
  ]
  assert.deepEqual(
    watchPlayersFromXi(xi, 2).map((p) => p.name),
    ['Shaw', 'Enzo'],
  )
  assert.deepEqual(watchPlayersFromXi(null), [])
})

test('preview sentences are deterministic and mention odds + both sides', () => {
  const a = matchupPreviewSentences(base)
  const b = matchupPreviewSentences(base)
  assert.deepEqual(a, b)
  assert.ok(a.length >= 4)
  const joined = a.join(' ')
  assert.match(joined, /74%/)
  assert.match(joined, /Mordor/)
  assert.match(joined, /Bilbo/)
  assert.doesNotMatch(joined, /\d+–\d+/, 'preview must not leak a final score')
})

test('heavy favourite gets a chalk line and an underdog path', () => {
  const out = matchupPreviewSentences(base)
  const joined = out.join(' ')
  assert.match(joined, /heavy favourites|Clear chalk/)
  assert.match(joined, /44 to 31|Projected points/)
  assert.match(joined, /João Pedro/)
  assert.match(joined, /Enzo/)
  assert.match(joined, /haul|blank|not waiting/i)
})

test('tight matchup is called a coin flip, not chalk', () => {
  const out = matchupPreviewSentences({
    ...base,
    odds: { favoriteSide: 'away', favoritePct: 52 },
    predicted: { home: 40, away: 41 },
  })
  const joined = out.join(' ')
  assert.match(joined, /tight|Coin-flip/i)
  assert.doesNotMatch(joined, /heavy favourites|Clear chalk/)
})

test('named fixture leads the preview', () => {
  const out = matchupPreviewSentences({
    ...base,
    home: team({ name: 'Toronto Gimli', manager: 'Andy Ward' }),
    away: team({
      entryId: 2,
      name: 'Suffolk Sméagol',
      manager: 'Jon Ward',
      keys: [{ name: 'Palmer', xp: 6.1 }],
    }),
  })
  assert.match(out[0], /Battle of Warderloo/)
})

test('vegan joke always fires when Mottershead is in the fixture', () => {
  for (let gw = 1; gw <= 12; gw++) {
    const out = matchupPreviewSentences({ ...base, gw })
    assert.match(out.join(' '), /vegan|tofu|plant|oat milk/i)
  }
  assert.equal(isVeganManager('Nick Mottershead'), true)
  assert.equal(isVeganManager('Nick Goodacre'), false)
})

test('no vegan joke when Mottershead is not playing', () => {
  const out = matchupPreviewSentences({
    ...base,
    home: team({ manager: 'David Higman', name: 'Rokesly Regorasu' }),
    away: team({
      entryId: 2,
      name: 'Seoul Shire',
      manager: 'Luke Butcher',
      keys: [{ name: 'Saka', xp: 6.8 }],
    }),
    h2h: null,
  })
  assert.doesNotMatch(out.join(' '), /vegan|tofu|plant|oat milk/i)
})

test('East Asian derby + Boxhead lore can appear for Luke vs David', () => {
  let sawDerby = false
  let sawBoxhead = false
  for (let gw = 1; gw <= 16; gw++) {
    const joined = matchupPreviewSentences({
      ...base,
      gw,
      home: team({ manager: 'David Higman', name: 'Rokesly Regorasu' }),
      away: team({
        entryId: 2,
        name: 'Seoul Shire',
        manager: 'Luke Butcher',
        keys: [{ name: 'Saka', xp: 6.8 }],
      }),
      h2h: null,
    }).join(' ')
    if (/East Asian derby/.test(joined)) sawDerby = true
    if (/Boxhead/.test(joined)) sawBoxhead = true
  }
  assert.ok(sawDerby, 'named fixture should lead')
  assert.ok(sawBoxhead, 'Boxhead joke should fire on some GWs')
})

test('round-two rivalry line when they have already met', () => {
  const out = matchupPreviewSentences(base)
  assert.match(out.join(' '), /round two|first meeting/i)
})
