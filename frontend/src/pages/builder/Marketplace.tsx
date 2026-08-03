import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { favoriteApi, projectApi } from '@/services/api'
import { Project } from '@/types'
import { FavoriteButton } from '@/components/marketplace/FavoriteButton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { FilterChips } from '@/components/ui/FilterChips'
import { useDebounce } from '@/hooks/useDebounce'
import {
  deadlineClasses,
  formatBudgetRange,
  formatDate,
  formatRelativeTime,
  formatStatus,
} from '@/lib/formatters'
import { cn, parseJsonArray } from '@/lib/utils'
import { PROPERTY_TYPES, PROVINCES, PROVINCE_CITIES } from '@/lib/project-taxonomy'
import {
  AlertCircle,
  CalendarDays,
  Flame,
  Gavel,
  Heart,
  Home,
  Layers,
  LayoutGrid,
  List as ListIcon,
  MapPin,
  Ruler,
  SearchX,
  ShieldCheck,
  Wallet,
} from 'lucide-react'

const BUDGET_DEBOUNCE_MS = 400
const MARKETPLACE_STALE_TIME_MS = 2 * 60 * 1000 // avoid rapid refetch on tab switch
const SKELETON_COUNT = 6
const MAX_TRADE_CHIPS = 4
const VIEW_STORAGE_KEY = 'marketplace-view'

// URL query-param keys — filters live in the URL so they survive refresh and back-navigation.
const PARAM_CITY = 'city'
const PARAM_CATEGORY = 'categoryId'
const PARAM_PROPERTY_TYPE = 'propertyType'
const PARAM_PROVINCE = 'province'
const PARAM_MIN_BUDGET = 'minBudget'
const PARAM_MAX_BUDGET = 'maxBudget'
const PARAM_SORT = 'sort'
const PARAM_PAGE = 'page'
const PARAM_FAVS = 'favs'

// All cities from the shared taxonomy, deduped and alphabetized.
const CITIES: string[] = Array.from(new Set(Object.values(PROVINCE_CITIES).flat())).sort()

// Sort values are Spring pageable `sort` params ("property,direction") on the
// authenticated GET /v1/projects endpoint. '' = backend default (createdAt DESC).
const SORT_OPTIONS = [
  { value: '', label: 'Newest' },
  { value: 'isUrgent,desc', label: 'Urgent first' },
  { value: 'budgetMax,desc', label: 'Highest budget' },
] as const
type SortValue = (typeof SORT_OPTIONS)[number]['value']

type ViewMode = 'grid' | 'list'

const SELECT_CLASSES =
  'rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'

const META_ICON = 'h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500'

// Stable per-category accent color for the card's left bar. Falls back to a hash over the
// name so any category the backend adds still gets a consistent, distinct color.
const ACCENT_PALETTE = [
  'bg-blue-500',
  'bg-orange-500',
  'bg-violet-500',
  'bg-teal-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-pink-500',
] as const

function categoryAccent(name?: string): string {
  if (!name) return 'bg-primary'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length]
}

/** Set or remove a query param on a (fresh copy of a) URLSearchParams. */
function applyParam(params: URLSearchParams, key: string, value: string): void {
  if (value) {
    params.set(key, value)
  } else {
    params.delete(key)
  }
}

function readStoredView(): ViewMode {
  return localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid'
}

interface ProjectCategory {
  id: number
  name: string
  slug: string
  icon: string
}

function RequirementBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700/40 dark:text-gray-300">
      {icon}
      {label}
    </span>
  )
}

function CardMeta({
  icon,
  children,
  className,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {icon}
      {children}
    </span>
  )
}

/** Location · category · property type · size — the quick-scan line under the title. */
function MetaRow({ project, className }: { project: Project; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400',
        className
      )}
    >
      <CardMeta icon={<MapPin className={META_ICON} />}>{project.city}</CardMeta>
      {project.categoryName && (
        <CardMeta icon={<Layers className={META_ICON} />}>{project.categoryName}</CardMeta>
      )}
      {project.propertyType && (
        <CardMeta icon={<Home className={META_ICON} />}>{formatStatus(project.propertyType)}</CardMeta>
      )}
      {project.areaValue != null && project.areaUnit && (
        <CardMeta icon={<Ruler className={META_ICON} />}>
          {project.areaValue} {formatStatus(project.areaUnit)}
          {project.areaSqFt != null && project.areaUnit !== 'SQ_FT' && (
            <> (~{project.areaSqFt.toLocaleString()} sq ft)</>
          )}
        </CardMeta>
      )}
    </div>
  )
}

/** Trade chips (capped) plus the verified-only requirement badge. */
function TradeAndRequirementChips({ project }: { project: Project }) {
  const trades = parseJsonArray(project.trades)
  const visibleTrades = trades.slice(0, MAX_TRADE_CHIPS)
  const hiddenTradeCount = trades.length - visibleTrades.length

  if (visibleTrades.length === 0 && !project.verifiedBuildersOnly) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleTrades.map((trade) => (
        <span
          key={trade}
          className="rounded-full bg-primary/[0.08] px-2.5 py-0.5 text-xs font-medium text-primary"
        >
          {trade}
        </span>
      ))}
      {hiddenTradeCount > 0 && (
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700/40 dark:text-gray-400">
          +{hiddenTradeCount}
        </span>
      )}
      {project.verifiedBuildersOnly && (
        <RequirementBadge icon={<ShieldCheck className="h-3 w-3" />} label="Verified only" />
      )}
    </div>
  )
}

/** The deadline line: prefers the bidding close date (urgency-colored) over the completion date. */
function DeadlineMeta({ project }: { project: Project }) {
  if (project.biddingDeadline) {
    return (
      <CardMeta
        icon={<CalendarDays className="h-4 w-4 flex-shrink-0" />}
        className={deadlineClasses(project.biddingDeadline)}
      >
        Bids close {formatDate(project.biddingDeadline)}
      </CardMeta>
    )
  }
  if (project.deadline) {
    return (
      <CardMeta icon={<CalendarDays className={META_ICON} />} className="text-gray-500 dark:text-gray-400">
        Complete by {formatDate(project.deadline)}
      </CardMeta>
    )
  }
  return null
}

function UrgentChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
      <Flame className="h-3 w-3" />
      Urgent
    </span>
  )
}

/** Budget shown as the card's hero figure. "Open to quotes" projects show that text with no label. */
function BudgetHero({ project, size = 'text-xl' }: { project: Project; size?: string }) {
  const isOpenQuote = project.budgetMin == null && project.budgetMax == null
  return (
    <div>
      <p className={cn('font-bold text-gray-900 dark:text-white', size)}>
        {formatBudgetRange(project.budgetMin, project.budgetMax)}
      </p>
      {!isOpenQuote && <p className="text-xs text-gray-400 dark:text-gray-500">Estimated budget</p>}
    </div>
  )
}

function BidCountMeta({ count }: { count: number }) {
  return (
    <CardMeta icon={<Gavel className={META_ICON} />} className="text-gray-500 dark:text-gray-400">
      {count} {count === 1 ? 'bid' : 'bids'}
    </CardMeta>
  )
}

const CARD_INTERACTION =
  'group block rounded-2xl bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-lg ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
  'dark:bg-card dark:focus-visible:ring-offset-gray-900'

/** Grid tile: colored category accent bar + budget-hero layout, footer pinned to the bottom. */
function MarketplaceGridCard({ project }: { project: Project }) {
  const accent = categoryAccent(project.categoryName)
  return (
    <Link to={`/builder/marketplace/${project.id}`} className={cn(CARD_INTERACTION, 'flex h-full overflow-hidden')}>
      <span className={cn('w-1.5 flex-shrink-0', accent)} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusBadge status={project.status} domain="project" />
            {project.isUrgent && <UrgentChip />}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
              {formatRelativeTime(project.createdAt)}
            </span>
            <FavoriteButton entityType="PROJECT" entityId={project.id} />
          </div>
        </div>

        <h3 className="mt-2 line-clamp-2 font-semibold text-gray-900 transition-colors group-hover:text-primary dark:text-white">
          {project.title}
        </h3>

        <MetaRow project={project} className="mt-1.5" />

        <div className="mt-3">
          <BudgetHero project={project} />
        </div>

        <div className="mt-3">
          <TradeAndRequirementChips project={project} />
        </div>

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3 text-xs dark:border-gray-700">
            <BidCountMeta count={project.bidCount ?? 0} />
            <DeadlineMeta project={project} />
          </div>
        </div>
      </div>
    </Link>
  )
}

/** List row: wider horizontal layout with a thin accent bar and a two-line description. */
function MarketplaceListCard({ project }: { project: Project }) {
  const accent = categoryAccent(project.categoryName)
  return (
    <Link to={`/builder/marketplace/${project.id}`} className={cn(CARD_INTERACTION, 'flex gap-4 overflow-hidden')}>
      <span className={cn('w-1.5 flex-shrink-0', accent)} aria-hidden="true" />
      <div className="min-w-0 flex-1 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900 transition-colors group-hover:text-primary dark:text-white">
              {project.title}
            </h3>
            <StatusBadge status={project.status} domain="project" />
            {project.isUrgent && <UrgentChip />}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <p className="whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
              {formatRelativeTime(project.createdAt)}
            </p>
            <FavoriteButton entityType="PROJECT" entityId={project.id} />
          </div>
        </div>

        <MetaRow project={project} className="mt-2" />

        {project.description && (
          <p className="mt-2.5 line-clamp-2 break-words text-sm text-gray-600 dark:text-gray-400">
            {project.description}
          </p>
        )}

        <div className="mt-3">
          <TradeAndRequirementChips project={project} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-sm dark:border-gray-700">
          <CardMeta icon={<Wallet className={META_ICON} />} className="font-medium text-gray-700 dark:text-gray-300">
            {formatBudgetRange(project.budgetMin, project.budgetMax)}
          </CardMeta>
          <BidCountMeta count={project.bidCount ?? 0} />
          <DeadlineMeta project={project} />
        </div>
      </div>
    </Link>
  )
}

/** Segmented Grid/List switch. */
function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const options: Array<{ value: ViewMode; icon: React.ReactNode; label: string }> = [
    { value: 'grid', icon: <LayoutGrid className="h-4 w-4" />, label: 'Grid view' },
    { value: 'list', icon: <ListIcon className="h-4 w-4" />, label: 'List view' },
  ]
  return (
    <div className="inline-flex rounded-lg border p-0.5 dark:border-gray-700" role="group" aria-label="View mode">
      {options.map((option) => {
        const active = view === option.value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            aria-label={option.label}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-gray-500 hover:text-primary dark:text-gray-400'
            )}
          >
            {option.icon}
          </button>
        )
      })}
    </div>
  )
}

/** Placeholder card that matches the real card's footprint, shown while loading. */
function LoadingCard() {
  return (
    <div className="flex h-full overflow-hidden rounded-2xl bg-white shadow-card dark:bg-card">
      <span className="w-1.5 flex-shrink-0 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
      <div className="flex-1 animate-pulse space-y-3 p-5">
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-6 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  )
}

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setViewState] = useState<ViewMode>(readStoredView)

  const setView = (next: ViewMode) => {
    setViewState(next)
    localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  const city = searchParams.get(PARAM_CITY) ?? ''
  const categoryId = searchParams.get(PARAM_CATEGORY) ?? ''
  const propertyType = searchParams.get(PARAM_PROPERTY_TYPE) ?? ''
  const province = searchParams.get(PARAM_PROVINCE) ?? ''
  const urlMinBudget = searchParams.get(PARAM_MIN_BUDGET) ?? ''
  const urlMaxBudget = searchParams.get(PARAM_MAX_BUDGET) ?? ''
  const sortParam = searchParams.get(PARAM_SORT) ?? ''
  const sort: SortValue = SORT_OPTIONS.some((option) => option.value === sortParam)
    ? (sortParam as SortValue)
    : ''
  const page = Math.max(0, Number(searchParams.get(PARAM_PAGE) ?? '0') || 0)
  const favoritesOnly = searchParams.get(PARAM_FAVS) === '1'

  // Budget inputs stay in local state so typing is instant; the debounced values are
  // written into the URL, which is the single source of truth for the query below.
  const [minBudgetInput, setMinBudgetInput] = useState(urlMinBudget)
  const [maxBudgetInput, setMaxBudgetInput] = useState(urlMaxBudget)
  const debouncedMinBudget = useDebounce(minBudgetInput, BUDGET_DEBOUNCE_MS)
  const debouncedMaxBudget = useDebounce(maxBudgetInput, BUDGET_DEBOUNCE_MS)

  // Push settled budget values into the URL (and reset the page). While a debounce is still
  // pending (inputs ahead of the debounced values) the effect must not run: setSearchParams'
  // identity changes on every URL write, and re-running here with STALE debounced values
  // would write a just-cleared budget straight back into the URL.
  useEffect(() => {
    if (minBudgetInput !== debouncedMinBudget || maxBudgetInput !== debouncedMaxBudget) return
    setSearchParams(
      (prev) => {
        const currentMin = prev.get(PARAM_MIN_BUDGET) ?? ''
        const currentMax = prev.get(PARAM_MAX_BUDGET) ?? ''
        if (currentMin === debouncedMinBudget && currentMax === debouncedMaxBudget) return prev
        const next = new URLSearchParams(prev)
        applyParam(next, PARAM_MIN_BUDGET, debouncedMinBudget)
        applyParam(next, PARAM_MAX_BUDGET, debouncedMaxBudget)
        next.delete(PARAM_PAGE)
        return next
      },
      { replace: true }
    )
  }, [minBudgetInput, maxBudgetInput, debouncedMinBudget, debouncedMaxBudget, setSearchParams])

  // Re-sync the inputs when the URL changes underneath us (back/forward navigation).
  useEffect(() => {
    setMinBudgetInput(urlMinBudget)
    setMaxBudgetInput(urlMaxBudget)
  }, [urlMinBudget, urlMaxBudget])

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
    city || categoryId || propertyType || province || urlMinBudget || urlMaxBudget || sort || favoritesOnly
  )

  const clearFilters = () => {
    setMinBudgetInput('')
    setMaxBudgetInput('')
    setSearchParams({}, { replace: true })
  }

  const { data: categories = [] } = useQuery({
    queryKey: ['project-categories'],
    queryFn: () => projectApi.getCategories().then((r) => r.data as ProjectCategory[]),
    staleTime: Infinity,
  })

  const filters = {
    city,
    categoryId,
    propertyType,
    province,
    minBudget: urlMinBudget,
    maxBudget: urlMaxBudget,
    sort,
  }

  const { data, isLoading, error, refetch, isPlaceholderData } = useQuery({
    queryKey: ['marketplace-projects', filters, page],
    queryFn: async () => {
      const response = await projectApi.searchProjects({
        city: city || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        propertyType: propertyType || undefined,
        province: province || undefined,
        minBudget: urlMinBudget ? Number(urlMinBudget) : undefined,
        maxBudget: urlMaxBudget ? Number(urlMaxBudget) : undefined,
        sort: sort || undefined,
        page,
      })
      return response.data
    },
    staleTime: MARKETPLACE_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    enabled: !favoritesOnly,
  })

  // Favourites view is a small client-side list — server filters/pagination don't apply.
  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['favorites', 'PROJECT'],
    queryFn: () => favoriteApi.listProjects().then((r) => r.data),
    enabled: favoritesOnly,
  })

  const total = data?.totalElements ?? 0

  // 1 column on phones, 2 on tablets, capped at 3 on desktop and wider.
  const gridClasses = 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'
  const containerClasses = view === 'grid' ? gridClasses : 'space-y-4'

  return (
    <div className="space-y-6">
      {/* Header + view toggle */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Project Marketplace</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {favoritesOnly
              ? favoritesLoading
                ? 'Loading…'
                : `${favorites.length} favourite ${favorites.length === 1 ? 'project' : 'projects'}`
              : isLoading
                ? 'Loading…'
                : `${total} open ${total === 1 ? 'project' : 'projects'} to bid on`}
          </p>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* Filters */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-card dark:bg-card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <select
            value={city}
            onChange={(e) => updateParam(PARAM_CITY, e.target.value)}
            aria-label="Filter by city"
            className={SELECT_CLASSES}
          >
            <option value="">All Cities</option>
            {CITIES.map((cityOption) => (
              <option key={cityOption} value={cityOption}>
                {cityOption}
              </option>
            ))}
          </select>

          <select
            value={categoryId}
            onChange={(e) => updateParam(PARAM_CATEGORY, e.target.value)}
            aria-label="Filter by category"
            className={SELECT_CLASSES}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={propertyType}
            onChange={(e) => updateParam(PARAM_PROPERTY_TYPE, e.target.value)}
            aria-label="Filter by property type"
            className={SELECT_CLASSES}
          >
            <option value="">All Property Types</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={province}
            onChange={(e) => updateParam(PARAM_PROVINCE, e.target.value)}
            aria-label="Filter by province"
            className={SELECT_CLASSES}
          >
            <option value="">All Provinces</option>
            {PROVINCES.map((provinceOption) => (
              <option key={provinceOption} value={provinceOption}>
                {provinceOption}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={0}
            placeholder="Min Budget (PKR)"
            value={minBudgetInput}
            onChange={(e) => setMinBudgetInput(e.target.value)}
            aria-label="Minimum budget in PKR"
            className={SELECT_CLASSES}
          />

          <input
            type="number"
            min={0}
            placeholder="Max Budget (PKR)"
            value={maxBudgetInput}
            onChange={(e) => setMaxBudgetInput(e.target.value)}
            aria-label="Maximum budget in PKR"
            className={SELECT_CLASSES}
          />

          <button
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear Filters
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterChips options={SORT_OPTIONS} value={sort} onChange={(value) => updateParam(PARAM_SORT, value)} />
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
      </div>

      {/* Results */}
      {favoritesOnly ? (
        favoritesLoading ? (
          <div className={containerClasses}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-card dark:bg-card">
            <EmptyState
              icon={<Heart className="h-12 w-12 text-gray-300 dark:text-gray-600" />}
              title="No favourite projects yet"
              description="No favourite projects yet. Tap the heart on any project to save it here."
            />
          </div>
        ) : (
          <div className={containerClasses}>
            {favorites.map((project: Project) =>
              view === 'grid' ? (
                <MarketplaceGridCard key={project.id} project={project} />
              ) : (
                <MarketplaceListCard key={project.id} project={project} />
              )
            )}
          </div>
        )
      ) : isLoading ? (
        <div className={containerClasses}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card dark:bg-card">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="font-medium text-gray-900 dark:text-white">Failed to load marketplace projects</p>
          <button onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">
            Try again
          </button>
        </div>
      ) : !data?.content?.length ? (
        <div className="rounded-2xl bg-white shadow-card dark:bg-card">
          <EmptyState
            icon={<SearchX className="h-12 w-12 text-gray-300 dark:text-gray-600" />}
            title="No projects found"
            description={
              hasActiveFilters
                ? 'Nothing matches these filters. Try widening your search.'
                : 'There are no open projects right now. Check back later.'
            }
            action={hasActiveFilters ? { label: 'Clear Filters', onClick: clearFilters } : undefined}
          />
        </div>
      ) : (
        <>
          <div className={cn(containerClasses, isPlaceholderData && 'opacity-60 transition-opacity')}>
            {data.content.map((project: Project) =>
              view === 'grid' ? (
                <MarketplaceGridCard key={project.id} project={project} />
              ) : (
                <MarketplaceListCard key={project.id} project={project} />
              )
            )}
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
