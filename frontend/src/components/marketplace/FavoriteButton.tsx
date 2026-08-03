import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { favoriteApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import type { FavoriteEntityType } from '@/types'

const FAVORITE_IDS_STALE_TIME_MS = 60000

interface FavoriteButtonProps {
  entityType: FavoriteEntityType
  entityId: number
  className?: string
}

/**
 * Heart toggle for marketplace cards. Cards are Links, so clicks are stopped from
 * bubbling/navigating. Toggles optimistically against ['favorite-ids', entityType]
 * with rollback on error. Renders nothing for unauthenticated visitors.
 */
export function FavoriteButton({ entityType, entityId, className }: FavoriteButtonProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const idsKey = ['favorite-ids', entityType] as const

  const { data: favoriteIds = [] } = useQuery({
    queryKey: idsKey,
    queryFn: () => favoriteApi.getIds(entityType).then((r) => r.data),
    staleTime: FAVORITE_IDS_STALE_TIME_MS,
    enabled: Boolean(user),
  })

  const isFavorited = favoriteIds.includes(entityId)

  const toggleMutation = useMutation({
    mutationFn: () => favoriteApi.toggle(entityType, entityId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: idsKey })
      const previousIds = queryClient.getQueryData<number[]>(idsKey)
      queryClient.setQueryData<number[]>(idsKey, (current = []) =>
        current.includes(entityId)
          ? current.filter((id) => id !== entityId)
          : [...current, entityId]
      )
      return { previousIds }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousIds !== undefined) {
        queryClient.setQueryData(idsKey, context.previousIds)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: idsKey })
      queryClient.invalidateQueries({ queryKey: ['favorites', entityType] })
    },
  })

  if (!user) return null

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleMutation.mutate()
      }}
      aria-label={isFavorited ? 'Remove from favourites' : 'Add to favourites'}
      aria-pressed={isFavorited}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900/80',
        className
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-colors',
          isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-500 dark:text-gray-300'
        )}
      />
    </button>
  )
}
