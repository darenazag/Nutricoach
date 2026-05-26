import { createContext } from 'react'
import type { User, RawUser, AuthContextType } from '../types'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
export type { User, RawUser, AuthContextType }
