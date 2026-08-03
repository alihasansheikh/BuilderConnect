import { Link } from 'react-router-dom'
import { Stars } from '@/components/profile/ReviewsSection'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { firstMaterialImage, stockLevel, type StockLevel } from './marketplace-utils'
import { FavoriteButton } from './FavoriteButton'
import { MaterialImage } from './MaterialImage'
import type { Material } from '@/types'

const STOCK_BADGES: Record<StockLevel, { label: string; className: string }> = {
  out: {
    label: 'Out of stock',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  low: {
    label: 'Low stock',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  in: {
    label: 'In stock',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
}

interface ProductCardProps {
  material: Material
  /** Full route to the product detail page (role prefix resolved by the caller). */
  to: string
}

/** Marketplace grid card for a material. The whole card is one link to the detail page. */
export function ProductCard({ material, to }: ProductCardProps) {
  const image = firstMaterialImage(material.images)
  const stock = STOCK_BADGES[stockLevel(material)]
  const supplierLine = [material.brand, material.supplierName].filter(Boolean).join(' · ')
  const totalReviews = material.totalReviews ?? 0

  return (
    <Link
      to={to}
      className="group block overflow-hidden rounded-2xl bg-white shadow-card transition-shadow hover:shadow-lg dark:bg-card"
    >
      <div className="relative h-40 bg-gray-100 dark:bg-gray-700/40">
        <MaterialImage
          src={image}
          alt={material.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {material.isFeatured && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
            Featured
          </span>
        )}
        <FavoriteButton
          entityType="MATERIAL"
          entityId={material.id}
          className="absolute right-3 top-3 z-10"
        />
      </div>

      <div className="p-4">
        <h3 className="truncate font-semibold text-gray-900 group-hover:text-primary dark:text-white">
          {material.name}
        </h3>

        {supplierLine && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{supplierLine}</p>
        )}

        {totalReviews > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <Stars rating={material.averageRating ?? 0} />
            <span className="text-sm font-medium dark:text-gray-200">
              {(material.averageRating ?? 0).toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">({totalReviews})</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(material.unitPrice)}
            <span className="font-normal text-muted-foreground"> / {material.unit}</span>
          </p>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
              stock.className
            )}
          >
            {stock.label}
          </span>
        </div>
      </div>
    </Link>
  )
}
