import React, { createContext, useContext, useEffect, useState } from 'react'
import { login as apiLogin, logout as apiLogout, fetchMe, AuthUser, LoginPayload } from '../api/auth'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Au démarrage : restaurer depuis localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('dns_token')
    const storedUser = localStorage.getItem('dns_user')

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      // Vérifier que le token est toujours valide
      fetchMe()
        .then((u) => {
          setUser(u)
          localStorage.setItem('dns_user', JSON.stringify(u))
        })
        .catch(() => {
          localStorage.removeItem('dns_token')
          localStorage.removeItem('dns_user')
          setUser(null)
          setToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (payload: LoginPayload) => {
    const response = await apiLogin(payload)
    localStorage.setItem('dns_token', response.token)
    localStorage.setItem('dns_user', JSON.stringify(response.user))
    setToken(response.token)
    setUser(response.user)
  }

  const logout = async () => {
    try {
      await apiLogout()
    } catch (e) {
      // Non-bloquant
    }
    localStorage.removeItem('dns_token')
    localStorage.removeItem('dns_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}