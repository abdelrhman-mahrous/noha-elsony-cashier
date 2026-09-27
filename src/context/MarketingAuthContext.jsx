import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MarketingAuthContext = createContext(null)
const SESSION_KEY = 'marketing_web_session'

export function MarketingAuthProvider({ children }) {
  const [marketingUser, setMarketingUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (stored) setMarketingUser(JSON.parse(stored))
    } catch (_) {}
    setLoading(false)
  }, [])

  async function login(email, password) {
    const { data, error } = await supabase.rpc('marketing_web_login', {
      p_email: email.trim().toLowerCase(),
      p_password: password,
    })
    if (error) throw new Error('حدث خطأ في الاتصال، حاول مرة أخرى')
    if (!data || data.error === 'invalid_credentials') throw new Error('الإيميل أو كلمة السر غلط')
    if (data.error) throw new Error('حدث خطأ، حاول مرة أخرى')

    const session = { id: data.id, email: data.email, name: data.name, role: data.role || 'marketing' }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setMarketingUser(session)
    return session
  }

  async function changePassword(oldPassword, newPassword) {
    if (!marketingUser) throw new Error('غير مسجل الدخول')
    const { data, error } = await supabase.rpc('marketing_web_change_password', {
      p_user_id: marketingUser.id,
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
    setMarketingUser(null)
  }

  return (
    <MarketingAuthContext.Provider value={{ marketingUser, login, logout, changePassword, loading }}>
      {children}
    </MarketingAuthContext.Provider>
  )
}

export function useMarketingAuth() {
  const ctx = useContext(MarketingAuthContext)
  if (!ctx) throw new Error('useMarketingAuth must be inside MarketingAuthProvider')
  return ctx
}
