import type { ReactNode } from 'react'
import { Building2, Package, ShoppingCart, Star, MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Stars } from '@/components/profile/ReviewsSection'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { parseJsonArray } from '@/lib/utils'
import type { SupplierProfile } from '@/types'

const PANEL = 'bg-white dark:bg-card rounded-2xl shadow-card p-6'

/** Normalize a list field that may arrive as string[] or as a JSON-encoded string. */
function toList(value?: string[] | string): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.length > 0)
  return parseJsonArray(value)
}

// ── Stats row ─────────────────────────────────────────────────────────────

interface StatTileProps {
  icon: ReactNode
  label: string
  value: ReactNode
  sub?: ReactNode
}

function StatTile({ icon, label, value, sub }: StatTileProps) {
  return (
    <div className="rounded-lg border bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/40">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  )
}

/** Four headline numbers for a supplier: orders, rating, reviews, catalog size. */
export function SupplierStatsRow({ sp, catalogCount }: { sp: Partial<SupplierProfile>; catalogCount?: number }) {
  const rating = Number(sp.averageRating ?? 0)

  return (
    <section className={PANEL}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={<ShoppingCart className="h-4 w-4" />}
          label="Orders completed"
          value={sp.totalOrdersCompleted ?? 0}
        />
        <StatTile
          icon={<Star className="h-4 w-4" />}
          label="Rating"
          value={rating > 0 ? rating.toFixed(1) : '—'}
          sub={rating > 0 ? <Stars rating={rating} /> : undefined}
        />
        <StatTile
          icon={<MessageSquare className="h-4 w-4" />}
          label="Product reviews"
          value={sp.totalReviews ?? 0}
        />
        <StatTile
          icon={<Package className="h-4 w-4" />}
          label="Catalog items"
          value={catalogCount ?? 0}
        />
      </div>
    </section>
  )
}

// ── Business information ──────────────────────────────────────────────────

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-700/60 dark:text-gray-200"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

/**
 * Definition-list of the supplier's business facts. Registration # and Tax ID only render when
 * present — the backend already nulls them for viewers who aren't the owner or an admin.
 */
export function SupplierBusinessInfo({ sp, isOwner }: { sp: Partial<SupplierProfile>; isOwner: boolean }) {
  const deliveryAreas = toList(sp.deliveryAreas)
  const categories = toList(sp.categories)
  const description = sp.description?.trim() ?? ''

  const facts: { label: string; value: ReactNode }[] = []
  if (sp.companyName) facts.push({ label: 'Company', value: sp.companyName })
  if (sp.businessRegistrationNumber) facts.push({ label: 'Registration #', value: sp.businessRegistrationNumber })
  if (sp.taxId) facts.push({ label: 'Tax ID', value: sp.taxId })
  if (sp.warehouseAddress) facts.push({ label: 'Warehouse address', value: sp.warehouseAddress })
  if (deliveryAreas.length > 0) facts.push({ label: 'Delivery areas', value: <ChipList items={deliveryAreas} /> })
  if ((sp.minimumOrderValue ?? 0) > 0)
    facts.push({ label: 'Minimum order', value: formatCurrency(sp.minimumOrderValue as number) })
  if (categories.length > 0) facts.push({ label: 'Categories', value: <ChipList items={categories} /> })
  if (sp.isVerified && sp.verifiedAt) facts.push({ label: 'Verified since', value: formatDate(sp.verifiedAt) })

  const isEmpty = facts.length === 0 && !description
  if (isEmpty && !isOwner) return null

  return (
    <section className={PANEL}>
      <h2 className="mb-4 text-lg font-semibold dark:text-white">Business Information</h2>

      {isEmpty ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10 text-gray-400" />}
          title="No business details yet"
          description="Add your company details, delivery areas and categories from the edit button above."
        />
      ) : (
        <>
          {description && (
            <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {description}
            </p>
          )}
          {facts.length > 0 && (
            <dl className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
                  <dt className="text-sm text-muted-foreground sm:w-40 sm:shrink-0">{fact.label}</dt>
                  <dd className="min-w-0 break-words text-sm font-medium text-gray-900 dark:text-white">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </section>
  )
}
