import { useState, useEffect } from 'react'
import { loadFinancialData, addWithdrawal } from '../../services/ownerService'
import { useToast } from '../../context/ToastContext'
import { formatPrice, formatTime12, formatDateTime12 } from '../../lib/formatters'

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
  })

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

  return (
    <div className="owner-container">
      {/* ── الرأس ── */}
      <div className="owner-page-header">
        <div>
          <h1 className="owner-page-title">💰 الحسابات والمالية</h1>
          <p className="owner-page-subtitle">تقارير المبيعات، تفصيل الإيرادات وجرد المسحوبات وصافي الأرباح</p>
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
          <span>جارٍ حساب التقارير المالية...</span>
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
              <span className="owner-finance-card__sub">شامل الخدمات والمنتجات</span>
            </div>

            <div className="owner-finance-card owner-finance-card--net">
              <span className="owner-finance-card__icon">💎</span>
              <span className="owner-finance-card__label">صافي الأرباح (Net Profit)</span>
              <span className="owner-finance-card__value">
                {formatPrice(data.netProfit)} <small>ج.م</small>
              </span>
              <span className="owner-finance-card__sub">(الإيرادات + البوفيه) - المسحوبات</span>
            </div>

            <div className="owner-finance-card">
              <span className="owner-finance-card__icon">💇‍♀️</span>
              <span className="owner-finance-card__label">مبيعات الخدمات</span>
              <span className="owner-finance-card__value">
                {formatPrice(data.servicesShare)} <small>ج.م</small>
              </span>
            </div>

            <div className="owner-finance-card">
              <span className="owner-finance-card__icon">🛍️</span>
              <span className="owner-finance-card__label">مبيعات المنتجات</span>
              <span className="owner-finance-card__value">
                {formatPrice(data.productsShare)} <small>ج.م</small>
              </span>
            </div>

            <div className="owner-finance-card">
              <span className="owner-finance-card__icon">☕</span>
              <span className="owner-finance-card__label">إيراد البوفيه</span>
              <span className="owner-finance-card__value">
                {formatPrice(data.buffetTotal)} <small>ج.م</small>
              </span>
            </div>

            <div className="owner-finance-card">
              <span className="owner-finance-card__icon">🎁</span>
              <span className="owner-finance-card__label">الإكراميات (Tips)</span>
              <span className="owner-finance-card__value">
                {formatPrice(data.tipsTotal)} <small>ج.م</small>
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

          {/* ── قسم المسحوبات والمواعيد المكتملة ── */}
          <div className="owner-two-col">
            {/* 1. جدول المسحوبات */}
            <div className="owner-card">
              <div className="owner-card__header">
                <h3 className="owner-card__title">💸 سجل المسحوبات للفترة</h3>
                <span className="badge badge--danger">{formatPrice(data.withdrawalsTotal)} ج.م</span>
              </div>
              {data.withdrawals.length === 0 ? (
                <div className="owner-empty-state">
                  <span>لا توجد مسحوبات مسجلة في هذه الفترة</span>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>المبلغ</th>
                        <th>السبب</th>
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

            {/* 2. جدول المواعيد المكتملة */}
            <div className="owner-card">
              <div className="owner-card__header">
                <h3 className="owner-card__title">✅ المواعيد المحاسب عليها ({data.apptList.length})</h3>
                <span className="badge badge--success">{formatPrice(data.grossTotal)} ج.م</span>
              </div>
              {data.apptList.length === 0 ? (
                <div className="owner-empty-state">
                  <span>لا توجد مواعيد مكتملة في هذه الفترة</span>
                </div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>رقم الموعد</th>
                        <th>المبلغ المدفوع</th>
                        <th>الإكرامية</th>
                        <th>وقت الإتمام</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.apptList.map((a) => (
                        <tr key={a.id}>
                          <td style={{ fontFamily: 'monospace' }}>#{a.id.toString().slice(0, 8)}</td>
                          <td style={{ fontWeight: 'bold', color: '#10b981' }}>
                            {formatPrice(a.paid_amount || a.price || 0)} ج.م
                          </td>
                          <td>{a.tip_amount ? `${formatPrice(a.tip_amount)} ج.م` : '—'}</td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {formatTime12(a.completed_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
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
