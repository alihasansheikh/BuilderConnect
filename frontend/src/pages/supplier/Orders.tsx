import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Package, Search } from 'lucide-react'
import { materialOrderApi } from '@/services/api'
import { PaymentPill } from '@/components/marketplace/PaymentPill'
import DataTable from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCurrency, formatDate, formatStatus } from '@/lib/formatters'
import type { MaterialOrder } from '@/types'

const PAGE_SIZE = 10

const ORDER_STATUSES = [
  'DRAFT',
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_DELIVERY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PARTIALLY_DELIVERED',
  'CANCELLED',
  'RETURNED',
]

const PAYMENT_STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'REFUNDED']

const filterFieldClasses =
  'rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'

export default function SupplierOrders() {
  const navigate = useNavigate()
  // Deep links (e.g. the dashboard "Unpaid COD" card) pre-set filters via query params.
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '')
  const [paymentStatus, setPaymentStatus] = useState(() => searchParams.get('paymentStatus') ?? '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const debouncedSearch = useDebounce(search, 400)

  const hasFilters = Boolean(search || status || paymentStatus || from || to)

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-orders', { status, paymentStatus, search: debouncedSearch, from, to, page }],
    queryFn: () =>
      materialOrderApi
        .getSupplierOrders({
          status: status || undefined,
          paymentStatus: paymentStatus || undefined,
          search: debouncedSearch || undefined,
          dateFrom: from || undefined,
          dateTo: to || undefined,
          page,
          size: PAGE_SIZE,
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const orders = data?.content ?? []

  function clearFilters() {
    setSearch('')
    setStatus('')
    setPaymentStatus('')
    setFrom('')
    setTo('')
    setPage(0)
  }

  const columns = useMemo<ColumnDef<MaterialOrder, unknown>[]>(
    () => [
      {
        id: 'orderNumber',
        header: 'Order #',
        accessorFn: (row) => row.orderNumber,
        cell: ({ row }) => (
          <span className="font-semibold text-gray-900 dark:text-white">
            {row.original.orderNumber}
          </span>
        ),
      },
      {
        id: 'buyer',
        header: 'Buyer',
        accessorFn: (row) => row.orderedByName ?? '',
        cell: ({ row }) => row.original.orderedByName || `Buyer #${row.original.orderedById}`,
      },
      {
        id: 'date',
        header: 'Date',
        accessorFn: (row) => row.createdAt,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: 'items',
        header: 'Items',
        enableSorting: false,
        cell: ({ row }) => row.original.itemCount ?? '-',
      },
      {
        id: 'total',
        header: 'Total',
        accessorFn: (row) => row.totalAmount,
        cell: ({ row }) => (
          <span className="font-medium text-gray-900 dark:text-gray-200">
            {formatCurrency(row.original.totalAmount)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => row.status,
        cell: ({ row }) => <StatusBadge status={row.original.status} domain="order" />,
      },
      {
        id: 'payment',
        header: 'Payment',
        accessorFn: (row) => row.paymentStatus,
        cell: ({ row }) => <PaymentPill paymentStatus={row.original.paymentStatus} />,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Material Orders</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Manage incoming orders, confirm requests, and track deliveries
        </p>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl bg-white p-4 shadow-card dark:bg-card">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="order-search" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="order-search"
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                placeholder="Order # or buyer name..."
                className={`${filterFieldClasses} w-full pl-9`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="order-status-filter" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Status
            </label>
            <select
              id="order-status-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(0)
              }}
              className={filterFieldClasses}
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {formatStatus(value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="order-payment-filter" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              Payment
            </label>
            <select
              id="order-payment-filter"
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value)
                setPage(0)
              }}
              className={filterFieldClasses}
            >
              <option value="">All payments</option>
              {PAYMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {formatStatus(value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="order-date-from" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              From
            </label>
            <input
              id="order-date-from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setPage(0)
              }}
              className={filterFieldClasses}
            />
          </div>
          <div>
            <label htmlFor="order-date-to" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              To
            </label>
            <input
              id="order-date-to"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setPage(0)
              }}
              className={filterFieldClasses}
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Orders table */}
      {!isLoading && orders.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-card dark:bg-card">
          <EmptyState
            icon={<Package className="h-12 w-12 text-gray-300 dark:text-gray-600" />}
            title={hasFilters ? 'No orders match your filters' : 'No orders yet'}
            description={
              hasFilters
                ? 'Try adjusting the search, status, or date filters.'
                : 'Orders will appear here once buyers place them on your materials.'
            }
          />
        </div>
      ) : (
        <>
          <DataTable<MaterialOrder>
            data={orders}
            columns={columns}
            isLoading={isLoading}
            pageSize={PAGE_SIZE}
            onRowClick={(row) => navigate(`/supplier/orders/${row.id}`)}
          />
          <Pagination
            page={page}
            totalPages={data?.totalPages ?? 0}
            onPageChange={setPage}
            className="pt-2"
          />
        </>
      )}
    </div>
  )
}
