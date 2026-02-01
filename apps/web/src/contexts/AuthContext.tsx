import React, { createContext, useContext, ReactNode } from 'react'
import { useAuthStore } from '@/lib/auth'
import type { User } from '@tcg-tracker/types'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore()

  const login = (token: string, user: User) => {
    setAuth(token, user)
  }

  const logout = () => {
    clearAuth()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
