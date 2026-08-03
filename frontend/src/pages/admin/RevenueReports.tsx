import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services/api'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { DollarSign, TrendingUp, CreditCard, Crown } from 'lucide-react'

const COLORS = ['#F97316', '#22C55E', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#ec4899']

const tierBadgeClasses: Record<string, string> = {
  ENTERPRISE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  PROFESSIONAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  BASIC: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  FREE: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

interface MonthlyTrend {
  month: string
  total: number
  count: number
}

interface TierRevenue {
  tier: string
  total: number
  count: number
}

interface RecentPayment {
  id: number
  builderName: string
  tier: string
  amount: number
  paidAt: string
}

interface RevenueSummaryData {
  totalRevenue: number
  totalPayments: number
  revenueThisMonth: number
  monthlyTrends: MonthlyTrend[]
  byTier: TierRevenue[]
  recentPayments: RecentPayment[]
}

export default function RevenueReports() {
  const { data: revenue, isLoading } = useQuery({
    queryKey: ['admin-revenue-summary'],
    queryFn: () => adminApi.getRevenueSummary().then(r => r.data as unknown as RevenueSummaryData),
  })

  const totalRevenue = Number(revenue?.totalRevenue) || 0
  const totalPayments = Number(revenue?.totalPayments) || 0
  const revenueThisMonth = Number(revenue?.revenueThisMonth) || 0

  // Monthly trends for bar chart, oldest month first
  const monthlyData = (revenue?.monthlyTrends || [])
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => ({
      month: item.month,
      total: Number(item.total) || 0,
      count: Number(item.count) || 0,
    }))

  // Revenue by tier for pie chart
  const tierData = (revenue?.byTier || []).map(item => ({
    name: item.tier,
    value: Number(item.total) || 0,
    count: Number(item.count) || 0,
  }))

  const topTier = tierData.length > 0
    ? tierData.reduce((best, item) => (item.value > best.value ? item : best))
    : null

  const recentPayments = revenue?.recentPayments || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Revenue Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">Subscription income from builder plans.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Subscription Revenue</p>
              {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalRevenue)}</p>
              )}
            </div>
            <div className="p-3 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Payments</p>
              {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold mt-1 dark:text-white">{totalPayments}</p>
              )}
            </div>
            <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Revenue This Month</p>
              {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold mt-1 dark:text-white">{formatCurrency(revenueThisMonth)}</p>
              )}
            </div>
            <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Top Tier</p>
              {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
              ) : topTier ? (
                <>
                  <p className="text-2xl font-bold mt-1 dark:text-white">{topTier.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(topTier.value)}</p>
                </>
              ) : (
                <p className="text-2xl font-bold mt-1 dark:text-white">—</p>
              )}
            </div>
            <div className="p-3 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600">
              <Crown className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Revenue Bar Chart */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Monthly Subscription Revenue</h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'total' ? formatCurrency(value) : value,
                    name === 'total' ? 'Revenue' : 'Payments',
                  ]}
                />
                <Bar dataKey="total" fill="#F97316" radius={[4, 4, 0, 0]} name="total" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-400">
              <p>No monthly data available</p>
            </div>
          )}
        </div>

        {/* Revenue by Tier Pie */}
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Revenue by Tier</h2>
          {tierData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {tierData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-400">
              <p>No tier data</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card overflow-hidden">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">Recent Payments</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : recentPayments.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No subscription payments yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-300">Builder</th>
                <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-300">Tier</th>
                <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-300 text-right">Amount</th>
                <th className="px-6 py-3 font-medium text-gray-600 dark:text-gray-300 text-right">Paid At</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {recentPayments.map(payment => (
                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-3 font-medium dark:text-gray-300">{payment.builderName}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tierBadgeClasses[payment.tier] || tierBadgeClasses.FREE}`}>
                      {payment.tier}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-medium dark:text-gray-300">{formatCurrency(payment.amount)}</td>
                  <td className="px-6 py-3 text-right text-gray-500 dark:text-gray-400">{formatDate(payment.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
