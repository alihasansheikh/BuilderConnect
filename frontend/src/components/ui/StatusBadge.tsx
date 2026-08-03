import { cn } from '@/lib/utils'
import { getStatusColor } from '@/lib/status-colors'
import { formatStatus } from '@/lib/formatters'

interface StatusBadgeProps {
  status: string
  domain?: 'project' | 'bid' | 'milestone' | 'contract' | 'order' | 'delivery' | 'ticket' | 'dispute'
  size?: 'sm' | 'md'
  className?: string
  label?: string
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
}

export function StatusBadge({
  status,
  domain,
  size = 'sm',
  className,
  label,
}: StatusBadgeProps) {
  const colorClasses = getStatusColor(status, domain)

  return (
    <span
      className={cn(
        colorClasses,
        sizeClasses[size],
        'inline-block rounded-full font-medium whitespace-nowrap',
        className
      )}
    >
      {label || formatStatus(status)}
    </span>
  )
}
