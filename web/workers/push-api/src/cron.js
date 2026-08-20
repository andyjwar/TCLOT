/**
 * Scheduled + internal notification triggers.
 * Pure helpers are exported for unit tests.
 */

const DRAFT_BOOTSTRAP = 'https://draft.premierleague.com/api/bootstrap-static'

/** @typedef {{ id: number, deadlineMs: number, waiversMs: number | null, isCurrent: boolean, finished: boolean, isNext: boolean, isLive: boolean }} GwEvent */

/**
 * @param {object[]} eventList bootstrap-static events.data
 * @param {number} nowMs
 * @returns {GwEvent[]}
 */
export function parseGwEvents(eventList, nowMs) {
  if (!Array.isArray(eventList)) return []
  const now = Number(nowMs)
  return eventList
    .map((e) => {
      const id = Number(e?.id)
      const deadlineMs = Date.parse(String(e?.deadline_time ?? ''))
      const waiversMs = e?.waivers_time ? Date.parse(String(e.waivers_time)) : null
      if (!Number.isFinite(id) || !Number.isFinite(deadlineMs)) return null
      return {
        id,
        deadlineMs,
        waiversMs: Number.isFinite(waiversMs) ? waiversMs : null,
        isCurrent: e?.is_current === true,
        finished: e?.finished === true,
        isNext: e?.is_next === true,
        isLive: e?.is_live === true,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.id - b.id)
}

/**
 * @param {GwEvent[]} events
 * @param {number} nowMs
 * @returns {{ type: string, gw: number, title: string, body: string, pref: string, dedupKey: string } | null}
 */
export function pickDeadlineReminder(events, nowMs) {
  const now = Number(nowMs)
  const target =
    events.find((e) => e.isNext && !e.finished) ??
    events.find((e) => e.isCurrent && !e.finished) ??
    events.find((e) => !e.finished)

  if (!target) return null

  const msUntil = target.deadlineMs - now
  const oneHour = 60 * 60 * 1000
  const twentyFourHours = 24 * oneHour

  if (msUntil > 0 && msUntil <= oneHour) {
    return {
      type: 'gw_deadline_1h',
      gw: target.id,
      pref: 'gwDeadline',
      dedupKey: `gw_deadline_1h:${target.id}`,
      title: `GW${target.id} deadline in 1 hour`,
      body: 'Set your draft lineup before the Premier League deadline.',
    }
  }

  if (msUntil > oneHour && msUntil <= twentyFourHours) {
    return {
      type: 'gw_deadline_24h',
      gw: target.id,
      pref: 'gwDeadline',
      dedupKey: `gw_deadline_24h:${target.id}`,
      title: `GW${target.id} deadline tomorrow`,
      body: 'Lineup lock is within 24 hours — check Moves and Live before the deadline.',
    }
  }

  return null
}

/**
 * @param {GwEvent[]} events
 * @param {number} nowMs
 */
export function pickGwLiveKickoff(events, nowMs) {
  const now = Number(nowMs)
  const live = events.find((e) => e.isLive || (e.isCurrent && !e.finished))
  if (!live) return null
  if (now < live.deadlineMs) return null
  return {
    type: 'gw_live',
    gw: live.id,
    pref: 'liveKickoff',
    dedupKey: `gw_live:${live.id}`,
    title: `GW${live.id} is live`,
    body: 'Premier League fixtures are underway — open Live for scores and projections.',
  }
}

/**
 * @param {GwEvent[]} events
 * @param {number} nowMs
 */
export function pickWaiverWindow(events, nowMs) {
  const now = Number(nowMs)
  const target =
    events.find((e) => e.isCurrent && !e.finished) ??
    events.find((e) => e.isNext && !e.finished)
  if (!target?.waiversMs) return null

  const msUntil = target.waiversMs - now
  const graceStart = -30 * 60 * 1000
  const graceEnd = 3 * 60 * 60 * 1000
  if (msUntil < graceStart || msUntil > graceEnd) return null

  return {
    type: 'waiver_processed',
    gw: target.id,
    pref: 'waiverResults',
    dedupKey: `waiver_processed:${target.id}`,
    title: `GW${target.id} waivers processed`,
    body: 'Waiver results are in — open Moves to see who changed hands.',
  }
}

/**
 * @param {object} env
 * @param {KVNamespace} kv
 * @param {object[]} subscriptions
 */
export async function runScheduledNotifications(env, kv, subscriptions, deps = {}) {
  const nowMs = deps.nowMs ?? Date.now()
  const fetchBootstrap = deps.fetchBootstrap ?? (async () => {
    const res = await fetch(DRAFT_BOOTSTRAP, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`bootstrap-static ${res.status}`)
    return res.json()
  })
  const markSentOnce = deps.markSentOnce ?? (async (key) => {
    const mod = await import('./subscriptions.js')
    return mod.markSentOnce(kv, key)
  })
  const broadcastPush = deps.broadcastPush ?? (async (notification) => {
    const mod = await import('./send.js')
    return mod.broadcastPush(env, kv, subscriptions, notification)
  })

  const bootstrap = await fetchBootstrap()
  const events = parseGwEvents(bootstrap?.events?.data, nowMs)
  const candidates = [
    pickDeadlineReminder(events, nowMs),
    pickGwLiveKickoff(events, nowMs),
    pickWaiverWindow(events, nowMs),
  ].filter(Boolean)

  const summary = { checked: candidates.length, sent: 0, skipped: 0 }

  for (const candidate of candidates) {
    const shouldSend = await markSentOnce(candidate.dedupKey)
    if (!shouldSend) {
      summary.skipped += 1
      continue
    }
    const result = await broadcastPush({
      title: candidate.title,
      body: candidate.body,
      url: candidate.type === 'waiver_processed' ? '/#/teamSelection' : '/#/fplLive',
      tag: candidate.type,
      pref: candidate.pref,
    })
    summary.sent += result.sent
  }

  return summary
}

/**
 * @param {object} env
 * @param {KVNamespace} kv
 * @param {object[]} subscriptions
 * @param {{ type: string, gw?: number, title?: string, body?: string, entryId?: number }} payload
 */
export async function runInternalNotification(env, kv, subscriptions, payload) {
  const { broadcastPush } = await import('./send.js')
  const { markSentOnce } = await import('./subscriptions.js')

  const gw = Number(payload.gw)
  const type = String(payload.type ?? 'custom')

  let notification
  if (type === 'waiver_processed' && Number.isFinite(gw)) {
    notification = {
      title: payload.title ?? `GW${gw} waivers processed`,
      body: payload.body ?? 'Waiver results are in — open Moves to see who changed hands.',
      url: '/#/teamSelection',
      tag: 'waiver_processed',
      pref: 'waiverResults',
    }
    const dedupKey = `waiver_processed:${gw}`
    if (!(await markSentOnce(dedupKey))) {
      return { sent: 0, skipped: 1, deduped: true }
    }
  } else if (type === 'test') {
    notification = {
      title: payload.title ?? 'TCLOT test notification',
      body: payload.body ?? 'Web push from the TCLOT web app is working.',
      url: '/',
      tag: 'test',
    }
  } else {
    throw new Error(`Unknown notification type: ${type}`)
  }

  return broadcastPush(env, kv, subscriptions, notification)
}
