import { useState } from 'react'

export default function PriceEditModal({ item, details, onConfirm, onClose }) {
  const [rawPrice, setRawPrice] = useState(item.unitPrice > 0 ? item.unitPrice.toString() : '')

  const hasCoverOffer = item.isCoveredByOffer && (
    details?.hasOffer ||
    (item.offerDiscountRate != null && item.offerDiscountRate > 0) ||
    item.targetDiscountAmount != null
  )

  const parsedPrice = parseFloat(rawPrice) || 0

  // حساب السعر بعد الخصم — نفس منطق Flutter تماماً
  let discountedPreview = parsedPrice
  if (hasCoverOffer && parsedPrice > 0) {
    if (item.targetDiscountType === 'fixed' && item.targetDiscountAmount > 0) {
      discountedPreview = Math.max(parsedPrice - item.targetDiscountAmount, 0)
    } else if (item.targetDiscountType === 'percentage' && item.targetDiscountAmount > 0) {
      discountedPreview = parsedPrice * (1 - item.targetDiscountAmount / 100)
    } else if (details?.discountType === 'percentage' && details?.discountValue > 0) {
      discountedPreview = parsedPrice * (1 - details.discountValue / 100)
    } else if (item.offerDiscountRate > 0) {
      discountedPreview = parsedPrice * (1 - item.offerDiscountRate)
    } else if (details?.discountValue > 0) {
      const coveredCount = Math.max(
        details.items.filter(i => i.isCoveredByOffer && i.status !== 'cancelled').length,
        1
      )
      discountedPreview = Math.max(parsedPrice - details.discountValue / coveredCount, 0)
    }
  }

  const savings = hasCoverOffer && parsedPrice > 0 ? Math.max(parsedPrice - discountedPreview, 0) : 0

  function handleConfirm() {
    if (parsedPrice < 0) return
    if (hasCoverOffer) {
      onConfirm(discountedPreview, parsedPrice)
    } else {
      onConfirm(parsedPrice, null)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__title">
          <span>✏️</span>
          <span>تحديد سعر: {item.title}</span>
        </div>

        {hasCoverOffer && item.offerDiscountNote && (
          <div className="alert alert--warning" style={{ marginBottom: 16 }}>
            <span>🏷️</span>
            <span>{item.offerDiscountNote}</span>
          </div>
        )}

        <div className="input-group">
          <label htmlFor="price-input">
            {hasCoverOffer ? 'السعر قبل الخصم (جنيه)' : 'السعر (جنيه)'}
          </label>
          <input
            id="price-input"
            className="input"
            type="number"
            min={0}
            step={1}
            placeholder="مثال: 150"
            value={rawPrice}
            onChange={e => setRawPrice(e.target.value)}
            dir="ltr"
            autoFocus
          />
        </div>

        {hasCoverOffer && parsedPrice > 0 && (
          <div style={{
            background: 'var(--success-bg)',
            border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            marginTop: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>السعر الأصلي:</span>
              <span style={{ textDecoration: 'line-through' }}>{parsedPrice.toFixed(0)} جنيه</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--success)' }}>
              <span>بعد خصم العرض:</span>
              <span>{discountedPreview.toFixed(0)} جنيه</span>
            </div>
            {savings > 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: 4 }}>
                🎁 وفّرتِ: {savings.toFixed(0)} جنيه
              </div>
            )}
          </div>
        )}

        <div className="modal__actions">
          <button
            id="price-confirm-btn"
            className="btn btn--primary"
            onClick={handleConfirm}
            disabled={parsedPrice < 0}
          >
            {hasCoverOffer ? '💾 حفظ وتطبيق الخصم' : '💾 حفظ السعر'}
          </button>
          <button className="btn btn--ghost" onClick={onClose}>إلغاء</button>
        </div>
      </div>
    </div>
  )
}
