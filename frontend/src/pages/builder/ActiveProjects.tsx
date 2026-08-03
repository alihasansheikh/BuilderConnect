import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertCircle, Briefcase, CheckCircle2, Clock } from 'lucide-react'
import { projectApi, milestoneApi } from '@/services/api'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FilterChips } from '@/components/ui/FilterChips'
import DataTable from '@/components/ui/DataTable'
import { deadlineClasses, formatBudgetRange, formatCurrency, formatDate } from '@/lib/formatters'
import { countCompletedMilestones } from '@/lib/milestones'
import { cn } from '@/lib/utils'
import type { Milestone, Project } from '@/types'

const PROJECTS_FETCH_SIZE = 50
const PERCENT_SCALE = 100
const TABLE_PAGE_SIZE = 10
const ACTIVE_STATUSES: ReadonlyArray<Project['status']> = ['AWARDED', 'IN_PROGRESS']

type StatusFilter = 'all' | 'active' | 'completed'

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

function matchesFilter(project: Project, filter: StatusFilter): boolean {
  if (filter === 'active') return ACTIVE_STATUSES.includes(project.status)
  if (filter === 'completed') return project.status === 'COMPLETED'
  return true
}

/** Milestone progress bar for one project. Only rendered for rows on the current page. */
function ProgressCell({ projectId }: { projectId: number }) {
  const { data: milestones = [], isLoading } = useQuery<Milestone[]>({
    queryKey: ['milestones', projectId],
    queryFn: () => milestoneApi.getProjectMilestones(projectId).then((r) => r.data),
  })

  if (isLoading) {
    return <div className="h-2 w-28 animate-pulse rounded-full bg-gray-100 dark:bg-gray-700" />
  }
  if (milestones.length === 0) {
    return <span className="text-xs text-gray-400 dark:text-gray-500">No milestones</span>
  }

  const completed = countCompletedMilestones(milestones)
  const pct = Math.round((completed / milestones.length) * PERCENT_SCALE)

  return (
    <div className="w-32">
      <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {completed}/{milestones.length} paid
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** The date column: completion date for finished projects, otherwise the (urgency-colored) due date. */
function TimelineCell({ project }: { project: Project }) {
  if (project.status === 'COMPLETED') {
    return (
      <span className="text-gray-500 dark:text-gray-400">
        {project.actualCompletionDate ? `Completed ${formatDate(project.actualCompletionDate)}` : 'Completed'}
      </span>
    )
  }
  if (project.expectedCompletionDate) {
    return (
      <span className={cn('font-medium', deadlineClasses(project.expectedCompletionDate))}>
        Due {formatDate(project.expectedCompletionDate)}
      </span>
    )
  }
  return <span className="text-gray-400 dark:text-gray-500">—</span>
}

function projectBudgetValue(project: Project): number {
  return project.finalBudget ?? project.budgetMax ?? project.budgetMin ?? 0
}

function timelineSortValue(project: Project): number {
  const date = project.status === 'COMPLETED' ? project.actualCompletionDate : project.expectedCompletionDate
  return date ? new Date(date).getTime() : 0
}

export default function ActiveProjects() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: projectsData, isLoading, error, refetch } = useQuery({
    queryKey: ['builder-active-projects'],
    queryFn: () => projectApi.getBuilderProjects({ size: PROJECTS_FETCH_SIZE }).then((r) => r.data),
  })

  const allProjects: Project[] = useMemo(() => projectsData?.content ?? [], [projectsData])
  const activeCount = allProjects.filter((p) => ACTIVE_STATUSES.includes(p.status)).length
  const completedCount = allProjects.filter((p) => p.status === 'COMPLETED').length

  const rows = useMemo(
    () => allProjects.filter((p) => matchesFilter(p, statusFilter)),
    [allProjects, statusFilter]
  )

  const columns = useMemo<ColumnDef<Project, any>[]>(
    () => [
      {
        id: 'project',
        header: 'Project',
        accessorFn: (row) => row.title,
        cell: ({ row }) => {
          const project = row.original
          const meta = [project.city, project.categoryName].filter(Boolean).join(' • ')
          return (
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white">{project.title}</p>
              {meta && <p className="truncate text-xs text-gray-500 dark:text-gray-400">{meta}</p>}
            </div>
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => row.status,
        cell: ({ row }) => <StatusBadge status={row.original.status} domain="project" />,
      },
      {
        id: 'budget',
        header: 'Contract value',
        accessorFn: (row) => projectBudgetValue(row),
        cell: ({ row }) => {
          const project = row.original
          return (
            <span className="font-medium text-gray-900 dark:text-gray-200">
              {project.finalBudget != null
                ? formatCurrency(project.finalBudget)
                : formatBudgetRange(project.budgetMin, project.budgetMax)}
            </span>
          )
        },
      },
      {
        id: 'progress',
        header: 'Progress',
        enableSorting: false,
        cell: ({ row }) => <ProgressCell projectId={row.original.id} />,
      },
      {
        id: 'timeline',
        header: 'Timeline',
        accessorFn: (row) => timelineSortValue(row),
        cell: ({ row }) => <TimelineCell project={row.original} />,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Active Projects</h1>
        <p className="text-gray-600 dark:text-gray-400">Projects you have been awarded and are delivering</p>
      </div>

      {error ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card dark:bg-card">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="font-medium text-gray-900 dark:text-white">Failed to load your projects</p>
          <button onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard
              title="In Progress"
              value={activeCount}
              icon={<Briefcase className="h-5 w-5 text-white" />}
              colorClass="bg-blue-500"
            />
            <StatCard
              title="Completed"
              value={completedCount}
              icon={<CheckCircle2 className="h-5 w-5 text-white" />}
              colorClass="bg-emerald-500"
            />
            <StatCard
              title="Total"
              value={allProjects.length}
              icon={<Clock className="h-5 w-5 text-white" />}
              colorClass="bg-purple-500"
            />
          </div>

          <FilterChips options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} />

          <DataTable
            data={rows}
            columns={columns}
            isLoading={isLoading}
            pageSize={TABLE_PAGE_SIZE}
            onRowClick={(project) => navigate(`/builder/projects/${project.id}`)}
            emptyMessage={
              statusFilter === 'completed'
                ? 'No completed projects yet.'
                : statusFilter === 'active'
                  ? 'No projects in progress. Win bids in the marketplace to get started.'
                  : 'No projects yet. Win bids in the marketplace to get started.'
            }
          />
        </>
      )}
    </div>
  )
}
