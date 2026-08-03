import { useState } from 'react'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseImages } from './marketplace-utils'
import { MaterialImage } from './MaterialImage'

interface ProductGalleryProps {
  /** Raw Material.images value (JSON array string or bare path). */
  images?: string
  name: string
}

/** Product-detail image gallery: one main image plus a thumbnail strip when several exist. */
export function ProductGallery({ images, name }: ProductGalleryProps) {
  const urls = parseImages(images)
  const [selected, setSelected] = useState(0)

  // Guard against a stale index if the image list shrinks between renders.
  const activeIndex = selected < urls.length ? selected : 0
  const active = urls[activeIndex]

  if (urls.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700/40 sm:h-80">
        <Package className="h-14 w-14 text-gray-300 dark:text-gray-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="h-64 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-700/40 sm:h-80">
        <MaterialImage src={active} alt={name} className="h-full w-full object-cover" iconClassName="h-14 w-14" />
      </div>

      {urls.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {urls.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`View image ${index + 1} of ${name}`}
              className={cn(
                'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                index === activeIndex
                  ? 'border-primary'
                  : 'border-transparent opacity-70 hover:opacity-100'
              )}
            >
              <MaterialImage
                src={url}
                alt={`${name} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
                iconClassName="h-6 w-6"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
