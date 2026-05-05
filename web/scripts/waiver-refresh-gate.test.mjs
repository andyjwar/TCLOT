import assert from 'node:assert/strict'
import test from 'node:test'
import { postDeadlineIngestEvent } from './waiver-refresh-gate.mjs'

test('postDeadlineIngestEvent — allows ingest after finished GW deadline', () => {
  const dl = '2026-05-01T17:30:00Z'
  const now = Date.parse(dl) + 3 * 60 * 60 * 1000
  const hit = postDeadlineIngestEvent(
    [
      { id: 34, finished: true, deadline_time: '2026-04-24T17:30:00Z' },
      { id: 35, finished: true, deadline_time: dl },
      { id: 36, finished: false, deadline_time: '2026-05-09T10:00:00Z' },
    ],
    now,
  )
  assert.equal(hit?.id, 35)
})

test('postDeadlineIngestEvent — skips before deadline + grace', () => {
  const dl = '2026-05-01T17:30:00Z'
  const now = Date.parse(dl) + 30 * 60 * 1000
  assert.equal(
    postDeadlineIngestEvent([{ id: 35, finished: true, deadline_time: dl }], now),
    null,
  )
})

test('postDeadlineIngestEvent — skips when next GW deadline is imminent', () => {
  const dl35 = '2026-05-01T17:30:00Z'
  const dl36 = '2026-05-09T10:00:00Z'
  const now = Date.parse(dl36) - 2 * 60 * 60 * 1000
  assert.equal(
    postDeadlineIngestEvent(
      [
        { id: 35, finished: true, deadline_time: dl35 },
        { id: 36, finished: false, deadline_time: dl36 },
      ],
      now,
    ),
    null,
  )
})
