import { useState } from 'react'
import { useBarberAuth } from '../../context/BarberAuthContext'
import { useToast } from '../../context/ToastContext'

export default function BarberLoginPage() {
  const { login } = useBarberAuth()
  const showToast = useToast()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!identifier.trim()) {
      showToast('الرجاء إدخال رقم الهاتف أو البريد الإلكتروني', 'error')
      return
    }
    if (!password) {
      showToast('الرجاء إدخال كلمة المرور', 'error')
      return
    }

    setLoading(true)
    try {
      const barber = await login(identifier, password)
      showToast(`أهلاً بكِ مجدداً يا ${barber.name || 'أخصائية التجميل'} 🌸`, 'success')
    } catch (err) {
      showToast(err.message || 'فشل في تسجيل الدخول', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="barber-login-wrap">
      <div className="barber-login-card">
        {/* أيقونة الصالون / المقص */}
        <div className="barber-login-logo">
          ✂️
        </div>

        <p className="barber-login-sub" style={{ marginBottom: '0.25rem', color: '#93c5fd' }}>
          أهلاً بكِ مرة أخرى
        </p>
        <h1 className="barber-login-title">
          تسجيل دخول الكوافير
        </h1>
        <p className="barber-login-sub">
          بوابة طاقم العمل ومتابعة المواعيد والمهام المسندة
        </p>

        <form onSubmit={handleSubmit}>
          {/* حقل الإيميل أو رقم الهاتف */}
          <div className="barber-form-group">
            <label className="barber-form-label">
              رقم الهاتف أو البريد الإلكتروني
            </label>
            <div className="barber-input-box">
              <span className="barber-input-box__icon">📱</span>
              <input
                type="text"
                className="barber-input"
                placeholder="مثال: 01012345678 أو email@salon.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                disabled={loading}
              />
            </div>
          </div>

          {/* حقل كلمة المرور */}
          <div className="barber-form-group">
            <label className="barber-form-label">
              كلمة المرور
            </label>
            <div className="barber-input-box">
              <span className="barber-input-box__icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="barber-input"
                placeholder="أدخلي كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="barber-input-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {/* زر تسجيل الدخول */}
          <button
            type="submit"
            className="barber-login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 20, height: 20 }} />
                <span>جارٍ التحقق وتسجيل الدخول...</span>
              </>
            ) : (
              <>
                <span>تسجيل الدخول</span>
                <span>←</span>
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', fontSize: '0.85rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
          <span>صالون العربي الملكي للتجميل والعناية 👑</span>
        </div>
      </div>
    </div>
  )
}
