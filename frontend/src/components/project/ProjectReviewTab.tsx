import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Star } from 'lucide-react'
import { reviewApi, getApiErrorMessage } from '@/services/api'
import { formatDate } from '@/lib/formatters'
import type { ProjectReviewCheck, Review } from '@/types'

interface ProjectReviewTabProps {
  projectId: number
  builderName?: string
  /** Result of GET /v1/projects/{id}/review/me — undefined while loading. */
  reviewCheck?: ProjectReviewCheck
  /** Called after a successful submit so the parent can invalidate its caches. */
  onSubmitted: () => void
}

/** Read-only display of the client's already-submitted review (stars + comment). */
function SubmittedProjectReview({ review }: { review: Review }) {
  const overall = review.overallRating ?? review.rating ?? 0
  const subRatings = [
    { label: 'Quality of Work', value: review.qualityRating },
    { label: 'Communication', value: review.communicationRating },
    { label: 'Timeliness', value: review.timelinessRating },
  ].filter((r): r is { label: string; value: number } => !!r.value)

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-lg dark:text-white">Your review</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Submitted {formatDate(review.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-7 w-7 ${star <= overall ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
            fill={star <= overall ? 'currentColor' : 'none'}
          />
        ))}
        <span className="ml-2 font-semibold dark:text-white">{overall}.0</span>
      </div>

      {subRatings.length > 0 && (
        <div className="space-y-2">
          {subRatings.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span className="w-36 text-gray-500 dark:text-gray-400">{label}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= value ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                    fill={star <= value ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {review.comment && (
        <p className="whitespace-pre-line rounded-lg border bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-300">
          {review.comment}
        </p>
      )}
    </div>
  )
}

/**
 * "Leave Review" tab body for a completed project: shows the submitted review read-only when
 * the client has already reviewed, otherwise the star-rating form.
 */
export function ProjectReviewTab({
  projectId,
  builderName,
  reviewCheck,
  onSubmitted,
}: ProjectReviewTabProps) {
  const [review, setReview] = useState({
    overallRating: 0,
    qualityRating: 0,
    communicationRating: 0,
    timelinessRating: 0,
    comment: '',
  })

  const submitReviewMutation = useMutation({
    mutationFn: () =>
      reviewApi.createReview(projectId, {
        overallRating: review.overallRating,
        qualityRating: review.qualityRating || undefined,
        communicationRating: review.communicationRating || undefined,
        timelinessRating: review.timelinessRating || undefined,
        comment: review.comment || undefined,
      }),
    onSuccess: () => {
      toast.success('Review submitted!')
      onSubmitted()
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Failed to submit review')),
  })

  if (reviewCheck?.hasReviewed && reviewCheck.review) {
    return (
      <div className="max-w-xl">
        <SubmittedProjectReview review={reviewCheck.review} />
      </div>
    )
  }

  if (submitReviewMutation.isSuccess) {
    return (
      <div className="max-w-xl">
        <div className="text-center py-10">
          <div className="text-green-500 text-5xl mb-3">★</div>
          <h3 className="font-semibold text-lg mb-1 dark:text-white">Review Submitted!</h3>
          <p className="text-gray-500 dark:text-gray-400">Thank you for rating your builder.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!review.overallRating) {
            toast.error('Please select an overall rating')
            return
          }
          submitReviewMutation.mutate()
        }}
        className="space-y-5"
      >
        <h3 className="font-semibold text-lg dark:text-white">
          Rate {builderName || 'your builder'}
        </h3>

        {[
          { key: 'overallRating', label: 'Overall Rating *' },
          { key: 'qualityRating', label: 'Quality of Work' },
          { key: 'communicationRating', label: 'Communication' },
          { key: 'timelinessRating', label: 'Timeliness' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReview({ ...review, [key]: star })}
                  className={`text-2xl transition-colors ${
                    star <= (review[key as keyof typeof review] as number)
                      ? 'text-yellow-400'
                      : 'text-gray-300 hover:text-yellow-300'
                  }`}
                >
                  <Star className="h-7 w-7" fill={star <= (review[key as keyof typeof review] as number) ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment</label>
          <textarea
            value={review.comment}
            onChange={(e) => setReview({ ...review, comment: e.target.value })}
            rows={4}
            placeholder="Share your experience with this builder..."
            className="w-full px-4 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={submitReviewMutation.isPending}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  )
}
