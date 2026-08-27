import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FRESH_START_KEY, applyFreshStart } from './freshStart.js'

function mockDb({ flagged = false, users = [], bets = 2 } = {}) {
  const meta = new Map(flagged ? [[FRESH_START_KEY, 'already']] : [])
  const state = {
    users: users.map((u) => ({ ...u })),
    bets,
    meta,
    sql: [],
  }
  const db = {
    async batch(stmts) {
      for (const stmt of stmts) await stmt.run()
    },
    prepare(sql) {
      let args = []
      return {
        bind(...bound) {
          args = bound
          return this
        },
        async run() {
          state.sql.push({ sql, args })
          if (sql.startsWith('DELETE FROM bets')) state.bets = 0
          if (sql.startsWith('UPDATE users SET balance')) {
            state.users = state.users.map((u) => ({ ...u, balance: args[0] }))
          }
          return { meta: { changes: 1 } }
        },
      }
    },
  }
  const metaGet = async (database, k) => database === db ? (meta.get(k) ?? null) : null
  const metaSet = async (database, k, v) => {
    if (database === db) meta.set(k, v)
  }
  return { db, state, metaGet, metaSet }
}

test('applyFreshStart wipes bets and resets balances once', async () => {
  const { db, state, metaGet, metaSet } = mockDb({
    users: [
      { entryId: 1, balance: 815 },
      { entryId: 2, balance: 1240 },
    ],
    bets: 5,
  })
  const first = await applyFreshStart(db, {
    startingBalance: 1000,
    nowIso: '2026-08-27T00:00:00.000Z',
    metaGet,
    metaSet,
  })
  assert.equal(first, true)
  assert.equal(state.bets, 0)
  assert.deepEqual(
    state.users.map((u) => u.balance),
    [1000, 1000],
  )
  assert.equal(state.meta.get(FRESH_START_KEY), '2026-08-27T00:00:00.000Z')

  const second = await applyFreshStart(db, {
    startingBalance: 1000,
    nowIso: '2026-08-27T01:00:00.000Z',
    metaGet,
    metaSet,
  })
  assert.equal(second, false)
  assert.equal(state.bets, 0)
  assert.equal(state.sql.filter((s) => s.sql.startsWith('DELETE FROM bets')).length, 1)
})

test('applyFreshStart no-ops when the fresh-start key is already set', async () => {
  const { db, state, metaGet, metaSet } = mockDb({
    flagged: true,
    users: [{ entryId: 1, balance: 815 }],
    bets: 3,
  })
  const ran = await applyFreshStart(db, {
    startingBalance: 1000,
    nowIso: '2026-08-27T00:00:00.000Z',
    metaGet,
    metaSet,
  })
  assert.equal(ran, false)
  assert.equal(state.bets, 3)
  assert.equal(state.users[0].balance, 815)
})
