import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildJoinedGameweekMap } from './draftBoardRosterStatus.js'

describe('buildJoinedGameweekMap', () => {
  it('seeds draft picks at startGw and upgrades on later waiver', () => {
    const draftPicks = {
      _meta: { startGw: 1 },
      picks: [
        { entryId: 10, element: 100 },
        { entryId: 10, element: 200 },
      ],
    }
    const transactions = {
      transactions: [
        {
          kind: 'w',
          result: 'a',
          entry: 10,
          element_in: 300,
          element_out: 200,
          event: 3,
        },
        // Rejected — ignored
        {
          kind: 'w',
          result: 'di',
          entry: 10,
          element_in: 400,
          element_out: 100,
          event: 2,
        },
      ],
    }
    const map = buildJoinedGameweekMap(transactions, { trades: [] }, draftPicks)
    assert.deepEqual(map.get('10:100'), { gw: 1, kind: 'draft' })
    assert.deepEqual(map.get('10:300'), { gw: 3, kind: 'transfer' })
    // Dropped player keeps draft seed unless someone else owns them —
    // join map tracks join events, not current ownership.
    assert.deepEqual(map.get('10:200'), { gw: 1, kind: 'draft' })
    assert.equal(map.has('10:400'), false)
  })

  it('records trade joins for the offering and receiving entries', () => {
    const trades = {
      trades: [
        {
          state: 'p',
          event: 5,
          offered_entry: 10,
          received_entry: 20,
          tradeitem_set: [{ element_out: 111, element_in: 222 }],
        },
      ],
    }
    const map = buildJoinedGameweekMap({ transactions: [] }, trades, {
      _meta: { startGw: 1 },
      picks: [],
    })
    assert.deepEqual(map.get('10:222'), { gw: 5, kind: 'trade' })
    assert.deepEqual(map.get('20:111'), { gw: 5, kind: 'trade' })
  })
})
