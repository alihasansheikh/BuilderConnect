import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, History } from 'lucide-react'
import { contractVersionApi } from '@/services/api'
import type { ContractVersion } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Collapsible list of contract version snapshots (newest first). Versions are captured
 * automatically before every edit of an unsigned contract, so this is the audit trail of
 * how the terms evolved before signing. Fetches lazily on first expand.
 */
export function ContractVersionHistory({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false)

  const { data: versions = [], isLoading } = useQuery<ContractVersion[]>({
    queryKey: ['contract-versions', projectId],
    queryFn: () => contractVersionApi.getVersionHistory(projectId).then((r) => r.data),
    enabled: open,
  })

  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber)

  return (
    <div className="rounded-lg border dark:border-gray-700">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:text-primary dark:text-gray-300 dark:hover:text-primary"
      >
        <span className="inline-flex items-center gap-2">
          <History className="h-4 w-4" />
          Version history
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t px-4 py-3 dark:border-gray-700">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : sorted.length === 0 ? (
            <p className="py-2 text-sm text-gray-400 dark:text-gray-500">
              No previous versions — the contract has not been revised.
            </p>
          ) : (
            <ul className="space-y-3">
              {sorted.map((version) => (
                <li key={version.id} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-700/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium dark:text-white">Version {version.versionNumber}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(version.createdAt)}</span>
                  </div>
                  {version.changeSummary && (
                    <p className="mt-1 text-gray-600 dark:text-gray-300">{version.changeSummary}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {version.createdBy?.name && <span>By {version.createdBy.name}</span>}
                    {version.totalAmount != null && <span>{formatCurrency(version.totalAmount)}</span>}
                    {version.startDate && version.endDate && (
                      <span>
                        {formatDate(version.startDate)} – {formatDate(version.endDate)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
