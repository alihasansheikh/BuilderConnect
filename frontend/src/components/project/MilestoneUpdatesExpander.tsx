import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import MilestoneTimeline from '@/components/project/MilestoneTimeline'

/** Collapsible read-only progress feed for a single milestone (the client never posts). */
export function MilestoneUpdatesExpander({ milestoneId }: { milestoneId: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3 border-t pt-3 dark:border-gray-700">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
      >
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        Progress updates
      </button>
      {open && (
        <div className="mt-3">
          <MilestoneTimeline milestoneId={milestoneId} canPost={false} />
        </div>
      )}
    </div>
  )
}
