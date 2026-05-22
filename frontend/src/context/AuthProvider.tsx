import { useState, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'

interface User {
  id: number
  name: string
  email: string
}

function getInitialUser() {
  try {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) as User : null
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

  function login(token: string, user: User) {
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
