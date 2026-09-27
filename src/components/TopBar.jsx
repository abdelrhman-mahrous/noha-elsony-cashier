import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function TopBar() {
  const { cashier, logout } = useAuth()
  const showToast = useToast()
  const location = useLocation()

  function handleLogout() {
    logout()
    showToast('تم تسجيل الخروج', 'info')
  }

  const initials = cashier?.name
    ? cashier.name.split(' ').map(w => w[0]).slice(0, 2).join('')
    : '?'

  const navLinks = [
    { to: '/',        label: '💳 المحاسبة' },
    { to: '/history', label: '📋 السجل' },
    { to: '/change-password', label: '🔐 كلمة السر' },
  ]

  return (
    <header className="topbar">
      <Link to="/" className="topbar__brand">
        <div className="topbar__logo">✂️</div>
        <span>صالون العربي</span>
      </Link>

      <nav className="topbar__nav">
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`topbar__btn${location.pathname === to ? ' topbar__btn--active' : ''}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="topbar__cashier">
        <div className="topbar__avatar">{initials}</div>
        <span style={{ display: 'none' }}>{cashier?.name}</span>
        <button className="topbar__btn" onClick={handleLogout} title="تسجيل الخروج">
          خروج
        </button>
      </div>
    </header>
  )
}
