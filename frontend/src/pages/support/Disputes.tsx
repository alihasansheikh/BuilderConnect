import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { disputeApi, getApiErrorMessage } from '@/services/api'
import type { Dispute, DisputeComment } from '@/types'

const disputeStatusColors: Record<string, string> = {
  FILED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  MEDIATION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  AWAITING_RESPONSE: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ESCALATED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

const disputeTypeColors: Record<string, string> = {
  PAYMENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  QUALITY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  TIMELINE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SCOPE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  COMMUNICATION: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  ABANDONMENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

const roleColors: Record<string, string> = {
  CLIENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  BUILDER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SUPPLIER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  SUPPORT_AGENT: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  SUPER_ADMIN: 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200',
}

const statusOptions = [
  'FILED',
  'UNDER_REVIEW',
  'MEDIATION',
  'AWAITING_RESPONSE',
  'RESOLVED',
  'ESCALATED',
  'CLOSED',
]

const typeOptions = [
  'PAYMENT',
  'QUALITY',
  'TIMELINE',
  'SCOPE',
  'COMMUNICATION',
  'ABANDONMENT',
  'OTHER',
]

// Must match the SQL ENUM on disputes.resolution_type (see DisputeService.LEGAL_RESOLUTION_TYPES).
const resolutionTypeOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'FAVOR_FILER', label: 'In favour of filer' },
  { value: 'FAVOR_RESPONDENT', label: 'In favour of respondent' },
  { value: 'MUTUAL_AGREEMENT', label: 'Mutual agreement' },
  { value: 'PARTIAL', label: 'Partial resolution' },
  { value: 'DISMISSED', label: 'Dismissed' },
]

export default function SupportDisputes() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const isAgent = user?.role === 'SUPPORT_AGENT'

  // Admins oversee escalations, so default their view to escalated disputes (clearable below).
  const [statusFilter, setStatusFilter] = useState(isAdmin ? 'ESCALATED' : '')
  const [typeFilter, setTypeFilter] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolveTarget, setResolveTarget] = useState<Dispute | null>(null)
  const [resolutionType, setResolutionType] = useState('')
  const [resolutionAmount, setResolutionAmount] = useState('')
  const [resolutionDetails, setResolutionDetails] = useState('')
  const [commentText, setCommentText] = useState('')
  const [isInternalComment, setIsInternalComment] = useState(false)
  const [statusDropdownId, setStatusDropdownId] = useState<number | null>(null)

  // Fetch disputes
  const { data, isLoading, error } = useQuery({
    queryKey: ['support-disputes', statusFilter, typeFilter],
    queryFn: async () => {
      const params: any = {}
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.disputeType = typeFilter
      const response = await disputeApi.getDisputes(params)
      return response.data
    },
  })

  // Fetch comments for expanded dispute
  const { data: commentsData } = useQuery({
    queryKey: ['dispute-comments', expandedId],
    queryFn: async () => {
      const response = await disputeApi.getComments(expandedId!)
      return response.data
    },
    enabled: !!expandedId,
  })

  // Escalate mutation — agents hand a dispute up to admin oversight
  const escalateMutation = useMutation({
    mutationFn: async (disputeId: number) => {
      return disputeApi.escalate(disputeId)
    },
    onSuccess: () => {
      toast.success('Dispute escalated to admins')
      queryClient.invalidateQueries({ queryKey: ['support-disputes'] })
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, 'Failed to escalate dispute'))
    },
  })

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ disputeId, status }: { disputeId: number; status: string }) => {
      return disputeApi.updateStatus(disputeId, status)
    },
    onSuccess: () => {
      toast.success('Dispute status updated')
      queryClient.invalidateQueries({ queryKey: ['support-disputes'] })
      setStatusDropdownId(null)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, 'Failed to update dispute status'))
    },
  })

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!resolveTarget) return
      return disputeApi.resolve(resolveTarget.id, {
        resolutionType,
        resolutionAmount: resolutionAmount ? parseFloat(resolutionAmount) : undefined,
        resolutionDetails,
      })
    },
    onSuccess: () => {
      toast.success('Dispute resolved successfully')
      queryClient.invalidateQueries({ queryKey: ['support-disputes'] })
      setShowResolveModal(false)
      setResolveTarget(null)
      setResolutionType('')
      setResolutionAmount('')
      setResolutionDetails('')
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, 'Failed to resolve dispute'))
    },
  })

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (disputeId: number) => {
      return disputeApi.addComment(disputeId, {
        comment: commentText,
        isInternal: isInternalComment,
      })
    },
    onSuccess: () => {
      toast.success(isInternalComment ? 'Internal note added' : 'Comment added')
      queryClient.invalidateQueries({ queryKey: ['dispute-comments', expandedId] })
      setCommentText('')
      setIsInternalComment(false)
    },
    onError: (e) => {
      toast.error(getApiErrorMessage(e, 'Failed to add comment'))
    },
  })

  const disputes: Dispute[] = data?.content || []
  const comments: DisputeComment[] = commentsData ?? []

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleToggleExpand = (disputeId: number) => {
    setExpandedId(expandedId === disputeId ? null : disputeId)
    setCommentText('')
    setIsInternalComment(false)
  }

  const handleOpenResolve = (dispute: Dispute) => {
    setResolveTarget(dispute)
    setResolutionType('')
    setResolutionAmount(dispute.disputedAmount ? String(dispute.disputedAmount) : '')
    setResolutionDetails('')
    setShowResolveModal(true)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Dispute Management</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review and resolve disputes between platform users
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Types</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setStatusFilter('')
              setTypeFilter('')
            }}
            className="px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Disputes List */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-3 text-gray-500 dark:text-gray-400">Loading disputes...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-500 dark:text-red-400">Failed to load disputes. Please try again.</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-white dark:bg-card rounded-2xl shadow-card p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No disputes found matching your filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute: Dispute) => (
            <div
              key={dispute.id}
              className="bg-white dark:bg-card rounded-2xl shadow-card overflow-hidden"
            >
              {/* Dispute Card Header */}
              <div
                className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => handleToggleExpand(dispute.id)}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {dispute.disputeNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          disputeTypeColors[dispute.disputeType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {dispute.disputeType.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          disputeStatusColors[dispute.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {dispute.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h3 className="font-medium dark:text-white truncate">{dispute.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>
                        Filed by: <span className="text-gray-700 dark:text-gray-300">{dispute.filedByName || 'Unknown'}</span>
                      </span>
                      <span>
                        Against: <span className="text-gray-700 dark:text-gray-300">{dispute.filedAgainstName || 'Unknown'}</span>
                      </span>
                      {dispute.disputedAmount != null && (
                        <span>
                          Amount: <span className="text-gray-700 dark:text-gray-300 font-medium">{formatCurrency(dispute.disputedAmount)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(dispute.createdAt)}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 text-sm">
                      {expandedId === dispute.id ? '[-]' : '[+]'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedId === dispute.id && (
                <div className="border-t dark:border-gray-700">
                  <div className="p-5 space-y-5">
                    {/* Description & Evidence */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Description
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                          {dispute.description}
                        </p>
                      </div>
                      <div>
                        {dispute.evidence && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Evidence
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                              {dispute.evidence}
                            </p>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Project
                            </span>
                            <p className="text-sm dark:text-gray-300">
                              {dispute.projectTitle || `#${dispute.projectId}`}
                            </p>
                          </div>
                          {dispute.resolutionDetails && (
                            <div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Resolution
                              </span>
                              <p className="text-sm dark:text-gray-300">
                                {dispute.resolutionDetails}
                              </p>
                              {dispute.resolutionAmount != null && (
                                <p className="text-sm font-medium dark:text-gray-300 mt-1">
                                  Settlement: {formatCurrency(dispute.resolutionAmount)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t dark:border-gray-700">
                      {isAgent && dispute.status !== 'ESCALATED' && dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            escalateMutation.mutate(dispute.id)
                          }}
                          disabled={escalateMutation.isPending}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                        >
                          {escalateMutation.isPending ? 'Escalating...' : 'Escalate'}
                        </button>
                      )}

                      {/* Status Dropdown */}
                      {dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setStatusDropdownId(statusDropdownId === dispute.id ? null : dispute.id)
                            }}
                            className="px-3 py-1.5 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 text-sm"
                          >
                            Update Status
                          </button>
                          {statusDropdownId === dispute.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setStatusDropdownId(null)}
                              ></div>
                              <div className="absolute left-0 bottom-full mb-1 w-48 bg-white dark:bg-card border dark:border-gray-700 rounded-lg shadow-lg z-20">
                                {statusOptions.map((status) => (
                                  <button
                                    key={status}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      updateStatusMutation.mutate({
                                        disputeId: dispute.id,
                                        status,
                                      })
                                    }}
                                    disabled={
                                      dispute.status === status || updateStatusMutation.isPending
                                    }
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed first:rounded-t-lg last:rounded-b-lg"
                                  >
                                    {status.replace(/_/g, ' ')}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenResolve(dispute)
                          }}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          Resolve
                        </button>
                      )}
                    </div>

                    {/* Comments Section */}
                    <div className="pt-3 border-t dark:border-gray-700">
                      <h4 className="text-sm font-semibold dark:text-white mb-3">
                        Comments ({comments.length})
                      </h4>

                      {comments.length > 0 && (
                        <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                          {comments.map((comment: DisputeComment) => (
                            <div
                              key={comment.id}
                              className={`rounded-lg p-3 ${
                                comment.isInternal
                                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                                  : 'bg-gray-50 dark:bg-gray-700/50'
                              }`}
                            >
                              {comment.isInternal && (
                                <span className="inline-block mb-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                                  Internal Note
                                </span>
                              )}
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium dark:text-white">
                                  {comment.userName || 'User'}
                                </span>
                                {comment.userRole && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                      roleColors[comment.userRole] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                    }`}
                                  >
                                    {comment.userRole.replace(/_/g, ' ')}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDateTime(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {comment.comment}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment Form */}
                      {dispute.status !== 'CLOSED' && (
                        <div>
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={
                              isInternalComment
                                ? 'Write an internal note...'
                                : 'Add a comment...'
                            }
                            rows={3}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm dark:text-white resize-none ${
                              isInternalComment
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex items-center justify-between mt-2">
                            <label
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isInternalComment}
                                onChange={(e) => setIsInternalComment(e.target.checked)}
                                className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-primary focus:ring-primary"
                              />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                Internal Note
                              </span>
                            </label>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addCommentMutation.mutate(dispute.id)
                              }}
                              disabled={!commentText.trim() || addCommentMutation.isPending}
                              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 text-sm"
                            >
                              {addCommentMutation.isPending ? 'Adding...' : 'Add Comment'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && resolveTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold dark:text-white">Resolve Dispute</h2>
                <button
                  onClick={() => {
                    setShowResolveModal(false)
                    setResolveTarget(null)
                    setResolutionType('')
                    setResolutionAmount('')
                    setResolutionDetails('')
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  X
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Resolving dispute{' '}
                <strong className="dark:text-white">{resolveTarget.disputeNumber}</strong>
                {resolveTarget.disputedAmount != null && (
                  <>
                    {' '}
                    (Disputed amount:{' '}
                    <strong className="dark:text-white">
                      {formatCurrency(resolveTarget.disputedAmount)}
                    </strong>
                    )
                  </>
                )}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resolution Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={resolutionType}
                    onChange={(e) => setResolutionType(e.target.value)}
                    className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a resolution type...</option>
                    {resolutionTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resolution Amount (PKR)
                  </label>
                  <input
                    type="number"
                    value={resolutionAmount}
                    onChange={(e) => setResolutionAmount(e.target.value)}
                    placeholder="Enter settlement amount..."
                    className="w-full px-4 py-2 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resolution Details
                  </label>
                  <textarea
                    value={resolutionDetails}
                    onChange={(e) => setResolutionDetails(e.target.value)}
                    placeholder="Describe the resolution..."
                    rows={4}
                    className="w-full px-4 py-3 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowResolveModal(false)
                    setResolveTarget(null)
                    setResolutionType('')
                    setResolutionAmount('')
                    setResolutionDetails('')
                  }}
                  className="px-4 py-2 border dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => resolveMutation.mutate()}
                  disabled={!resolutionType || !resolutionDetails.trim() || resolveMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {resolveMutation.isPending ? 'Resolving...' : 'Resolve Dispute'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
