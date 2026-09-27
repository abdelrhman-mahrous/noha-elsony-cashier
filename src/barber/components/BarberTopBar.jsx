import { useBarberAuth } from '../../context/BarberAuthContext'

export default function BarberTopBar({ onRefresh, refreshing, unreadCount = 0 }) {
  const { barber, logout, soundEnabled, toggleSound } = useBarberAuth()

  return (
    <header className="barber-topbar">
      <div className="barber-topbar__inner">
        {/* معلومات الكوافيرة / الحلاق */}
        <div className="barber-topbar__profile">
          <div className="barber-avatar">
            {barber?.imageUrl ? (
              <img src={barber.imageUrl} alt={barber.name} />
            ) : (
              <span className="barber-avatar__placeholder">✂️</span>
            )}
          </div>

          <div className="barber-topbar__info">
            <div className="barber-topbar__name">
              <span>مرحباً، {barber?.name || 'أخصائية التجميل'}</span>
              <span className="barber-live-badge">
                <span className="barber-live-badge__dot" />
                متصلة
              </span>
            </div>

            <div className="barber-topbar__rating">
              <span className="star-icon">★</span>
              <span>{(barber?.rating || 5.0).toFixed(1)}</span>
              <span>({barber?.totalReviews || 0} تقييم)</span>
            </div>
          </div>
        </div>

        {/* أزرار الإجراءات والتحكم */}
        <div className="barber-topbar__actions">
          {/* كتم / تفعيل التنبيه الصوتي */}
          <button
            type="button"
            className={`barber-btn-icon ${soundEnabled ? 'barber-btn-icon--active' : ''}`}
            onClick={toggleSound}
            title={soundEnabled ? 'التنبيه الصوتي مفعل عند ورود مهمة جديدة' : 'التنبيه الصوتي مكتوم'}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>

          {/* تحديث البيانات */}
          <button
            type="button"
            className="barber-btn-icon"
            onClick={onRefresh}
            disabled={refreshing}
            title="تحديث قائمة المواعيد والمهام"
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s ease' }}>
              🔄
            </span>
          </button>

          {/* تسجيل الخروج */}
          <button
            type="button"
            className="barber-btn-icon barber-btn-icon--logout"
            onClick={logout}
            title="تسجيل الخروج"
          >
            🚪
          </button>
        </div>
      </div>
    </header>
  )
}
