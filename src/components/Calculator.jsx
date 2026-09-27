export default function Calculator({
  details,
  paidAmount,
  tip,
  countExtraAsTip,
  notes,
  saving,
  onPaidChange,
  onToggleTip,
  onNotesChange,
  onCheckout,
  onCancelAppt,
}) {
  const isLocked = details.status === 'completed' || details.status === 'cancelled'

  const deliveredSubtotal = details.items
    .filter(i => i.status === 'delivered')
    .reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  const depositPaid = details.depositPaid || 0
  const netCashDue = Math.max(deliveredSubtotal - depositPaid, 0)
  const change = paidAmount - netCashDue

  const hasUnpricedItems = details.items.some(
    i => i.status !== 'cancelled' && i.unitPrice <= 0
  )

  return (
    <div className="calculator">
      {/* Summary rows */}
      <div className="calculator__rows">
        <div className="calculator__row">
          <span style={{ color: 'var(--text-muted)' }}>إجمالي المُسلَّم:</span>
          <span style={{ fontWeight: 700 }}>{deliveredSubtotal.toFixed(0)} جنيه</span>
        </div>

        {depositPaid > 0 && (
          <div className="calculator__row">
            <span style={{ color: 'var(--text-muted)' }}>العربون المدفوع:</span>
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>- {depositPaid.toFixed(0)} جنيه</span>
          </div>
        )}

        <div className="calculator__row calculator__row--total">
          <span>المبلغ المطلوب نقداً:</span>
          <span style={{ color: 'var(--primary-light)' }}>{netCashDue.toFixed(0)} جنيه</span>
        </div>

        {tip > 0 && (
          <div className="calculator__row calculator__row--tip">
            <span>🤍 بقشيش:</span>
            <span>{tip.toFixed(0)} جنيه</span>
          </div>
        )}

        {change < 0 && (
          <div className="calculator__row" style={{ color: 'var(--error)' }}>
            <span>⚠️ المبلغ المدفوع أقل من المطلوب:</span>
            <span>{Math.abs(change).toFixed(0)} جنيه</span>
          </div>
        )}
      </div>

      {!isLocked && (
        <>
          {/* Paid amount input */}
          <div className="calculator__paid-row">
            <span className="calculator__paid-label">المبلغ المدفوع:</span>
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

          {/* Count extra as tip toggle */}
          {change > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <input
                id="tip-toggle"
                type="checkbox"
                checked={countExtraAsTip}
                onChange={e => onToggleTip(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="tip-toggle" style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--warning)' }}>
                احتساب الزيادة ({change.toFixed(0)} جنيه) كبقشيش
              </label>
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
