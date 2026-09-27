import { Routes, Route, Navigate } from 'react-router-dom'
import ClientHomePage from './pages/ClientHomePage'

export default function ClientApp() {
  return (
    <Routes>
      <Route path="/" element={<ClientHomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
