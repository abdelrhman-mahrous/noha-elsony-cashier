import { useState } from 'react'
import { useMarketingAuth } from '../../context/MarketingAuthContext'
import { useToast } from '../../context/ToastContext'

export default function MarketingLoginPage() {
  const { login } = useMarketingAuth()
  const showToast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) {
      showToast('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error')
      return
    }

    setLoading(true)
    try {
      await login(email, password)
      showToast('مرحباً بك في بوابة التسويق والعلاقات 🌟', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAF5F8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      direction: 'rtl',
      fontFamily: 'Cairo, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: '36px 28px',
        boxShadow: '0 8px 30px rgba(142, 58, 89, 0.08)',
        border: '1px solid #F0DEE7',
        textAlign: 'center'
      }}>
        {/* أيقونة البوابة */}
        <div style={{
          width: 72,
          height: 72,
          margin: '0 auto 18px',
          background: 'linear-gradient(135deg, #68223B 0%, #8E3A59 60%, #C69537 100%)',
          borderRadius: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 34,
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(142, 58, 89, 0.28)'
        }}>
          💎
        </div>

        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          color: '#2C1820',
          margin: '0 0 6px'
        }}>
          صالون نهي السني
        </h1>

        <p style={{
          fontSize: 13,
          color: '#826E77',
          margin: '0 0 28px'
        }}>
          بوابة العروض والتسويق والآراء والشكاوى
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2C1820', marginBottom: 6 }}>
              البريد الإلكتروني المخصص
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="marketing@salon.com"
              autoFocus
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1.5px solid #F0DEE7',
                fontSize: 14,
                fontFamily: 'Cairo, sans-serif',
                outline: 'none',
                backgroundColor: '#FAF5F8',
                color: '#2C1820',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => e.target.style.borderColor = '#8E3A59'}
              onBlur={e => e.target.style.borderColor = '#F0DEE7'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2C1820', marginBottom: 6 }}>
              كلمة المرور
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  borderRadius: 12,
                  border: '1.5px solid #F0DEE7',
                  fontSize: 14,
                  fontFamily: 'Cairo, sans-serif',
                  outline: 'none',
                  backgroundColor: '#FAF5F8',
                  color: '#2C1820',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={e => e.target.style.borderColor = '#8E3A59'}
                onBlur={e => e.target.style.borderColor = '#F0DEE7'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: '#826E77',
                  padding: 4
                }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 10,
              padding: '13px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #8E3A59 0%, #68223B 100%)',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 800,
              fontFamily: 'Cairo, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(142, 58, 89, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? (
              <>
                <span className="spinner spinner--sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                <span>جارٍ التحقق...</span>
              </>
            ) : (
              <span>تسجيل الدخول للبوابة 💎</span>
            )}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid #F0DEE7', paddingTop: '16px' }}>
            <a
              href="#/demo/marketing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: '#FAF5F8',
                color: '#8E3A59',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: '800',
                fontSize: '13px',
                border: '1px solid #F0DEE7',
                transition: 'all 0.2s',
              }}
            >
              🏷️ تجربة لوحة التسويق بداتا وهمية (ديمو فوري)
            </a>
          </div>
        </form>

        <div style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: '1px solid #F0DEE7',
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          fontSize: 12,
          color: '#826E77'
        }}>
          <span>صالون نهي السني</span>
          <span>•</span>
          <span>قسم التسويق والعلاقات</span>
        </div>
      </div>
    </div>
  )
}
