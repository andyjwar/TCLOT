import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  benchWeek,
  draftPickFor,
  formThrough,
  indexRecapSite,
  playerPriorPts,
  titleModelFor,
} from './recapSiteContext.js'

const site = indexRecapSite({
  benchPoints: {
    teams: [
      {
        leagueEntryId: 18279,
        weeks: [
          { gw: 1, benchLeft: 11, leftOnBench: [{ id: 68, name: 'Tavernier', pts: 10 }] },
        ],
      },
    ],
  },
  seasonPredictions: {
    current: {
      teams: [{ leagueEntryId: 6849, titlePct: 31.9, lastPct: 1.5 }],
    },
  },
  draftPicks: {
    picks: [{ element: 165, overallPick: 44, playerName: 'João Pedro' }],
  },
  historyByGw: {
    1: { h2h: [{ xi1: [{ id: 165, name: 'João Pedro', pts: 4 }], xi2: [] }] },
  },
  matches: [
    {
      finished: true,
      event: 1,
      league_entry_1: 6849,
      league_entry_2: 44904,
      league_entry_1_points: 55,
      league_entry_2_points: 38,
    },
    {
      finished: true,
      event: 2,
      league_entry_1: 6849,
      league_entry_2: 18279,
      league_entry_1_points: 48,
      league_entry_2_points: 40,
    },
  ],
})

test('indexes bench, draft, title model and prior player weeks', () => {
  assert.equal(benchWeek(site, 18279, 1).benchLeft, 11)
  assert.equal(draftPickFor(site, 165).overallPick, 44)
  assert.equal(titleModelFor(site, 6849).titlePct, 31.9)
  assert.deepEqual(playerPriorPts(site, 165, 2), [{ gw: 1, pts: 4 }])
})

test('formThrough is inclusive on recap and exclusive on preview', () => {
  const recap = formThrough(site, 6849, 2, false)
  assert.equal(recap.w, 2)
  assert.equal(recap.played, 2)
  const preview = formThrough(site, 6849, 2, true)
  assert.equal(preview.w, 1)
  assert.equal(preview.played, 1)
})
