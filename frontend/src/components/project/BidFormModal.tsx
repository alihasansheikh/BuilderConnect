import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { bidApi, leadApi, getApiErrorMessage, getApiValidationErrors } from '@/services/api'
import { formatBudgetRange, formatCurrency, formatDate, formatStatus } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Project } from '@/types'
import { X, ChevronDown, Send, Loader2 } from 'lucide-react'

/** Server-enforced bounds — mirror backend BidCreateRequest + app.platform.* in application.yml. */
const MIN_BID_AMOUNT_PKR = 1000
const MIN_PROPOSAL_CHARS = 100
const MAX_PROPOSAL_CHARS = 5000
const MAX_WORK_PLAN_CHARS = 5000
const MIN_DURATION_DAYS = 1
const LEAD_CREDIT_COST_PER_BID = 1

/** DTO field names the backend can return in validationErrors that we render inline. */
const KNOWN_ERROR_FIELDS = new Set([
  'amount',
  'proposal',
  'estimatedDurationDays',
  'workPlan',
  'laborCost',
  'materialCost',
  'otherCost',
])

interface BidFormState {
  amount: string
  proposal: string
  estimatedDurationDays: string
  workPlan: string
  laborCost: string
  materialCost: string
  otherCost: string
}

const createEmptyForm = (): BidFormState => ({
  amount: '',
  proposal: '',
  estimatedDurationDays: '',
  workPlan: '',
  laborCost: '',
  materialCost: '',
  otherCost: '',
})

interface BidFormModalProps {
  projectId: number
  projectTitle: string
  /** Full project (when the parent has it) — enables the context line under the title. */
  project?: Project
  budgetMin?: number | null
  budgetMax?: number | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

/** "Karachi · House · 10 Marla · Rs 200,000 - Rs 500,000" — what the builder is bidding on. */
function projectContextLine(project: Project): string {
  const parts: string[] = []
  if (project.city) parts.push(project.city)
  if (project.propertyType) parts.push(formatStatus(project.propertyType))
  if (project.areaValue != null && project.areaUnit) {
    parts.push(`${project.areaValue} ${formatStatus(project.areaUnit)}`)
  }
  if (project.budgetMin != null || project.budgetMax != null) {
    parts.push(formatBudgetRange(project.budgetMin, project.budgetMax))
  }
  return parts.join(' · ')
}

function fieldInputClasses(hasError: boolean): string {
  return cn(
    'w-full px-4 py-3 border rounded-xl dark:bg-gray-700/50 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors text-sm',
    hasError ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-600',
  )
}

interface FieldErrorProps {
  id: string
  message?: string
}

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null
  return (
    <p id={id} className="mt-1 text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  )
}

interface BreakdownInputProps {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}

function BreakdownInput({ id, label, value, error, onChange }: BreakdownInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <input
        id={id}
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        min={0}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          'w-full px-3 py-2.5 border dark:bg-gray-700/50 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm',
          error ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-600',
        )}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

export default function BidFormModal({
  projectId,
  projectTitle,
  project,
  budgetMin,
  budgetMax,
  isOpen,
  onClose,
  onSuccess,
}: BidFormModalProps) {
  const queryClient = useQueryClient()
  const [showCostBreakdown, setShowCostBreakdown] = useState(false)
  const [form, setForm] = useState<BidFormState>(createEmptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { data: creditBalance } = useQuery({
    queryKey: ['lead-credits-balance'],
    queryFn: () => leadApi.getCreditBalance().then(r => r.data),
    enabled: isOpen,
  })
  const leadCredits = creditBalance?.credits
  const hasNoCredits = leadCredits === 0

  const updateField = (field: keyof BidFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => {
      if (!(field in prev)) return prev
      return Object.fromEntries(Object.entries(prev).filter(([key]) => key !== field))
    })
  }

  const resetForm = () => {
    setForm(createEmptyForm())
    setShowCostBreakdown(false)
    setFieldErrors({})
  }

  const amountValue = Number(form.amount)
  const proposalChars = form.proposal.trim().length
  const isValid =
    form.amount !== '' &&
    amountValue >= MIN_BID_AMOUNT_PKR &&
    proposalChars >= MIN_PROPOSAL_CHARS &&
    Number(form.estimatedDurationDays) >= MIN_DURATION_DAYS

  const breakdownParts = [form.laborCost, form.materialCost, form.otherCost]
  const hasBreakdownValue = breakdownParts.some(part => part !== '')
  const breakdownTotal = breakdownParts.reduce((sum, part) => sum + (Number(part) || 0), 0)
  const breakdownDiffersFromAmount =
    hasBreakdownValue && form.amount !== '' && breakdownTotal !== amountValue

  const submitMutation = useMutation({
    mutationFn: () =>
      bidApi.create({
        projectId,
        amount: amountValue,
        proposal: form.proposal.trim(),
        estimatedDurationDays: Number(form.estimatedDurationDays),
        workPlan: form.workPlan.trim() || undefined,
        laborCost: form.laborCost ? Number(form.laborCost) : undefined,
        materialCost: form.materialCost ? Number(form.materialCost) : undefined,
        otherCost: form.otherCost ? Number(form.otherCost) : undefined,
      }),
    onSuccess: ({ data }) => {
      // validUntil is server-set (admin-configurable validity window), so the hint stays accurate.
      toast.success(
        data.validUntil
          ? `Bid submitted — valid until ${formatDate(data.validUntil)}`
          : 'Bid submitted successfully!',
      )
      queryClient.invalidateQueries({ queryKey: ['builder-bids'] })
      queryClient.invalidateQueries({ queryKey: ['marketplace-projects'] })
      queryClient.invalidateQueries({ queryKey: ['marketplace-project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['lead-credits-balance'] })
      resetForm()
      onSuccess()
    },
    onError: (error: unknown) => {
      const validationErrors = getApiValidationErrors(error)
      const hasInlineTarget = Object.keys(validationErrors).some(key => KNOWN_ERROR_FIELDS.has(key))
      if (hasInlineTarget) {
        setFieldErrors(validationErrors)
        return
      }
      toast.error(getApiErrorMessage(error, 'Failed to submit bid. Please try again.'))
    },
  })

  const handleOpenChange = (open: boolean) => {
    if (!open && !submitMutation.isPending) {
      resetForm()
      onClose()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValid || submitMutation.isPending || hasNoCredits) return
    setFieldErrors({})
    submitMutation.mutate()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] animate-fade-in" />
        {/* animate-fade-in (opacity-only) — scale-in's `forwards` transform keyframe would
            overwrite the centering translates and displace the dialog off-viewport. */}
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white shadow-card dark:bg-card animate-fade-in">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700/50">
            <div className="flex items-start justify-between">
              <div>
                <Dialog.Title className="text-xl font-bold dark:text-white">Place a Bid</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-1 line-clamp-1">{projectTitle}</Dialog.Description>
                {project && projectContextLine(project) && (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{projectContextLine(project)}</p>
                )}
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={submitMutation.isPending}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <div className="mt-3 px-3 py-2 bg-primary/[0.06] dark:bg-primary/10 rounded-lg">
              <p className="text-xs font-medium text-primary">
                Project Budget: {formatBudgetRange(budgetMin, budgetMax)}
              </p>
              {leadCredits != null && (
                hasNoCredits ? (
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    You have no lead credits left —{' '}
                    <Link
                      to="/builder/subscription"
                      onClick={() => handleOpenChange(false)}
                      className="font-semibold underline hover:opacity-80"
                    >
                      upgrade your plan
                    </Link>{' '}
                    to place bids.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bidding uses {LEAD_CREDIT_COST_PER_BID} lead credit — you have {leadCredits}.
                  </p>
                )
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            {/* Form Body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Bid Amount */}
              <div>
                <label htmlFor="bid-amount" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Bid Amount (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  id="bid-amount"
                  type="number"
                  value={form.amount}
                  onChange={e => updateField('amount', e.target.value)}
                  placeholder="e.g. 450000"
                  min={MIN_BID_AMOUNT_PKR}
                  aria-required="true"
                  aria-invalid={fieldErrors.amount ? true : undefined}
                  aria-describedby={fieldErrors.amount ? 'bid-amount-error' : 'bid-amount-hint'}
                  className={fieldInputClasses(Boolean(fieldErrors.amount))}
                />
                {fieldErrors.amount ? (
                  <FieldError id="bid-amount-error" message={fieldErrors.amount} />
                ) : (
                  <p id="bid-amount-hint" className="mt-1 text-xs text-muted-foreground">
                    Minimum bid: {formatCurrency(MIN_BID_AMOUNT_PKR)}
                  </p>
                )}
              </div>

              {/* Proposal */}
              <div>
                <label htmlFor="bid-proposal" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Proposal <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="bid-proposal"
                  value={form.proposal}
                  onChange={e => updateField('proposal', e.target.value)}
                  placeholder="Describe your approach, experience, and why you're the best fit for this project..."
                  rows={4}
                  maxLength={MAX_PROPOSAL_CHARS}
                  aria-required="true"
                  aria-invalid={fieldErrors.proposal ? true : undefined}
                  aria-describedby={fieldErrors.proposal ? 'bid-proposal-error' : 'bid-proposal-counter'}
                  className={cn(fieldInputClasses(Boolean(fieldErrors.proposal)), 'resize-none')}
                />
                <p
                  id="bid-proposal-counter"
                  aria-live="polite"
                  className={`text-xs mt-1 ${proposalChars >= MIN_PROPOSAL_CHARS ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {proposalChars}/{MIN_PROPOSAL_CHARS} characters minimum
                </p>
                <FieldError id="bid-proposal-error" message={fieldErrors.proposal} />
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="bid-duration" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Estimated Duration (days) <span className="text-red-500">*</span>
                </label>
                <input
                  id="bid-duration"
                  type="number"
                  value={form.estimatedDurationDays}
                  onChange={e => updateField('estimatedDurationDays', e.target.value)}
                  placeholder="e.g. 30"
                  min={MIN_DURATION_DAYS}
                  aria-required="true"
                  aria-invalid={fieldErrors.estimatedDurationDays ? true : undefined}
                  aria-describedby={fieldErrors.estimatedDurationDays ? 'bid-duration-error' : undefined}
                  className={fieldInputClasses(Boolean(fieldErrors.estimatedDurationDays))}
                />
                <FieldError id="bid-duration-error" message={fieldErrors.estimatedDurationDays} />
              </div>

              {/* Cost Breakdown Toggle */}
              <button
                type="button"
                onClick={() => setShowCostBreakdown(prev => !prev)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                aria-expanded={showCostBreakdown}
                aria-label="Toggle cost breakdown"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showCostBreakdown ? 'rotate-180' : ''}`} />
                Cost Breakdown (optional)
              </button>

              {showCostBreakdown && (
                <div className="space-y-3 animate-slide-up">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <BreakdownInput
                      id="bid-labor"
                      label="Labor (PKR)"
                      value={form.laborCost}
                      error={fieldErrors.laborCost}
                      onChange={value => updateField('laborCost', value)}
                    />
                    <BreakdownInput
                      id="bid-material"
                      label="Material (PKR)"
                      value={form.materialCost}
                      error={fieldErrors.materialCost}
                      onChange={value => updateField('materialCost', value)}
                    />
                    <BreakdownInput
                      id="bid-other"
                      label="Other (PKR)"
                      value={form.otherCost}
                      error={fieldErrors.otherCost}
                      onChange={value => updateField('otherCost', value)}
                    />
                  </div>
                  {hasBreakdownValue && (
                    <div className="rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 px-3 py-2 text-xs" aria-live="polite">
                      <p className="text-gray-700 dark:text-gray-300">
                        Breakdown total:{' '}
                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(breakdownTotal)}</span>
                      </p>
                      {breakdownDiffersFromAmount && (
                        <p className="mt-1 text-amber-600 dark:text-amber-400">
                          The breakdown total differs from your bid amount of {formatCurrency(amountValue)}. This is informational and won't block submission.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Work Plan */}
              <div>
                <label htmlFor="bid-workplan" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Work Plan <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  id="bid-workplan"
                  value={form.workPlan}
                  onChange={e => updateField('workPlan', e.target.value)}
                  placeholder="Outline your step-by-step approach, milestones, and timeline..."
                  rows={3}
                  maxLength={MAX_WORK_PLAN_CHARS}
                  aria-invalid={fieldErrors.workPlan ? true : undefined}
                  aria-describedby={fieldErrors.workPlan ? 'bid-workplan-error' : undefined}
                  className={cn(fieldInputClasses(Boolean(fieldErrors.workPlan)), 'resize-none')}
                />
                <FieldError id="bid-workplan-error" message={fieldErrors.workPlan} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-700/50 px-6 py-4">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={submitMutation.isPending}
                  className="px-5 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={!isValid || submitMutation.isPending || hasNoCredits}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Bid
                  </>
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
