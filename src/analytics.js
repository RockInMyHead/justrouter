import { getToken } from './auth.js'

const VISITOR_KEY = 'justrouter_visitor_id'
const SESSION_KEY = 'justrouter_analytics_session'

function getStorage(storage, key) {
  try { return storage.getItem(key) } catch { return null }
}

function setStorage(storage, key, value) {
  try { storage.setItem(key, value) } catch {}
}

function getRandomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `jr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function getAnalyticsVisitorId() {
  if (typeof window === 'undefined') return 'server'
  const existing = getStorage(window.localStorage, VISITOR_KEY)
  if (existing) return existing
  const next = getRandomId()
  setStorage(window.localStorage, VISITOR_KEY, next)
  return next
}

export function getAnalyticsSessionId() {
  if (typeof window === 'undefined') return 'server'
  const existing = getStorage(window.sessionStorage, SESSION_KEY)
  if (existing) return existing
  const next = getRandomId()
  setStorage(window.sessionStorage, SESSION_KEY, next)
  return next
}

function buildBasePayload(eventType, extra = {}) {
  if (typeof window === 'undefined') return null
  const path = `${window.location.pathname}${window.location.search}`
  return {
    visitor_id: getAnalyticsVisitorId(),
    session_id: getAnalyticsSessionId(),
    event_type: eventType,
    path,
    referrer: document.referrer || '',
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
    ...extra,
  }
}

export function sendAnalyticsEvent(eventType, extra = {}) {
  const payload = buildBasePayload(eventType, extra)
  if (!payload) return
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const body = JSON.stringify(payload)

  if (!token && navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon('/api/analytics/events', blob)) return
    } catch {}
  }

  fetch('/api/analytics/events', { method: 'POST', headers, body, keepalive: true, credentials: 'same-origin' }).catch(() => {})
}

export function trackClick(extra = {}) { sendAnalyticsEvent('click', extra) }
export function trackScroll(extra = {}) { sendAnalyticsEvent('scroll', extra) }

// ── Mouse movement tracking (throttled) ──
let mMoveTimer = null
let mMoveBatch = []
const MOVE_INTERVAL = 500
const MAX_MOVE_BATCH = 50

export function onMouseMove(x, y, scrollY) {
  mMoveBatch.push({ x, y, s: scrollY, t: Date.now() })
  if (mMoveBatch.length >= MAX_MOVE_BATCH) flushMouseMoves()
  if (!mMoveTimer) { mMoveTimer = setTimeout(flushMouseMoves, MOVE_INTERVAL) }
}

function flushMouseMoves() {
  mMoveTimer = null
  if (mMoveBatch.length === 0) return
  const batch = mMoveBatch
  mMoveBatch = []
  const avgX = Math.round(batch.reduce((s, v) => s + v.x, 0) / batch.length)
  const avgY = Math.round(batch.reduce((s, v) => s + v.y, 0) / batch.length)
  sendAnalyticsEvent('mousemove', {
    x: avgX, y: avgY, scroll_y: batch[batch.length - 1].s,
    metadata: JSON.stringify({ samples: batch, count: batch.length }),
  })
}

// ── Rage click detection ──
const rageClicks = new Map()
const RAGE_WINDOW = 1500
const RAGE_THRESHOLD = 4

export function trackRageClick(elementSelector, x, y) {
  const now = Date.now()
  const timestamps = rageClicks.get(elementSelector) || []
  const recent = timestamps.filter(t => now - t < RAGE_WINDOW)
  recent.push(now)
  rageClicks.set(elementSelector, recent)
  if (recent.length >= RAGE_THRESHOLD) {
    rageClicks.set(elementSelector, [])
    sendAnalyticsEvent('rageclick', { x: Math.round(x), y: Math.round(y), element: elementSelector })
  }
}
