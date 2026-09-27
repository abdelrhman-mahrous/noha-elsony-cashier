import { createContext, useContext, useState, useEffect } from 'react'
import { loginBarber } from '../services/barberService'
import { supabase } from '../lib/supabase'

const BarberAuthContext = createContext(null)
const SESSION_KEY = 'barber_web_session'

export function BarberAuthProvider({ children }) {
  const [barber, setBarber] = useState(null)
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (stored) {
        setBarber(JSON.parse(stored))
      }
      const soundPref = localStorage.getItem('barber_sound_enabled')
      if (soundPref !== null) {
        setSoundEnabled(soundPref === 'true')
      }
    } catch (_) {}
    setLoading(false)
  }, [])

  async function login(identifier, password) {
    const barberData = await loginBarber(identifier, password)
    localStorage.setItem(SESSION_KEY, JSON.stringify(barberData))
    setBarber(barberData)
    return barberData
  }

  function toggleSound() {
    setSoundEnabled(prev => {
      const next = !prev
      localStorage.setItem('barber_sound_enabled', String(next))
      return next
    })
  }

  function updateBarberState(updatedFields) {
    setBarber(prev => {
      if (!prev) return prev
      const next = { ...prev, ...updatedFields }
      localStorage.setItem(SESSION_KEY, JSON.stringify(next))
      return next
    })
  }

  async function logout() {
    try {
      await supabase.auth.signOut()
    } catch (_) {}
    localStorage.removeItem(SESSION_KEY)
    setBarber(null)
  }

  return (
    <BarberAuthContext.Provider
      value={{
        barber,
        login,
        logout,
        loading,
        soundEnabled,
        toggleSound,
        updateBarberState,
      }}
    >
      {children}
    </BarberAuthContext.Provider>
  )
}

export function useBarberAuth() {
  const ctx = useContext(BarberAuthContext)
  if (!ctx) throw new Error('useBarberAuth must be used inside BarberAuthProvider')
  return ctx
}
