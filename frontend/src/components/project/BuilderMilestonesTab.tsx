import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle, ChevronDown, Clock, ExternalLink, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { getApiErrorMessage, milestoneApi } from '@/services/api'
import type { Milestone, Project, ProjectStatus } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn, resolveAssetUrl } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ModalShell } from '@/components/ui/ModalShell'
import MilestoneTimeline from '@/components/project/MilestoneTimeline'
import { MilestoneFormModal } from '@/components/project/MilestoneFormModal'

/** Project states in which the awarded builder may add/edit/remove milestones. */
const MILESTONE_MANAGE_STATUSES: ReadonlyArray<ProjectStatus> = ['AWARDED', 'CONTRACT_PENDING', 'IN_PROGRESS']

/** Work flow: IN_PROGRESS → COMPLETED → APPROVED/REJECTED → PAID → CONFIRMED. Hints per stage. */
const WORKFLOW_HINTS: Partial<Record<Milestone['status'], string>> = {
  PENDING: 'Not started yet — milestones start automatically as earlier ones are paid',
  IN_PROGRESS: 'In progress — mark the work complete when done to request client approval',
  COMPLETED: 'Awaiting client approval of the completed work',
  UNDER_REVIEW: 'Awaiting client approval of the completed work',
  APPROVED: 'Work approved — awaiting client payment',
}

/** The builder can (re)submit work while the milestone is active or was sent back for changes. */
function canMarkComplete(status: Milestone['status']): boolean {
  return status === 'IN_PROGRESS' || status === 'REJECTED'
}

function MilestoneStatusIcon({ status }: { status: Milestone['status'] }) {
  if (status === 'CONFIRMED') {
    return <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
  }
  if (status === 'PAID') {
    return <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400" />
  }
  if (status === 'REJECTED' || status === 'DISPUTED') {
    return <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
  }
  return <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
}

/** Opens the client's uploaded payment proof (image/PDF served from /uploads) in a new tab. */
function ProofLink({ url }: { url?: string }) {
  const resolved = resolveAssetUrl(url)
  if (!resolved) return null
  return (
    <a
      href={resolved}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      View proof
    </a>
  )
}

/** Milestone body detail: confirmed date, client note + proof, rejection feedback, or a work-flow hint. */
function PaymentInfo({ milestone }: { milestone: Milestone }) {
  if (milestone.status === 'CONFIRMED') {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
          <CheckCircle className="h-3.5 w-3.5" />
          Payment confirmed{milestone.paymentConfirmedAt ? ` ${formatDate(milestone.paymentConfirmedAt)}` : ''}
        </span>
        <ProofLink url={milestone.paymentProofUrl} />
      </div>
    )
  }
  if (milestone.status === 'PAID') {
    return (
      <div className="mt-2 flex flex-col gap-1.5">
        {milestone.paymentNote && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Client note:</span> {milestone.paymentNote}
          </p>
        )}
        <ProofLink url={milestone.paymentProofUrl} />
      </div>
    )
  }
  if (milestone.status === 'REJECTED') {
    return (
      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
        <p>
          <span className="font-medium">Changes requested</span>
          {milestone.rejectionReason ? `: ${milestone.rejectionReason}` : ''}
        </p>
        <p className="mt-0.5">Address the feedback, then resubmit the work for approval.</p>
      </div>
    )
  }
  const hint = WORKFLOW_HINTS[milestone.status]
  if (!hint) return null
  return <p className="mt-2 text-xs italic text-gray-400 dark:text-gray-500">{hint}</p>
}

interface MilestoneActionsProps {
  milestone: Milestone
  canManage: boolean
  confirming: boolean
  onConfirm: () => void
  onComplete: (milestone: Milestone) => void
  onEdit: (milestone: Milestone) => void
  onDelete: (milestone: Milestone) => void
}

function MilestoneActions({
  milestone,
  canManage,
  confirming,
  onConfirm,
  onComplete,
  onEdit,
  onDelete,
}: MilestoneActionsProps) {
  if (milestone.status === 'PAID' && !milestone.paymentConfirmedAt) {
    return (
      <button
        onClick={onConfirm}
        disabled={confirming}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {confirming ? 'Confirming...' : 'Confirm payment received'}
      </button>
    )
  }
  if (canMarkComplete(milestone.status) && canManage) {
    return (
      <button
        onClick={() => onComplete(milestone)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90"
      >
        {milestone.status === 'REJECTED' ? 'Resubmit work' : 'Mark work complete'}
      </button>
    )
  }
  // Backend only allows editing/deleting a PENDING milestone.
  if (milestone.status === 'PENDING' && canManage) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onEdit(milestone)}
          aria-label="Edit milestone"
          className="rounded-md border px-2 py-1.5 text-gray-500 transition-colors hover:text-primary dark:border-gray-600 dark:text-gray-400"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(milestone)}
          aria-label="Delete milestone"
          className="rounded-md border px-2 py-1.5 text-gray-500 transition-colors hover:text-red-500 dark:border-gray-600 dark:text-gray-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }
  return null
}

interface MilestoneItemProps {
  milestone: Milestone
  projectId: number
  canPostUpdates: boolean
  canManage: boolean
  onComplete: (milestone: Milestone) => void
  onEdit: (milestone: Milestone) => void
  onDelete: (milestone: Milestone) => void
}

function MilestoneItem({
  milestone,
  projectId,
  canPostUpdates,
  canManage,
  onComplete,
  onEdit,
  onDelete,
}: MilestoneItemProps) {
  const queryClient = useQueryClient()
  const [showUpdates, setShowUpdates] = useState(false)

  const confirmMutation = useMutation({
    mutationFn: () => milestoneApi.confirmPayment(milestone.id),
    onSuccess: () => {
      toast.success(`Payment for "${milestone.title}" confirmed`)
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] })
      queryClient.invalidateQueries({ queryKey: ['builder-project', projectId] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to confirm payment')),
  })

  return (
    <div className="rounded-lg border dark:border-gray-700">
      <div className="flex items-start gap-4 p-4">
        <div className="mt-0.5">
          <MilestoneStatusIcon status={milestone.status} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-400 dark:text-gray-500">#{milestone.sequenceOrder}</span>
            <h4 className="font-medium dark:text-white">{milestone.title}</h4>
            <StatusBadge status={milestone.status} domain="milestone" />
          </div>
          {milestone.description && (
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{milestone.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatCurrency(milestone.paymentAmount)}</span>
            {milestone.dueDate && <span>Due: {formatDate(milestone.dueDate)}</span>}
          </div>
          <PaymentInfo milestone={milestone} />
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          <MilestoneActions
            milestone={milestone}
            canManage={canManage}
            confirming={confirmMutation.isPending}
            onConfirm={() => confirmMutation.mutate()}
            onComplete={onComplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>

      <button
        onClick={() => setShowUpdates((open) => !open)}
        aria-expanded={showUpdates}
        className="flex w-full items-center justify-between border-t px-4 py-2 text-xs font-medium text-gray-500 transition-colors hover:text-primary dark:border-gray-700 dark:text-gray-400 dark:hover:text-primary"
      >
        <span>Updates</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', showUpdates && 'rotate-180')} />
      </button>
      {showUpdates && (
        <div className="border-t p-4 dark:border-gray-700">
          <MilestoneTimeline milestoneId={milestone.id} canPost={canPostUpdates} />
        </div>
      )}
    </div>
  )
}

function ScheduleMeter({ scheduled, finalBudget }: { scheduled: number; finalBudget: number }) {
  const pct = finalBudget > 0 ? Math.min(Math.round((scheduled / finalBudget) * 100), 100) : 0
  const remaining = Math.max(finalBudget - scheduled, 0)
  return (
    <div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/40">
      <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-sm">
        <span className="text-gray-500 dark:text-gray-400">Payment schedule</span>
        <span className="font-medium dark:text-white">
          {formatCurrency(scheduled)} of {formatCurrency(finalBudget)} scheduled
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{formatCurrency(remaining)} left to schedule</p>
    </div>
  )
}

function CompleteWorkModal({
  target,
  onClose,
  onCompleted,
}: {
  target: Milestone | null
  onClose: () => void
  onCompleted: () => void
}) {
  const [note, setNote] = useState('')

  const close = () => {
    setNote('')
    onClose()
  }

  const mutation = useMutation({
    // Backend reads a single string under "evidence" (@RequestBody Map<String,String>).
    mutationFn: () => milestoneApi.complete(target!.id, note.trim() ? { evidence: note.trim() } : {}),
    onSuccess: () => {
      toast.success('Work marked complete — the client has been asked to review it')
      onCompleted()
      close()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to mark work complete')),
  })

  const resubmitting = target?.status === 'REJECTED'

  const footer = (
    <>
      <button
        type="button"
        onClick={close}
        disabled={mutation.isPending}
        className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {mutation.isPending ? 'Submitting...' : resubmitting ? 'Resubmit work' : 'Mark complete'}
      </button>
    </>
  )

  return (
    <ModalShell
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) close()
      }}
      title={resubmitting ? 'Resubmit work' : 'Mark work complete'}
      size="sm"
      closeDisabled={mutation.isPending}
      footer={footer}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {resubmitting ? 'Resubmit' : 'Submit'} the work on{' '}
          <span className="font-semibold dark:text-white">{target?.title}</span> for the client's approval. Once
          approved, the client pays this milestone.
        </p>
        <div>
          <label
            htmlFor="complete-note"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Note for the client (optional)
          </label>
          <textarea
            id="complete-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="What was done, anything the client should check..."
            className="w-full rounded-md border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
    </ModalShell>
  )
}

function DeleteMilestoneDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: Milestone | null
  onClose: () => void
  onDeleted: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => milestoneApi.remove(target!.id),
    onSuccess: () => {
      toast.success('Milestone deleted')
      onDeleted()
      onClose()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to delete milestone')),
  })

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={mutation.isPending}
        className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {mutation.isPending ? 'Deleting...' : 'Delete'}
      </button>
    </>
  )

  return (
    <ModalShell
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
      title="Delete milestone"
      size="sm"
      closeDisabled={mutation.isPending}
      footer={footer}
    >
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Delete <span className="font-semibold dark:text-white">{target?.title}</span>? This removes it from the
        payment schedule and cannot be undone.
      </p>
    </ModalShell>
  )
}

interface BuilderMilestonesTabProps {
  project: Project
  projectId: number
  milestones: Milestone[]
}

/** Builder-facing milestone workspace: define the schedule, edit/delete drafts, confirm received payments. */
export default function BuilderMilestonesTab({ project, projectId, milestones }: BuilderMilestonesTabProps) {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Milestone | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Milestone | null>(null)
  const [completeTarget, setCompleteTarget] = useState<Milestone | null>(null)

  const sorted = [...milestones].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
  const scheduled = milestones.reduce((sum, m) => sum + (m.paymentAmount ?? 0), 0)
  const finalBudget = project.finalBudget ?? 0
  const remaining = Math.max(finalBudget - scheduled, 0)
  const canManage = MILESTONE_MANAGE_STATUSES.includes(project.status)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] })
    queryClient.invalidateQueries({ queryKey: ['builder-project', projectId] })
  }

  const openAdd = () => {
    setEditTarget(null)
    setModalOpen(true)
  }
  const openEdit = (milestone: Milestone) => {
    setEditTarget(milestone)
    setModalOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold dark:text-white">Milestones</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define the payment schedule, mark work complete for the client's approval, and confirm the payments
            you receive.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add milestone
          </button>
        )}
      </div>

      {finalBudget > 0 && <ScheduleMeter scheduled={scheduled} finalBudget={finalBudget} />}

      {sorted.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
          No milestones yet.{canManage ? ' Add milestones to build the payment schedule.' : ''}
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((milestone) => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              projectId={projectId}
              canPostUpdates={project.status === 'IN_PROGRESS'}
              canManage={canManage}
              onComplete={setCompleteTarget}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <MilestoneFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        projectId={projectId}
        milestone={editTarget}
        remainingBudget={remaining}
        onSaved={invalidate}
      />
      <CompleteWorkModal target={completeTarget} onClose={() => setCompleteTarget(null)} onCompleted={invalidate} />
      <DeleteMilestoneDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={invalidate} />
    </div>
  )
}
