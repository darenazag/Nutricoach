import { createContext } from 'react'

export interface ThemeContextType {
  theme: 'light' | 'dark'
  toggle: () => void
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
