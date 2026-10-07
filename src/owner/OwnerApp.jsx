import { Routes, Route, Navigate } from 'react-router-dom'
import { OwnerAuthProvider, useOwnerAuth } from '../context/OwnerAuthContext'
import OwnerTopBar from './components/OwnerTopBar'
import OwnerLoginPage from './pages/OwnerLoginPage'
import OwnerDashboardPage from './pages/OwnerDashboardPage'
import FinancialsPage from './pages/FinancialsPage'
import TasksPage from './pages/TasksPage'
import TeamPage from './pages/TeamPage'
import OffersPage from './pages/OffersPage'
import ProductsPage from './pages/ProductsPage'
import BuffetPage from './pages/BuffetPage'
import ReviewsPage from './pages/ReviewsPage'
import OwnerChangePasswordPage from './pages/OwnerChangePasswordPage'

function OwnerShell() {
  const { owner, loading } = useOwnerAuth()

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '100dvh' }}>
        <span className="spinner spinner--lg" />
        <span>جارٍ التحميل...</span>
      </div>
    )
  }

  if (!owner) {
    return <OwnerLoginPage />
  }

  return (
    <div className="owner-shell">
      <OwnerTopBar />
      <main className="owner-main">
        <Routes>
          <Route path="/"                 element={<OwnerDashboardPage />} />
          <Route path="/financials"       element={<FinancialsPage />} />
          <Route path="/tasks"            element={<TasksPage />} />
          <Route path="/team"             element={<TeamPage />} />
          <Route path="/offers"           element={<OffersPage />} />
          <Route path="/products"         element={<ProductsPage />} />
          <Route path="/buffet"           element={<BuffetPage />} />
          <Route path="/reviews"          element={<ReviewsPage />} />
          <Route path="/change-password"  element={<OwnerChangePasswordPage />} />
          <Route path="*"                 element={<Navigate to="/owner" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function OwnerApp() {
  return (
    <OwnerAuthProvider>
      <OwnerShell />
    </OwnerAuthProvider>
  )
}
