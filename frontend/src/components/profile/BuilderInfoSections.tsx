import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Building2, Loader2, Pencil, Save, Wrench } from 'lucide-react'
import { ModalShell } from '@/components/ui/ModalShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { builderApi, getApiErrorMessage } from '@/services/api'
import { formatCurrency } from '@/lib/formatters'
import { cn, parseJsonArray } from '@/lib/utils'
import type { BuilderProfile, UserProfile } from '@/types'

interface ProfileSectionProps {
  profile: UserProfile
  isOwner: boolean
  onRefetch: () => void
}

const SKILLS_FORM_ID = 'skills-edit-form'
const BUSINESS_FORM_ID = 'business-edit-form'
const LABEL = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5'
const INPUT =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white'
const CANCEL_BTN =
  'rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
const SAVE_BTN =
  'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'

const toArray = (value: string): string[] => value.split(',').map((s) => s.trim()).filter(Boolean)

// ── Shared building blocks ────────────────────────────────────────────────

interface SectionPanelProps {
  title: string
  isOwner: boolean
  onEdit: () => void
  children: ReactNode
}

function SectionPanel({ title, isOwner, onEdit, children }: SectionPanelProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold dark:text-white">{title}</h2>
        {isOwner && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${title.toLowerCase()}`}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

function ChipGroup({ label, items, accent }: { label: string; items: string[]; accent?: boolean }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium',
              accent
                ? 'bg-primary/10 text-primary'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-200',
            )}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function ModalFooter({ formId, pending, onCancel }: { formId: string; pending: boolean; onCancel: () => void }) {
  return (
    <>
      <button type="button" onClick={onCancel} disabled={pending} className={CANCEL_BTN}>
        Cancel
      </button>
      <button type="submit" form={formId} disabled={pending} className={SAVE_BTN}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {pending ? 'Saving...' : 'Save'}
      </button>
    </>
  )
}

// ── Skills ────────────────────────────────────────────────────────────────

export function SkillsSection({ profile, isOwner, onRefetch }: ProfileSectionProps) {
  const [open, setOpen] = useState(false)
  const bp = profile.builderProfile
  if (!bp) return null

  const primaryTrade = bp.primaryTrade?.trim() ?? ''
  const secondaryTrades = parseJsonArray(bp.secondaryTrades)
  const skills = parseJsonArray(bp.skills)
  const specializations = parseJsonArray(bp.specializations)
  const hasAny = Boolean(primaryTrade) || secondaryTrades.length + skills.length + specializations.length > 0

  if (!hasAny && !isOwner) return null

  return (
    <SectionPanel title="Skills & Expertise" isOwner={isOwner} onEdit={() => setOpen(true)}>
      {hasAny ? (
        <div className="space-y-4">
          <ChipGroup label="Primary trade" items={primaryTrade ? [primaryTrade] : []} accent />
          <ChipGroup label="Secondary trades" items={secondaryTrades} />
          <ChipGroup label="Skills" items={skills} />
          <ChipGroup label="Specializations" items={specializations} />
        </div>
      ) : (
        <EmptyState
          icon={<Wrench className="h-10 w-10 text-gray-400" />}
          title="No skills listed"
          description="Add skills and specializations so clients can find the right expertise. Use the edit button above to add them."
        />
      )}
      {isOwner && <SkillsEditModal open={open} onOpenChange={setOpen} bp={bp} onRefetch={onRefetch} />}
    </SectionPanel>
  )
}

interface SkillsEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bp: BuilderProfile
  onRefetch: () => void
}

function SkillsEditModal({ open, onOpenChange, bp, onRefetch }: SkillsEditModalProps) {
  const [skills, setSkills] = useState('')
  const [specializations, setSpecializations] = useState('')

  useEffect(() => {
    if (open) {
      setSkills(parseJsonArray(bp.skills).join(', '))
      setSpecializations(parseJsonArray(bp.specializations).join(', '))
    }
  }, [open, bp])

  const mutation = useMutation({
    mutationFn: () =>
      builderApi.updateMyProfile({ skills: toArray(skills), specializations: toArray(specializations) }),
    onSuccess: () => {
      toast.success('Skills updated')
      onRefetch()
      onOpenChange(false)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update skills')),
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (mutation.isPending) return
    mutation.mutate()
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Edit skills"
      size="md"
      closeDisabled={mutation.isPending}
      footer={<ModalFooter formId={SKILLS_FORM_ID} pending={mutation.isPending} onCancel={() => onOpenChange(false)} />}
    >
      <form id={SKILLS_FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-muted-foreground">Separate multiple values with commas.</p>
        <div>
          <label htmlFor="sk-skills" className={LABEL}>
            Skills
          </label>
          <input
            id="sk-skills"
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Plumbing, Electrical, Tiling, Painting"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="sk-specializations" className={LABEL}>
            Specializations
          </label>
          <input
            id="sk-specializations"
            type="text"
            value={specializations}
            onChange={(e) => setSpecializations(e.target.value)}
            placeholder="New Construction, Renovation, Interior Design"
            className={INPUT}
          />
        </div>
      </form>
    </ModalShell>
  )
}

// ── Business info ─────────────────────────────────────────────────────────

interface BusinessForm {
  companyName: string
  yearsOfExperience: string
  hourlyRate: string
  teamMembers: string
  serviceAreaRadius: string
  ntnNumber: string
  pecNumber: string
  serviceAreas: string
}

const BUSINESS_FIELDS: { key: keyof BusinessForm; label: string; type: string; placeholder?: string }[] = [
  { key: 'companyName', label: 'Company name', type: 'text', placeholder: 'Your company name' },
  { key: 'yearsOfExperience', label: 'Years of experience', type: 'number', placeholder: 'e.g. 5' },
  { key: 'hourlyRate', label: 'Hourly rate (PKR)', type: 'number', placeholder: 'e.g. 2500' },
  { key: 'teamMembers', label: 'Team size', type: 'text', placeholder: 'e.g. 12' },
  { key: 'serviceAreaRadius', label: 'Service radius (km)', type: 'number', placeholder: 'e.g. 50' },
  { key: 'ntnNumber', label: 'NTN number', type: 'text', placeholder: 'National Tax Number' },
  { key: 'pecNumber', label: 'PEC number', type: 'text', placeholder: 'Pakistan Engineering Council' },
]

function buildFacts(bp: BuilderProfile): { label: string; value: ReactNode }[] {
  const facts: { label: string; value: ReactNode }[] = []
  if (bp.companyName) facts.push({ label: 'Company', value: bp.companyName })
  if (bp.yearsOfExperience > 0)
    facts.push({ label: 'Experience', value: `${bp.yearsOfExperience} ${bp.yearsOfExperience === 1 ? 'year' : 'years'}` })
  if (bp.hourlyRate) facts.push({ label: 'Hourly rate', value: formatCurrency(bp.hourlyRate) })
  if (bp.teamMembers) facts.push({ label: 'Team size', value: bp.teamMembers })
  if (bp.serviceAreaRadius) facts.push({ label: 'Service radius', value: `${bp.serviceAreaRadius} km` })
  if (bp.ntnNumber) facts.push({ label: 'NTN', value: bp.ntnNumber })
  if (bp.pecNumber) facts.push({ label: 'PEC', value: bp.pecNumber })
  const serviceAreas = parseJsonArray(bp.serviceAreas)
  if (serviceAreas.length > 0) facts.push({ label: 'Service areas', value: serviceAreas.join(', ') })
  return facts
}

export function BusinessInfoSection({ profile, isOwner, onRefetch }: ProfileSectionProps) {
  const [open, setOpen] = useState(false)
  const bp = profile.builderProfile
  if (!bp) return null

  const facts = buildFacts(bp)
  if (facts.length === 0 && !isOwner) return null

  return (
    <SectionPanel title="Business Information" isOwner={isOwner} onEdit={() => setOpen(true)}>
      {facts.length > 0 ? (
        <dl className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
              <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">{fact.label}</dt>
              <dd className="min-w-0 break-words text-sm font-medium text-gray-900 dark:text-white">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <EmptyState
          icon={<Building2 className="h-10 w-10 text-gray-400" />}
          title="No business details yet"
          description="Add your company, experience, credentials and service areas. Use the edit button above to add them."
        />
      )}
      {isOwner && <BusinessEditModal open={open} onOpenChange={setOpen} bp={bp} onRefetch={onRefetch} />}
    </SectionPanel>
  )
}

interface BusinessEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bp: BuilderProfile
  onRefetch: () => void
}

function BusinessEditModal({ open, onOpenChange, bp, onRefetch }: BusinessEditModalProps) {
  const [form, setForm] = useState<BusinessForm>(() => emptyBusinessForm())

  useEffect(() => {
    if (open) {
      setForm({
        companyName: bp.companyName ?? '',
        yearsOfExperience: bp.yearsOfExperience ? String(bp.yearsOfExperience) : '',
        hourlyRate: bp.hourlyRate ? String(bp.hourlyRate) : '',
        teamMembers: bp.teamMembers ?? '',
        serviceAreaRadius: bp.serviceAreaRadius ? String(bp.serviceAreaRadius) : '',
        ntnNumber: bp.ntnNumber ?? '',
        pecNumber: bp.pecNumber ?? '',
        serviceAreas: parseJsonArray(bp.serviceAreas).join(', '),
      })
    }
  }, [open, bp])

  const updateField = (key: keyof BusinessForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const mutation = useMutation({
    mutationFn: () =>
      builderApi.updateMyProfile({
        companyName: form.companyName.trim() || undefined,
        yearsOfExperience: form.yearsOfExperience ? Number(form.yearsOfExperience) : undefined,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
        teamMembers: form.teamMembers.trim() || undefined,
        serviceAreaRadius: form.serviceAreaRadius ? Number(form.serviceAreaRadius) : undefined,
        ntnNumber: form.ntnNumber.trim() || undefined,
        pecNumber: form.pecNumber.trim() || undefined,
        serviceAreas: toArray(form.serviceAreas),
      }),
    onSuccess: () => {
      toast.success('Business information updated')
      onRefetch()
      onOpenChange(false)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update business information')),
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (mutation.isPending) return
    mutation.mutate()
  }

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Edit business information"
      size="lg"
      closeDisabled={mutation.isPending}
      footer={<ModalFooter formId={BUSINESS_FORM_ID} pending={mutation.isPending} onCancel={() => onOpenChange(false)} />}
    >
      <form id={BUSINESS_FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {BUSINESS_FIELDS.map((field) => (
            <div key={field.key}>
              <label htmlFor={`bz-${field.key}`} className={LABEL}>
                {field.label}
              </label>
              <input
                id={`bz-${field.key}`}
                type={field.type}
                value={form[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                min={field.type === 'number' ? 0 : undefined}
                className={INPUT}
              />
            </div>
          ))}
        </div>
        <div>
          <label htmlFor="bz-serviceAreas" className={LABEL}>
            Service areas
          </label>
          <input
            id="bz-serviceAreas"
            type="text"
            value={form.serviceAreas}
            onChange={(e) => updateField('serviceAreas', e.target.value)}
            placeholder="Karachi, Hyderabad, Thatta (comma separated)"
            className={INPUT}
          />
        </div>
      </form>
    </ModalShell>
  )
}

function emptyBusinessForm(): BusinessForm {
  return {
    companyName: '',
    yearsOfExperience: '',
    hourlyRate: '',
    teamMembers: '',
    serviceAreaRadius: '',
    ntnNumber: '',
    pecNumber: '',
    serviceAreas: '',
  }
}
