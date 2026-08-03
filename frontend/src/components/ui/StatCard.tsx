import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
  linkTo?: string
  isLoading?: boolean
  colorClass?: string
  color?: string
  className?: string
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendDirection = 'neutral',
  linkTo,
  isLoading,
  colorClass,
  className,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        'bg-white dark:bg-card rounded-2xl shadow-card p-6',
        'transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg mt-2" />
          ) : (
            <p className="text-3xl font-bold dark:text-white mt-2 tracking-tight">
              {value}
            </p>
          )}
          {trend && !isLoading && (
            <div className="flex items-center gap-1 mt-2">
              {trendDirection === 'up' ? (
                <TrendingUp className="h-4 w-4 text-primary" />
              ) : trendDirection === 'down' ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : null}
              <span className={cn(
                'text-sm font-semibold',
                trendDirection === 'up' ? 'text-primary' : trendDirection === 'down' ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {trend}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0">
            <div className={cn(
              'h-12 w-12 flex items-center justify-center rounded-xl',
              colorClass || 'bg-primary/10 text-primary'
            )}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  if (linkTo) {
    return (
      <Link to={linkTo} className="block hover:-translate-y-0.5 transition-transform duration-200">
        {content}
      </Link>
    )
  }

  return content
}
