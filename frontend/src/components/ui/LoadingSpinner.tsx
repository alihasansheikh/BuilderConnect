import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  fullPage?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

export function LoadingSpinner({
  size = 'md',
  label,
  fullPage = false,
  className,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label || 'Loading'}
      className={cn(
        'flex flex-col items-center justify-center',
        fullPage && 'min-h-[50vh]',
        className
      )}
    >
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-b-primary',
          sizeClasses[size]
        )}
      />
      {label && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{label}</p>
      )}
    </div>
  )
}
