import { useState } from 'react'
import { submitClientReview } from '../../services/clientService'
import { useToast } from '../../context/ToastContext'

export default function AddReviewModal({ isOpen, onClose, onReviewAdded, barbers = [] }) {
  const showToast = useToast()
  const [userName, setUserName] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [barberId, setBarberId] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!userName.trim() || !comment.trim()) {
      showToast('يرجى ملء جميع الحقول', 'error')
      return
    }

    setLoading(true)
    try {
      await submitClientReview({ userName, rating, comment, barberId })
      showToast('شكراً لمشاركتكِ تقييمكِ الرائع! ⭐👑', 'success')
      onClose()
      setUserName('')
      setComment('')
      if (onReviewAdded) onReviewAdded()
    } catch (err) {
      showToast('تعذر إرسال التقييم: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="client-modal-backdrop">
      <div className="client-modal-card">
        <button className="client-modal-close" onClick={onClose}>✕</button>

        <h2 className="client-section-title" style={{ fontSize: '1.6rem', textAlign: 'center' }}>
          ⭐ شاركينا رأيكِ وتجربتكِ
        </h2>
        <p className="client-section-desc" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          رأيكِ يسعدنا ويساعدنا في تقديم أرقى تجربة دائماً في صالون نهي السني
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">الاسم الكريم *</label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: ياسمين أحمد"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">التقييم *</label>
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '1.8rem', cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  onClick={() => setRating(star)}
                  style={{ color: star <= rating ? 'var(--c-gold)' : 'var(--c-text-muted)' }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">المتخصصة أو الكوافيرة (اختياري)</label>
            <select
              className="form-input form-select"
              value={barberId}
              onChange={e => setBarberId(e.target.value)}
            >
              <option value="">-- اختاري المتخصصة --</option>
              {barbers.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">تعليقكِ وتجربتكِ *</label>
            <textarea
              className="form-input"
              rows="3"
              placeholder="اكتبي تجربتكِ مع خدمات الصالون والمعاملة..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="client-btn-book" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'جارٍ النشر...' : 'نشر التقييم ✨'}
          </button>
        </form>
      </div>
    </div>
  )
}
