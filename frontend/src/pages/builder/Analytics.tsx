import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { builderApi, badgeApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { BuilderAnalytics, UserBadgeRecord } from '@/types'
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { BarChart3, TrendingUp, Briefcase, Star, Award, Target, Wallet, Lock, Crown } from 'lucide-react'

/** "2026-07" -> "Jul" for compact chart axis labels. */
function monthLabel(ym: string): string {
  const [year, month] = ym.split('-').map(Number)
  if (!year || !month) return ym
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

export default function BuilderAnalyticsPage() {
  const { user } = useAuth()

  const { data: analytics, isLoading, isError } = useQuery<BuilderAnalytics>({
    queryKey: ['builder-analytics'],
    queryFn: () => builderApi.getAnalytics().then((r) => r.data),
  })

  const { data: badges } = useQuery<UserBadgeRecord[]>({
    queryKey: ['user-badges', user?.id],
    queryFn: () => badgeApi.getUserBadges(user!.id).then((r) => r.data),
    enabled: !!user?.id,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isError || !analytics) {
    return (
      <div className="text-center py-16 text-gray-500 dark:text-gray-400">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>Failed to load analytics data.</p>
        <p className="text-sm mt-1">Please try again later.</p>
      </div>
    )
  }

  const { bids, projects, profile } = analytics
  const earningsReceived = Number(analytics.earningsReceived || 0)

  const kpiCards = [
    { label: 'Total Projects', value: projects.total, icon: Briefcase, color: 'bg-blue-50 text-blue-600' },
    { label: 'Completed', value: projects.completed, icon: Award, color: 'bg-green-50 text-green-600' },
    { label: 'In Progress', value: projects.inProgress, icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
    {
      label: 'Total Earnings',
      value: formatCurrency(Number(projects.totalEarnings || 0)),
      icon: Target,
      color: 'bg-purple-50 text-purple-600',
    },
    { label: 'Earnings received', value: formatCurrency(earningsReceived), icon: Wallet, color: 'bg-cyan-50 text-cyan-600' },
  ]

  const bidBreakdown = [
    { label: 'Submitted', value: bids.submitted, color: 'bg-blue-500' },
    { label: 'Accepted', value: bids.accepted, color: 'bg-green-500' },
    { label: 'Rejected', value: bids.rejected, color: 'bg-red-500' },
    { label: 'Withdrawn', value: bids.withdrawn, color: 'bg-gray-400' },
  ]
  const maxBidValue = Math.max(...bidBreakdown.map((b) => b.value), 1)

  const monthly = (analytics.monthly ?? []).map((p) => ({
    label: monthLabel(p.month),
    bids: p.bids,
    won: p.won,
    revenue: Number(p.revenue),
  }))
  const distribution = analytics.reviewDistribution ?? []
  const maxRatingCount = Math.max(...distribution.map((d) => d.count), 1)
  const hasReviews = distribution.some((d) => d.count > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your performance metrics and insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white dark:bg-card rounded-2xl shadow-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold dark:text-white">{card.value}</p>
            </div>
          )
        })}
      </div>

      {/* Trends — gated on the effective plan (server strips these when access is off) */}
      {analytics.analyticsAccess ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
              <h2 className="font-semibold text-lg dark:text-white mb-1">Bids & Wins</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Bids placed vs. bids won, last 12 months</p>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bids" name="Bids" fill="#F97316" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="won" name="Won" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
              <h2 className="font-semibold text-lg dark:text-white mb-1">Earnings Received</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Payments received per month, last 12 months</p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
            <h2 className="font-semibold text-lg dark:text-white mb-4">Rating Distribution</h2>
            {hasReviews ? (
              <div className="space-y-3">
                {distribution.map((d) => (
                  <div key={d.rating} className="flex items-center gap-3">
                    <span className="flex w-12 items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      {d.rating}
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    </span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-amber-400 h-2.5 rounded-full transition-all"
                        style={{ width: `${(d.count / maxRatingCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-medium dark:text-gray-200">{d.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No reviews yet.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold dark:text-white">Unlock advanced analytics</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Advanced analytics is available on Professional and Enterprise plans — see your monthly bid, win and
            earnings trends plus your rating distribution.
          </p>
          <Link
            to="/builder/subscription"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Crown className="h-4 w-4" /> View Plans
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bid Breakdown */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <h2 className="font-semibold text-lg dark:text-white mb-1">Bid Breakdown</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {bids.total} total bids — {bids.winRate}% win rate
          </p>
          <div className="space-y-3">
            {bidBreakdown.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="font-medium dark:text-gray-200">{item.value}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`${item.color} h-2.5 rounded-full transition-all`}
                    style={{ width: `${(item.value / maxBidValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rating & Profile */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <h2 className="font-semibold text-lg dark:text-white mb-4">Rating & Profile</h2>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 mb-2">
              <Star className="h-10 w-10 text-amber-500" />
            </div>
            <p className="text-3xl font-bold dark:text-white">{profile.averageRating?.toFixed(1) || '0.0'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.totalReviews} reviews</p>
          </div>

          <div className="space-y-3 border-t dark:border-gray-700 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Verification</span>
              {profile.isVerified ? (
                <span className="text-green-600 font-medium">Verified</span>
              ) : (
                <span className="text-gray-400">Not Verified</span>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subscription</span>
              <span className="font-medium dark:text-gray-200 capitalize">{profile.subscriptionTier?.toLowerCase() || 'free'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Win Rate</span>
              <span className="font-medium dark:text-gray-200">{bids.winRate}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Completion Rate</span>
              <span className="font-medium dark:text-gray-200">
                {projects.total > 0 ? Math.round((projects.completed / projects.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Earned Badges (real, awarded badges) */}
          <div className="mt-5 pt-4 border-t dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Badges</p>
            {badges && badges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/[0.08] text-primary text-xs rounded-full font-medium"
                    title={b.badgeDescription || b.badgeName}
                  >
                    <Award className="h-3.5 w-3.5" />
                    <span>{b.badgeName}</span>
                    <span className="text-primary/60">· {formatDate(b.awardedAt)}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No badges earned yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
