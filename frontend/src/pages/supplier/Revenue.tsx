import { useState } from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DollarSign, Package, TrendingUp, Wallet } from 'lucide-react'
import { supplierApi } from '@/services/api'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Pagination } from '@/components/ui/Pagination'
import { StatCard } from '@/components/ui/StatCard'
import { StatCardSkeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { MaterialOrder } from '@/types'

const PAGE_SIZE = 20

/** MaterialOrder plus the paid_at timestamp set when payment is marked received. */
type PaidOrder = MaterialOrder & { paidAt?: string }

/** "2026-07" -> "Jul 2026" */
function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-')
  const parsed = new Date(Number(year), Number(monthPart) - 1, 1)
  if (Number.isNaN(parsed.getTime())) return month
  return parsed.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })
}

function paidDateOf(order: PaidOrder): string {
  return order.paidAt ?? order.updatedAt ?? order.createdAt
}

export default function SupplierRevenue() {
  const [page, setPage] = useState(0)

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['supplier-revenue'],
    queryFn: () => supplierApi.getRevenue().then((r) => r.data),
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['supplier-revenue-orders', page],
    queryFn: () => supplierApi.getRevenueOrders({ page, size: PAGE_SIZE }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const orders: PaidOrder[] = ordersData?.content ?? []
  const monthly = revenue?.monthly ?? []
  const maxMonthlyTotal = Math.max(...monthly.map((m) => m.total), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Revenue</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Income from your paid marketplace orders
        </p>
      </div>

      {/* Row 1 — Stat cards */}
      {revenueLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            title="Total revenue"
            value={formatCurrency(revenue?.totalRevenue ?? 0)}
            icon={<DollarSign className="h-5 w-5 text-white" />}
            colorClass="bg-emerald-500"
            className="animate-slide-up delay-100"
          />
          <StatCard
            title="Paid orders"
            value={revenue?.paidOrders ?? 0}
            icon={<Package className="h-5 w-5 text-white" />}
            colorClass="bg-blue-500"
            className="animate-slide-up delay-200"
          />
          <StatCard
            title="This month"
            value={formatCurrency(revenue?.thisMonthRevenue ?? 0)}
            icon={<TrendingUp className="h-5 w-5 text-white" />}
            colorClass="bg-purple-500"
            className="animate-slide-up delay-300"
          />
        </div>
      )}

      {/* Row 2 — Monthly revenue */}
      <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card animate-fade-in delay-300">
        <h2 className="mb-4 text-lg font-semibold dark:text-white">Monthly revenue</h2>
        {revenueLoading ? (
          <LoadingSpinner label="Loading revenue..." className="py-8" />
        ) : monthly.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-10 w-10 text-gray-400" />}
            title="No revenue yet"
            description="Monthly totals will appear here once orders are paid."
            className="py-6"
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Bar list */}
            <div className="space-y-3">
              {monthly.map((bucket) => (
                <div key={bucket.month}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatMonthLabel(bucket.month)}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-200">
                      {formatCurrency(bucket.total)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-2.5 rounded-full bg-primary transition-all"
                      style={{ width: `${(bucket.total / maxMonthlyTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Compact table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="px-3 py-2">Month</th>
                    <th className="px-3 py-2 text-right">Orders</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((bucket) => (
                    <tr
                      key={bucket.month}
                      className="border-b last:border-0 dark:border-gray-700"
                    >
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {formatMonthLabel(bucket.month)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                        {bucket.orders}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-200">
                        {formatCurrency(bucket.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Row 3 — Paid orders */}
      <div className="rounded-2xl bg-white shadow-card dark:bg-card animate-fade-in delay-400">
        <div className="border-b px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">Paid orders</h2>
        </div>
        {ordersLoading ? (
          <LoadingSpinner label="Loading paid orders..." className="py-10" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12 text-gray-300 dark:text-gray-600" />}
            title="No paid orders yet"
            description="Revenue appears when you mark a delivered order's payment as received."
            className="py-8"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="px-6 py-3">Order #</th>
                    <th className="px-6 py-3">Buyer</th>
                    <th className="px-6 py-3">City</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3">Paid date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-3">
                        <Link
                          to={'/supplier/orders/' + order.id}
                          className="font-semibold text-gray-900 hover:text-primary dark:text-white dark:hover:text-primary"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                        {order.orderedByName || `Buyer #${order.orderedById}`}
                      </td>
                      <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                        {order.deliveryCity || '-'}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-gray-200">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                        {formatDate(paidDateOf(order))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={ordersData?.totalPages ?? 0}
              onPageChange={setPage}
              className="py-4"
            />
          </>
        )}
      </div>
    </div>
  )
}
