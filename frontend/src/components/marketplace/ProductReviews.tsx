import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import { toast } from 'sonner'
import { ModalShell } from '@/components/ui/ModalShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import {
  DEFAULT_REVIEW_SORT,
  REVIEW_RATING_BOUNDS,
  ReviewListControls,
  type ReviewRatingFilter,
} from '@/components/reviews/ReviewListControls'
import { Stars, reviewRating } from '@/components/profile/ReviewsSection'
import { useAuth } from '@/contexts/AuthContext'
import { getApiErrorMessage, reviewApi } from '@/services/api'
import { FIELD_CLASSES, LABEL_CLASSES } from '@/lib/form-styles'
import { formatRelativeTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { CreateMaterialReviewRequest, Material, Review } from '@/types'

interface ProductReviewsProps {
  material: Material
}

/**
 * Product reviews panel for the marketplace detail page: average header, review list,
 * and a write modal. Any signed-in user may review, except the product's own supplier
 * and users who already reviewed it (the server enforces both; the UI just hides the button).
 */
export function ProductReviews({ material }: ProductReviewsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [writeOpen, setWriteOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [sort, setSort] = useState(DEFAULT_REVIEW_SORT)
  const [ratingFilter, setRatingFilter] = useState<ReviewRatingFilter>('ALL')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['material-reviews', material.id, sort, ratingFilter, page],
    queryFn: () =>
      reviewApi
        .getMaterialReviews(material.id, {
          page,
          size: 10,
          sort,
          ...REVIEW_RATING_BOUNDS[ratingFilter],
        })
        .then((r) => r.data),
  })

  const { data: myReviewCheck } = useQuery({
    queryKey: ['material-review-me', material.id],
    queryFn: () => reviewApi.getMyMaterialReview(material.id).then((r) => r.data),
    enabled: !!user,
  })

  const { data: myVotes = [] } = useQuery({
    queryKey: ['review-my-votes', material.id],
    queryFn: () => reviewApi.getMyVotes(material.id).then((r) => r.data),
    enabled: !!user,
  })

  const voteMutation = useMutation({
    mutationFn: ({ reviewId, helpful }: { reviewId: number; helpful: boolean }) =>
      reviewApi.voteHelpful(reviewId, helpful),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-reviews', material.id] })
      queryClient.invalidateQueries({ queryKey: ['review-my-votes', material.id] })
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Could not record your vote'))
    },
  })

  const reviews = data?.content ?? []
  const total = material.totalReviews ?? data?.totalElements ?? reviews.length
  const computedAverage = reviews.length
    ? reviews.reduce((sum, review) => sum + reviewRating(review), 0) / reviews.length
    : 0
  const average = material.averageRating ?? computedAverage

  const canWrite = !!user && (myReviewCheck?.canReview ?? false)

  const resetForm = () => {
    setRating(0)
    setTitle('')
    setComment('')
  }

  const createReview = useMutation({
    mutationFn: (payload: CreateMaterialReviewRequest) =>
      reviewApi.createMaterialReview(material.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-reviews', material.id] })
      queryClient.invalidateQueries({ queryKey: ['material-review-me', material.id] })
      queryClient.invalidateQueries({ queryKey: ['material', material.id] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['builder-reviews'] })
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      toast.success('Review posted')
      setWriteOpen(false)
      resetForm()
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Could not post your review'))
    },
  })

  const handleSubmit = () => {
    if (rating < 1 || !comment.trim()) return
    createReview.mutate({
      overallRating: rating,
      ...(title.trim() ? { title: title.trim() } : {}),
      comment: comment.trim(),
    })
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
        {canWrite && (
          <button
            type="button"
            onClick={() => setWriteOpen(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Write a review
          </button>
        )}
      </div>

      {(total > 0 || ratingFilter !== 'ALL') && (
        <ReviewListControls
          className="mb-5"
          sort={sort}
          onSortChange={(value) => {
            setSort(value)
            setPage(0)
          }}
          rating={ratingFilter}
          onRatingChange={(value) => {
            setRatingFilter(value)
            setPage(0)
          }}
        />
      )}

      {isLoading ? (
        <div className="py-10">
          <LoadingSpinner label="Loading reviews..." />
        </div>
      ) : reviews.length === 0 ? (
        ratingFilter !== 'ALL' ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No reviews match this filter.
          </p>
        ) : (
          <EmptyState
            icon={<Star className="h-10 w-10 text-gray-400" />}
            title="No reviews yet"
            description="Be the first to review this product."
          />
        )
      ) : (
        <>
          <ul className="space-y-4">
            {reviews.map((review) => (
              <ProductReviewCard
                key={review.id}
                review={review}
                signedIn={!!user}
                isOwnReview={!!user && review.reviewerId === user.id}
                myVote={myVotes.find((v) => v.reviewId === review.id)?.helpful ?? null}
                isVoting={voteMutation.isPending}
                onVote={(helpful) => voteMutation.mutate({ reviewId: review.id, helpful })}
              />
            ))}
          </ul>
          <Pagination
            className="mt-6"
            page={page}
            totalPages={data?.totalPages ?? 0}
            onPageChange={setPage}
          />
        </>
      )}

      <ModalShell
        open={writeOpen}
        onOpenChange={(open) => {
          setWriteOpen(open)
          if (!open) resetForm()
        }}
        title={`Review ${material.name}`}
        description="Share your experience with this product."
        closeDisabled={createReview.isPending}
        footer={
          <>
            <button
              type="button"
              onClick={() => setWriteOpen(false)}
              disabled={createReview.isPending}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={rating < 1 || !comment.trim() || createReview.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createReview.isPending ? 'Posting...' : 'Post review'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Your rating</p>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating out of 5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} star${value > 1 ? 's' : ''}`}
                  onClick={() => setRating(value)}
                  className="p-0.5"
                >
                  <Star
                    className={cn(
                      'h-7 w-7 transition-colors',
                      value <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300 hover:text-amber-300 dark:text-gray-600'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="review-title"
              className={LABEL_CLASSES}
            >
              Title (optional)
            </label>
            <input
              id="review-title"
              type="text"
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum it up in a few words"
              className={FIELD_CLASSES}
            />
          </div>

          <div>
            <label
              htmlFor="review-comment"
              className={LABEL_CLASSES}
            >
              Review
            </label>
            <textarea
              id="review-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the quality, delivery and value?"
              className={FIELD_CLASSES}
            />
          </div>
        </div>
      </ModalShell>
    </section>
  )
}

interface ProductReviewCardProps {
  review: Review
  signedIn: boolean
  isOwnReview: boolean
  /** true = I voted helpful, false = not helpful, null = no vote. */
  myVote: boolean | null
  isVoting: boolean
  onVote: (helpful: boolean) => void
}

/** Single review row — mirrors the ReviewsSection card style, kept self-contained. */
function ProductReviewCard({
  review,
  signedIn,
  isOwnReview,
  myVote,
  isVoting,
  onVote,
}: ProductReviewCardProps) {
  const reviewer = review.reviewerName?.trim() || 'Anonymous'
  const helpfulCount = review.helpfulCount ?? 0
  const notHelpfulCount = review.notHelpfulCount ?? 0
  const verifiedPurchase = review.reviewType === 'MATERIAL_REVIEW' && !!review.isVerifiedPurchase

  return (
    <li className="rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
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
          {verifiedPurchase && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-green-700/80 dark:text-green-400/80">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified purchase
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Stars rating={reviewRating(review)} />
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(review.createdAt)}
          </span>
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

      {!isOwnReview &&
        (signedIn ? (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onVote(true)}
              disabled={isVoting}
              aria-pressed={myVote === true}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                myVote === true ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              )}
            >
              <ThumbsUp className={cn('h-3.5 w-3.5', myVote === true && 'fill-current')} />
              Helpful ({helpfulCount})
            </button>
            <button
              type="button"
              onClick={() => onVote(false)}
              disabled={isVoting}
              aria-pressed={myVote === false}
              aria-label={`Not helpful (${notHelpfulCount})`}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                myVote === false ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              )}
            >
              <ThumbsDown className={cn('h-3.5 w-3.5', myVote === false && 'fill-current')} />
              ({notHelpfulCount})
            </button>
          </div>
        ) : (
          (helpfulCount > 0 || notHelpfulCount > 0) && (
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ThumbsUp className="h-3.5 w-3.5" />
                Helpful ({helpfulCount})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ThumbsDown className="h-3.5 w-3.5" />
                ({notHelpfulCount})
              </span>
            </div>
          )
        ))}
    </li>
  )
}
