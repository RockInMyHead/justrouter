import { StrictMode, Suspense, lazy, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PageSeo from './PageSeo.jsx'
import { captureReferralFromUrl } from './referral.js'
import { trackClick, trackScroll, onMouseMove, trackRageClick } from './analytics.js'
import { startSessionRecording, stopSessionRecording } from './sessionRecorder.js'
import { LANDING_PAGES } from '../shared/seo-config.js'

const AdminPanel = lazy(() => import('./AdminPanel.jsx'))
const ModelsPage = lazy(() => import('./ModelsPage.jsx'))
const AccountPage = lazy(() => import('./AccountPage.jsx'))
const SettingsPage = lazy(() => import('./SettingsPage.jsx'))
const ApiDocsPage = lazy(() => import('./ApiDocsPage.jsx'))
const AgentsPage = lazy(() => import('./AgentsPage.jsx'))
const LegalPage = lazy(() => import('./LegalPage.jsx'))
const SupportChat = lazy(() => import('./SupportChat.jsx'))
const LandingPage = lazy(() => import('./LandingPage.jsx'))
const PricingPage = lazy(() => import('./PricingPage.jsx'))
const BlogPage = lazy(() => import('./BlogPage.jsx'))
const BlogArticlePage = lazy(() => import('./BlogArticlePage.jsx'))
const FaqPage = lazy(() => import('./FaqPage.jsx'))
const ReferralPromoModal = lazy(() => import('./ReferralPromoModal.jsx'))

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white/50 text-sm">
      Загрузка...
    </div>
  )
}

function ReferralCapture() {
  const { search } = useLocation()
  useEffect(() => {
    captureReferralFromUrl(search)
  }, [search])
  return null
}

function AnalyticsTracker() {
  const location = useLocation()

  // Start session recording once on mount
  useEffect(() => {
    startSessionRecording()
    return () => stopSessionRecording()
  }, [])

  useEffect(() => {
    const interactiveSelector = 'button,a,input,select,textarea,[role="button"],[data-track-click]'
    let lastBucket = -1
    let lastMoveTime = 0
    const MOVE_SAMPLE_RATE = 300

    const emitScroll = () => {
      const fullHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      const maxScrollable = Math.max(0, fullHeight - window.innerHeight)
      const percent = maxScrollable > 0 ? Math.round((window.scrollY / maxScrollable) * 100) : 0
      const bucket = Math.min(100, Math.floor(percent / 10) * 10)
      if (bucket <= lastBucket) return
      lastBucket = bucket
      trackScroll({
        scroll_y: Math.round(window.scrollY),
        metadata: { percent, bucket, path: `${location.pathname}${location.search}` },
      })
    }

    const onMouseMoveEvent = (event) => {
      const now = Date.now()
      if (now - lastMoveTime < MOVE_SAMPLE_RATE) return
      lastMoveTime = now
      onMouseMove(Math.round(event.clientX), Math.round(event.clientY + window.scrollY), Math.round(window.scrollY))
    }

    const onClick = (event) => {
      const target = event.target?.closest?.(interactiveSelector)
      if (!target) return
      const selector = target.tagName.toLowerCase() +
        (target.getAttribute('aria-label') ? `[aria-label="${target.getAttribute('aria-label')}"]` : '')
      trackRageClick(selector, event.clientX + window.scrollX, event.clientY + window.scrollY)

      const rect = target.getBoundingClientRect()
      const pageY = Math.round(event.clientY + window.scrollY)
      const pageX = Math.round(event.clientX + window.scrollX)
      trackClick({
        element: target.tagName.toLowerCase(),
        text: (target.getAttribute('aria-label') || target.textContent || '').trim().slice(0, 255),
        x: pageX,
        y: pageY,
        metadata: {
          className: typeof target.className === 'string' ? target.className : '',
          href: target.getAttribute('href') || null,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          path: `${location.pathname}${location.search}`,
          scrollY: Math.round(window.scrollY),
        },
      })
    }

    const onVisibility = () => { if (document.visibilityState === 'hidden') emitScroll() }

    emitScroll()
    document.addEventListener('click', onClick, true)
    document.addEventListener('mousemove', onMouseMoveEvent, { passive: true })
    window.addEventListener('scroll', emitScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('mousemove', onMouseMoveEvent)
      window.removeEventListener('scroll', emitScroll)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [location.pathname, location.search])

  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <PageSeo />
      <ReferralCapture />
      <AnalyticsTracker />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/models/:category?" element={<ModelsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/settings" element={<SettingsPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/docs" element={<ApiDocsPage />} />
          <Route path="/docs/quickstart" element={<ApiDocsPage quickstart />} />
          <Route path="/api-docs" element={<Navigate to="/docs" replace />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogArticlePage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/legal/offer" element={<LegalPage documentSlug="offer" />} />
          <Route path="/legal/privacy" element={<LegalPage documentSlug="privacy" />} />
          <Route path="/legal/cookies" element={<LegalPage documentSlug="cookies" />} />
          <Route path="/legal/personal-data-consent" element={<LegalPage documentSlug="personal-data-consent" />} />
          {Object.keys(LANDING_PAGES).map((path) => (
            <Route
              key={path}
              path={path}
              element={<LandingPage config={LANDING_PAGES[path]} />}
            />
          ))}
        </Routes>
        <ReferralPromoModal />
        <SupportChat />
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
