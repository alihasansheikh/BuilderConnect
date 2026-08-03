import { useState, useEffect } from 'react'

/**
 * Returns `value` after it has been stable for `delay` ms. Use for text/number inputs that
 * drive server queries, so each keystroke doesn't fire a request (and trip the rate limiter).
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
