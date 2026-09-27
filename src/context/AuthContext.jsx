import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const SESSION_KEY = 'cashier_web_session'

export function AuthProvider({ children }) {
  const [cashier, setCashier] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // استرجاع الجلسة من localStorage عند التحميل
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setCashier(parsed)
      }
    } catch (_) {}
    setLoading(false)
  }, [])

  /**
   * تسجيل الدخول — يستدعي RPC بدلاً من Supabase Auth
   * الباسورد يتحقق منه بـ bcrypt على مستوى Postgres
   */
  async function login(email, password) {
    const { data, error } = await supabase.rpc('cashier_web_login', {
      p_email: email.trim().toLowerCase(),
      p_password: password,
    })

    if (error) throw new Error('حدث خطأ في الاتصال، حاول مرة أخرى')
    if (!data || data.error === 'invalid_credentials') {
      throw new Error('الإيميل أو كلمة السر غلط')
    }
    if (data.error) throw new Error('حدث خطأ، حاول مرة أخرى')

    const session = { id: data.id, email: data.email, name: data.name }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setCashier(session)
    return session
  }

  /**
   * تغيير الباسورد — يتحقق من القديم ثم يحدث
   */
  async function changePassword(oldPassword, newPassword) {
    if (!cashier) throw new Error('غير مسجل الدخول')

    const { data, error } = await supabase.rpc('cashier_web_change_password', {
      p_cashier_id: cashier.id,
      p_old_password: oldPassword,
      p_new_password: newPassword,
    })

    if (error) throw new Error('حدث خطأ في الاتصال')
    if (data?.error === 'wrong_old_password') throw new Error('كلمة السر القديمة غلط')
    if (data?.error === 'password_too_short') throw new Error('كلمة السر الجديدة قصيرة جداً (6 أحرف على الأقل)')
    if (data?.error) throw new Error('حدث خطأ، حاول مرة أخرى')

    return true
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setCashier(null)
  }

  return (
    <AuthContext.Provider value={{ cashier, login, logout, changePassword, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
