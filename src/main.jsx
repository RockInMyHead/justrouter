import { StrictMode, Suspense, lazy, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import PageSeo from './PageSeo.jsx'
import { captureReferralFromUrl } from './referral.js'
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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <PageSeo />
      <ReferralCapture />
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
