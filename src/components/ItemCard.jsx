export default function ItemCard({ item, locked, onToggle, onEditPrice, onQuantityChange }) {
  const isDelivered = item.status === 'delivered'
  const isCancelled = item.status === 'cancelled'
  const hasZeroPrice = item.unitPrice <= 0

  const typeIcon = {
    service: '💇‍♀️',
    package: '📦',
    addon:   '☕',
    product: '🛍️',
  }[item.itemType] || '•'

  function handleClick() {
    if (!locked) onToggle()
  }

  const isDiscounted = item.originalUnitPrice > item.unitPrice && isDelivered

  return (
    <div
      className={`item-card${isCancelled ? ' item-card--cancelled' : ''}${locked ? ' item-card--completed' : ''}`}
      onClick={handleClick}
      role={locked ? undefined : 'button'}
    >
      {/* Checkbox */}
      <div className={`item-card__check${
        isDelivered ? ' item-card__check--delivered' :
        isCancelled ? ' item-card__check--cancelled' : ''
      }`}>
        {isDelivered && '✓'}
        {isCancelled && '✕'}
      </div>

      {/* Body */}
      <div className="item-card__body">
        <div className="item-card__title">
          <span>{typeIcon}</span>
          <span>{item.title}</span>
          {item.isCoveredByOffer && (
            <span className="badge badge--warning" style={{ fontSize: '0.7rem' }}>🏷️ عرض</span>
          )}
          {item.isNewlyAdded && (
            <span className="badge badge--success" style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              ➕ مضاف بالصالون
            </span>
          )}
          {isCancelled && item.cancelReason && (
            <span style={{ fontSize: '0.75rem', color: 'var(--error)', fontWeight: 500 }}>
              — {item.cancelReason}
            </span>
          )}
        </div>
        <div className="item-card__subtitle">{item.subtitle}</div>
        {item.offerDiscountNote && !isCancelled && (
          <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: 3 }}>
            🏷️ {item.offerDiscountNote}
          </div>
        )}
      </div>

      {/* Quantity & Price Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        {/* أزرار زيادة ونقص الكمية */}
        {!locked && isDelivered && onQuantityChange && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '2px 6px',
              borderRadius: 8,
              border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                border: 'none',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
              }}
              onClick={() => onQuantityChange(Math.max(1, (item.quantity || 1) - 1))}
              disabled={item.quantity <= 1}
            >
              -
            </button>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, minWidth: 16, textAlign: 'center' }}>
              {item.quantity || 1}
            </span>
            <button
              type="button"
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                border: 'none',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
              }}
              onClick={() => onQuantityChange((item.quantity || 1) + 1)}
            >
              +
            </button>
          </div>
        )}

        <div className={`item-card__price${hasZeroPrice ? ' item-card__price--zero' : ''}`}>
          {hasZeroPrice ? (
            <span style={{ fontSize: '0.8rem' }}>⚠️ يحتاج سعر</span>
          ) : (
            <>
              {(item.quantity > 1 || locked) && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                  {item.quantity} × {item.unitPrice.toFixed(0)}
                </span>
              )}
              {isDiscounted && (
                <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '6px', fontWeight: 'normal' }}>
                  {(item.originalUnitPrice * item.quantity).toFixed(0)}
                </span>
              )}
              {(item.unitPrice * (item.quantity || 1)).toFixed(0)} جنيه
            </>
          )}
        </div>

        {!locked && onEditPrice && (
          <button
            className="item-card__edit-btn"
            onClick={e => { e.stopPropagation(); onEditPrice() }}
            type="button"
          >
            ✏️ تحديد السعر
          </button>
        )}
      </div>
    </div>
  )
}

