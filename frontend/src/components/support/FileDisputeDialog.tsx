import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { disputeApi, milestoneApi, getApiErrorMessage } from '@/services/api'
import { ModalShell } from '@/components/ui/ModalShell'
import type { Milestone } from '@/types'

// Must match the DisputeType SQL enum (PAYMENT/QUALITY/TIMELINE/SCOPE/COMMUNICATION/ABANDONMENT/OTHER).
const DISPUTE_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'QUALITY', label: 'Quality of work' },
  { value: 'TIMELINE', label: 'Timeline / delays' },
  { value: 'SCOPE', label: 'Scope of work' },
  { value: 'COMMUNICATION', label: 'Communication' },
  { value: 'ABANDONMENT', label: 'Abandonment' },
  { value: 'OTHER', label: 'Other' },
]

const disputeSchema = z.object({
  disputeType: z.string().min(1, 'Please choose a dispute type'),
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().trim().min(1, 'Please describe the issue'),
  milestoneId: z.string().optional(),
  disputedAmount: z.string().optional(),
})

type DisputeForm = z.infer<typeof disputeSchema>

const fieldClasses =
  'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary/20 dark:bg-gray-700 dark:text-white transition-colors'

interface FileDisputeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  /** Called after a dispute is successfully filed (e.g. to refresh a list). */
  onFiled?: () => void
}

/**
 * Party-restricted dispute filing form. The respondent is inferred server-side as the project
 * counterpart (client ↔ awarded builder), so no "filed against" field is shown here.
 */
export function FileDisputeDialog({ open, onOpenChange, projectId, onFiled }: FileDisputeDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DisputeForm>({
    resolver: zodResolver(disputeSchema),
    defaultValues: { disputeType: '', title: '', description: '', milestoneId: '', disputedAmount: '' },
  })

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: ['project-milestones', projectId],
    queryFn: () => milestoneApi.getProjectMilestones(projectId).then((r) => r.data),
    enabled: open && Number.isFinite(projectId),
  })

  const fileMutation = useMutation({
    mutationFn: (data: DisputeForm) => {
      const amount = data.disputedAmount ? Number(data.disputedAmount) : undefined
      return disputeApi.file(projectId, {
        disputeType: data.disputeType,
        title: data.title.trim(),
        description: data.description.trim(),
        milestoneId: data.milestoneId ? Number(data.milestoneId) : undefined,
        disputedAmount: amount != null && Number.isFinite(amount) ? amount : undefined,
      })
    },
    onSuccess: () => {
      toast.success('Dispute filed. Our support team will review it shortly.')
      queryClient.invalidateQueries({ queryKey: ['my-disputes'] })
      onFiled?.()
      onOpenChange(false)
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Could not file this dispute')),
  })

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="File a dispute"
      description="Raise a formal dispute with the other party on this project. Support will mediate."
      closeDisabled={fileMutation.isPending}
      footer={
        <>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={fileMutation.isPending}
            className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="file-dispute-form"
            disabled={fileMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {fileMutation.isPending ? 'Filing...' : 'File dispute'}
          </button>
        </>
      }
    >
      <form
        id="file-dispute-form"
        onSubmit={handleSubmit((data) => fileMutation.mutate(data))}
        className="space-y-4"
      >
        <div>
          <label htmlFor="disputeType" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Dispute type
          </label>
          <select id="disputeType" className={fieldClasses} {...register('disputeType')}>
            <option value="">Select a dispute type...</option>
            {DISPUTE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {errors.disputeType && <p className="mt-1 text-sm text-red-600">{errors.disputeType.message}</p>}
        </div>

        <div>
          <label htmlFor="dispute-title" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Title
          </label>
          <input
            id="dispute-title"
            type="text"
            maxLength={200}
            placeholder="Brief summary of the issue"
            className={fieldClasses}
            {...register('title')}
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="dispute-description" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="dispute-description"
            rows={4}
            placeholder="Explain what went wrong and what outcome you're seeking..."
            className={`${fieldClasses} resize-none`}
            {...register('description')}
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dispute-milestone" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Related milestone <span className="text-gray-400">(optional)</span>
            </label>
            <select id="dispute-milestone" className={fieldClasses} {...register('milestoneId')}>
              <option value="">None</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dispute-amount" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Disputed amount (PKR) <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="dispute-amount"
              type="number"
              min={0}
              step="0.01"
              placeholder="0"
              className={fieldClasses}
              {...register('disputedAmount')}
            />
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
