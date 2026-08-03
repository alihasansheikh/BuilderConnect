import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface LogoProps {
  to?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

const sizes = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
}

const textSizes = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
}

export function Logo({ to = '/', size = 'md', showText = true, className }: LogoProps) {
  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src="/logo.png"
        alt="BuilderConnect"
        className={cn(sizes[size], 'object-contain')}
      />
      {showText && (
        <span className={cn('font-extrabold tracking-tight text-gray-900 dark:text-white', textSizes[size])}>
          Builder<span className="text-[#F97316]">Connect</span>
        </span>
      )}
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="flex items-center gap-2 group">
        {content}
      </Link>
    )
  }

  return content
}
