import assert from 'node:assert/strict'
import test from 'node:test'
import {
  dcThresholdReached,
  formatKickoffLabel,
  liveFixtureLead,
  liveGroupStatus,
  liveGwProgress,
  minutesTone,
  playerLiveState,
  playerXiPillKind,
  rowsByPointsContributed,
  teamInitials,
} from './liveScoresDerivations.js'

test('liveFixtureLead — strict winner / tie / null branches', () => {
  assert.equal(liveFixtureLead(67, 61), 'home')
  assert.equal(liveFixtureLead(38, 52), 'away')
  assert.equal(liveFixtureLead(45, 45), 'tie')
  assert.equal(liveFixtureLead(null, 4), null)
  assert.equal(liveFixtureLead(4, null), null)
  assert.equal(liveFixtureLead(undefined, undefined), null)
  assert.equal(liveFixtureLead('not-a-number', 4), null)
})

test('dcThresholdReached — GK/DEF 10+, MID/FWD 12+, unknown false', () => {
  assert.equal(dcThresholdReached('GK', 10), true)
  assert.equal(dcThresholdReached('GK', 9), false)
  assert.equal(dcThresholdReached('GKP', 10), true)
  assert.equal(dcThresholdReached('DEF', 10), true)
  assert.equal(dcThresholdReached('DEF', 9), false)
  assert.equal(dcThresholdReached('MID', 12), true)
  assert.equal(dcThresholdReached('MID', 11), false)
  assert.equal(dcThresholdReached('FWD', 12), true)
  assert.equal(dcThresholdReached('FWD', 11), false)
  assert.equal(dcThresholdReached('MNG', 99), false)
  assert.equal(dcThresholdReached(null, 99), false)
  assert.equal(dcThresholdReached('def', 10), true, 'case-insensitive position')
  assert.equal(dcThresholdReached('FWD', null), false)
})

test('playerXiPillKind — maps ESPN matchday role; defaults to xi', () => {
  assert.equal(playerXiPillKind({ espnMatchdayRole: 'xi' }), 'xi')
  assert.equal(playerXiPillKind({ espnMatchdayRole: 'bench' }), 'bench')
  assert.equal(playerXiPillKind({ espnMatchdayRole: 'absent' }), 'absent')
  assert.equal(playerXiPillKind({ espnMatchdayRole: null }), 'xi')
  assert.equal(playerXiPillKind({}), 'xi')
  assert.equal(playerXiPillKind(null), 'xi')
})

test('playerLiveState — on pitch shows red minute counter', () => {
  const out = playerLiveState({
    minutes: 47,
    clubGwFixturesFinished: false,
    hasGwFixture: true,
  })
  assert.equal(out.kind, 'live')
  assert.equal(out.text, "47'")
})

test('playerLiveState — FT when club finished and played', () => {
  const out = playerLiveState({
    minutes: 90,
    clubGwFixturesFinished: true,
    hasGwFixture: true,
  })
  assert.equal(out.kind, 'ft')
  assert.equal(out.text, 'FT')
})

test('playerLiveState — DNP when club finished and 0 minutes', () => {
  const out = playerLiveState({
    minutes: 0,
    clubGwFixturesFinished: true,
    hasGwFixture: true,
  })
  assert.equal(out.kind, 'dnp')
  assert.equal(out.text, 'DNP')
})

test('playerLiveState — pre-kickoff uses kickoff label when available', () => {
  const out = playerLiveState({
    minutes: 0,
    clubGwFixturesFinished: false,
    hasGwFixture: true,
    kickoffLabel: 'Sat 16:30',
  })
  assert.equal(out.kind, 'pre')
  assert.equal(out.text, 'Sat 16:30')
})

test('playerLiveState — blank-week club shows dash', () => {
  const out = playerLiveState({
    minutes: 0,
    clubGwFixturesFinished: false,
    hasGwFixture: false,
  })
  assert.equal(out.kind, 'none')
  assert.equal(out.text, '—')
})

test('formatKickoffLabel — same day drops weekday', () => {
  const now = new Date('2026-03-08T10:00:00Z')
  const label = formatKickoffLabel('2026-03-08T16:30:00Z', now)
  assert.ok(label, 'expected a non-null label')
  // Same-day label is just HH:MM. No assumption about the host TZ — but it
  // should never contain a 3-letter weekday prefix on the same calendar day.
  assert.ok(!/^[A-Z][a-z]{2}\s/.test(label), `same-day label "${label}" should drop weekday`)
})

test('formatKickoffLabel — different day shows weekday', () => {
  const now = new Date('2026-03-07T10:00:00Z')
  const label = formatKickoffLabel('2026-03-08T16:30:00Z', now)
  assert.ok(label, 'expected a non-null label')
  // We only check that the label has a leading weekday-like token —
  // the rest depends on the host locale / timezone offset.
  assert.ok(/^[A-Z][a-z]{2}\s/.test(label), `cross-day label "${label}" should start with weekday`)
})

test('formatKickoffLabel — invalid / missing returns null', () => {
  assert.equal(formatKickoffLabel(null), null)
  assert.equal(formatKickoffLabel(''), null)
  assert.equal(formatKickoffLabel('not-a-date'), null)
})

test('liveGroupStatus — pre when deadline future and no fixtures started', () => {
  const out = liveGroupStatus({
    eventSnapshot: {
      id: 28,
      finished: false,
      deadline_time: '2026-03-08T13:30:00Z',
    },
    gwFixtures: [],
    now: new Date('2026-03-08T10:00:00Z'),
  })
  assert.equal(out.kind, 'pre')
  assert.equal(out.chipLabel, 'GW 28 · Upcoming')
})

test('liveGroupStatus — live when at least one fixture started, with progress', () => {
  const fixtures = [
    { started: true, finished: true, finished_provisional: true },
    { started: true, finished: false, finished_provisional: false },
    { started: false, finished: false, finished_provisional: false },
    { started: false, finished: false, finished_provisional: false },
  ]
  const out = liveGroupStatus({
    eventSnapshot: {
      id: 28,
      finished: false,
      deadline_time: '2026-03-08T13:30:00Z',
    },
    gwFixtures: fixtures,
    liveFixtureCount: 1,
    minute: 32,
    now: new Date('2026-03-08T15:00:00Z'),
  })
  assert.equal(out.kind, 'live')
  assert.equal(out.chipLabel, 'Live · GW 28')
  assert.equal(out.progress, '1 of 4 fixtures complete')
  assert.equal(out.meta, '1 fixture live · 32′')
})

test('liveGroupStatus — live with multiple live fixtures uses plural', () => {
  const out = liveGroupStatus({
    eventSnapshot: { id: 28, finished: false },
    gwFixtures: [{ started: true }, { started: true }],
    liveFixtureCount: 2,
    minute: null,
    now: new Date('2026-03-08T15:00:00Z'),
  })
  assert.equal(out.kind, 'live')
  assert.equal(out.meta, '2 fixtures live')
})

test('liveGroupStatus — ft when event marked finished', () => {
  const out = liveGroupStatus({
    eventSnapshot: { id: 28, finished: true },
    gwFixtures: [{ finished: true }, { finished: true }],
    now: new Date('2026-03-10T15:00:00Z'),
  })
  assert.equal(out.kind, 'ft')
  assert.equal(out.chipLabel, 'Final · GW 28')
})

test('liveGroupStatus — ft when every classic fixture is finished even if event flag lags', () => {
  const out = liveGroupStatus({
    eventSnapshot: { id: 28, finished: false },
    gwFixtures: [
      { finished: true },
      { finished_provisional: true },
    ],
    now: new Date('2026-03-10T15:00:00Z'),
  })
  assert.equal(out.kind, 'ft')
})

test('liveGroupStatus — missing event id renders bare GW label', () => {
  const out = liveGroupStatus({})
  assert.equal(out.kind, 'pre')
  assert.equal(out.chipLabel, 'GW · Upcoming')
})

test('rowsByPointsContributed — descending by points; ties broken by mins/pickPosition', () => {
  const rows = [
    { pickPosition: 1, total_points: 4, minutes: 90 },
    { pickPosition: 2, total_points: 18, minutes: 67 },
    { pickPosition: 3, total_points: 0, minutes: 0 },
    { pickPosition: 4, total_points: 4, minutes: 70 }, // ties with #1 on pts
  ]
  const sorted = rowsByPointsContributed(rows).map((r) => r.pickPosition)
  assert.deepEqual(sorted, [2, 1, 4, 3])
})

test('liveGwProgress — counts finished + finished_provisional, slash label', () => {
  const out = liveGwProgress([
    { finished: true },
    { finished: false, finished_provisional: true },
    { finished: false },
    { finished: false },
  ])
  assert.deepEqual(out, { done: 2, total: 4, label: '2/4 done' })
})

test('liveGwProgress — 0 done renders 0/N', () => {
  const out = liveGwProgress([{ finished: false }, { finished: false }])
  assert.deepEqual(out, { done: 0, total: 2, label: '0/2 done' })
})

test('liveGwProgress — empty / null returns null', () => {
  assert.equal(liveGwProgress([]), null)
  assert.equal(liveGwProgress(null), null)
  assert.equal(liveGwProgress(undefined), null)
})

test('minutesTone — 5-bucket tinting matches mockup minTone', () => {
  assert.equal(minutesTone(90), 'full')
  assert.equal(minutesTone(89), 'full')
  assert.equal(minutesTone(88), 'good')
  assert.equal(minutesTone(60), 'good')
  assert.equal(minutesTone(59), 'partial')
  assert.equal(minutesTone(30), 'partial')
  assert.equal(minutesTone(29), 'low')
  assert.equal(minutesTone(1), 'low')
  assert.equal(minutesTone(0), 'none')
  assert.equal(minutesTone(null), 'none')
  assert.equal(minutesTone(45, false), 'none', 'played=false forces none')
})

test('teamInitials — words → first letters; single word → first 2', () => {
  assert.equal(teamInitials('Crouch End Oashisu'), 'CE')
  assert.equal(teamInitials('Toronto'), 'TO')
  assert.equal(teamInitials(''), '?')
  assert.equal(teamInitials(null), '?')
})
