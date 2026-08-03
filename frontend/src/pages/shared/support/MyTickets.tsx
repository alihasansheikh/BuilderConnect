import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, LifeBuoy, MessageSquare, Scale, Ticket } from 'lucide-react'
import { supportTicketApi, disputeApi, getApiErrorMessage } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { SupportTicket, Dispute, DisputeComment } from '@/types'

const CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'DISPUTE', label: 'Dispute' },
  { value: 'VERIFICATION', label: 'Verification' },
  { value: 'FEEDBACK', label: 'Feedback' },
  { value: 'OTHER', label: 'Other' },
]

const TICKET_STATUS_FILTERS: ReadonlyArray<string> = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CUSTOMER',
  'WAITING_INTERNAL',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
]

const ticketSchema = z.object({
  category: z.string().min(1, 'Please choose a category'),
  subject: z.string().trim().min(1, 'Subject is required').max(200, 'Subject must be at most 200 characters'),
  description: z.string().trim().min(1, 'Please describe your issue'),
})

type TicketForm = z.infer<typeof ticketSchema>

/** Optional context passed from a project/order "Get help" / "Report a problem" button. */
interface SupportPrefill {
  projectId?: number
  orderId?: number
}

const fieldClasses =
  'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 dark:bg-gray-700 dark:text-white transition-colors'

function roleBaseFor(role?: string): string {
  if (role === 'BUILDER') return '/builder'
  if (role === 'SUPPLIER') return '/supplier'
  return '/client'
}

// --- Create ticket form ---

function CreateTicketForm({ prefill }: { prefill: SupportPrefill }) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TicketForm>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { category: '', subject: '', description: '' },
  })

  const createMutation = useMutation({
    mutationFn: (data: TicketForm) =>
      supportTicketApi.create({
        category: data.category,
        subject: data.subject.trim(),
        description: data.description.trim(),
        projectId: prefill.projectId,
        orderId: prefill.orderId,
      }),
    onSuccess: () => {
      toast.success('Ticket submitted. Our support team will get back to you.')
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
      reset()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not submit your ticket')),
  })

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold dark:text-white">
        <LifeBuoy className="h-5 w-5 text-primary" />
        Open a new ticket
      </h2>
      <p className="mb-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
        Tell us what you need help with and we'll respond as soon as possible.
      </p>
      {(prefill.projectId || prefill.orderId) && (
        <p className="mb-4 rounded-lg bg-primary/[0.06] px-3 py-2 text-sm text-primary">
          {prefill.projectId ? `Linked to project #${prefill.projectId}` : `Linked to order #${prefill.orderId}`}
        </p>
      )}
      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ticket-category" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Category
            </label>
            <select id="ticket-category" className={fieldClasses} {...register('category')}>
              <option value="">Select a category...</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
          </div>
          <div>
            <label htmlFor="ticket-subject" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Subject
            </label>
            <input
              id="ticket-subject"
              type="text"
              maxLength={200}
              placeholder="Brief summary"
              className={fieldClasses}
              {...register('subject')}
            />
            {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="ticket-description" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="ticket-description"
            rows={4}
            placeholder="Describe your issue in detail..."
            className={`${fieldClasses} resize-none`}
            {...register('description')}
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/25 transition-all"
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}

// --- My tickets list ---

function MyTicketsList({ base }: { base: string }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['my-tickets', statusFilter, page],
    queryFn: async () => {
      const params: { page: number; size: number; status?: string } = { page, size: 10 }
      if (statusFilter) params.status = statusFilter
      const res = await supportTicketApi.getTickets(params)
      return res.data
    },
  })

  const tickets: SupportTicket[] = data?.content ?? []
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold dark:text-white">Your tickets</h2>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(0)
          }}
          className="px-3 py-2 border dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
        >
          <option value="">All statuses</option>
          {TICKET_STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Loading tickets..." className="py-10" />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-10 w-10 text-gray-400" />}
          title="No tickets yet"
          description="When you open a support ticket, it will show up here."
        />
      ) : (
        <>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`${base}/support/tickets/${ticket.id}`}
                className="block rounded-xl border border-gray-100 p-4 transition-colors hover:border-primary/40 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-gray-400 dark:text-gray-500">{ticket.ticketNumber}</p>
                    <p className="mt-0.5 truncate font-medium text-gray-900 dark:text-white">{ticket.subject}</p>
                  </div>
                  <StatusBadge status={ticket.status} domain="ticket" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700 dark:text-gray-300">
                    {ticket.category}
                  </span>
                  <span>Opened {formatDate(ticket.createdAt)}</span>
                  {ticket.responseCount != null && ticket.responseCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {ticket.responseCount}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
        </>
      )}
    </div>
  )
}

// --- My disputes tab ---

function DisputeCommentsPanel({ disputeId, canComment }: { disputeId: number; canComment: boolean }) {
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState('')

  const { data: comments = [], isLoading } = useQuery<DisputeComment[]>({
    queryKey: ['dispute-comments', disputeId],
    queryFn: () => disputeApi.getComments(disputeId).then((r) => r.data),
  })

  const addComment = useMutation({
    mutationFn: () => disputeApi.addComment(disputeId, { comment: commentText.trim() }),
    onSuccess: () => {
      toast.success('Comment added')
      queryClient.invalidateQueries({ queryKey: ['dispute-comments', disputeId] })
      setCommentText('')
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not add your comment')),
  })

  return (
    <div className="mt-4 border-t pt-4 dark:border-gray-700">
      <h4 className="mb-3 text-sm font-semibold dark:text-white">Comments ({comments.length})</h4>
      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet.</p>
      ) : (
        <div className="mb-4 max-h-72 space-y-3 overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-medium dark:text-white">{comment.userName || 'User'}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{comment.comment}</p>
            </div>
          ))}
        </div>
      )}

      {canComment && (
        <div>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className={`${fieldClasses} resize-none`}
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => addComment.mutate()}
              disabled={!commentText.trim() || addComment.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {addComment.isPending ? 'Adding...' : 'Add comment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MyDisputesTab() {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-disputes'],
    queryFn: () => disputeApi.getDisputes().then((r) => r.data),
  })

  const disputes: Dispute[] = data?.content ?? []

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
      <h2 className="mb-1 text-lg font-semibold dark:text-white">Your disputes</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Disputes you've filed or that were filed against you on a project.
      </p>

      {isLoading ? (
        <LoadingSpinner label="Loading disputes..." className="py-10" />
      ) : disputes.length === 0 ? (
        <EmptyState
          icon={<Scale className="h-10 w-10 text-gray-400" />}
          title="No disputes"
          description="You can file a dispute from a project page if something goes wrong."
        />
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => {
            const expanded = expandedId === dispute.id
            const isClosed = dispute.status === 'CLOSED' || dispute.status === 'RESOLVED'
            return (
              <div key={dispute.id} className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setExpandedId(expanded ? null : dispute.id)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{dispute.disputeNumber}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {dispute.disputeType.replace(/_/g, ' ')}
                      </span>
                      <StatusBadge status={dispute.status} domain="dispute" />
                    </div>
                    <p className="mt-1 truncate font-medium text-gray-900 dark:text-white">{dispute.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {dispute.projectTitle || `Project #${dispute.projectId}`} · Filed {formatDate(dispute.createdAt)}
                    </p>
                  </div>
                  <ChevronDown className={cn('mt-1 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform', expanded && 'rotate-180')} />
                </button>

                {expanded && (
                  <div className="border-t p-4 dark:border-gray-700">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</h4>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                        {dispute.description}
                      </p>
                    </div>
                    {dispute.resolutionDetails && (
                      <div className="mt-3 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                        <h4 className="text-sm font-semibold text-green-800 dark:text-green-300">Resolution</h4>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-green-700 dark:text-green-400">
                          {dispute.resolutionDetails}
                        </p>
                      </div>
                    )}
                    <DisputeCommentsPanel disputeId={dispute.id} canComment={!isClosed} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Page ---

export default function MyTickets() {
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const base = roleBaseFor(user?.role)

  const prefill = (location.state as SupportPrefill | null) ?? {}
  const tab = searchParams.get('tab') === 'disputes' ? 'disputes' : 'tickets'
  const setTab = (next: 'tickets' | 'disputes') =>
    setSearchParams(next === 'disputes' ? { tab: 'disputes' } : {}, { replace: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Help & Support</h1>
        <p className="text-gray-600 dark:text-gray-400">Open a ticket or track your disputes.</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800 w-fit">
        <button
          onClick={() => setTab('tickets')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'tickets'
              ? 'bg-white text-primary shadow-sm dark:bg-card'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          )}
        >
          <Ticket className="h-4 w-4" />
          Tickets
        </button>
        <button
          onClick={() => setTab('disputes')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'disputes'
              ? 'bg-white text-primary shadow-sm dark:bg-card'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          )}
        >
          <Scale className="h-4 w-4" />
          Disputes
        </button>
      </div>

      {tab === 'tickets' ? (
        <>
          <CreateTicketForm prefill={prefill} />
          <MyTicketsList base={base} />
        </>
      ) : (
        <MyDisputesTab />
      )}
    </div>
  )
}
