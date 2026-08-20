import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_PUSH_PREFS,
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
    const next = writePushPrefs({ liveKickoff: false })
    assert.equal(next.liveKickoff, false)
    assert.equal(next.gwDeadline, DEFAULT_PUSH_PREFS.gwDeadline)
  })
})

describe('urlBase64ToUint8Array', () => {
  it('round-trips a short key', () => {
    const original = new Uint8Array([1, 2, 3, 4])
    const b64 = Buffer.from(original).toString('base64url')
    const out = urlBase64ToUint8Array(b64)
    assert.deepEqual(Array.from(out), Array.from(original))
  })
})

describe('readPushPrefs', () => {
  it('returns defaults without window', () => {
    const prefs = readPushPrefs()
    assert.equal(prefs.waiverResults, true)
  })
})
