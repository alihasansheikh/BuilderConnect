import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, Save } from 'lucide-react'
import { ModalShell } from '@/components/ui/ModalShell'
import { milestoneApi, getApiErrorMessage, getApiValidationErrors } from '@/services/api'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { CreateMilestoneRequest, Milestone } from '@/types'

/** A submit button in ModalShell's footer targets the form body via this shared id. */
const FORM_ID = 'milestone-form'
const MIN_AMOUNT_PKR = 1 // server floor for milestone amount (PKR)
/** DTO field names the backend can return in validationErrors that we render inline. */
const KNOWN_ERROR_FIELDS = new Set(['title', 'description', 'amount', 'dueDate'])
const LABEL_CLASS = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5'

interface MilestoneFormState {
  title: string
  description: string
  amount: string
  dueDate: string
}

/** ISO date/datetime -> YYYY-MM-DD for a native date input. */
function toDateInputValue(value?: string): string {
  return value ? value.slice(0, 10) : ''
}

function createFormState(milestone?: Milestone | null): MilestoneFormState {
  return {
    title: milestone?.title ?? '',
    description: milestone?.description ?? '',
    amount: milestone?.paymentAmount != null ? String(milestone.paymentAmount) : '',
    dueDate: toDateInputValue(milestone?.dueDate),
  }
}

function fieldClasses(hasError: boolean): string {
  return cn(
    'w-full px-4 py-2.5 border rounded-lg dark:bg-gray-700/50 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors text-sm',
    hasError ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-600',
  )
}

interface FieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}

function Field({ id, label, required, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}{' '}
        {required ? (
          <span className="text-red-500">*</span>
        ) : (
          <span className="font-normal text-muted-foreground">(optional)</span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

interface MilestoneFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  milestone?: Milestone | null
  remainingBudget: number
  onSaved: () => void
}

export function MilestoneFormModal({
  open,
  onOpenChange,
  projectId,
  milestone,
  remainingBudget,
  onSaved,
}: MilestoneFormModalProps) {
  const isEditing = Boolean(milestone)
  const [form, setForm] = useState<MilestoneFormState>(() => createFormState(milestone))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Prefill (edit) or clear (add) each time the modal opens or its target milestone changes.
  useEffect(() => {
    if (open) {
      setForm(createFormState(milestone))
      setFieldErrors({})
    }
  }, [open, milestone])

  const updateField = (field: keyof MilestoneFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => {
      if (!(field in prev)) return prev
      return Object.fromEntries(Object.entries(prev).filter(([key]) => key !== field))
    })
  }

  const amountValue = Number(form.amount)
  // Editing: the milestone's own amount already counts against the budget, so add it back.
  const advisoryCap = isEditing ? remainingBudget + (milestone?.paymentAmount ?? 0) : remainingBudget
  const overBudget = form.amount !== '' && Number.isFinite(amountValue) && amountValue > advisoryCap
  const isValid = form.title.trim() !== '' && form.amount !== '' && amountValue >= MIN_AMOUNT_PKR

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateMilestoneRequest = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        amount: amountValue,
        dueDate: form.dueDate || undefined,
      }
      return milestone ? milestoneApi.update(milestone.id, body) : milestoneApi.create(projectId, body)
    },
    onSuccess: () => {
      toast.success(milestone ? 'Milestone updated' : 'Milestone added')
      onSaved()
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      const validationErrors = getApiValidationErrors(error)
      const hasInlineTarget = Object.keys(validationErrors).some(key => KNOWN_ERROR_FIELDS.has(key))
      if (hasInlineTarget) {
        setFieldErrors(validationErrors)
        return
      }
      toast.error(getApiErrorMessage(error, 'Failed to save milestone. Please try again.'))
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (!next && mutation.isPending) return
    onOpenChange(next)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValid || mutation.isPending) return
    setFieldErrors({})
    mutation.mutate()
  }

  const footer = (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(false)}
        disabled={mutation.isPending}
        className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Cancel
      </button>
      <button
        type="submit"
        form={FORM_ID}
        disabled={!isValid || mutation.isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {mutation.isPending ? 'Saving...' : 'Save'}
      </button>
    </>
  )

  return (
    <ModalShell
      open={open}
      onOpenChange={handleOpenChange}
      title={isEditing ? 'Edit milestone' : 'Add milestone'}
      size="md"
      closeDisabled={mutation.isPending}
      footer={footer}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-lg border bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/40">
          <p className="text-xs text-muted-foreground">Remaining to schedule</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(remainingBudget)}</p>
        </div>
        <Field id="milestone-title" label="Title" required error={fieldErrors.title}>
          <input
            id="milestone-title"
            type="text"
            value={form.title}
            onChange={e => updateField('title', e.target.value)}
            placeholder="e.g. Foundation & structural work"
            aria-required="true"
            aria-invalid={fieldErrors.title ? true : undefined}
            aria-describedby={fieldErrors.title ? 'milestone-title-error' : undefined}
            className={fieldClasses(Boolean(fieldErrors.title))}
          />
        </Field>
        <Field id="milestone-description" label="Description" error={fieldErrors.description}>
          <textarea
            id="milestone-description"
            value={form.description}
            onChange={e => updateField('description', e.target.value)}
            placeholder="What is delivered and how completion is verified..."
            rows={3}
            aria-invalid={fieldErrors.description ? true : undefined}
            aria-describedby={fieldErrors.description ? 'milestone-description-error' : undefined}
            className={cn(fieldClasses(Boolean(fieldErrors.description)), 'resize-none')}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="milestone-amount" label="Amount (PKR)" required error={fieldErrors.amount}>
            <input
              id="milestone-amount"
              type="number"
              value={form.amount}
              onChange={e => updateField('amount', e.target.value)}
              placeholder="e.g. 250000"
              min={MIN_AMOUNT_PKR}
              aria-required="true"
              aria-invalid={fieldErrors.amount ? true : undefined}
              aria-describedby={fieldErrors.amount ? 'milestone-amount-error' : undefined}
              className={fieldClasses(Boolean(fieldErrors.amount))}
            />
          </Field>
          <Field id="milestone-due" label="Due Date" error={fieldErrors.dueDate}>
            <input
              id="milestone-due"
              type="date"
              value={form.dueDate}
              onChange={e => updateField('dueDate', e.target.value)}
              aria-invalid={fieldErrors.dueDate ? true : undefined}
              aria-describedby={fieldErrors.dueDate ? 'milestone-due-error' : undefined}
              className={fieldClasses(Boolean(fieldErrors.dueDate))}
            />
          </Field>
        </div>
        {overBudget && (
          <div
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10"
            aria-live="polite"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              This amount exceeds the {formatCurrency(advisoryCap)} still available on the awarded budget.
              You can try to save, but the server may reject it.
            </p>
          </div>
        )}
      </form>
    </ModalShell>
  )
}
