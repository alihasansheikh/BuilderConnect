import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Clock, ChevronDown, MessageSquare, ListChecks, Award } from 'lucide-react'
import type { Bid } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate, formatRelativeTime, deadlineClasses } from '@/lib/formatters'
import { cn, resolveAssetUrl } from '@/lib/utils'

/** Bid statuses a client can still act on (shortlist / award). */
const ACTIONABLE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'] as const

interface BidCardProps {
  bid: Bid
  /** Whether the project is still in a state where bids can be shortlisted/awarded. */
  canAct: boolean
  onShortlist: (bidId: number) => void
  shortlistPending: boolean
  onAward: (bid: Bid) => void
  awardPending: boolean
  onMessage: (builderUserId: number) => void
  messagePending: boolean
}

/**
 * Full bid card for the client's Bids tab: who's bidding (name, company, rating), the whole
 * proposal and work plan, the optional cost breakdown, and the shortlist/award/message actions.
 */
export default function BidCard({
  bid,
  canAct,
  onShortlist,
  shortlistPending,
  onAward,
  awardPending,
  onMessage,
  messagePending,
}: BidCardProps) {
  const [showWorkPlan, setShowWorkPlan] = useState(false)

  const actionable = canAct && (ACTIONABLE_STATUSES as readonly string[]).includes(bid.status)
  const hasCosts = bid.laborCost != null || bid.materialCost != null || bid.otherCost != null
  const initials = (bid.builderName ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="rounded-lg border p-5 dark:border-gray-700 dark:bg-gray-700/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {bid.builderProfileImageUrl ? (
            <img
              src={resolveAssetUrl(bid.builderProfileImageUrl)}
              alt=""
              className="h-11 w-11 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/profile/${bid.builderId}`}
                className="truncate font-semibold hover:text-primary dark:text-white"
              >
                {bid.builderName ?? 'Builder'}
              </Link>
              <StatusBadge status={bid.status} domain="bid" />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
              {bid.builderCompanyName && <span className="truncate">{bid.builderCompanyName}</span>}
              {bid.builderRating != null && bid.builderRating > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {bid.builderRating.toFixed(1)}
                </span>
              )}
              {bid.submittedAt && <span>Submitted {formatRelativeTime(bid.submittedAt)}</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary">{formatCurrency(bid.amount)}</p>
          <p className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            {bid.estimatedDurationDays} days
          </p>
        </div>
      </div>

      {bid.proposal && (
        <p className="mt-3 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{bid.proposal}</p>
      )}

      {hasCosts && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
          {bid.laborCost != null && <span>Labor: {formatCurrency(bid.laborCost)}</span>}
          {bid.materialCost != null && <span>Materials: {formatCurrency(bid.materialCost)}</span>}
          {bid.otherCost != null && <span>Other: {formatCurrency(bid.otherCost)}</span>}
        </div>
      )}

      {bid.workPlan && (
        <div className="mt-3">
          <button
            onClick={() => setShowWorkPlan((prev) => !prev)}
            aria-expanded={showWorkPlan}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', showWorkPlan && 'rotate-180')} />
            Work plan
          </button>
          {showWorkPlan && (
            <p className="mt-2 whitespace-pre-line rounded-lg border p-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              {bid.workPlan}
            </p>
          )}
        </div>
      )}

      {bid.rejectionReason && bid.status === 'REJECTED' && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Rejected: {bid.rejectionReason}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {bid.validUntil ? (
            <span className={deadlineClasses(bid.validUntil)}>Valid until {formatDate(bid.validUntil)}</span>
          ) : (
            bid.bidNumber
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onMessage(bid.builderId)}
            disabled={messagePending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Message
          </button>
          {actionable && bid.status !== 'SHORTLISTED' && (
            <button
              onClick={() => onShortlist(bid.id)}
              disabled={shortlistPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
            >
              <ListChecks className="h-3.5 w-3.5" />
              Shortlist
            </button>
          )}
          {actionable && (
            <button
              onClick={() => onAward(bid)}
              disabled={awardPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50 dark:bg-green-700 dark:hover:bg-green-600"
            >
              <Award className="h-3.5 w-3.5" />
              Award Project
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
