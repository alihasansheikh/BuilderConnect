import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { supportTicketApi, getApiErrorMessage } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/formatters'
import type { SupportTicket, TicketResponseRecord } from '@/types'

const fieldClasses =
  'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 dark:bg-gray-700 dark:text-white transition-colors'

function roleBaseFor(role?: string): string {
  if (role === 'BUILDER') return '/builder'
  if (role === 'SUPPLIER') return '/supplier'
  return '/client'
}

function MessageBubble({ author, role, at, body }: { author: string; role?: string; at: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card dark:bg-card">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-200">
          {(author || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium dark:text-white">{author || 'User'}</p>
          {role && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {role === 'SUPPORT_AGENT' ? 'Support' : role.replace(/_/g, ' ')}
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(at)}</span>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{body}</p>
    </div>
  )
}

export default function MyTicketDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const base = roleBaseFor(user?.role)
  const ticketId = id ? Number(id) : NaN
  const [replyMessage, setReplyMessage] = useState('')

  const { data: ticket, isLoading, error } = useQuery<SupportTicket>({
    queryKey: ['my-ticket', ticketId],
    queryFn: () => supportTicketApi.getTicket(ticketId).then((r) => r.data),
    enabled: Number.isFinite(ticketId),
  })

  const { data: responses = [] } = useQuery<TicketResponseRecord[]>({
    queryKey: ['my-ticket-responses', ticketId],
    queryFn: () => supportTicketApi.getResponses(ticketId).then((r) => r.data),
    enabled: Number.isFinite(ticketId),
  })

  const replyMutation = useMutation({
    mutationFn: () => supportTicketApi.addResponse(ticketId, { message: replyMessage.trim() }),
    onSuccess: () => {
      toast.success('Reply sent')
      queryClient.invalidateQueries({ queryKey: ['my-ticket-responses', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['my-ticket', ticketId] })
      setReplyMessage('')
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not send your reply')),
  })

  const reopenMutation = useMutation({
    mutationFn: () => supportTicketApi.reopen(ticketId),
    onSuccess: () => {
      toast.success('Ticket reopened')
      queryClient.invalidateQueries({ queryKey: ['my-ticket', ticketId] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not reopen this ticket')),
  })

  if (isLoading) {
    return <LoadingSpinner fullPage label="Loading ticket..." />
  }

  if (error || !ticket) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-500 dark:text-red-400">Failed to load this ticket.</p>
        <Link to={`${base}/support`} className="mt-4 inline-block text-primary hover:underline">
          Back to Help &amp; Support
        </Link>
      </div>
    )
  }

  const closed = ticket.status === 'CLOSED'
  const canReopen = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'

  return (
    <div className="space-y-6">
      <Link
        to={`${base}/support`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Help &amp; Support
      </Link>

      {/* Header */}
      <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{ticket.ticketNumber}</span>
              <StatusBadge status={ticket.status} domain="ticket" />
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                {ticket.category}
              </span>
            </div>
            <h1 className="text-xl font-bold dark:text-white">{ticket.subject}</h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Opened {formatDate(ticket.createdAt)}</p>
          </div>
          {canReopen && (
            <button
              onClick={() => reopenMutation.mutate()}
              disabled={reopenMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <RotateCcw className="h-4 w-4" />
              {reopenMutation.isPending ? 'Reopening...' : 'Reopen ticket'}
            </button>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="space-y-4">
        <MessageBubble
          author={ticket.userName || user?.name || 'You'}
          role={undefined}
          at={ticket.createdAt}
          body={ticket.description}
        />
        {responses.map((resp) => (
          <MessageBubble
            key={resp.id}
            author={resp.userName || 'User'}
            role={resp.userRole}
            at={resp.createdAt}
            body={resp.message}
          />
        ))}
      </div>

      {ticket.resolution && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
          <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">Resolution</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-green-700 dark:text-green-400">{ticket.resolution}</p>
        </div>
      )}

      {/* Reply */}
      {closed ? (
        <div className="rounded-2xl bg-gray-50 p-5 text-center text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          This ticket is closed. Reopen it above if you still need help.
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
          <h3 className="mb-3 text-sm font-semibold dark:text-white">Add a reply</h3>
          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Type your reply..."
            rows={4}
            className={`${fieldClasses} resize-none`}
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => replyMutation.mutate()}
              disabled={!replyMessage.trim() || replyMutation.isPending}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {replyMutation.isPending ? 'Sending...' : 'Send reply'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
