import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, BadgeCheck, Loader2, MapPin, MessageSquare, Package, Pencil, Star } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CertificationsSection } from '@/components/profile/CertificationsSection'
import { EarnedBadges } from '@/components/profile/EarnedBadges'
import { ReviewsSection } from '@/components/profile/ReviewsSection'
import { SupplierEditModal } from '@/components/profile/SupplierEditModal'
import { SupplierBusinessInfo, SupplierStatsRow } from '@/components/profile/SupplierInfoSections'
import { VerificationSection } from '@/components/profile/VerificationSection'
import { firstMaterialImage } from '@/components/marketplace/marketplace-utils'
import { MaterialImage } from '@/components/marketplace/MaterialImage'
import { useAuth } from '@/contexts/AuthContext'
import { chatApi, materialApi, getApiErrorMessage } from '@/services/api'
import { formatCurrency } from '@/lib/formatters'
import { cn, resolveAssetUrl } from '@/lib/utils'
import { roleToSegment } from '@/lib/roleSegment'
import type { UserProfile, Material } from '@/types'

interface ProfileSectionProps {
  profile: UserProfile
  isOwner: boolean
  onRefetch: () => void
}

const PANEL = 'bg-white dark:bg-card rounded-2xl shadow-card p-6'
const NESTED = 'rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40'
const PRIMARY_BTN =
  'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'

/**
 * Supplier profile: identity header, headline stats, business info, the supplier's catalog
 * (cards deep-link into the product marketplace for client/builder viewers), certifications
 * and product reviews. The browse endpoint filters by supplierId = the supplier's USER id
 * (m.supplier.id), so profile.userId keys the catalog cleanly.
 */
export function SupplierProfile({ profile, isOwner, onRefetch }: ProfileSectionProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)

  const sp = profile.supplierProfile
  const avatarUrl = resolveAssetUrl(profile.profileImageUrl)
  const rating = Number(profile.averageRating ?? sp?.averageRating ?? 0)
  const showRating = rating > 0

  // Buyers (client/builder viewers) can open catalog items in their marketplace.
  const viewerSeg = user?.role === 'CLIENT' ? 'client' : user?.role === 'BUILDER' ? 'builder' : null

  const catalogQuery = useQuery({
    queryKey: ['supplier-catalog', profile.userId],
    queryFn: () => materialApi.browse({ supplierId: profile.userId, size: 100 }).then((r) => r.data),
  })

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
    <div className="space-y-6">
      <section className={cn(PANEL, 'relative')}>
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

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-primary dark:border-gray-700">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-primary-foreground">
                  {profile.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-bold dark:text-white">{profile.name}</h1>
                {sp?.isVerified && <BadgeCheck className="h-6 w-6 shrink-0 text-primary" aria-label="Verified supplier" />}
              </div>
              {sp?.companyName && (
                <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-300">{sp.companyName}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {showRating && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {rating.toFixed(1)}
                  </span>
                )}
                {profile.city && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {profile.city}
                  </span>
                )}
              </div>
              <EarnedBadges userId={profile.userId} />
            </div>
          </div>

          {!isOwner && (
            <button
              type="button"
              onClick={() => messageMutation.mutate()}
              disabled={messageMutation.isPending}
              className={cn(PRIMARY_BTN, 'shrink-0')}
            >
              {messageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              Message
            </button>
          )}
        </div>
      </section>

      <SupplierStatsRow sp={sp ?? {}} catalogCount={catalogQuery.data?.totalElements} />

      <SupplierBusinessInfo sp={sp ?? {}} isOwner={isOwner} />

      {isOwner && <VerificationSection role="SUPPLIER" />}

      <SupplierCatalog
        materials={catalogQuery.data?.content ?? []}
        isLoading={catalogQuery.isLoading}
        isError={catalogQuery.isError}
        viewerSeg={viewerSeg}
      />

      <CertificationsSection profile={profile} isOwner={isOwner} onRefetch={onRefetch} />

      <ReviewsSection
        userId={profile.userId}
        averageRating={profile.averageRating ?? sp?.averageRating}
        totalReviews={profile.totalReviews ?? sp?.totalReviews}
        emptyDescription="Product reviews from buyers will appear here."
      />

      {isOwner && (
        <SupplierEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            onRefetch()
            setEditOpen(false)
          }}
          userName={profile.name}
          userCity={profile.city}
        />
      )}
    </div>
  )
}

interface SupplierCatalogProps {
  materials: Material[]
  isLoading: boolean
  isError: boolean
  /** 'client' | 'builder' when the viewer can open products in their marketplace; null otherwise. */
  viewerSeg: string | null
}

function SupplierCatalog({ materials, isLoading, isError, viewerSeg }: SupplierCatalogProps) {
  return (
    <section className={PANEL}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold dark:text-white">Catalog</h2>
        {materials.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {materials.length} {materials.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="py-10">
          <LoadingSpinner label="Loading catalog..." />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10 text-gray-400" />}
          title="Couldn't load catalog"
          description="Please try again later."
        />
      ) : materials.length === 0 ? (
        <EmptyState
          icon={<Package className="h-10 w-10 text-gray-400" />}
          title="No materials listed"
          description="This supplier has not published any catalog items yet."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((material) =>
            viewerSeg ? (
              <Link
                key={material.id}
                to={`/${viewerSeg}/products/${material.id}`}
                className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <MaterialCard material={material} interactive />
              </Link>
            ) : (
              <MaterialCard key={material.id} material={material} />
            ),
          )}
        </div>
      )}
    </section>
  )
}

function MaterialCard({ material, interactive }: { material: Material; interactive?: boolean }) {
  const image = firstMaterialImage(material.images)

  return (
    <div className={cn(NESTED, 'overflow-hidden', interactive && 'transition-shadow hover:shadow-md')}>
      <div className="h-32 w-full bg-gray-100 dark:bg-gray-800">
        <MaterialImage src={image} alt={material.name} className="h-full w-full object-cover" />
      </div>
      <div className="p-4">
        <h3 className="truncate font-semibold text-gray-900 dark:text-white">{material.name}</h3>
        {material.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{material.description}</p>
        )}
        <p className="mt-2 text-sm font-semibold text-primary">
          {formatCurrency(material.unitPrice)}
          <span className="font-normal text-muted-foreground"> / {material.unit}</span>
        </p>
      </div>
    </div>
  )
}
