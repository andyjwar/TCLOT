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

const joined = (m) => matchupRecapSentences(m).join(' ')

test('deterministic newspaper copy, two to four core sentences', () => {
  const a = matchupRecapSentences(base)
  const b = matchupRecapSentences(base)
  assert.deepEqual(a, b)
  assert.ok(a.length >= 2 && a.length <= 6, `unexpected length ${a.length}: ${JSON.stringify(a)}`)
  for (const s of a) assert.ok(s.length > 10, `sentence too short: "${s}"`)
})

test('no pre-match call still produces a recap', () => {
  const out = matchupRecapSentences({ ...base, odds: null })
  assert.ok(out.length >= 2)
  assert.doesNotMatch(out.join(' '), /\d+%/)
})

test('lead weaves winner, score, and how the pre-match call aged', () => {
  const [lead] = matchupRecapSentences(base)
  assert.match(lead, /61–45/)
  assert.ok(lead.indexOf('Mordor') < lead.indexOf('Seoul'), `winner named first: "${lead}"`)
  assert.match(lead, /62%|lean/i)

  const flipped = matchupRecapSentences({
    ...base,
    home: team({ points: 45 }),
    away: { ...base.away, points: 61 },
    odds: null,
  })
  assert.match(flipped[0], /61–45/)
  assert.ok(flipped[0].indexOf('Seoul') < flipped[0].indexOf('Mordor'))
})

test('heavy favourite winning stays in the lead, not a second odds sentence', () => {
  const text = joined({ ...base, odds: { favoriteSide: 'home', favoritePct: 71 } })
  assert.match(text, /71%/)
  const upset = joined({ ...base, odds: { favoriteSide: 'away', favoritePct: 70 } })
  assert.match(upset, /script|tore up|still lost/i)
})

test('draw: stalemate and the pre-match lean live in the same breath', () => {
  const drawn = matchupRecapSentences({
    ...base,
    home: team({ points: 50 }),
    away: { ...base.away, points: 50 },
  })
  assert.match(drawn[0], /50–50/)
  assert.match(drawn[0], /stalemate|couldn't be separated|Deadlock|Nothing in it/i)
  assert.match(drawn.join(' '), /62%|leaned/i)
})

test('kicker covers both teams with ranks and records', () => {
  const text = joined(base)
  assert.match(text, /2-0-1/)
  assert.match(text, /1-0-2/)
  assert.match(text, /2nd/)
  assert.match(text, /7th/)
})

test('season-high from GW3 lands in the kicker; title swing wins on GW2', () => {
  const seasonHigh = joined({
    ...base,
    home: team({ isSeasonHigh: true, points: 80 }),
  })
  assert.match(seasonHigh, /best week of the season/)
  const gw2 = joined({
    ...base,
    gw: 2,
    home: team({ isSeasonHigh: true, points: 80, titleOdds: { before: 20, after: 31 } }),
  })
  assert.doesNotMatch(gw2, /best week/)
  assert.match(gw2, /title odds/)
})

test('long losing streak raises alarm bells', () => {
  const text = joined({
    ...base,
    away: { ...base.away, streak: { type: 'L', len: 4 } },
  })
  assert.match(text, /4 defeats on the spin/)
})

test('heavyweight fixture when combined points run high', () => {
  const text = joined({
    ...base,
    home: team({ points: 78 }),
    away: { ...base.away, points: 70 },
    leagueAvg: 50,
  })
  assert.match(text, /148 combined/)
})

test('player reporting: winner carried by one player', () => {
  const text = joined({
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
  assert.match(text, /Salah/)
  assert.match(text, /single-handed|one-man-army/)
})

test('player reporting: haul against a headline blank names both', () => {
  const text = joined({
    ...base,
    home: team({
      players: { top: { name: 'Haaland', pts: 17 }, share: 0.28, haul: { name: 'Haaland', pts: 17 }, flop: null },
    }),
    away: {
      ...base.away,
      players: { top: { name: 'Gabriel', pts: 6 }, share: 0.13, haul: null, flop: { name: 'Isak', pts: 1, xp: 6.2 } },
    },
  })
  assert.match(text, /Haaland hauled 17/)
  assert.match(text, /Isak/)
  assert.match(text, /just 1/)
})

test('player reporting omitted when nothing notable happened', () => {
  const quiet = { top: { name: 'A', pts: 8 }, share: 0.15, haul: null, flop: null }
  const text = joined({
    ...base,
    home: team({ players: quiet }),
    away: { ...base.away, players: { ...quiet, top: { name: 'B', pts: 7 } } },
  })
  assert.doesNotMatch(text, /\bA\b \(8\)/)
})

test('player reporting: losing side haul reads as wasted', () => {
  const text = joined({
    ...base,
    away: {
      ...base.away,
      players: { top: { name: 'Palmer', pts: 19 }, share: 0.42, haul: { name: 'Palmer', pts: 19 }, flop: null },
    },
  })
  assert.match(text, /Palmer's 19 .* deserved more/)
})

test('waiver reporting: winning side rode a claimed player to the result', () => {
  const text = joined({
    ...base,
    home: team({
      manager: 'Nick Mottershead',
      players: { top: { id: 42, name: 'Mbeumo', pts: 16 }, share: 0.28, haul: { id: 42, name: 'Mbeumo', pts: 16 }, flop: null },
      pickup: { star: { name: 'Mbeumo', pts: 16, kind: 'w', gw: 3, recent: true, wasHaul: true } },
    }),
  })
  assert.match(text, /Mbeumo/)
  assert.match(text, /waiver|wire/)
  assert.match(text, /Nick/)
  assert.match(text, /16/)
})

test('waiver reporting: free-agent flop is called out', () => {
  const text = joined({
    ...base,
    away: {
      ...base.away,
      manager: 'Luke Butcher',
      players: { top: { id: 5, name: 'Foden', pts: 3 }, share: 0.12, haul: null, flop: { id: 9, name: 'Isak', pts: 1, xp: 6.5 } },
      pickup: { flop: { name: 'Isak', pts: 1, xp: 6.5, kind: 'f', gw: 2, recent: false } },
    },
  })
  assert.match(text, /Isak/)
  assert.match(text, /free-agent/)
  assert.match(text, /Luke/)
})

test('rivalry is a clause from the second meeting, not a standalone sentence', () => {
  const withRivalry = joined({
    ...base,
    h2h: { games: 2, homeWins: 2, awayWins: 0, draws: 0 },
  })
  assert.match(withRivalry, /season head-to-head|season series|bragging rights/i)
  assert.match(withRivalry, /2–0|2-0/)
  const firstMeeting = joined({
    ...base,
    h2h: { games: 1, homeWins: 1, awayWins: 0, draws: 0 },
  })
  assert.doesNotMatch(firstMeeting, /head-to-head/i)
})

test('rivalry falls back to team names when managers share a first name', () => {
  const text = joined({
    ...base,
    home: team({ name: 'Mordor S.F.G', manager: 'Nick Mottershead' }),
    away: { ...base.away, name: 'Atlético Bilbo', manager: 'Nick Goodacre' },
    h2h: { games: 2, homeWins: 2, awayWins: 0, draws: 0 },
  })
  assert.match(text, /Mordor/)
  assert.match(text, /Atlético/)
  assert.doesNotMatch(text, /Nick.*Nick/)
})

test('draw keeps the series level and uses managers', () => {
  const text = joined({
    ...base,
    home: team({ points: 50, manager: 'Nick Mottershead' }),
    away: { ...base.away, points: 50, manager: 'Luke Butcher' },
    h2h: { games: 3, homeWins: 1, awayWins: 1, draws: 1 },
  })
  assert.match(text, /series|honours even/i)
  assert.match(text, /Nick|Luke/)
})

test('named fixture leads the recap every time the pair meets', () => {
  const warderloo = {
    ...base,
    home: team({ name: 'Toronto Gimli', manager: 'Andy Ward' }),
    away: { ...base.away, name: 'Suffolk Sméagol', manager: 'Jon Ward' },
  }
  const first = matchupRecapSentences({ ...warderloo, h2h: { games: 1, homeWins: 1, awayWins: 0, draws: 0 } })
  assert.match(first[0], /Battle of Warderloo/)
  const second = matchupRecapSentences({ ...warderloo, h2h: { games: 2, homeWins: 1, awayWins: 1, draws: 0 } })
  assert.match(second[0], /Battle of Warderloo/)
})

test('named fixture: Andy vs Goodacre is the Bad Blood Derby', () => {
  const [lead] = matchupRecapSentences({
    ...base,
    home: team({ name: 'Toronto Gimli', manager: 'Andy Ward' }),
    away: { ...base.away, name: 'Atlético Bilbo', manager: 'Nick Goodacre' },
  })
  assert.match(lead, /Bad Blood Derby/)
})

test('named fixture: Higman vs Sutton is the Respect Derby', () => {
  const [lead] = matchupRecapSentences({
    ...base,
    home: team({ name: 'Rokesly Regorasu', manager: 'David Higman' }),
    away: { ...base.away, name: 'Hackney Rohirrim', manager: 'Mike Sutton' },
  })
  assert.match(lead, /Respect Derby/)
})

test('no named-fixture lead for an ordinary pairing', () => {
  const [lead] = matchupRecapSentences({
    ...base,
    home: team({ manager: 'Nick Mottershead' }),
    away: { ...base.away, manager: 'Mike Sutton' },
  })
  assert.doesNotMatch(lead, /Battle|derby/i)
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

test('recaps sprinkle a manager joke when lore exists', () => {
  const text = joined({
    ...base,
    home: team({ manager: 'Eddy Webster' }),
    away: { ...base.away, manager: 'David Higman' },
  })
  assert.match(
    text,
    /thesis|timezone|puzzle|Classic Eddy|waiver|BBC|Glastonbury|devil|people's champion|licence-fee/i,
  )
})

test('no manager fun fact when neither manager has lore', () => {
  for (let gw = 1; gw <= 10; gw++) {
    const text = joined({ ...base, gw })
    assert.doesNotMatch(text, /vegan|Samsung|twins|Titanic Duo/i)
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
  const text = wrap.join(' ')
  assert.match(text, /Bad Blood Derby/)
  assert.match(text, /East Asian Derby/)
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
