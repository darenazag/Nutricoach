import { api } from './api'
import type { LoginResponse, RegisterResponse } from '../types'

export const authService = {
  login(email: string, password: string): Promise<LoginResponse> {
    return api.post<LoginResponse>('/auth/login', { email, password })
  },

  register(name: string, email: string, password: string): Promise<RegisterResponse> {
    return api.post<RegisterResponse>('/auth/register', { name, email, password })
  },
}
