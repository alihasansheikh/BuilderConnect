import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:animate-[shimmer_2s_infinite]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/5 before:to-transparent',
        className
      )}
      {...props}
    />
  )
}

function CardSkeleton() {
  return (
    <div className="bg-card rounded-2xl shadow-card p-6 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-card rounded-2xl shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-6 py-3 bg-muted">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 px-6 py-4 border-t border-border">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton key={`${rowIdx}-${colIdx}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl shadow-card p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  )
}

export { Skeleton, CardSkeleton, TableSkeleton, StatCardSkeleton }
