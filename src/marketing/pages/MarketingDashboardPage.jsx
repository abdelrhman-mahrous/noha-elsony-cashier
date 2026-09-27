import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllOffers, getReviews, getComplaints } from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'

export default function MarketingDashboardPage() {
  const showToast = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOffers: 0,
    activeOffers: 0,
    totalReviews: 0,
    avgRating: '5.0',
    totalComplaints: 0,
    pendingComplaints: 0,
  })
  const [recentReviews, setRecentReviews] = useState([])
  const [recentComplaints, setRecentComplaints] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const [offersData, reviewsData, complaintsData] = await Promise.all([
        getAllOffers().catch(() => []),
        getReviews({ limit: 100 }).catch(() => []),
        getComplaints({ limit: 50 }).catch(() => []),
      ])

      const activeOffersCount = offersData.filter(o => o.is_active !== false).length
      
      let sumRating = 0
      reviewsData.forEach(r => { sumRating += (r.rating || 5) })
      const avg = reviewsData.length > 0 ? (sumRating / reviewsData.length).toFixed(1) : '5.0'

      const pendingCount = complaintsData.filter(c => !c.status || c.status === 'قيد المتابعة' || c.status === 'pending').length

      setStats({
        totalOffers: offersData.length,
        activeOffers: activeOffersCount,
        totalReviews: reviewsData.length,
        avgRating: avg,
        totalComplaints: complaintsData.length,
        pendingComplaints: pendingCount,
      })

      setRecentReviews(reviewsData.slice(0, 4))
      setRecentComplaints(complaintsData.slice(0, 4))
    } catch (e) {
      showToast('خطأ في تحميل بيانات اللوحة: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-center" style={{ minHeight: '60vh' }}>
        <span className="spinner spinner--lg" />
        <span>جارٍ تجهيز إحصائيات التسويق...</span>
      </div>
    )
  }

  return (
    <div className="mkt-container">
      {/* ── العنوان الترحيبي ── */}
      <div className="mkt-header">
        <div>
          <h1 className="mkt-title">لوحة التحكم والمؤشرات التسويقية 📊</h1>
          <p className="mkt-subtitle">نظرة شاملة على العروض الفعالة، تقييمات العميلات، وشكاوى الدعم الفني</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/marketing/offers" className="mkt-btn-primary">
            ➕ إضافة عرض جديد
          </Link>
        </div>
      </div>

      {/* ── كروت المؤشرات السريعة (KPIs) ── */}
      <div className="mkt-stats-grid">
        <div className="mkt-stat-card">
          <div className="mkt-stat-icon mkt-stat-icon--pink">🏷️</div>
          <div>
            <div className="mkt-stat-val">{stats.activeOffers} <span style={{ fontSize: '14px', color: 'var(--mkt-muted)' }}>/ {stats.totalOffers}</span></div>
            <div className="mkt-stat-lbl">العروض الترويجية النشطة</div>
          </div>
        </div>

        <div className="mkt-stat-card">
          <div className="mkt-stat-icon mkt-stat-icon--gold">⭐</div>
          <div>
            <div className="mkt-stat-val">{stats.avgRating} <span style={{ fontSize: '14px', color: 'var(--mkt-gold)' }}>★</span></div>
            <div className="mkt-stat-lbl">متوسط تقييم العميلات ({stats.totalReviews} تقييم)</div>
          </div>
        </div>

        <div className="mkt-stat-card">
          <div className="mkt-stat-icon mkt-stat-icon--red">⚠️</div>
          <div>
            <div className="mkt-stat-val">{stats.pendingComplaints}</div>
            <div className="mkt-stat-lbl">شكاوى قيد المتابعة والحل</div>
          </div>
        </div>

        <div className="mkt-stat-card">
          <div className="mkt-stat-icon mkt-stat-icon--green">💬</div>
          <div>
            <div className="mkt-stat-val">{stats.totalComplaints}</div>
            <div className="mkt-stat-lbl">إجمالي تذاكر الدعم والشكاوى</div>
          </div>
        </div>
      </div>

      {/* ── اختصارات وروابط سريعة ── */}
      <div className="mkt-card">
        <div className="mkt-card__header">
          <div className="mkt-card__title">🚀 الاختصارات السريعة</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <Link to="/marketing/offers" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '18px',
              borderRadius: '12px',
              border: '1.5px solid var(--mkt-border)',
              backgroundColor: '#FAF5F8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'transform 0.2s, borderColor 0.2s',
              cursor: 'pointer'
            }}>
              <div>
                <div style={{ fontWeight: '800', color: 'var(--mkt-ink)', fontSize: '16px' }}>🏷️ العروض والخصومات</div>
                <div style={{ fontSize: '13px', color: 'var(--mkt-muted)', marginTop: '4px' }}>إنشاء وتعديل العروض، الخصومات المئوية والمحددة</div>
              </div>
              <span style={{ fontSize: '20px', color: 'var(--mkt-primary)' }}>←</span>
            </div>
          </Link>

          <Link to="/marketing/reviews" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '18px',
              borderRadius: '12px',
              border: '1.5px solid var(--mkt-border)',
              backgroundColor: '#FAF5F8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'transform 0.2s, borderColor 0.2s',
              cursor: 'pointer'
            }}>
              <div>
                <div style={{ fontWeight: '800', color: 'var(--mkt-ink)', fontSize: '16px' }}>⭐ تجارب وآراء العميلات</div>
                <div style={{ fontSize: '13px', color: 'var(--mkt-muted)', marginTop: '4px' }}>التحكم في إظهار التقييمات في التطبيق</div>
              </div>
              <span style={{ fontSize: '20px', color: 'var(--mkt-primary)' }}>←</span>
            </div>
          </Link>

          <Link to="/marketing/reviews" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '18px',
              borderRadius: '12px',
              border: '1.5px solid var(--mkt-border)',
              backgroundColor: '#FAF5F8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'transform 0.2s, borderColor 0.2s',
              cursor: 'pointer'
            }}>
              <div>
                <div style={{ fontWeight: '800', color: 'var(--mkt-ink)', fontSize: '16px' }}>⚠️ الشكاوى والدعم الفني</div>
                <div style={{ fontSize: '13px', color: 'var(--mkt-muted)', marginTop: '4px' }}>متابعة شكاوى العميلات وتحديث حالاتها</div>
              </div>
              <span style={{ fontSize: '20px', color: 'var(--mkt-primary)' }}>←</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── أحدث التقييمات والشكاوى ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        {/* أحدث التقييمات */}
        <div className="mkt-card">
          <div className="mkt-card__header">
            <div className="mkt-card__title">⭐ أحدث آراء العميلات</div>
            <Link to="/marketing/reviews" style={{ fontSize: '13px', color: 'var(--mkt-primary)', fontWeight: '700', textDecoration: 'none' }}>
              عرض الكل ({stats.totalReviews})
            </Link>
          </div>
          {recentReviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--mkt-muted)' }}>لا توجد تقييمات حديثة</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentReviews.map(r => (
                <div key={r.id} style={{ padding: '12px 14px', borderRadius: 10, background: '#FAF5F8', border: '1px solid var(--mkt-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: '700', color: 'var(--mkt-ink)', fontSize: '14px' }}>{r.user_name || 'عميلة'}</span>
                    <span style={{ color: 'var(--mkt-gold)', fontWeight: 'bold' }}>{'★'.repeat(r.rating || 5)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--mkt-muted)' }}>{r.comment || 'لا يوجد تعليق'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* أحدث الشكاوى */}
        <div className="mkt-card">
          <div className="mkt-card__header">
            <div className="mkt-card__title">⚠️ أحدث تذاكر الشكاوى</div>
            <Link to="/marketing/reviews" style={{ fontSize: '13px', color: 'var(--mkt-primary)', fontWeight: '700', textDecoration: 'none' }}>
              عرض الكل ({stats.totalComplaints})
            </Link>
          </div>
          {recentComplaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--mkt-muted)' }}>لا توجد شكاوى مسجلة</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentComplaints.map(c => (
                <div key={c.id} style={{ padding: '12px 14px', borderRadius: 10, background: '#FAF5F8', border: '1px solid var(--mkt-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: '700', color: 'var(--mkt-ink)', fontSize: '14px' }}>{c.user_name || 'عميلة'} ({c.user_phone || c.phone || 'بدون هاتف'})</span>
                    <span className="mkt-badge mkt-badge--warning">{c.status || 'قيد المتابعة'}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--mkt-ink)' }}>{c.complaint_text || c.message || c.issue || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
