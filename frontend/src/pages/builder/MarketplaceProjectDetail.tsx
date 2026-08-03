import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { bidApi, projectApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { formatBudgetRange, formatDate, formatRelativeTime } from '@/lib/formatters'
import { resolveAssetUrl } from '@/lib/utils'
import { Project, ProjectStatus, User } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { ProjectFacts } from '@/components/project/ProjectFacts'
import BidFormModal from '@/components/project/BidFormModal'
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CalendarX,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Hammer,
  MapPin,
  ShieldAlert,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Statuses in which the marketplace accepts new bids. */
const BIDDABLE_STATUSES: ReadonlyArray<ProjectStatus> = ['OPEN', 'BIDDING']

/** Attachments whose MIME type starts with this render as thumbnails; the rest as documents. */
const IMAGE_MIME_PREFIX = 'image/'

const BYTES_PER_MB = 1024 * 1024

const PRIMARY_CTA_CLASSES =
  'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:opacity-60'

/** Shape of GET /v1/projects/{id}/images rows (no shared type exists for attachments yet). */
interface ProjectAttachment {
  id: number
  fileName?: string
  fileUrl: string
  fileType?: string
  fileSize?: number
  attachmentType?: string
}

/** Why the bid CTA is (un)available — one explicit state instead of a boolean soup. */
type BidGate =
  | { kind: 'can-bid' }
  | { kind: 'already-bid' }
  | { kind: 'not-accepting' }
  | { kind: 'bidding-closed'; closedOn: string }
  | { kind: 'verified-only' }

function deriveBidGate(project: Project, alreadyBid: boolean, isVerifiedBuilder: boolean): BidGate {
  if (alreadyBid) return { kind: 'already-bid' }
  if (!BIDDABLE_STATUSES.includes(project.status)) return { kind: 'not-accepting' }
  if (project.biddingDeadline && new Date(project.biddingDeadline) <= new Date()) {
    return { kind: 'bidding-closed', closedOn: project.biddingDeadline }
  }
  if (project.verifiedBuildersOnly && !isVerifiedBuilder) return { kind: 'verified-only' }
  return { kind: 'can-bid' }
}

function isImageAttachment(attachment: ProjectAttachment): boolean {
  return (attachment.fileType || '').startsWith(IMAGE_MIME_PREFIX)
}

function formatFileSize(bytes?: number): string | null {
  if (typeof bytes !== 'number') return null
  return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`
}

function initials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

function BackLink() {
  return (
    <Link
      to="/builder/marketplace"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Project Marketplace
    </Link>
  )
}

function LoadErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-6">
      <BackLink />
      <div className="rounded-2xl bg-white p-8 text-center shadow-card dark:bg-card">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <p className="font-medium text-gray-900 dark:text-white">Failed to load this project</p>
        <p className="mt-1 text-sm text-muted-foreground">It may have been removed or is no longer available.</p>
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-medium text-primary hover:underline">
          Try again
        </button>
      </div>
    </div>
  )
}

function BlockedNote({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      <Icon className="h-4 w-4" />
      {text}
    </div>
  )
}

interface BidGateActionProps {
  gate: BidGate
  checking: boolean
  onPlaceBid: () => void
}

function BidGateAction({ gate, checking, onPlaceBid }: BidGateActionProps) {
  if (gate.kind === 'already-bid') {
    return (
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          <ClipboardCheck className="h-4 w-4" />
          You&apos;ve already bid
        </div>
        <Link to="/builder/bids" className="mt-2 block text-xs font-medium text-primary hover:underline">
          View in My Bids
        </Link>
      </div>
    )
  }
  if (gate.kind === 'not-accepting') return <BlockedNote icon={Ban} text="Not accepting bids" />
  if (gate.kind === 'bidding-closed') {
    return <BlockedNote icon={CalendarX} text={`Bidding closed ${formatDate(gate.closedOn)}`} />
  }
  if (gate.kind === 'verified-only') return <BlockedNote icon={ShieldAlert} text="Verified builders only" />
  return (
    <button type="button" onClick={onPlaceBid} disabled={checking} className={PRIMARY_CTA_CLASSES}>
      <Hammer className="h-4 w-4" />
      Place a Bid
    </button>
  )
}

function HeaderBadges({ project }: { project: Project }) {
  const biddingStillOpen = project.biddingDeadline ? new Date(project.biddingDeadline) > new Date() : false
  if (!project.isUrgent && !biddingStillOpen) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {project.isUrgent && (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle className="h-3 w-3" /> Urgent
        </span>
      )}
      {biddingStillOpen && project.biddingDeadline && (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
          <Clock className="h-3 w-3" /> Bidding closes {formatDate(project.biddingDeadline)}
        </span>
      )}
    </div>
  )
}

function HeaderCard({ project, action }: { project: Project; action: ReactNode }) {
  const bidCount = project.bidCount ?? 0
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold dark:text-white">{project.title}</h1>
            <StatusBadge status={project.status} domain="project" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {project.city}
            </span>
            {project.categoryName && (
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> {project.categoryName}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Posted {formatRelativeTime(project.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {bidCount} bid{bidCount === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
            <Wallet className="h-4 w-4 text-primary" />
            {formatBudgetRange(project.budgetMin, project.budgetMax)}
          </p>
          <HeaderBadges project={project} />
        </div>
        <div className="flex-shrink-0">{action}</div>
      </div>
    </div>
  )
}

function ImageGrid({ images, onPreview }: { images: ProjectAttachment[]; onPreview: (src: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Images</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => onPreview(resolveAssetUrl(img.fileUrl))}
            className="overflow-hidden rounded-lg border text-left dark:border-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          >
            <img
              src={resolveAssetUrl(img.fileUrl)}
              alt={img.fileName || 'Project image'}
              loading="lazy"
              className="h-40 w-full object-cover"
            />
            {img.fileName && (
              <p className="truncate px-2 py-1 text-xs text-gray-500 dark:text-gray-400">{img.fileName}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function DocumentList({ documents }: { documents: ProjectAttachment[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Documents</p>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 dark:border-gray-700">
            <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
            <a
              href={resolveAssetUrl(doc.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-sm hover:text-primary hover:underline dark:text-gray-200"
            >
              {doc.fileName || 'Document'}
            </a>
            {formatFileSize(doc.fileSize) && (
              <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {formatFileSize(doc.fileSize)}
              </span>
            )}
            <a
              href={resolveAssetUrl(doc.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-1.5 text-gray-500 transition-colors hover:text-primary"
              aria-label="Download document"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

interface FilesCardProps {
  attachments: ProjectAttachment[]
  isLoading: boolean
  onPreview: (src: string) => void
}

/** Read-only mirror of the client Files tab: image thumbnails + downloadable documents. */
function FilesCard({ attachments, isLoading, onPreview }: FilesCardProps) {
  if (isLoading) return <CardSkeleton />
  const images = attachments.filter(isImageAttachment)
  const documents = attachments.filter((a) => !isImageAttachment(a))
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
      <h3 className="mb-3 font-semibold dark:text-white">Files</h3>
      {attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <FileText className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">No files shared for this project.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {images.length > 0 && <ImageGrid images={images} onPreview={onPreview} />}
          {documents.length > 0 && <DocumentList documents={documents} />}
        </div>
      )}
    </div>
  )
}

function PostedByCard({ client, fallbackCity }: { client: User; fallbackCity: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
      <h3 className="mb-3 font-semibold dark:text-white">Posted by</h3>
      <div className="flex items-center gap-4">
        {client.profileImageUrl ? (
          <img
            src={resolveAssetUrl(client.profileImageUrl)}
            alt={client.name}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {initials(client.name)}
          </div>
        )}
        <div>
          <Link to={`/profile/${client.id}`} className="font-semibold hover:text-primary hover:underline dark:text-white">
            {client.name}
          </Link>
          <p className="text-sm text-muted-foreground">{client.city || fallbackCity}</p>
        </div>
      </div>
    </div>
  )
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt="Project attachment preview"
        className="max-h-full max-w-full rounded-lg object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  )
}

export default function MarketplaceProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [showBidModal, setShowBidModal] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const { data: project, isLoading, isError, refetch } = useQuery({
    queryKey: ['marketplace-project', projectId],
    queryFn: () => projectApi.getProject(projectId).then((r) => r.data),
    enabled: !!id,
  })

  const existsQuery = useQuery({
    queryKey: ['builder-bid-exists', projectId],
    queryFn: () => bidApi.exists(projectId).then((r) => r.data),
    enabled: !!id,
  })

  const attachmentsQuery = useQuery({
    queryKey: ['project-images', projectId],
    queryFn: () => projectApi.getImages(projectId).then((r) => r.data as ProjectAttachment[]),
    enabled: !!id,
  })

  if (isLoading) return <LoadingSpinner fullPage label="Loading project details..." />
  if (isError || !project) return <LoadErrorState onRetry={() => refetch()} />

  const gate = deriveBidGate(project, existsQuery.data?.exists === true, user?.builderProfile?.isVerified === true)
  const openBidModal = () => setShowBidModal(true)

  return (
    <div className="space-y-6">
      <BackLink />
      <HeaderCard
        project={project}
        action={<BidGateAction gate={gate} checking={existsQuery.isPending} onPlaceBid={openBidModal} />}
      />
      <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
        <ProjectFacts project={project} />
      </div>
      <FilesCard
        attachments={attachmentsQuery.data ?? []}
        isLoading={attachmentsQuery.isPending}
        onPreview={setLightboxImage}
      />
      {project.client && <PostedByCard client={project.client} fallbackCity={project.city} />}
      {gate.kind === 'can-bid' && (
        <div className="md:hidden">
          <button
            type="button"
            onClick={openBidModal}
            disabled={existsQuery.isPending}
            className={`${PRIMARY_CTA_CLASSES} w-full justify-center`}
          >
            <Hammer className="h-4 w-4" />
            Place a Bid
          </button>
        </div>
      )}
      <BidFormModal
        projectId={project.id}
        projectTitle={project.title}
        project={project}
        budgetMin={project.budgetMin}
        budgetMax={project.budgetMax}
        isOpen={showBidModal}
        onClose={() => setShowBidModal(false)}
        onSuccess={() => {
          setShowBidModal(false)
          queryClient.invalidateQueries({ queryKey: ['builder-bid-exists', projectId] })
          navigate('/builder/bids')
        }}
      />
      {lightboxImage && <Lightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
    </div>
  )
}
