import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, Package, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage, materialOrderApi } from '@/services/api'
import { OrderItemsTable } from '@/components/marketplace/OrderItemsTable'
import { OrderStatusStepper } from '@/components/marketplace/OrderStatusStepper'
import { PaymentPill } from '@/components/marketplace/PaymentPill'
import { DeliveryForm } from '@/components/supplier/DeliveryForm'
import {
  DECLINABLE_STATUSES,
  NEXT_DELIVERY_STATUS,
  NEXT_ORDER_STATUS,
} from '@/components/supplier/order-transitions'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import ReasonDialog from '@/components/ui/ReasonDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, formatStatus } from '@/lib/formatters'
import type { DeliveryRecord, MaterialOrder } from '@/types'

/** Invalidate every cache a supplier order mutation can affect. */
function invalidateOrderQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['supplier-orders'] })
  queryClient.invalidateQueries({ queryKey: ['material-order'] })
  queryClient.invalidateQueries({ queryKey: ['my-material-orders'] })
  queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
}

/** Label/value line in the delivery info card; hidden when the value is empty. */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '') return null
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-200">
        {children}
      </dd>
    </div>
  )
}

/** One delivery run row with a forward-only status advance select. */
function DeliveryRow({ delivery }: { delivery: DeliveryRecord }) {
  const queryClient = useQueryClient()

  const statusMutation = useMutation({
    mutationFn: (status: string) => materialOrderApi.updateDeliveryStatus(delivery.id, status),
    onSuccess: (_, status) => {
      toast.success(`Delivery marked ${formatStatus(status)}`)
      invalidateOrderQueries(queryClient)
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Failed to update delivery status')),
  })

  const nextOptions = NEXT_DELIVERY_STATUS[delivery.status] ?? []
  const details = [
    delivery.driverName &&
      `Driver: ${delivery.driverName}${delivery.driverPhone ? ` (${delivery.driverPhone})` : ''}`,
    delivery.trackingNumber && `Tracking: ${delivery.trackingNumber}`,
    delivery.estimatedDelivery && `ETA: ${formatDate(delivery.estimatedDelivery)}`,
  ].filter(Boolean)

  return (
    <li className="rounded-lg border p-4 dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
          <Truck className="h-4 w-4 text-primary" />
          {delivery.deliveryNumber}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatStatus(delivery.deliveryMethod)}
          </span>
          <StatusBadge status={delivery.status} domain="delivery" />
          {nextOptions.length > 0 && (
            <select
              value=""
              disabled={statusMutation.isPending}
              onChange={(e) => {
                if (e.target.value) statusMutation.mutate(e.target.value)
              }}
              className="rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Advance...</option>
              {nextOptions.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {details.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{details.join(' · ')}</p>
      )}
    </li>
  )
}

export default function SupplierOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const orderId = Number(id)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [showDeliveryForm, setShowDeliveryForm] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['material-order', orderId],
    enabled: Number.isFinite(orderId),
    queryFn: () => materialOrderApi.getOrder(orderId).then((r) => r.data as MaterialOrder),
  })

  const confirmMutation = useMutation({
    mutationFn: () => materialOrderApi.confirm(orderId),
    onSuccess: () => {
      toast.success('Order confirmed')
      invalidateOrderQueries(queryClient)
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to confirm order')),
  })

  const declineMutation = useMutation({
    mutationFn: (reason: string) => materialOrderApi.decline(orderId, reason),
    onSuccess: () => {
      toast.success('Order declined — stock has been restored')
      invalidateOrderQueries(queryClient)
      // Stock is restored server-side, so buyer-facing product caches are stale too.
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['material'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-catalog'] })
      setShowDeclineDialog(false)
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Failed to decline order'))
      setShowDeclineDialog(false)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => materialOrderApi.updateStatus(orderId, status),
    onSuccess: (_, status) => {
      toast.success(`Order status updated to ${formatStatus(status)}`)
      invalidateOrderQueries(queryClient)
      setSelectedStatus('')
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to update order status')),
  })

  const markPaidMutation = useMutation({
    mutationFn: () => materialOrderApi.markPaid(orderId),
    onSuccess: () => {
      toast.success('Payment marked as received')
      invalidateOrderQueries(queryClient)
    },
    onError: (err: unknown) => toast.error(getApiErrorMessage(err, 'Failed to mark payment received')),
  })

  if (isLoading) {
    return <LoadingSpinner fullPage label="Loading order..." />
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl bg-white shadow-card dark:bg-card">
        <EmptyState
          icon={<Package className="h-12 w-12 text-gray-300 dark:text-gray-600" />}
          title="Order not found"
          description="This order may have been removed, or you do not have access to it."
          action={{ label: 'Back to orders', to: '/supplier/orders' }}
        />
      </div>
    )
  }

  const deliveries = order.deliveries ?? []
  const canConfirm = order.status === 'PENDING_CONFIRMATION'
  const canDecline = DECLINABLE_STATUSES.includes(order.status)
  // Failed-delivery escape hatch (mirrors the backend): an in-flight order can be
  // cancelled only once every delivery run has failed or been returned.
  const canCancelFailedDelivery =
    ['OUT_FOR_DELIVERY', 'PARTIALLY_DELIVERED'].includes(order.status) &&
    deliveries.every((d) => d.status === 'FAILED_DELIVERY' || d.status === 'RETURNED')
  const nextStatuses = NEXT_ORDER_STATUS[order.status] ?? []
  const canCreateDelivery = ['CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY'].includes(order.status)
  const canMarkPaid = order.status === 'DELIVERED' && order.paymentStatus !== 'PAID'
  const hasActions =
    canConfirm ||
    canDecline ||
    canCancelFailedDelivery ||
    nextStatuses.length > 0 ||
    canCreateDelivery ||
    canMarkPaid

  return (
    <div className="space-y-6">
      <Link
        to="/supplier/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      {/* Header */}
      <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{order.orderNumber}</h1>
          <StatusBadge status={order.status} domain="order" size="md" />
          <PaymentPill paymentStatus={order.paymentStatus} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>Placed {formatDate(order.createdAt)}</span>
          {order.orderedByName && (
            <span>
              · Ordered by{' '}
              <Link to={`/profile/${order.orderedById}`} className="font-medium text-primary hover:underline">
                {order.orderedByName}
              </Link>
            </span>
          )}
          <span>
            ·{' '}
            {order.projectId == null
              ? `Standalone order · ${order.deliveryCity || 'City not specified'}`
              : order.projectTitle || `Project #${order.projectId}`}
          </span>
        </div>

        {order.status === 'CANCELLED' && order.cancellationReason && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                This order was cancelled
              </p>
              <p className="mt-0.5 text-sm text-red-600/90 dark:text-red-400/80">
                {order.cancellationReason}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <OrderStatusStepper status={order.status} />
        </div>
      </div>

      {/* Action bar */}
      {hasActions && (
        <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
          <h2 className="mb-4 text-lg font-semibold dark:text-white">Actions</h2>
          <div className="flex flex-wrap items-center gap-2">
            {canConfirm && (
              <button
                type="button"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="bg-green-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {confirmMutation.isPending ? 'Confirming...' : 'Confirm Order'}
              </button>
            )}

            {canDecline && (
              <button
                type="button"
                onClick={() => setShowDeclineDialog(true)}
                disabled={declineMutation.isPending}
                className="bg-red-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {declineMutation.isPending ? 'Declining...' : 'Decline'}
              </button>
            )}

            {canCancelFailedDelivery && (
              <button
                type="button"
                onClick={() => setShowDeclineDialog(true)}
                disabled={declineMutation.isPending}
                className="bg-red-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {declineMutation.isPending ? 'Cancelling...' : 'Cancel order (delivery failed)'}
              </button>
            )}

            {nextStatuses.length > 0 && (
              <div className="flex items-center gap-1">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Update Status...</option>
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
                {selectedStatus && (
                  <button
                    type="button"
                    onClick={() => updateStatusMutation.mutate(selectedStatus)}
                    disabled={updateStatusMutation.isPending}
                    className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {updateStatusMutation.isPending ? '...' : 'Apply'}
                  </button>
                )}
              </div>
            )}

            {canCreateDelivery && !showDeliveryForm && (
              <button
                type="button"
                onClick={() => setShowDeliveryForm(true)}
                className="px-4 py-1.5 border dark:border-gray-600 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                + Record delivery
              </button>
            )}

            {canMarkPaid && (
              <button
                type="button"
                onClick={() => markPaidMutation.mutate()}
                disabled={markPaidMutation.isPending}
                className="bg-emerald-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {markPaidMutation.isPending ? 'Saving...' : 'Mark payment received'}
              </button>
            )}
          </div>

          {showDeliveryForm && (
            <DeliveryForm orderId={order.id} onDone={() => setShowDeliveryForm(false)} />
          )}
        </div>
      )}

      {/* Items */}
      <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
        <h2 className="mb-4 text-lg font-semibold dark:text-white">Order items</h2>
        <OrderItemsTable
          items={order.items ?? []}
          subtotal={order.subtotal}
          taxAmount={order.taxAmount}
          deliveryFee={order.deliveryFee}
          totalAmount={order.totalAmount}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Delivery info */}
        <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
          <h2 className="mb-4 text-lg font-semibold dark:text-white">Delivery information</h2>
          <dl className="space-y-2.5">
            <InfoRow label="Address">{order.deliveryAddress}</InfoRow>
            <InfoRow label="City">{order.deliveryCity}</InfoRow>
            <InfoRow label="Contact name">{order.deliveryContactName}</InfoRow>
            <InfoRow label="Contact phone">{order.deliveryContactPhone}</InfoRow>
            <InfoRow label="Requested date">
              {order.deliveryDate ? formatDate(order.deliveryDate) : null}
            </InfoRow>
            <InfoRow label="Buyer notes">{order.notes}</InfoRow>
          </dl>
        </div>

        {/* Deliveries */}
        <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
          <h2 className="mb-4 text-lg font-semibold dark:text-white">Deliveries</h2>
          {deliveries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No deliveries recorded yet — use the action bar to record one once the order is
              confirmed.
            </p>
          ) : (
            <ul className="space-y-3">
              {deliveries.map((delivery) => (
                <DeliveryRow key={delivery.id} delivery={delivery} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <ReasonDialog
        isOpen={showDeclineDialog}
        title={
          canCancelFailedDelivery
            ? `Cancel order ${order.orderNumber}?`
            : `Decline order ${order.orderNumber}?`
        }
        placeholder={
          canCancelFailedDelivery
            ? 'Tell the buyer why the order is being cancelled (stock will be restored)...'
            : 'Tell the buyer why you are declining (stock will be restored)...'
        }
        onConfirm={(reason) => declineMutation.mutate(reason)}
        onCancel={() => setShowDeclineDialog(false)}
      />
    </div>
  )
}
