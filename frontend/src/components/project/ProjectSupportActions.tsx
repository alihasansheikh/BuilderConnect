import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, LifeBuoy } from 'lucide-react'
import { FileDisputeDialog } from '@/components/support/FileDisputeDialog'
import type { ProjectStatus } from '@/types'

/** Post-award states in which a dispute can be filed (mirrors DisputeService). */
const DISPUTABLE_STATUSES: ReadonlyArray<ProjectStatus> = [
  'AWARDED',
  'CONTRACT_PENDING',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
]

interface ProjectSupportActionsProps {
  projectId: number
  /** Role-scoped help page path, e.g. '/client/support' or '/builder/support'. */
  supportPath: string
  projectStatus: ProjectStatus
}

/**
 * "Get help" (opens the role's help page with this project prefilled) plus, on disputable
 * projects, "File a dispute" (party-restricted; respondent inferred server-side). Rendered as a
 * fragment so it drops into an existing button row.
 */
export function ProjectSupportActions({ projectId, supportPath, projectStatus }: ProjectSupportActionsProps) {
  const navigate = useNavigate()
  const [disputeOpen, setDisputeOpen] = useState(false)
  const canDispute = DISPUTABLE_STATUSES.includes(projectStatus)

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(supportPath, { state: { projectId } })}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary/50 hover:text-primary dark:border-gray-600 dark:text-gray-300 dark:hover:text-primary"
      >
        <LifeBuoy className="h-4 w-4" />
        Get help
      </button>
      {canDispute && (
        <button
          type="button"
          onClick={() => setDisputeOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Flag className="h-4 w-4" />
          File a dispute
        </button>
      )}
      {canDispute && (
        <FileDisputeDialog open={disputeOpen} onOpenChange={setDisputeOpen} projectId={projectId} />
      )}
    </>
  )
}
