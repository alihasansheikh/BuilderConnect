import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { Package, Search, Store } from 'lucide-react'
import { materialOrderApi } from '@/services/api'
import { PaymentPill } from '@/components/marketplace/PaymentPill'
import { useMarketBase } from '@/components/marketplace/marketplace-utils'
import DataTable from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCurrency, formatDate, formatStatus } from '@/lib/formatters'
import type { MaterialOrder, MaterialOrderStatus } from '@/types'

const PAGE_SIZE = 10

const ORDER_STATUSES: MaterialOrderStatus[] = [
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

export default function MyOrders() {
  const base = useMarketBase()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useQuery({
    queryKey: ['my-material-orders', status, debouncedSearch, page],
    queryFn: () =>
      materialOrderApi
        .getMyOrders({
          status: status || undefined,
          search: debouncedSearch || undefined,
          page,
          size: PAGE_SIZE,
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const orders = data?.content ?? []

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
        id: 'supplier',
        header: 'Supplier',
        accessorFn: (row) => row.supplierName ?? '',
        cell: ({ row }) => row.original.supplierName || `Supplier #${row.original.supplierId}`,
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">My Orders</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Material orders you have placed — Cash on Delivery
          </p>
        </div>
        <Link
          to={`${base}/products`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary/50 hover:text-primary dark:border-gray-600 dark:bg-card dark:text-gray-300 dark:hover:text-primary"
        >
          <Store className="h-4 w-4" />
          Browse products
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Order # or supplier name..."
            aria-label="Search orders"
            className="w-full rounded-lg border py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <label htmlFor="order-status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Status
        </label>
        <select
          id="order-status-filter"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(0)
          }}
          className="rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {formatStatus(value)}
            </option>
          ))}
        </select>
      </div>

      {!isLoading && orders.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-card dark:bg-card">
          <EmptyState
            icon={<Package className="h-10 w-10 text-gray-400" />}
            title={status || search ? 'No orders match your filters' : 'No orders yet'}
            description={
              status || search
                ? 'Try a different search or status filter, or browse the marketplace to place an order.'
                : 'Browse the product marketplace and place your first material order.'
            }
            action={{ label: 'Browse products', to: `${base}/products` }}
          />
        </div>
      ) : (
        <>
          <DataTable<MaterialOrder>
            data={orders}
            columns={columns}
            isLoading={isLoading}
            pageSize={PAGE_SIZE}
            onRowClick={(row) => navigate(`${base}/orders/${row.id}`)}
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
