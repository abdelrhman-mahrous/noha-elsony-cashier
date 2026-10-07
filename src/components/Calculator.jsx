import { useState, useEffect } from 'react'

export default function Calculator({
  details,
  paidAmount,
  tip,
  notes,
  saving,
  onPaidChange,
  onTipChange,
  onNotesChange,
  onCheckout,
  onCancelAppt,
}) {
  const isLocked = details.status === 'completed' || details.status === 'cancelled'

  const rawOriginalSubtotal = (details.items || [])
    .filter(i => i.status === 'delivered')
    .reduce((s, i) => s + (i.originalUnitPrice || i.unitPrice) * i.quantity, 0)

  const deliveredSubtotal = (details.items || [])
    .filter(i => i.status === 'delivered')
    .reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  const offerDiscount = Math.max(0, rawOriginalSubtotal - deliveredSubtotal)
  const depositPaid = details.depositPaid || 0
  const netCashDue = Math.max(deliveredSubtotal - depositPaid, 0)

  // فرق المبلغ بين المدفوع والمطلوب
  const diff = paidAmount - netCashDue
  const isOverpaid = diff > 0
  const isUnderpaid = diff < 0
  const isExact = diff === 0

  // وضعية الإكرامية: 'auto_tip' (الزيادة بالكامل تيبس) | 'return_change' (إرجاع الباقي بالكامل) | 'custom' (مبلغ مخصص)
  const [tipMode, setTipMode] = useState('auto_tip')
  const [customTipInput, setCustomTipInput] = useState('')

  // تحديث التيبس تلقائياً عند تغيير المدفوع أو نمط التيبس
  useEffect(() => {
    if (isLocked) return

    if (!isOverpaid) {
      if (tipMode !== 'custom') {
        onTipChange?.(0)
      }
      return
    }

    if (tipMode === 'auto_tip') {
      onTipChange?.(diff)
    } else if (tipMode === 'return_change') {
      onTipChange?.(0)
    } else if (tipMode === 'custom') {
      const customNum = parseFloat(customTipInput) || 0
      const safeTip = Math.min(Math.max(0, customNum), diff)
      onTipChange?.(safeTip)
    }
  }, [paidAmount, netCashDue, diff, isOverpaid, tipMode, customTipInput, isLocked])

  // حساب الباقي الفعلي للعميل (الزيادة - التيبس)
  const currentTip = typeof tip === 'number' ? tip : 0
  const changeToCustomer = isOverpaid ? Math.max(0, diff - currentTip) : 0

  const hasUnpricedItems = (details.items || []).some(
    i => i.status !== 'cancelled' && i.unitPrice <= 0
  )

  // أزرار الدفع السريع
  function setExactPaid() {
    onPaidChange(netCashDue)
    setTipMode('auto_tip')
  }

  function addQuickAmount(extra) {
    onPaidChange(Math.max(0, (paidAmount || netCashDue) + extra))
  }

  function roundToNextFifty() {
    const target = Math.ceil((netCashDue || 1) / 50) * 50
    onPaidChange(target === netCashDue ? target + 50 : target)
  }

  function roundToNextHundred() {
    const target = Math.ceil((netCashDue || 1) / 100) * 100
    onPaidChange(target === netCashDue ? target + 100 : target)
  }

  return (
    <div className="calculator">
      {/* ── ملخص الحساب ── */}
      <div className="calculator__rows">
        {offerDiscount > 0 && (
          <div className="calculator__row" style={{ fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>المجموع قبل الخصم:</span>
            <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontWeight: 600 }}>
              {rawOriginalSubtotal.toFixed(0)} جنيه
            </span>
          </div>
        )}

        {offerDiscount > 0 && (
          <div className="calculator__row" style={{ color: 'var(--success)', fontSize: '0.86rem' }}>
            <span>🏷️ خصم العرض ({details.offerTitleAr || 'عرض خاص'}):</span>
            <span style={{ fontWeight: 700 }}>- {offerDiscount.toFixed(0)} جنيه</span>
          </div>
        )}

        <div className="calculator__row">
          <span style={{ color: 'var(--text-muted)' }}>
            {offerDiscount > 0 ? 'إجمالي المُسلَّم (بعد الخصم):' : 'إجمالي المُسلَّم:'}
          </span>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{deliveredSubtotal.toFixed(0)} جنيه</span>
        </div>

        {depositPaid > 0 && (
          <div className="calculator__row">
            <span style={{ color: 'var(--text-muted)' }}>العربون المدفوع مسبقاً:</span>
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>- {depositPaid.toFixed(0)} جنيه</span>
          </div>
        )}

        <div className="calculator__row calculator__row--total">
          <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>المبلغ المطلوب نقداً:</span>
          <span style={{ color: 'var(--primary-light)', fontSize: '1.25rem', fontWeight: 900 }}>
            {netCashDue.toFixed(0)} جنيه
          </span>
        </div>

        {currentTip > 0 && (
          <div className="calculator__row calculator__row--tip" style={{ background: 'rgba(217, 119, 6, 0.1)', padding: '6px 10px', borderRadius: 8 }}>
            <span style={{ color: '#d97706', fontWeight: 700 }}>🎁 إكرامية / بقشيش:</span>
            <span style={{ color: '#d97706', fontWeight: 800, fontSize: '1.05rem' }}>{currentTip.toFixed(0)} جنيه</span>
          </div>
        )}

        {isUnderpaid && (
          <div className="calculator__row" style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: 8 }}>
            <span>⚠️ المبلغ المستلم أقل من المطلوب بنقص:</span>
            <span style={{ fontWeight: 800 }}>{Math.abs(diff).toFixed(0)} جنيه</span>
          </div>
        )}
      </div>

      {!isLocked && (
        <>
          {/* ── حقل إدخال المبلغ المدفوع من العميل ── */}
          <div className="calculator__paid-section" style={{ marginTop: 12, marginBottom: 10 }}>
            <div className="calculator__paid-row">
              <span className="calculator__paid-label" style={{ fontWeight: 800 }}>💵 المدفوع من العميل:</span>
              <input
                id="paid-amount-input"
                className="calculator__paid-input"
                type="number"
                min={0}
                step={1}
                value={paidAmount}
                onChange={e => onPaidChange(parseFloat(e.target.value) || 0)}
              />
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>جنيه</span>
            </div>

            {/* أزرار سريعة لتسجيل المبلغ المدفوع */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <button
                type="button"
                className="btn btn--sm btn--secondary"
                style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                onClick={setExactPaid}
              >
                المبلغ مضبوط ({netCashDue.toFixed(0)})
              </button>
              <button
                type="button"
                className="btn btn--sm btn--secondary"
                style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                onClick={roundToNextFifty}
              >
                تقريب لـ 50
              </button>
              <button
                type="button"
                className="btn btn--sm btn--secondary"
                style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                onClick={roundToNextHundred}
              >
                تقريب لـ 100
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                onClick={() => addQuickAmount(20)}
              >
                +20
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                style={{ fontSize: '0.78rem', padding: '3px 8px' }}
                onClick={() => addQuickAmount(50)}
              >
                +50
              </button>
            </div>
          </div>

          {/* ── خيارات التيبس والباقي عند وجود زيادة في المدفوع ── */}
          {isOverpaid && (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                borderRadius: 12,
                padding: '10px 12px',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
                  الزيادة عن المطلوب: <span style={{ color: 'var(--warning)', fontWeight: 800 }}>+{diff.toFixed(0)} جنيه</span>
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>اختر طريقة التوزيع:</span>
              </div>

              {/* أوضاع توزيع الزيادة */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setTipMode('auto_tip')}
                  style={{
                    padding: '6px 4px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: tipMode === 'auto_tip' ? '2px solid #d97706' : '1px solid var(--border-color, rgba(255,255,255,0.15))',
                    background: tipMode === 'auto_tip' ? 'rgba(217, 119, 6, 0.2)' : 'transparent',
                    color: tipMode === 'auto_tip' ? '#fbbf24' : 'var(--text-muted)',
                  }}
                >
                  🎁 الزيادة كإكرامية
                </button>

                <button
                  type="button"
                  onClick={() => setTipMode('return_change')}
                  style={{
                    padding: '6px 4px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: tipMode === 'return_change' ? '2px solid #10b981' : '1px solid var(--border-color, rgba(255,255,255,0.15))',
                    background: tipMode === 'return_change' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: tipMode === 'return_change' ? '#34d399' : 'var(--text-muted)',
                  }}
                >
                  💵 إرجاع الباقي للعميل
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTipMode('custom')
                    setCustomTipInput(currentTip > 0 ? String(currentTip) : '')
                  }}
                  style={{
                    padding: '6px 4px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: tipMode === 'custom' ? '2px solid var(--primary)' : '1px solid var(--border-color, rgba(255,255,255,0.15))',
                    background: tipMode === 'custom' ? 'rgba(183, 110, 121, 0.2)' : 'transparent',
                    color: tipMode === 'custom' ? 'var(--primary-light)' : 'var(--text-muted)',
                  }}
                >
                  ✏️ تيبس مخصص
                </button>
              </div>

              {/* حقل التيبس المخصص لو اختار custom */}
              {tipMode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>مبلغ الإكرامية:</span>
                  <input
                    type="number"
                    min={0}
                    max={diff}
                    step={1}
                    className="input"
                    style={{ padding: '4px 8px', fontSize: '0.88rem', height: 32 }}
                    placeholder={`من 0 إلى ${diff.toFixed(0)}`}
                    value={customTipInput}
                    onChange={e => setCustomTipInput(e.target.value)}
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>جنيه</span>
                </div>
              )}

              {/* بطاقة الباقي المستحق للعميل */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: changeToCustomer > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  border: changeToCustomer > 0 ? '1px solid #10b981' : '1px solid transparent',
                }}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: changeToCustomer > 0 ? '#10b981' : 'var(--text-muted)' }}>
                  {changeToCustomer > 0 ? '💵 الباقي المستحق للعميل:' : '✅ لا يوجد باقي للعميل (المبلغ مغطى بالكامل)'}
                </span>
                {changeToCustomer > 0 && (
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>
                    {changeToCustomer.toFixed(0)} جنيه
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="calculator__notes">
            <textarea
              id="notes-input"
              placeholder="ملاحظات الكاشير (اختياري)..."
              value={notes}
              onChange={e => onNotesChange(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="calculator__actions">
            <button
              id="checkout-btn"
              className="btn btn--primary"
              style={{ flex: 1 }}
              disabled={saving || hasUnpricedItems}
              onClick={onCheckout}
            >
              {saving ? (
                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> جارٍ الحفظ...</>
              ) : (
                '✅ إتمام المحاسبة'
              )}
            </button>

            {details.status !== 'cancelled' && (
              <button
                id="cancel-appt-btn"
                className="btn btn--danger"
                onClick={onCancelAppt}
                disabled={saving}
              >
                🚫 إلغاء الموعد
              </button>
            )}
          </div>

          {hasUnpricedItems && (
            <div className="alert alert--warning" style={{ marginTop: 8, fontSize: '0.82rem' }}>
              <span>⚠️</span>
              <span>يوجد بنود بدون سعر — حدد السعر أولاً</span>
            </div>
          )}
        </>
      )}

      {isLocked && (
        <div className="completed-banner" style={{ marginTop: 8 }}>
          {details.status === 'completed' ? '✅ تم إقفال هذا الموعد' : '🚫 هذا الموعد ملغي'}
        </div>
      )}
    </div>
  )
}

