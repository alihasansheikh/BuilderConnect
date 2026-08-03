// Status color maps for badge/pill styling across the application.
// Each value includes both light and dark mode Tailwind classes.
//
// Type references (from @/types):
//   ProjectStatus, BidStatus, MilestoneStatus, ContractStatus
//
// Using Record<string, string> intentionally so API string values
// can be looked up without casting.

// ─── Project Status ──────────────────────────────────────────────────────────

export const projectStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  OPEN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  BIDDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  AWARDED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  CONTRACT_PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ON_HOLD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DISPUTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

// ─── Bid Status ──────────────────────────────────────────────────────────────

export const bidStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  SHORTLISTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  WITHDRAWN: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

// ─── Milestone Status ────────────────────────────────────────────────────────

export const milestoneStatusColors: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  COMPLETED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  UNDER_REVIEW: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  PAYMENT_RELEASED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  // Direct-payment model: client-paid (amber, awaiting builder confirmation) → builder-confirmed (green).
  PAID: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  DISPUTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

// ─── Contract Status ─────────────────────────────────────────────────────────

export const contractStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  PENDING_CLIENT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  PENDING_BUILDER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  TERMINATED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  DISPUTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

// ─── Material Order Status ───────────────────────────────────────────────────

export const orderStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  PENDING_CONFIRMATION: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PROCESSING: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  READY_FOR_DELIVERY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PARTIALLY_DELIVERED: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  RETURNED: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
}

// ─── Delivery Status ─────────────────────────────────────────────────────────

export const deliveryStatusColors: Record<string, string> = {
  PREPARING: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  DISPATCHED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  IN_TRANSIT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  FAILED_DELIVERY: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  RETURNED: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
}

// ─── Support Ticket Status ───────────────────────────────────────────────────

export const ticketStatusColors: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  WAITING_CUSTOMER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  WAITING_INTERNAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  REOPENED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

// ─── Dispute Status ──────────────────────────────────────────────────────────

export const disputeStatusColors: Record<string, string> = {
  FILED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  MEDIATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  AWAITING_RESPONSE: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ESCALATED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

// ─── Universal lookup ────────────────────────────────────────────────────────

const allMaps = [
  projectStatusColors,
  bidStatusColors,
  milestoneStatusColors,
  contractStatusColors,
  orderStatusColors,
  deliveryStatusColors,
  ticketStatusColors,
  disputeStatusColors,
]

const domainMap: Record<string, Record<string, string>> = {
  project: projectStatusColors,
  bid: bidStatusColors,
  milestone: milestoneStatusColors,
  contract: contractStatusColors,
  order: orderStatusColors,
  delivery: deliveryStatusColors,
  ticket: ticketStatusColors,
  dispute: disputeStatusColors,
}

/**
 * Look up color classes for a status string.
 *
 * If `domain` is provided (e.g. "project", "bid"), only that map is checked.
 * Otherwise every map is searched in order and the first match wins.
 * Returns a neutral gray fallback when the status is not found.
 */
export function getStatusColor(status: string, domain?: string): string {
  const fallback = 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'

  if (domain) {
    const map = domainMap[domain]
    return map?.[status] ?? fallback
  }

  for (const map of allMaps) {
    if (status in map) return map[status]
  }

  return fallback
}
