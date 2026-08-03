import { useQuery } from '@tanstack/react-query'
import { Award } from 'lucide-react'
import { badgeApi } from '@/services/api'
import type { UserBadgeRecord } from '@/types'

interface EarnedBadgesProps {
  userId: number
}

/**
 * Earned-badge chips for a profile (GET /v1/users/{userId}/badges).
 * Renders nothing while loading, on error, or when the user has no badges,
 * so it can be dropped into any profile composition without layout shift.
 */
export function EarnedBadges({ userId }: EarnedBadgesProps) {
  const { data: badges } = useQuery({
    queryKey: ['user-badges', userId],
    queryFn: () => badgeApi.getUserBadges(userId).then((r) => r.data),
    enabled: !!userId,
  })

  if (!badges?.length) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Earned badges">
      {badges.map((badge: UserBadgeRecord) => (
        <span
          key={badge.id}
          title={badge.badgeDescription ?? badge.badgeName}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/[0.08] px-2.5 py-1 text-xs font-medium text-primary"
        >
          <Award className="h-3.5 w-3.5" aria-hidden="true" />
          {badge.badgeName}
        </span>
      ))}
    </div>
  )
}
