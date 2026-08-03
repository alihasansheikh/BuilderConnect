import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertCircle, Heart, Package, Search, SearchX } from 'lucide-react'
import { favoriteApi, materialApi } from '@/services/api'
import { ProductCard } from '@/components/marketplace/ProductCard'
import { useMarketBase } from '@/components/marketplace/marketplace-utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterChips } from '@/components/ui/FilterChips'
import { Pagination } from '@/components/ui/Pagination'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import type { Material, MaterialCategory } from '@/types'

const TEXT_DEBOUNCE_MS = 400
const PRODUCTS_STALE_TIME_MS = 120000
const SKELETON_COUNT = 6

// URL query-param keys — filters live in the URL so they survive refresh and back-navigation.
const PARAM_QUERY = 'q'
const PARAM_CATEGORY = 'categoryId'
const PARAM_MIN_PRICE = 'minPrice'
const PARAM_MAX_PRICE = 'maxPrice'
const PARAM_IN_STOCK = 'inStock'
const PARAM_SORT = 'sort'
const PARAM_PAGE = 'page'
const PARAM_FAVS = 'favs'

// Sort values are sent to the backend as-is; 'newest' is the default and kept out of the URL.
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low' },
  { value: 'price_desc', label: 'Price: High' },
  { value: 'rating', label: 'Top Rated' },
] as const
type SortValue = (typeof SORT_OPTIONS)[number]['value']
const DEFAULT_SORT: SortValue = 'newest'

const FIELD_CLASSES =
  'rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'

/** Set or remove a query param on a (fresh copy of a) URLSearchParams. */
function applyParam(params: URLSearchParams, key: string, value: string): void {
  if (value) {
    params.set(key, value)
  } else {
    params.delete(key)
  }
}

export default function ProductMarketplace() {
  const base = useMarketBase()
  const [searchParams, setSearchParams] = useSearchParams()

  const urlQuery = searchParams.get(PARAM_QUERY) ?? ''
  const categoryId = searchParams.get(PARAM_CATEGORY) ?? ''
  const urlMinPrice = searchParams.get(PARAM_MIN_PRICE) ?? ''
  const urlMaxPrice = searchParams.get(PARAM_MAX_PRICE) ?? ''
  const inStockOnly = searchParams.get(PARAM_IN_STOCK) === '1'
  const sortParam = searchParams.get(PARAM_SORT) ?? ''
  const sort: SortValue = SORT_OPTIONS.some((option) => option.value === sortParam)
    ? (sortParam as SortValue)
    : DEFAULT_SORT
  const page = Math.max(0, Number(searchParams.get(PARAM_PAGE) ?? '0') || 0)
  const favoritesOnly = searchParams.get(PARAM_FAVS) === '1'

  // Text/price inputs stay in local state so typing is instant; the debounced values are
  // written into the URL, which is the single source of truth for the query below.
  const [queryInput, setQueryInput] = useState(urlQuery)
  const [minPriceInput, setMinPriceInput] = useState(urlMinPrice)
  const [maxPriceInput, setMaxPriceInput] = useState(urlMaxPrice)
  const debouncedQuery = useDebounce(queryInput, TEXT_DEBOUNCE_MS)
  const debouncedMinPrice = useDebounce(minPriceInput, TEXT_DEBOUNCE_MS)
  const debouncedMaxPrice = useDebounce(maxPriceInput, TEXT_DEBOUNCE_MS)

  // Push settled input values into the URL (and reset the page). No-op when unchanged,
  // so this never fights with clearFilters or back/forward navigation.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const currentQuery = prev.get(PARAM_QUERY) ?? ''
        const currentMin = prev.get(PARAM_MIN_PRICE) ?? ''
        const currentMax = prev.get(PARAM_MAX_PRICE) ?? ''
        if (
          currentQuery === debouncedQuery &&
          currentMin === debouncedMinPrice &&
          currentMax === debouncedMaxPrice
        ) {
          return prev
        }
        const next = new URLSearchParams(prev)
        applyParam(next, PARAM_QUERY, debouncedQuery)
        applyParam(next, PARAM_MIN_PRICE, debouncedMinPrice)
        applyParam(next, PARAM_MAX_PRICE, debouncedMaxPrice)
        next.delete(PARAM_PAGE)
        return next
      },
      { replace: true }
    )
  }, [debouncedQuery, debouncedMinPrice, debouncedMaxPrice, setSearchParams])

  // Re-sync the inputs when the URL changes underneath us (back/forward navigation).
  useEffect(() => {
    setQueryInput(urlQuery)
    setMinPriceInput(urlMinPrice)
    setMaxPriceInput(urlMaxPrice)
  }, [urlQuery, urlMinPrice, urlMaxPrice])

  const updateParam = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        applyParam(next, key, value)
        if (key !== PARAM_PAGE) next.delete(PARAM_PAGE)
        return next
      },
      { replace: true }
    )
  }

  const hasActiveFilters = Boolean(
    urlQuery || categoryId || urlMinPrice || urlMaxPrice || inStockOnly || sort !== DEFAULT_SORT
  )

  const clearFilters = () => {
    setQueryInput('')
    setMinPriceInput('')
    setMaxPriceInput('')
    setSearchParams({}, { replace: true })
  }

  const { data: categories = [] } = useQuery({
    queryKey: ['material-categories'],
    queryFn: () => materialApi.getCategories().then((r) => r.data as MaterialCategory[]),
    staleTime: Infinity,
  })

  const filters = {
    q: urlQuery,
    categoryId,
    minPrice: urlMinPrice,
    maxPrice: urlMaxPrice,
    inStock: inStockOnly,
    sort,
    page,
  }

  const { data, isLoading, error, refetch, isPlaceholderData } = useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const response = await materialApi.browse({
        query: urlQuery || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        minPrice: urlMinPrice ? Number(urlMinPrice) : undefined,
        maxPrice: urlMaxPrice ? Number(urlMaxPrice) : undefined,
        inStock: inStockOnly || undefined,
        sort,
        page,
      })
      return response.data
    },
    staleTime: PRODUCTS_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    enabled: !favoritesOnly,
  })

  // Favourites view is a small client-side list — server filters/pagination don't apply.
  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites', 'MATERIAL'],
    queryFn: () => favoriteApi.listMaterials().then((r) => r.data),
    enabled: favoritesOnly,
  })

  const total = data?.totalElements ?? 0
  const gridClasses = 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Product Marketplace</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {favoritesOnly
              ? favoritesLoading
                ? 'Loading…'
                : `${favorites.length} favourite ${favorites.length === 1 ? 'product' : 'products'}`
              : isLoading
                ? 'Loading…'
                : `${total} ${total === 1 ? 'product' : 'products'} from suppliers across Pakistan — Cash on Delivery`}
          </p>
        </div>
        <Link
          to={`${base}/orders`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary/50 hover:text-primary dark:border-gray-600 dark:bg-card dark:text-gray-300 dark:hover:text-primary"
        >
          <Package className="h-4 w-4" />
          My Orders
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-card dark:bg-card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products, brands, SKUs..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              aria-label="Search products"
              className={cn(FIELD_CLASSES, 'w-full pl-9')}
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => updateParam(PARAM_CATEGORY, e.target.value)}
            aria-label="Filter by category"
            className={FIELD_CLASSES}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={0}
            placeholder="Min Price (PKR)"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            aria-label="Minimum price in PKR"
            className={FIELD_CLASSES}
          />

          <input
            type="number"
            min={0}
            placeholder="Max Price (PKR)"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            aria-label="Maximum price in PKR"
            className={FIELD_CLASSES}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterChips
              options={SORT_OPTIONS}
              value={sort}
              onChange={(value) => updateParam(PARAM_SORT, value === DEFAULT_SORT ? '' : value)}
            />
            <button
              onClick={() => updateParam(PARAM_FAVS, favoritesOnly ? '' : '1')}
              aria-pressed={favoritesOnly}
              className={cn(
                'inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                favoritesOnly
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary/50 hover:text-primary dark:border-gray-700 dark:bg-card dark:text-gray-300 dark:hover:text-primary'
              )}
            >
              <Heart className={cn('h-4 w-4', favoritesOnly && 'fill-current')} />
              Favourites
            </button>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => updateParam(PARAM_IN_STOCK, e.target.checked ? '1' : '')}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
              />
              In stock only
            </label>
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {favoritesOnly ? (
        favoritesLoading ? (
          <div className={gridClasses}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-card dark:bg-card">
            <EmptyState
              icon={<Heart className="h-12 w-12 text-gray-300 dark:text-gray-600" />}
              title="No favourites yet"
              description="No favourites yet — tap the heart on any product."
            />
          </div>
        ) : (
          <div className={gridClasses}>
            {favorites.map((material: Material) => (
              <ProductCard
                key={material.id}
                material={material}
                to={`${base}/products/${material.id}`}
              />
            ))}
          </div>
        )
      ) : isLoading ? (
        <div className={gridClasses}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card dark:bg-card">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="font-medium text-gray-900 dark:text-white">Failed to load products</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : !data?.content?.length ? (
        <div className="rounded-2xl bg-white shadow-card dark:bg-card">
          <EmptyState
            icon={<SearchX className="h-12 w-12 text-gray-300 dark:text-gray-600" />}
            title="No products found"
            description={
              hasActiveFilters
                ? 'Nothing matches these filters. Try widening your search.'
                : 'There are no products listed right now. Check back later.'
            }
            action={hasActiveFilters ? { label: 'Clear Filters', onClick: clearFilters } : undefined}
          />
        </div>
      ) : (
        <>
          <div className={cn(gridClasses, isPlaceholderData && 'opacity-60 transition-opacity')}>
            {data.content.map((material: Material) => (
              <ProductCard
                key={material.id}
                material={material}
                to={`${base}/products/${material.id}`}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={data.totalPages}
            onPageChange={(nextPage) => updateParam(PARAM_PAGE, nextPage > 0 ? String(nextPage) : '')}
            className="pt-2"
          />
        </>
      )}
    </div>
  )
}
