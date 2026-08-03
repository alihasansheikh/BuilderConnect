import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText, Loader2, Lock } from 'lucide-react'
import { contractApi, getApiErrorMessage, getApiValidationErrors } from '@/services/api'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Contract, ContractDraftRequest } from '@/types'

/** DTO field names the backend can return in validationErrors that we render inline. */
const KNOWN_ERROR_FIELDS = new Set([
  'scopeOfWork',
  'paymentTerms',
  'termsAndConditions',
  'specialClauses',
  'startDate',
  'endDate',
])

const LABEL_CLASS = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5'

interface ContractFormState {
  scopeOfWork: string
  paymentTerms: string
  termsAndConditions: string
  specialClauses: string
  startDate: string
  endDate: string
}

/** ISO date/datetime -> YYYY-MM-DD for a native <input type="date">. */
function toDateInputValue(value?: string): string {
  return value ? value.slice(0, 10) : ''
}

function createFormState(contract?: Contract | null): ContractFormState {
  return {
    scopeOfWork: contract?.scopeOfWork ?? '',
    paymentTerms: contract?.paymentTerms ?? '',
    termsAndConditions: contract?.termsAndConditions ?? '',
    specialClauses: contract?.specialClauses ?? '',
    startDate: toDateInputValue(contract?.startDate),
    endDate: toDateInputValue(contract?.endDate),
  }
}

function fieldClasses(hasError: boolean): string {
  return cn(
    'w-full px-4 py-2.5 border rounded-lg dark:bg-gray-700/50 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors text-sm',
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

interface TextareaFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  placeholder?: string
  rows?: number
}

function TextareaField({ id, label, value, onChange, error, required, placeholder, rows = 3 }: TextareaFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}{' '}
        {required ? (
          <span className="text-red-500">*</span>
        ) : (
          <span className="text-muted-foreground font-normal">(optional)</span>
        )}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(fieldClasses(Boolean(error)), 'resize-none')}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

interface ContractFormProps {
  projectId: number
  contract?: Contract | null
  /** Awarded bid amount, used to preview the fixed contract value on the create case. */
  totalAmount?: number
  onSaved: () => void
}

export default function ContractForm({ projectId, contract, totalAmount, onSaved }: ContractFormProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ContractFormState>(() => createFormState(contract))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const isSigned = Boolean(contract?.clientSignedAt || contract?.builderSignedAt)
  const contractValue = contract?.totalAmount ?? totalAmount

  const updateField = (field: keyof ContractFormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => {
      if (!(field in prev)) return prev
      return Object.fromEntries(Object.entries(prev).filter(([key]) => key !== field))
    })
  }

  const datesInvalid =
    form.startDate !== '' && form.endDate !== '' && new Date(form.endDate) <= new Date(form.startDate)

  const isValid =
    form.scopeOfWork.trim() !== '' &&
    form.paymentTerms.trim() !== '' &&
    form.startDate !== '' &&
    form.endDate !== '' &&
    !datesInvalid

  const mutation = useMutation({
    mutationFn: () => {
      const body: ContractDraftRequest = {
        scopeOfWork: form.scopeOfWork.trim(),
        paymentTerms: form.paymentTerms.trim(),
        termsAndConditions: form.termsAndConditions.trim() || undefined,
        specialClauses: form.specialClauses.trim() || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
      }
      return contract ? contractApi.update(projectId, body) : contractApi.create(projectId, body)
    },
    onSuccess: () => {
      toast.success(contract ? 'Contract updated' : 'Contract drafted')
      queryClient.invalidateQueries({ queryKey: ['project-contract', projectId] })
      onSaved()
    },
    onError: (error: unknown) => {
      const validationErrors = getApiValidationErrors(error)
      const hasInlineTarget = Object.keys(validationErrors).some(key => KNOWN_ERROR_FIELDS.has(key))
      if (hasInlineTarget) {
        setFieldErrors(validationErrors)
        return
      }
      toast.error(getApiErrorMessage(error, 'Failed to save contract. Please try again.'))
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValid || mutation.isPending || isSigned) return
    setFieldErrors({})
    mutation.mutate()
  }

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold dark:text-white">{contract ? 'Edit Contract Terms' : 'Draft Contract Terms'}</h3>
      </div>

      {isSigned && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            This contract has been signed and can no longer be edited. To change the terms, create a new contract version instead.
          </p>
        </div>
      )}

      <div className="mb-5 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 px-4 py-3">
        <p className="text-xs text-muted-foreground">Contract value</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(contractValue)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Fixed to the accepted bid amount — set on award and not editable here.
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSigned} className="space-y-5">
          <TextareaField
            id="contract-scope"
            label="Scope of Work"
            required
            value={form.scopeOfWork}
            error={fieldErrors.scopeOfWork}
            placeholder="Describe the work to be delivered, deliverables, and boundaries..."
            rows={4}
            onChange={value => updateField('scopeOfWork', value)}
          />
          <TextareaField
            id="contract-payment"
            label="Payment Terms"
            required
            value={form.paymentTerms}
            error={fieldErrors.paymentTerms}
            placeholder="Describe how and when milestone payments are released..."
            rows={3}
            onChange={value => updateField('paymentTerms', value)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contract-start" className={LABEL_CLASS}>
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                id="contract-start"
                type="date"
                value={form.startDate}
                onChange={e => updateField('startDate', e.target.value)}
                aria-required="true"
                aria-invalid={fieldErrors.startDate ? true : undefined}
                aria-describedby={fieldErrors.startDate ? 'contract-start-error' : undefined}
                className={fieldClasses(Boolean(fieldErrors.startDate))}
              />
              <FieldError id="contract-start-error" message={fieldErrors.startDate} />
            </div>
            <div>
              <label htmlFor="contract-end" className={LABEL_CLASS}>
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                id="contract-end"
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={e => updateField('endDate', e.target.value)}
                aria-required="true"
                aria-invalid={fieldErrors.endDate || datesInvalid ? true : undefined}
                aria-describedby={fieldErrors.endDate ? 'contract-end-error' : undefined}
                className={fieldClasses(Boolean(fieldErrors.endDate) || datesInvalid)}
              />
              <FieldError id="contract-end-error" message={fieldErrors.endDate} />
              {datesInvalid && !fieldErrors.endDate && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">End date must be after the start date.</p>
              )}
            </div>
          </div>
          <TextareaField
            id="contract-terms"
            label="Terms & Conditions"
            value={form.termsAndConditions}
            error={fieldErrors.termsAndConditions}
            placeholder="General terms, warranties, and obligations..."
            rows={3}
            onChange={value => updateField('termsAndConditions', value)}
          />
          <TextareaField
            id="contract-clauses"
            label="Special Clauses"
            value={form.specialClauses}
            error={fieldErrors.specialClauses}
            placeholder="Any project-specific clauses or exceptions..."
            rows={3}
            onChange={value => updateField('specialClauses', value)}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isValid || mutation.isPending || isSigned}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  {contract ? 'Update Contract' : 'Create Contract'}
                </>
              )}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  )
}
