export default function ItemCard({ item, locked, onToggle, onEditPrice }) {
  const isDelivered = item.status === 'delivered'
  const isCancelled = item.status === 'cancelled'
  const hasZeroPrice = item.unitPrice <= 0

  const typeIcon = {
    service: '✂️',
    package: '📦',
    addon:   '➕',
    product: '🛍️',
  }[item.itemType] || '•'

  function handleClick() {
    if (!locked) onToggle()
  }

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

      {/* Price + Edit */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <div className={`item-card__price${hasZeroPrice ? ' item-card__price--zero' : ''}`}>
          {hasZeroPrice ? (
            <span style={{ fontSize: '0.8rem' }}>⚠️ يحتاج سعر</span>
          ) : (
            <>
              {item.quantity > 1 && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                  {item.quantity} × {item.unitPrice.toFixed(0)}
                </span>
              )}
              {(item.unitPrice * item.quantity).toFixed(0)} جنيه
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
