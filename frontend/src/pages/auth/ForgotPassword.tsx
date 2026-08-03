import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { authApi, getApiErrorMessage } from '@/services/api'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSubmitted(true)
      toast.success('If an account exists with that email, a reset link has been sent.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Something went wrong. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-white dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Logo to="/" size="lg" />
        </div>

        <h1 className="text-3xl font-bold mb-2 dark:text-white">Reset your password</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <p className="text-green-800 text-sm">
              If an account exists for <strong>{email}</strong>, you will receive a password reset email shortly.
              Please check your inbox and spam folder.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="you@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isLoading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <Link
          to="/login"
          className="flex items-center gap-1 mt-6 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </div>
    </div>
  )
}
