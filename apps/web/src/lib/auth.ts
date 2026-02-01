import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@tcg-tracker/types'

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  isAuthenticated: boolean
}

// Zustand store for auth state with localStorage persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token: string, user: User) => {
        localStorage.setItem('auth_token', token)
        set({ token, user, isAuthenticated: true })
      },
      clearAuth: () => {
        localStorage.removeItem('auth_token')
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Helper functions
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token')
}

export const setAuthToken = (token: string): void => {
  localStorage.setItem('auth_token', token)
}

export const removeAuthToken = (): void => {
  localStorage.removeItem('auth_token')
}

export const isAuthenticated = (): boolean => {
  return !!getAuthToken()
}
