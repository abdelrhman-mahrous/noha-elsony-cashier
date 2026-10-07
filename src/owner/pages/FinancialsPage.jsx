import { useState, useEffect } from 'react'
import { loadFinancialData, addWithdrawal } from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'
import { formatPrice, formatTime12, formatDateTime12 } from '../../lib/formatters'
import OwnerProfitDiagrams from '../components/OwnerProfitDiagrams'

const PERIODS = [
  { key: 'today',  label: 'اليوم' },
  { key: 'week',   label: 'آخر 7 أيام' },
  { key: 'month',  label: 'هذا الشهر' },
  { key: 'year',   label: 'هذا العام' },
  { key: 'custom', label: 'تاريخ مخصص' },
]

export default function FinancialsPage() {
  const showToast = useToast()
  const [period, setPeriod] = useState('today')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [loading, setLoading] = useState(true)
  
  const [data, setData] = useState({
    apptList: [],
    servicesShare: 0,
    productsShare: 0,
    buffetTotal: 0,
    tipsTotal: 0,
    grossTotal: 0,
    withdrawals: [],
    withdrawalsTotal: 0,
    netProfit: 0,
    dailyStats: [],
  })

  // فلاتر وبحث جدول المبيعات
  const [salesSearch, setSalesSearch] = useState('')
  const [salesFilter, setSalesFilter] = useState('all') // 'all' | 'changes_only' | 'with_buffet' | 'with_tips'
  const [selectedApptDetail, setSelectedApptDetail] = useState(null)

  // سحب جديد
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
  const [wAmount, setWAmount] = useState('')
  const [wReason, setWReason] = useState('')
  const [wSaving, setWSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [period, customStart, customEnd])

  async function fetchData() {
    if (period === 'custom' && (!customStart || !customEnd)) return
    setLoading(true)
    try {
      const res = await loadFinancialData(period, customStart, customEnd)
      setData(res)
    } catch (e) {
      showToast('خطأ في تحميل البيانات المالية: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddWithdrawal(e) {
    e.preventDefault()
    const amountNum = parseFloat(wAmount)
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      showToast('يرجى كتابة مبلغ موجب صحيح أكبر من صفر', 'error')
      return
    }
    if (!wReason.trim()) {
      showToast('يرجى كتابة سبب المسحوبة', 'error')
      return
    }
    
    setWSaving(true)
    try {
      await addWithdrawal({
        amount: amountNum,
        reason: wReason.trim(),
        date: new Date().toISOString(),
      })
      showToast('تم تسجيل المسحوبة بنجاح', 'success')
      setShowWithdrawalModal(false)
      setWAmount('')
      setWReason('')
      fetchData()
    } catch (err) {
      showToast('خطأ في تسجيل المسحوبة: ' + err.message, 'error')
    } finally {
      setWSaving(false)
    }
  }

  // فلترة قائمة المبيعات
  const filteredSales = (data.apptList || []).filter(appt => {
    // 1. البحث
    if (salesSearch.trim()) {
      const q = salesSearch.trim().toLowerCase()
      const matchName = (appt.user_name || '').toLowerCase().includes(q)
      const matchPhone = (appt.user_phone || '').toLowerCase().includes(q)
      const matchCode = (appt.appointment_code || '').toLowerCase().includes(q)
      const matchBarber = (appt.barbers?.name || '').toLowerCase().includes(q)
      if (!matchName && !matchPhone && !matchCode && !matchBarber) return false
    }

    // 2. الفلتر النوعي
    if (salesFilter === 'changes_only') {
      return appt.hasCashierChanges === true
    }
    if (salesFilter === 'with_buffet') {
      return (appt.buffetItems && appt.buffetItems.length > 0) || (appt.buffetSum > 0)
    }
    if (salesFilter === 'with_products') {
      return (appt.products && appt.products.length > 0) || (appt.productsSum > 0)
    }
    if (salesFilter === 'with_tips') {
      return (appt.tip_amount || 0) > 0
    }

    return true
  })

  return (
    <div className="owner-container">
      {/* ── الرأس ── */}
      <div className="owner-page-header">
        <div>
          <h1 className="owner-page-title">💰 الحسابات والمالية ولوحة الأرباح</h1>
          <p className="owner-page-subtitle">تقارير المبيعات، دخل البوفيه، الإكراميات، دايجرامز الأرباح اليومية، وسجل تعديلات الكاشير</p>
        </div>
        <button
          className="btn btn--primary"
          style={{ background: 'var(--rose-gradient)' }}
          onClick={() => setShowWithdrawalModal(true)}
        >
          ➕ إضافة مسحوبة جديدة
        </button>
      </div>

      {/* ── فلاتر الفترة ── */}
      <div className="owner-filters-card">
        <div className="owner-period-tabs">
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`owner-period-tab${period === p.key ? ' owner-period-tab--active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="owner-custom-dates">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">من تاريخ</label>
              <input
                type="date"
                className="form-input"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">إلى تاريخ</label>
              <input
                type="date"
                className="form-input"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-center" style={{ minHeight: '300px' }}>
          <span className="spinner spinner--lg" />
          <span>جارٍ حساب التقارير والدايجرامز المالية...</span>
        </div>
      ) : (
        <>
          {/* ── الكروت المالية الكبرى ── */}
          <div className="owner-finance-grid">
            <div className="owner-finance-card owner-finance-card--gross">
              <span className="owner-finance-card__icon">💵</span>
              <span className="owner-finance-card__label">إجمالي الإيرادات (Gross)</span>
              <span className="owner-finance-card__value">
                {formatPrice(data.grossTotal)} <small>ج.م</small>
              </span>
              <span className="owner-finance-card__sub">شامل الخدمات، البوفيه، المنتجات والإكراميات</span>
            </div>

            <div className="owner-finance-card owner-finance-card--net">
              <span className="owner-finance-card__icon">💎</span>
              <span className="owner-finance-card__label">صافي الأرباح (Net Profit)</span>
              <span className="owner-finance-card__value">
                {formatPrice(data.netProfit)} <small>ج.م</small>
              </span>
              <span className="owner-finance-card__sub">إجمالي الإيرادات - المسحوبات</span>
            </div>

            <div className="owner-finance-card">
              <span className="owner-finance-card__icon">💇‍♀️</span>
              <span className="owner-finance-card__label">مبيعات الخدمات</span>
              <span className="owner-finance-card__value">
                {formatPrice(data.servicesShare)} <small>ج.م</small>
              </span>
            </div>

            <div className="owner-finance-card">
              <span className="owner-finance-card__icon">☕</span>
              <span className="owner-finance-card__label">دخل البوفيه والمشروبات</span>
              <span className="owner-finance-card__value" style={{ color: '#d97706' }}>
                {formatPrice(data.buffetTotal)} <small>ج.م</small>
              </span>
            </div>

            <div className="owner-finance-card">
              <span className="owner-finance-card__icon">🎁</span>
              <span className="owner-finance-card__label">إكراميات وتيبس العملاء</span>
              <span className="owner-finance-card__value" style={{ color: '#ec4899' }}>
                {formatPrice(data.tipsTotal)} <small>ج.م</small>
              </span>
            </div>

            <div className="owner-finance-card">
              <span className="owner-finance-card__icon">🛍️</span>
              <span className="owner-finance-card__label">مبيعات المنتجات</span>
              <span className="owner-finance-card__value">
                {formatPrice(data.productsShare)} <small>ج.م</small>
              </span>
            </div>

            <div className="owner-finance-card owner-finance-card--danger">
              <span className="owner-finance-card__icon">💸</span>
              <span className="owner-finance-card__label">إجمالي المسحوبات</span>
              <span className="owner-finance-card__value">
                {formatPrice(data.withdrawalsTotal)} <small>ج.م</small>
              </span>
              <span className="owner-finance-card__sub">{data.withdrawals.length} مسحوبة مسجلة</span>
            </div>
          </div>

          {/* ── الرسوم البيانية والدايجرامز التفاعلية ── */}
          <OwnerProfitDiagrams
            dailyStats={data.dailyStats || []}
            servicesShare={data.servicesShare}
            productsShare={data.productsShare}
            buffetTotal={data.buffetTotal}
            tipsTotal={data.tipsTotal}
            grossTotal={data.grossTotal}
            withdrawalsTotal={data.withdrawalsTotal}
            netProfit={data.netProfit}
            totalApptsCount={data.apptList.length}
          />

          {/* ── المنتجات والباقات الأكثر مبيعاً في الفترة ── */}
          {((data.topProducts && data.topProducts.length > 0) || (data.topBundles && data.topBundles.length > 0)) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
              {data.topProducts && data.topProducts.length > 0 && (
                <div className="owner-card">
                  <div className="owner-card__header">
                    <h3 className="owner-card__title">🛍️ أكثر المنتجات مبيعاً في الفترة</h3>
                    <span className="badge badge--success">{formatPrice(data.productsShare)} ج.م</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.topProducts.slice(0, 5).map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#FAF5F8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--staff-rose-dark)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{p.name}</span>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontWeight: 800, color: '#10b981' }}>{p.count} قطعة</span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--staff-muted)' }}>({formatPrice(p.revenue)} ج.م)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.topBundles && data.topBundles.length > 0 && (
                <div className="owner-card">
                  <div className="owner-card__header">
                    <h3 className="owner-card__title">🎁 أكثر الباقات طلباً في الفترة</h3>
                    <span className="badge badge--primary">باقات عروض</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.topBundles.slice(0, 5).map((b, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: '#FAF5F8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#7D2E46', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{b.name}</span>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontWeight: 800, color: '#7D2E46' }}>{b.count} باقات</span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--staff-muted)' }}>({formatPrice(b.revenue)} ج.م)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── سجل المسحوبات ── */}
          <div className="owner-card" style={{ marginBottom: 24 }}>
            <div className="owner-card__header">
              <h3 className="owner-card__title">💸 سجل المسحوبات للفترة</h3>
              <span className="badge badge--danger">{formatPrice(data.withdrawalsTotal)} ج.م</span>
            </div>
            {data.withdrawals.length === 0 ? (
              <div className="owner-empty-state">
                <span>لا توجد مسحوبات مسجلة في هذه الفترة</span>
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>المبلغ</th>
                      <th>السبب</th>
                      <th>المسؤول</th>
                      <th>التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td style={{ fontWeight: 'bold', color: '#f43f5e' }}>
                          {formatPrice(w.amount)} ج.م
                        </td>
                        <td>{w.reason}</td>
                        <td style={{ fontSize: '0.85rem' }}>{w.withdrawn_by || 'الأونر'}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {formatDateTime12(w.withdrawal_date || w.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── جدول تفاصيل المبيعات وسجل تعديلات الكاشير ── */}
          <div className="owner-card">
            <div className="owner-card__header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 className="owner-card__title">
                  🧾 تفاصيل مبيعات الكاشير وسجل التدقيق ({filteredSales.length} من {data.apptList.length})
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--staff-muted)' }}>
                  اضغطي على أي فاتورة لعرض تفاصيل الخدمات، البوفيه، المنتجات، وأي تعديل أو إلغاء أجراه الكاشير
                </p>
              </div>
              <span className="badge badge--success" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                إجمالي المبيعات: {formatPrice(data.grossTotal)} ج.م
              </span>
            </div>

            {/* شريط البحث وفلاتر التدقيق */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <input
                  type="text"
                  className="input"
                  style={{ background: 'var(--staff-bg)', border: '1px solid var(--staff-border)' }}
                  placeholder="ابحثي باسم العميل، رقم الهاتف، كود الموعد، أو الكوافيرة..."
                  value={salesSearch}
                  onChange={e => setSalesSearch(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`owner-period-tab ${salesFilter === 'all' ? 'owner-period-tab--active' : ''}`}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={() => setSalesFilter('all')}
                >
                  الكل ({data.apptList.length})
                </button>
                <button
                  type="button"
                  className={`owner-period-tab ${salesFilter === 'changes_only' ? 'owner-period-tab--active' : ''}`}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={() => setSalesFilter('changes_only')}
                >
                  ⚠️ به تعديلات / إلغاءات ({data.apptList.filter(a => a.hasCashierChanges).length})
                </button>
                <button
                  type="button"
                  className={`owner-period-tab ${salesFilter === 'with_buffet' ? 'owner-period-tab--active' : ''}`}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={() => setSalesFilter('with_buffet')}
                >
                  ☕ يحتوي على بوفيه ({data.apptList.filter(a => (a.buffetItems?.length > 0) || a.buffetSum > 0).length})
                </button>
                <button
                  type="button"
                  className={`owner-period-tab ${salesFilter === 'with_products' ? 'owner-period-tab--active' : ''}`}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={() => setSalesFilter('with_products')}
                >
                  🛍️ يحتوي على منتجات ({data.apptList.filter(a => (a.products?.length > 0) || a.productsSum > 0).length})
                </button>
                <button
                  type="button"
                  className={`owner-period-tab ${salesFilter === 'with_tips' ? 'owner-period-tab--active' : ''}`}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  onClick={() => setSalesFilter('with_tips')}
                >
                  🎁 به إكرامية ({data.apptList.filter(a => (a.tip_amount || 0) > 0).length})
                </button>
              </div>
            </div>

            {filteredSales.length === 0 ? (
              <div className="owner-empty-state">
                <span>لا توجد مبيعات تطابق معايير البحث المحددة</span>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>كود الموعد</th>
                      <th>العميلة / الكوافيرة</th>
                      <th>الخدمات</th>
                      <th>البوفيه</th>
                      <th>المنتجات</th>
                      <th>الإكرامية (Tips)</th>
                      <th>المدفوع النهائي</th>
                      <th>تعديلات الكاشير</th>
                      <th>التاريخ والوقت</th>
                      <th>التفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((a) => (
                      <tr
                        key={a.id}
                        style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                        onClick={() => setSelectedApptDetail(a)}
                      >
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {a.appointment_code || `#${a.id.toString().slice(0, 8)}`}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--staff-ink)' }}>{a.user_name || 'عميلة'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--staff-muted)' }}>
                            {a.barbers?.name ? `💇‍♀️ ${a.barbers.name}` : ''} {a.user_phone ? `• 📱 ${a.user_phone}` : ''}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {formatPrice(a.servicesSum)} ج.م
                        </td>
                        <td style={{ fontWeight: 600, color: a.buffetSum > 0 ? '#d97706' : 'var(--staff-muted)' }}>
                          {a.buffetSum > 0 ? (
                            <span>
                              {formatPrice(a.buffetSum)} ج.م
                              {a.buffetItems?.some(b => (b.quantity || 1) > 1) && (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: '#b45309',
                                    background: '#fef3c7',
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    marginRight: 4,
                                    display: 'inline-block',
                                  }}
                                  title="تمت زيادة كمية البوفيه"
                                >
                                  ×{a.buffetItems.reduce((acc, b) => acc + (b.quantity || 1), 0)}
                                </span>
                              )}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: a.productsSum > 0 ? '#f97316' : 'var(--staff-muted)' }}>
                          {a.productsSum > 0 ? (
                            <span>
                              {formatPrice(a.productsSum)} ج.م
                              {a.products?.some(p => (p.quantity || 1) > 1) && (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: '#c2410c',
                                    background: '#ffedd5',
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    marginRight: 4,
                                    display: 'inline-block',
                                  }}
                                  title="تمت زيادة كمية المنتجات"
                                >
                                  ×{a.products.reduce((acc, p) => acc + (p.quantity || 1), 0)}
                                </span>
                              )}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ fontWeight: 700, color: a.tip_amount > 0 ? '#ec4899' : 'var(--staff-muted)' }}>
                          {a.tip_amount > 0 ? `+${formatPrice(a.tip_amount)} ج.م` : '—'}
                        </td>
                        <td style={{ fontWeight: 800, color: '#10b981', fontSize: '1.02rem' }}>
                          {formatPrice(a.paid_amount || a.price || 0)} ج.م
                        </td>
                        <td>
                          {a.hasCashierChanges ? (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {a.cashierChanges.map((chg, ci) => (
                                <span
                                  key={ci}
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: 6,
                                    background: `${chg.badgeColor}20`,
                                    color: chg.badgeColor,
                                    border: `1px solid ${chg.badgeColor}50`,
                                  }}
                                  title={`${chg.label}: ${chg.title} ${chg.detail ? `(${chg.detail})` : ''} ${chg.reason ? `[${chg.reason}]` : ''}`}
                                >
                                  {chg.label}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--staff-muted)' }}>✅ كالمعتاد</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--staff-muted)' }}>
                          {formatTime12(a.completed_at)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn--sm btn--secondary"
                            style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedApptDetail(a)
                            }}
                          >
                            👁️ فحص
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── نافذة فحص تفاصيل الفاتورة وتعديلات الكاشير الكاملة ── */}
      {selectedApptDetail && (
        <div className="modal-overlay" onClick={() => setSelectedApptDetail(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  🧾 تفاصيل الفاتورة #{selectedApptDetail.appointment_code || selectedApptDetail.id.toString().slice(0, 8)}
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--staff-muted)' }}>
                  وقت الإتمام: {formatDateTime12(selectedApptDetail.completed_at)}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedApptDetail(null)}>✕</button>
            </div>

            {/* بيانات العميل والكوافيرة */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 10,
                padding: '12px 14px',
                background: 'var(--staff-bg)',
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ fontSize: '0.76rem', color: 'var(--staff-muted)' }}>العميلة</span>
                <div style={{ fontWeight: 800, color: 'var(--staff-ink)' }}>{selectedApptDetail.user_name || 'عميلة'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.76rem', color: 'var(--staff-muted)' }}>رقم الهاتف</span>
                <div style={{ fontWeight: 700, direction: 'ltr', textAlign: 'right' }}>{selectedApptDetail.user_phone || '—'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.76rem', color: 'var(--staff-muted)' }}>الكوافيرة المسؤولة</span>
                <div style={{ fontWeight: 700 }}>{selectedApptDetail.barbers?.name || '—'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.76rem', color: 'var(--staff-muted)' }}>حالة الحجز</span>
                <div style={{ fontWeight: 700, color: '#10b981' }}>✅ مكتمل ومحاسب عليه</div>
              </div>
            </div>

            {/* ── سجل تعديلات الكاشير المميزة ── */}
            {selectedApptDetail.hasCashierChanges && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid #f59e0b',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 800, color: '#b45309', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠️ تنبيهات وتعديلات الكاشير على هذا الموعد:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedApptDetail.cashierChanges.map((chg, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: '0.86rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.85)',
                        borderRadius: 6,
                        borderRight: `4px solid ${chg.badgeColor}`,
                      }}
                    >
                      <div>
                        <strong style={{ color: chg.badgeColor }}>• {chg.label}:</strong> {chg.title}
                        {chg.reason && <span style={{ color: '#ef4444', marginRight: 6 }}>(سبب الإلغاء: {chg.reason})</span>}
                      </div>
                      {chg.detail && (
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: chg.badgeColor }}>
                          {chg.detail}
                        </span>
                      )}
                      {chg.fromPrice != null && chg.toPrice != null && !chg.detail && (
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                          من <span style={{ textDecoration: 'line-through', color: 'var(--staff-muted)' }}>{chg.fromPrice}</span> إلى <span style={{ color: '#10b981' }}>{chg.toPrice} ج.م</span>
                        </span>
                      )}
                      {chg.discount != null && (
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981' }}>
                          خصم {chg.discount} ج.م
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── بنود الخدمات ── */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--staff-ink)', marginBottom: 6 }}>
                💇‍♀️ الخدمات والباقات ({(selectedApptDetail.services || []).length})
              </div>
              {(selectedApptDetail.services || []).length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--staff-muted)', padding: '4px 0' }}>لا توجد خدمات مسجلة</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedApptDetail.services.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: s.status === 'cancelled' ? 'rgba(239, 68, 68, 0.08)' : 'var(--staff-bg)',
                        border: s.status === 'cancelled' ? '1px dashed #ef4444' : '1px solid var(--staff-border)',
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, textDecoration: s.status === 'cancelled' ? 'line-through' : 'none' }}>
                          {s.service_name || 'خدمة'}
                        </span>
                        {(s.quantity || 1) > 1 && (
                          <span style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '0.76rem', padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>
                            الكمية: {s.quantity}
                          </span>
                        )}
                        {s.status === 'cancelled' && (
                          <span style={{ color: '#ef4444', fontSize: '0.78rem', marginRight: 8 }}>
                            [ملغية — السبب: {s.cancel_reason || 'بدون سبب'}]
                          </span>
                        )}
                        {s.is_custom_price && s.status !== 'cancelled' && (
                          <span style={{ color: '#f59e0b', fontSize: '0.76rem', marginRight: 8 }}>
                            (سعر مخصص)
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 800 }}>
                        {s.status === 'cancelled' ? (
                          <span style={{ color: '#ef4444' }}>0 ج.م</span>
                        ) : (
                          <span>
                            {(s.quantity || 1) > 1 && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--staff-muted)', fontWeight: 600, marginLeft: 6 }}>
                                ({s.quantity} × {formatPrice(s.unit_price || (s.price / s.quantity))}) =
                              </span>
                            )}
                            {formatPrice(s.price)} ج.م
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── بنود البوفيه والمشروبات ── */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#d97706', marginBottom: 6 }}>
                ☕ خدمات البوفيه والمشروبات ({(selectedApptDetail.buffetItems || []).length})
              </div>
              {(selectedApptDetail.buffetItems || []).length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--staff-muted)', padding: '4px 0' }}>لا توجد مشروبات أو طلبات بوفيه بهذا الموعد</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedApptDetail.buffetItems.map((b, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: b.status === 'cancelled' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(217, 119, 6, 0.06)',
                        border: b.status === 'cancelled' ? '1px dashed #ef4444' : '1px solid rgba(217, 119, 6, 0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, textDecoration: b.status === 'cancelled' ? 'line-through' : 'none' }}>
                          ☕ {b.service_name || 'طلب بوفيه'}
                        </span>
                        <span
                          style={{
                            background: (b.quantity || 1) > 1 ? '#fef3c7' : '#f3f4f6',
                            color: (b.quantity || 1) > 1 ? '#92400e' : '#4b5563',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            padding: '2px 8px',
                            borderRadius: 6,
                            border: (b.quantity || 1) > 1 ? '1px solid #fde68a' : '1px solid #e5e7eb',
                          }}
                        >
                          الكمية: {b.quantity || 1}
                        </span>
                        {b.status === 'cancelled' && (
                          <span style={{ color: '#ef4444', fontSize: '0.78rem' }}>
                            [ملغي — السبب: {b.cancel_reason || 'بدون سبب'}]
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 800, color: '#d97706' }}>
                        {b.status === 'cancelled' ? (
                          '0 ج.م'
                        ) : (
                          <span>
                            {(b.quantity || 1) > 1 && (
                              <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600, marginLeft: 6 }}>
                                ({b.quantity} × {formatPrice(b.unit_price || (b.price / b.quantity))}) =
                              </span>
                            )}
                            {formatPrice(b.price)} ج.م
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── بنود المنتجات ── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f97316', marginBottom: 6 }}>
                🛍️ المنتجات والمستحضرات ({(selectedApptDetail.products || []).length})
              </div>
              {(selectedApptDetail.products || []).length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--staff-muted)', padding: '4px 0' }}>لا توجد منتجات مشتراة بهذا الموعد</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedApptDetail.products.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: p.status === 'cancelled' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(249, 115, 22, 0.06)',
                        border: p.status === 'cancelled' ? '1px dashed #ef4444' : '1px solid rgba(249, 115, 22, 0.2)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, textDecoration: p.status === 'cancelled' ? 'line-through' : 'none' }}>
                          🛍️ {p.product_name || 'منتج'}
                        </span>
                        <span
                          style={{
                            background: (p.quantity || 1) > 1 ? '#ffedd5' : '#f3f4f6',
                            color: (p.quantity || 1) > 1 ? '#9a3412' : '#4b5563',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            padding: '2px 8px',
                            borderRadius: 6,
                            border: (p.quantity || 1) > 1 ? '1px solid #fed7aa' : '1px solid #e5e7eb',
                          }}
                        >
                          الكمية: {p.quantity || 1}
                        </span>
                        {p.status === 'cancelled' && (
                          <span style={{ color: '#ef4444', fontSize: '0.78rem' }}>
                            [ملغي — السبب: {p.cancel_reason || 'بدون سبب'}]
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 800, color: '#f97316' }}>
                        {p.status === 'cancelled' ? (
                          '0 ج.م'
                        ) : (
                          <span>
                            {(p.quantity || 1) > 1 && (
                              <span style={{ fontSize: '0.78rem', color: '#ea580c', fontWeight: 600, marginLeft: 6 }}>
                                ({p.quantity} × {formatPrice(p.unit_price || ((p.total_price || p.price) / p.quantity))}) =
                              </span>
                            )}
                            {formatPrice(p.total_price || p.unit_price || p.price || 0)} ج.م
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── ملخص المبالغ والمالية ── */}
            <div
              style={{
                borderTop: '2px dashed var(--staff-divider)',
                paddingTop: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: '0.9rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--staff-muted)' }}>إجمالي الخدمات:</span>
                <span style={{ fontWeight: 700 }}>{formatPrice(selectedApptDetail.servicesSum)} ج.م</span>
              </div>
              {selectedApptDetail.buffetSum > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                  <span>إجمالي البوفيه:</span>
                  <span style={{ fontWeight: 700 }}>+{formatPrice(selectedApptDetail.buffetSum)} ج.م</span>
                </div>
              )}
              {selectedApptDetail.productsSum > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f97316' }}>
                  <span>إجمالي المنتجات:</span>
                  <span style={{ fontWeight: 700 }}>+{formatPrice(selectedApptDetail.productsSum)} ج.م</span>
                </div>
              )}
              {selectedApptDetail.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>خصم العرض ({selectedApptDetail.offer_title_ar || 'عرض خاص'}):</span>
                  <span style={{ fontWeight: 700 }}>-{formatPrice(selectedApptDetail.discount_amount)} ج.م</span>
                </div>
              )}
              {(selectedApptDetail.deposit_amount || selectedApptDetail.deposit_paid || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                  <span>العربون المدفوع مسبقاً:</span>
                  <span style={{ fontWeight: 700 }}>-{formatPrice(selectedApptDetail.deposit_amount || selectedApptDetail.deposit_paid)} ج.م</span>
                </div>
              )}
              {selectedApptDetail.tip_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ec4899' }}>
                  <span>🎁 إكرامية / بقشيش:</span>
                  <span style={{ fontWeight: 800 }}>+{formatPrice(selectedApptDetail.tip_amount)} ج.م</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--staff-divider)',
                  paddingTop: 8,
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  color: 'var(--staff-ink)',
                }}
              >
                <span>المبلغ المستلم والمحاسب عليه:</span>
                <span style={{ color: '#10b981' }}>
                  {formatPrice(selectedApptDetail.paid_amount || selectedApptDetail.price || 0)} جنيه
                </span>
              </div>
            </div>

            {/* ملاحظات الكاشير */}
            {selectedApptDetail.cashier_notes && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  background: 'var(--staff-bg)',
                  borderRadius: 8,
                  fontSize: '0.84rem',
                  color: 'var(--staff-ink)',
                }}
              >
                💬 <strong>ملاحظات الكاشير:</strong> {selectedApptDetail.cashier_notes}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setSelectedApptDetail(null)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── نافذة إضافة مسحوبة ── */}
      {showWithdrawalModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="modal-title">💸 تسجيل مسحوبة جديدة</h3>
              <button className="modal-close-btn" onClick={() => setShowWithdrawalModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddWithdrawal}>
              <div className="form-group">
                <label className="form-label">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  className="form-input"
                  placeholder="مثال: 500"
                  value={wAmount}
                  onKeyDown={e => {
                    if (e.key === '-' || e.key === 'e' || e.key === '+') {
                      e.preventDefault()
                    }
                  }}
                  onChange={e => {
                    const val = e.target.value
                    if (val === '' || parseFloat(val) >= 0) {
                      setWAmount(val.replace('-', ''))
                    }
                  }}
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">السبب / البيان *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="مثال: مشتريات خامات، كهرباء، صيانة..."
                  value={wReason}
                  onChange={e => setWReason(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setShowWithdrawalModal(false)}
                  disabled={wSaving}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{ background: 'var(--rose-gradient)' }}
                  disabled={wSaving}
                >
                  {wSaving ? 'جارٍ الحفظ...' : 'حفظ المسحوبة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

