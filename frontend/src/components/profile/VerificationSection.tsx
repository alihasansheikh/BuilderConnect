import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BadgeCheck, Clock, FileText, Loader2, ShieldCheck, Upload, X, XCircle } from 'lucide-react'
import { builderApi, supplierApi, getApiErrorMessage } from '@/services/api'
import { formatDate } from '@/lib/formatters'
import type { VerificationStatus } from '@/types'

interface VerificationSectionProps {
  role: 'BUILDER' | 'SUPPLIER'
}

interface CredentialRow {
  label: string
  value?: string | null
}

const PANEL = 'bg-white dark:bg-card rounded-2xl shadow-card p-6'
const PRIMARY_BTN =
  'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'

const docName = (url: string): string => url.split('/').pop() || url

/**
 * "Get verified" card on the owner's profile page. Drives the request lifecycle:
 * UNSUBMITTED -> request form, PENDING -> waiting copy, REJECTED -> reason + resubmit,
 * VERIFIED -> minimal confirmation (ProfileHeader already shows the big badge).
 */
export function VerificationSection({ role }: VerificationSectionProps) {
  const queryClient = useQueryClient()
  const location = useLocation()
  const sectionRef = useRef<HTMLElement>(null)
  const isBuilder = role === 'BUILDER'
  const [formOpen, setFormOpen] = useState(false)

  const builderQuery = useQuery({
    queryKey: ['builder-my-profile'],
    queryFn: () => builderApi.getMyProfile().then((r) => r.data),
    enabled: isBuilder,
  })
  const supplierQuery = useQuery({
    queryKey: ['supplier-profile-me'],
    queryFn: () => supplierApi.getMyProfile().then((r) => r.data),
    enabled: !isBuilder,
  })

  const me = isBuilder ? builderQuery.data : supplierQuery.data
  const isLoading = isBuilder ? builderQuery.isLoading : supplierQuery.isLoading

  useEffect(() => {
    if (location.hash === '#verification' && !isLoading) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash, isLoading])

  if (isLoading || !me) return null

  const credentials: CredentialRow[] = isBuilder
    ? [
        { label: 'NTN number', value: builderQuery.data?.ntnNumber },
        { label: 'PEC number', value: builderQuery.data?.pecNumber },
      ]
    : [{ label: 'Registration #', value: supplierQuery.data?.businessRegistrationNumber }]

  const status: VerificationStatus =
    me.isVerified || me.verificationStatus === 'VERIFIED'
      ? 'VERIFIED'
      : me.verificationStatus ?? 'UNSUBMITTED'

  const onSubmitted = () => {
    setFormOpen(false)
    queryClient.invalidateQueries({ queryKey: isBuilder ? ['builder-my-profile'] : ['supplier-profile-me'] })
    queryClient.invalidateQueries({ queryKey: ['user-profile'] })
  }

  return (
    <section ref={sectionRef} id="verification" className={PANEL}>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold dark:text-white">
        <ShieldCheck className="h-5 w-5 text-primary" /> Verification
      </h2>

      {status === 'VERIFIED' ? (
        <p className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
          <BadgeCheck className="h-5 w-5 shrink-0" /> Your account is verified.
        </p>
      ) : status === 'PENDING' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <Clock className="h-4 w-4 shrink-0" /> Verification request submitted
            {me.verificationRequestedAt ? ` on ${formatDate(me.verificationRequestedAt)}` : ''}
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/80">
            Our team is reviewing your request. You will be notified once it is processed.
          </p>
        </div>
      ) : status === 'REJECTED' && !formOpen ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <p className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
            <XCircle className="h-4 w-4 shrink-0" /> Your verification request was rejected
          </p>
          {me.verificationRejectionReason && (
            <p className="mt-1 break-words text-sm text-red-600 dark:text-red-300/90">
              {me.verificationRejectionReason}
            </p>
          )}
          <button type="button" onClick={() => setFormOpen(true)} className={`${PRIMARY_BTN} mt-3`}>
            Resubmit request
          </button>
        </div>
      ) : (
        <VerificationRequestForm role={role} credentials={credentials} onSubmitted={onSubmitted} />
      )}
    </section>
  )
}

interface VerificationRequestFormProps {
  role: 'BUILDER' | 'SUPPLIER'
  credentials: CredentialRow[]
  onSubmitted: () => void
}

function VerificationRequestForm({ role, credentials, onSubmitted }: VerificationRequestFormProps) {
  const isBuilder = role === 'BUILDER'
  const roleApi = isBuilder ? builderApi : supplierApi
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState('')
  const [documents, setDocuments] = useState<string[]>([])

  const hasCredential = credentials.some((c) => c.value?.trim())
  const editHint = isBuilder
    ? 'Add it via the Business Information edit button on this page first.'
    : 'Add it via the profile edit button on this page first.'

  const uploadMutation = useMutation({
    mutationFn: (file: File) => roleApi.uploadVerificationDocument(file),
    onSuccess: (res) => setDocuments((prev) => [...prev, res.data.url]),
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to upload document')),
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      roleApi.requestVerification({
        note: note.trim() || undefined,
        documentUrls: documents.length > 0 ? documents : undefined,
      }),
    onSuccess: () => {
      toast.success('Verification request submitted')
      onSubmitted()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to submit verification request')),
  })

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach((file) => uploadMutation.mutate(file))
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Get the verified badge to build trust with {isBuilder ? 'clients' : 'buyers'}. Our team reviews
        your credentials and any supporting documents you attach.
      </p>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credentials</p>
        <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 px-4 dark:divide-gray-700/60 dark:border-gray-700">
          {credentials.map((cred) => (
            <div key={cred.label} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
              <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">{cred.label}</dt>
              <dd className="min-w-0 break-words text-sm font-medium text-gray-900 dark:text-white">
                {cred.value?.trim() || <span className="italic text-gray-400">Not set</span>}
              </dd>
            </div>
          ))}
        </dl>
        {!hasCredential && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            {isBuilder ? 'An NTN or PEC number is required. ' : 'A business registration number is required. '}
            {editHint}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="verification-note" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Note (optional)
        </label>
        <textarea
          id="verification-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Anything the review team should know..."
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Supporting documents (optional)
        </p>
        {documents.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {documents.map((url) => (
              <li
                key={url}
                className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700/40"
              >
                <span className="flex min-w-0 items-center gap-2 text-gray-700 dark:text-gray-200">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{docName(url)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDocuments((prev) => prev.filter((d) => d !== url))}
                  aria-label={`Remove ${docName(url)}`}
                  className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-600 dark:hover:bg-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.pdf"
          onChange={handleFilePick}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploadMutation.isPending ? 'Uploading...' : 'Add document'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => submitMutation.mutate()}
        disabled={!hasCredential || submitMutation.isPending || uploadMutation.isPending}
        className={PRIMARY_BTN}
      >
        {submitMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        {submitMutation.isPending ? 'Submitting...' : 'Request verification'}
      </button>
    </div>
  )
}
