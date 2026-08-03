import { cn } from '@/lib/utils'

interface FilterChipsProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  className?: string
}

/**
 * Horizontal filter-chip row (the client MyProjects pattern). The parent owns the state —
 * typically a `useSearchParams` value so filters survive Back-navigation and deep links —
 * and should reset its page to 0 in `onChange`.
 */
export function FilterChips<T extends string>({ options, value, onChange, className }: FilterChipsProps<T>) {
  return (
    <div className={cn('-mx-1 flex gap-2 overflow-x-auto px-1 pb-1', className)}>
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value || 'all'}
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={cn(
              'flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-gray-200 bg-white text-gray-600 hover:border-primary/50 hover:text-primary dark:border-gray-700 dark:bg-card dark:text-gray-300 dark:hover:text-primary'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
