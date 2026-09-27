import { useState, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { BarberAuthProvider, useBarberAuth } from '../context/BarberAuthContext'
import BarberTopBar from './components/BarberTopBar'
import BarberLoginPage from './pages/BarberLoginPage'
import BarberHomePage from './pages/BarberHomePage'
import '../barber.css'

function BarberShell() {
  const { barber, loading } = useBarberAuth()
  const [refreshing, setRefreshing] = useState(false)
  const refreshFnRef = useRef(null)

  if (loading) {
    return (
      <div className="barber-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner spinner--lg" />
          <div style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '1.05rem', fontWeight: 'bold' }}>
            جارٍ التحقق وتحميل منصة الكوافير...
          </div>
        </div>
      </div>
    )
  }

  if (!barber) {
    return <BarberLoginPage />
  }

  const handleTopBarRefresh = () => {
    if (refreshFnRef.current) {
      refreshFnRef.current()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="barber-shell">
      <BarberTopBar
        onRefresh={handleTopBarRefresh}
        refreshing={refreshing}
      />
      <Routes>
        <Route
          path="/"
          element={
            <BarberHomePage
              setTopBarRefreshFn={(fn) => {
                refreshFnRef.current = fn
              }}
            />
          }
        />
        <Route path="/login" element={<Navigate to="/barber" replace />} />
        <Route path="*" element={<Navigate to="/barber" replace />} />
      </Routes>
    </div>
  )
}

export default function BarberApp() {
  return (
    <BarberAuthProvider>
      <BarberShell />
    </BarberAuthProvider>
  )
}
