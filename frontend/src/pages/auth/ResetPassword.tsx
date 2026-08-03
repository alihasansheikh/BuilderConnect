import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { KeyRound, XCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { authApi, getApiErrorMessage } from '@/services/api'
import { Logo } from '@/components/ui/Logo'

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [tokenError, setTokenError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return
    try {
      await authApi.resetPassword(token, data.newPassword)
      toast.success('Password reset successfully. Sign in with your new password.')
      navigate('/login')
    } catch (error) {
      const message = getApiErrorMessage(error, 'Could not reset your password. Please try again.')
      if (/token/i.test(message)) {
        setTokenError(message)
      } else {
        toast.error(message)
      }
    }
  }

  const cardBase =
    'w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8'
  const inputClasses =
    'w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 dark:bg-card dark:text-white transition-colors'

  const invalidToken = !token || tokenError

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center animate-fade-in">
          <Logo to="/" size="lg" />
        </div>

        {invalidToken ? (
          <div className={`${cardBase} text-center animate-slide-up`}>
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              {token ? 'Reset link no longer valid' : 'Reset link is missing'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {token
                ? `${tokenError} Request a fresh link below.`
                : 'This page needs the link from your password reset email. Request a new one below.'}
            </p>
            <Link
              to="/forgot-password"
              className="block w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 shadow-lg shadow-primary/25 transition-all"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <div className={`${cardBase} animate-slide-up`}>
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white text-center">
              Choose a new password
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-center">
              Your new password must be at least 8 characters long.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={inputClasses}
                    {...register('newPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={inputClasses}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/25 transition-all"
              >
                {isSubmitting ? 'Resetting…' : 'Reset password'}
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
