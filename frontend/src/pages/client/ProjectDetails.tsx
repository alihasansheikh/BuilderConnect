import { useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectApi, bidApi, milestoneApi, reviewApi, chatApi, contractApi, getApiErrorMessage } from '@/services/api'
import { Bid, Milestone, Contract, ProjectStatus } from '@/types'
import { FileText, CheckCircle, Clock, Shield, GitPullRequest, Download } from 'lucide-react'
import { MilestoneUpdatesExpander } from '@/components/project/MilestoneUpdatesExpander'
import { ProjectSupportActions } from '@/components/project/ProjectSupportActions'
import ChangeRequestForm from '@/components/project/ChangeRequestForm'
import BidCard from '@/components/project/BidCard'
import { ProjectChat } from '@/components/project/ProjectChat'
import { ProjectReviewTab } from '@/components/project/ProjectReviewTab'
import ProjectFilesTab from '@/components/project/ProjectFilesTab'
import { ProjectFacts } from '@/components/project/ProjectFacts'
import { ContractVersionHistory } from '@/components/project/ContractVersionHistory'
import ReasonDialog from '@/components/ui/ReasonDialog'
import { ModalShell } from '@/components/ui/ModalShell'
import { FilterChips } from '@/components/ui/FilterChips'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn, resolveAssetUrl } from '@/lib/utils'

type TabKey = 'overview' | 'bids' | 'contract' | 'milestones' | 'changes' | 'chat' | 'review' | 'images'

const VALID_TABS: ReadonlyArray<TabKey> = [
  'overview',
  'bids',
  'contract',
  'milestones',
  'changes',
  'chat',
  'review',
  'images',
]

/** Alternate names notification actionUrls use for tabs on this page. */
const TAB_ALIASES: Record<string, TabKey> = {
  reviews: 'review',
  messages: 'chat',
  files: 'images',
}

/** Resolves a ?tab= deep link (e.g. from a notification actionUrl) to a valid tab key. */
function initialTabFromParam(param: string | null): TabKey {
  if (!param) return 'overview'
  if ((VALID_TABS as readonly string[]).includes(param)) return param as TabKey
  return TAB_ALIASES[param] ?? 'overview'
}

/** Statuses the client can always cancel from; AWARDED/CONTRACT_PENDING additionally require an unsigned contract. */
const PRE_AWARD_CANCELLABLE: ReadonlyArray<ProjectStatus> = ['DRAFT', 'OPEN', 'BIDDING']
const AWARDED_PHASE: ReadonlyArray<ProjectStatus> = ['AWARDED', 'CONTRACT_PENDING']

type BidFilter = 'all' | 'new' | 'shortlisted'

const BID_FILTERS: ReadonlyArray<{ value: BidFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'shortlisted', label: 'Shortlisted' },
]

function bidMatchesFilter(bid: Bid, filter: BidFilter): boolean {
  if (filter === 'new') return bid.status === 'SUBMITTED' || bid.status === 'UNDER_REVIEW'
  if (filter === 'shortlisted') return bid.status === 'SHORTLISTED'
  return true
}

/** One party's signature status on the contract. */
function SignatureBox({ label, signedAt }: { label: string; signedAt?: string }) {
  return (
    <div className="rounded-lg border p-4 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
      <div className="mb-2 flex items-center gap-2">
        {signedAt ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        )}
        <span className="font-medium dark:text-white">{label}</span>
      </div>
      <p className={cn('text-sm', signedAt ? 'text-green-600' : 'text-gray-500 dark:text-gray-400')}>
        {signedAt ? `Signed on ${formatDate(signedAt)}` : 'Awaiting signature'}
      </p>
    </div>
  )
}

/** A labelled, pre-wrapped block of contract prose; renders nothing when empty. */
function ContractSection({ title, body }: { title: string; body?: string }) {
  if (!body) return null
  return (
    <div>
      <h4 className="mb-2 font-medium dark:text-white">{title}</h4>
      <p className="whitespace-pre-wrap rounded-lg border bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-400">
        {body}
      </p>
    </div>
  )
}

/** Read-only payment state shown once the client has marked a milestone paid. */
function MilestonePaymentStatus({ milestone }: { milestone: Milestone }) {
  if (milestone.status !== 'PAID' && milestone.status !== 'CONFIRMED') return null
  const confirmed = milestone.status === 'CONFIRMED'
  const proofUrl = milestone.paymentProofUrl ? resolveAssetUrl(milestone.paymentProofUrl) : null
  const stampDate = confirmed ? milestone.paymentConfirmedAt : milestone.paidAt
  return (
    <div className="mt-3 rounded-lg border p-3 text-sm dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn('font-medium', confirmed ? 'text-green-600' : 'text-gray-700 dark:text-gray-200')}>
          {confirmed ? 'Payment confirmed' : 'Paid'}
          {stampDate ? ` ${formatDate(stampDate)}` : ''}
        </span>
        {proofUrl && (
          <a
            href={proofUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <FileText className="h-4 w-4" />
            View proof
          </a>
        )}
      </div>
      {!confirmed && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Awaiting builder confirmation</p>
      )}
      {milestone.paymentNote && (
        <p className="mt-2 text-gray-600 dark:text-gray-400">{milestone.paymentNote}</p>
      )}
    </div>
  )
}

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabKey>(() => initialTabFromParam(searchParams.get('tab')))
  const [bidFilter, setBidFilter] = useState<BidFilter>('all')
  const [payingMilestone, setPayingMilestone] = useState<Milestone | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [payNote, setPayNote] = useState('')
  const [rejectingMilestoneId, setRejectingMilestoneId] = useState<number | null>(null)
  const [cancellingProject, setCancellingProject] = useState(false)
  const [awardingBid, setAwardingBid] = useState<Bid | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectApi.getProject(Number(id)).then(r => r.data),
    enabled: !!id,
  })

  const { data: bids } = useQuery({
    queryKey: ['project-bids', id],
    queryFn: () => bidApi.getProjectBids(Number(id)).then(r => r.data),
    enabled: !!id && activeTab === 'bids',
  })

  const { data: milestones } = useQuery({
    queryKey: ['project-milestones', id],
    queryFn: () => milestoneApi.getProjectMilestones(Number(id)).then(r => r.data),
    enabled: !!id && activeTab === 'milestones',
  })

  // Also fetched during the awarded phase (not just on the contract tab) so the header's
  // "Cancel project" gate can check whether the contract is already fully signed.
  const isAwardedPhase = !!project && AWARDED_PHASE.includes(project.status)
  const { data: contract } = useQuery<Contract>({
    queryKey: ['project-contract', id],
    queryFn: () => contractApi.getContract(Number(id)).then(r => r.data),
    enabled: !!id && (activeTab === 'contract' || isAwardedPhase),
  })

  const { data: myProjectReview } = useQuery({
    queryKey: ['project-review-me', id],
    queryFn: () => reviewApi.getMyProjectReview(Number(id)).then(r => r.data),
    enabled: !!id && project?.status === 'COMPLETED',
  })

  // Invalidate the caches that feed the project lists + dashboard so their status/counts
  // refresh immediately after a mutation (otherwise stale for up to the 5-minute staleTime).
  const invalidateProjectAndLists = () => {
    queryClient.invalidateQueries({ queryKey: ['project', id] })
    queryClient.invalidateQueries({ queryKey: ['client-projects'] })
    queryClient.invalidateQueries({ queryKey: ['client-projects-all'] })
  }

  const approveMilestoneMutation = useMutation({
    mutationFn: (milestoneId: number) => milestoneApi.approve(milestoneId),
    onSuccess: () => {
      toast.success('Milestone approved!')
      queryClient.invalidateQueries({ queryKey: ['project-milestones', id] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to approve milestone')),
  })

  const rejectMilestoneMutation = useMutation({
    mutationFn: ({ milestoneId, reason }: { milestoneId: number; reason: string }) =>
      milestoneApi.reject(milestoneId, reason),
    onSuccess: () => {
      toast.success('Milestone rejected.')
      queryClient.invalidateQueries({ queryKey: ['project-milestones', id] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to reject milestone')),
  })

  const shortlistMutation = useMutation({
    mutationFn: (bidId: number) => bidApi.shortlist(bidId),
    onSuccess: () => {
      toast.success('Bid shortlisted.')
      queryClient.invalidateQueries({ queryKey: ['project-bids', id] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to shortlist bid')),
  })

  const awardMutation = useMutation({
    mutationFn: ({ projectId, bidId }: { projectId: number; bidId: number }) =>
      projectApi.award(projectId, bidId),
    onSuccess: () => {
      toast.success('Project awarded successfully!')
      setAwardingBid(null)
      queryClient.invalidateQueries({ queryKey: ['project-bids', id] })
      queryClient.invalidateQueries({ queryKey: ['project-milestones', id] })
      invalidateProjectAndLists()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to award project')),
  })

  const publishMutation = useMutation({
    mutationFn: (projectId: number) => projectApi.publish(projectId),
    onSuccess: () => {
      toast.success('Project published successfully!')
      invalidateProjectAndLists()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to publish project')),
  })

  const cancelProjectMutation = useMutation({
    mutationFn: (reason: string) => projectApi.cancel(Number(id), reason),
    onSuccess: () => {
      toast.success('Project cancelled. All active bids were rejected and refunded.')
      invalidateProjectAndLists()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to cancel project')),
  })

  const openChatMutation = useMutation({
    mutationFn: (builderUserId: number) => chatApi.createDirectRoom(builderUserId),
    onSuccess: ({ data: room }) => {
      // The room list is cached for 5 minutes, so a brand-new room is absent from it until
      // something marks it stale — without this, Messages opens to an empty list.
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
      navigate(`/client/messages?roomId=${room.id}`)
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to open chat')),
  })

  const signContractMutation = useMutation({
    mutationFn: () => contractApi.signContract(Number(id)),
    onSuccess: () => {
      toast.success('Contract signed successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-contract', id] })
      invalidateProjectAndLists()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to sign contract')),
  })

  // Direct milestone payment (escrow removed): the client records a payment against a milestone by
  // uploading proof (image/PDF, required). The builder later confirms receipt (→ CONFIRMED).
  const markPaidMutation = useMutation({
    mutationFn: ({ milestoneId, proof, note }: { milestoneId: number; proof: File; note?: string }) =>
      milestoneApi.pay(milestoneId, proof, note),
    onSuccess: () => {
      toast.success('Payment recorded.')
      closePayModal()
      queryClient.invalidateQueries({ queryKey: ['project-milestones', id] })
      queryClient.invalidateQueries({ queryKey: ['project', id] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to record payment')),
  })

  const closePayModal = () => {
    setPayingMilestone(null)
    setProofFile(null)
    setPayNote('')
  }

  const submitPayment = () => {
    if (!payingMilestone || !proofFile) return
    markPaidMutation.mutate({
      milestoneId: payingMilestone.id,
      proof: proofFile,
      note: payNote.trim() || undefined,
    })
  }

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true)
      const res = await contractApi.downloadPdf(Number(id))
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${contract?.contractNumber || 'contract'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to download PDF'))
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Loading project...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-lg text-center">
        <h2 className="text-lg font-semibold mb-2">Project not found</h2>
        <Link to="/client/projects" className="text-primary hover:underline">
          Back to My Projects
        </Link>
      </div>
    )
  }

  const awardedBuilderName = project.awardedBuilder?.name || 'the builder'
  const filteredBids: Bid[] = (bids ?? []).filter((bid: Bid) => bidMatchesFilter(bid, bidFilter))

  // 4a cancellation rules: any pre-award status, or awarded while the contract is not yet
  // signed by both parties (no contract row → `fullySigned` undefined → still cancellable).
  const cancellable =
    PRE_AWARD_CANCELLABLE.includes(project.status) ||
    (AWARDED_PHASE.includes(project.status) && !contract?.fullySigned)

  return (
    <div className="space-y-6">
      <ReasonDialog
        isOpen={rejectingMilestoneId !== null}
        title="Rejection Reason"
        placeholder="Enter rejection reason..."
        onConfirm={(reason) => {
          if (rejectingMilestoneId !== null) {
            rejectMilestoneMutation.mutate({ milestoneId: rejectingMilestoneId, reason })
            setRejectingMilestoneId(null)
          }
        }}
        onCancel={() => setRejectingMilestoneId(null)}
      />

      <ReasonDialog
        isOpen={cancellingProject}
        title="Cancel this project?"
        placeholder="Why are you cancelling? Active bids will be rejected and their lead credits refunded..."
        onConfirm={(reason) => {
          cancelProjectMutation.mutate(reason)
          setCancellingProject(false)
        }}
        onCancel={() => setCancellingProject(false)}
      />

      {/* Record payment — upload proof (required) + optional note against a single milestone */}
      <ModalShell
        open={payingMilestone !== null}
        onOpenChange={(open) => { if (!open) closePayModal() }}
        title="Record payment"
        size="sm"
        closeDisabled={markPaidMutation.isPending}
        footer={
          <>
            <button
              onClick={closePayModal}
              disabled={markPaidMutation.isPending}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={submitPayment}
              disabled={markPaidMutation.isPending || !proofFile}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:opacity-50"
            >
              {markPaidMutation.isPending ? 'Recording...' : 'Confirm'}
            </button>
          </>
        }
      >
        {payingMilestone && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Record a payment of{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(payingMilestone.paymentAmount)}</span>{' '}
              for <span className="font-medium">{payingMilestone.title}</span>. Upload proof of payment (image or PDF).
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Proof of payment <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Note (optional)</label>
              <textarea
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                rows={3}
                placeholder="Reference number, bank, or any detail..."
                className="w-full rounded-md border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        )}
      </ModalShell>

      {/* Award confirmation — replaces the native window.confirm on accepting a bid */}
      <ModalShell
        open={awardingBid !== null}
        onOpenChange={(open) => { if (!open && !awardMutation.isPending) setAwardingBid(null) }}
        title="Award this project?"
        size="sm"
        closeDisabled={awardMutation.isPending}
        footer={
          <>
            <button
              onClick={() => setAwardingBid(null)}
              disabled={awardMutation.isPending}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => awardingBid && awardMutation.mutate({ projectId: project.id, bidId: awardingBid.id })}
              disabled={awardMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:opacity-50"
            >
              {awardMutation.isPending ? 'Awarding...' : 'Award project'}
            </button>
          </>
        }
      >
        {awardingBid && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Award this project to{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{awardingBid.builderName}</span> for{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(awardingBid.amount)}</span>.
            </p>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              All other bids will be rejected and this cannot be undone.
            </p>
          </div>
        )}
      </ModalShell>

      {/* Header */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card p-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold dark:text-white">{project.title}</h1>
              <StatusBadge status={project.status} domain="project" size="md" />
              {project.isUrgent && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  Urgent
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Project #{project.projectNumber} • Created {formatDate(project.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ProjectSupportActions
              projectId={project.id}
              supportPath="/client/support"
              projectStatus={project.status}
            />
            {project.status === 'DRAFT' && (
              <button
                onClick={() => publishMutation.mutate(project.id)}
                disabled={publishMutation.isPending}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {publishMutation.isPending ? 'Publishing...' : 'Publish Project'}
              </button>
            )}
            {cancellable && (
              <button
                onClick={() => setCancellingProject(true)}
                disabled={cancelProjectMutation.isPending}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {cancelProjectMutation.isPending ? 'Cancelling...' : 'Cancel project'}
              </button>
            )}
            <Link
              to="/client/projects"
              className="px-4 py-2 border dark:border-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-card rounded-2xl shadow-card">
        <div className="border-b dark:border-gray-700">
          <nav className="flex -mb-px overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'bids', label: `Bids (${project.bidCount || 0})` },
              { key: 'contract', label: 'Contract', icon: FileText },
              { key: 'milestones', label: 'Milestones' },
              { key: 'changes', label: 'Change Requests', icon: GitPullRequest },
              { key: 'chat', label: 'Messages' },
              { key: 'images', label: 'Files' },
              ...(project.status === 'COMPLETED'
                ? [{ key: 'review', label: myProjectReview?.hasReviewed ? 'Your Review' : 'Leave Review' }]
                : []),
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && <ProjectFacts project={project} />}

          {/* Bids Tab */}
          {activeTab === 'bids' && (
            <div>
              {!bids?.length ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No bids received yet.</p>
                  {project.status === 'DRAFT' && (
                    <p className="mt-2">Publish your project to start receiving bids.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <FilterChips options={BID_FILTERS} value={bidFilter} onChange={setBidFilter} />
                  {filteredBids.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No bids match this filter.
                    </p>
                  ) : (
                    filteredBids.map((bid: Bid) => (
                      <BidCard
                        key={bid.id}
                        bid={bid}
                        canAct={project.status === 'OPEN' || project.status === 'BIDDING'}
                        onShortlist={(bidId) => shortlistMutation.mutate(bidId)}
                        shortlistPending={shortlistMutation.isPending}
                        onAward={(b) => setAwardingBid(b)}
                        awardPending={awardMutation.isPending}
                        onMessage={(builderUserId) => openChatMutation.mutate(builderUserId)}
                        messagePending={openChatMutation.isPending}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Contract Tab */}
          {activeTab === 'contract' && (
            <div>
              {!contract || !contract?.contractNumber ? (
                <div className="text-center py-10">
                  <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No contract yet.</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Waiting for {awardedBuilderName} to draft the contract. You'll be able to review and sign it here.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Contract Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2 dark:text-white">
                        <Shield className="h-5 w-5" />
                        Contract {contract.contractNumber}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Total Amount: <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(contract.totalAmount)}</span>
                      </p>
                    </div>
                    <StatusBadge status={contract.status} domain="contract" size="md" />
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SignatureBox label="Client Signature" signedAt={contract.clientSignedAt} />
                    <SignatureBox label="Builder Signature" signedAt={contract.builderSignedAt} />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    {contract.status === 'PENDING_CLIENT' && !contract.clientSignedAt && (
                      <button
                        onClick={() => signContractMutation.mutate()}
                        disabled={signContractMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:opacity-50"
                      >
                        {signContractMutation.isPending ? 'Signing...' : 'Sign contract'}
                      </button>
                    )}
                    {contract.fullySigned && (
                      <button
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <Download className="h-4 w-4" />
                        {downloadingPdf ? 'Preparing...' : 'Download PDF'}
                      </button>
                    )}
                  </div>

                  {/* Contract Details */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Start Date:</span>
                        <p className="font-medium dark:text-gray-300">{formatDate(contract.startDate)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">End Date:</span>
                        <p className="font-medium dark:text-gray-300">{formatDate(contract.endDate)}</p>
                      </div>
                    </div>

                    <ContractSection title="Scope of Work" body={contract.scopeOfWork} />
                    <ContractSection title="Payment Terms" body={contract.paymentTerms} />
                    <ContractSection title="Terms & Conditions" body={contract.termsAndConditions} />
                    <ContractSection title="Special Clauses" body={contract.specialClauses} />
                  </div>

                  <ContractVersionHistory projectId={Number(id)} />
                </div>
              )}
            </div>
          )}

          {/* Milestones Tab */}
          {activeTab === 'milestones' && (
            <div>
              {!milestones?.length ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No milestones defined yet.</p>
                  <p className="mt-2">The builder will create milestones after the contract is signed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone: Milestone, index: number) => {
                    const inReview = milestone.status === 'COMPLETED' || milestone.status === 'UNDER_REVIEW'
                    // Work-gated payment: only a milestone whose completed work you approved is payable.
                    const payable = milestone.status === 'APPROVED'
                    return (
                      <div key={milestone.id} className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/40">
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-gray-400 dark:text-gray-500 text-sm">#{index + 1}</span>
                              <span className="font-semibold dark:text-white">{milestone.title}</span>
                              <StatusBadge status={milestone.status} domain="milestone" />
                            </div>
                            {milestone.description && (
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{milestone.description}</p>
                            )}
                            <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <span>Amount: {formatCurrency(milestone.paymentAmount)}</span>
                              {milestone.dueDate && <span>Due: {formatDate(milestone.dueDate)}</span>}
                            </div>
                            {inReview && milestone.completionEvidence && (
                              <p className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                                <span className="font-medium">Builder&apos;s note:</span> {milestone.completionEvidence}
                              </p>
                            )}
                            {milestone.status === 'REJECTED' && milestone.rejectionReason && (
                              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
                                <span className="font-medium">Changes requested:</span> {milestone.rejectionReason}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            {inReview && (
                              <>
                                <button
                                  onClick={() => approveMilestoneMutation.mutate(milestone.id)}
                                  disabled={approveMilestoneMutation.isPending}
                                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectingMilestoneId(milestone.id)}
                                  disabled={rejectMilestoneMutation.isPending}
                                  className="border border-red-600 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-50 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {payable && (
                              <button
                                onClick={() => setPayingMilestone(milestone)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90"
                              >
                                Mark as paid ({formatCurrency(milestone.paymentAmount)})
                              </button>
                            )}
                          </div>
                        </div>
                        <MilestonePaymentStatus milestone={milestone} />
                        <MilestoneUpdatesExpander milestoneId={milestone.id} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Change Requests Tab */}
          {activeTab === 'changes' && (
            <ChangeRequestForm projectId={Number(id)} canSubmit={true} canReview={true} />
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && <ProjectChat projectId={project.id} />}

          {/* Files Tab */}
          {activeTab === 'images' && <ProjectFilesTab projectId={project.id} />}

          {/* Review Tab */}
          {activeTab === 'review' && (
            <ProjectReviewTab
              projectId={Number(id)}
              builderName={project.awardedBuilder?.name}
              reviewCheck={myProjectReview}
              onSubmitted={() => {
                queryClient.invalidateQueries({ queryKey: ['project', id] })
                queryClient.invalidateQueries({ queryKey: ['project-review-me', id] })
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
