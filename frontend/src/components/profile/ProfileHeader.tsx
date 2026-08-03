import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { BadgeCheck, CalendarDays, Camera, Loader2, MapPin, MessageSquare, Pencil, Save, Star, Trash2 } from 'lucide-react'
import { ModalShell } from '@/components/ui/ModalShell'
import { EarnedBadges } from '@/components/profile/EarnedBadges'
import { useAuth } from '@/contexts/AuthContext'
import { userApi, builderApi, chatApi, getApiErrorMessage } from '@/services/api'
import { formatDate } from '@/lib/formatters'
import { cn, resolveAssetUrl } from '@/lib/utils'
import { roleToSegment } from '@/lib/roleSegment'
import type { UserProfile } from '@/types'

interface ProfileSectionProps {
  profile: UserProfile
  isOwner: boolean
  onRefetch: () => void
}

const FORM_ID = 'profile-header-form'
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

function StarRating({ rating, totalReviews }: { rating: number; totalReviews: number }) {
  const rounded = Math.round(rating)
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn('h-4 w-4', i <= rounded ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600')}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{rating.toFixed(1)}</span>
      <span className="text-sm text-muted-foreground">
        ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  )
}

export function ProfileHeader({ profile, isOwner, onRefetch }: ProfileSectionProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  const bp = profile.builderProfile
  const isBuilder = profile.role === 'BUILDER'
  const bannerUrl = resolveAssetUrl(bp?.bannerImageUrl)
  const avatarUrl = resolveAssetUrl(profile.profileImageUrl)
  const headline = profile.headline || bp?.companyName || bp?.bio || ''
  const rating = Number(profile.averageRating ?? bp?.averageRating ?? 0)
  const totalReviews = profile.totalReviews ?? bp?.totalReviews ?? 0
  const showRating = rating > 0 || totalReviews > 0

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
    <section className="overflow-hidden rounded-2xl bg-white shadow-card dark:bg-card">
      <div className="relative h-40 sm:h-48">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-primary/30 via-primary/15 to-green-500/20" />
        )}
        {isOwner && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            aria-label="Edit profile"
            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm backdrop-blur transition-colors hover:bg-white dark:bg-gray-900/80 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
        )}
      </div>

      <div className="px-6 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative z-10 -mt-12 h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-primary dark:border-card">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-primary-foreground">
                  {profile.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-bold dark:text-white">{profile.name}</h1>
                {isBuilder && bp?.isVerified && (
                  <BadgeCheck className="h-6 w-6 shrink-0 text-primary" aria-label="Verified builder" />
                )}
              </div>
              {headline && <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-300">{headline}</p>}
            </div>
          </div>

          {!isOwner && (
            <button
              type="button"
              onClick={() => messageMutation.mutate()}
              disabled={messageMutation.isPending}
              className={cn(PRIMARY_BTN, 'shrink-0')}
            >
              {messageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              Message
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {showRating && <StarRating rating={rating} totalReviews={totalReviews} />}
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

        <EarnedBadges userId={profile.userId} />
      </div>

      {isOwner && (
        <ProfileHeaderEditModal
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          isBuilder={isBuilder}
          onRefetch={onRefetch}
        />
      )}
    </section>
  )
}

interface EditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: UserProfile
  isBuilder: boolean
  onRefetch: () => void
}

function ProfileHeaderEditModal({ open, onOpenChange, profile, isBuilder, onRefetch }: EditModalProps) {
  const bp = profile.builderProfile
  const [name, setName] = useState(profile.name ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [companyName, setCompanyName] = useState(bp?.companyName ?? '')
  const avatarRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(profile.name ?? '')
      setCity(profile.city ?? '')
      setCompanyName(bp?.companyName ?? '')
    }
  }, [open, profile, bp])

  const save = useMutation({
    mutationFn: async () => {
      await userApi.updateProfile({ name: name.trim(), city: city.trim() || undefined })
      if (isBuilder) await builderApi.updateMyProfile({ companyName: companyName.trim() || undefined })
    },
    onSuccess: () => {
      toast.success('Profile updated')
      onRefetch()
      onOpenChange(false)
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to update profile')),
  })

  // Shared success/error handlers keep the four image mutations to one line each while staying
  // correct under the Rules of Hooks (four unconditional top-level useMutation calls).
  const imgError = (error: unknown) => toast.error(getApiErrorMessage(error, 'Image update failed'))
  const imgDone = (message: string, inputRef?: React.RefObject<HTMLInputElement>) => () => {
    toast.success(message)
    if (inputRef?.current) inputRef.current.value = ''
    onRefetch()
  }

  const avatarUpload = useMutation({ mutationFn: (f: File) => userApi.uploadProfileImage(f), onSuccess: imgDone('Profile photo updated', avatarRef), onError: imgError })
  const avatarDelete = useMutation({ mutationFn: () => userApi.deleteProfileImage(), onSuccess: imgDone('Profile photo removed'), onError: imgError })
  const bannerUpload = useMutation({ mutationFn: (f: File) => builderApi.uploadBannerImage(f), onSuccess: imgDone('Banner updated', bannerRef), onError: imgError })
  const bannerDelete = useMutation({ mutationFn: () => builderApi.deleteBannerImage(), onSuccess: imgDone('Banner removed'), onError: imgError })

  const imageBusy = avatarUpload.isPending || avatarDelete.isPending || bannerUpload.isPending || bannerDelete.isPending
  const avatarUrl = resolveAssetUrl(profile.profileImageUrl)
  const bannerUrl = resolveAssetUrl(bp?.bannerImageUrl)

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>, onValid: (file: File) => void) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (validateImage(file)) onValid(file)
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
        {isBuilder && (
          <div>
            <p className={LABEL}>Cover banner</p>
            <div className="relative overflow-hidden rounded-lg border dark:border-gray-700">
              {bannerUrl ? (
                <img src={bannerUrl} alt="Banner" className="h-28 w-full object-cover" />
              ) : (
                <div className="h-28 w-full bg-gradient-to-r from-primary/30 via-primary/15 to-green-500/20" />
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => bannerRef.current?.click()}
                  disabled={imageBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-white disabled:opacity-50 dark:bg-gray-900/80 dark:text-gray-200"
                >
                  {bannerUpload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  Upload
                </button>
                {bannerUrl && (
                  <button
                    type="button"
                    onClick={() => bannerDelete.mutate()}
                    disabled={imageBusy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
            <input ref={bannerRef} type="file" accept="image/jpeg,image/png,image/gif" onChange={(e) => pickImage(e, (f) => bannerUpload.mutate(f))} className="hidden" />
          </div>
        )}

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
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/gif" onChange={(e) => pickImage(e, (f) => avatarUpload.mutate(f))} className="hidden" />
          </div>
        </div>

        <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="ph-name" className={LABEL}>
              Full name <span className="text-red-500">*</span>
            </label>
            <input id="ph-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
          </div>
          {isBuilder && (
            <div>
              <label htmlFor="ph-company" className={LABEL}>
                Company / Headline
              </label>
              <input id="ph-company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Muhammad Contractors" className={INPUT} />
            </div>
          )}
          <div>
            <label htmlFor="ph-city" className={LABEL}>
              City
            </label>
            <select id="ph-city" value={city} onChange={(e) => setCity(e.target.value)} className={INPUT}>
              <option value="">Select city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>
    </ModalShell>
  )
}
