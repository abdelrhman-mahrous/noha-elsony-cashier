export default function OfferBanner({ details }) {
  const label = details.offerTitleAr || 'عرض خاص مطبق'
  const coveredCount = details.items.filter(i => i.isCoveredByOffer).length
  const discountAmount = details.discountAmount || 0
  const originalPrice = details.originalPrice || 0
  const offerPrice = details.price || 0

  return (
    <div className="offer-banner" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.25rem' }}>🏷️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{label}</div>
            {coveredCount > 0 && (
              <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: 2 }}>
                يشمل {coveredCount} خدمة / بند ضمن العرض
              </div>
            )}
          </div>
        </div>

        {discountAmount > 0 && (
          <div style={{
            background: 'rgba(34,197,94,0.15)',
            border: '1px solid rgba(34,197,94,0.3)',
            color: '#86efac',
            borderRadius: '99px',
            padding: '4px 12px',
            fontSize: '0.82rem',
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}>
            وفر العميل: -{discountAmount.toFixed(0)} جنيه
          </div>
        )}
      </div>

      {originalPrice > 0 && offerPrice > 0 && originalPrice > offerPrice && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.8rem',
          paddingTop: 6,
          borderTop: '1px dashed rgba(245,158,11,0.25)',
          color: 'var(--text-muted)'
        }}>
          <span>السعر الأصلي: <strong style={{ textDecoration: 'line-through' }}>{originalPrice.toFixed(0)} جنيه</strong></span>
          <span>←</span>
          <span style={{ color: 'var(--warning)', fontWeight: 800 }}>السعر بعد العرض: {offerPrice.toFixed(0)} جنيه</span>
        </div>
      )}
    </div>
  )
}

