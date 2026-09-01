import { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token')
    setAdmin(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      setLoading(false)
      return
    }
    authService.me()
      .then((res) => setAdmin(res.data))
      .catch(() => localStorage.removeItem('admin_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const res = await authService.login(username, password)
    localStorage.setItem('admin_token', res.data.token)
    setAdmin(res.data.admin)
    return res.data.admin
  }

  const setAuthAdmin = (a) => setAdmin(a)

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, setAuthAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
