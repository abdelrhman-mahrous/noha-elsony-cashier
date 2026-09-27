import { useState } from 'react'
import { submitSupportInquiry } from '../../services/clientService'
import { useToast } from '../../context/ToastContext'

export default function SupportModal({ isOpen, onClose }) {
  const showToast = useToast()
  const [userName, setUserName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!phone.trim() || !message.trim()) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error')
      return
    }

    setLoading(true)
    try {
      await submitSupportInquiry({ userName, phone, message })
      showToast('تم استلام رسالتك، سيتواصل معكِ فريق الصالون في أقرب وقت 💖', 'success')
      onClose()
      setUserName('')
      setPhone('')
      setMessage('')
    } catch (err) {
      showToast('خطأ في إرسال الرسالة: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="client-modal-backdrop">
      <div className="client-modal-card">
        <button className="client-modal-close" onClick={onClose}>✕</button>

        <h2 className="client-section-title" style={{ fontSize: '1.6rem', textAlign: 'center' }}>
          💬 خدمة العميلات والدعم
        </h2>
        <p className="client-section-desc" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          نسعد دائماً بسماع استفساراتكِ ومقترحاتكِ أو أي ملاحظة لخدمتكِ بأفضل شكل
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">الاسم الكريم</label>
            <input
              type="text"
              className="form-input"
              placeholder="اسمكِ الكريم"
              value={userName}
              onChange={e => setUserName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">رقم الهاتف / الواتساب *</label>
            <input
              type="tel"
              className="form-input"
              placeholder="010..."
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">رسالتكِ أو استفساركِ *</label>
            <textarea
              className="form-input"
              rows="4"
              placeholder="اكتبي تفاصيل استفساركِ أو مقترحكِ هنا..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="client-btn-book" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'جارٍ الإرسال...' : 'إرسال الرسالة 💌'}
          </button>
        </form>
      </div>
    </div>
  )
}
