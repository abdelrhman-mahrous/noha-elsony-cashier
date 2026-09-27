import { useState, useEffect } from 'react'
import { getReviews, toggleReviewVisibility, getComplaints, updateComplaintStatus } from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'
import { formatDateTime12 } from '../../lib/formatters'

export default function MarketingReviewsPage() {
  const showToast = useToast()
  const [activeTab, setActiveTab] = useState('reviews') // 'reviews' | 'complaints'
  const [reviews, setReviews] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [reviewFilter, setReviewFilter] = useState('all') // 'all' | 'visible' | 'hidden'
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

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
      const data = await getReviews({ limit: 100 })
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
      const data = await getComplaints({ limit: 100 })
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
      showToast('تم تحديث حالة ظهور التقييم في التطبيق', 'info')
      setReviews(prev =>
        prev.map(r => (r.id === review.id ? { ...r, is_visible: !(r.is_visible !== false) } : r))
      )
    } catch (e) {
      showToast('خطأ في تعديل الظهور: ' + e.message, 'error')
    }
  }

  async function handleUpdateComplaintStatus(newStatus) {
    if (!selectedComplaint) return
    setUpdatingStatus(true)
    try {
      await updateComplaintStatus({ id: selectedComplaint.id, status: newStatus })
      showToast(`تم تحديث حالة الشكوى إلى: ${newStatus}`, 'success')
      setComplaints(prev =>
        prev.map(c => (c.id === selectedComplaint.id ? { ...c, status: newStatus } : c))
      )
      setSelectedComplaint(null)
    } catch (e) {
      showToast('خطأ في تحديث الحالة: ' + e.message, 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const filteredReviews = reviews.filter(r => {
    if (reviewFilter === 'visible' && r.is_visible === false) return false
    if (reviewFilter === 'hidden' && r.is_visible !== false) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchesAuthor = (r.user_name || '').toLowerCase().includes(q)
      const matchesComment = (r.comment || '').toLowerCase().includes(q)
      const matchesTarget = (r.target_label || '').toLowerCase().includes(q)
      return matchesAuthor || matchesComment || matchesTarget
    }
    return true
  })

  return (
    <div className="mkt-container">
      {/* ── الرأس ── */}
      <div className="mkt-header">
        <div>
          <h1 className="mkt-title">⭐ الآراء وتجارب العميلات والشكاوى</h1>
          <p className="mkt-subtitle">متابعة تقييمات العميلات، التحكم بالظهور في التطبيق، والتعامل مع شكاوى الدعم</p>
        </div>
      </div>

      {/* ── التبويبات ── */}
      <div className="mkt-tabs">
        <button
          className={`mkt-tab${activeTab === 'reviews' ? ' mkt-tab--active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          ⭐ تقييمات وتجارب العميلات ({reviews.length})
        </button>
        <button
          className={`mkt-tab${activeTab === 'complaints' ? ' mkt-tab--active' : ''}`}
          onClick={() => setActiveTab('complaints')}
        >
          ⚠️ تذاكر الشكاوى والدعم ({complaints.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-center" style={{ minHeight: '300px' }}>
          <span className="spinner spinner--lg" />
          <span>جارٍ التحميل...</span>
        </div>
      ) : activeTab === 'reviews' ? (
        <div>
          {/* أدوات البحث والفلترة */}
          <div className="mkt-card" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="input"
                style={{ flex: 1, minWidth: '220px' }}
                placeholder="🔍 بحث باسم العميلة، نص التقييم، أو الكوافيرة..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn btn--sm ${reviewFilter === 'all' ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => setReviewFilter('all')}
                >
                  الكل ({reviews.length})
                </button>
                <button
                  className={`btn btn--sm ${reviewFilter === 'visible' ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => setReviewFilter('visible')}
                >
                  👁️ الظاهرة
                </button>
                <button
                  className={`btn btn--sm ${reviewFilter === 'hidden' ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => setReviewFilter('hidden')}
                >
                  🙈 المخفية
                </button>
              </div>
            </div>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="mkt-card" style={{ textAlign: 'center', padding: '48px' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⭐</div>
              <h3 style={{ margin: 0, color: 'var(--mkt-ink)' }}>لا توجد تقييمات مطابقة</h3>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filteredReviews.map((r) => {
                const rating = r.rating || 5
                const isVisible = r.is_visible !== false
                return (
                  <div
                    key={r.id}
                    className="mkt-card"
                    style={{
                      margin: 0,
                      opacity: isVisible ? 1 : 0.7,
                      border: isVisible ? '1px solid var(--mkt-border)' : '1px dashed var(--mkt-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--mkt-ink)' }}>
                          👤 {r.user_name || 'عميلة الصالون'}
                        </div>
                        <div style={{ color: 'var(--mkt-gold)', fontSize: '16px', marginTop: '2px' }}>
                          {'★'.repeat(rating)}{'☆'.repeat(Math.max(0, 5 - rating))}
                        </div>
                      </div>

                      <button
                        className={`btn btn--sm ${isVisible ? 'btn--secondary' : 'btn--primary'}`}
                        style={!isVisible ? { background: 'linear-gradient(135deg, #8E3A59, #C69537)', color: '#fff' } : {}}
                        onClick={() => handleToggleVisibility(r)}
                      >
                        {isVisible ? '👁️ ظاهر (إخفاء)' : '🙈 مخفي (إظهار)'}
                      </button>
                    </div>

                    <p style={{ fontSize: '14px', color: 'var(--mkt-ink)', flex: 1, margin: '0 0 14px', lineHeight: 1.5, background: '#FAF5F8', padding: '10px 12px', borderRadius: '8px' }}>
                      {r.comment || 'لا يوجد تعليق مكتوب'}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--mkt-muted)' }}>
                      <span>{r.target_label || (r.barbers?.name ? `✂️ الكوافيرة: ${r.barbers.name}` : 'صالون نهي السني')}</span>
                      {r.created_at && <span>{formatDateTime12(r.created_at)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : complaints.length === 0 ? (
        <div className="mkt-card" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎉</div>
          <h3 style={{ margin: 0, color: 'var(--mkt-ink)' }}>لا توجد شكاوى مسجلة حالياً!</h3>
        </div>
      ) : (
        <div className="mkt-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#FAF5F8', borderBottom: '1px solid var(--mkt-border)' }}>
                <tr>
                  <th style={{ padding: '14px', textAlign: 'right' }}>العميلة وبيانات الاتصال</th>
                  <th style={{ padding: '14px', textAlign: 'right' }}>نص الشكوى / الاستفسار</th>
                  <th style={{ padding: '14px', textAlign: 'right' }}>التاريخ</th>
                  <th style={{ padding: '14px', textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '14px', textAlign: 'center' }}>إجراء سريع</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => {
                  const phone = c.user_phone || c.phone
                  const isResolved = c.status === 'تم الحل' || c.status === 'resolved'
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--mkt-border)' }}>
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 'bold', color: 'var(--mkt-ink)' }}>👤 {c.user_name || 'عميلة'}</div>
                        {phone && (
                          <div style={{ fontSize: '13px', color: 'var(--mkt-muted)', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span>📞 {phone}</span>
                            <a
                              href={`https://wa.me/2${phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#25D366', textDecoration: 'none', fontWeight: 'bold' }}
                            >
                              واتساب 💬
                            </a>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px', maxWidth: '360px', lineHeight: 1.5, fontSize: '14px' }}>
                        {c.complaint_text || c.message || c.issue || '—'}
                      </td>
                      <td style={{ padding: '14px', fontSize: '13px', color: 'var(--mkt-muted)' }}>
                        {formatDateTime12(c.created_at)}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <span className={`mkt-badge ${isResolved ? 'mkt-badge--success' : 'mkt-badge--warning'}`}>
                          {c.status || 'قيد المتابعة'}
                        </span>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <button
                          className="mkt-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => setSelectedComplaint(c)}
                        >
                          ⚙️ إدارة الحالة
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── مودال تحديث حالة الشكوى ── */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">تحديث حالة تذكرة الدعم</h2>
              <button className="modal-close-btn" onClick={() => setSelectedComplaint(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <strong>العميلة:</strong> {selectedComplaint.user_name || 'عميلة'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--mkt-muted)', background: '#FAF5F8', padding: '10px', borderRadius: '8px' }}>
                {selectedComplaint.complaint_text || selectedComplaint.message || selectedComplaint.issue}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                <button
                  className="btn btn--primary"
                  style={{ background: 'var(--mkt-success)', borderColor: 'var(--mkt-success)' }}
                  onClick={() => handleUpdateComplaintStatus('تم التواصل والحل')}
                  disabled={updatingStatus}
                >
                  ✅ تم التواصل والحل
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={() => handleUpdateComplaintStatus('قيد المتابعة')}
                  disabled={updatingStatus}
                >
                  ⏳ قيد المتابعة والتدقيق
                </button>
                <button
                  className="btn btn--danger"
                  onClick={() => handleUpdateComplaintStatus('ملغاة / غير صحيحة')}
                  disabled={updatingStatus}
                >
                  ❌ غير صحيحة / ملغاة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
