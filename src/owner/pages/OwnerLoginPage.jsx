import { useState } from 'react'
import { useOwnerAuth } from '../../context/OwnerAuthContext'
import { useToast } from '../../context/ToastContext'

export default function OwnerLoginPage() {
  const { login } = useOwnerAuth()
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
      showToast('مرحباً بكِ في لوحة إدارة الصالون 👑', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FCF6F2',
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
        boxShadow: '0 8px 30px rgba(59, 44, 46, 0.08)',
        border: '1px solid #EFE2DC',
        textAlign: 'center'
      }}>
        {/* أيقونة الألماسة الملكية */}
        <div style={{
          width: 72,
          height: 72,
          margin: '0 auto 18px',
          background: 'linear-gradient(135deg, #7D2E46 0%, #B76E79 100%)',
          borderRadius: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 34,
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(125, 46, 70, 0.28)'
        }}>
          💎
        </div>

        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          color: '#3B2C2E',
          margin: '0 0 6px'
        }}>
          صالون نهي السني
        </h1>

        <p style={{
          fontSize: 13,
          color: '#9A8A85',
          margin: '0 0 28px'
        }}>
          بوابة الإدارة الملكية • تسجيل دخول صاحبة الصالون
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3B2C2E', marginBottom: 6 }}>
              البريد الإلكتروني للإدارة
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="owner@salon.com"
              autoFocus
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #EFE2DC',
                fontSize: 14,
                fontFamily: 'inherit',
                color: '#3B2C2E',
                backgroundColor: '#FAFAF9',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3B2C2E', marginBottom: 6 }}>
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
                  padding: '12px 40px 12px 14px',
                  borderRadius: 12,
                  border: '1px solid #EFE2DC',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  color: '#3B2C2E',
                  backgroundColor: '#FAFAF9',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
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
                  color: '#9A8A85'
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
              backgroundColor: '#7D2E46',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(125, 46, 70, 0.25)',
              transition: 'background-color 0.2s ease',
              fontFamily: 'inherit'
            }}
          >
            {loading ? 'جارٍ التحقق...' : 'تسجيل الدخول الملكي'}
          </button>

          <div style={{ marginTop: '16px', textAlign: 'center', borderTop: '1px solid #EFE2DC', paddingTop: '16px' }}>
            <a
              href="#/demo/owner"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: '#FAF5F8',
                color: '#7D2E46',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: '800',
                fontSize: '13px',
                border: '1px solid #F0DEE7',
                transition: 'all 0.2s',
              }}
            >
              👑 تجربة لوحة الأونر بداتا وهمية (ديمو فوري)
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
