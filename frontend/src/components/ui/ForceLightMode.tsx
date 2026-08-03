import { useEffect } from 'react'
import { THEME_STORAGE_KEY } from '@/contexts/ThemeContext'

/**
 * Forces light mode while mounted by removing the 'dark' class from <html>.
 * Restores the user's theme preference on unmount (when navigating to authenticated routes).
 */
export function ForceLightMode({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains('dark')

    root.classList.remove('dark')

    return () => {
      // Restore dark mode if the user had it enabled
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
      if (wasDark || storedTheme === 'dark') {
        root.classList.add('dark')
      }
    }
  }, [])

  return <>{children}</>
}
