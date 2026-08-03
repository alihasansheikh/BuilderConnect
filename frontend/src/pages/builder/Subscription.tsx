import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { subscriptionApi, getApiErrorMessage } from '@/services/api'
import { toast } from 'sonner'
import { Check, Crown, Zap, Shield, AlertTriangle } from 'lucide-react'
import type { SubscriptionPlan } from '@/types'
import { LeadCreditHistory } from '@/components/builder/LeadCreditHistory'

function formatPKR(amount: number): string {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount)
}

const tierIcons: Record<string, typeof Crown> = {
  FREE: Shield,
  BASIC: Zap,
  PROFESSIONAL: Crown,
  ENTERPRISE: Crown,
}

const tierColors: Record<string, string> = {
  FREE: 'border-gray-200 dark:border-gray-600',
  BASIC: 'border-green-300 dark:border-green-700',
  PROFESSIONAL: 'border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900',
  ENTERPRISE: 'border-purple-400 dark:border-purple-600',
}

interface MySubscription {
  currentTier: string
  effectiveTier: string
  expiresAt: string | null
  leadCredits: number
  isExpired: boolean
  plan?: SubscriptionPlan
}

export default function Subscription() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  // StrictMode double-invokes effects in dev — guard so the checkout return is handled once.
  const returnHandledRef = useRef(false)

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionApi.getMySubscription().then(r => r.data as MySubscription),
  })

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionApi.getPlans().then(r => r.data as SubscriptionPlan[]),
  })

  const invalidateSubscription = () => {
    queryClient.invalidateQueries({ queryKey: ['my-subscription'] })
    queryClient.invalidateQueries({ queryKey: ['lead-credits-balance'] })
    queryClient.invalidateQueries({ queryKey: ['lead-transactions'] })
  }

  const checkoutMutation = useMutation({
    mutationFn: (tier: string) => subscriptionApi.createCheckout(tier).then(r => r.data),
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl
    },
    onError: (error) => {
      // Surfaces the backend's real message — e.g. "Stripe is not configured on this server".
      toast.error(getApiErrorMessage(error, 'Could not start checkout'))
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (sessionId: string) => subscriptionApi.confirmCheckout(sessionId).then(r => r.data),
    onSuccess: (data) => {
      if (data.applied) {
        toast.success('Payment successful — your plan is active!')
      } else if (data.alreadyProcessed) {
        toast.success('Payment already processed — your plan is active.')
      } else {
        toast.error('Payment not completed. Please try again.')
      }
      invalidateSubscription()
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Could not confirm payment'))
    },
  })

  const selectFreeMutation = useMutation({
    mutationFn: () => subscriptionApi.selectFreePlan().then(r => r.data),
    onSuccess: () => {
      toast.success('Switched to the Free plan.')
      invalidateSubscription()
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Could not switch to the Free plan'))
    },
  })

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const cancelled = searchParams.get('checkout') === 'cancelled'
    if (!sessionId && !cancelled) return
    if (returnHandledRef.current) return
    returnHandledRef.current = true
    // Strip params FIRST so a refresh/back never re-triggers confirmation.
    setSearchParams({}, { replace: true })
    if (sessionId) {
      confirmMutation.mutate(sessionId)
    } else {
      toast.info('Checkout cancelled — no payment was made.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const plans = plansData || []
  const currentTier = subData?.currentTier || 'FREE'
  const effectiveTier = subData?.effectiveTier || currentTier
  const isExpired = subData?.isExpired ?? false
  const tierOrder = ['FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']

  const isLoading = subLoading || plansLoading

  const handleSwitchToFree = () => {
    if (window.confirm('Switch to the Free plan? You will lose your paid plan benefits immediately.')) {
      selectFreeMutation.mutate()
    }
  }

  const renderPlanButton = (plan: SubscriptionPlan) => {
    const isCurrent = plan.tier === currentTier
    const isPending = checkoutMutation.isPending && checkoutMutation.variables === plan.tier

    if (plan.tier === 'FREE') {
      if (isCurrent) {
        return (
          <button disabled className="w-full px-4 py-2 border dark:border-gray-600 rounded-md text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed">
            Current Plan
          </button>
        )
      }
      return (
        <button
          onClick={handleSwitchToFree}
          disabled={selectFreeMutation.isPending}
          className="w-full px-4 py-2 border dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {selectFreeMutation.isPending ? 'Switching...' : 'Switch to Free'}
        </button>
      )
    }

    if (isCurrent && !isExpired) {
      return (
        <button disabled className="w-full px-4 py-2 border dark:border-gray-600 rounded-md text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed">
          Current Plan
        </button>
      )
    }

    const label = isCurrent
      ? 'Renew'
      : tierOrder.indexOf(plan.tier) > tierOrder.indexOf(currentTier) ? 'Upgrade' : 'Switch'
    return (
      <button
        onClick={() => checkoutMutation.mutate(plan.tier)}
        disabled={checkoutMutation.isPending}
        className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Redirecting...' : label}
      </button>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Subscription</h1>

      {isLoading ? (
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading subscription details...</p>
        </div>
      ) : (
        <>
          {/* Expiry banner */}
          {isExpired && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 mb-6">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Your {currentTier} plan expired
                  {subData?.expiresAt ? ` on ${new Date(subData.expiresAt).toLocaleDateString()}` : ''}.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  You are currently limited to Free-plan benefits.
                </p>
              </div>
              <button
                onClick={() => checkoutMutation.mutate(currentTier)}
                disabled={checkoutMutation.isPending}
                className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm hover:bg-amber-700 disabled:opacity-50 flex-shrink-0"
              >
                {checkoutMutation.isPending ? 'Redirecting...' : 'Renew'}
              </button>
            </div>
          )}

          {/* Current Plan */}
          <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold dark:text-white">Current Plan</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    currentTier === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
                    currentTier === 'PROFESSIONAL' ? 'bg-blue-100 text-blue-800' :
                    currentTier === 'BASIC' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {currentTier}
                  </span>
                  {isExpired && (
                    <>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Expired</span>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-medium">
                        Active as {effectiveTier}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Lead Credits</p>
                <p className="text-2xl font-bold dark:text-white">{subData?.leadCredits ?? 0}</p>
                {subData?.expiresAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {isExpired ? 'Expired' : 'Expires'}: {new Date(subData.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lead Credit History */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Each bid costs 1 lead credit — credits are granted with each subscription payment.
            </p>
            <LeadCreditHistory />
          </div>

          {/* Plans Grid */}
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map(plan => {
              const Icon = tierIcons[plan.tier] || Shield
              const isCurrent = plan.tier === currentTier
              return (
                <div
                  key={plan.id}
                  className={`bg-white dark:bg-card rounded-2xl shadow-card p-6 border-2 ${tierColors[plan.tier] || 'border-gray-200 dark:border-gray-600'} ${isCurrent ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`h-5 w-5 ${
                      plan.tier === 'ENTERPRISE' ? 'text-purple-500' :
                      plan.tier === 'PROFESSIONAL' ? 'text-blue-500' :
                      plan.tier === 'BASIC' ? 'text-green-500' :
                      'text-gray-400'
                    }`} />
                    <h3 className="font-bold dark:text-white">{plan.name}</h3>
                    {isCurrent && (
                      <span className="ml-auto px-2 py-0.5 bg-primary text-primary-foreground rounded text-xs">Current</span>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-bold dark:text-white">{plan.price === 0 ? 'Free' : formatPKR(plan.price)}</span>
                    {plan.price > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">/30 days</span>}
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.description}</p>

                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="dark:text-gray-300">{plan.leadCreditsPerMonth} lead credits/month</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="dark:text-gray-300">{plan.maxActiveBids === 999 ? 'Unlimited' : plan.maxActiveBids} active bids</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="dark:text-gray-300">{plan.maxPortfolioImages === 999 ? 'Unlimited' : plan.maxPortfolioImages} portfolio images</span>
                    </li>
                    {plan.featuredListing && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="dark:text-gray-300">Featured listing</span>
                      </li>
                    )}
                    {plan.prioritySupport && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="dark:text-gray-300">Priority support</span>
                      </li>
                    )}
                    {plan.analyticsAccess && (
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="dark:text-gray-300">Advanced analytics</span>
                      </li>
                    )}
                  </ul>

                  {renderPlanButton(plan)}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
