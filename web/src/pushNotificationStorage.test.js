import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PUSH_PREFS,
  PUSH_PREFS_STORAGE_KEY,
  readPushPrefs,
  resolvePushApiBase,
  resolveVapidPublicKey,
  urlBase64ToUint8Array,
  writePushPrefs,
} from './pushNotificationStorage.js'

describe('resolvePushApiBase', () => {
  it('returns empty when unset', () => {
    assert.equal(resolvePushApiBase(''), '')
  })

  it('strips trailing slash', () => {
    assert.equal(resolvePushApiBase('https://push.example.dev/'), 'https://push.example.dev')
  })
})

describe('resolveVapidPublicKey', () => {
  it('trims env value', () => {
    assert.equal(resolveVapidPublicKey('  abc  '), 'abc')
  })
})

describe('writePushPrefs', () => {
  it('merges partial updates', () => {
    const next = writePushPrefs({ liveXi: false })
    assert.equal(next.liveXi, false)
    assert.equal(next.deadlineReminders, DEFAULT_PUSH_PREFS.deadlineReminders)
  })
})

describe('urlBase64ToUint8Array', () => {
  it('round-trips a short key', () => {
    const original = new Uint8Array([1, 2, 3, 4])
    // base64url of [1,2,3,4] is 'AQIDBA' (no padding, url-safe alphabet)
    const out = urlBase64ToUint8Array('AQIDBA')
    assert.deepEqual(Array.from(out), Array.from(original))
  })
})

describe('readPushPrefs', () => {
  it('returns defaults without window', () => {
    const prefs = readPushPrefs()
    assert.equal(prefs.waiverResults, true)
  })

  it('keeps deadline reminders on when only the legacy gwDeadline key is set', () => {
    const originalWindow = globalThis.window
    const store = { [PUSH_PREFS_STORAGE_KEY]: JSON.stringify({ gwDeadline: true, waiverResults: false }) }
    globalThis.window = {
      localStorage: {
        getItem: (k) => store[k] ?? null,
        setItem: (k, v) => {
          store[k] = String(v)
        },
        removeItem: (k) => {
          delete store[k]
        },
      },
    }
    try {
      const prefs = readPushPrefs()
      assert.equal(prefs.deadlineReminders, true)
      assert.equal(prefs.waiverResults, false)
      assert.equal(prefs.liveXi, true)
    } finally {
      if (originalWindow === undefined) delete globalThis.window
      else globalThis.window = originalWindow
    }
  })
})
