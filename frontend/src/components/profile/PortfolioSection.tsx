import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, ExternalLink, ImageIcon, Building2, X, Loader2,
  ChevronLeft, ChevronRight, CalendarDays, Wallet, Clock,
} from 'lucide-react'
import { ModalShell } from '@/components/ui/ModalShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { portfolioApi, getApiErrorMessage } from '@/services/api'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn, resolveAssetUrl, parseJsonArray } from '@/lib/utils'
import type {
  UserProfile,
  PortfolioItem,
  PortfolioItemRequest,
  CompletedProjectSummary,
} from '@/types'

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
const CHIP = 'inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'

interface FormState {
  title: string
  description: string
  projectCost: string
  durationDays: string
  year: string
  externalUrl: string
  images: string[]
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  projectCost: '',
  durationDays: '',
  year: '',
  externalUrl: '',
  images: [],
}

function toForm(item: PortfolioItem): FormState {
  return {
    title: item.title,
    description: item.description || '',
    projectCost: item.projectCost != null ? String(item.projectCost) : '',
    durationDays: item.durationDays != null ? String(item.durationDays) : '',
    year: item.year != null ? String(item.year) : '',
    externalUrl: item.externalUrl || '',
    images: parseJsonArray(item.images),
  }
}

/**
 * A portfolio "External link" is only meaningful if it points OFF the platform. Normalise a
 * protocol-less entry (example.com → https://example.com) and reject anything that isn't a valid
 * http(s) URL or that resolves back to this app's own origin (e.g. a pasted profile URL) — so
 * "View project" never dead-ends inside the app.
 */
function externalHref(raw?: string): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.origin === window.location.origin) return null
    return url.href
  } catch {
    return null
  }
}

function toRequest(form: FormState): PortfolioItemRequest {
  const num = (v: string) => (v.trim() ? Number(v) : null)
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    images: form.images,
    projectCost: num(form.projectCost),
    durationDays: num(form.durationDays),
    year: num(form.year),
    externalUrl: form.externalUrl.trim() || undefined,
  }
}

export function PortfolioSection({ profile, isOwner, onRefetch }: ProfileSectionProps) {
  const userId = profile.userId
  const [editing, setEditing] = useState<PortfolioItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null)
  const [detailItem, setDetailItem] = useState<PortfolioItem | null>(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['portfolio', userId],
    queryFn: () => portfolioApi.list(userId).then((r) => r.data),
  })

  const completed = profile.completedProjects || []
  const openCreate = () => (setEditing(null), setShowForm(true))
  const openEdit = (item: PortfolioItem) => (setEditing(item), setShowForm(true))
  const isEmpty = items.length === 0 && completed.length === 0

  return (
    <section className={PANEL}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold dark:text-white">Portfolio</h2>
        {isOwner && (
          <button type="button" onClick={openCreate} className={PRIMARY_BTN}>
            <Plus className="h-4 w-4" /> Add work
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<ImageIcon className="h-10 w-10 text-gray-400" />}
          title={isOwner ? 'Showcase your best work' : 'No portfolio items yet'}
          description={
            isOwner
              ? 'Add completed projects with photos so clients can see what you deliver.'
              : 'This builder has not added any portfolio work yet.'
          }
        />
      ) : (
        <div className="space-y-6">
          {items.length > 0 && (
            <HorizontalScroller>
              {items.map((item) => (
                <PortfolioCard
                  key={item.id}
                  item={item}
                  isOwner={isOwner}
                  onOpen={() => setDetailItem(item)}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </HorizontalScroller>
          )}

          {completed.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Completed on BuilderConnect
              </h3>
              <HorizontalScroller>
                {completed.map((p) => (
                  <CompletedProjectCard key={p.id} project={p} />
                ))}
              </HorizontalScroller>
            </div>
          )}
        </div>
      )}

      {detailItem && <PortfolioDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
      {showForm && (
        <PortfolioFormModal userId={userId} item={editing} onClose={() => setShowForm(false)} onRefetch={onRefetch} />
      )}
      {deleteTarget && (
        <DeletePortfolioModal
          userId={userId}
          item={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onRefetch={onRefetch}
        />
      )}
    </section>
  )
}

interface PortfolioCardProps {
  item: PortfolioItem
  isOwner: boolean
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

// Fixed-width tile for the horizontal portfolio row: consistent 16:9 cover, one-line title,
// a cost/year chip row pinned at the bottom. Clicking anywhere opens the details popup.
function PortfolioCard({ item, isOwner, onOpen, onEdit, onDelete }: PortfolioCardProps) {
  const cover = resolveAssetUrl(parseJsonArray(item.images)[0])
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        NESTED,
        'group/card flex w-72 shrink-0 snap-start cursor-pointer flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
    >
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-800">
        {cover ? (
          <img
            src={cover}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          </div>
        )}
        {isOwner && (
          <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover/card:opacity-100">
            <IconButton label="Edit work" onClick={stop(onEdit)} floating>
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton label="Delete work" onClick={stop(onDelete)} floating>
              <Trash2 className="h-4 w-4 text-red-500" />
            </IconButton>
          </div>
        )}
        {parseJsonArray(item.images).length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            {parseJsonArray(item.images).length} photos
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h4 className="truncate font-semibold text-gray-900 group-hover/card:text-primary dark:text-white">
          {item.title}
        </h4>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          {item.projectCost != null && <span className={CHIP}>{formatCurrency(item.projectCost)}</span>}
          {item.year != null && <span className={CHIP}>{item.year}</span>}
        </div>
      </div>
    </div>
  )
}

function CompletedProjectCard({ project }: { project: CompletedProjectSummary }) {
  const meta = [project.categoryName, project.city].filter(Boolean).join(' · ')
  return (
    <div className={cn(NESTED, 'flex w-64 shrink-0 snap-start flex-col p-4')}>
      <div className="flex items-start gap-2">
        <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <div className="min-w-0">
          <h4 className="truncate font-semibold dark:text-white">{project.title}</h4>
          {meta && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{meta}</p>}
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        {project.finalBudget != null && <span className={CHIP}>{formatCurrency(project.finalBudget)}</span>}
        {project.actualCompletionDate && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Completed {formatDate(project.actualCompletionDate)}
          </span>
        )}
      </div>
    </div>
  )
}

// A horizontal, snap-scrolling row with hover arrows that never grows the page vertically.
function HorizontalScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const scrollBy = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  return (
    <div className="group/scroller relative">
      <div
        ref={ref}
        className="flex snap-x items-start gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:thin]"
      >
        {children}
      </div>
      <ScrollArrow dir="left" onClick={() => scrollBy(-1)} />
      <ScrollArrow dir="right" onClick={() => scrollBy(1)} />
    </div>
  )
}

function ScrollArrow({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === 'left' ? 'Scroll left' : 'Scroll right'}
      onClick={onClick}
      className={cn(
        'absolute top-1/3 z-10 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 shadow-md ring-1 ring-black/5 transition hover:bg-white group-hover/scroller:flex dark:bg-gray-800/90 dark:text-gray-200 sm:flex',
        dir === 'left' ? 'left-1 opacity-0 group-hover/scroller:opacity-100' : 'right-1 opacity-0 group-hover/scroller:opacity-100'
      )}
    >
      {dir === 'left' ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  )
}

// Full-details popup with an image carousel (prev/next + dots).
function PortfolioDetailModal({ item, onClose }: { item: PortfolioItem; onClose: () => void }) {
  const images = parseJsonArray(item.images)
  const [index, setIndex] = useState(0)
  const current = images.length > 0 ? resolveAssetUrl(images[index]) : null
  const go = (dir: number) => setIndex((i) => (i + dir + images.length) % images.length)

  return (
    <ModalShell open onOpenChange={(next) => !next && onClose()} title={item.title} size="lg">
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="aspect-video">
            {current ? (
              <img src={current} alt={item.title} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 shadow hover:bg-white dark:bg-gray-800/90 dark:text-gray-200"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-700 shadow hover:bg-white dark:bg-gray-800/90 dark:text-gray-200"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    aria-label={`Go to image ${i + 1}`}
                    onClick={() => setIndex(i)}
                    className={cn('h-2 w-2 rounded-full transition', i === index ? 'bg-white' : 'bg-white/50')}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {item.projectCost != null && (
            <span className={CHIP}>
              <Wallet className="mr-1 h-3.5 w-3.5" /> {formatCurrency(item.projectCost)}
            </span>
          )}
          {item.durationDays != null && (
            <span className={CHIP}>
              <Clock className="mr-1 h-3.5 w-3.5" /> {item.durationDays} days
            </span>
          )}
          {item.year != null && (
            <span className={CHIP}>
              <CalendarDays className="mr-1 h-3.5 w-3.5" /> {item.year}
            </span>
          )}
        </div>

        {item.description && (
          <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
        )}

        {externalHref(item.externalUrl) && (
          <a
            href={externalHref(item.externalUrl)!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> View project
          </a>
        )}
      </div>
    </ModalShell>
  )
}

function IconButton(p: { label: string; onClick: (e: React.MouseEvent) => void; floating?: boolean; children: React.ReactNode }) {
  const cls = p.floating
    ? 'rounded-lg bg-white/90 p-1.5 text-gray-600 shadow hover:bg-white dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-800'
    : 'rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600'
  return (
    <button type="button" aria-label={p.label} title={p.label} onClick={p.onClick} className={cls}>
      {p.children}
    </button>
  )
}

interface PortfolioFormModalProps {
  userId: number
  item: PortfolioItem | null
  onClose: () => void
  onRefetch: () => void
}

function PortfolioFormModal({ userId, item, onClose, onRefetch }: PortfolioFormModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(item ? toForm(item) : EMPTY_FORM)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const uploadMutation = useMutation({
    mutationFn: (file: File) => portfolioApi.uploadImage(file).then((r) => r.data.url),
    onSuccess: (url) => setForm((prev) => ({ ...prev, images: [...prev.images, url] })),
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to upload image')),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: PortfolioItemRequest) =>
      item ? portfolioApi.update(item.id, payload) : portfolioApi.create(payload),
    onSuccess: () => {
      toast.success(item ? 'Portfolio item updated' : 'Portfolio item added')
      queryClient.invalidateQueries({ queryKey: ['portfolio', userId] })
      onRefetch()
      onClose()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to save portfolio item')),
  })

  const saving = saveMutation.isPending
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    saveMutation.mutate(toRequest(form))
  }

  return (
    <ModalShell
      open
      onOpenChange={(next) => !next && onClose()}
      title={item ? 'Edit work' : 'Add work'}
      size="lg"
      closeDisabled={saving}
      footer={
        <>
          <CancelButton onClick={onClose} disabled={saving} />
          <button type="submit" form="portfolio-form" disabled={saving} className={cn(PRIMARY_BTN, 'disabled:opacity-50')}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="portfolio-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField label="Title" required value={form.title} onChange={(v) => set('title', v)} placeholder="e.g. Modern kitchen remodel in DHA" />
        <TextField label="Description" rows={3} value={form.description} onChange={(v) => set('description', v)} placeholder="What was the scope, challenges, and outcome?" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField label="Project cost (PKR)" type="number" min="0" value={form.projectCost} onChange={(v) => set('projectCost', v)} />
          <TextField label="Duration (days)" type="number" min="0" value={form.durationDays} onChange={(v) => set('durationDays', v)} />
          <TextField label="Year" type="number" min="1950" max="2100" value={form.year} onChange={(v) => set('year', v)} />
        </div>
        <TextField label="External link" type="url" value={form.externalUrl} onChange={(v) => set('externalUrl', v)} placeholder="https://..." />
        <ImageUploader
          images={form.images}
          uploading={uploadMutation.isPending}
          onUpload={(file) => uploadMutation.mutate(file)}
          onRemove={(url) => set('images', form.images.filter((u) => u !== url))}
        />
      </form>
    </ModalShell>
  )
}

interface ImageUploaderProps {
  images: string[]
  uploading: boolean
  onUpload: (file: File) => void
  onRemove: (url: string) => void
}

function ImageUploader({ images, uploading, onUpload, onRemove }: ImageUploaderProps) {
  return (
    <FieldWrap label="Images">
      {images.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {images.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border dark:border-gray-600">
              <img src={resolveAssetUrl(url)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onRemove(url)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        {uploading ? 'Uploading...' : 'Add image'}
        <input
          type="file"
          accept="image/*"
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
  min?: string
  max?: string
  rows?: number
}) {
  return (
    <FieldWrap label={p.label} required={p.required}>
      {p.rows ? (
        <textarea rows={p.rows} className={cn(INPUT_CLS, 'resize-none')} value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder} />
      ) : (
        <input type={p.type || 'text'} min={p.min} max={p.max} className={INPUT_CLS} value={p.value} onChange={(e) => p.onChange(e.target.value)} placeholder={p.placeholder} />
      )}
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

interface DeletePortfolioModalProps {
  userId: number
  item: PortfolioItem
  onClose: () => void
  onRefetch: () => void
}

function DeletePortfolioModal({ userId, item, onClose, onRefetch }: DeletePortfolioModalProps) {
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: () => portfolioApi.remove(item.id),
    onSuccess: () => {
      toast.success('Portfolio item removed')
      queryClient.invalidateQueries({ queryKey: ['portfolio', userId] })
      onRefetch()
      onClose()
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Failed to remove portfolio item')),
  })

  const pending = deleteMutation.isPending
  return (
    <ModalShell
      open
      onOpenChange={(next) => !next && onClose()}
      title="Remove portfolio item"
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
        Are you sure you want to remove <span className="font-semibold dark:text-white">{item.title}</span> from your
        portfolio? This cannot be undone.
      </p>
    </ModalShell>
  )
}
