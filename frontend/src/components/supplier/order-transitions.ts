// State machines for supplier order/delivery actions (mirror the backend; illegal targets would 409).

/**
 * Statuses a supplier may advance an order to from its current status.
 * CANCELLED/RETURNED are deliberately absent — suppliers must use Decline.
 */
export const NEXT_ORDER_STATUS: Record<string, string[]> = {
  CONFIRMED: ['PROCESSING', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'],
  PROCESSING: ['READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY'],
  READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'PARTIALLY_DELIVERED'],
  PARTIALLY_DELIVERED: ['DELIVERED', 'OUT_FOR_DELIVERY'],
}

/** Forward-only delivery progression; FAILED_DELIVERY is reachable from any non-terminal state. */
export const NEXT_DELIVERY_STATUS: Record<string, string[]> = {
  PREPARING: ['DISPATCHED', 'FAILED_DELIVERY'],
  DISPATCHED: ['IN_TRANSIT', 'FAILED_DELIVERY'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'FAILED_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY'],
  FAILED_DELIVERY: ['DISPATCHED', 'RETURNED'],
}

/** Order statuses in which the supplier can still decline (stock is restored server-side). */
export const DECLINABLE_STATUSES = ['PENDING_CONFIRMATION', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY']
