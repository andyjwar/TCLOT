import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  recapMenuLabelForStatus,
  defaultRecapView,
  defaultModeForGw,
  lineupsAreLocked,
  visibleRecapOptions,
  gwDeadlineHasPassed,
  mergeRecapOptions,
  provisionalRecapFromMatches,
  refreshRecapFromLiveScores,
} from './weeklyRecapView.js'

const gw1 = { gw: 1, recap: {}, preview: {} }
const gw2 = { gw: 2, recap: null, preview: {} }
const options = [gw1, gw2]

const bootstrap = {
  events: {
    data: [{ id: 2, deadline_time: '2026-08-28T17:30:00Z' }],
  },
}

test('menu label is Recap until the GW is live, then Preview', () => {
  assert.equal(recapMenuLabelForStatus('idle'), 'Recap')
  assert.equal(recapMenuLabelForStatus('pre-season'), 'Recap')
  assert.equal(recapMenuLabelForStatus('unknown'), 'Recap')
  assert.equal(recapMenuLabelForStatus('live'), 'Preview')
})

test('lineupsAreLocked is only true while a GW is live', () => {
  assert.equal(lineupsAreLocked('live'), true)
  assert.equal(lineupsAreLocked('idle'), false)
  assert.equal(lineupsAreLocked('pre-season'), false)
})

test('idle hides the unfinished upcoming preview (copied-forward XIs)', () => {
  assert.deepEqual(
    visibleRecapOptions(options, { upcomingGw: 2, liveStatus: 'idle' }),
    [gw1],
  )
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: 1,
      upcomingGw: 2,
      liveStatus: 'idle',
      options,
    }),
    { gw: 1, mode: 'recap', menuLabel: 'Recap' },
  )
})

test('live (deadline passed) defaults to the upcoming Preview', () => {
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: 1,
      upcomingGw: 2,
      liveStatus: 'live',
      options,
    }),
    { gw: 2, mode: 'preview', menuLabel: 'Preview' },
  )
})

test('upcoming recap written → Recap of that week', () => {
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: 2,
      upcomingGw: 2,
      liveStatus: 'idle',
      options: [{ gw: 2, recap: {}, preview: {} }],
    }),
    { gw: 2, mode: 'recap', menuLabel: 'Recap' },
  )
})

test('no upcoming week uses last finished recap', () => {
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: 1,
      upcomingGw: null,
      liveStatus: 'idle',
      options: [gw1],
    }),
    { gw: 1, mode: 'recap', menuLabel: 'Recap' },
  )
})

test('defaultModeForGw: unfinished is preview, finished is recap', () => {
  assert.equal(defaultModeForGw(gw2), 'preview')
  assert.equal(defaultModeForGw(gw1), 'recap')
  assert.equal(defaultModeForGw(null), 'recap')
})

const entries = [
  { id: 10, entry_name: 'Home FC', player_first_name: 'Ada', player_last_name: 'Lovelace' },
  { id: 20, entry_name: 'Away FC', player_first_name: 'Alan', player_last_name: 'Turing' },
]
const finishedGw2 = [
  {
    event: 2,
    finished: true,
    league_entry_1: 10,
    league_entry_2: 20,
    league_entry_1_points: 46,
    league_entry_2_points: 42,
  },
]

test('provisionalRecapFromMatches builds scores when the baked recap is missing', () => {
  const recap = provisionalRecapFromMatches(finishedGw2, entries, 2)
  assert.equal(recap.gw, 2)
  assert.equal(recap.provisional, true)
  assert.equal(recap.matchups.length, 1)
  assert.equal(recap.matchups[0].home.points, 46)
  assert.equal(recap.matchups[0].away.points, 42)
  assert.equal(recap.matchups[0].winner, 10)
  assert.ok(recap.matchups[0].sentences.length > 0)
  assert.equal(recap.superlatives.weekHigh.points, 46)
})

test('mergeRecapOptions fills a missing GW2 recap from finished H2H rows', () => {
  const data = {
    lastFinishedGw: 1,
    upcomingGw: 2,
    gameweeks: [{ gw: 1, matchups: [] }],
    previews: [{ gw: 2, matchups: [] }],
  }
  const merged = mergeRecapOptions(data, {
    matches: finishedGw2,
    leagueEntries: entries,
    lastFinishedGw: 2,
  })
  const gw2 = merged.find((g) => g.gw === 2)
  assert.ok(gw2.recap)
  assert.equal(gw2.recap.provisional, true)
  assert.equal(gw2.preview.matchups.length, 0)
  assert.deepEqual(
    defaultRecapView({
      lastFinishedGw: 2,
      upcomingGw: 2,
      liveStatus: 'idle',
      options: merged,
    }),
    { gw: 2, mode: 'recap', menuLabel: 'Recap' },
  )
})

test('refreshRecapFromLiveScores lifts 9–31 leftovers using official H2H + Mitchell 15', () => {
  const baked = {
    gw: 3,
    model: { hits: 1, misses: 0, draws: 0, calls: [] },
    superlatives: { weekHigh: { name: 'Atlético Bilbo', points: 31 } },
    matchups: [
      {
        home: {
          entryId: 30728,
          name: 'Seoul Shire',
          points: 9,
          rank: 8,
          players: { top: { name: 'Mitchell', pts: 15 }, share: 0.375, haul: { name: 'Mitchell', pts: 15 } },
        },
        away: {
          entryId: 4259,
          name: 'Atlético Bilbo',
          points: 31,
          rank: 7,
          players: { top: { name: 'Isak', pts: 13 }, share: 0.302, haul: { name: 'Isak', pts: 13 } },
        },
        winner: 4259,
        margin: 22,
        odds: { favoriteSide: 'away', favoritePct: 53, outcome: 'hit' },
        sentences: ['Atlético Bilbo shaded Seoul Shire 31–9 in the coin-flip the model had at 53–47.'],
      },
    ],
  }
  const liveMatches = [
    {
      event: 3,
      finished: true,
      league_entry_1: 30728,
      league_entry_2: 4259,
      league_entry_1_points: 40,
      league_entry_2_points: 43,
    },
  ]
  const out = refreshRecapFromLiveScores(baked, liveMatches, [
    { id: 30728, entry_name: 'Seoul Shire', player_first_name: 'Luke', player_last_name: 'Butcher' },
    { id: 4259, entry_name: 'Atlético Bilbo', player_first_name: 'Nick', player_last_name: 'Goodacre' },
  ])
  assert.equal(out.matchups[0].home.points, 40)
  assert.equal(out.matchups[0].away.points, 43)
  assert.equal(out.matchups[0].margin, 3)
  assert.match(out.matchups[0].sentences[0], /43–40|40/)
})

test('mergeRecapOptions refreshes a stale baked GW3 recap from live H2H', () => {
  const data = {
    lastFinishedGw: 3,
    gameweeks: [
      {
        gw: 3,
        matchups: [
          {
            home: {
              entryId: 10,
              name: 'Home FC',
              points: 9,
              players: { top: { name: 'Mitchell', pts: 15 }, share: 0.375 },
            },
            away: {
              entryId: 20,
              name: 'Away FC',
              points: 31,
              players: { top: { name: 'Isak', pts: 13 }, share: 0.302 },
            },
            winner: 20,
            sentences: ['stale 31–9'],
          },
        ],
      },
    ],
  }
  const merged = mergeRecapOptions(data, {
    matches: [
      {
        event: 3,
        finished: true,
        league_entry_1: 10,
        league_entry_2: 20,
        league_entry_1_points: 40,
        league_entry_2_points: 43,
      },
    ],
    leagueEntries: entries,
    lastFinishedGw: 3,
  })
  const gw3 = merged.find((g) => g.gw === 3)
  assert.equal(gw3.recap.matchups[0].home.points, 40)
  assert.equal(gw3.recap.matchups[0].away.points, 43)
})

test('gwDeadlineHasPassed follows bootstrap deadline_time', () => {
  assert.equal(
    gwDeadlineHasPassed(bootstrap, 2, Date.parse('2026-08-28T17:29:59Z')),
    false,
  )
  assert.equal(
    gwDeadlineHasPassed(bootstrap, 2, Date.parse('2026-08-28T17:30:00Z')),
    true,
  )
})
