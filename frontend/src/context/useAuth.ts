import { useContext } from 'react'
import { AuthContext } from './AuthContext'
import type { User, RawUser } from '../types'
export type { User, RawUser }

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
