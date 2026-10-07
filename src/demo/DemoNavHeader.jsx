import { Link, useLocation } from 'react-router-dom'

export default function DemoNavHeader({ currentRole = '' }) {
  const location = useLocation()
  const path = location.pathname

  const roles = [
    { id: 'owner', label: '👑 لوحة الأونر (صاحبة الصالون)', path: '/demo/owner' },
    { id: 'stylist', label: '✂️ تطبيق الكوافيرة (الستاف)', path: '/demo/stylist' },
    { id: 'marketing', label: '🏷️ إدارة التسويق والعروض', path: '/demo/marketing' },
    { id: 'cashier', label: '🖥️ الكاشير ونقاط البيع', path: '/demo/cashier' },
    { id: 'client', label: '🌸 منصة العميلات الملكية', path: '/demo/client' },
  ]

  return (
    <header className="demo-nav-header">
      <div className="demo-nav-brand">
        <Link to="/demo" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="demo-nav-badge">✨ DEMO MODE</span>
          <span className="demo-nav-title">صالون العرابي بيوتي</span>
        </Link>
      </div>

      <nav className="demo-nav-links">
        {roles.map((r) => {
          const isActive = currentRole === r.id || path.startsWith(r.path)
          return (
            <Link
              key={r.id}
              to={r.path}
              className={`demo-nav-pill ${isActive ? 'active' : ''}`}
            >
              {r.label}
            </Link>
          )
        })}

        <a
          href="https://abdelrhman-mahrous.github.io/salon-noha-elsony-demo/"
          target="_blank"
          rel="noopener noreferrer"
          className="demo-nav-pill"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(243,229,171,0.1) 100%)',
            borderColor: '#D4AF37',
            color: '#F3E5AB',
            fontWeight: '700',
          }}
        >
          📱 تطبيق الموبايل (نهى السني) ↗
        </a>
      </nav>

      <div>
        <Link to="/demo" className="demo-nav-hub-btn">
          🏠 بوابة الديمو المركزية
        </Link>
      </div>
    </header>
  )
}
