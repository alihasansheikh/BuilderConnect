import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { bidApi, subscriptionApi, getApiErrorMessage } from '@/services/api'
import { Bid, BidStats, BidStatus, PageResponse, SubscriptionPlan } from '@/types'
import { formatBudgetRange, formatCurrency, formatDate, formatRelativeTime, formatStatus } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { FilterChips } from '@/components/ui/FilterChips'
import { ModalShell } from '@/components/ui/ModalShell'
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gavel,
  Home,
  Loader2,
  MapPin,
  Ruler,
  Search,
  Sparkles,
  Star,
  Trophy,
  Undo2,
  Wallet,
  XCircle,
} from 'lucide-react'

/** '' means "no status filter". DRAFT/UNDER_REVIEW are unreachable in this app; EXPIRED comes from the daily sweep. */
type BidStatusFilter =
  | ''
  | Extract<BidStatus, 'SUBMITTED' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED'>

const STATUS_FILTERS: ReadonlyArray<{ value: BidStatusFilter; label: string }> = [
  { value: '', label: 'All' },
  { value: 'SUBMITTED', label: 'Awaiting Review' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'EXPIRED', label: 'Expired' },
]

/** Withdrawal is allowed while the client is still deciding. */
const WITHDRAWABLE_STATUSES: ReadonlyArray<BidStatus> = ['SUBMITTED', 'SHORTLISTED']

const SKELETON_COUNT = 3

/** Sentinel the seed plans use for "unlimited" active bids. */
const UNLIMITED_BIDS = 999

/** Shape of GET /v1/builder/subscription — only the fields this page needs. */
interface MySubscriptionSummary {
  effectiveTier?: string
  plan?: SubscriptionPlan
}

/**
 * "X of N active bids used" — surfaces the plan cap BEFORE a bid submit fails on it.
 * Active = submitted + shortlisted (mirrors the backend's active-bid counting; UNDER_REVIEW
 * is unreachable in this app). Renders nothing until both plan and stats have loaded.
 */
function ActiveBidUsage({
  stats,
  subscription,
  plans,
}: {
  stats?: BidStats
  subscription?: MySubscriptionSummary
  plans?: SubscriptionPlan[]
}) {
  const effectivePlan =
    plans?.find((p) => p.tier === subscription?.effectiveTier) ?? subscription?.plan
  if (!stats || !effectivePlan) return null

  const limit = effectivePlan.maxActiveBids
  const active = (stats.submitted ?? 0) + (stats.shortlisted ?? 0)
  if (limit >= UNLIMITED_BIDS) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {active} active bid{active !== 1 ? 's' : ''} — unlimited on your {effectivePlan.tier} plan
      </p>
    )
  }

  const atLimit = active >= limit
  return (
    <p className={cn('text-sm', atLimit ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400')}>
      {active} of {limit} active bids used on your {effectivePlan.tier} plan
      {atLimit && (
        <>
          {' — '}
          <Link to="/builder/subscription" className="font-medium text-primary hover:underline">
            upgrade to bid on more projects
          </Link>
        </>
      )}
    </p>
  )
}

function BidStatsRow({ stats, isLoading }: { stats?: BidStats; isLoading: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        title="Total Bids"
        value={stats?.total ?? 0}
        isLoading={isLoading}
        icon={<Gavel className="h-6 w-6" />}
      />
      <StatCard
        title="Awaiting Review"
        value={stats?.submitted ?? 0}
        isLoading={isLoading}
        icon={<Clock className="h-6 w-6" />}
        colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
      />
      <StatCard
        title="Shortlisted"
        value={stats?.shortlisted ?? 0}
        isLoading={isLoading}
        icon={<Star className="h-6 w-6" />}
        colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
      />
      <StatCard
        title="Won"
        value={stats?.accepted ?? 0}
        isLoading={isLoading}
        icon={<Trophy className="h-6 w-6" />}
        colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
      />
    </div>
  )
}

function OutcomeBanner({
  className,
  icon,
  children,
}: {
  className: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className={cn('mt-4 flex items-start gap-2.5 rounded-lg border p-3 text-sm', className)}>
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Status-specific banner under the bid card body; null for statuses with no extra context. */
function BidOutcomeBanner({ bid }: { bid: Bid }) {
  switch (bid.status) {
    case 'ACCEPTED':
      return (
        <OutcomeBanner
          className="border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400"
          icon={<CheckCircle2 className="h-4 w-4" />}
        >
          <p className="font-medium">
            {bid.acceptedAt ? `Accepted on ${formatDate(bid.acceptedAt)}` : 'Accepted'} — congratulations, this
            project is yours.
          </p>
        </OutcomeBanner>
      )
    case 'SHORTLISTED':
      return (
        <OutcomeBanner
          className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-900/20 dark:text-purple-400"
          icon={<Sparkles className="h-4 w-4" />}
        >
          <p className="font-medium">Shortlisted — the client is comparing finalists.</p>
        </OutcomeBanner>
      )
    case 'REJECTED':
      return (
        <OutcomeBanner
          className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
          icon={<XCircle className="h-4 w-4" />}
        >
          <p>
            This bid was not selected
            {bid.reviewedAt ? ` — reviewed on ${formatDate(bid.reviewedAt)}` : ''}.
          </p>
          {bid.rejectionReason && (
            <p className="mt-1">
              <span className="font-medium">Reason:</span> {bid.rejectionReason}
            </p>
          )}
        </OutcomeBanner>
      )
    case 'WITHDRAWN':
      return (
        <OutcomeBanner
          className="border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-400"
          icon={<Undo2 className="h-4 w-4" />}
        >
          <p>
            Withdrawn{bid.withdrawnAt ? ` on ${formatDate(bid.withdrawnAt)}` : ''} — your lead credit was
            refunded.
          </p>
        </OutcomeBanner>
      )
    case 'EXPIRED':
      return (
        <OutcomeBanner
          className="border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-400"
          icon={<Clock className="h-4 w-4" />}
        >
          <p>
            This bid expired{bid.validUntil ? ` on ${formatDate(bid.validUntil)}` : ''} — submit a fresh bid if
            the project is still accepting bids.
          </p>
        </OutcomeBanner>
      )
    default:
      return null
  }
}

const CONTEXT_ICON = 'h-3.5 w-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500'

/** Marketplace-card-style context line: where and what the bid's project is. */
function BidProjectContext({ bid }: { bid: Bid }) {
  const hasArea = bid.projectAreaValue != null && Boolean(bid.projectAreaUnit)
  const hasBudget = bid.projectBudgetMin != null || bid.projectBudgetMax != null
  if (!bid.projectCity && !bid.projectPropertyType && !hasArea && !hasBudget) return null

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
      {bid.projectCity && (
        <span className="inline-flex items-center gap-1.5">
          <MapPin className={CONTEXT_ICON} />
          {bid.projectCity}
        </span>
      )}
      {bid.projectPropertyType && (
        <span className="inline-flex items-center gap-1.5">
          <Home className={CONTEXT_ICON} />
          {formatStatus(bid.projectPropertyType)}
        </span>
      )}
      {bid.projectAreaValue != null && bid.projectAreaUnit && (
        <span className="inline-flex items-center gap-1.5">
          <Ruler className={CONTEXT_ICON} />
          {bid.projectAreaValue} {formatStatus(bid.projectAreaUnit)}
        </span>
      )}
      {hasBudget && (
        <span className="inline-flex items-center gap-1.5">
          <Wallet className={CONTEXT_ICON} />
          {formatBudgetRange(bid.projectBudgetMin, bid.projectBudgetMax)}
        </span>
      )}
    </div>
  )
}

interface BidCardProps {
  bid: Bid
  withdrawing: boolean
  onWithdraw: (bid: Bid) => void
}

function BidCard({ bid, withdrawing, onWithdraw }: BidCardProps) {
  const withdrawable = WITHDRAWABLE_STATUSES.includes(bid.status)
  const projectPath =
    bid.status === 'ACCEPTED' ? `/builder/projects/${bid.projectId}` : `/builder/marketplace/${bid.projectId}`

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card dark:bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900 dark:text-white">
              {bid.projectTitle ?? bid.bidNumber}
            </h3>
            <StatusBadge status={bid.status} domain="bid" />
          </div>

          <BidProjectContext bid={bid} />

          <p className="mt-1.5 line-clamp-2 break-words text-sm text-gray-600 dark:text-gray-400">{bid.proposal}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
              <Wallet className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
              {formatCurrency(bid.amount)}
            </span>
            {bid.estimatedDurationDays != null && (
              <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Clock className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                {bid.estimatedDurationDays} days
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <CalendarDays className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
              Submitted {formatRelativeTime(bid.submittedAt ?? bid.createdAt)}
            </span>
            {withdrawable && bid.validUntil && (
              <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Clock className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                Valid until {formatDate(bid.validUntil)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          <Link
            to={projectPath}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          >
            View Project
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          {withdrawable && (
            <button
              onClick={() => onWithdraw(bid)}
              disabled={withdrawing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {withdrawing && <Loader2 className="h-4 w-4 animate-spin" />}
              Withdraw
            </button>
          )}
        </div>
      </div>

      <BidOutcomeBanner bid={bid} />
    </div>
  )
}

interface BidResultsProps {
  data?: PageResponse<Bid>
  isLoading: boolean
  isError: boolean
  refetch: () => void
  statusFilter: BidStatusFilter
  page: number
  onPageChange: (page: number) => void
  withdrawingId?: number
  onWithdraw: (bid: Bid) => void
}

function BidResults({
  data,
  isLoading,
  isError,
  refetch,
  statusFilter,
  page,
  onPageChange,
  withdrawingId,
  onWithdraw,
}: BidResultsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-card dark:bg-card">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <p className="font-medium text-gray-900 dark:text-white">Failed to load your bids</p>
        <button onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
          Try again
        </button>
      </div>
    )
  }

  if (!data?.content?.length) {
    const activeLabel = STATUS_FILTERS.find((f) => f.value === statusFilter)?.label
    return (
      <div className="rounded-2xl bg-white shadow-card dark:bg-card">
        <EmptyState
          icon={<Gavel className="h-12 w-12 text-gray-300 dark:text-gray-600" />}
          title={statusFilter ? 'No bids in this view' : 'No bids yet'}
          description={
            statusFilter
              ? `You don't have any ${activeLabel?.toLowerCase()} bids right now. Try another filter.`
              : 'Start bidding on marketplace projects to grow your business.'
          }
          action={statusFilter ? undefined : { label: 'Browse Projects', to: '/builder/marketplace' }}
        />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {data.content.map((bid) => (
          <BidCard key={bid.id} bid={bid} withdrawing={withdrawingId === bid.id} onWithdraw={onWithdraw} />
        ))}
      </div>
      <Pagination page={page} totalPages={data.totalPages} onPageChange={onPageChange} className="pt-2" />
    </>
  )
}

interface WithdrawBidModalProps {
  bid: Bid | null
  pending: boolean
  onClose: () => void
  onConfirm: () => void
}

function WithdrawBidModal({ bid, pending, onClose, onConfirm }: WithdrawBidModalProps) {
  return (
    <ModalShell
      open={bid !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Withdraw bid?"
      size="sm"
      closeDisabled={pending}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Withdraw Bid
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">
        You are about to withdraw your bid on{' '}
        <span className="font-medium text-gray-900 dark:text-white">{bid?.projectTitle ?? 'this project'}</span>.
        Your lead credit for this project will be refunded, and you can place a new bid later if the project is
        still accepting bids.
      </p>
    </ModalShell>
  )
}

export default function MyBids() {
  // The status filter lives in the URL (?status=SHORTLISTED) so dashboard tiles can deep-link
  // into a filtered view and the filter survives refresh and back-navigation.
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = (searchParams.get('status') as BidStatusFilter | null) ?? ''
  const [page, setPage] = useState(0)
  const [withdrawTarget, setWithdrawTarget] = useState<Bid | null>(null)
  const queryClient = useQueryClient()

  const selectFilter = (value: BidStatusFilter) => {
    setSearchParams(value ? { status: value } : {}, { replace: true })
    setPage(0)
  }

  // Unfiltered lifetime totals — deliberately NOT derived from the current page's content.
  const statsQuery = useQuery({
    queryKey: ['builder-bid-stats'],
    queryFn: () => bidApi.stats().then((r) => r.data),
  })

  // Plan-limit context for the "X of N active bids" line (no new endpoints — both cached app-wide).
  const subscriptionQuery = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionApi.getMySubscription().then((r) => r.data as MySubscriptionSummary),
  })

  const plansQuery = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionApi.getPlans().then((r) => r.data),
  })

  const bidsQuery = useQuery({
    queryKey: ['builder-bids', statusFilter, page],
    queryFn: () => bidApi.getBuilderBids({ status: statusFilter || undefined, page }).then((r) => r.data),
  })

  const withdrawMutation = useMutation({
    mutationFn: (bidId: number) => bidApi.withdraw(bidId),
    onSuccess: () => {
      toast.success('Bid withdrawn — your lead credit has been refunded')
      setWithdrawTarget(null)
      queryClient.invalidateQueries({ queryKey: ['builder-bids'] })
      queryClient.invalidateQueries({ queryKey: ['builder-bid-stats'] })
      queryClient.invalidateQueries({ queryKey: ['lead-credits-balance'] })
      queryClient.invalidateQueries({ queryKey: ['lead-transactions'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to withdraw bid')),
  })

  const withdrawingId = withdrawMutation.isPending ? withdrawMutation.variables : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">My Bids</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Track and manage your project proposals</p>
          <div className="mt-1">
            <ActiveBidUsage
              stats={statsQuery.data}
              subscription={subscriptionQuery.data}
              plans={plansQuery.data}
            />
          </div>
        </div>
        <Link
          to="/builder/marketplace"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90"
        >
          <Search className="h-4 w-4" />
          Browse Projects
        </Link>
      </div>

      <BidStatsRow stats={statsQuery.data} isLoading={statsQuery.isLoading} />

      <FilterChips options={STATUS_FILTERS} value={statusFilter} onChange={selectFilter} />

      <BidResults
        data={bidsQuery.data}
        isLoading={bidsQuery.isLoading}
        isError={bidsQuery.isError}
        refetch={bidsQuery.refetch}
        statusFilter={statusFilter}
        page={page}
        onPageChange={setPage}
        withdrawingId={withdrawingId}
        onWithdraw={setWithdrawTarget}
      />

      <WithdrawBidModal
        bid={withdrawTarget}
        pending={withdrawMutation.isPending}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={() => {
          if (withdrawTarget) withdrawMutation.mutate(withdrawTarget.id)
        }}
      />
    </div>
  )
}
