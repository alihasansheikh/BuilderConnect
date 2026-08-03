import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { MailCheck, CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react'
import { authApi } from '@/services/api'
import { Logo } from '@/components/ui/Logo'
import { toast } from 'sonner'

type Status = 'pending' | 'verifying' | 'success' | 'error'

function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>
  return axiosError.response?.data?.message || 'Something went wrong. Please try again.'
}

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const emailFromQuery = searchParams.get('email') || ''

  // A token in the URL means the user clicked the link in their inbox — verify it.
  // No token means we arrived here right after registering — show the "check inbox" state.
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'pending')
  const [errorMessage, setErrorMessage] = useState('')
  const [email, setEmail] = useState(emailFromQuery)
  const [isResending, setIsResending] = useState(false)
  // React 18 StrictMode double-invokes effects in dev; guard so we only POST once.
  const hasVerified = useRef(false)

  useEffect(() => {
    if (!token || hasVerified.current) return
    hasVerified.current = true

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success')
        toast.success('Email verified! You can now sign in.')
      })
      .catch((error) => {
        setStatus('error')
        setErrorMessage(getErrorMessage(error))
      })
  }, [token])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email address.')
      return
    }
    setIsResending(true)
    try {
      await authApi.resendVerification(email.trim())
      toast.success('If the account exists and is unverified, a new link is on its way.')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsResending(false)
    }
  }

  const cardBase =
    'w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 text-center'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center animate-fade-in">
          <Logo to="/" size="lg" />
        </div>

        {status === 'verifying' && (
          <div className={`${cardBase} animate-slide-up`}>
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Verifying your email…</h1>
            <p className="text-gray-500 dark:text-gray-400">This will only take a moment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className={`${cardBase} animate-slide-up`}>
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Email verified</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Your account is now active. Sign in to get started.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 shadow-lg shadow-primary/25 transition-all"
            >
              Continue to sign in
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className={`${cardBase} animate-slide-up`}>
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Verification failed</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {errorMessage} The link may have expired — request a fresh one below.
            </p>
            <form onSubmit={handleResend} className="space-y-3 text-left">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 dark:bg-card dark:text-white transition-colors"
              />
              <button
                type="submit"
                disabled={isResending}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isResending ? 'Sending…' : 'Resend verification email'}
              </button>
            </form>
          </div>
        )}

        {status === 'pending' && (
          <div className={`${cardBase} animate-slide-up`}>
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Check your inbox</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {emailFromQuery ? (
                <>
                  We sent a verification link to{' '}
                  <span className="font-semibold text-gray-900 dark:text-white">{emailFromQuery}</span>. Click it to
                  activate your account, then sign in.
                </>
              ) : (
                <>Enter your email and we'll send you a fresh verification link.</>
              )}
            </p>
            <form onSubmit={handleResend} className="space-y-3 text-left">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 dark:bg-card dark:text-white transition-colors"
              />
              <button
                type="submit"
                disabled={isResending}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isResending ? 'Sending…' : "Resend verification email"}
              </button>
            </form>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
