import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className={cn(
          'px-4 py-2 border rounded-lg text-sm font-medium transition-colors',
          'border-gray-300 dark:border-gray-600',
          'text-gray-700 dark:text-gray-200',
          'hover:bg-gray-50 dark:hover:bg-gray-700',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent'
        )}
      >
        Previous
      </button>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        Page {page + 1} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className={cn(
          'px-4 py-2 border rounded-lg text-sm font-medium transition-colors',
          'border-gray-300 dark:border-gray-600',
          'text-gray-700 dark:text-gray-200',
          'hover:bg-gray-50 dark:hover:bg-gray-700',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent'
        )}
      >
        Next
      </button>
    </div>
  )
}
