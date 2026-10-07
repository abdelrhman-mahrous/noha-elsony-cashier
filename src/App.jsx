import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import TopBar from './components/TopBar'
import LoginPage from './pages/LoginPage'
import PosPage from './pages/PosPage'
import HistoryPage from './pages/HistoryPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import OwnerApp from './owner/OwnerApp'
import MarketingApp from './marketing/MarketingApp'
import ClientApp from './client/ClientApp'

// 🌟 Demo Suite Imports
import DemoHubPage from './demo/DemoHubPage'
import DemoOwnerApp from './demo/owner/DemoOwnerApp'
import DemoStylistApp from './demo/stylist/DemoStylistApp'
import DemoMarketingApp from './demo/marketing/DemoMarketingApp'
import DemoCashierApp from './demo/cashier/DemoCashierApp'
import DemoClientApp from './demo/client/DemoClientApp'

function CashierShell() {
  const { cashier, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '100dvh' }}>
        <span className="spinner spinner--lg" />
        <span>جارٍ التحميل...</span>
      </div>
    )
  }

  if (!cashier) {
    return <LoginPage />
  }

  return (
    <div className="app-shell">
      <TopBar />
      <Routes>
        <Route path="/"                 element={<PosPage />} />
        <Route path="/history"          element={<HistoryPage />} />
        <Route path="/change-password"  element={<ChangePasswordPage />} />
        <Route path="*"                 element={<Navigate to="/cashier" replace />} />
      </Routes>
    </div>
  )
}

function CashierApp() {
  return (
    <AuthProvider>
      <CashierShell />
    </AuthProvider>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <Routes>
          {/* ✨ بوابات الديمو التفاعلية بالبيانات التجريبية للعملاء */}
          <Route path="/demo" element={<DemoHubPage />} />
          <Route path="/demo/owner/*" element={<DemoOwnerApp />} />
          <Route path="/demo/stylist/*" element={<DemoStylistApp />} />
          <Route path="/demo/barber/*" element={<DemoStylistApp />} />
          <Route path="/demo/marketing/*" element={<DemoMarketingApp />} />
          <Route path="/demo/cashier/*" element={<DemoCashierApp />} />
          <Route path="/demo/client/*" element={<DemoClientApp />} />

          {/* 👑 بوابة صاحبة الصالون */}
          <Route path="/owner/*" element={<OwnerApp />} />

          {/* 💎 بوابة التسويق والعروض والشكاوى */}
          <Route path="/marketing/*" element={<MarketingApp />} />
          <Route path="/offers" element={<Navigate to="/marketing/offers" replace />} />
          <Route path="/reviews" element={<Navigate to="/marketing/reviews" replace />} />

          {/* 🖥️ شاشة الكاشير (POS) */}
          <Route path="/cashier/*" element={<CashierApp />} />
          <Route path="/pos" element={<Navigate to="/cashier" replace />} />
          <Route path="/history" element={<Navigate to="/cashier/history" replace />} />
          <Route path="/change-password" element={<Navigate to="/cashier/change-password" replace />} />

          {/* 🌸 منصة العميلات الملكية (حجز وتصفح وخدمات ومتجر) */}
          <Route path="/*" element={<ClientApp />} />
        </Routes>
      </ToastProvider>
    </HashRouter>
  )
}

