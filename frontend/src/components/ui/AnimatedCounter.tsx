import { useState, useEffect, useRef } from 'react'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'

interface AnimatedCounterProps {
  value: number
  duration?: number
  formatFn?: (n: number) => string
  className?: string
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

export function AnimatedCounter({
  value,
  duration = 1000,
  formatFn,
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const { ref, isIntersecting } = useIntersectionObserver({ triggerOnce: true })
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!isIntersecting || hasAnimated.current) return
    hasAnimated.current = true

    if (value === 0) {
      setDisplayValue(0)
      return
    }

    let startTime: number | null = null
    let frameId: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutQuart(progress)

      setDisplayValue(Math.round(easedProgress * value))

      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }

    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [isIntersecting, value, duration])

  const formatted = formatFn ? formatFn(displayValue) : String(displayValue)

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  )
}
