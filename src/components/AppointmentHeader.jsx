export default function AppointmentHeader({ details }) {
  function formatDate(dateStr) {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    } catch { return dateStr }
  }

  function formatTime(timeStr) {
    if (!timeStr) return ''
    try {
      const parts = timeStr.trim().split(':')
      if (parts.length >= 2) {
        let hour = parseInt(parts[0], 10)
        const minute = parts[1].padStart(2, '0')
        const period = hour >= 12 ? 'مساءً' : 'صباحاً'
        hour = hour % 12 || 12
        return `${hour}:${minute} ${period}`
      }
      return timeStr
    } catch {
      return timeStr
    }
  }

  const statusLabel = {
    pending:   { text: 'في الانتظار', cls: 'badge--warning' },
    confirmed: { text: 'مؤكد',        cls: 'badge--info' },
    completed: { text: 'مكتمل',       cls: 'badge--success' },
    cancelled: { text: 'ملغي',        cls: 'badge--error' },
  }[details.status] || { text: details.status, cls: 'badge--muted' }

  return (
    <div className="appt-header" style={{ color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div className="appt-header__name">
          {details.customerName}
          {details.customerNickname && (
            <span style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 500, marginRight: 8 }}>
              ({details.customerNickname})
            </span>
          )}
        </div>
        <span className={`badge ${statusLabel.cls}`} style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
          {statusLabel.text}
        </span>
      </div>

      <div className="appt-header__meta">
        {details.customerPhone && <span>📱 {details.customerPhone}</span>}
        {details.barberName && <span>💇‍♀️ {details.barberName}</span>}
        <span>📅 {formatDate(details.appointmentDate)}</span>
        {details.appointmentTime && <span>🕐 {formatTime(details.appointmentTime)}</span>}
        {details.depositPaid > 0 && (
          <span style={{ color: '#ffd1e8' }}>💰 عربون: {details.depositPaid} جنيه</span>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <span style={{
          fontSize: '0.82rem',
          background: 'rgba(255,255,255,0.15)',
          padding: '3px 10px',
          borderRadius: '99px',
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
        }}>
          {details.appointmentCode}
        </span>
      </div>
    </div>
  )
}
