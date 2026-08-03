import { AlertTriangle } from 'lucide-react'
import { usePublicSettings } from '@/hooks/usePublicSettings'

/**
 * Site-wide maintenance strip. Renders only while the admin maintenance_mode
 * setting is on; deliberately not dismissible.
 */
export function MaintenanceBanner() {
  const { data } = usePublicSettings()

  if (!data?.maintenanceBanner) return null

  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-white"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="text-sm font-medium">{data.maintenanceMessage}</p>
    </div>
  )
}
