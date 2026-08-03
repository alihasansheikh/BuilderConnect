import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { projectApi } from '@/services/api'
import { Project, ProjectStatus } from '@/types'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { formatBudgetRange, formatDate, formatRelativeTime } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Plus, MapPin, Wallet, CalendarDays, FolderOpen, Flame, AlertCircle } from 'lucide-react'

// Quick filters, shown as chips. '' means "no status filter" (all projects).
const STATUS_FILTERS: { value: ProjectStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'OPEN', label: 'Open' },
  { value: 'BIDDING', label: 'Accepting Bids' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

// Friendlier wording than the generic formatStatus() output for a few statuses.
const STATUS_LABELS: Partial<Record<ProjectStatus, string>> = {
  BIDDING: 'Accepting Bids',
  CONTRACT_PENDING: 'Contract Pending',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
}

const MS_PER_DAY = 86_400_000

/** Deadlines that are overdue or close deserve to stand out from the other metadata. */
function deadlineClasses(deadline: string): string {
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / MS_PER_DAY)
  if (daysLeft < 0) return 'text-red-600 dark:text-red-400 font-medium'
  if (daysLeft <= 7) return 'text-amber-600 dark:text-amber-400 font-medium'
  return 'text-gray-500 dark:text-gray-400'
}

function ProjectCard({ project }: { project: Project }) {
  const bidCount = project.bidCount ?? 0
  const collectingBids = project.status === 'OPEN' || project.status === 'BIDDING'
  const progress = Math.min(100, Math.max(0, project.progressPercentage ?? 0))

  return (
    <Link
      to={`/client/projects/${project.id}`}
      className="group block rounded-2xl bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-card dark:focus-visible:ring-offset-gray-900"
    >
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900 transition-colors group-hover:text-primary dark:text-white">
              {project.title}
            </h3>
            <StatusBadge status={project.status} domain="project" label={STATUS_LABELS[project.status]} />
            {project.isUrgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <Flame className="h-3 w-3" />
                Urgent
              </span>
            )}
          </div>

          <p className="mt-1.5 line-clamp-2 break-words text-sm text-gray-600 dark:text-gray-400">
            {project.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
              <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
              {project.city}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
              <Wallet className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
              {formatBudgetRange(project.budgetMin, project.budgetMax)}
            </span>
            {project.deadline && (
              <span className={cn('inline-flex items-center gap-1.5', deadlineClasses(project.deadline))}>
                <CalendarDays className="h-4 w-4 flex-shrink-0" />
                {formatDate(project.deadline)}
              </span>
            )}
          </div>

          {project.status === 'IN_PROGRESS' && (
            <div className="mt-3.5">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Progress</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Right rail: the number the client actually acts on, plus when it was created. */}
        <div className="flex flex-shrink-0 flex-col items-end justify-between text-right">
          {collectingBids ? (
            <div>
              <p
                className={cn(
                  'text-2xl font-bold leading-none',
                  bidCount > 0 ? 'text-primary' : 'text-gray-300 dark:text-gray-600'
                )}
              >
                {bidCount}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{bidCount === 1 ? 'bid' : 'bids'}</p>
            </div>
          ) : project.status === 'DRAFT' ? (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Not published</span>
          ) : (
            <span />
          )}
          <p className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
            {formatRelativeTime(project.createdAt)}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function MyProjects() {
  // The status filter lives in the URL (?status=BIDDING) so dashboard cards can deep-link into
  // a filtered view, and the filter survives refresh and back-navigation.
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = (searchParams.get('status') as ProjectStatus | null) ?? ''
  const [page, setPage] = useState(0)

  const selectFilter = (value: ProjectStatus | '') => {
    setSearchParams(value ? { status: value } : {}, { replace: true })
    setPage(0)
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['client-projects', statusFilter, page],
    queryFn: async () => {
      const params: { status?: string; page: number } = { page }
      if (statusFilter) {
        params.status = statusFilter
      }
      const response = await projectApi.getClientProjects(params)
      return response.data
    },
  })

  const total = data?.totalElements ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">My Projects</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'project' : 'projects'}`}
          </p>
        </div>
        <Link
          to="/client/projects/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 hover:shadow-xl hover:shadow-primary/30"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Status filter chips */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.value
          return (
            <button
              key={filter.value || 'all'}
              onClick={() => selectFilter(filter.value)}
              aria-pressed={isActive}
              className={cn(
                'flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary/50 hover:text-primary dark:border-gray-700 dark:bg-card dark:text-gray-300 dark:hover:text-primary'
              )}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      {/* Projects */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card dark:bg-card">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="font-medium text-gray-900 dark:text-white">Failed to load your projects</p>
          <button onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
            Try again
          </button>
        </div>
      ) : !data?.content?.length ? (
        <div className="rounded-2xl bg-white shadow-card dark:bg-card">
          <EmptyState
            icon={<FolderOpen className="h-12 w-12 text-gray-300 dark:text-gray-600" />}
            title={statusFilter ? 'No projects in this view' : 'No projects yet'}
            description={
              statusFilter
                ? 'Nothing matches this filter yet. Try another status.'
                : 'Create your first project to start receiving bids from builders.'
            }
            action={statusFilter ? undefined : { label: 'Create Your First Project', to: '/client/projects/new' }}
          />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {data.content.map((project: Project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} className="pt-2" />
        </>
      )}
    </div>
  )
}
