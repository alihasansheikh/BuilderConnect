/**
 * Format a number as PKR currency.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return 'Rs 0'
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Render a project budget range. Tolerant of "open to quotes" projects, which have no
 * budgetMin/budgetMax (null/undefined) — those show "Open to quotes" instead of "RsNaN".
 */
export function formatBudgetRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min == null && max == null) return 'Open to quotes'
  if (min != null && max != null) return `${formatCurrency(min)} - ${formatCurrency(max)}`
  return formatCurrency(min ?? max)
}

/**
 * Format an ISO date string into a human-readable date.
 */
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const defaults: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
  return new Date(dateString).toLocaleDateString('en-PK', options || defaults)
}

/**
 * Format a date string as a relative time (e.g. "2 hours ago", "3 days ago").
 */
export function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 4) return `${weeks}w ago`
  return `${months}mo ago`
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Text-color classes for a deadline: red when past, amber inside a week, neutral otherwise.
 * Overdue and imminent dates shouldn't read like ordinary metadata.
 */
export function deadlineClasses(deadline: string): string {
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / MS_PER_DAY)
  if (daysLeft < 0) return 'text-red-600 dark:text-red-400'
  if (daysLeft <= 7) return 'text-amber-600 dark:text-amber-400'
  return 'text-gray-900 dark:text-gray-200'
}

/**
 * Format a status enum string for display (e.g. "IN_PROGRESS" -> "In Progress").
 */
export function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
