import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; to?: string; onClick?: () => void }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-3">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.to ? (
            <Link
              to={action.to}
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
