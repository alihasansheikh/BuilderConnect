import type { Milestone } from '@/types'

/**
 * Statuses that count as "done" for progress display. In the direct-payment model a milestone
 * is PAID once the client records payment and CONFIRMED once the builder acknowledges receipt.
 * The legacy escrow statuses are kept so any pre-migration data still counts.
 */
const COMPLETED_STATUSES: ReadonlySet<Milestone['status']> = new Set([
  'PAID',
  'CONFIRMED',
  'APPROVED',
  'PAYMENT_PENDING',
  'PAYMENT_RELEASED',
])

/** Milestones that are done (paid or confirmed) from the progress point of view. */
export function countCompletedMilestones(milestones: readonly Milestone[]): number {
  return milestones.filter((m) => COMPLETED_STATUSES.has(m.status)).length
}
