import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { adminApi } from '@/services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, Briefcase, FileText, CheckCircle, AlertTriangle, DollarSign, Shield, TrendingUp, Ticket } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { StatCard } from '@/components/ui/StatCard'

const CHART_COLORS = ['#F97316', '#22C55E', '#00B8D9', '#FF5630', '#7635DC']

export default function AdminDashboard() {
  const { user } = useAuth()

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminApi.getMetrics().then(r => r.data),
  })

  const { data: revenue } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: () => adminApi.getRevenueSummary().then(r => r.data),
  })

  const userCounts = metrics?.users || {}
  const projectCounts = metrics?.projects || {}
  const bidCounts = metrics?.bids || {}
  const subscriptionCounts = metrics?.subscriptions || {}
  const reviewCounts = metrics?.reviews || {}
  const ticketCounts = metrics?.tickets || {}
  const disputeCounts = metrics?.disputes || {}

  // Project status data for pie chart
  const projectStatusData = [
    { name: 'Open', value: projectCounts.open || 0 },
    { name: 'Bidding', value: projectCounts.bidding || 0 },
    { name: 'In Progress', value: projectCounts.inProgress || 0 },
    { name: 'Completed', value: projectCounts.completed || 0 },
  ].filter(d => d.value > 0)

  // Monthly revenue for bar chart (backend returns oldest-first, which is the correct axis order)
  const monthlyData = (revenue?.monthlyTrends || [])
    .map((item: any) => ({
      month: item.month,
      total: Number(item.total) || 0,
      count: Number(item.count) || 0,
    }))

  return (
    <div>
      {/* Header */}
      <div className="animate-slide-up mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Welcome back, {user?.name?.split(' ')[0]}. Here's your platform overview.</p>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Users"
          value={(userCounts.total || 0).toLocaleString()}
          icon={<Users className="h-6 w-6" />}
          linkTo="/admin/users"
          isLoading={isLoading}
          colorClass="bg-blue-500"
          className="animate-slide-up delay-100"
        />
        <StatCard
          title="Active Projects"
          value={((projectCounts.open || 0) + (projectCounts.bidding || 0) + (projectCounts.inProgress || 0)).toLocaleString()}
          icon={<Briefcase className="h-6 w-6" />}
          isLoading={isLoading}
          colorClass="bg-indigo-500"
          className="animate-slide-up delay-200"
        />
        <StatCard
          title="Subscription Revenue"
          value={isLoading ? '...' : formatCurrency(subscriptionCounts.totalRevenue || 0)}
          icon={<DollarSign className="h-6 w-6" />}
          linkTo="/admin/revenue"
          isLoading={isLoading}
          colorClass="bg-emerald-500"
          className="animate-slide-up delay-300"
        />
        <StatCard
          title="Revenue This Month"
          value={isLoading ? '...' : formatCurrency(subscriptionCounts.thisMonth || 0)}
          icon={<TrendingUp className="h-6 w-6" />}
          isLoading={isLoading}
          colorClass="bg-green-500"
          className="animate-slide-up delay-400"
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Bids"
          value={(bidCounts.total || 0).toLocaleString()}
          icon={<FileText className="h-6 w-6" />}
          isLoading={isLoading}
          colorClass="bg-gray-500"
          className="animate-slide-up delay-100"
        />
        <StatCard
          title="Completed Projects"
          value={(projectCounts.completed || 0).toLocaleString()}
          icon={<CheckCircle className="h-6 w-6" />}
          isLoading={isLoading}
          colorClass="bg-green-500"
          className="animate-slide-up delay-200"
        />
        <StatCard
          title="Pending Verifications"
          value={(metrics?.pendingVerifications || 0).toLocaleString()}
          icon={<Shield className="h-6 w-6" />}
          linkTo="/admin/verifications"
          isLoading={isLoading}
          colorClass="bg-amber-500"
          className="animate-slide-up delay-300"
        />
        <StatCard
          title="Reviews"
          value={(reviewCounts.total || 0).toLocaleString()}
          icon={<AlertTriangle className="h-6 w-6" />}
          linkTo="/admin/moderation"
          isLoading={isLoading}
          colorClass="bg-orange-500"
          className="animate-slide-up delay-400"
        />
      </div>

      {/* KPI Cards Row 3 - Support oversight (agents work these; admins oversee escalations) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Open Tickets"
          value={((ticketCounts.open || 0) + (ticketCounts.inProgress || 0)).toLocaleString()}
          icon={<Ticket className="h-6 w-6" />}
          linkTo="/support/tickets"
          isLoading={isLoading}
          colorClass="bg-cyan-500"
          trend={ticketCounts.escalated ? `${ticketCounts.escalated} escalated` : undefined}
          trendDirection={ticketCounts.escalated ? 'up' : 'neutral'}
          className="animate-slide-up delay-100"
        />
        <StatCard
          title="Open Disputes"
          value={((disputeCounts.filed || 0) + (disputeCounts.underReview || 0)).toLocaleString()}
          icon={<AlertTriangle className="h-6 w-6" />}
          linkTo="/support/disputes"
          isLoading={isLoading}
          colorClass="bg-red-500"
          trend={disputeCounts.escalated ? `${disputeCounts.escalated} escalated` : undefined}
          trendDirection={disputeCounts.escalated ? 'up' : 'neutral'}
          className="animate-slide-up delay-200"
        />
      </div>

      {/* Charts Row */}
      <div className="animate-fade-in delay-300 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 text-gray-600 dark:text-gray-400">
        {/* Revenue Trend Bar Chart */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold dark:text-white">Revenue Trend</h2>
            <Link to="/admin/revenue" className="text-sm text-primary hover:underline">Details</Link>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e7eb)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fill: 'var(--chart-text, #9ca3af)', fontSize: 12 }} stroke="transparent" />
                <YAxis tick={{ fill: 'var(--chart-text, #9ca3af)', fontSize: 12 }} stroke="transparent" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="total" fill="#F97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">
              <p>No revenue data yet</p>
            </div>
          )}
        </div>

        {/* Project Status Pie Chart */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Project Status</h2>
          {projectStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ stroke: '#9ca3af' }}
                >
                  {projectStatusData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">
              <p>No projects yet</p>
            </div>
          )}
        </div>
      </div>

      {/* User Breakdown + Admin Tasks */}
      <div className="animate-fade-in delay-400 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* User Breakdown */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">User Breakdown</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{isLoading ? '...' : userCounts.clients || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Clients</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600">{isLoading ? '...' : userCounts.builders || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Builders</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{isLoading ? '...' : metrics?.verifiedBuilders || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Verified Builders</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{isLoading ? '...' : userCounts.suppliers || 0}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Suppliers</p>
            </div>
          </div>
        </div>

        {/* Admin Tasks */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/admin/verifications"
              className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
            >
              <div>
                <p className="font-medium text-sm dark:text-white">Builder Verifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{metrics?.pendingVerifications || 0} pending</p>
              </div>
              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs">Review</span>
            </Link>
            <Link
              to="/admin/moderation"
              className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            >
              <div>
                <p className="font-medium text-sm dark:text-white">Review Moderation</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{reviewCounts.total || 0} published, {reviewCounts.hidden || 0} hidden</p>
              </div>
              <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded-full text-xs">Moderate</span>
            </Link>
            <Link
              to="/admin/audit-logs"
              className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <div>
                <p className="font-medium text-sm dark:text-white">Audit Logs</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">View platform activity</p>
              </div>
              <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs">View</span>
            </Link>
            <Link
              to="/admin/system-settings"
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div>
                <p className="font-medium text-sm dark:text-white">System Settings</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Platform configuration</p>
              </div>
              <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full text-xs">Configure</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
