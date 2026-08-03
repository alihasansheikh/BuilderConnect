import { useState, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services/api'
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'

const CATEGORIES = ['ALL', 'AUTH', 'USER', 'PROJECT', 'BID', 'MILESTONE', 'PAYMENT', 'ESCROW', 'CHAT', 'REVIEW', 'ADMIN', 'SYSTEM', 'SECURITY']

const STATUSES = ['ALL', 'SUCCESS', 'FAILURE']

const categoryColors: Record<string, string> = {
  AUTH: 'bg-blue-100 text-blue-800',
  USER: 'bg-indigo-100 text-indigo-800',
  PROJECT: 'bg-purple-100 text-purple-800',
  BID: 'bg-cyan-100 text-cyan-800',
  MILESTONE: 'bg-teal-100 text-teal-800',
  PAYMENT: 'bg-green-100 text-green-800',
  ESCROW: 'bg-emerald-100 text-emerald-800',
  CHAT: 'bg-pink-100 text-pink-800',
  REVIEW: 'bg-yellow-100 text-yellow-800',
  ADMIN: 'bg-red-100 text-red-800',
  SYSTEM: 'bg-gray-100 text-gray-800',
  SECURITY: 'bg-red-100 text-red-800',
}

export default function AuditLogs() {
  const [page, setPage] = useState(0)
  const [category, setCategory] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [actionSearch, setActionSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, category, status, actionSearch],
    queryFn: () => adminApi.getAuditLogs({
      page,
      size: 20,
      ...(category !== 'ALL' && { category }),
      ...(status !== 'ALL' && { status }),
      ...(actionSearch && { action: actionSearch }),
    }).then(r => r.data),
  })

  const logs = data?.content || []
  const totalPages = data?.totalPages || 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Audit Logs</h1>
        <p className="text-gray-600 dark:text-gray-400">View all platform activity and changes.</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(0) }}
              className="px-3 py-2 border dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(0) }}
              className="px-3 py-2 border dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Action Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search Action</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={actionSearch}
                onChange={(e) => { setActionSearch(e.target.value); setPage(0) }}
                placeholder="e.g. LOGIN, BID_SUBMITTED..."
                className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>No audit logs found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300 w-8"></th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Time</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">User</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Action</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Category</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Entity</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {logs.map((log: any) => (
                <Fragment key={log.id}>
                  <tr
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3">
                      {expandedId === log.id ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {log.createdAt ? formatDate(log.createdAt) : '-'}
                    </td>
                    <td className="px-4 py-3 dark:text-gray-300">
                      <div>{log.userEmail || 'System'}</div>
                      {log.userRole && (
                        <div className="text-xs text-gray-400">{log.userRole}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs dark:text-gray-300">{log.action}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${categoryColors[log.category] || 'bg-gray-100 text-gray-800'}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {log.entityType && `${log.entityType}${log.entityId ? ' #' + log.entityId : ''}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                        log.status === 'FAILURE' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr key={`${log.id}-details`}>
                      <td colSpan={7} className="px-4 py-3 bg-gray-50 dark:bg-gray-700">
                        <div className="space-y-2 text-sm">
                          {log.description && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-300">Description:</span>
                              <span className="ml-2 dark:text-gray-300">{log.description}</span>
                            </div>
                          )}
                          {log.ipAddress && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-300">IP Address:</span>
                              <span className="ml-2 font-mono dark:text-gray-300">{log.ipAddress}</span>
                            </div>
                          )}
                          {log.oldValues && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-300">Old Values:</span>
                              <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs overflow-auto dark:text-gray-300">{log.oldValues}</pre>
                            </div>
                          )}
                          {log.newValues && (
                            <div>
                              <span className="font-medium text-gray-600 dark:text-gray-300">New Values:</span>
                              <pre className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs overflow-auto dark:text-gray-300">{log.newValues}</pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page + 1} of {totalPages} ({data?.totalElements || 0} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 dark:text-gray-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 dark:text-gray-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
