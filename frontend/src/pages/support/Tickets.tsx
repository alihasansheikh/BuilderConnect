import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supportTicketApi } from '@/services/api'
import type { SupportTicket } from '@/types'

const ticketStatusColors: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  WAITING_CUSTOMER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  WAITING_INTERNAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  REOPENED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const ticketPriorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  NORMAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const categoryOptions = [
  'ACCOUNT',
  'BILLING',
  'PROJECT',
  'PAYMENT',
  'TECHNICAL',
  'DISPUTE',
  'VERIFICATION',
  'FEEDBACK',
  'OTHER',
]

const statusOptions = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CUSTOMER',
  'WAITING_INTERNAL',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
]

const priorityOptions = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

export default function SupportTickets() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  // Admins oversee escalations, so default their view to escalated-only (clearable below).
  const [escalatedFilter, setEscalatedFilter] = useState(isAdmin ? 'true' : '')
  const [page, setPage] = useState(0)

  const { data, isLoading, error } = useQuery({
    queryKey: ['support-tickets', statusFilter, categoryFilter, priorityFilter, escalatedFilter, page],
    queryFn: async () => {
      const params: any = { page, size: 10 }
      if (statusFilter) params.status = statusFilter
      if (categoryFilter) params.category = categoryFilter
      if (priorityFilter) params.priority = priorityFilter
      if (escalatedFilter) params.escalated = escalatedFilter === 'true'
      const response = await supportTicketApi.getTickets(params)
      return response.data
    },
  })

  const tickets: SupportTicket[] = data?.content || []
  const totalPages = data?.totalPages || 0
  const totalElements = data?.totalElements || 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleRowClick = (ticketId: number) => {
    navigate(`/support/tickets/${ticketId}`)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Support Tickets</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage and resolve customer support tickets ({totalElements} total)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(0)
            }}
            className="px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPage(0)
            }}
            className="px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value)
              setPage(0)
            }}
            className="px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Priorities</option>
            {priorityOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={escalatedFilter}
            onChange={(e) => {
              setEscalatedFilter(e.target.value)
              setPage(0)
            }}
            className="px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Tickets</option>
            <option value="true">Escalated only</option>
            <option value="false">Not escalated</option>
          </select>
          <button
            onClick={() => {
              setStatusFilter('')
              setCategoryFilter('')
              setPriorityFilter('')
              setEscalatedFilter('')
              setPage(0)
            }}
            className="px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading tickets...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 dark:text-red-400">Failed to load tickets. Please try again.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ticket #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tickets.map((ticket: SupportTicket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => handleRowClick(ticket.id)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                          {ticket.ticketNumber}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 max-w-[280px]">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {ticket.subject}
                          </p>
                          {ticket.escalated && (
                            <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Escalated
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {ticket.userName || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ticket.userEmail || ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {ticket.category}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            ticketPriorityColors[ticket.priority] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            ticketStatusColors[ticket.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {ticket.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(ticket.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {tickets.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No tickets found matching your filters.
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t dark:border-gray-700">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 border dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  Previous
                </button>
                <span className="px-4 py-2 dark:text-gray-300">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 border dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
