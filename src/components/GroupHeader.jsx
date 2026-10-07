export default function GroupHeader({ title, icon, count, deliveredTotal, accentColor, onAdd, addLabel }) {
  return (
    <div className="group-header" style={{ borderBottomColor: accentColor ? `${accentColor}40` : undefined, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div className="group-header__title" style={{ color: accentColor || 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="group-header__icon">{icon}</span>
        <span>{title}</span>
        {count > 0 && (
          <span style={{
            background: accentColor ? `${accentColor}20` : 'rgba(216,27,96,0.15)',
            color: accentColor || 'var(--primary-light)',
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '99px',
          }}>
            {count}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onAdd && (
          <button
            type="button"
            className="btn btn--sm"
            style={{
              padding: '3px 10px',
              fontSize: '0.78rem',
              background: accentColor ? `${accentColor}25` : 'rgba(183, 110, 121, 0.2)',
              color: accentColor || 'var(--primary-light)',
              border: `1px solid ${accentColor ? `${accentColor}60` : 'var(--primary)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 700,
            }}
            onClick={onAdd}
          >
            ➕ {addLabel || 'إضافة'}
          </button>
        )}
        {deliveredTotal > 0 && (
          <div className="group-header__total" style={{ color: accentColor || undefined }}>
            {deliveredTotal.toFixed(0)} جنيه
          </div>
        )}
      </div>
    </div>
  )
}

