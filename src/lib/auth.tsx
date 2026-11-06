import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, getTokens, setTokens } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (phone: string, password: string) => Promise<User>
  register: (data: { phone: string; name: string; password: string; role: string }) => Promise<User>
  logout: () => void
  setUser: (u: User) => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => !!getTokens())
  const qc = useQueryClient()

  useEffect(() => {
    if (!getTokens()) return
    api<User>('/auth/me/')
      .then(setUser)
      .catch(() => setTokens(null))
      .finally(() => setLoading(false))
  }, [])

  const logout = useCallback(() => {
    setTokens(null)
    setUser(null)
    qc.clear()
  }, [qc])

  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('gg:logout', onLogout)
    return () => window.removeEventListener('gg:logout', onLogout)
  }, [])

  const handle = async (path: string, json: unknown) => {
    const data = await api<{ user: User; access: string; refresh: string }>(path, { method: 'POST', json })
    setTokens({ access: data.access, refresh: data.refresh })
    setUser(data.user)
    return data.user
  }

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        setUser,
        logout,
        login: (phone, password) => handle('/auth/login/', { phone, password }),
        register: (d) => handle('/auth/register/', d),
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
