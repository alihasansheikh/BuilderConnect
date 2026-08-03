import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, MapPin } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { profileApi } from '@/services/api'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { AboutSection } from '@/components/profile/AboutSection'
import { SkillsSection, BusinessInfoSection } from '@/components/profile/BuilderInfoSections'
import { PortfolioSection } from '@/components/profile/PortfolioSection'
import { CertificationsSection } from '@/components/profile/CertificationsSection'
import { ReviewsSection } from '@/components/profile/ReviewsSection'
import { ClientProfile } from '@/components/profile/ClientProfile'
import { SupplierProfile } from '@/components/profile/SupplierProfile'
import { VerificationSection } from '@/components/profile/VerificationSection'
import { resolveAssetUrl } from '@/lib/utils'
import type { UserProfile } from '@/types'

/**
 * ProfilePage — LinkedIn/Upwork-style profile orchestrator.
 *
 * Resolves the target user from the route (`/profile/:userId`) or the logged-in user
 * (`/profile`), fetches the aggregated {@link UserProfile}, and dispatches to the correct
 * role-specific composition. Builders get the rich multi-section layout; clients and suppliers
 * get their tailored variants; any other role falls back to a minimal identity card.
 */
export default function ProfilePage() {
  const params = useParams<{ userId?: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const parsedId = params.userId ? Number(params.userId) : user?.id
  const targetUserId = parsedId && !Number.isNaN(parsedId) ? parsedId : undefined

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['user-profile', targetUserId],
    queryFn: () => profileApi.getUserProfile(targetUserId as number).then((r) => r.data),
    enabled: !!targetUserId,
  })

  const onRefetch = () =>
    queryClient.invalidateQueries({ queryKey: ['user-profile', targetUserId] })

  if (!targetUserId) {
    return <ProfileMessage title="Profile unavailable" message="We couldn't determine which profile to show." />
  }
  if (isLoading) {
    return <ProfileSkeleton />
  }
  if (isError || !profile) {
    return (
      <ProfileMessage
        title="Profile not found"
        message="This profile doesn't exist or is no longer available."
      />
    )
  }

  const isOwner = profile.isOwnProfile
  const sectionProps = { profile, isOwner, onRefetch }

  if (profile.role === 'BUILDER') {
    return (
      <div className="space-y-6">
        <ProfileHeader {...sectionProps} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <AboutSection {...sectionProps} />
            <PortfolioSection {...sectionProps} />
            <ReviewsSection
              userId={targetUserId}
              averageRating={profile.averageRating}
              totalReviews={profile.totalReviews}
            />
          </div>
          <div className="space-y-6">
            <SkillsSection {...sectionProps} />
            <CertificationsSection {...sectionProps} />
            <BusinessInfoSection {...sectionProps} />
            {isOwner && <VerificationSection role="BUILDER" />}
          </div>
        </div>
      </div>
    )
  }

  if (profile.role === 'CLIENT') {
    return (
      <div className="space-y-6">
        <ClientProfile {...sectionProps} />
      </div>
    )
  }

  if (profile.role === 'SUPPLIER') {
    return (
      <div className="space-y-6">
        <SupplierProfile {...sectionProps} />
      </div>
    )
  }

  // Any other role — minimal identity card only.
  return (
    <div className="space-y-6">
      <MinimalProfileCard profile={profile} />
    </div>
  )
}

interface MinimalProfileCardProps {
  profile: UserProfile
}

/** Bare identity card for roles without a rich profile. */
function MinimalProfileCard({ profile }: MinimalProfileCardProps) {
  const avatar = resolveAssetUrl(profile.profileImageUrl)
  const roleLabel = profile.role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\B\w/g, (c) => c.toLowerCase())

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
      <div className="flex items-center gap-4">
        {avatar ? (
          <img
            src={avatar}
            alt={profile.name}
            className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
            {profile.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold dark:text-white">{profile.name}</h1>
          <span className="mt-1 inline-block rounded bg-primary/[0.08] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
            {roleLabel}
          </span>
          {profile.city && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="h-4 w-4" />
              {profile.city}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface ProfileMessageProps {
  title: string
  message: string
}

/** Shared error / empty state card. */
function ProfileMessage({ title, message }: ProfileMessageProps) {
  return (
    <div className="rounded-2xl bg-white p-12 text-center shadow-card dark:bg-card">
      <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-gray-400" />
      <h2 className="text-lg font-semibold dark:text-white">{title}</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  )
}

/** Loading placeholder mirroring the header + two-column layout. */
function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
        <div className="h-32 rounded-xl bg-gray-100 dark:bg-gray-700/40" />
        <div className="-mt-10 flex items-end gap-4 px-2">
          <div className="h-24 w-24 rounded-full border-4 border-white bg-gray-200 dark:border-gray-800 dark:bg-gray-700" />
          <div className="space-y-2 pb-2">
            <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-32 rounded bg-gray-100 dark:bg-gray-700/60" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-40 rounded-2xl bg-white shadow-card dark:bg-card" />
          <div className="h-64 rounded-2xl bg-white shadow-card dark:bg-card" />
        </div>
        <div className="space-y-6">
          <div className="h-48 rounded-2xl bg-white shadow-card dark:bg-card" />
          <div className="h-48 rounded-2xl bg-white shadow-card dark:bg-card" />
        </div>
      </div>
    </div>
  )
}
