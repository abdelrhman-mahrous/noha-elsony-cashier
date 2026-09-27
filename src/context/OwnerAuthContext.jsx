import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const OwnerAuthContext = createContext(null)
const SESSION_KEY = 'owner_web_session'

export function OwnerAuthProvider({ children }) {
  const [owner, setOwner] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (stored) setOwner(JSON.parse(stored))
    } catch (_) {}
    setLoading(false)
  }, [])

  async function login(email, password) {
    const { data, error } = await supabase.rpc('owner_web_login', {
      p_email: email.trim().toLowerCase(),
      p_password: password,
    })
    if (error) throw new Error('حدث خطأ في الاتصال، حاول مرة أخرى')
    if (!data || data.error === 'invalid_credentials') throw new Error('الإيميل أو كلمة السر غلط')
    if (data.error) throw new Error('حدث خطأ، حاول مرة أخرى')

    const session = { id: data.id, email: data.email, name: data.name }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setOwner(session)
    return session
  }

  async function changePassword(oldPassword, newPassword) {
    if (!owner) throw new Error('غير مسجل الدخول')
    const { data, error } = await supabase.rpc('owner_web_change_password', {
      p_owner_id: owner.id,
      p_old_password: oldPassword,
      p_new_password: newPassword,
    })
    if (error) throw new Error('حدث خطأ في الاتصال')
    if (data?.error === 'wrong_old_password') throw new Error('كلمة السر القديمة غلط')
    if (data?.error === 'password_too_short') throw new Error('كلمة السر الجديدة قصيرة جداً')
    if (data?.error) throw new Error('حدث خطأ، حاول مرة أخرى')
    return true
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setOwner(null)
  }

  return (
    <OwnerAuthContext.Provider value={{ owner, login, logout, changePassword, loading }}>
      {children}
    </OwnerAuthContext.Provider>
  )
}

export function useOwnerAuth() {
  const ctx = useContext(OwnerAuthContext)
  if (!ctx) throw new Error('useOwnerAuth must be inside OwnerAuthProvider')
  return ctx
}
