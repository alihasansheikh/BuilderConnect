import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, Star } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  DEFAULT_REVIEW_SORT,
  REVIEW_RATING_BOUNDS,
  ReviewListControls,
  type ReviewRatingFilter,
} from '@/components/reviews/ReviewListControls'
import { reviewApi } from '@/services/api'
import { formatRelativeTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Review } from '@/types'

interface ReviewsSectionProps {
  userId: number
  /** Authoritative rating rollup from the profile payload (not computed from the fetched page). */
  averageRating?: number
  /** Authoritative review count from the profile payload. */
  totalReviews?: number
  /** Overrides the empty-state copy (e.g. supplier profiles talk about product reviews). */
  emptyDescription?: string
}

const PANEL = 'bg-white dark:bg-card rounded-2xl shadow-card p-6'
const NESTED = 'rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40'

/** Rating for a review, tolerant of the two backend fields (overallRating preferred, rating floor). */
export function reviewRating(review: Review): number {
  return review.overallRating ?? review.rating ?? 0
}

export function Stars({ rating, className }: { rating: number; className?: string }) {
  const rounded = Math.round(rating)
  return (
    <div className={cn('flex', className)} aria-label={`${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            'h-4 w-4',
            i <= rounded ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Read-only reviews panel for a builder profile. Fetches the (already moderated/APPROVED) reviews
 * the backend exposes at GET /v1/builders/{userId}/reviews and summarises them with an average +
 * count header. Reviews are authored elsewhere (the client's completed-project flow) — never here.
 */
export function ReviewsSection({
  userId,
  averageRating,
  totalReviews,
  emptyDescription,
}: ReviewsSectionProps) {
  const [sort, setSort] = useState(DEFAULT_REVIEW_SORT)
  const [ratingFilter, setRatingFilter] = useState<ReviewRatingFilter>('ALL')

  const { data, isLoading, isError } = useQuery({
    // size 100 (the server page cap) keeps this a single fetch even with sort/filter applied.
    queryKey: ['builder-reviews', userId, sort, ratingFilter],
    queryFn: () =>
      reviewApi
        .getBuilderReviews(userId, { size: 100, sort, ...REVIEW_RATING_BOUNDS[ratingFilter] })
        .then((r) => r.data),
  })

  const reviews = data?.content ?? []
  // Header numbers come from the profile rollups — the fetched page may be filtered.
  const total = totalReviews ?? data?.totalElements ?? reviews.length
  const average = averageRating ?? 0

  return (
    <section className={PANEL}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold dark:text-white">Reviews</h2>
        {total > 0 && (
          <div className="flex items-center gap-2">
            <Stars rating={average} />
            <span className="text-sm font-semibold dark:text-gray-200">{average.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">
              ({total} {total === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
      </div>

      {(total > 0 || ratingFilter !== 'ALL') && (
        <ReviewListControls
          className="mb-5"
          sort={sort}
          onSortChange={setSort}
          rating={ratingFilter}
          onRatingChange={setRatingFilter}
        />
      )}

      {isLoading ? (
        <div className="py-10">
          <LoadingSpinner label="Loading reviews..." />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10 text-gray-400" />}
          title="Couldn't load reviews"
          description="Something went wrong fetching reviews. Please try again later."
        />
      ) : reviews.length === 0 ? (
        ratingFilter !== 'ALL' ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No reviews match this filter.
          </p>
        ) : (
          <EmptyState
            icon={<Star className="h-10 w-10 text-gray-400" />}
            title="No reviews yet"
            description={emptyDescription ?? 'Completed projects will collect client reviews here.'}
          />
        )
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} nestedClass={NESTED} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ReviewCard({ review, nestedClass }: { review: Review; nestedClass: string }) {
  const reviewer = review.reviewerName?.trim() || 'Anonymous'
  const reviewedOn = review.productName ?? review.projectTitle

  return (
    <li className={cn(nestedClass, 'p-4')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {review.reviewerId ? (
            <Link
              to={`/profile/${review.reviewerId}`}
              className="truncate font-semibold text-gray-900 hover:text-primary hover:underline dark:text-white"
            >
              {reviewer}
            </Link>
          ) : (
            <p className="truncate font-semibold text-gray-900 dark:text-white">{reviewer}</p>
          )}
          {reviewedOn && (
            <p className="truncate text-xs text-muted-foreground">on {reviewedOn}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Stars rating={reviewRating(review)} />
          <span className="text-xs text-muted-foreground">{formatRelativeTime(review.createdAt)}</span>
        </div>
      </div>

      {review.title && (
        <p className="mt-3 font-medium text-gray-900 dark:text-gray-100">{review.title}</p>
      )}
      {review.comment && (
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {review.comment}
        </p>
      )}

      {(review.helpfulCount ?? 0) > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {review.helpfulCount} found this helpful
        </p>
      )}

      {review.response && (
        <div className="mt-3 rounded-lg border-l-2 border-primary bg-white p-3 dark:bg-card">
          <p className="text-xs font-semibold text-primary">Response from builder</p>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
            {review.response}
          </p>
        </div>
      )}
    </li>
  )
}
