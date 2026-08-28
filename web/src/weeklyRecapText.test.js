import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchupRecapSentences, variantIndex, ordinal, recapWeekWrapSentences } from './weeklyRecapText.js'

const team = (over = {}) => ({
  entryId: 1,
  name: 'Mordor S.F.G',
  points: 61,
  rank: 2,
  prevRank: 4,
  record: { w: 2, d: 0, l: 1 },
  streak: { type: 'W', len: 2 },
  seasonAvg: 52.3,
  isSeasonHigh: false,
  isWeekHigh: false,
  titleOdds: null,
  ...over,
})

const base = {
  gw: 3,
  home: team(),
  away: team({
    entryId: 2,
    name: 'Seoul Shire',
    points: 45,
    rank: 7,
    prevRank: 6,
    record: { w: 1, d: 0, l: 2 },
    streak: { type: 'L', len: 1 },
    seasonAvg: 47.0,
  }),
  odds: { favoriteSide: 'home', favoritePct: 62 },
  leagueAvg: 52,
}

test('four sentences with a model call, deterministic for same inputs', () => {
  const a = matchupRecapSentences(base)
  const b = matchupRecapSentences(base)
  assert.equal(a.length, 4)
  assert.deepEqual(a, b)
  for (const s of a) assert.ok(s.length > 10, `sentence too short: "${s}"`)
})

test('three sentences when no pre-match call exists', () => {
  const out = matchupRecapSentences({ ...base, odds: null })
  assert.equal(out.length, 3)
})

test('result sentence: winner first with winner-first score', () => {
  const [result] = matchupRecapSentences(base)
  assert.match(result, /61–45/)
  assert.ok(
    result.indexOf('Mordor') < result.indexOf('Seoul'),
    `winner named first: "${result}"`,
  )
  // Away winner flips both order and score
  const flipped = matchupRecapSentences({
    ...base,
    home: team({ points: 45 }),
    away: { ...base.away, points: 61 },
    odds: null,
  })
  assert.match(flipped[0], /61–45/)
  assert.ok(flipped[0].indexOf('Seoul') < flipped[0].indexOf('Mordor'))
})

test('odds sentence: favourite winning is called expected/lean, upset flagged', () => {
  const [, favLine] = matchupRecapSentences({
    ...base,
    odds: { favoriteSide: 'home', favoritePct: 71 },
  })
  assert.match(favLine, /71%/)
  const [, upset] = matchupRecapSentences({
    ...base,
    odds: { favoriteSide: 'away', favoritePct: 70 },
  })
  assert.match(upset, /upset|script/i)
})

test('draw: stalemate result and no-side odds sentence', () => {
  const drawn = matchupRecapSentences({
    ...base,
    home: team({ points: 50 }),
    away: { ...base.away, points: 50 },
  })
  assert.match(drawn[0], /50–50/)
  assert.match(drawn[1], /refused to pick a side/)
})

test('context sentence covers both teams with ranks and records', () => {
  const out = matchupRecapSentences(base)
  const context = out[2]
  assert.match(context, /2-0-1/)
  assert.match(context, /1-0-2/)
  assert.match(context, /2nd/)
  assert.match(context, /7th/)
})

test('fun fact priority: season-high wins (from GW3), title swing next', () => {
  const [, , , seasonHigh] = matchupRecapSentences({
    ...base,
    home: team({ isSeasonHigh: true, points: 80 }),
  })
  assert.match(seasonHigh, /best week of the season/)
  // GW2 season-highs are too trivial to mention
  const gw2 = matchupRecapSentences({
    ...base,
    gw: 2,
    home: team({ isSeasonHigh: true, points: 80, titleOdds: { before: 20, after: 31 } }),
  })
  assert.doesNotMatch(gw2[3], /best week/)
  assert.match(gw2[3], /title odds/)
})

test('fun fact: long losing streak raises alarm bells', () => {
  const out = matchupRecapSentences({
    ...base,
    away: { ...base.away, streak: { type: 'L', len: 4 } },
  })
  assert.match(out[3], /4 defeats on the spin/)
})

test('fun fact: heavyweight fixture when combined points run high', () => {
  const out = matchupRecapSentences({
    ...base,
    home: team({ points: 78 }),
    away: { ...base.away, points: 70 },
    leagueAvg: 50,
  })
  assert.match(out[3], /148 combined points/)
})

test('player sentence: winner carried by one player', () => {
  const out = matchupRecapSentences({
    ...base,
    home: team({
      points: 55,
      players: { top: { name: 'Salah', pts: 24 }, share: 0.436, haul: { name: 'Salah', pts: 24 }, flop: null },
    }),
    away: {
      ...base.away,
      players: { top: { name: 'Watkins', pts: 8 }, share: 0.18, haul: null, flop: null },
    },
  })
  assert.equal(out.length, 5)
  const player = out[3]
  assert.match(player, /Salah/)
  assert.match(player, /single-handed|one-man-army/)
})

test('player sentence: haul against a headline blank names both', () => {
  const out = matchupRecapSentences({
    ...base,
    home: team({
      players: { top: { name: 'Haaland', pts: 17 }, share: 0.28, haul: { name: 'Haaland', pts: 17 }, flop: null },
    }),
    away: {
      ...base.away,
      players: { top: { name: 'Gabriel', pts: 6 }, share: 0.13, haul: null, flop: { name: 'Isak', pts: 1, xp: 6.2 } },
    },
  })
  const player = out[3]
  assert.match(player, /Haaland hauled 17/)
  assert.match(player, /Isak/)
  assert.match(player, /just 1/)
})

test('player sentence omitted when nothing notable happened', () => {
  const quiet = { top: { name: 'A', pts: 8 }, share: 0.15, haul: null, flop: null }
  const out = matchupRecapSentences({
    ...base,
    home: team({ players: quiet }),
    away: { ...base.away, players: { ...quiet, top: { name: 'B', pts: 7 } } },
  })
  assert.equal(out.length, 4)
  for (const s of out) assert.doesNotMatch(s, /\bA\b \(8\)/)
})

test('player sentence: losing side haul reads as wasted', () => {
  const out = matchupRecapSentences({
    ...base,
    away: {
      ...base.away,
      players: { top: { name: 'Palmer', pts: 19 }, share: 0.42, haul: { name: 'Palmer', pts: 19 }, flop: null },
    },
  })
  assert.match(out[3], /Palmer's 19 .* deserved more/)
})

test('waiver sentence: winning side rode a claimed player to the result', () => {
  const out = matchupRecapSentences({
    ...base,
    home: team({
      manager: 'Nick Mottershead',
      players: { top: { id: 42, name: 'Mbeumo', pts: 16 }, share: 0.28, haul: { id: 42, name: 'Mbeumo', pts: 16 }, flop: null },
      pickup: { star: { name: 'Mbeumo', pts: 16, kind: 'w', gw: 3, recent: true, wasHaul: true } },
    }),
  })
  const waiver = out.find((s) => /Mbeumo/.test(s) && /waiver|wire/.test(s))
  assert.ok(waiver, `expected a waiver line, got: ${JSON.stringify(out)}`)
  assert.match(waiver, /Nick/)
  assert.match(waiver, /16/)
})

test('waiver sentence: free-agent flop is called out', () => {
  const out = matchupRecapSentences({
    ...base,
    away: {
      ...base.away,
      manager: 'Luke Butcher',
      players: { top: { id: 5, name: 'Foden', pts: 3 }, share: 0.12, haul: null, flop: { id: 9, name: 'Isak', pts: 1, xp: 6.5 } },
      pickup: { flop: { name: 'Isak', pts: 1, xp: 6.5, kind: 'f', gw: 2, recent: false } },
    },
  })
  const waiver = out.find((s) => /Isak/.test(s) && /free-agent/.test(s))
  assert.ok(waiver, `expected a free-agent flop line, got: ${JSON.stringify(out)}`)
  assert.match(waiver, /Luke/)
})

test('rivalry sentence: appears from the second meeting, replaces fun fact', () => {
  const withRivalry = matchupRecapSentences({
    ...base,
    h2h: { games: 2, homeWins: 2, awayWins: 0, draws: 0 },
  })
  const rivalry = withRivalry[withRivalry.length - 1]
  assert.match(rivalry, /season head-to-head|season series|Bragging rights/i)
  assert.match(rivalry, /2–0|2-0/)
  // First-ever meeting (games: 1) → no rivalry line, fun fact instead.
  const firstMeeting = matchupRecapSentences({
    ...base,
    h2h: { games: 1, homeWins: 1, awayWins: 0, draws: 0 },
  })
  assert.doesNotMatch(firstMeeting[firstMeeting.length - 1], /head-to-head/i)
})

test('rivalry sentence: falls back to team names when managers share a first name', () => {
  const out = matchupRecapSentences({
    ...base,
    home: team({ name: 'Mordor S.F.G', manager: 'Nick Mottershead' }),
    away: { ...base.away, name: 'Atlético Bilbo', manager: 'Nick Goodacre' },
    h2h: { games: 2, homeWins: 2, awayWins: 0, draws: 0 },
  })
  const rivalry = out[out.length - 1]
  // Must not read "Nick ... with Nick"; disambiguate with team names.
  assert.match(rivalry, /Mordor/)
  assert.match(rivalry, /Atlético/)
  assert.doesNotMatch(rivalry, /Nick.*Nick/)
})

test('rivalry sentence: draw keeps the series level and uses managers', () => {
  const out = matchupRecapSentences({
    ...base,
    home: team({ points: 50, manager: 'Nick Mottershead' }),
    away: { ...base.away, points: 50, manager: 'Luke Butcher' },
    h2h: { games: 3, homeWins: 1, awayWins: 1, draws: 1 },
  })
  const rivalry = out[out.length - 1]
  assert.match(rivalry, /series|honours even/i)
  assert.match(rivalry, /Nick|Luke/)
})

test('named fixture leads the recap every time the pair meets', () => {
  const warderloo = {
    ...base,
    home: team({ name: 'Toronto Gimli', manager: 'Andy Ward' }),
    away: { ...base.away, name: 'Suffolk Sméagol', manager: 'Jon Ward' },
  }
  // First meeting (no series yet) still gets the name.
  const first = matchupRecapSentences({ ...warderloo, h2h: { games: 1, homeWins: 1, awayWins: 0, draws: 0 } })
  assert.match(first[0], /Battle of Warderloo/)
  // And on the rematch.
  const second = matchupRecapSentences({ ...warderloo, h2h: { games: 2, homeWins: 1, awayWins: 1, draws: 0 } })
  assert.match(second[0], /Battle of Warderloo/)
})

test('named fixture: Andy vs Goodacre is the Bad Blood Derby', () => {
  const out = matchupRecapSentences({
    ...base,
    home: team({ name: 'Toronto Gimli', manager: 'Andy Ward' }),
    away: { ...base.away, name: 'Atlético Bilbo', manager: 'Nick Goodacre' },
  })
  assert.match(out[0], /Bad Blood Derby/)
})

test('named fixture: Higman vs Sutton is the Respect Derby', () => {
  const out = matchupRecapSentences({
    ...base,
    home: team({ name: 'Rokesly Regorasu', manager: 'David Higman' }),
    away: { ...base.away, name: 'Hackney Rohirrim', manager: 'Mike Sutton' },
  })
  assert.match(out[0], /Respect Derby/)
})

test('no named-fixture lead for an ordinary pairing', () => {
  const out = matchupRecapSentences({
    ...base,
    home: team({ manager: 'Nick Mottershead' }),
    away: { ...base.away, manager: 'Mike Sutton' },
  })
  assert.doesNotMatch(out[0], /Battle|derby/i)
})

test('Mottershead recap always has a vegan joke, plus one extra when hooked', () => {
  for (let gw = 1; gw <= 16; gw++) {
    const quiet = matchupRecapSentences({
      ...base,
      gw,
      home: team({ manager: 'Nick Mottershead' }),
    })
    assert.match(quiet.join(' '), /vegan|tofu|plant-based/i)
    assert.deepEqual(quiet, matchupRecapSentences({ ...base, gw, home: team({ manager: 'Nick Mottershead' }) }))
  }

  const hooked = matchupRecapSentences({
    ...base,
    home: team({ manager: 'Nick Mottershead', pickup: { name: 'Schade' } }),
  })
  assert.match(hooked.join(' '), /vegan|tofu|plant-based/i)
  const mott = hooked.filter((s) =>
    /vegan|tofu|plant-based|swagger|arts school|big-move|fallen-empire|trade flurry|extremely sure|Titanic/i.test(s),
  )
  assert.ok(mott.length >= 2)
})

test('no manager fun fact when neither manager has lore', () => {
  for (let gw = 1; gw <= 10; gw++) {
    const out = matchupRecapSentences({ ...base, gw })
    assert.doesNotMatch(out.join(' '), /vegan|Samsung|twins|Titanic Duo/i)
  }
})

test('variantIndex is stable and in range', () => {
  for (const key of ['a', 'b', 'team-1-gw3', '']) {
    const v = variantIndex(key, 3)
    assert.equal(v, variantIndex(key, 3))
    assert.ok(v >= 0 && v < 3)
  }
})

test('ordinal', () => {
  assert.equal(ordinal(1), '1st')
  assert.equal(ordinal(2), '2nd')
  assert.equal(ordinal(3), '3rd')
  assert.equal(ordinal(4), '4th')
  assert.equal(ordinal(11), '11th')
  assert.equal(ordinal(21), '21st')
})

test('week wrap always names derbies on the card', () => {
  const wrap = recapWeekWrapSentences({
    gw: 2,
    matchups: [
      {
        home: { manager: 'Andy Ward', rank: 4, record: { w: 1, d: 0, l: 0 } },
        away: { manager: 'Nick Goodacre', rank: 8, record: { w: 0, d: 0, l: 1 } },
      },
      {
        home: { manager: 'David Higman', rank: 1, record: { w: 1, d: 0, l: 0 } },
        away: { manager: 'Luke Butcher', rank: 3, record: { w: 1, d: 0, l: 0 } },
      },
    ],
  })
  const joined = wrap.join(' ')
  assert.match(joined, /Bad Blood Derby/)
  assert.match(joined, /East Asian Derby/)
})

test('week wrap is empty when there are no named fixtures or hooks', () => {
  const wrap = recapWeekWrapSentences({
    gw: 99,
    matchups: [
      {
        home: { manager: 'Mike Sutton', rank: 3, record: { w: 2, d: 0, l: 0 } },
        away: { manager: 'Luke Butcher', rank: 4, record: { w: 1, d: 0, l: 1 } },
      },
    ],
  })
  assert.deepEqual(wrap, [])
})
