import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseGwEvents,
  pickDeadlineReminder,
  pickGwLiveKickoff,
  pickWaiverWindow,
} from './cron.js'

const events = parseGwEvents(
  [
    {
      id: 5,
      deadline_time: '2026-08-23T10:00:00Z',
      waivers_time: '2026-08-24T08:00:00Z',
      is_next: true,
      finished: false,
    },
    {
      id: 4,
      deadline_time: '2026-08-16T10:00:00Z',
      waivers_time: '2026-08-17T08:00:00Z',
      finished: true,
    },
  ],
  Date.parse('2026-08-22T10:30:00Z'),
)

describe('parseGwEvents', () => {
  it('parses draft bootstrap rows', () => {
    assert.equal(events.length, 2)
    assert.equal(events[1].id, 5)
    assert.equal(events[1].isNext, true)
  })
})

describe('pickDeadlineReminder', () => {
  it('returns 24h reminder inside the window', () => {
    const now = Date.parse('2026-08-22T10:30:00Z')
    const pick = pickDeadlineReminder(events, now)
    assert.ok(pick)
    assert.equal(pick.type, 'gw_deadline_24h')
    assert.equal(pick.gw, 5)
  })

  it('returns 1h reminder near deadline', () => {
    const now = Date.parse('2026-08-23T09:15:00Z')
    const pick = pickDeadlineReminder(events, now)
    assert.ok(pick)
    assert.equal(pick.type, 'gw_deadline_1h')
  })
})

describe('pickGwLiveKickoff', () => {
  it('fires after deadline for live GW', () => {
    const liveEvents = parseGwEvents(
      [
        {
          id: 5,
          deadline_time: '2026-08-23T10:00:00Z',
          is_current: true,
          is_live: true,
          finished: false,
        },
      ],
      Date.parse('2026-08-23T12:00:00Z'),
    )
    const pick = pickGwLiveKickoff(liveEvents, Date.parse('2026-08-23T12:00:00Z'))
    assert.ok(pick)
    assert.equal(pick.type, 'gw_live')
  })
})

describe('pickWaiverWindow', () => {
  it('fires shortly after waivers_time', () => {
    const pick = pickWaiverWindow(events, Date.parse('2026-08-24T08:20:00Z'))
    assert.ok(pick)
    assert.equal(pick.type, 'waiver_processed')
    assert.equal(pick.gw, 5)
  })
})
