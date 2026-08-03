import { cn } from '@/lib/utils'

export type ReviewRatingFilter = 'ALL' | 'GOOD' | 'NEUTRAL' | 'BAD'

/** Query params each rating bucket maps to (spread into the list request). */
export const REVIEW_RATING_BOUNDS: Record<
  ReviewRatingFilter,
  { minRating?: number; maxRating?: number }
> = {
  ALL: {},
  GOOD: { minRating: 4 },
  NEUTRAL: { minRating: 3, maxRating: 3 },
  BAD: { maxRating: 2 },
}

export const DEFAULT_REVIEW_SORT = 'createdAt,desc'

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest' },
  { value: 'createdAt,asc', label: 'Oldest' },
  { value: 'overallRating,desc', label: 'Highest rating' },
  { value: 'overallRating,asc', label: 'Lowest rating' },
  { value: 'helpfulCount,desc', label: 'Most helpful' },
]

const RATING_OPTIONS: { value: ReviewRatingFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'GOOD', label: 'Good (4-5)' },
  { value: 'NEUTRAL', label: 'Neutral (3)' },
  { value: 'BAD', label: 'Bad (1-2)' },
]

const SELECT_CLASSES =
  'px-3 py-2 border dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white'

interface ReviewListControlsProps {
  sort: string
  onSortChange: (sort: string) => void
  rating: ReviewRatingFilter
  onRatingChange: (rating: ReviewRatingFilter) => void
  className?: string
}

/** Sort + rating-bucket selects shared by every review list (product, profile, my reviews). */
export function ReviewListControls({
  sort,
  onSortChange,
  rating,
  onRatingChange,
  className,
}: ReviewListControlsProps) {
  return (
    <div className={cn('flex flex-wrap gap-4', className)}>
      <div>
        <label
          htmlFor="review-sort"
          className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
        >
          Sort
        </label>
        <select
          id="review-sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className={SELECT_CLASSES}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="review-rating-filter"
          className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
        >
          Rating
        </label>
        <select
          id="review-rating-filter"
          value={rating}
          onChange={(e) => onRatingChange(e.target.value as ReviewRatingFilter)}
          className={SELECT_CLASSES}
        >
          {RATING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
