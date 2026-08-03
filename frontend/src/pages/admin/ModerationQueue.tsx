import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi, getApiErrorMessage } from '@/services/api'
import type { Review } from '@/types'
import ReasonDialog from '@/components/ui/ReasonDialog'
import { Star, EyeOff, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'

type ModerationTab = 'APPROVED' | 'HIDDEN'

/** The moderation endpoint returns Map rows: the shared Review shape plus admin-only moderation notes. */
type ModerationReview = Review & { moderationNotes?: string }

const tabConfig: { key: ModerationTab; label: string; color: string }[] = [
  { key: 'APPROVED', label: 'All Reviews', color: 'text-green-600 border-green-600' },
  { key: 'HIDDEN', label: 'Hidden', color: 'text-gray-600 border-gray-600' },
]

const statusColors: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-800',
  HIDDEN: 'bg-gray-100 text-gray-800',
}

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'CLIENT_TO_BUILDER', label: 'Builder reviews' },
  { value: 'MATERIAL_REVIEW', label: 'Product reviews' },
]

const RATING_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'GOOD', label: 'Good (4-5)' },
  { value: 'NEUTRAL', label: 'Neutral (3)' },
  { value: 'BAD', label: 'Bad (1-2)' },
]

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest' },
  { value: 'createdAt,asc', label: 'Oldest' },
  { value: 'overallRating,desc', label: 'Highest rating' },
  { value: 'overallRating,asc', label: 'Lowest rating' },
]

const ratingBounds: Record<string, { minRating?: number; maxRating?: number }> = {
  GOOD: { minRating: 4 },
  NEUTRAL: { minRating: 3, maxRating: 3 },
  BAD: { maxRating: 2 },
}

export default function ModerationQueue() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ModerationTab>('APPROVED')
  const [page, setPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [ratingFilter, setRatingFilter] = useState('ALL')
  const [sort, setSort] = useState('createdAt,desc')
  const [hidingId, setHidingId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['moderation-queue', activeTab, typeFilter, ratingFilter, sort, page],
    queryFn: () => adminApi.getModerationQueue({
      status: activeTab,
      page,
      size: 10,
      sort,
      ...(typeFilter !== 'ALL' && { reviewType: typeFilter }),
      ...ratingBounds[ratingFilter],
    }).then(r => r.data),
  })

  const moderateMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: number; action: 'HIDE' | 'RESTORE'; notes?: string }) =>
      adminApi.moderateReview(id, action, notes),
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'HIDE' ? 'Review hidden' : 'Review restored')
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to moderate review')),
  })

  const reviews: ModerationReview[] = (data?.content || []) as ModerationReview[]
  const totalPages = data?.totalPages || 0

  const handleHideConfirm = (notes: string) => {
    if (hidingId !== null) {
      moderateMutation.mutate({ id: hidingId, action: 'HIDE', notes })
      setHidingId(null)
    }
  }

  const handleRestore = (id: number) => {
    moderateMutation.mutate({ id, action: 'RESTORE' })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div>
      <ReasonDialog
        isOpen={hidingId !== null}
        title="Hide Review"
        placeholder="Reason for hiding this review..."
        onConfirm={handleHideConfirm}
        onCancel={() => setHidingId(null)}
      />
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Review Moderation</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Reviews publish instantly. Hide abusive or fake reviews here — ratings recompute automatically.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card mb-6">
        <div className="border-b dark:border-gray-700">
          <nav className="flex -mb-px">
            {tabConfig.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setPage(0) }}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab.key
                    ? tab.color
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b dark:border-gray-700">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(0) }}
                className="px-3 py-2 border dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rating</label>
              <select
                value={ratingFilter}
                onChange={(e) => { setRatingFilter(e.target.value); setPage(0) }}
                className="px-3 py-2 border dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              >
                {RATING_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sort</label>
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(0) }}
                className="px-3 py-2 border dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>{activeTab === 'HIDDEN' ? 'No hidden reviews.' : 'No published reviews yet.'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {renderStars(review.overallRating ?? review.rating)}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[review.status] || 'bg-gray-100 text-gray-800'}`}>
                          {review.status}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {review.reviewType?.replace(/_/g, ' ')}
                        </span>
                        {review.materialName && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Product: {review.materialName}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span className="font-medium dark:text-gray-300">{review.reviewerName || 'Anonymous'}</span>
                        {' reviewed '}
                        <span className="font-medium dark:text-gray-300">{review.revieweeName || 'Unknown'}</span>
                      </div>
                      {review.title && (
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                          {review.title}
                        </p>
                      )}
                      {review.comment && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-2">
                          "{review.comment}"
                        </p>
                      )}
                      {review.moderationNotes && (
                        <p className="text-xs text-red-600 mt-1">
                          Moderation notes: {review.moderationNotes}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {review.createdAt ? formatDate(review.createdAt) : ''}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      {review.status === 'HIDDEN' ? (
                        <button
                          onClick={() => handleRestore(review.id)}
                          disabled={moderateMutation.isPending}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          <RotateCcw className="h-4 w-4" /> Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => setHidingId(review.id)}
                          disabled={moderateMutation.isPending}
                          className="flex items-center gap-1 border border-red-600 text-red-600 px-3 py-1.5 rounded-md text-sm hover:bg-red-50 disabled:opacity-50"
                        >
                          <EyeOff className="h-4 w-4" /> Hide
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
