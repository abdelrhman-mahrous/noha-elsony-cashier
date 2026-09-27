import { useState } from 'react'
import { useMarketingAuth } from '../../context/MarketingAuthContext'
import { useToast } from '../../context/ToastContext'

export default function MarketingChangePasswordPage() {
  const { changePassword } = useMarketingAuth()
  const showToast = useToast()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (newPassword.length < 6) {
      showToast('كلمة السر الجديدة يجب أن تكون 6 أحرف أو أرقام على الأقل', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('تأكيد كلمة السر غير متطابق', 'error')
      return
    }

    setLoading(true)
    try {
      await changePassword(oldPassword, newPassword)
      showToast('تم تغيير كلمة السر بنجاح ✅', 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mkt-container" style={{ maxWidth: 520, margin: '2rem auto' }}>
      <div className="mkt-card">
        <div className="mkt-card__header">
          <h2 className="mkt-card__title">🔒 تغيير كلمة السر (بوابة التسويق)</h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1rem' }}>
          <div className="form-group">
            <label className="form-label">كلمة السر الحالية</label>
            <input
              type="password"
              className="input"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">كلمة السر الجديدة</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="6 خانات أو أكثر"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">تأكيد كلمة السر الجديدة</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="mkt-btn-primary"
            style={{ marginTop: '0.5rem', padding: '12px', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'جارٍ التحديث...' : 'تحديث كلمة السر'}
          </button>
        </form>
      </div>
    </div>
  )
}
