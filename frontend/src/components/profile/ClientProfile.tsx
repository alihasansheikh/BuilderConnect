import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarDays, Camera, Loader2, MapPin, MessageSquare, Pencil, Save, Trash2 } from 'lucide-react'
import { ModalShell } from '@/components/ui/ModalShell'
import { useAuth } from '@/contexts/AuthContext'
import { userApi, chatApi, getApiErrorMessage } from '@/services/api'
import { formatDate } from '@/lib/formatters'
import { cn, resolveAssetUrl } from '@/lib/utils'
import { roleToSegment } from '@/lib/roleSegment'
import type { UserProfile } from '@/types'

interface ProfileSectionProps {
  profile: UserProfile
  isOwner: boolean
  onRefetch: () => void
}

const FORM_ID = 'client-profile-form'
const LABEL = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5'
const INPUT =
  'w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white'
const GHOST_BTN =
  'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
const PRIMARY_BTN =
  'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif']
const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta']

function validateImage(file: File): boolean {
  if (!IMAGE_TYPES.includes(file.type)) {
    toast.error('Only JPG, PNG, and GIF files are allowed')
    return false
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error('File size must be under 10MB')
    return false
  }
  return true
}

/**
 * Minimal client profile: a single centered identity card. Clients don't have a bio, portfolio, or
 * catalog — a viewer sees name/city/member-since and a Message CTA; the owner gets a pencil that
 * opens a small edit modal (name/city/phone/address + avatar) backed by userApi.
 */
export function ClientProfile({ profile, isOwner, onRefetch }: ProfileSectionProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const avatarUrl = resolveAssetUrl(profile.profileImageUrl)

  const messageMutation = useMutation({
    mutationFn: () => chatApi.createDirectRoom(profile.userId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['chat-rooms'] })
      const seg = roleToSegment(user?.role)
      navigate(`/${seg}/messages?roomId=${res.data.id}`)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to start conversation')),
  })

  return (
    <section className="relative mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-card dark:bg-card">
      {isOwner && (
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          aria-label="Edit profile"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}

      <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-primary shadow-md dark:border-card">
        {avatarUrl ? (
          <img src={avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-primary-foreground">
            {profile.name?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <h1 className="mt-4 text-2xl font-bold dark:text-white">{profile.name}</h1>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        {profile.city && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {profile.city}
          </span>
        )}
        {profile.memberSince && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Member since {formatDate(profile.memberSince)}
          </span>
        )}
      </div>

      {!isOwner && (
        <button
          type="button"
          onClick={() => messageMutation.mutate()}
          disabled={messageMutation.isPending}
          className={cn(PRIMARY_BTN, 'mt-6')}
        >
          {messageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          Message
        </button>
      )}

      {isOwner && (
        <ClientEditModal open={editOpen} onOpenChange={setEditOpen} profile={profile} onRefetch={onRefetch} />
      )}
    </section>
  )
}

interface ClientEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: UserProfile
  onRefetch: () => void
}

function ClientEditModal({ open, onOpenChange, profile, onRefetch }: ClientEditModalProps) {
  const avatarRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(profile.name ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [address, setAddress] = useState(profile.address ?? '')

  useEffect(() => {
    if (open) {
      setName(profile.name ?? '')
      setCity(profile.city ?? '')
      setPhone(profile.phone ?? '')
      setAddress(profile.address ?? '')
    }
  }, [open, profile])

  const save = useMutation({
    mutationFn: () =>
      userApi.updateProfile({
        name: name.trim(),
        city: city.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Profile updated')
      onRefetch()
      onOpenChange(false)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update profile')),
  })

  const imgError = (error: unknown) => toast.error(getApiErrorMessage(error, 'Image update failed'))
  const imgDone = (message: string, clearRef?: React.RefObject<HTMLInputElement>) => () => {
    toast.success(message)
    if (clearRef?.current) clearRef.current.value = ''
    onRefetch()
  }
  const avatarUpload = useMutation({ mutationFn: (f: File) => userApi.uploadProfileImage(f), onSuccess: imgDone('Profile photo updated', avatarRef), onError: imgError })
  const avatarDelete = useMutation({ mutationFn: () => userApi.deleteProfileImage(), onSuccess: imgDone('Profile photo removed'), onError: imgError })

  const imageBusy = avatarUpload.isPending || avatarDelete.isPending
  const avatarUrl = resolveAssetUrl(profile.profileImageUrl)

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && validateImage(file)) avatarUpload.mutate(file)
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (save.isPending) return
    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    save.mutate()
  }

  const footer = (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        disabled={save.isPending}
        className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Cancel
      </button>
      <button type="submit" form={FORM_ID} disabled={save.isPending} className={PRIMARY_BTN}>
        {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {save.isPending ? 'Saving...' : 'Save'}
      </button>
    </>
  )

  return (
    <ModalShell open={open} onOpenChange={onOpenChange} title="Edit profile" size="md" closeDisabled={save.isPending} footer={footer}>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border bg-primary dark:border-gray-700">
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-primary-foreground">
                {profile.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => avatarRef.current?.click()} disabled={imageBusy} className={GHOST_BTN}>
              {avatarUpload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Change photo
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => avatarDelete.mutate()}
                disabled={imageBusy}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:underline disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            )}
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/gif" onChange={pickImage} className="hidden" />
          </div>
        </div>

        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="cp-name" className={LABEL}>
              Full name <span className="text-red-500">*</span>
            </label>
            <input id="cp-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label htmlFor="cp-city" className={LABEL}>City</label>
            <select id="cp-city" value={city} onChange={(e) => setCity(e.target.value)} className={INPUT}>
              <option value="">Select city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cp-phone" className={LABEL}>Phone</label>
            <input id="cp-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0300 1234567" className={INPUT} />
          </div>
          <div>
            <label htmlFor="cp-address" className={LABEL}>Address</label>
            <input id="cp-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area" className={INPUT} />
          </div>
        </form>
      </div>
    </ModalShell>
  )
}
