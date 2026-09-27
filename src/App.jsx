import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import TopBar from './components/TopBar'
import LoginPage from './pages/LoginPage'
import PosPage from './pages/PosPage'
import HistoryPage from './pages/HistoryPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import OwnerApp from './owner/OwnerApp'
import ClientApp from './client/ClientApp'

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
          {/* 👑 بوابة صاحبة الصالون */}
          <Route path="/owner/*" element={<OwnerApp />} />

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
