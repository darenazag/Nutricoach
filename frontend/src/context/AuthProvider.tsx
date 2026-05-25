import { useState, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import type { User, RawUser } from './AuthContext'

function normalizeUser(raw: RawUser): User {
  const id = raw.id ?? raw.user_id
  if (id === undefined) throw new Error('normalizeUser: falta id y user_id')
  return { id, name: raw.name, email: raw.email }
}

function getInitialUser(): User | null {
  try {
    const saved = localStorage.getItem('user')
    if (!saved) return null
    return normalizeUser(JSON.parse(saved) as RawUser)
  } catch {
    return null
  }
}

function getInitialToken() {
  return localStorage.getItem('token')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialUser)
  const [token, setToken] = useState<string | null>(getInitialToken)

  function login(token: string, raw: RawUser) {
    const user = normalizeUser(raw)
    setToken(token)
    setUser(user)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }

  function logout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}
