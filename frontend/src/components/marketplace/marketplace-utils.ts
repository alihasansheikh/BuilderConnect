import { useAuth } from '@/contexts/AuthContext'
import { resolveAssetUrl } from '@/lib/utils'
import type { Material } from '@/types'

/**
 * Shared helpers for the product marketplace. Buyer pages are mounted under both
 * /client and /builder route blocks, so components never hardcode a role prefix —
 * they derive it from the signed-in user via useMarketBase().
 */

/**
 * Parse a Material.images value into resolved URLs. The column is stored as JSON but seed data
 * and some writers double-encode it (a JSON string wrapping a JSON array), so we peel string
 * layers until we reach an array or a bare path — the same defensive unwrap the backend's
 * JsonUtils performs.
 */
export function parseImages(images?: string): string[] {
  if (!images) return []
  let value: unknown = images.trim()
  for (let i = 0; i < 5 && typeof value === 'string'; i++) {
    const s = (value as string).trim()
    if (!s.startsWith('[') && !s.startsWith('"')) break // a bare path — stop unwrapping
    try {
      value = JSON.parse(s)
    } catch {
      break
    }
  }
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .map((v) => resolveAssetUrl(v))
  }
  return typeof value === 'string' && value.length > 0 ? [resolveAssetUrl(value)] : []
}

/** First displayable image for a material card, or '' when none. */
export function firstMaterialImage(images?: string): string {
  return parseImages(images)[0] ?? ''
}

export type StockLevel = 'in' | 'low' | 'out'

/**
 * Effective availability for buyers. A product is orderable only when the supplier lists it
 * (isAvailable) AND at least one minimum order quantity is in stock; "low" warns when fewer
 * than two minimum orders remain.
 */
export function stockLevel(material: Material): StockLevel {
  const minQty = Math.max(1, material.minOrderQuantity || 1)
  if (!material.isAvailable || material.stockQuantity < minQty) return 'out'
  if (material.stockQuantity < minQty * 2) return 'low'
  return 'in'
}

/**
 * Location state carried by the "Order again" navigation from a past order to the product
 * page — OrderNowPanel uses it to prefill the order form.
 */
export interface ReorderState {
  quantity?: number
  deliveryAddress?: string
  city?: string
  contactName?: string
  contactPhone?: string
}

/** Route prefix for the current buyer's marketplace pages ('/client' or '/builder'). */
export function useMarketBase(): string {
  const { user } = useAuth()
  return user?.role === 'BUILDER' ? '/builder' : '/client'
}

/** Major delivery cities offered in order/profile forms (same list the supplier profile uses). */
export const CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
] as const

