import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { cn } from '@/lib/utils'

interface AnimatedSectionProps {
  children: React.ReactNode
  animation?: 'fade-in' | 'slide-up' | 'slide-down' | 'scale-in'
  delay?: string
  className?: string
  as?: React.ElementType
  threshold?: number
}

export function AnimatedSection({
  children,
  animation = 'slide-up',
  delay,
  className,
  as: Component = 'div',
  threshold,
}: AnimatedSectionProps) {
  const { ref, isIntersecting } = useIntersectionObserver({ threshold })

  return (
    <Component
      ref={ref}
      className={cn(
        isIntersecting ? cn(`animate-${animation} motion-reduce:animate-none`, delay) : '',
        className
      )}
    >
      {children}
    </Component>
  )
}
