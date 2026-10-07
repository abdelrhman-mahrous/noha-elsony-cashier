import { Link, useLocation } from 'react-router-dom'
import { useOwnerAuth } from '../../context/OwnerAuthContext'
import { useToast } from '../../context/ToastContext'

const NAV_LINKS = [
  { to: '/owner',           label: 'الرئيسية' },
  { to: '/owner/tasks',     label: 'توزيع المهام' },
  { to: '/owner/products',  label: 'المخزن والمنتجات' },
  { to: '/owner/buffet',    label: '☕ البوفيه والمشروبات' },
  { to: '/owner/financials',label: 'الحسابات والمالية' },
  { to: '/owner/team',      label: 'طاقم العمل' },
  { to: '/owner/offers',    label: 'العروض' },
  { to: '/owner/reviews',   label: 'الآراء والشكاوى' },
  { to: '/owner/change-password', label: 'تغيير السر' },
]

export default function OwnerTopBar() {
  const { owner, logout } = useOwnerAuth()
  const showToast = useToast()
  const location = useLocation()

  function handleLogout() {
    logout()
    showToast('تم تسجيل الخروج بنجاح', 'info')
  }

  return (
    <header className="owner-topbar">
      <Link to="/owner" className="owner-topbar__brand">
        <div className="owner-topbar__logo">💎</div>
        <div>
          <div className="owner-topbar__title">
            مرحباً، {owner?.name || 'نهي السني'}
          </div>
          <div className="owner-topbar__subtitle">
            إدارة صالون السيدات • جميع الصلاحيات
          </div>
        </div>
      </Link>

      <nav className="owner-topbar__nav">
        {NAV_LINKS.map(({ to, label }) => {
          const isActive = to === '/owner'
            ? location.pathname === '/owner'
            : location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={`owner-nav-btn${isActive ? ' owner-nav-btn--active' : ''}`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <button
        className="owner-logout-btn"
        onClick={handleLogout}
        title="تسجيل الخروج"
      >
        🚪
      </button>
    </header>
  )
}
