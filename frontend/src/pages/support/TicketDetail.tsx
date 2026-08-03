import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { supportTicketApi, getApiErrorMessage } from '@/services/api'
import type { SupportTicket, TicketResponseRecord } from '@/types'

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

const roleColors: Record<string, string> = {
  CLIENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  BUILDER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SUPPLIER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  SUPPORT_AGENT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  SUPER_ADMIN: 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200',
}

const statusTransitions = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CUSTOMER',
  'WAITING_INTERNAL',
  'RESOLVED',
  'CLOSED',
]

export default function SupportTicketDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [replyMessage, setReplyMessage] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolution, setResolution] = useState('')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)

  const ticketId = id ? Number(id) : NaN
  const isAgent = user?.role === 'SUPPORT_AGENT'

  // Fetch ticket details
  const {
    data: ticketData,
    isLoading: ticketLoading,
    error: ticketError,
  } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: async () => {
      const response = await supportTicketApi.getTicket(ticketId)
      return response.data
    },
    enabled: !!ticketId,
  })

  // Fetch ticket responses
  const { data: responsesData, isLoading: responsesLoading } = useQuery({
    queryKey: ['support-ticket-responses', ticketId],
    queryFn: async () => {
      const response = await supportTicketApi.getResponses(ticketId)
      return response.data
    },
    enabled: !!ticketId,
  })

  // Escalate mutation — agents hand a ticket up to admin oversight
  const escalateMutation = useMutation({
    mutationFn: async () => {
      return supportTicketApi.escalate(ticketId)
    },
    onSuccess: () => {
      toast.success('Ticket escalated to admins')
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] })
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, 'Failed to escalate ticket'))
    },
  })

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      return supportTicketApi.updateStatus(ticketId, status)
    },
    onSuccess: () => {
      toast.success('Ticket status updated')
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] })
      setStatusDropdownOpen(false)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, 'Failed to update status'))
    },
  })

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: async () => {
      return supportTicketApi.resolve(ticketId, resolution)
    },
    onSuccess: () => {
      toast.success('Ticket resolved successfully')
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] })
      setShowResolveModal(false)
      setResolution('')
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, 'Failed to resolve ticket'))
    },
  })

  // Add response mutation
  const addResponseMutation = useMutation({
    mutationFn: async () => {
      return supportTicketApi.addResponse(ticketId, {
        message: replyMessage,
        isInternal: isInternalNote,
      })
    },
    onSuccess: () => {
      toast.success(isInternalNote ? 'Internal note added' : 'Reply sent')
      queryClient.invalidateQueries({ queryKey: ['support-ticket-responses', ticketId] })
      setReplyMessage('')
      setIsInternalNote(false)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, 'Failed to send reply'))
    },
  })

  const ticket: SupportTicket | undefined = ticketData
  const responses: TicketResponseRecord[] = responsesData ?? []

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (ticketLoading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-3 text-gray-500 dark:text-gray-400">Loading ticket...</p>
      </div>
    )
  }

  if (ticketError || !ticket) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 dark:text-red-400">Failed to load ticket details.</p>
        <Link
          to="/support/tickets"
          className="inline-block mt-4 text-primary hover:underline"
        >
          Back to Tickets
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/support/tickets"
          className="text-sm text-primary hover:underline"
        >
          &larr; Back to Tickets
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                {ticket.ticketNumber}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  ticketStatusColors[ticket.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {ticket.status.replace(/_/g, ' ')}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  ticketPriorityColors[ticket.priority] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {ticket.priority}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {ticket.category}
              </span>
              {ticket.escalated && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  Escalated
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold dark:text-white">{ticket.subject}</h1>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isAgent && !ticket.escalated && ticket.status !== 'CLOSED' && (
              <button
                onClick={() => escalateMutation.mutate()}
                disabled={escalateMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                {escalateMutation.isPending ? 'Escalating...' : 'Escalate to admin'}
              </button>
            )}

            {/* Status Dropdown */}
            <div className="relative">
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 text-sm"
              >
                Update Status
              </button>
              {statusDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setStatusDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-card border dark:border-gray-700 rounded-lg shadow-lg z-20">
                    {statusTransitions.map((status) => (
                      <button
                        key={status}
                        onClick={() => statusMutation.mutate(status)}
                        disabled={ticket.status === status || statusMutation.isPending}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed first:rounded-t-lg last:rounded-b-lg"
                      >
                        {status.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <button
                onClick={() => setShowResolveModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                Resolve
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column - Conversation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original Description */}
          <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-200 text-sm font-medium">
                {(ticket.userName || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium dark:text-white">
                  {ticket.userName || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(ticket.createdAt)}
                </p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          {/* Responses Thread */}
          {responsesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm">
                Loading responses...
              </p>
            </div>
          ) : (
            responses.length > 0 && (
              <div className="space-y-4">
                {responses.map((resp: TicketResponseRecord) => (
                  <div
                    key={resp.id}
                    className={`rounded-2xl shadow-card p-5 ${
                      resp.isInternal
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                        : 'bg-white dark:bg-card'
                    }`}
                  >
                    {resp.isInternal && (
                      <div className="mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                          Internal Note
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-200 text-sm font-medium">
                        {(resp.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium dark:text-white">
                          {resp.userName || 'User'}
                        </p>
                        {resp.userRole && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              roleColors[resp.userRole] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {resp.userRole.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(resp.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {resp.message}
                    </p>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Reply Form */}
          {ticket.status !== 'CLOSED' && (
            <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
              <h3 className="text-sm font-semibold dark:text-white mb-3">
                {isInternalNote ? 'Add Internal Note' : 'Reply to Ticket'}
              </h3>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder={
                  isInternalNote
                    ? 'Write an internal note (only visible to support staff)...'
                    : 'Type your reply...'
                }
                rows={4}
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:text-white resize-none ${
                  isInternalNote
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                }`}
              />
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Internal Note (only visible to support staff)
                  </span>
                </label>
                <button
                  onClick={() => addResponseMutation.mutate()}
                  disabled={!replyMessage.trim() || addResponseMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 text-sm"
                >
                  {addResponseMutation.isPending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Ticket Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
            <h3 className="text-sm font-semibold dark:text-white mb-4">Ticket Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Submitted By
                </p>
                <p className="text-sm font-medium dark:text-white mt-1">
                  {ticket.userName || 'Unknown'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {ticket.userEmail || ''}
                </p>
              </div>

              {ticket.projectId && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Related Project
                  </p>
                  <p className="text-sm font-medium dark:text-white mt-1">
                    Project #{ticket.projectId}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </p>
                  <p className="text-sm dark:text-gray-300 mt-1">
                    {formatShortDate(ticket.createdAt)}
                  </p>
                </div>
                {ticket.updatedAt && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Updated
                    </p>
                    <p className="text-sm dark:text-gray-300 mt-1">
                      {formatShortDate(ticket.updatedAt)}
                    </p>
                  </div>
                )}
              </div>

              {ticket.responseCount !== undefined && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Responses
                  </p>
                  <p className="text-sm dark:text-gray-300 mt-1">{ticket.responseCount}</p>
                </div>
              )}

              {ticket.resolution && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resolution
                  </p>
                  <p className="text-sm dark:text-gray-300 mt-1 whitespace-pre-wrap">
                    {ticket.resolution}
                  </p>
                </div>
              )}

              {ticket.resolvedAt && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resolved At
                  </p>
                  <p className="text-sm dark:text-gray-300 mt-1">
                    {formatDate(ticket.resolvedAt)}
                  </p>
                </div>
              )}

              {ticket.satisfactionRating && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Satisfaction Rating
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        className={`text-lg ${
                          i < ticket.satisfactionRating!
                            ? 'text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      >
                        *
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold dark:text-white">Resolve Ticket</h2>
                <button
                  onClick={() => {
                    setShowResolveModal(false)
                    setResolution('')
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  X
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Provide a resolution summary for ticket{' '}
                <strong className="dark:text-white">{ticket.ticketNumber}</strong>.
              </p>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe the resolution..."
                rows={4}
                className="w-full px-4 py-3 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white resize-none"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowResolveModal(false)
                    setResolution('')
                  }}
                  className="px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => resolveMutation.mutate()}
                  disabled={!resolution.trim() || resolveMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {resolveMutation.isPending ? 'Resolving...' : 'Resolve Ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
