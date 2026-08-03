import { useRef, useState, useCallback } from 'react'

interface UseIntersectionObserverOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
}

export function useIntersectionObserver(options?: UseIntersectionObserverOptions) {
  const { threshold = 0.1, rootMargin = '0px 0px -50px 0px', triggerOnce = true } = options || {}
  const [isIntersecting, setIsIntersecting] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const ref = useCallback(
    (node: HTMLElement | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      if (!node) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true)
            if (triggerOnce) {
              observer.disconnect()
            }
          } else if (!triggerOnce) {
            setIsIntersecting(false)
          }
        },
        { threshold, rootMargin }
      )

      observer.observe(node)
      observerRef.current = observer
    },
    [threshold, rootMargin, triggerOnce]
  )

  return { ref, isIntersecting }
}
