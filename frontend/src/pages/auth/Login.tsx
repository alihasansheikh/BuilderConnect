import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AxiosError } from 'axios'
import * as Dialog from '@radix-ui/react-dialog'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff, Lock, ShieldCheck, ShieldOff, Users, CreditCard, Hammer, MailWarning, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { authApi } from '@/services/api'
import { toast } from 'sonner'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // Set when the backend blocks login because the email isn't verified yet.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  // Set when the backend blocks login because the account is suspended.
  const [suspensionMessage, setSuspensionMessage] = useState<string | null>(null)
  // Set when the backend blocks login because the account is temporarily locked.
  const [lockedMessage, setLockedMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setUnverifiedEmail(null)
    setSuspensionMessage(null)
    setLockedMessage(null)

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const errors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string
        if (!errors[field]) errors[field] = issue.message
      })
      setFieldErrors(errors)
      return
    }

    setIsLoading(true)
    try {
      await login(result.data.email, result.data.password)
    } catch (error) {
      // The context toasts most errors; two cases get dedicated UI here instead —
      // unverified email (inline resend action) and suspension (modal with reason).
      const axiosError = error as AxiosError<{ message?: string }>
      const rawMessage = axiosError.response?.data?.message || ''
      const message = rawMessage.toLowerCase()
      if (message.includes('verify your email')) {
        setUnverifiedEmail(result.data.email)
      } else if (message.includes('suspended')) {
        setSuspensionMessage(rawMessage)
      } else if (message.includes('temporarily locked')) {
        setLockedMessage(rawMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return
    setIsResending(true)
    try {
      await authApi.resendVerification(unverifiedEmail)
      toast.success('Verification email sent. Please check your inbox.')
    } catch {
      toast.error('Could not resend right now. Please try again shortly.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900">
      {/* Account Suspended dialog */}
      <Dialog.Root open={suspensionMessage !== null} onOpenChange={(open) => { if (!open) setSuspensionMessage(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-card rounded-2xl shadow-card w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                <Dialog.Title className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Account Suspended
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1" aria-label="Close dialog">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-gray-700 dark:text-gray-300 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
              {suspensionMessage}
            </Dialog.Description>
            <div className="flex justify-end mt-4">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
                  Close
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-10 animate-fade-in">
            <Logo to="/" size="lg" />
          </div>

          {/* Form container with slide-up */}
          <div className="animate-slide-up">
            <h1 className="text-3xl font-bold mb-2 dark:text-white">Welcome back</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Enter your credentials to access your account</p>

            {unverifiedEmail && (
              <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 animate-slide-up">
                <div className="flex items-start gap-3">
                  <MailWarning className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Verify your email to continue</p>
                    <p className="text-sm text-amber-700/90 dark:text-amber-400/80 mt-0.5">
                      We need to confirm{' '}
                      <span className="font-medium">{unverifiedEmail}</span> before you can sign in.
                    </p>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-300 hover:underline disabled:opacity-50"
                    >
                      {isResending ? 'Sending…' : 'Resend verification email'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {lockedMessage && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 animate-slide-up">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">Account temporarily locked</p>
                    <p className="text-sm text-red-700/90 dark:text-red-400/80 mt-0.5">
                      Too many failed sign-in attempts. Please wait about 15 minutes before trying
                      again, or reset your password below.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="animate-slide-up delay-100">
                <label htmlFor="email" className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })) }}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 dark:bg-card dark:text-white dark:focus:border-primary transition-colors ${fieldErrors.email ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                  placeholder="you@example.com"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
                {fieldErrors.email && <p id="email-error" className="mt-1 text-sm text-red-500" role="alert">{fieldErrors.email}</p>}
              </div>

              <div className="animate-slide-up delay-150">
                <label htmlFor="password" className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })) }}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 pr-12 dark:bg-card dark:text-white dark:focus:border-primary transition-colors ${fieldErrors.password ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                    placeholder="Enter your password"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {fieldErrors.password && <p id="password-error" className="mt-1 text-sm text-red-500" role="alert">{fieldErrors.password}</p>}
              </div>

              <div className="flex items-center justify-end animate-slide-up delay-200">
                <Link to="/forgot-password" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>

              <div className="animate-slide-up delay-200">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-base hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-gray-500 dark:text-gray-400 animate-slide-up delay-300">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                Create account
              </Link>
            </p>

          </div>
        </div>
      </div>

      {/* Right side - Decorative panel */}
      {/* Right side - Background image panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-end justify-center">
        {/* Background image */}
        <img
          src="/images/login-bg.jpg"
          alt="Construction engineers on site"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        {/* Content overlay at bottom */}
        <div className="relative z-10 text-white p-10 pb-14 max-w-lg animate-fade-in">
          <h2 className="text-3xl font-extrabold mb-4 leading-tight">
            Smart Construction<br />Marketplace
          </h2>
          <p className="text-base text-white/80 mb-8 leading-relaxed">
            Connect with verified builders, manage projects, and ensure secure payments across Pakistan.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-3 animate-slide-up delay-200">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3.5 text-left border border-white/10">
              <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-white/90">Verified Builders</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3.5 text-left border border-white/10">
              <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-white/90">Secure Escrow</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3.5 text-left border border-white/10">
              <Users className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-white/90">Team Management</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3.5 text-left border border-white/10">
              <Hammer className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-white/90">Project Tracking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
