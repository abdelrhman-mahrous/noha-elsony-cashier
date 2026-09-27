import { useState } from 'react'
import { trackClientBooking } from '../../services/clientService'
import { useToast } from '../../context/ToastContext'

export default function TrackBookingModal({ isOpen, onClose }) {
  const showToast = useToast()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  if (!isOpen) return null

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    try {
      const data = await trackClientBooking(query)
      setResults(data)
      if (data.length === 0) {
        showToast('لم يتم العثور على أي حجز مطابق', 'info')
      }
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'completed':
        return <span className="badge badge--success">مكتمل ومحاسب ✅</span>
      case 'confirmed':
        return <span className="badge badge--gold">مؤكد وجاهز 👑</span>
      case 'cancelled':
        return <span className="badge badge--danger">ملغي ✕</span>
      default:
        return <span className="badge badge--info">قيد الانتظار ⏳</span>
    }
  }

  return (
    <div className="client-modal-backdrop">
      <div className="client-modal-card">
        <button className="client-modal-close" onClick={onClose}>✕</button>

        <h2 className="client-section-title" style={{ fontSize: '1.6rem', textAlign: 'center' }}>
          🔍 تتبع حالة حجزك
        </h2>
        <p className="client-section-desc" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          أدخلي رقم هاتفك أو كود الحجز لمتابعة تفاصيل الموعد
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="رقم الهاتف (مثال: 010...) أو كود الحجز..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            required
          />
          <button type="submit" className="client-btn-book" disabled={loading}>
            {loading ? 'بحث...' : 'بحث'}
          </button>
        </form>

        {results && (
          <div>
            {results.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--c-text-muted)', padding: '2rem' }}>
                لا توجد مواعيد مسجلة بهذا الرقم أو الكود.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto' }}>
                {results.map((appt) => (
                  <div
                    key={appt.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 14,
                      padding: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--c-gold)' }}>
                        {appt.appointment_code || `#${appt.id.slice(0, 8)}`}
                      </span>
                      {getStatusBadge(appt.status)}
                    </div>

                    <div style={{ fontSize: '0.92rem', color: '#fff', marginBottom: 4 }}>
                      👤 <strong>الاسم:</strong> {appt.user_name}
                    </div>

                    <div style={{ fontSize: '0.92rem', color: 'var(--c-text-secondary)', marginBottom: 4 }}>
                      📅 <strong>الموعد:</strong> {appt.appointment_date} الساعة {appt.appointment_time}
                    </div>

                    {appt.barbers?.name && (
                      <div style={{ fontSize: '0.92rem', color: 'var(--c-text-secondary)', marginBottom: 4 }}>
                        ✂️ <strong>المتخصصة:</strong> {appt.barbers.name}
                      </div>
                    )}

                    <div style={{ fontSize: '0.92rem', color: '#10b981', fontWeight: 'bold', marginTop: 8 }}>
                      المبلغ: {appt.price} ج.م
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
