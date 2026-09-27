import { useState } from 'react'

export default function CancelReasonModal({ title, onConfirm, onClose }) {
  const [reason, setReason] = useState('')

  const presets = ['طلب العميل', 'ظرف طارئ', 'خطأ في الحجز', 'تأخر العميل']

  function handleConfirm() {
    onConfirm(reason.trim())
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__title" style={{ color: 'var(--error)' }}>
          <span>🚫</span>
          <span>{title}</span>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 14 }}>
          سبب الإلغاء (اختياري)
        </p>

        {/* Presets */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {presets.map(p => (
            <button
              key={p}
              type="button"
              className="btn btn--ghost btn--sm"
              style={{ borderRadius: '99px' }}
              onClick={() => setReason(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <textarea
          id="cancel-reason-input"
          className="input"
          placeholder="اكتبي سبب الإلغاء..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          style={{ resize: 'none' }}
        />

        <div className="modal__actions">
          <button
            id="cancel-confirm-btn"
            className="btn btn--danger"
            onClick={handleConfirm}
          >
            تأكيد الإلغاء
          </button>
          <button className="btn btn--ghost" onClick={onClose}>تراجع</button>
        </div>
      </div>
    </div>
  )
}
