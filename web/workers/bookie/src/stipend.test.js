import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  applySitoutStipendClawback,
  PAY_STIPEND_SQL,
  paidStipendGameweeks,
  qualifiesForWeeklyStipend,
  sitoutClawbackKey,
  STIPEND_FLOOR,
  weeklyBettorIds,
} from './stipend.js'

test('qualifiesForWeeklyStipend — only bankrolls below the floor', () => {
  assert.equal(STIPEND_FLOOR, 250)
  assert.equal(qualifiesForWeeklyStipend(249), true)
  assert.equal(qualifiesForWeeklyStipend(0), true)
  assert.equal(qualifiesForWeeklyStipend(250), false)
  assert.equal(qualifiesForWeeklyStipend(1000), false)
  assert.equal(qualifiesForWeeklyStipend('199'), true)
  assert.equal(qualifiesForWeeklyStipend(null), false)
})

test('PAY_STIPEND_SQL — credits only balances below the floor', () => {
  assert.match(PAY_STIPEND_SQL, /balance = balance \+ \?/)
  assert.match(PAY_STIPEND_SQL, /balance < \?/)
  assert.doesNotMatch(PAY_STIPEND_SQL, /entry_id IN/)
})

test('weeklyBettorIds — only tickets whose market gw matches', () => {
  const bets = [
    { entry_id: 10, gw: 2 },
    { entry_id: 20, gw: 1 },
    { entry_id: 10, gw: 2 },
    { entry_id: 30, gw: null }, // season-long
  ]
  assert.deepEqual([...weeklyBettorIds(bets, 2)].sort(), [10])
  assert.deepEqual([...weeklyBettorIds(bets, 1)], [20])
  assert.equal(weeklyBettorIds(bets, 3).size, 0)
  assert.equal(weeklyBettorIds(null, 2).size, 0)
})

test('paidStipendGameweeks — parses stipend:season:gw keys', () => {
  assert.deepEqual(
    paidStipendGameweeks(
      ['stipend:2026-27:1', 'stipend:2026-27:2', 'stipend:2025-26:1', 'currentSeason'],
      '2026-27',
    ),
    [1, 2],
  )
  assert.deepEqual(paidStipendGameweeks([], '2026-27'), [])
})

test('applySitoutStipendClawback — debits sit-outs once, then no-ops', async () => {
  const sql = []
  const meta = new Map([
    ['stipend:2026-27:1', 'paid'],
  ])
  const db = {
    prepare(q) {
      let args = []
      return {
        bind(...bound) {
          args = bound
          return this
        },
        async all() {
          sql.push({ q, args })
          return { results: [...meta.keys()].map((k) => ({ k })) }
        },
        async run() {
          sql.push({ q, args })
          return { meta: { changes: 1 } }
        },
      }
    },
  }
  const metaGet = async (_db, k) => meta.get(k) ?? null
  const metaSet = async (_db, k, v) => {
    meta.set(k, v)
  }

  const first = await applySitoutStipendClawback(db, {
    season: '2026-27',
    stipend: 50,
    nowIso: '2026-09-01T00:00:00.000Z',
    metaGet,
    metaSet,
  })
  assert.equal(first, true)
  assert.equal(meta.get(sitoutClawbackKey('2026-27')), '2026-09-01T00:00:00.000Z')
  const debit = sql.find((s) => String(s.q).includes('balance - ?'))
  assert.ok(debit)
  assert.deepEqual(debit.args, [50, '2026-27', '2026-27', 1])

  const second = await applySitoutStipendClawback(db, {
    season: '2026-27',
    stipend: 50,
    nowIso: '2026-09-01T01:00:00.000Z',
    metaGet,
    metaSet,
  })
  assert.equal(second, false)
})
