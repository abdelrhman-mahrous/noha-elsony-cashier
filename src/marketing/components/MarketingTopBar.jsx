import { NavLink, useNavigate } from 'react-router-dom'
import { useMarketingAuth } from '../../context/MarketingAuthContext'
import { useToast } from '../../context/ToastContext'

export default function MarketingTopBar() {
  const { marketingUser, logout } = useMarketingAuth()
  const showToast = useToast()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    showToast('تم تسجيل الخروج بنجاح', 'info')
    navigate('/marketing/login')
  }

  return (
    <header className="mkt-topbar">
      {/* ── الشعار واسم البوابة ── */}
      <div className="mkt-topbar__brand">
        <div className="mkt-topbar__logo">💎</div>
        <div>
          <div className="mkt-topbar__title">بوابة التسويق والعلاقات</div>
          <div className="mkt-topbar__subtitle">صالون نهي السني • العروض والآراء والشكاوى</div>
        </div>
      </div>

      {/* ── روابط التنقل ── */}
      <nav className="mkt-topbar__nav">
        <NavLink
          to="/marketing"
          end
          className={({ isActive }) => `mkt-nav-btn${isActive ? ' mkt-nav-btn--active' : ''}`}
        >
          📊 الرئيسية
        </NavLink>

        <NavLink
          to="/marketing/offers"
          className={({ isActive }) => `mkt-nav-btn${isActive ? ' mkt-nav-btn--active' : ''}`}
        >
          🏷️ إدارة العروض
        </NavLink>

        <NavLink
          to="/marketing/reviews"
          className={({ isActive }) => `mkt-nav-btn${isActive ? ' mkt-nav-btn--active' : ''}`}
        >
          ⭐ الآراء والشكاوى
        </NavLink>

        <NavLink
          to="/marketing/change-password"
          className={({ isActive }) => `mkt-nav-btn${isActive ? ' mkt-nav-btn--active' : ''}`}
        >
          🔒 كلمة المرور
        </NavLink>
      </nav>

      {/* ── معلومات الحساب وتسجيل الخروج ── */}
      <div className="mkt-topbar__actions">
        <div className="mkt-user-chip">
          <span>✨ {marketingUser?.name || 'مسؤول التسويق'}</span>
        </div>
        <button
          onClick={handleLogout}
          className="mkt-btn-secondary"
          style={{ padding: '6px 12px', fontSize: '13px' }}
          title="تسجيل الخروج"
        >
          🚪 خروج
        </button>
      </div>
    </header>
  )
}
