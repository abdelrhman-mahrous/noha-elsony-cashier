export default function GroupHeader({ title, icon, count, deliveredTotal, accentColor }) {
  return (
    <div className="group-header" style={{ borderBottomColor: accentColor ? `${accentColor}40` : undefined }}>
      <div className="group-header__title" style={{ color: accentColor || 'var(--primary-light)' }}>
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
      {deliveredTotal > 0 && (
        <div className="group-header__total">{deliveredTotal.toFixed(0)} جنيه</div>
      )}
    </div>
  )
}
