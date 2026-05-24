import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AdminPanel from './AdminPanel.jsx'
import ModelsPage from './ModelsPage.jsx'
import AccountPage from './AccountPage.jsx'
import ApiDocsPage from './ApiDocsPage.jsx'
import AgentsPage from './AgentsPage.jsx'
import LegalPage from './LegalPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/api-docs" element={<ApiDocsPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/legal/offer" element={<LegalPage documentSlug="offer" />} />
        <Route path="/legal/privacy" element={<LegalPage documentSlug="privacy" />} />
        <Route path="/legal/cookies" element={<LegalPage documentSlug="cookies" />} />
        <Route path="/legal/personal-data-consent" element={<LegalPage documentSlug="personal-data-consent" />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
