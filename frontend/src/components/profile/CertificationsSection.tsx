import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ExternalLink, FileText, Award, Loader2 } from 'lucide-react'
import { ModalShell } from '@/components/ui/ModalShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { certificationApi, getApiErrorMessage } from '@/services/api'
import { formatDate } from '@/lib/formatters'
import { cn, resolveAssetUrl } from '@/lib/utils'
import type { UserProfile, Certification, CertificationRequest } from '@/types'

interface ProfileSectionProps {
  profile: UserProfile
  isOwner: boolean
  onRefetch: () => void
}

const PANEL = 'bg-white dark:bg-card rounded-2xl shadow-card p-6'
const NESTED = 'rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40'
const PRIMARY_BTN =
  'inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90'
const INPUT_CLS =
  'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const LINK_CLS = 'inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline'

interface FormState {
  name: string
  issuingOrganization: string
  issueDate: string
  expiryDate: string
  credentialId: string
  credentialUrl: string
  documentUrl: string
}

const EMPTY_FORM: FormState = {
  name: '',
  issuingOrganization: '',
  issueDate: '',
  expiryDate: '',
  credentialId: '',
  credentialUrl: '',
  documentUrl: '',
}

const toDateInput = (s?: string): string => (s ? s.slice(0, 10) : '')

function toForm(cert: Certification): FormState {
  return {
    name: cert.name,
    issuingOrganization: cert.issuingOrganization || '',
    issueDate: toDateInput(cert.issueDate),
    expiryDate: toDateInput(cert.expiryDate),
    credentialId: cert.credentialId || '',
    credentialUrl: cert.credentialUrl || '',
    documentUrl: cert.documentUrl || '',
  }
}

function toRequest(form: FormState): CertificationRequest {
  const t = (v: string) => v.trim() || undefined
  return {
    name: form.name.trim(),
    issuingOrganization: t(form.issuingOrganization),
    issueDate: t(form.issueDate),
    expiryDate: t(form.expiryDate),
    credentialId: t(form.credentialId),
    credentialUrl: t(form.credentialUrl),
    documentUrl: t(form.documentUrl),
  }
}

export function CertificationsSection({ profile, isOwner, onRefetch }: ProfileSectionProps) {
  const userId = profile.userId
  // Suppliers write through the role-neutral /v1/users/me/... path (the /v1/builder/** URL rule
  // 403s them); the role is threaded into every certificationApi write call below.
  const role = profile.role
  const canManage = isOwner && (role === 'BUILDER' || role === 'SUPPLIER')
  const [editing, setEditing] = useState<Certification | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Certification | null>(null)

  const { data: certs = [], isLoading } = useQuery({
    queryKey: ['certifications', userId],
    queryFn: () => certificationApi.list(userId).then((r) => r.data),
  })

  const openCreate = () => (setEditing(null), setShowForm(true))
  const openEdit = (cert: Certification) => (setEditing(cert), setShowForm(true))
  const isEmpty = certs.length === 0

  return (
    <section className={PANEL}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold dark:text-white">Certifications</h2>
        {canManage && (
          <button type="button" onClick={openCreate} className={PRIMARY_BTN}>
            <Plus className="h-4 w-4" /> Add certification
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : certs.length > 0 ? (
        // Capped, internally-scrolling list so a long list never grows the section unbounded.
        <div className="-mr-2 max-h-[26rem] space-y-3 overflow-y-auto pr-2 [scrollbar-width:thin]">
          {certs.map((cert) => (
            <CertificationRow
              key={cert.id}
              cert={cert}
              isOwner={canManage}
              onEdit={() => openEdit(cert)}
              onDelete={() => setDeleteTarget(cert)}
            />
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<Award className="h-10 w-10 text-gray-400" />}
          title={canManage ? 'Add your credentials' : 'No certifications yet'}
          description={
            canManage
              ? 'List your licenses and certifications to build trust with clients.'
              : `This ${role === 'SUPPLIER' ? 'supplier' : 'builder'} has not listed any certifications yet.`
          }
        />
      ) : null}

      {showForm && (
        <CertificationFormModal
          userId={userId}
          role={role}
          cert={editing}
          onClose={() => setShowForm(false)}
          onRefetch={onRefetch}
        />
      )}
      {deleteTarget && (
        <DeleteCertificationModal
          userId={userId}
          role={role}
          cert={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onRefetch={onRefetch}
        />
      )}
    </section>
  )
}

interface CertificationRowProps {
  cert: Certification
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
}

function CertificationRow({ cert, isOwner, onEdit, onDelete }: CertificationRowProps) {
  const dates = [
    cert.issueDate && `Issued ${formatDate(cert.issueDate)}`,
    cert.expiryDate && `Expires ${formatDate(cert.expiryDate)}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className={cn(NESTED, 'flex items-start gap-3 p-4')}>
      <Award className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <h4 className="font-semibold dark:text-white">{cert.name}</h4>
        {cert.issuingOrganization && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{cert.issuingOrganization}</p>
        )}
        {dates && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{dates}</p>}
        {cert.credentialId && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Credential ID: <span className="font-medium">{cert.credentialId}</span>
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-4">
          {cert.credentialUrl && (
            <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className={LINK_CLS}>
              <ExternalLink className="h-3.5 w-3.5" /> View credential
            </a>
          )}
          {cert.documentUrl && (
            <a href={resolveAssetUrl(cert.documentUrl)} target="_blank" rel="noopener noreferrer" className={LINK_CLS}>
              <FileText className="h-3.5 w-3.5" /> View document
            </a>
          )}
        </div>
      </div>
      {isOwner && (
        <div className="flex flex-shrink-0 gap-1.5">
          <IconButton label="Edit certification" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete certification" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </IconButton>
        </div>
      )}
    </div>
  )
}

function IconButton(p: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={p.label}
      title={p.label}
      onClick={p.onClick}
      className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
    >
      {p.children}
    </button>
  )
}

interface CertificationFormModalProps {
  userId: number
  role: string
  cert: Certification | null
  onClose: () => void
  onRefetch: () => void
}

function CertificationFormModal({ userId, role, cert, onClose, onRefetch }: CertificationFormModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(cert ? toForm(cert) : EMPTY_FORM)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const uploadMutation = useMutation({
    mutationFn: (file: File) => certificationApi.uploadDocument(file, role).then((r) => r.data.url),
    onSuccess: (url) => {
      setForm((prev) => ({ ...prev, documentUrl: url }))
      toast.success('Document uploaded')
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to upload document')),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: CertificationRequest) =>
      cert ? certificationApi.update(cert.id, payload, role) : certificationApi.create(payload, role),
    onSuccess: () => {
      toast.success(cert ? 'Certification updated' : 'Certification added')
      queryClient.invalidateQueries({ queryKey: ['certifications', userId] })
      onRefetch()
      onClose()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to save certification')),
  })

  const saving = saveMutation.isPending
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Certification name is required')
    saveMutation.mutate(toRequest(form))
  }

  return (
    <ModalShell
      open
      onOpenChange={(next) => !next && onClose()}
      title={cert ? 'Edit certification' : 'Add certification'}
      size="lg"
      closeDisabled={saving}
      footer={
        <>
          <CancelButton onClick={onClose} disabled={saving} />
          <button type="submit" form="certification-form" disabled={saving} className={cn(PRIMARY_BTN, 'disabled:opacity-50')}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="certification-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField label="Certification name" required value={form.name} onChange={(v) => set('name', v)} placeholder="e.g. Certified Project Manager" />
        <TextField label="Issuing organization" value={form.issuingOrganization} onChange={(v) => set('issuingOrganization', v)} placeholder="e.g. Pakistan Engineering Council" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="Issue date" type="date" value={form.issueDate} onChange={(v) => set('issueDate', v)} />
          <TextField label="Expiry date" type="date" value={form.expiryDate} onChange={(v) => set('expiryDate', v)} />
        </div>
        <TextField label="Credential ID" value={form.credentialId} onChange={(v) => set('credentialId', v)} placeholder="e.g. PEC-12345" />
        <TextField label="Credential URL" type="url" value={form.credentialUrl} onChange={(v) => set('credentialUrl', v)} placeholder="https://..." />
        <DocumentUploader
          documentUrl={form.documentUrl}
          uploading={uploadMutation.isPending}
          onUpload={(file) => uploadMutation.mutate(file)}
          onRemove={() => set('documentUrl', '')}
        />
      </form>
    </ModalShell>
  )
}

interface DocumentUploaderProps {
  documentUrl: string
  uploading: boolean
  onUpload: (file: File) => void
  onRemove: () => void
}

function DocumentUploader({ documentUrl, uploading, onUpload, onRemove }: DocumentUploaderProps) {
  return (
    <FieldWrap label="Document">
      {documentUrl && (
        <div className={cn(NESTED, 'mb-2 flex items-center justify-between px-3 py-2')}>
          <a href={resolveAssetUrl(documentUrl)} target="_blank" rel="noopener noreferrer" className={LINK_CLS}>
            <FileText className="h-4 w-4" /> View uploaded document
          </a>
          <button type="button" onClick={onRemove} className="text-xs font-medium text-red-500 hover:underline">
            Remove
          </button>
        </div>
      )}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {uploading ? 'Uploading...' : documentUrl ? 'Replace document' : 'Upload document'}
        <input
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
            e.target.value = ''
          }}
        />
      </label>
    </FieldWrap>
  )
}

function TextField(p: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <FieldWrap label={p.label} required={p.required}>
      <input
        type={p.type || 'text'}
        className={INPUT_CLS}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        placeholder={p.placeholder}
      />
    </FieldWrap>
  )
}

function FieldWrap({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  )
}

function CancelButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      Cancel
    </button>
  )
}

interface DeleteCertificationModalProps {
  userId: number
  role: string
  cert: Certification
  onClose: () => void
  onRefetch: () => void
}

function DeleteCertificationModal({ userId, role, cert, onClose, onRefetch }: DeleteCertificationModalProps) {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: () => certificationApi.remove(cert.id, role),
    onSuccess: () => {
      toast.success('Certification removed')
      queryClient.invalidateQueries({ queryKey: ['certifications', userId] })
      onRefetch()
      onClose()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to remove certification')),
  })

  const pending = deleteMutation.isPending
  return (
    <ModalShell
      open
      onOpenChange={(next) => !next && onClose()}
      title="Remove certification"
      size="sm"
      closeDisabled={pending}
      footer={
        <>
          <CancelButton onClick={onClose} disabled={pending} />
          <button
            type="button"
            onClick={() => deleteMutation.mutate()}
            disabled={pending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? 'Removing...' : 'Remove'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Are you sure you want to remove <span className="font-semibold dark:text-white">{cert.name}</span>? This cannot
        be undone.
      </p>
    </ModalShell>
  )
}
