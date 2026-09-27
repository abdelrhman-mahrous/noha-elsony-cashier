import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../context/ToastContext'
import { getPosHistory } from '../services/posService'

export default function HistoryPage() {
  const showToast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const LIMIT = 20

  const loadHistory = useCallback(async (query = '', off = 0, append = false) => {
    setLoading(true)
    try {
      const data = await getPosHistory({ limit: LIMIT, offset: off, query })
      if (append) {
        setItems(prev => [...prev, ...data])
      } else {
        setItems(data)
      }
      setHasMore(data.length === LIMIT)
      setOffset(off + data.length)
    } catch (err) {
      showToast(err.message || 'فشل تحميل السجل', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  function handleSearch(e) {
    e.preventDefault()
    setOffset(0)
    setHasMore(true)
    loadHistory(searchQuery, 0, false)
  }

  function handleLoadMore() {
    loadHistory(searchQuery, offset, true)
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return dateStr }
  }

  return (
    <div className="page">
      <div className="flex-between mb-16" style={{ flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
          📋 سجل المواعيد المحاسبة
        </h2>
        <span className="badge badge--success">{items.length} موعد</span>
      </div>

      {/* Search */}
      <form className="search-bar" onSubmit={handleSearch}>
        <input
          id="history-search-input"
          className="input"
          placeholder="ابحثي باسم العميل أو رقم هاتفه أو الكود..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          dir="rtl"
        />
        <button
          id="history-search-btn"
          type="submit"
          className="btn btn--primary"
          disabled={loading}
        >
          {loading
            ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            : '🔍'
          }
        </button>
      </form>

      {/* List */}
      {loading && items.length === 0 && (
        <div className="loading-center">
          <span className="spinner spinner--lg" />
          <span>جارٍ التحميل...</span>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">📭</div>
          <div className="empty-state__text">لا توجد مواعيد محاسبة حتى الآن</div>
        </div>
      )}

      {items.map((item, idx) => (
        <div key={item.id || idx} className="history-card">
          <div className="history-card__header">
            <div>
              <div className="history-card__name">{item.user_name || 'عميلة'}</div>
              <div className="history-card__code">{item.appointment_code}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {item.barbers?.name || '—'} • {item.appointment_date || '—'}
              </div>
            </div>
            <div className="history-card__amount">
              <div className="history-card__amount-val">
                {(item.paid_amount || 0).toFixed(0)} جنيه
              </div>
              <div className="history-card__amount-label">مدفوع</div>
              {item.tip_amount > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: 2 }}>
                  + {item.tip_amount} بقشيش
                </div>
              )}
            </div>
          </div>
          <div className="history-card__meta">
            <span>📅 {formatDate(item.completed_at)}</span>
            {item.user_phone && <span>📱 {item.user_phone}</span>}
            {item.offer_title_ar && (
              <span style={{ color: 'var(--warning)' }}>🏷️ {item.offer_title_ar}</span>
            )}
            {item.discount_amount > 0 && (
              <span style={{ color: 'var(--success)' }}>
                خصم {item.discount_amount} جنيه
              </span>
            )}
          </div>
          {item.cashier_notes && (
            <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              💬 {item.cashier_notes}
            </div>
          )}
        </div>
      ))}

      {hasMore && !loading && items.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            id="load-more-btn"
            className="btn btn--ghost"
            onClick={handleLoadMore}
          >
            تحميل المزيد
          </button>
        </div>
      )}
    </div>
  )
}
