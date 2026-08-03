import { z } from 'zod'
import { cn } from '@/lib/utils'
import { toSqFt, MATERIALS_PROVIDED_BY } from '@/lib/project-taxonomy'
import type { AreaUnit, BudgetType } from '@/lib/project-taxonomy'

// Shared constants, zod schemas, and presentational pieces for the Create-Project wizard.
// Kept in a sibling module so pages/client/CreateProject.tsx stays focused and under the size cap.

export const TOTAL_STEPS = 8

export const stepLabels = [
  'Basics',
  'Description',
  'Property & Size',
  'Location',
  'Budget',
  'Timeline & Requirements',
  'Attachments',
  'Review',
]

// Property types that have no floor concept.
export const NO_FLOOR_TYPES: readonly string[] = ['Plot/Land', 'Other']
// Property types where a room count makes sense.
export const ROOM_TYPES: readonly string[] = ['House', 'Apartment/Flat', 'Farmhouse', 'Office']
// Property types where a unit count makes sense.
export const UNIT_TYPES: readonly string[] = ['Apartment/Flat', 'Commercial Building']
// Categories for which the existing structure's condition is relevant.
export const STRUCTURE_CATEGORIES: readonly string[] = ['Renovation', 'Repair']

export const ACCEPTED_DOC_TYPES: readonly string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export type BooleanFlag =
  | 'verifiedBuildersOnly'
  | 'isUrgent'
  | 'allowPartialBids'
  | 'isPublic'

export const FLAG_OPTIONS: { name: BooleanFlag; label: string; hint: string }[] = [
  { name: 'verifiedBuildersOnly', label: 'Verified Builders Only', hint: 'Only verified builders can place bids' },
  { name: 'isUrgent', label: 'Urgent Project', hint: 'Higher visibility to builders' },
  { name: 'allowPartialBids', label: 'Allow Partial Bids', hint: 'Builders can bid on specific trades only' },
  { name: 'isPublic', label: 'Public Listing', hint: 'Visible in the marketplace once published' },
]

export const inputCls = 'w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
export const labelCls = 'block text-sm font-medium mb-1 dark:text-gray-300'

export const initialFormData = {
  // Step 1 — Basics
  title: '',
  categoryId: '',
  trades: [] as string[],
  // Step 2 — Description
  description: '',
  specialRequirements: '',
  // Step 3 — Property & Size
  propertyType: '',
  areaValue: '',
  areaUnit: 'MARLA' as AreaUnit,
  floors: '',
  rooms: '',
  units: '',
  structureCondition: '',
  materialsProvidedBy: 'DECIDE_LATER',
  // Step 4 — Location
  province: '',
  city: '',
  locationArea: '',
  locationAddress: '',
  // Step 5 — Budget
  budgetType: 'FIXED_RANGE' as BudgetType,
  budgetMin: '',
  budgetMax: '',
  // Step 6 — Timeline & Requirements
  preferredStartDate: '',
  deadline: '',
  biddingDeadline: '',
  estimatedDurationDays: '',
  verifiedBuildersOnly: false,
  isUrgent: false,
  allowPartialBids: false,
  isPublic: true,
}

export type ProjectFormData = typeof initialFormData

export function formatPKR(amount: number | string): string {
  const num = typeof amount === 'string' ? Number(amount) : amount
  if (!num || isNaN(num)) return 'PKR 0'
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(num)
}

// ---- Per-step zod schemas (source of truth for the proceed gate + inline errors) ----
export const step1Schema = z.object({
  title: z.string()
    .max(200, 'Title must be 200 characters or fewer')
    .refine((v) => v.trim().length >= 10, 'Title must be at least 10 characters'),
  categoryId: z.string().min(1, 'Please choose a category'),
  trades: z.array(z.string()).min(1, 'Select at least one trade'),
})
export const step2Schema = z.object({
  description: z.string()
    .max(5000, 'Description must be 5000 characters or fewer')
    .refine((v) => v.trim().length >= 50, 'Description must be at least 50 characters'),
})
export const step3Schema = z.object({
  areaValue: z.string().refine((v) => v === '' || Number(v) > 0, 'Area must be a number greater than 0'),
})
export const step4Schema = z.object({
  city: z.string().min(1, 'Please select a city'),
})
// discriminatedUnion members must be plain ZodObjects, so the FIXED_RANGE cross-field
// checks live in a top-level superRefine rather than per-member .refine chains.
export const step5Schema = z.discriminatedUnion('budgetType', [
  z.object({
    budgetType: z.literal('OPEN_TO_QUOTES'),
    budgetMin: z.string().optional(),
    budgetMax: z.string().optional(),
  }),
  z.object({
    budgetType: z.literal('FIXED_RANGE'),
    budgetMin: z.string(),
    budgetMax: z.string(),
  }),
]).superRefine((d, ctx) => {
  if (d.budgetType !== 'FIXED_RANGE') return
  if (Number(d.budgetMin) < 1000) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['budgetMin'], message: 'Minimum budget must be at least PKR 1,000' })
  }
  if (!(Number(d.budgetMax) > Number(d.budgetMin))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['budgetMax'], message: 'Maximum must be greater than the minimum' })
  }
})

export function fieldErrorsFrom(schema: z.ZodTypeAny, data: unknown): Record<string, string> {
  const res = schema.safeParse(data)
  if (res.success) return {}
  const out: Record<string, string> = {}
  for (const issue of res.error.issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !(key in out)) out[key] = issue.message
  }
  return out
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-red-500 mt-1">{msg}</p>
}

export function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <h3 className="font-medium text-sm text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
      {children}
    </div>
  )
}

interface ReviewStepProps {
  formData: ProjectFormData
  selectedCategoryName?: string
  imagesCount: number
  documentsCount: number
}

export function ReviewStep({ formData, selectedCategoryName, imagesCount, documentsCount }: ReviewStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold mb-4 dark:text-white">Review & Submit</h2>

      <div className="space-y-3">
        <ReviewCard title="BASICS">
          <p className="font-medium dark:text-white">{formData.title || 'Untitled project'}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedCategoryName || 'No category'}</p>
          {formData.trades.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.trades.map((t) => (
                <span key={t} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">{t}</span>
              ))}
            </div>
          )}
        </ReviewCard>

        <ReviewCard title="DESCRIPTION">
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-4 whitespace-pre-wrap">{formData.description}</p>
          {formData.specialRequirements && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2"><span className="font-medium">Special: </span>{formData.specialRequirements}</p>
          )}
        </ReviewCard>

        <div className="grid grid-cols-2 gap-3">
          <ReviewCard title="PROPERTY & SIZE">
            <p className="dark:text-white">{formData.propertyType || 'Not specified'}</p>
            {formData.areaValue && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{formData.areaValue} {formData.areaUnit} (≈ {toSqFt(formData.areaValue, formData.areaUnit).toLocaleString()} sq ft)</p>
            )}
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.floors && <span>{formData.floors} floors</span>}
              {formData.rooms && <span>· {formData.rooms} rooms</span>}
              {formData.units && <span>· {formData.units} units</span>}
            </div>
            {formData.structureCondition && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Condition: {formData.structureCondition}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Materials: {MATERIALS_PROVIDED_BY.find((m) => m.value === formData.materialsProvidedBy)?.label}
            </p>
          </ReviewCard>

          <ReviewCard title="LOCATION">
            <p className="dark:text-white">{formData.city || 'Not specified'}</p>
            {formData.province && <p className="text-sm text-gray-600 dark:text-gray-400">{formData.province}</p>}
            {formData.locationArea && <p className="text-sm text-gray-600 dark:text-gray-400">{formData.locationArea}</p>}
            {formData.locationAddress && <p className="text-xs text-gray-500 dark:text-gray-400">{formData.locationAddress}</p>}
          </ReviewCard>
        </div>

        <ReviewCard title="BUDGET">
          {formData.budgetType === 'FIXED_RANGE' ? (
            <p className="dark:text-white">{formatPKR(formData.budgetMin)} – {formatPKR(formData.budgetMax)}</p>
          ) : (
            <p className="dark:text-white">Open to quotes</p>
          )}
        </ReviewCard>

        <ReviewCard title="TIMELINE & REQUIREMENTS">
          <div className="flex flex-wrap gap-2 text-xs">
            {formData.preferredStartDate && <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 dark:text-gray-300 rounded-full">Start: {formData.preferredStartDate}</span>}
            {formData.deadline && <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 dark:text-gray-300 rounded-full">Deadline: {formData.deadline}</span>}
            {formData.biddingDeadline && <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 dark:text-gray-300 rounded-full">Bids close: {formData.biddingDeadline}</span>}
            {formData.estimatedDurationDays && <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 dark:text-gray-300 rounded-full">{formData.estimatedDurationDays} days</span>}
            {FLAG_OPTIONS.filter((o) => formData[o.name]).map((o) => (
              <span key={o.name} className="px-2 py-1 bg-primary/10 text-primary rounded-full">{o.label}</span>
            ))}
          </div>
        </ReviewCard>

        {(imagesCount > 0 || documentsCount > 0) && (
          <ReviewCard title="ATTACHMENTS">
            <p className="text-sm dark:text-white">
              {imagesCount} image{imagesCount !== 1 ? 's' : ''} · {documentsCount} document{documentsCount !== 1 ? 's' : ''} to upload
            </p>
          </ReviewCard>
        )}
      </div>
    </div>
  )
}

/** Segmented wizard progress rail — all 8 steps always fit; completed segments jump back. */
export function WizardProgress({ step, onJumpBack }: { step: number; onJumpBack: (s: number) => void }) {
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">
          <span className="text-primary">Step {step}</span>
          <span className="text-gray-400 dark:text-gray-500"> of {TOTAL_STEPS}</span>
          <span className="text-gray-600 dark:text-gray-300"> · {stepLabels[step - 1]}</span>
        </p>
        <p className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
          {Math.round((step / TOTAL_STEPS) * 100)}% complete
        </p>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => s < step && onJumpBack(s)}
            disabled={s >= step}
            title={stepLabels[s - 1]}
            aria-label={`Step ${s}: ${stepLabels[s - 1]}`}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              s < step
                ? 'cursor-pointer bg-green-500 hover:bg-green-600'
                : s === step
                ? 'bg-primary'
                : 'cursor-default bg-gray-200 dark:bg-gray-700'
            )}
          />
        ))}
      </div>
    </div>
  )
}
