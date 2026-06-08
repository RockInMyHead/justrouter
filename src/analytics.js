import { getToken } from './auth.js'

const VISITOR_KEY = 'justrouter_visitor_id'
const SESSION_KEY = 'justrouter_analytics_session'

function getStorage(storage, key) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function setStorage(storage, key, value) {
  try {
    storage.setItem(key, value)
  } catch {
    // Ignore storage failures in private mode.
  }
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
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const body = JSON.stringify(payload)

  if (!token && navigator.sendBeacon) {
    try {
      const beaconPayload = JSON.stringify(payload)
      const blob = new Blob([beaconPayload], { type: 'application/json' })
      if (navigator.sendBeacon('/api/analytics/events', blob)) return
    } catch {
      // Fall back to fetch below.
    }
  }

  fetch('/api/analytics/events', {
    method: 'POST',
    headers,
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {})
}

export function trackPageView(extra = {}) {
  sendAnalyticsEvent('pageview', extra)
}

export function trackClick(extra = {}) {
  sendAnalyticsEvent('click', extra)
}

export function trackScroll(extra = {}) {
  sendAnalyticsEvent('scroll', extra)
}

// ── Funnel event tracking ──

export function getUtmParams() {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const utm = {}
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
  for (const key of keys) {
    const val = params.get(key)
    if (val) utm[key] = val
  }
  return utm
}

// Detect acquisition source for the visit
function getVisitSource() {
  if (typeof window === 'undefined') return 'direct'
  const utm = getUtmParams()
  if (utm.utm_source) return 'utm'
  const ref = document.referrer || ''
  if (!ref) return 'direct'
  try {
    const refHost = new URL(ref).hostname
    if (refHost.includes('google.') || refHost.includes('yandex.') || refHost.includes('bing.') || refHost.includes('yahoo.')) return 'organic'
    if (refHost === window.location.hostname) return 'internal'
    return 'referral'
  } catch {
    return 'referral'
  }
}

// Store acquisition data in session for funnel attribution
const ACQ_KEY = 'justrouter_acquisition'
export function captureAcquisitionData() {
  if (typeof window === 'undefined') return
  const existing = sessionStorage.getItem(ACQ_KEY)
  if (existing) return
  const utm = getUtmParams()
  const source = getVisitSource()
  const referralCode = new URLSearchParams(window.location.search).get('ref') || ''
  sessionStorage.setItem(ACQ_KEY, JSON.stringify({
    source,
    utm_source: utm.utm_source || null,
    utm_medium: utm.utm_medium || null,
    utm_campaign: utm.utm_campaign || null,
    referral_code: referralCode,
    referrer: document.referrer || null,
    timestamp: new Date().toISOString(),
  }))
}

export function getAcquisitionData() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(sessionStorage.getItem(ACQ_KEY)) || null
  } catch {
    return null
  }
}

// Track a funnel step with acquisition attribution
export function trackFunnelEvent(step, extra = {}) {
  const acq = getAcquisitionData()
  sendAnalyticsEvent('funnel', {
    text: step,
    metadata: JSON.stringify({
      step,
      ...acq,
      ...extra,
    }),
  })
}

// ── Mouse movement tracking (throttled) ──
let mMoveTimer = null
let mMoveBatch = []
const MOVE_INTERVAL = 500 // ms between recorded samples
const MAX_MOVE_BATCH = 50

export function onMouseMove(x, y, scrollY) {
  mMoveBatch.push({ x, y, s: scrollY, t: Date.now() })
  if (mMoveBatch.length >= MAX_MOVE_BATCH) flushMouseMoves()
  if (!mMoveTimer) {
    mMoveTimer = setTimeout(flushMouseMoves, MOVE_INTERVAL)
  }
}

function flushMouseMoves() {
  mMoveTimer = null
  if (mMoveBatch.length === 0) return
  const batch = mMoveBatch
  mMoveBatch = []
  const avgX = Math.round(batch.reduce(function(s, v) { return s + v.x; }, 0) / batch.length)
  const avgY = Math.round(batch.reduce(function(s, v) { return s + v.y; }, 0) / batch.length)
  sendAnalyticsEvent('mousemove', {
    x: avgX,
    y: avgY,
    scroll_y: batch[batch.length - 1].s,
    metadata: JSON.stringify({
      samples: batch,
      count: batch.length,
      maxScrollY: Math.max.apply(null, batch.map(function(s) { return s.s; })),
    }),
  })
}

// ── Rage click detection ──
const rageClicks = new Map() // element path → timestamps
const RAGE_WINDOW = 1500 // ms
const RAGE_THRESHOLD = 4 // clicks in window

export function trackRageClick(elementSelector, x, y) {
  const now = Date.now()
  const timestamps = rageClicks.get(elementSelector) || []
  const recent = timestamps.filter(t => now - t < RAGE_WINDOW)
  recent.push(now)
  rageClicks.set(elementSelector, recent)
  if (recent.length >= RAGE_THRESHOLD) {
    rageClicks.set(elementSelector, [])
    sendAnalyticsEvent('rageclick', {
      x: Math.round(x),
      y: Math.round(y),
      element: elementSelector,
      metadata: JSON.stringify({ count: recent.length, window: RAGE_WINDOW }),
    })
  }
}

// ── Session start ──
let sessionStarted = false
export function trackSessionStart() {
  if (sessionStarted) return
  sessionStarted = true
  const acq = getAcquisitionData()
  sendAnalyticsEvent('session_start', {
    metadata: JSON.stringify({
      ...acq,
      user_agent: (typeof navigator !== 'undefined' ? navigator.userAgent : '').slice(0, 512),
      language: (typeof navigator !== 'undefined' ? navigator.language : ''),
    }),
  })
}

// ── Form interaction tracking ──
export function trackFormFocus(fieldName, fieldType) {
  sendAnalyticsEvent('form_focus', {
    element: fieldType,
    text: fieldName,
  })
}

export function trackFormSubmit(formName) {
  sendAnalyticsEvent('form_submit', {
    text: formName || 'unknown',
  })
}
