import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MaterialImageProps {
  /** Resolved image URL, or '' when the material has no image. */
  src: string
  alt: string
  className?: string
  /** Tailwind size for the Package fallback icon. */
  iconClassName?: string
}

/**
 * A material photo that degrades to a Package icon whenever the source is missing OR fails to
 * load. Seed data and stale uploads can point at URLs that 404 (e.g. placeholder hosts), and a
 * broken <img> showing alt text is worse than a clean icon — the onError swap covers both.
 */
export function MaterialImage({ src, alt, className, iconClassName }: MaterialImageProps) {
  const [failed, setFailed] = useState(false)

  // Reset when the source changes (e.g. gallery thumbnail switch) so a previously-broken URL
  // doesn't suppress a new, valid one.
  useEffect(() => setFailed(false), [src])

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Package className={cn('h-10 w-10 text-gray-300 dark:text-gray-600', iconClassName)} />
      </div>
    )
  }

  return (
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" />
  )
}
