import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  FileText,
  FolderOpen,
  GitPullRequest,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Pencil,
  Shield,
} from 'lucide-react'
import { contractApi, getApiErrorMessage, milestoneApi, projectApi } from '@/services/api'
import type { Contract, Milestone, Project, ProjectStatus } from '@/types'
import { formatBudgetRange, formatCurrency, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { countCompletedMilestones } from '@/lib/milestones'
import { useAuth } from '@/contexts/AuthContext'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import ChangeRequestForm from '@/components/project/ChangeRequestForm'
import { ProjectFacts } from '@/components/project/ProjectFacts'
import ContractForm from '@/components/project/ContractForm'
import { ProjectChat } from '@/components/project/ProjectChat'
import ProjectFilesTab from '@/components/project/ProjectFilesTab'
import BuilderMilestonesTab from '@/components/project/BuilderMilestonesTab'
import { ContractVersionHistory } from '@/components/project/ContractVersionHistory'
import { ProjectSupportActions } from '@/components/project/ProjectSupportActions'

type TabKey = 'overview' | 'contract' | 'milestones' | 'files' | 'changes' | 'messages'

const TABS: ReadonlyArray<{ key: TabKey; label: string; icon: typeof CheckCircle }> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'contract', label: 'Contract', icon: Shield },
  { key: 'milestones', label: 'Milestones', icon: CheckCircle },
  { key: 'files', label: 'Files', icon: FolderOpen },
  { key: 'changes', label: 'Change Requests', icon: GitPullRequest },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
]

const LOADING_SKELETON_COUNT = 3
/** Project states in which the awarded builder may draft the contract. */
const CONTRACT_DRAFT_STATUSES: ReadonlyArray<ProjectStatus> = ['AWARDED', 'CONTRACT_PENDING']

/** Resolves a ?tab= deep link (e.g. from a notification actionUrl) to a valid tab key. */
function initialTabFromParam(param: string | null): TabKey {
  return TABS.some((tab) => tab.key === param) ? (param as TabKey) : 'overview'
}

/** Triggers a browser download for a PDF blob returned by the API. */
function downloadPdfBlob(data: BlobPart, filename: string) {
  const blob = new Blob([data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(url)
}

// --- Header ---

function ProjectHeader({ project, milestones }: { project: Project; milestones: Milestone[] }) {
  const completed = countCompletedMilestones(milestones)
  const progressPct = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold dark:text-white">{project.title}</h1>
            <StatusBadge status={project.status} domain="project" size="md" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {project.projectNumber}
            {project.client?.name && (
              <>
                {' • Client: '}
                <Link
                  to={`/profile/${project.client.id}`}
                  className="font-medium hover:text-primary hover:underline"
                >
                  {project.client.name}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {project.finalBudget != null ? 'Awarded Budget' : 'Budget'}
          </p>
          <p className="font-semibold dark:text-white">
            {project.finalBudget != null
              ? formatCurrency(project.finalBudget)
              : formatBudgetRange(project.budgetMin, project.budgetMax)}
          </p>
        </div>
      </div>

      {milestones.length > 0 && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Overall Progress</span>
            <span>
              {completed}/{milestones.length} milestones done ({progressPct}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

// --- Contract tab ---

function SignatureBox({ label, signedAt, awaitingText }: { label: string; signedAt?: string; awaitingText: string }) {
  return (
    <div className="rounded-lg border p-4 dark:border-gray-700">
      <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
      {signedAt ? (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">Signed on {formatDate(signedAt)}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <Clock className="h-4 w-4" />
          <span className="text-sm">{awaitingText}</span>
        </div>
      )}
    </div>
  )
}

function ContractTextBlock({ title, text, scroll }: { title: string; text?: string; scroll?: boolean }) {
  if (!text) return null
  return (
    <div>
      <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h4>
      <div
        className={cn(
          'whitespace-pre-line rounded-lg bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-700/40 dark:text-gray-400',
          scroll && 'max-h-64 overflow-y-auto',
        )}
      >
        {text}
      </div>
    </div>
  )
}

interface ContractDetailsProps {
  contract: Contract
  canEdit: boolean
  onEdit: () => void
  awaitingBuilderSign: boolean
  onSign: () => void
  signing: boolean
  onDownload: () => void
  downloading: boolean
}

function ContractDetails({
  contract,
  canEdit,
  onEdit,
  awaitingBuilderSign,
  onSign,
  signing,
  onDownload,
  downloading,
}: ContractDetailsProps) {
  return (
    <div className="space-y-5 rounded-lg border p-4 dark:border-gray-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 font-semibold dark:text-white">
            <Shield className="h-5 w-5 text-primary" />
            Contract {contract.contractNumber}
          </h4>
          <div className="mt-1.5">
            <StatusBadge status={contract.status} domain="contract" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Pencil className="h-4 w-4" />
              Edit contract
            </button>
          )}
          {contract.fullySigned && (
            <button
              onClick={onDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </button>
          )}
        </div>
      </div>

      <div className="text-sm">
        <p className="text-gray-500 dark:text-gray-400">Total Amount</p>
        <p className="text-lg font-semibold dark:text-white">{formatCurrency(contract.totalAmount)}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SignatureBox label="Client Signature" signedAt={contract.clientSignedAt} awaitingText="Awaiting signature" />
        <SignatureBox label="Your Signature" signedAt={contract.builderSignedAt} awaitingText="Awaiting your signature" />
      </div>

      {awaitingBuilderSign && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="mb-3 text-sm text-amber-800 dark:text-amber-200">
            This contract is awaiting your signature. Review the terms below and sign to activate the project.
          </p>
          <button
            onClick={onSign}
            disabled={signing}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:opacity-50"
          >
            {signing ? 'Signing...' : 'Accept & Sign Contract'}
          </button>
        </div>
      )}

      {contract.fullySigned && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-800 dark:text-green-200">
            Both parties have signed. The contract is now active.
          </p>
        </div>
      )}

      <ContractTextBlock title="Scope of Work" text={contract.scopeOfWork} />
      <ContractTextBlock title="Payment Terms" text={contract.paymentTerms} />
      <ContractTextBlock title="Terms & Conditions" text={contract.termsAndConditions} scroll />
      <ContractTextBlock title="Special Clauses" text={contract.specialClauses} scroll />

      {(contract.startDate || contract.endDate) && (
        <div className="flex flex-wrap gap-6 text-sm">
          {contract.startDate && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Start Date: </span>
              <span className="font-medium dark:text-white">{formatDate(contract.startDate)}</span>
            </div>
          )}
          {contract.endDate && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">End Date: </span>
              <span className="font-medium dark:text-white">{formatDate(contract.endDate)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ContractTab({ project, projectId }: { project: Project; projectId: number }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { data: contract, isLoading, refetch } = useQuery<Contract>({
    queryKey: ['project-contract', projectId],
    queryFn: () => contractApi.getContract(projectId).then((r) => r.data),
  })

  const signMutation = useMutation({
    mutationFn: () => contractApi.signContract(projectId),
    onSuccess: () => {
      toast.success('Contract signed successfully')
      queryClient.invalidateQueries({ queryKey: ['project-contract', projectId] })
      queryClient.invalidateQueries({ queryKey: ['builder-project', projectId] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to sign contract')),
  })

  const downloadMutation = useMutation({
    mutationFn: () => contractApi.downloadPdf(projectId),
    onSuccess: (res) => downloadPdfBlob(res.data, `contract-${contract?.contractNumber ?? projectId}.pdf`),
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to download contract PDF')),
  })

  const handleSaved = () => {
    refetch()
    queryClient.invalidateQueries({ queryKey: ['builder-project', projectId] })
    // Every edit auto-snapshots a contract version, so the history list is now stale.
    queryClient.invalidateQueries({ queryKey: ['contract-versions', projectId] })
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />

  if (!contract?.contractNumber) {
    if (CONTRACT_DRAFT_STATUSES.includes(project.status)) {
      return <ContractForm projectId={projectId} totalAmount={project.finalBudget} onSaved={handleSaved} />
    }
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
        <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No contract for this project yet.</p>
        <p className="mt-1 text-xs">You can draft the contract once the project is awarded.</p>
      </div>
    )
  }

  const editable = !contract.clientSignedAt && !contract.builderSignedAt
  const canEdit = editable && contract.builder?.id === user?.id

  if (editing && canEdit) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contract
        </button>
        <ContractForm
          projectId={projectId}
          contract={contract}
          onSaved={() => {
            setEditing(false)
            handleSaved()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ContractDetails
        contract={contract}
        canEdit={canEdit}
        onEdit={() => setEditing(true)}
        awaitingBuilderSign={contract.status === 'PENDING_BUILDER' && !contract.builderSignedAt}
        onSign={() => signMutation.mutate()}
        signing={signMutation.isPending}
        onDownload={() => downloadMutation.mutate()}
        downloading={downloadMutation.isPending}
      />
      <ContractVersionHistory projectId={projectId} />
    </div>
  )
}

// --- Overview tab ---

function OverviewTab({ project }: { project: Project }) {
  return <ProjectFacts project={project} />
}

// --- Page ---

export default function BuilderProjectView() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const projectId = Number(id)
  const validId = Number.isFinite(projectId)
  const [activeTab, setActiveTab] = useState<TabKey>(() => initialTabFromParam(searchParams.get('tab')))

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectError,
    refetch: refetchProject,
  } = useQuery<Project>({
    queryKey: ['builder-project', projectId],
    queryFn: () => projectApi.getProject(projectId).then((r) => r.data),
    enabled: validId,
  })

  const { data: milestones = [], isLoading: milestonesLoading } = useQuery<Milestone[]>({
    queryKey: ['project-milestones', projectId],
    queryFn: () => milestoneApi.getProjectMilestones(projectId).then((r) => r.data),
    enabled: validId,
  })

  if (projectLoading || milestonesLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: LOADING_SKELETON_COUNT }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (projectError) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-card dark:bg-card">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <p className="font-medium text-gray-900 dark:text-white">Failed to load project</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Please check your connection and try again.</p>
        <button onClick={() => refetchProject()} className="mt-3 text-sm font-medium text-primary hover:underline">
          Try again
        </button>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="rounded-2xl bg-white shadow-card dark:bg-card">
        <EmptyState
          icon={<FolderOpen className="h-12 w-12 text-gray-300 dark:text-gray-600" />}
          title="Project not found"
          description="This project may have been removed, or you may not have access to it."
          action={{ label: 'Back to Projects', to: '/builder/projects' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/builder/projects"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectSupportActions
            projectId={projectId}
            supportPath="/builder/support"
            projectStatus={project.status}
          />
        </div>
      </div>

      <ProjectHeader project={project} milestones={milestones} />

      <div className="bg-white dark:bg-card rounded-2xl shadow-card">
        <div className="border-b dark:border-gray-700">
          <nav className="-mb-px flex overflow-x-auto">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition-colors',
                  activeTab === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab project={project} />}
          {activeTab === 'contract' && <ContractTab project={project} projectId={projectId} />}
          {activeTab === 'milestones' && (
            <BuilderMilestonesTab project={project} projectId={projectId} milestones={milestones} />
          )}
          {activeTab === 'files' && <ProjectFilesTab projectId={projectId} />}
          {activeTab === 'changes' && <ChangeRequestForm projectId={projectId} canSubmit={true} canReview={true} />}
          {activeTab === 'messages' && <ProjectChat projectId={projectId} />}
        </div>
      </div>
    </div>
  )
}
