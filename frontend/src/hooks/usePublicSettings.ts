import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/services/api'
import type { PublicSettings } from '@/types'

/**
 * Public platform settings (maintenance banner + contact info). Shared by the
 * MaintenanceBanner and PublicFooter — React Query dedupes on the key.
 */
export function usePublicSettings() {
  return useQuery<PublicSettings>({
    queryKey: ['public-settings'],
    queryFn: () => publicApi.getSettings().then((r) => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}
