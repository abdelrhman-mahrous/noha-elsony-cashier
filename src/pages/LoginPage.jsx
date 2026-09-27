import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const { login } = useAuth()
  const showToast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('من فضلك أدخل الإيميل وكلمة السر')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      showToast('تم تسجيل الدخول بنجاح 👋', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-box__logo">
          <div className="login-box__icon">✂️</div>
        </div>
        <div className="login-box__title">
          <h1>صالون العربي</h1>
          <p>نظام محاسبة الكاشير — تسجيل الدخول</p>
        </div>

        <form className="login-box__form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email-input">البريد الإلكتروني</label>
            <input
              id="email-input"
              className={`input${error ? ' input--error' : ''}`}
              type="email"
              placeholder="cashier@salon.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              dir="ltr"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password-input">كلمة السر</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password-input"
                className={`input${error ? ' input--error' : ''}`}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                dir="ltr"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '1rem',
                  padding: '4px',
                }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert--error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            id="login-btn"
            type="submit"
            className="btn btn--primary btn--full btn--lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                جارِ تسجيل الدخول...
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
