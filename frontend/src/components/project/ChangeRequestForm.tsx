import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changeRequestApi, getApiErrorMessage } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import ReasonDialog from '@/components/ui/ReasonDialog'
import { Plus, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import type { ChangeRequest } from '@/types'

const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  PENDING: { icon: Clock, color: 'text-yellow-700', bg: 'bg-yellow-100' },
  APPROVED: { icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-100' },
  REJECTED: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-100' },
  WITHDRAWN: { icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-100' },
}

interface Props {
  projectId: number
  canSubmit: boolean
  canReview: boolean
}

export default function ChangeRequestForm({ projectId, canSubmit, canReview }: Props) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [changeType, setChangeType] = useState('SCOPE')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [proposedValue, setProposedValue] = useState('')
  const [rejectingId, setRejectingId] = useState<number | null>(null)

  const { data: changeRequests, isLoading } = useQuery({
    queryKey: ['change-requests', projectId],
    queryFn: () => changeRequestApi.getByProject(projectId).then(r => r.data as ChangeRequest[]),
  })

  const submitMutation = useMutation({
    mutationFn: () => changeRequestApi.submit(projectId, { changeType, title, description, proposedValue: proposedValue || undefined }),
    onSuccess: () => {
      toast.success('Change request submitted')
      setShowForm(false)
      setTitle('')
      setDescription('')
      setProposedValue('')
      queryClient.invalidateQueries({ queryKey: ['change-requests', projectId] })
    },
    onError: () => toast.error('Failed to submit change request'),
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => changeRequestApi.approve(projectId, id),
    onSuccess: () => {
      toast.success('Change request approved')
      queryClient.invalidateQueries({ queryKey: ['change-requests', projectId] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to approve')),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      changeRequestApi.reject(projectId, id, reason),
    onSuccess: () => {
      toast.success('Change request rejected')
      queryClient.invalidateQueries({ queryKey: ['change-requests', projectId] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to reject')),
  })

  const handleRejectConfirm = (reason: string) => {
    if (rejectingId !== null) {
      rejectMutation.mutate({ id: rejectingId, reason })
      setRejectingId(null)
    }
  }

  return (
    <div>
      <ReasonDialog
        isOpen={rejectingId !== null}
        title="Rejection Reason"
        placeholder="Enter rejection reason..."
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectingId(null)}
      />
      {/* Header + New button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold dark:text-white">Change Requests</h3>
        {canSubmit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        )}
      </div>

      {/* Submit Form */}
      {showForm && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Change Type</label>
              <select
                value={changeType}
                onChange={e => setChangeType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="SCOPE">Scope Change</option>
                <option value="BUDGET">Budget Change</option>
                <option value="TIMELINE">Timeline Change</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Brief title..."
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the change in detail..."
              rows={3}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Proposed Value (optional)</label>
            <input
              type="text"
              value={proposedValue}
              onChange={e => setProposedValue(e.target.value)}
              placeholder="e.g. new budget amount, new deadline..."
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => submitMutation.mutate()}
              disabled={!title.trim() || !description.trim() || submitMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 disabled:opacity-50"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Change Request List */}
      {isLoading ? (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : !changeRequests || changeRequests.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No change requests</p>
      ) : (
        <div className="space-y-3">
          {changeRequests.map(cr => {
            const config = statusConfig[cr.status] || statusConfig.PENDING
            const Icon = config.icon
            const isOwn = cr.requestedBy?.id === user?.id
            return (
              <div key={cr.id} className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-600 dark:text-gray-400">{cr.changeType}</span>
                      <h4 className="text-sm font-medium dark:text-white">{cr.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{cr.description}</p>
                    {cr.proposedValue && (
                      <p className="text-sm mt-1">
                        <span className="text-gray-500 dark:text-gray-400">Proposed:</span> <span className="font-medium dark:text-white">{cr.proposedValue}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      By {cr.requestedBy?.name || 'Unknown'} on {new Date(cr.createdAt).toLocaleDateString()}
                    </p>
                    {cr.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1">Reason: {cr.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {cr.status}
                    </span>
                  </div>
                </div>

                {/* Review actions — hidden on your own requests (backend blocks self-review) */}
                {canReview && cr.status === 'PENDING' && !isOwn && (
                  <div className="flex gap-2 mt-3 pt-3 border-t dark:border-gray-700">
                    <button
                      onClick={() => approveMutation.mutate(cr.id)}
                      disabled={approveMutation.isPending}
                      className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectingId(cr.id)}
                      disabled={rejectMutation.isPending}
                      className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {canReview && cr.status === 'PENDING' && isOwn && (
                  <p className="mt-3 pt-3 border-t dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
                    Awaiting the other party's review
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
