import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/services/api'
import { toast } from 'sonner'
import type { UserRole, RegisterRequest, BuilderProfile, SupplierProfile } from '@/types'

interface User {
  id: number
  email: string
  name: string
  role: UserRole
  profileImageUrl?: string
  emailVerified: boolean
  twoFactorEnabled: boolean
  phone?: string
  city?: string
  address?: string
  builderProfile?: Pick<BuilderProfile, 'leadCredits' | 'averageRating' | 'totalProjectsCompleted' | 'totalEarnings' | 'subscriptionTier' | 'isVerified' | 'companyName'>
  supplierProfile?: Pick<SupplierProfile, 'isVerified' | 'averageRating' | 'companyName'>
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: (message?: string) => void
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

/** The dashboard landing path for a role — used for post-login redirect and guest-route bounce. */
export function getRoleHomePath(role: string): string {
  switch (role) {
    case 'CLIENT':
      return '/client/dashboard'
    case 'BUILDER':
      return '/builder/dashboard'
    case 'SUPPLIER':
      return '/supplier/dashboard'
    case 'SUPPORT_AGENT':
      return '/support/dashboard'
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin/dashboard'
    default:
      return '/'
  }
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      const response = await api.get('/v1/auth/me')
      setUser(response.data)
    } catch (error) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/v1/auth/login', { email, password })
      const { accessToken, refreshToken, user: userData } = response.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      setUser(userData)

      toast.success('Welcome back!')

      // Redirect based on role
      navigate(getRoleHomePath(userData.role))
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      const message = axiosError.response?.data?.message || 'Login failed'
      // Suspension is surfaced by Login.tsx in a dedicated dialog — no toast for it
      if (!message.toLowerCase().includes('suspended')) {
        toast.error(message)
      }
      throw error
    }
  }

  const register = async (data: RegisterRequest) => {
    try {
      await api.post('/v1/auth/register', data)

      // Intentionally do NOT establish a session here. The account must verify its
      // email address before it can log in, so we route to the "check your inbox" screen.
      toast.success('Account created! Check your email to verify your address.')
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      const message = axiosError.response?.data?.message || 'Registration failed'
      toast.error(message)
      throw error
    }
  }

  const logout = (message: string = 'Logged out successfully') => {
    api.post('/v1/auth/logout').catch(() => {})
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    queryClient.clear()
    navigate('/login')
    toast.success(message)
  }

  const refreshAuth = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      logout()
      return
    }

    try {
      const response = await api.post('/v1/auth/refresh', { refreshToken })
      const { accessToken, refreshToken: newRefreshToken } = response.data

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', newRefreshToken)

      // Notify WebSocket hook to reconnect with new token (same-tab event)
      window.dispatchEvent(new Event('token-refreshed'))

      // Fetch fresh user data from /me to get all fields (phone, city, address, etc.)
      const meResponse = await api.get('/v1/auth/me')
      setUser(meResponse.data)
    } catch (error) {
      logout()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
