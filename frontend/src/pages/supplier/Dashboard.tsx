import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supplierApi, materialOrderApi } from '@/services/api'
import { MaterialOrder } from '@/types'
import { formatCurrency, formatRelativeTime } from '@/lib/formatters'
import { StatCard } from '@/components/ui/StatCard'
import { StatCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Banknote,
  Package,
  ShoppingCart,
  Wallet,
  PackagePlus,
  MessageSquare,
  Settings,
  Store,
  Star,
  ShieldCheck,
  Clock,
  ClipboardList,
} from 'lucide-react'

export default function SupplierDashboard() {
  const { user } = useAuth()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['supplier-stats'],
    queryFn: () => supplierApi.getMyStats().then((r) => r.data),
  })

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['supplier-orders-pending'],
    queryFn: () =>
      materialOrderApi
        .getSupplierOrders({ status: 'PENDING_CONFIRMATION', size: 5 })
        .then((r) => r.data),
  })

  const pendingOrders: MaterialOrder[] = pendingData?.content || []

  return (
    <div>
      {/* Gradient Welcome Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 rounded-xl p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white animate-slide-up">
          Welcome back, {user?.supplierProfile?.companyName || user?.name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 animate-fade-in delay-100">
          Here's an overview of your supply business today.
        </p>
      </div>

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Pending orders"
            value={stats?.pendingOrders ?? 0}
            icon={<ShoppingCart className="h-5 w-5 text-white" />}
            colorClass="bg-amber-500"
            linkTo="/supplier/orders"
            className="animate-slide-up delay-100"
          />
          <StatCard
            title="Unpaid COD"
            value={stats?.unpaidCodOrders ?? 0}
            icon={<Banknote className="h-5 w-5 text-white" />}
            colorClass="bg-rose-500"
            linkTo="/supplier/orders?status=DELIVERED&paymentStatus=PENDING"
            className="animate-slide-up delay-200"
          />
          <StatCard
            title="Revenue (paid)"
            value={formatCurrency(stats?.revenue ?? 0)}
            icon={<Wallet className="h-5 w-5 text-white" />}
            colorClass="bg-emerald-500"
            className="animate-slide-up delay-300"
          />
          <StatCard
            title="Low stock items"
            value={stats?.lowStockItems ?? 0}
            icon={<Package className="h-5 w-5 text-white" />}
            colorClass="bg-purple-500"
            linkTo="/supplier/catalog"
            className="animate-slide-up delay-400"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in delay-300">
        {/* Needs your action */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold dark:text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-amber-500" /> Needs your action
            </h2>
            <Link to="/supplier/orders" className="text-sm text-primary hover:underline">
              View All
            </Link>
          </div>
          {pendingLoading ? (
            <LoadingSpinner label="Loading orders..." className="py-8" />
          ) : pendingOrders.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-10 w-10 text-gray-400" />}
              title="No orders waiting on you"
              description="New orders that need confirmation will show up here."
              className="py-6"
            />
          ) : (
            <div className="space-y-2">
              {pendingOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/supplier/orders/${order.id}`}
                  className="flex justify-between items-center gap-3 border-b dark:border-gray-700 last:border-0 -mx-2 px-2 py-3 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium dark:text-gray-200 truncate">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {order.orderedByName || `Buyer #${order.orderedById}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium dark:text-gray-200">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatRelativeTime(order.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Business at a glance + profile */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
            <h2 className="text-lg font-semibold dark:text-white mb-4">Business at a glance</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-2xl font-bold dark:text-white">
                  {statsLoading ? '—' : stats?.activeOrders ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active orders</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-2xl font-bold dark:text-white">
                  {statsLoading ? '—' : stats?.deliveredOrders ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Delivered</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-2xl font-bold dark:text-white">
                  {statsLoading ? '—' : stats?.catalogItems ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Catalog items</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Store className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium dark:text-white truncate">
                  {user?.supplierProfile?.companyName || user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Supplier Profile</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user?.supplierProfile?.isVerified ? (
                <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <ShieldCheck className="h-4 w-4" /> Verified
                </span>
              ) : (
                <Link
                  to="/profile#verification"
                  className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600 hover:underline dark:text-yellow-400"
                >
                  <Clock className="h-4 w-4" /> Not verified — Get Verified
                </Link>
              )}
              {user?.supplierProfile?.averageRating != null && (
                <span className="inline-flex items-center gap-1 text-sm dark:text-gray-300">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  {Number(user.supplierProfile.averageRating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 mt-6 animate-fade-in delay-400">
        <h2 className="text-lg font-semibold dark:text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/supplier/catalog"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            <PackagePlus className="h-4 w-4" /> Add Material
          </Link>
          <Link
            to="/supplier/orders"
            className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" /> View Orders
          </Link>
          <Link
            to="/supplier/messages"
            className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors"
          >
            <MessageSquare className="h-4 w-4" /> Messages
          </Link>
          <Link
            to="/supplier/settings"
            className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </div>
      </div>
    </div>
  )
}
