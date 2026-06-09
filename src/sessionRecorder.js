import { getToken } from './auth.js'
import { getAnalyticsVisitorId, getAnalyticsSessionId } from './analytics.js'

// ── Session Recording (total user monitoring) ──
// Records every user action with timestamps for replay in admin panel.

const FLUSH_INTERVAL = 5000 // send every 5s
const MAX_EVENTS_BEFORE_FLUSH = 200
const MOUSE_SAMPLE_RATE = 250 // ms between mouse samples

let events = []
let initTime = null
let flushTimer = null
let lastMouseTime = 0
let lastUrl = typeof window !== 'undefined' ? window.location.href : ''
let isActive = false

function getTime() {
  if (!initTime) initTime = Date.now()
  return Date.now()
}

function pushEvent(type, data = {}) {
  if (!isActive) return
  events.push({
    t: getTime(),
    type,
    data,
  })
  if (events.length >= MAX_EVENTS_BEFORE_FLUSH) flush()
}

function onMouseMove(x, y) {
  const now = Date.now()
  if (now - lastMouseTime < MOUSE_SAMPLE_RATE) return
  lastMouseTime = now
  pushEvent('mousemove', { x, y })
}

function onClick(e) {
  const target = e.target
  const rect = target?.getBoundingClientRect?.()
  pushEvent('click', {
    x: Math.round(e.clientX),
    y: Math.round(e.clientY),
    pageX: Math.round(e.pageX),
    pageY: Math.round(e.pageY),
    tag: target?.tagName?.toLowerCase?.() || '',
    id: target?.id || '',
    class: typeof target?.className === 'string' ? target.className?.slice(0, 120) : '',
    text: (target?.textContent || '').trim().slice(0, 100),
    selector: getSelector(target),
    rect: rect ? { w: Math.round(rect.width), h: Math.round(rect.height) } : null,
  })
}

function onScroll() {
  pushEvent('scroll', {
    scrollX: Math.round(window.scrollX),
    scrollY: Math.round(window.scrollY),
    maxScroll: Math.round(Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)),
  })
}

function onResize() {
  pushEvent('resize', {
    w: window.innerWidth,
    h: window.innerHeight,
  })
}

function onInput(e) {
  const target = e.target
  if (!target || !target.tagName) return
  const tag = target.tagName.toLowerCase()
  if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return
  if (target.type === 'password') return // never record passwords
  if (target.type === 'hidden') return

  pushEvent('input', {
    tag,
    name: target.name || '',
    id: target.id || '',
    placeholder: target.placeholder?.slice(0, 50) || '',
    // Store truncated value — just enough to understand context
    value: (target.value || '').slice(0, 200),
    selector: getSelector(target),
  })
}

function onFocus(e) {
  const target = e.target
  if (!target?.tagName) return
  pushEvent('focus', {
    tag: target.tagName.toLowerCase(),
    name: target.name || '',
    id: target.id || '',
    selector: getSelector(target),
  })
}

function trackPageView() {
  const url = window.location.href
  if (url === lastUrl) return
  lastUrl = url
  pushEvent('pageview', {
    url,
    path: window.location.pathname,
    search: window.location.search,
    title: document.title,
  })
}

function getSelector(el) {
  if (!el || !el.tagName) return ''
  const parts = []
  let current = el
  const maxDepth = 4
  for (let i = 0; i < maxDepth && current && current !== document.body; i++) {
    let sel = current.tagName?.toLowerCase?.() || ''
    if (current.id) { sel = `#${current.id}`; parts.unshift(sel); break }
    if (current.className && typeof current.className === 'string') {
      const cls = current.className.trim().split(/\s+/).slice(0, 2).join('.')
      if (cls) sel += `.${cls}`
    }
    parts.unshift(sel)
    current = current.parentElement
  }
  return parts.join(' > ')
}

function getUserInfo() {
  const token = getToken()
  if (!token) return null
  try {
    const session = JSON.parse(localStorage.getItem('velorix_session') || '{}')
    if (session?.id) return { user_id: session.id, user_name: session.name, user_email: session.email }
  } catch {}
  return null
}

// Send recorded session to server
async function flush() {
  if (events.length === 0) return
  const batch = events
  events = []
  const payload = {
    visitor_id: getAnalyticsVisitorId(),
    session_id: getAnalyticsSessionId(),
    start_url: window.location.href,
    events: batch,
    ...getUserInfo(),
  }
  try {
    const headers = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    const resp = await fetch('/api/record/session', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    })
    if (resp.ok) {
      const data = await resp.json()
    }
  } catch (err) {
    // silently fail — don't disrupt user
  }
}

// Flush on page unload
function onBeforeUnload() {
  // Synchronous send — use sendBeacon
  if (events.length === 0) return
  const batch = events
  events = []
  const payload = JSON.stringify({
    visitor_id: getAnalyticsVisitorId(),
    session_id: getAnalyticsSessionId(),
    start_url: lastUrl,
    events: batch,
    ...getUserInfo(),
  })
  try {
    navigator.sendBeacon('/api/record/session', new Blob([payload], { type: 'application/json' }))
  } catch {}
}

function attach() {
  if (isActive || typeof window === 'undefined') return
  isActive = true
  initTime = Date.now()
  lastUrl = window.location.href

  // Record initial page view
  pushEvent('pageview', {
    url: lastUrl,
    path: window.location.pathname,
    search: window.location.search,
    title: document.title,
  })
  pushEvent('browser', {
    userAgent: navigator.userAgent?.slice(0, 200),
    language: navigator.language,
    platform: navigator.platform,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  })

  document.addEventListener('click', onClick, { capture: true })
  document.addEventListener('mousemove', onMouseMove, { passive: true })
  document.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('input', onInput, { capture: true })
  document.addEventListener('focusin', onFocus, { capture: true })
  window.addEventListener('resize', onResize, { passive: true })
  window.addEventListener('beforeunload', onBeforeUnload)

  // Monitor URL changes via popstate and pushState
  window.addEventListener('popstate', trackPageView)

  // Intercept pushState/replaceState
  const origPushState = history.pushState
  history.pushState = function () {
    origPushState.apply(this, arguments)
    trackPageView()
  }
  const origReplaceState = history.replaceState
  history.replaceState = function () {
    origReplaceState.apply(this, arguments)
    trackPageView()
  }

  // Periodic flush
  flushTimer = setInterval(flush, FLUSH_INTERVAL)
}

function detach() {
  if (!isActive) return
  isActive = false
  flush() // flush remaining
  document.removeEventListener('click', onClick, { capture: true })
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('scroll', onScroll)
  document.removeEventListener('input', onInput, { capture: true })
  document.removeEventListener('focusin', onFocus, { capture: true })
  window.removeEventListener('resize', onResize)
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('popstate', trackPageView)
  if (flushTimer) clearInterval(flushTimer)
  flushTimer = null
}

export function startSessionRecording() {
  attach()
}

export function stopSessionRecording() {
  detach()
}
