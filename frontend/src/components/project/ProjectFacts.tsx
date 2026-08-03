import type { ReactNode } from 'react'
import { CheckCircle } from 'lucide-react'
import { cn, parseJsonArray } from '@/lib/utils'
import { deadlineClasses, formatBudgetRange, formatCurrency, formatDate } from '@/lib/formatters'
import { AREA_UNITS, MATERIALS_PROVIDED_BY } from '@/lib/project-taxonomy'
import { Project } from '@/types'

export type ProjectFactsSection = 'description' | 'details' | 'trades' | 'requirements' | 'budget'

const DEFAULT_SECTIONS: ReadonlyArray<ProjectFactsSection> = [
  'description',
  'details',
  'trades',
  'requirements',
  'budget',
]

/** en-PK digit grouping for plain numbers (the sq ft echo) — currency has its own formatter. */
const NUMBER_FORMAT = new Intl.NumberFormat('en-PK')

interface ProjectFactsProps {
  project: Project
  /** Which sections to render, in order. Defaults to all five. */
  sections?: ProjectFactsSection[]
  className?: string
}

interface SectionProps {
  project: Project
}

/** Compact label/value tile. Renders nothing when there's no value, so the grid stays honest. */
function Fact({ label, value }: { label: string; value?: ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="min-w-0 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <div className="mt-0.5 break-words text-sm font-medium text-gray-900 dark:text-gray-200">{value}</div>
    </div>
  )
}

/** "5 Marla (≈ 1,125 sq ft)" — undefined when the wizard collected no size. */
function deriveSizeText(project: Project): string | undefined {
  if (!project.areaValue) return undefined
  const unitLabel = AREA_UNITS.find((u) => u.value === project.areaUnit)?.label ?? project.areaUnit
  const base = `${project.areaValue} ${unitLabel ?? ''}`.trim()
  const sqFtEcho = project.areaSqFt ? ` (≈ ${NUMBER_FORMAT.format(project.areaSqFt)} sq ft)` : ''
  return base + sqFtEcho
}

/** Trades chips; falls back to requiredSkills (which may arrive JSON-encoded) when trades is absent. */
function deriveTrades(project: Project): string[] {
  if (project.trades?.length) return project.trades
  return parseJsonArray(project.requiredSkills)
}

function deriveRequirements(project: Project): string[] {
  return [
    project.isUrgent && 'Urgent project',
    project.verifiedBuildersOnly && 'Verified builders only',
  ].filter(Boolean) as string[]
}

function DescriptionSection({ project }: SectionProps) {
  return (
    <div>
      <h3 className="mb-2 font-semibold dark:text-white">Description</h3>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {project.description}
      </p>
      {project.specialRequirements && (
        <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/40">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Special requirements</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">
            {project.specialRequirements}
          </p>
        </div>
      )}
    </div>
  )
}

function DetailsSection({ project }: SectionProps) {
  const materialsText = MATERIALS_PROVIDED_BY.find((m) => m.value === project.materialsProvidedBy)?.label
  return (
    <div>
      <h3 className="mb-3 font-semibold dark:text-white">Details</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Fact label="Category" value={project.categoryName} />
        <Fact label="Property type" value={project.propertyType} />
        <Fact label="Size" value={deriveSizeText(project)} />
        <Fact label="Floors" value={project.floors} />
        <Fact label="Rooms" value={project.rooms} />
        <Fact label="Units" value={project.units} />
        <Fact label="Materials" value={materialsText} />
        <Fact label="Condition" value={project.structureCondition} />
        <Fact label="City" value={project.city} />
        <Fact label="Province" value={project.province} />
        <Fact label="Locality" value={project.locationArea} />
        <Fact label="Address" value={project.locationAddress} />
        <Fact
          label="Preferred start"
          value={project.preferredStartDate ? formatDate(project.preferredStartDate) : undefined}
        />
        <Fact
          label="Deadline"
          value={
            project.deadline ? (
              <span className={deadlineClasses(project.deadline)}>{formatDate(project.deadline)}</span>
            ) : undefined
          }
        />
        <Fact
          label="Est. duration"
          value={project.estimatedDurationDays ? `${project.estimatedDurationDays} days` : undefined}
        />
      </div>
    </div>
  )
}

function TradesSection({ project }: SectionProps) {
  const trades = deriveTrades(project)
  if (trades.length === 0) return null
  return (
    <div>
      <h3 className="mb-2 font-semibold dark:text-white">Required trades</h3>
      <div className="flex flex-wrap gap-2">
        {trades.map((trade) => (
          <span key={trade} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {trade}
          </span>
        ))}
      </div>
    </div>
  )
}

function RequirementsSection({ project }: SectionProps) {
  const requirements = deriveRequirements(project)
  if (requirements.length === 0) return null
  return (
    <div>
      <h3 className="mb-2 font-semibold dark:text-white">Requirements</h3>
      <div className="flex flex-wrap gap-2">
        {requirements.map((req) => (
          <span
            key={req}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-600 dark:text-gray-300"
          >
            <CheckCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
            {req}
          </span>
        ))}
      </div>
    </div>
  )
}

function BudgetSection({ project }: SectionProps) {
  const isOpenToQuotes = project.budgetType === 'OPEN_TO_QUOTES'
  return (
    <div>
      <h3 className="mb-3 font-semibold dark:text-white">Budget</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Fact
          label={isOpenToQuotes ? 'Budget' : 'Budget range'}
          value={isOpenToQuotes ? 'Open to quotes' : formatBudgetRange(project.budgetMin, project.budgetMax)}
        />
        {project.finalBudget != null && (
          <Fact
            label="Awarded amount"
            value={<span className="text-green-600 dark:text-green-400">{formatCurrency(project.finalBudget)}</span>}
          />
        )}
      </div>
    </div>
  )
}

const SECTION_COMPONENTS: Record<ProjectFactsSection, (props: SectionProps) => JSX.Element | null> = {
  description: DescriptionSection,
  details: DetailsSection,
  trades: TradesSection,
  requirements: RequirementsSection,
  budget: BudgetSection,
}

/**
 * Read-only summary of everything the create-project wizard collected.
 * Shared by the client project page and the builder marketplace detail; consumers
 * pick sections (and their order) via the `sections` prop.
 */
export function ProjectFacts({ project, sections, className }: ProjectFactsProps) {
  const ordered = sections ?? DEFAULT_SECTIONS
  return (
    <div className={cn('space-y-6', className)}>
      {ordered.map((section) => {
        const Section = SECTION_COMPONENTS[section]
        return <Section key={section} project={project} />
      })}
    </div>
  )
}
