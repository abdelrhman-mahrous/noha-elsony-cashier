import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function ChangePasswordPage() {
  const { changePassword, cashier } = useAuth()
  const showToast = useToast()

  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!oldPass || !newPass || !confirmPass) {
      setError('من فضلك أكمل جميع الحقول')
      return
    }
    if (newPass.length < 6) {
      setError('كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل')
      return
    }
    if (newPass !== confirmPass) {
      setError('كلمة السر الجديدة غير متطابقة')
      return
    }

    setLoading(true)
    try {
      await changePassword(oldPass, newPass)
      setSuccess(true)
      showToast('تم تغيير كلمة السر بنجاح ✅', 'success')
      setOldPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page change-pass-page">
      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 4 }}>
        🔐 تغيير كلمة السر
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
        الكاشير: {cashier?.name} ({cashier?.email})
      </p>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label htmlFor="old-pass">كلمة السر الحالية</label>
            <input
              id="old-pass"
              className="input"
              type="password"
              placeholder="••••••••"
              value={oldPass}
              onChange={e => setOldPass(e.target.value)}
              dir="ltr"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="new-pass">كلمة السر الجديدة</label>
            <input
              id="new-pass"
              className="input"
              type="password"
              placeholder="••••••••"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              dir="ltr"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirm-pass">تأكيد كلمة السر الجديدة</label>
            <input
              id="confirm-pass"
              className="input"
              type="password"
              placeholder="••••••••"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              dir="ltr"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="alert alert--error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert--success">
              <span>✅</span>
              <span>تم تغيير كلمة السر بنجاح!</span>
            </div>
          )}

          <button
            id="change-pass-btn"
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> جارٍ الحفظ...</>
              : '💾 حفظ كلمة السر الجديدة'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
