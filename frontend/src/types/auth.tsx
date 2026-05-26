export interface User {
  id: number
  name: string
  email: string
}

export interface RawUser {
  id?: number
  user_id?: number
  name: string
  email: string
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: RawUser) => void
  logout: () => void
  isAuthenticated: boolean
}

export interface LoginResponse {
  token: string
  user: RawUser
}

export interface RegisterResponse {
  token: string
  user: RawUser
}
