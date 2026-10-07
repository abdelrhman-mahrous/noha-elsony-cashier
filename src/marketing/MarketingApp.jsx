import { Routes, Route, Navigate } from 'react-router-dom'
import { MarketingAuthProvider, useMarketingAuth } from '../context/MarketingAuthContext'
import MarketingTopBar from './components/MarketingTopBar'
import MarketingLoginPage from './pages/MarketingLoginPage'
import MarketingDashboardPage from './pages/MarketingDashboardPage'
import MarketingOffersPage from './pages/MarketingOffersPage'
import MarketingReviewsPage from './pages/MarketingReviewsPage'
import MarketingChangePasswordPage from './pages/MarketingChangePasswordPage'
import '../marketing.css'

function MarketingShell() {
  const { marketingUser, loading } = useMarketingAuth()

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '100dvh' }}>
        <span className="spinner spinner--lg" />
        <span>جارٍ التحميل...</span>
      </div>
    )
  }

  if (!marketingUser) {
    return <MarketingLoginPage />
  }

  return (
    <div className="mkt-shell">
      <MarketingTopBar />
      <main className="mkt-main">
        <Routes>
          <Route path="/"                element={<MarketingDashboardPage />} />
          <Route path="/offers"          element={<MarketingOffersPage />} />
          <Route path="/reviews"         element={<MarketingReviewsPage />} />
          <Route path="/change-password" element={<MarketingChangePasswordPage />} />
          <Route path="*"                element={<Navigate to="/marketing" replace />} />
        </Routes>
      </main>
    </div>
  )
}


export default function MarketingApp() {
  return (
    <MarketingAuthProvider>
      <MarketingShell />
    </MarketingAuthProvider>
  )
}
