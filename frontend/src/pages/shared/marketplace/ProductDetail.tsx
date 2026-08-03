import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, Package, Store } from 'lucide-react'
import { materialApi } from '@/services/api'
import { FavoriteButton } from '@/components/marketplace/FavoriteButton'
import { ProductGallery } from '@/components/marketplace/ProductGallery'
import { OrderNowPanel } from '@/components/marketplace/OrderNowPanel'
import { ProductReviews } from '@/components/marketplace/ProductReviews'
import { stockLevel, useMarketBase } from '@/components/marketplace/marketplace-utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Stars } from '@/components/profile/ReviewsSection'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Material, MaterialCategory } from '@/types'

const STOCK_LINE = {
  out: { label: 'Out of stock', className: 'text-red-600 dark:text-red-400' },
  low: { label: 'Low stock', className: 'text-amber-600 dark:text-amber-400' },
  in: { label: 'In stock', className: 'text-green-600 dark:text-green-400' },
} as const

/** Parse the specifications JSON into displayable [label, value] pairs; [] when unusable. */
function parseSpecifications(specifications?: string): Array<[string, string]> {
  if (!specifications) return []
  try {
    const parsed: unknown = JSON.parse(specifications)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return []
    return Object.entries(parsed as Record<string, unknown>)
      .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
      .map(([key, value]) => [key, String(value)])
  } catch {
    return []
  }
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const base = useMarketBase()
  const materialId = Number(id)

  const { data: material, isLoading, error } = useQuery({
    queryKey: ['material', materialId],
    enabled: Number.isFinite(materialId),
    queryFn: () => materialApi.getMaterial(materialId).then((r) => r.data as Material),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['material-categories'],
    queryFn: () => materialApi.getCategories().then((r) => r.data as MaterialCategory[]),
    staleTime: Infinity,
  })

  if (isLoading) {
    return <LoadingSpinner fullPage label="Loading product..." />
  }

  if (error || !material) {
    return (
      <div className="rounded-2xl bg-white shadow-card dark:bg-card">
        <EmptyState
          icon={<Package className="h-10 w-10 text-gray-400" />}
          title="Product not found"
          description="This product may have been removed or is no longer available."
          action={{ label: 'Back to marketplace', to: `${base}/products` }}
        />
      </div>
    )
  }

  const categoryName = categories.find((c) => c.id === material.categoryId)?.name
  const metaLine = [
    material.sku ? `SKU: ${material.sku}` : '',
    material.brand,
    categoryName,
  ]
    .filter(Boolean)
    .join(' · ')
  const stock = STOCK_LINE[stockLevel(material)]
  const totalReviews = material.totalReviews ?? 0
  const specs = parseSpecifications(material.specifications)

  return (
    <div className="space-y-6">
      <Link
        to={`${base}/products`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to marketplace
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: gallery + details + reviews */}
        <div className="space-y-6 lg:col-span-2">
          <ProductGallery images={material.images} name={material.name} />

          <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{material.name}</h1>
              <FavoriteButton
                entityType="MATERIAL"
                entityId={material.id}
                className="shrink-0 border border-gray-200 dark:border-gray-600"
              />
            </div>
            {metaLine && <p className="mt-1 text-sm text-muted-foreground">{metaLine}</p>}

            {totalReviews > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <Stars rating={material.averageRating ?? 0} />
                <span className="text-sm font-semibold dark:text-gray-200">
                  {(material.averageRating ?? 0).toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(material.unitPrice)}
                <span className="text-base font-normal text-muted-foreground">
                  {' '}
                  / {material.unit}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Min order: {material.minOrderQuantity} {material.unit}
              </p>
              <p className={cn('text-sm font-medium', stock.className)}>
                {stock.label}
                {stockLevel(material) !== 'out' && ` — ${material.stockQuantity} available`}
              </p>
            </div>

            {material.description && (
              <div className="mt-5 border-t pt-5 dark:border-gray-700">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Description
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {material.description}
                </p>
              </div>
            )}

            {specs.length > 0 && (
              <div className="mt-5 border-t pt-5 dark:border-gray-700">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Specifications
                </h2>
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {specs.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-3 border-b border-dashed pb-1.5 dark:border-gray-700"
                    >
                      <dt className="text-sm capitalize text-muted-foreground">{label}</dt>
                      <dd className="text-right text-sm font-medium text-gray-900 dark:text-gray-200">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          <ProductReviews material={material} />
        </div>

        {/* Right: supplier + order panel */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-card">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Sold by
                </p>
                <p className="flex items-center gap-1.5 truncate font-semibold text-gray-900 dark:text-white">
                  {material.supplierName || `Supplier #${material.supplierId}`}
                  {material.supplierVerified && (
                    <BadgeCheck
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-label="Verified supplier"
                    />
                  )}
                </p>
                <Link
                  to={`/profile/${material.supplierId}`}
                  className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                >
                  View supplier profile
                </Link>
              </div>
            </div>
          </div>

          <OrderNowPanel material={material} />
        </div>
      </div>
    </div>
  )
}
