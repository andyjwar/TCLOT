import assert from 'node:assert/strict'
import test from 'node:test'
import {
  draftIdFromDetails,
  extractChoicesArray,
  picksFromDraftChoices,
} from './draftChoicesPicks.js'

// Two managers, squad size 2 → 4 picks. Choices reference `entry` = league_entry id.
const leagueEntries = [
  { id: 18279, entry_id: 18269, entry_name: 'Mordor S.F.G' },
  { id: 4259, entry_id: 4258, entry_name: 'Atlético Bilbo' },
]

// João Pedro has a WORSE (higher) draft_rank than Gibbs-White, yet was picked first.
// draft_rank-based reconstruction would wrongly put Gibbs-White in the earlier slot;
// the true /choices log must keep João Pedro at overall pick 1.
const elementById = new Map([
  [165, { id: 165, web_name: 'João Pedro', team: 8, element_type: 4, draft_rank: 14 }],
  [480, { id: 480, web_name: 'Gibbs-White', team: 15, element_type: 3, draft_rank: 8 }],
  [379, { id: 379, web_name: 'Isak', team: 12, element_type: 4, draft_rank: 3 }],
  [427, { id: 427, web_name: 'Mbeumo', team: 13, element_type: 3, draft_rank: 20 }],
])
const teamById = new Map([
  [8, { id: 8, short_name: 'CHE' }],
  [15, { id: 15, short_name: 'NFO' }],
  [12, { id: 12, short_name: 'LIV' }],
  [13, { id: 13, short_name: 'MUN' }],
])

const choices = {
  choices: [
    { index: 1, round: 1, pick: 1, element: 165, entry: 18279, was_auto: false },
    { index: 2, round: 1, pick: 2, element: 379, entry: 4259, was_auto: false },
    { index: 3, round: 2, pick: 1, element: 427, entry: 4259, was_auto: false },
    { index: 4, round: 2, pick: 2, element: 480, entry: 18279, was_auto: false },
  ],
}

test('picksFromDraftChoices honours true pick order, not draft_rank', () => {
  const picks = picksFromDraftChoices(choices, leagueEntries, elementById, teamById, 2)
  assert.ok(Array.isArray(picks))
  assert.equal(picks.length, 4)

  const first = picks[0]
  assert.equal(first.overallPick, 1)
  assert.equal(first.playerName, 'João Pedro')
  assert.equal(first.entryId, 18269) // mapped from league_entry id 18279
  assert.equal(first.leagueEntryId, 18279)
  assert.equal(first.teamName, 'Mordor S.F.G')
  assert.equal(first.teamShort, 'CHE')
  assert.equal(first.pos, 'FWD')

  // Gibbs-White (lower draft_rank) must NOT be the earlier pick.
  const gibbs = picks.find((p) => p.playerName === 'Gibbs-White')
  assert.equal(gibbs.overallPick, 4)
})

test('picksFromDraftChoices tolerates out-of-order and missing round/pick', () => {
  const shuffled = {
    choices: [
      { index: 4, element: 480, entry: 18279 },
      { index: 1, element: 165, entry: 18279 },
      { index: 3, element: 427, entry: 4259 },
      { index: 2, element: 379, entry: 4259 },
    ],
  }
  const picks = picksFromDraftChoices(shuffled, leagueEntries, elementById, teamById, 2)
  assert.deepEqual(
    picks.map((p) => p.overallPick),
    [1, 2, 3, 4],
  )
  assert.equal(picks[0].playerName, 'João Pedro')
  // Derived round/pickInRound from overall index + team count (n = 2).
  assert.equal(picks[2].round, 2)
  assert.equal(picks[2].pickInRound, 1)
})

test('picksFromDraftChoices returns null on a partial board', () => {
  const partial = { choices: choices.choices.slice(0, 3) }
  assert.equal(picksFromDraftChoices(partial, leagueEntries, elementById, teamById, 2), null)
})

test('picksFromDraftChoices returns null when a choice references an unknown manager', () => {
  const foreign = {
    choices: [
      ...choices.choices.slice(0, 3),
      { index: 4, round: 2, pick: 2, element: 480, entry: 99999 },
    ],
  }
  assert.equal(picksFromDraftChoices(foreign, leagueEntries, elementById, teamById, 2), null)
})

test('picksFromDraftChoices returns null for empty / missing input', () => {
  assert.equal(picksFromDraftChoices(null, leagueEntries, elementById, teamById, 2), null)
  assert.equal(picksFromDraftChoices({ choices: [] }, leagueEntries, elementById, teamById, 2), null)
})

test('extractChoicesArray accepts choices / picks / bare array', () => {
  assert.deepEqual(extractChoicesArray([{ a: 1 }]), [{ a: 1 }])
  assert.deepEqual(extractChoicesArray({ choices: [1] }), [1])
  assert.deepEqual(extractChoicesArray({ picks: [2] }), [2])
  assert.equal(extractChoicesArray({ nope: [] }), null)
})

test('draftIdFromDetails prefers the start-event draft, then completed, then first', () => {
  assert.equal(
    draftIdFromDetails({
      league: {
        start_event: 1,
        drafts: [
          { id: 1600, event: 5, draft_completed: null },
          { id: 1669, event: 1, draft_completed: '2026-08-17T14:10:59Z' },
        ],
      },
    }),
    1669,
  )
  assert.equal(
    draftIdFromDetails({
      league: { start_event: 9, drafts: [{ id: 42, event: 1, draft_completed: '2026-01-01' }] },
    }),
    42,
  )
  assert.equal(draftIdFromDetails({ league: { drafts: [] } }), null)
  assert.equal(draftIdFromDetails({}), null)
})
