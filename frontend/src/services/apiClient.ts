import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from 'axios'
import type { AuthResponse } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Token refresh mutex — prevents parallel refresh attempts
let refreshPromise: Promise<string> | null = null

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          // If a refresh is already in-flight, wait for it instead of starting another
          if (!refreshPromise) {
            refreshPromise = axios
              .post<AuthResponse>(`${API_BASE_URL}/v1/auth/refresh`, { refreshToken })
              .then((response) => {
                const { accessToken, refreshToken: newRefreshToken } = response.data
                localStorage.setItem('accessToken', accessToken)
                localStorage.setItem('refreshToken', newRefreshToken)
                // Same-tab signal so the WebSocket hook reconnects with the fresh token
                // (the cross-tab 'storage' event does not fire in the tab that wrote it).
                window.dispatchEvent(new Event('token-refreshed'))
                return accessToken
              })
              .finally(() => {
                refreshPromise = null
              })
          }

          const accessToken = await refreshPromise
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        } catch (refreshError) {
          const refreshAxiosError = refreshError as AxiosError
          // Only redirect to login for auth failures (401/403), not network errors
          if (refreshAxiosError.response?.status === 401 || refreshAxiosError.response?.status === 403) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            window.location.href = '/login'
          }
          return Promise.reject(refreshError)
        }
      }
    }

    // Handle rate limiting (429)
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      const msg = retryAfter
        ? `Too many requests. Please wait ${retryAfter} seconds.`
        : 'Too many requests. Please slow down and try again.'
      return Promise.reject(Object.assign(error, { userMessage: msg }))
    }

    return Promise.reject(error)
  }
)

// Helper to extract a user-friendly error message from API errors
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error && typeof error === 'object') {
    const axiosErr = error as AxiosError<{ message?: string; validationErrors?: Record<string, string> }>
    if ('userMessage' in axiosErr && typeof axiosErr.userMessage === 'string') {
      return axiosErr.userMessage
    }
    // Bean-validation failures return a bare "Validation failed" with the per-field reasons in
    // validationErrors — flatten those so the user learns WHICH field was rejected and why.
    const fieldErrors = axiosErr.response?.data?.validationErrors
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      return Object.values(fieldErrors).join('. ')
    }
    if (axiosErr.response?.data?.message) {
      return axiosErr.response.data.message
    }
  }
  return fallback
}

/**
 * Per-field validation errors from a 400 response, keyed by DTO field name.
 * Empty when the error carried none — callers fall back to getApiErrorMessage.
 */
export function getApiValidationErrors(error: unknown): Record<string, string> {
  if (error && typeof error === 'object') {
    const axiosErr = error as AxiosError<{ validationErrors?: Record<string, string> }>
    return axiosErr.response?.data?.validationErrors ?? {}
  }
  return {}
}

// Config for multipart file uploads. The shared `api` instance defaults to
// `Content-Type: application/json`; in browsers axios uses the XHR adapter, which would send
// `multipart/form-data` WITHOUT a boundary (the server then can't parse the body — HTTP 500).
// Dropping the Content-Type here lets the browser generate `multipart/form-data; boundary=...`.
export const multipartConfig = {
  transformRequest: [(data: FormData, headers: AxiosHeaders) => {
    headers.setContentType(null)
    return data
  }],
}

export default api
