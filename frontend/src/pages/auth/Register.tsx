import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Hammer, Eye, EyeOff, User, Package, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.string().min(1, 'Please select a role'),
  phone: z.string().optional(),
  city: z.string().optional(),
  companyName: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' }
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' }
  if (score <= 4) return { score, label: 'Strong', color: 'bg-green-500' }
  return { score, label: 'Very Strong', color: 'bg-emerald-500' }
}

const roles = [
  { value: 'CLIENT', label: 'Client / Homeowner', description: 'Post projects and hire builders', icon: User },
  { value: 'BUILDER', label: 'Builder / Contractor', description: 'Bid on projects and get work', icon: Hammer },
  { value: 'SUPPLIER', label: 'Material Supplier', description: 'Sell construction materials', icon: Package },
]

const SELF_REGISTER_ROLES = roles.map((r) => r.value)

export default function Register() {
  const { register } = useAuth()
  const [searchParams] = useSearchParams()
  const roleParam = (searchParams.get('role') || '').toUpperCase()
  const initialRole = SELF_REGISTER_ROLES.includes(roleParam) ? roleParam : ''
  const [step, setStep] = useState(initialRole ? 2 : 1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: initialRole,
    phone: '',
    city: '',
    companyName: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleRoleSelect = (role: string) => {
    setFormData({ ...formData, role })
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = registerSchema.safeParse(formData)
    if (!result.success) {
      const firstIssue = result.error.issues[0]
      setError(firstIssue.message)
      return
    }

    setIsLoading(true)
    try {
      await register({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
        role: result.data.role,
        phone: result.data.phone,
        city: result.data.city,
        companyName: result.data.companyName,
      })
    } catch (error) {
      // Error handled in context
    } finally {
      setIsLoading(false)
    }
  }

  const inputClasses = "w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 dark:border-gray-600 dark:bg-card dark:text-white dark:focus:border-primary transition-colors"
  const labelClasses = "block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300"

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-10 animate-fade-in">
            <Logo to="/" size="lg" />
          </div>

          {/* Step indicator */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : '1'}
                </div>
                <span className={`text-sm font-medium ${step >= 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                  Select Role
                </span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full bg-primary rounded-full transition-all duration-500 ${step >= 2 ? 'w-full' : 'w-0'}`} />
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  2
                </div>
                <span className={`text-sm font-medium ${step >= 2 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                  Your Details
                </span>
              </div>
            </div>
          </div>

          {step === 1 ? (
            <div className="animate-slide-up">
              <h1 className="text-3xl font-bold mb-2 dark:text-white">Create your account</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Choose how you want to use BuilderConnect</p>

              <div className="space-y-3">
                {roles.map((role, index) => {
                  const Icon = role.icon
                  return (
                    <button
                      key={role.value}
                      onClick={() => handleRoleSelect(role.value)}
                      className={`animate-slide-up delay-${(index + 1) * 100} w-full p-5 border border-gray-200 dark:border-gray-700 rounded-xl text-left hover:border-primary hover:shadow-md hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] transition-all duration-200 group`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-hover:bg-primary/15 dark:group-hover:bg-primary/25 transition-colors">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{role.label}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{role.description}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="animate-slide-up">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary font-medium mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to role selection
              </button>

              <h1 className="text-3xl font-bold mb-2 dark:text-white">Complete your profile</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                You're registering as a{' '}
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  {formData.role === 'CLIENT' && <User className="h-3.5 w-3.5" />}
                  {formData.role === 'BUILDER' && <Hammer className="h-3.5 w-3.5" />}
                  {formData.role === 'SUPPLIER' && <Package className="h-3.5 w-3.5" />}
                  {formData.role}
                </span>
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-100 dark:border-red-800/30">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="animate-slide-up delay-100">
                  <label htmlFor="name" className={labelClasses}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  />
                </div>

                <div className="animate-slide-up delay-150">
                  <label htmlFor="email" className={labelClasses}>
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 animate-slide-up delay-200">
                  <div>
                    <label htmlFor="phone" className={labelClasses}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={inputClasses}
                    />
                  </div>
                  <div>
                    <label htmlFor="city" className={labelClasses}>
                      City
                    </label>
                    <select
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={inputClasses}
                    >
                      <option value="">Select city</option>
                      <option value="Karachi">Karachi</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Islamabad">Islamabad</option>
                      <option value="Rawalpindi">Rawalpindi</option>
                      <option value="Faisalabad">Faisalabad</option>
                      <option value="Multan">Multan</option>
                    </select>
                  </div>
                </div>

                {(formData.role === 'BUILDER' || formData.role === 'SUPPLIER') && (
                  <div className="animate-slide-up delay-200">
                    <label htmlFor="companyName" className={labelClasses}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className={inputClasses}
                    />
                  </div>
                )}

                <div className="animate-slide-up delay-300">
                  <label htmlFor="password" className={labelClasses}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`${inputClasses} pr-12`}
                      required
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
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => {
                          const strength = getPasswordStrength(formData.password)
                          return (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                i <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            />
                          )
                        })}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {getPasswordStrength(formData.password).label} — use 12+ chars with uppercase, numbers, and symbols
                      </p>
                    </div>
                  )}
                </div>

                <div className="animate-slide-up delay-300">
                  <label htmlFor="confirmPassword" className={labelClasses}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={inputClasses}
                    required
                  />
                </div>

                <div className="animate-slide-up delay-400">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold text-base hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                  >
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <p className="mt-6 text-center text-gray-500 dark:text-gray-400 animate-slide-up delay-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Background image panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-8">
        {/* Background image */}
        <img
          src="/images/sign-up.jpg"
          alt="Construction professionals collaborating on a project"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Brand-tinted overlay keeps the orange identity and the text readable */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/60 to-gray-900/75" />

        {/* Content */}
        <div className="relative z-10 text-white text-center max-w-md animate-fade-in">
          <h2 className="text-4xl font-extrabold mb-6 leading-tight">
            Join BuilderConnect<br />Today
          </h2>
          <p className="text-lg text-white/85 mb-10 leading-relaxed">
            Whether you're looking to build or looking for work, our platform connects you with the
            right people to get the job done.
          </p>

          {/* Trust indicators */}
          <div className="flex flex-col gap-4 animate-slide-up delay-200">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <CheckCircle2 className="h-5 w-5 text-white/90 flex-shrink-0" />
              <span className="text-sm font-medium text-white/90 text-left">Verified professionals with proven track records</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <CheckCircle2 className="h-5 w-5 text-white/90 flex-shrink-0" />
              <span className="text-sm font-medium text-white/90 text-left">Secure escrow payments protect every transaction</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <CheckCircle2 className="h-5 w-5 text-white/90 flex-shrink-0" />
              <span className="text-sm font-medium text-white/90 text-left">Real-time project tracking and milestone management</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
