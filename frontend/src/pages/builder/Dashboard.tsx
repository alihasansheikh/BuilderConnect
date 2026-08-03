import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { bidApi, projectApi, builderApi, leadApi } from '@/services/api'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Briefcase,
  CheckCircle2,
  BarChart3,
  Search,
  ShieldCheck,
  UserCog,
  Coins,
  Camera,
  Star,
  Gavel,
  X,
} from 'lucide-react'

export default function BuilderDashboard() {
  const { user } = useAuth()
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false)

  // Fetch builder's bids
  const { data: bidsData, isLoading: bidsLoading, isError: bidsError, refetch: refetchBids } = useQuery({
    queryKey: ['builder-bids', 'dashboard', { size: 5 }],
    queryFn: async () => {
      const response = await bidApi.getBuilderBids({ size: 5 })
      return response.data
    },
    staleTime: 60_000,
  })

  // Fetch builder's active projects
  const { data: projectsData, isLoading: projectsLoading, isError: projectsError } = useQuery({
    queryKey: ['builder-projects', 'dashboard', { size: 5 }],
    queryFn: async () => {
      const response = await projectApi.getBuilderProjects({ size: 5 })
      return response.data
    },
    staleTime: 60_000,
  })

  // Unfiltered lifetime bid totals (same source the My Bids page uses) — the stat tiles derive
  // from these rather than from the 5-row preview page above.
  const { data: bidStats, isLoading: statsLoading } = useQuery({
    queryKey: ['builder-bid-stats'],
    queryFn: () => bidApi.stats().then((r) => r.data),
    staleTime: 60_000,
  })

  // Live project counts + earnings from the analytics endpoint.
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['builder-analytics'],
    queryFn: () => builderApi.getAnalytics().then((r) => r.data),
    staleTime: 60_000,
  })

  // Live lead-credit balance (replaces the stale AuthContext snapshot).
  const { data: leadBalance } = useQuery({
    queryKey: ['lead-credits-balance'],
    queryFn: () => leadApi.getCreditBalance().then((r) => r.data),
    staleTime: 60_000,
  })

  const isLoading = bidsLoading || projectsLoading || statsLoading || analyticsLoading

  // Stat tiles derive from the unfiltered bid stats and the analytics project counts.
  const pendingBids = (bidStats?.submitted ?? 0) + (bidStats?.shortlisted ?? 0)
  const totalBids = bidStats?.total ?? 0
  const activeProjects = analytics?.projects?.inProgress ?? 0
  const completedProjects = analytics?.projects?.completed ?? 0
  const totalEarnings = Number(analytics?.projects?.totalEarnings ?? 0)

  // Get builder profile data
  const builderProfile = user?.builderProfile
  const leadCredits = leadBalance?.credits ?? 0
  const rating = builderProfile?.averageRating || 0

  if (isLoading) {
    return <LoadingSpinner size="lg" label="Loading dashboard..." fullPage />
  }

  if (bidsError || projectsError) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 dark:text-red-400">Failed to load data. Please try again.</p>
        <button onClick={() => refetchBids()} className="mt-4 text-primary hover:underline">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header — Minimals dark navy */}
      <div className="animate-slide-up relative overflow-hidden bg-navy text-white rounded-2xl p-8">
        <div className="relative z-10 max-w-md">
          <h1 className="text-2xl font-bold mb-2">Welcome back 👋<br />{user?.name?.split(' ')[0]}</h1>
          <p className="text-gray-400 text-sm mb-5">Here's what's happening with your business today.</p>
          <Link
            to="/builder/marketplace"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            Browse Projects
          </Link>
        </div>
        <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-primary/20" />
        <div className="absolute right-24 -top-4 h-20 w-20 rounded-full bg-primary/10" />
      </div>

      {builderProfile && !builderProfile.isVerified && !verifyBannerDismissed && (
        <div className="animate-fade-in flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex min-w-0 items-center gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Your account is not verified yet — verified builders win more projects.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/profile#verification"
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Get Verified
            </Link>
            <button
              type="button"
              onClick={() => setVerifyBannerDismissed(true)}
              aria-label="Dismiss verification banner"
              className="rounded p-1 text-amber-600 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Projects" value={activeProjects} color="#F97316" trendDirection="up" className="animate-slide-up delay-100" />
        <StatCard title="Pending Bids" value={pendingBids} color="#22C55E" trendDirection="neutral" className="animate-slide-up delay-200" />
        <StatCard title="Total Earnings" value={formatCurrency(totalEarnings)} color="#00B8D9" trendDirection="up" className="animate-slide-up delay-300" />
        <StatCard title="Lead Credits" value={leadCredits} color="#7635DC" trendDirection="neutral" className="animate-slide-up delay-400" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="animate-fade-in delay-200 bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your Rating</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-bold dark:text-white">{Number(rating).toFixed(1)}</span>
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              </div>
            </div>
            <Link to="/builder/reviews" className="text-sm text-primary hover:underline">
              View Reviews
            </Link>
          </div>
        </div>
        <div className="animate-fade-in delay-300 bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed Projects</p>
              <p className="text-3xl font-bold dark:text-white mt-1">{completedProjects}</p>
            </div>
            <div className="h-12 w-12 flex items-center justify-center rounded-2xl shadow-card bg-emerald-500 text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>
        <div className="animate-fade-in delay-400 bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Bids</p>
              <p className="text-3xl font-bold dark:text-white mt-1">{totalBids}</p>
            </div>
            <div className="h-12 w-12 flex items-center justify-center rounded-2xl shadow-card bg-blue-500 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bids */}
        <div className="animate-fade-in delay-300 bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold dark:text-white">Recent Bids</h2>
            <Link to="/builder/bids" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {bidsData?.content?.length === 0 ? (
              <EmptyState
                icon={<Gavel className="h-10 w-10 text-gray-400" />}
                title="No bids yet"
                description="Start bidding on projects in the marketplace!"
                action={{ label: 'Browse Projects', to: '/builder/marketplace' }}
                className="py-6"
              />
            ) : (
              bidsData?.content?.slice(0, 5).map((bid: any) => (
                <div key={bid.id} className="border-b dark:border-gray-700 pb-4 last:border-0 last:pb-0 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium dark:text-gray-200">{bid.projectTitle}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(bid.amount)}</p>
                    </div>
                    <StatusBadge status={bid.status} domain="bid" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Projects */}
        <div className="animate-fade-in delay-300 bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold dark:text-white">Active Projects</h2>
            <Link to="/builder/projects" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {projectsData?.content?.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="h-10 w-10 text-gray-400" />}
                title="No active projects"
                description="Win a bid to get started!"
                action={{ label: 'Browse Projects', to: '/builder/marketplace' }}
                className="py-6"
              />
            ) : (
              projectsData?.content?.slice(0, 5).map((project: any) => (
                <div key={project.id} className="border-b dark:border-gray-700 pb-4 last:border-0 last:pb-0 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium dark:text-gray-200">{project.title}</p>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {project.deadline ? `Due: ${formatDate(project.deadline)}` : 'No deadline'}
                    </span>
                  </div>
                  {project.progressPercentage !== undefined && (
                    <>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${project.progressPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{project.progressPercentage}% complete</p>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-in delay-400 bg-white dark:bg-card rounded-2xl shadow-card p-6">
        <h2 className="text-lg font-semibold dark:text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/builder/marketplace"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 hover:shadow-md transition-all duration-200"
          >
            <Search className="h-4 w-4" /> Browse Projects
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-200"
          >
            <UserCog className="h-4 w-4" /> Edit Profile
          </Link>
          <Link
            to="/builder/subscription"
            className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-200"
          >
            <Coins className="h-4 w-4" /> Lead Credits & Plan
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 hover:border-primary/30 hover:shadow-md transition-all duration-200"
          >
            <Camera className="h-4 w-4" /> Update Portfolio
          </Link>
        </div>
      </div>
    </div>
  )
}
