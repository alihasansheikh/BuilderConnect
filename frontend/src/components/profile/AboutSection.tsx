import { useEffect, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText, Loader2, Pencil, Save } from 'lucide-react'
import { ModalShell } from '@/components/ui/ModalShell'
import { EmptyState } from '@/components/ui/EmptyState'
import { builderApi, getApiErrorMessage } from '@/services/api'
import type { UserProfile } from '@/types'

interface ProfileSectionProps {
  profile: UserProfile
  isOwner: boolean
  onRefetch: () => void
}

const FORM_ID = 'about-edit-form'

export function AboutSection({ profile, isOwner, onRefetch }: ProfileSectionProps) {
  const [open, setOpen] = useState(false)
  const bp = profile.builderProfile
  const bio = bp?.bio?.trim() ?? ''

  // Only builders have a bio; a viewer looking at an empty bio sees nothing.
  if (!bp) return null
  if (!bio && !isOwner) return null

  return (
    <section className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold dark:text-white">About</h2>
        {isOwner && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Edit about"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      {bio ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">{bio}</p>
      ) : (
        <EmptyState
          icon={<FileText className="h-10 w-10 text-gray-400" />}
          title="No bio yet"
          description="Tell clients about your experience and what makes your work stand out. Use the edit button above to add one."
        />
      )}

      {isOwner && <AboutEditModal open={open} onOpenChange={setOpen} initialBio={bp.bio ?? ''} onRefetch={onRefetch} />}
    </section>
  )
}

interface AboutEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialBio: string
  onRefetch: () => void
}

function AboutEditModal({ open, onOpenChange, initialBio, onRefetch }: AboutEditModalProps) {
  const [bio, setBio] = useState(initialBio)

  useEffect(() => {
    if (open) setBio(initialBio)
  }, [open, initialBio])

  const mutation = useMutation({
    mutationFn: () => builderApi.updateMyProfile({ bio: bio.trim() }),
    onSuccess: () => {
      toast.success('About updated')
      onRefetch()
      onOpenChange(false)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update about')),
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (mutation.isPending) return
    mutation.mutate()
  }

  const footer = (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        disabled={mutation.isPending}
        className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Cancel
      </button>
      <button
        type="submit"
        form={FORM_ID}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {mutation.isPending ? 'Saving...' : 'Save'}
      </button>
    </>
  )

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Edit about"
      size="md"
      closeDisabled={mutation.isPending}
      footer={footer}
    >
      <form id={FORM_ID} onSubmit={handleSubmit}>
        <label htmlFor="about-bio" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Bio
        </label>
        <textarea
          id="about-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={7}
          placeholder="Describe your experience, expertise, and what makes you stand out..."
          className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white"
        />
      </form>
    </ModalShell>
  )
}
