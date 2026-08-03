import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { projectApi } from '@/services/api'
import { Project } from '@/types'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatBudgetRange, formatCurrency } from '@/lib/formatters'
import {
  Briefcase,
  HardHat,
  FolderPlus,
  Search,
  Gavel,
  FilePen,
  CheckCircle2,
  MapPin,
  ArrowRight,
} from 'lucide-react'

const ACTIVE_STATUSES = ['OPEN', 'BIDDING', 'AWARDED', 'IN_PROGRESS']
const BUDGETED_STATUSES = ['IN_PROGRESS', 'COMPLETED']

export default function ClientDashboard() {
  const { user } = useAuth()

  const { data: projectsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['client-projects-all'],
    queryFn: () => projectApi.getClientProjects({ size: 100 }).then(r => r.data),
  })

  const projects: Project[] = projectsData?.content || []

  const activeCount = projects.filter(p => ACTIVE_STATUSES.includes(p.status)).length
  const biddingCount = projects.filter(p => p.status === 'BIDDING').length
  const completedCount = projects.filter(p => p.status === 'COMPLETED').length
  const draftCount = projects.filter(p => p.status === 'DRAFT').length

  const budgetedProjects = projects.filter(p => BUDGETED_STATUSES.includes(p.status))
  const totalBudget = budgetedProjects.reduce((sum, p) => sum + (p.finalBudget || p.budgetMax || 0), 0)

  const recentProjects = projects.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="animate-slide-up relative overflow-hidden bg-navy text-white rounded-2xl p-8">
        <div className="relative z-10 max-w-md">
          <h1 className="text-2xl font-bold mb-2">Welcome back 👋<br />{user?.name}</h1>
          <p className="text-gray-400 text-sm mb-5">Manage your construction projects, track milestones, and stay on top of every detail.</p>
          <Link
            to="/client/projects/new"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            <FolderPlus className="h-4 w-4" />
            New Project
          </Link>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-[0.08]">
          <HardHat className="h-40 w-40" />
        </div>
        <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-primary/20" />
        <div className="absolute right-24 -top-4 h-20 w-20 rounded-full bg-primary/10" />
      </div>

      {isLoading ? (
        <LoadingSpinner size="lg" label="Loading dashboard..." fullPage />
      ) : isError ? (
        <div className="text-center py-16">
          <p className="text-red-500 dark:text-red-400">Failed to load data. Please try again.</p>
          <button onClick={() => refetch()} className="mt-4 text-primary hover:underline">Retry</button>
        </div>
      ) : (
        <>
          {/* Stats — each one deep-links into the matching filtered project list */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Projects"
              value={activeCount}
              icon={<Briefcase className="h-6 w-6" />}
              colorClass="bg-primary/10 text-primary"
              linkTo="/client/projects"
              className="animate-slide-up delay-100"
            />
            <StatCard
              title="Awaiting Bids"
              value={biddingCount}
              icon={<Gavel className="h-6 w-6" />}
              colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
              linkTo="/client/projects?status=BIDDING"
              className="animate-slide-up delay-200"
            />
            <StatCard
              title="Drafts"
              value={draftCount}
              icon={<FilePen className="h-6 w-6" />}
              colorClass="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              linkTo="/client/projects?status=DRAFT"
              className="animate-slide-up delay-300"
            />
            <StatCard
              title="Completed"
              value={completedCount}
              icon={<CheckCircle2 className="h-6 w-6" />}
              colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              linkTo="/client/projects?status=COMPLETED"
              className="animate-slide-up delay-400"
            />
          </div>

          {/* Drafts nudge — a count alone doesn't tell you what to do next */}
          {draftCount > 0 && (
            <Link
              to="/client/projects?status=DRAFT"
              className="animate-fade-in flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100/70 dark:border-amber-800/40 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
            >
              <div className="flex items-center gap-3">
                <FilePen className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">
                    {draftCount} {draftCount === 1 ? 'draft is' : 'drafts are'} not published yet
                  </span>{' '}
                  — publish to start receiving bids.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            </Link>
          )}

          {/* Budget overview */}
          {totalBudget > 0 && (
            <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6 animate-fade-in delay-300">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Project Budget</p>
              <p className="text-2xl font-bold dark:text-white mt-1">{formatCurrency(totalBudget)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                across {budgetedProjects.length} {budgetedProjects.length === 1 ? 'project' : 'projects'}
              </p>
            </div>
          )}

          {/* Recent Projects */}
          <div className="animate-fade-in delay-300 bg-white dark:bg-card rounded-2xl shadow-card">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold dark:text-white">Recent Projects</h2>
              <Link to="/client/projects" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y dark:divide-gray-700">
              {recentProjects.length === 0 ? (
                <EmptyState
                  icon={<Briefcase className="h-10 w-10 text-gray-400" />}
                  title="No projects yet"
                  description="Post your first project and start receiving bids from verified builders."
                  action={{ label: 'Post a Project', to: '/client/projects/new' }}
                  className="py-8"
                />
              ) : (
                recentProjects.map((project) => {
                  const bidCount = project.bidCount ?? 0
                  return (
                    <Link
                      key={project.id}
                      to={`/client/projects/${project.id}`}
                      className="group flex items-center justify-between gap-4 p-5 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/50"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium transition-colors group-hover:text-primary dark:text-white">
                          {project.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {project.city}
                          </span>
                          {project.categoryName && <span>{project.categoryName}</span>}
                          <span className="font-medium text-gray-600 dark:text-gray-300">
                            {formatBudgetRange(project.budgetMin, project.budgetMax)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        {bidCount > 0 && (
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
                          </span>
                        )}
                        <StatusBadge status={project.status} domain="project" />
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="animate-slide-up delay-400 grid md:grid-cols-2 gap-6">
            <Link
              to="/client/projects/new"
              className="flex items-center gap-4 rounded-2xl border border-transparent bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg dark:bg-card"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FolderPlus className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium dark:text-white">Post a New Project</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a project and receive bids from builders
                </p>
              </div>
            </Link>
            <Link
              to="/client/builders"
              className="flex items-center gap-4 rounded-2xl border border-transparent bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg dark:bg-card"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium dark:text-white">Browse Builders</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Find verified builders in your area
                </p>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
