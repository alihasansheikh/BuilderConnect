import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, BadgeCheck, LifeBuoy, Package, RotateCcw, Star, Truck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage, materialOrderApi, reviewApi } from '@/services/api'
import { OrderItemsTable } from '@/components/marketplace/OrderItemsTable'
import { OrderStatusStepper } from '@/components/marketplace/OrderStatusStepper'
import { PaymentPill } from '@/components/marketplace/PaymentPill'
import { useMarketBase } from '@/components/marketplace/marketplace-utils'
import type { ReorderState } from '@/components/marketplace/marketplace-utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import ReasonDialog from '@/components/ui/ReasonDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, formatStatus } from '@/lib/formatters'
import type { DeliveryRecord, MaterialOrder, MaterialOrderItem } from '@/types'

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

/** One delivery run row: number, status, method, and driver/tracking/ETA when present. */
function DeliveryRow({ delivery }: { delivery: DeliveryRecord }) {
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
        </div>
      </div>
      {details.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">{details.join(' · ')}</p>
      )}
    </li>
  )
}

/** Post-delivery CTA: one row per distinct ordered product, deep-linking to its review section. */
function ReviewProductsCard({ items, base }: { items: MaterialOrderItem[]; base: string }) {
  const products = items.filter(
    (item, index) => items.findIndex((i) => i.materialId === item.materialId) === index,
  )

  const checks = useQueries({
    queries: products.map((item) => ({
      queryKey: ['material-review-me', item.materialId],
      queryFn: () => reviewApi.getMyMaterialReview(item.materialId).then((r) => r.data),
    })),
  })

  if (products.length === 0) return null

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
      <h2 className="flex items-center gap-2 text-lg font-semibold dark:text-white">
        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
        Review your products
      </h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        Your order has been delivered — share your experience with other buyers.
      </p>
      <ul className="space-y-3">
        {products.map((item, index) => {
          const reviewed = checks[index]?.data?.hasReviewed ?? false
          return (
            <li
              key={item.materialId}
              className="flex items-center justify-between gap-4 rounded-lg border p-4 dark:border-gray-700"
            >
              <p className="min-w-0 truncate font-medium text-gray-900 dark:text-white">
                {item.materialName ?? `Product #${item.materialId}`}
              </p>
              {reviewed ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-400 dark:border-gray-700 dark:text-gray-500">
                  <BadgeCheck className="h-4 w-4" />
                  Reviewed
                </span>
              ) : (
                <Link
                  to={`${base}/products/${item.materialId}`}
                  className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Write a review
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const base = useMarketBase()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const orderId = Number(id)
  const [cancelOpen, setCancelOpen] = useState(false)

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['material-order', orderId],
    enabled: Number.isFinite(orderId),
    queryFn: () => materialOrderApi.getOrder(orderId).then((r) => r.data as MaterialOrder),
  })

  const cancelOrder = useMutation({
    mutationFn: (reason: string) => materialOrderApi.cancel(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-order'] })
      queryClient.invalidateQueries({ queryKey: ['my-material-orders'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['material'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] })
      toast.success('Order cancelled')
      setCancelOpen(false)
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Could not cancel this order'))
      setCancelOpen(false)
    },
  })

  if (isLoading) {
    return <LoadingSpinner fullPage label="Loading order..." />
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl bg-white shadow-card dark:bg-card">
        <EmptyState
          icon={<Package className="h-10 w-10 text-gray-400" />}
          title="Order not found"
          description="This order may have been removed, or you do not have access to it."
          action={{ label: 'Back to my orders', to: `${base}/orders` }}
        />
      </div>
    )
  }

  const cancellable = order.status === 'PENDING_CONFIRMATION'
  const deliveries = order.deliveries ?? []
  const reviewable = order.status === 'DELIVERED' || order.status === 'PARTIALLY_DELIVERED'
  const firstItem = order.items?.[0]

  const reorder = () => {
    if (!firstItem) return
    const state: ReorderState = {
      quantity: firstItem.quantity,
      deliveryAddress: order.deliveryAddress,
      city: order.deliveryCity,
      contactName: order.deliveryContactName,
      contactPhone: order.deliveryContactPhone,
    }
    navigate(`${base}/products/${firstItem.materialId}`, { state })
  }

  return (
    <div className="space-y-6">
      <Link
        to={`${base}/orders`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my orders
      </Link>

      {/* Header */}
      <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {order.orderNumber}
              </h1>
              <StatusBadge status={order.status} domain="order" size="md" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Placed {formatDate(order.createdAt)}
                {order.supplierName && <> · {order.supplierName}</>}
              </p>
              <PaymentPill paymentStatus={order.paymentStatus} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`${base}/support`, { state: { orderId } })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary/50 hover:text-primary dark:border-gray-600 dark:text-gray-300 dark:hover:text-primary"
            >
              <LifeBuoy className="h-4 w-4" />
              Report a problem
            </button>
            {firstItem && (
              <button
                type="button"
                onClick={reorder}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary/50 hover:text-primary dark:border-gray-600 dark:text-gray-300 dark:hover:text-primary"
              >
                <RotateCcw className="h-4 w-4" />
                Order again
              </button>
            )}
            {cancellable && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                disabled={cancelOrder.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <XCircle className="h-4 w-4" />
                {cancelOrder.isPending ? 'Cancelling...' : 'Cancel order'}
              </button>
            )}
          </div>
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

      {/* Post-delivery review CTA */}
      {reviewable && <ReviewProductsCard items={order.items ?? []} base={base} />}

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
            <InfoRow label="Instructions">{order.deliveryInstructions}</InfoRow>
            <InfoRow label="Notes">{order.notes}</InfoRow>
            <InfoRow label="Project">
              {order.projectId != null ? (
                <Link
                  to={`${base}/projects/${order.projectId}`}
                  className="font-medium text-primary hover:underline"
                >
                  {order.projectTitle || 'View project'}
                </Link>
              ) : null}
            </InfoRow>
          </dl>
        </div>

        {/* Deliveries */}
        <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
          <h2 className="mb-4 text-lg font-semibold dark:text-white">Deliveries</h2>
          {deliveries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No deliveries dispatched yet — the supplier will arrange delivery once your order is
              processed.
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
        isOpen={cancelOpen}
        title={`Cancel ${order.orderNumber}?`}
        placeholder="Why are you cancelling this order?"
        onConfirm={(reason) => cancelOrder.mutate(reason)}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  )
}
