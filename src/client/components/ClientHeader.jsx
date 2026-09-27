import { Link } from 'react-router-dom'

export default function ClientHeader({ onOpenBooking, onOpenTrack, onOpenSupport }) {
  return (
    <header className="client-header">
      <div className="client-container">
        <div className="client-header__inner">
          <Link to="/" className="client-brand">
            <div className="client-brand__icon">💎</div>
            <div className="client-brand__text">
              <h1>صالون نهي السني</h1>
              <span>NOHA EL SENY BEAUTY SALON</span>
            </div>
          </Link>

          <nav className="client-nav">
            <a href="#services" className="client-nav__link">✂️ الخدمات</a>
            <a href="#offers" className="client-nav__link">🏷️ العروض</a>
            <a href="#store" className="client-nav__link">🛍️ المتجر</a>
            <a href="#reviews" className="client-nav__link">⭐ الآراء</a>
            <button className="client-nav__link" onClick={onOpenTrack}>
              🔍 تتبع الحجز
            </button>
            <button className="client-nav__link" onClick={onOpenSupport}>
              💬 الدعم والمساعدة
            </button>
          </nav>

          <div className="client-header__actions">
            <button className="client-btn-book" onClick={onOpenBooking}>
              <span>✨ احجزي موعدك</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
