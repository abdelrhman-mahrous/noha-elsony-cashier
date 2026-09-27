import { useState, useEffect } from 'react'
import { getReviews, toggleReviewVisibility, getComplaints } from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'
import { formatDateTime12 } from '../../lib/formatters'

export default function ReviewsPage() {
  const showToast = useToast()
  const [activeTab, setActiveTab] = useState('reviews') // 'reviews' | 'complaints'
  const [reviews, setReviews] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews()
    } else {
      loadComplaints()
    }
  }, [activeTab])

  async function loadReviews() {
    setLoading(true)
    try {
      const data = await getReviews({ limit: 50 })
      setReviews(data)
    } catch (e) {
      showToast('خطأ في تحميل التقييمات: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadComplaints() {
    setLoading(true)
    try {
      const data = await getComplaints({ limit: 50 })
      setComplaints(data)
    } catch (e) {
      showToast('خطأ في تحميل الشكاوى: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleVisibility(review) {
    try {
      await toggleReviewVisibility(review)
      showToast('تم تعديل ظهور التقييم', 'info')
      setReviews(prev =>
        prev.map(r => (r.id === review.id ? { ...r, is_visible: !(r.is_visible !== false) } : r))
      )
    } catch (e) {
      showToast('خطأ في تعديل الظهور: ' + e.message, 'error')
    }
  }

  return (
    <div className="owner-container">
      {/* ── الرأس ── */}
      <div className="owner-page-header">
        <div>
          <h1 className="owner-page-title">⭐ الآراء والشكاوى</h1>
          <p className="owner-page-subtitle">متابعة تجارب العميلات والتحكم بإظهار التقييمات ومتابعة شكاوى الدعم</p>
        </div>
      </div>

      {/* ── التبويبات ── */}
      <div className="owner-filters-card">
        <div className="owner-period-tabs">
          <button
            className={`owner-period-tab${activeTab === 'reviews' ? ' owner-period-tab--active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            ⭐ تقييمات العميلات ({reviews.length})
          </button>
          <button
            className={`owner-period-tab${activeTab === 'complaints' ? ' owner-period-tab--active' : ''}`}
            onClick={() => setActiveTab('complaints')}
          >
            ⚠️ الشكاوى والدعم ({complaints.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center" style={{ minHeight: '300px' }}>
          <span className="spinner spinner--lg" />
          <span>جارٍ التحميل...</span>
        </div>
      ) : activeTab === 'reviews' ? (
        reviews.length === 0 ? (
          <div className="owner-card">
            <div className="owner-empty-state">
              <span>لا توجد تقييمات مسجلة</span>
            </div>
          </div>
        ) : (
          <div className="owner-reviews-grid">
            {reviews.map((r) => {
              const rating = r.rating || 5
              const isVisible = r.is_visible !== false
              return (
                <div
                  key={r.id}
                  className={`owner-review-card${!isVisible ? ' owner-review-card--hidden' : ''}`}
                >
                  <div className="owner-review-card__header">
                    <div>
                      <div className="owner-review-card__author">{r.user_name || 'عميلة الصالون'}</div>
                      <div className="owner-review-card__stars">
                        {'★'.repeat(rating)}{'☆'.repeat(Math.max(0, 5 - rating))}
                      </div>
                    </div>

                    <button
                      className={`btn btn--sm ${isVisible ? 'btn--secondary' : 'btn--primary'}`}
                      style={!isVisible ? { background: 'var(--rose-gradient)' } : {}}
                      onClick={() => handleToggleVisibility(r)}
                    >
                      {isVisible ? '👁️ ظاهر (إخفاء)' : '🙈 مخفي (إظهار)'}
                    </button>
                  </div>

                  <p className="owner-review-card__comment">
                    {r.comment || 'لا يوجد تعليق مكتوب'}
                  </p>

                  <div className="owner-review-card__meta">
                    {r.target_label && <span className="badge badge--gold" style={{ fontSize: '0.75rem' }}>{r.target_label}</span>}
                    {r.barbers?.name && !r.target_label && <span>الكوافيرة: {r.barbers.name}</span>}
                    {r.created_at && (
                      <span>{formatDateTime12(r.created_at)}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : complaints.length === 0 ? (
        <div className="owner-card">
          <div className="owner-empty-state">
            <span>لا توجد شكاوى مسجلة</span>
          </div>
        </div>
      ) : (
        <div className="owner-card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>العميلة / الهاتف</th>
                  <th>الشكوى / الرسالة</th>
                  <th>التاريخ والوقت</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>👤 {c.user_name || 'عميلة'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>📞 {c.user_phone || c.phone || '—'}</div>
                    </td>
                    <td>{c.complaint_text || c.message || c.issue || '—'}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {formatDateTime12(c.created_at)}
                    </td>
                    <td>
                      <span className="badge badge--warning">{c.status || 'قيد المتابعة'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
