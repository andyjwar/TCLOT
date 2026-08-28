import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  matchupPreviewSentences,
  oddsPercents,
  watchPlayersFromXi,
  formFromXi,
  bookiePrecall,
  isVeganManager,
} from './weeklyPreviewText.js'

const team = (over = {}) => ({
  entryId: 1,
  name: 'Mordor S.F.G',
  manager: 'Nick Mottershead',
  rank: 3,
  record: { w: 1, d: 0, l: 0 },
  titlePct: 28.5,
  titlePrice: '9/4',
  lastPct: 1.8,
  lastPrice: '50/1',
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
    titlePrice: '100/1',
    lastPct: 41.6,
    lastPrice: '6/5',
    keys: [
      { id: 20, name: 'Enzo', pos: 'MID', xp: 5.3 },
      { id: 21, name: 'Mbeumo', pos: 'MID', xp: 5.1 },
    ],
  }),
  odds: { favoriteSide: 'home', favoritePct: 74, home: 74, draw: 3, away: 23 },
  bookie: { home: '1/4', draw: '33/1', away: '10/3' },
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

test('formFromXi picks last-week over and under performers', () => {
  const form = formFromXi([
    { name: 'João Pedro', pts: 11, xp: 5.2 },
    { name: 'Shaw', pts: 1, xp: 5.1 },
    { name: 'Enzo', pts: 5, xp: 5.3 },
  ])
  assert.equal(form.over.name, 'João Pedro')
  assert.equal(form.over.pts, 11)
  assert.equal(form.under.name, 'Shaw')
  assert.equal(form.under.pts, 1)
  assert.equal(formFromXi([{ name: 'Saka', pts: 6, xp: 6.1 }]), null)
})

test('bookiePrecall prefers sheet fractions over model percents', () => {
  assert.deepEqual(bookiePrecall(base), { home: '1/4', draw: '33/1', away: '10/3' })
  const fromModel = bookiePrecall({ odds: { home: 74, draw: 3, away: 23 } })
  assert.match(fromModel.home, /^\d+\/\d+$/)
  assert.match(fromModel.away, /^\d+\/\d+$/)
})

test('preview sentences are deterministic and skip restated percents / xP / projected points', () => {
  const a = matchupPreviewSentences(base)
  const b = matchupPreviewSentences(base)
  assert.deepEqual(a, b)
  assert.ok(a.length >= 4)
  const joined = a.join(' ')
  assert.match(joined, /Mordor/)
  assert.match(joined, /Bilbo/)
  assert.match(joined, /1\/4/)
  assert.doesNotMatch(joined, /74%/)
  assert.doesNotMatch(joined, /Projected points/)
  assert.doesNotMatch(joined, /\(\d+\.\d+\)/)
  assert.doesNotMatch(joined, /\d+–\d+/, 'preview must not leak a final score')
})

test('heavy favourite gets a short-price line and an underdog path, without restating the points call', () => {
  const out = matchupPreviewSentences(base)
  const joined = out.join(' ')
  assert.match(joined, /short 1\/4|Clear favourite/)
  assert.doesNotMatch(joined, /44 to 31|Projected points/)
  assert.match(joined, /João Pedro/)
  assert.match(joined, /Enzo/)
  assert.match(joined, /haul|blank/i)
  assert.match(joined, /last|bottom/)
})

test('tight matchup is called a coin flip, not a clear favourite', () => {
  const out = matchupPreviewSentences({
    ...base,
    odds: { favoriteSide: 'away', favoritePct: 52, home: 46, draw: 2, away: 52 },
    bookie: { home: '11/10', draw: '40/1', away: '4/5' },
    predicted: { home: 40, away: 41 },
    home: team({ lastPct: 5, rank: 3, record: { w: 1, d: 0, l: 0 } }),
    away: team({
      entryId: 2,
      name: 'Atlético Bilbo',
      manager: 'Nick Goodacre',
      rank: 4,
      record: { w: 1, d: 0, l: 0 },
      titlePct: 11,
      lastPct: 6,
      keys: [{ id: 20, name: 'Enzo', pos: 'MID', xp: 5.3 }],
    }),
  })
  const joined = out.join(' ')
  assert.match(joined, /tight|Coin-flip/i)
  assert.doesNotMatch(joined, /short |Clear favourite/)
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
    home: team({ manager: 'David Higman', name: 'Rokesly Regorasu', lastPct: 1.5, rank: 1 }),
    away: team({
      entryId: 2,
      name: 'Seoul Shire',
      manager: 'Luke Butcher',
      rank: 4,
      record: { w: 1, d: 0, l: 0 },
      titlePct: 5.1,
      lastPct: 13.9,
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
      home: team({ manager: 'David Higman', name: 'Rokesly Regorasu', lastPct: 1.5, rank: 1 }),
      away: team({
        entryId: 2,
        name: 'Seoul Shire',
        manager: 'Luke Butcher',
        rank: 4,
        record: { w: 1, d: 0, l: 0 },
        titlePct: 5.1,
        lastPct: 13.9,
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

test('form line uses team names when both managers share a first name', () => {
  const out = matchupPreviewSentences({
    ...base,
    home: team({
      form: { over: { name: 'João Pedro', pts: 11, xp: 5.2 }, under: null },
    }),
    away: team({
      entryId: 2,
      name: 'Atlético Bilbo',
      manager: 'Nick Goodacre',
      rank: 8,
      record: { w: 0, d: 0, l: 1 },
      titlePct: 0.8,
      lastPct: 41.6,
      lastPrice: '6/5',
      keys: [{ id: 20, name: 'Enzo', pos: 'MID', xp: 5.3 }],
      form: { over: null, under: { name: 'Shaw', pts: 1, xp: 5.1 } },
    }),
  })
  const joined = out.join(' ')
  assert.match(joined, /João Pedro/)
  assert.match(joined, /Mordor/)
  assert.match(joined, /Shaw/)
  assert.match(joined, /Bilbo/)
  assert.doesNotMatch(joined, /for Nick last week[\s\S]*for Nick/)
})

test('recent waiver and last-week form land in the blurb', () => {
  const out = matchupPreviewSentences({
    ...base,
    home: team({
      recentPickups: [{ name: 'Schade', kind: 'w', gw: 1 }],
      form: { over: { name: 'João Pedro', pts: 11, xp: 5.2 }, under: null },
    }),
    away: team({
      entryId: 2,
      name: 'Atlético Bilbo',
      manager: 'Nick Goodacre',
      rank: 8,
      record: { w: 0, d: 0, l: 1 },
      titlePct: 0.8,
      lastPct: 41.6,
      lastPrice: '6/5',
      keys: [{ id: 20, name: 'Enzo', pos: 'MID', xp: 5.3 }],
      form: { over: null, under: { name: 'Shaw', pts: 1, xp: 5.1 } },
    }),
  })
  const joined = out.join(' ')
  assert.match(joined, /Schade/)
  assert.match(joined, /waiver|claimed/i)
  assert.match(joined, /João Pedro/)
  assert.match(joined, /Shaw/)
  assert.match(joined, /11/)
})

test('title favourite uses the outright bookie price, not a restated percent', () => {
  const out = matchupPreviewSentences({
    ...base,
    home: team({
      name: 'Rokesly Regorasu',
      manager: 'David Higman',
      rank: 1,
      record: { w: 1, d: 0, l: 0 },
      titlePct: 31.9,
      titlePrice: '15/8',
      lastPct: 1.5,
      keys: [{ name: 'Guéhi', xp: 6.9 }],
    }),
    away: team({
      entryId: 2,
      name: 'Seoul Shire',
      manager: 'Luke Butcher',
      rank: 4,
      record: { w: 1, d: 0, l: 0 },
      titlePct: 5.1,
      lastPct: 13.9,
      keys: [{ name: 'Cherki', xp: 7.7 }],
    }),
    odds: { favoriteSide: 'home', favoritePct: 61, home: 61, draw: 2, away: 37 },
    bookie: { home: '4/7', draw: '40/1', away: '13/8' },
    h2h: null,
  })
  const joined = out.join(' ')
  assert.match(joined, /15\/8/)
  assert.match(joined, /title favourite|title board/i)
  assert.doesNotMatch(joined, /31\.9%/)
})

test('injury copy names a started-while-out player without restating xP', () => {
  const out = matchupPreviewSentences({
    ...base,
    home: team({
      injuries: [
        {
          name: 'Isak',
          kind: 'starting-out',
          inXi: true,
          injury: 'groin injury',
          xp: 1.7,
        },
      ],
    }),
  })
  const joined = out.join(' ')
  assert.match(joined, /Isak/)
  assert.match(joined, /injured|groin/i)
  assert.doesNotMatch(joined, /\(1\.7\)/)
})

test('bench copy questions the manager when a healthy option sits', () => {
  const out = matchupPreviewSentences({
    ...base,
    away: team({
      entryId: 2,
      name: 'Atlético Bilbo',
      manager: 'Nick Goodacre',
      rank: 8,
      record: { w: 0, d: 0, l: 1 },
      lastPct: 41.6,
      lastPrice: '6/5',
      keys: [{ id: 20, name: 'Enzo', pos: 'MID', xp: 5.3 }],
      benchCall: {
        bench: { name: 'Konsa', pos: 'DEF', xp: 5.5, flag: 'ok' },
        starter: { name: 'Colwill', pos: 'DEF', xp: 0.6, flag: 'ok' },
        gap: 4.9,
      },
    }),
  })
  const joined = out.join(' ')
  assert.match(joined, /Question for Nick|has Konsa on the bench/)
  assert.match(joined, /Konsa/)
  assert.match(joined, /Colwill/)
  assert.doesNotMatch(joined, /5\.5/)
})

test('missing-star injury copy when a notable player is out of the XI', () => {
  const out = matchupPreviewSentences({
    ...base,
    away: team({
      entryId: 2,
      name: 'Seoul Shire',
      manager: 'Luke Butcher',
      rank: 4,
      record: { w: 1, d: 0, l: 0 },
      titlePct: 5.1,
      lastPct: 13.9,
      keys: [{ name: 'Saka', xp: 6.2 }],
      injuries: [
        {
          name: 'J.Timber',
          kind: 'missing',
          inXi: false,
          injury: 'groin injury',
          xp: 4.8,
        },
      ],
    }),
    h2h: null,
  })
  const joined = out.join(' ')
  assert.match(joined, /J\.Timber/)
  assert.match(joined, /without|out of/)
})
