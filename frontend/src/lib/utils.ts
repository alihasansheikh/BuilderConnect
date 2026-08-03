import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolve an uploaded-asset path (e.g. "/uploads/projects/x.jpg") to a URL the browser can load.
 * The backend serves uploads under the API context path, so stored "/uploads/..." paths must be
 * prefixed with the API base (VITE_API_URL, or "/api" in dev — which Vite proxies to the backend).
 * Absolute/data/blob URLs are returned unchanged. Centralizes what used to be a hardcoded, and in
 * places missing, "/api" prefix (which broke in production and on the Settings page).
 */
export function resolveAssetUrl(path?: string | null): string {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  const base = (import.meta.env.VITE_API_URL as string | undefined) || '/api'
  return path.startsWith('/uploads') ? `${base}${path}` : path
}

/**
 * Trigger a browser download of a data: (or blob:) URL by synthesising a
 * short-lived anchor and clicking it. Centralises the create-anchor / set
 * href+download / click / remove idiom inlined across several pages.
 */
export function downloadDataUrl(filename: string, dataUrl: string): void {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

/**
 * Parse a JSON array field that may be double/triple-encoded from the backend.
 * Handles: string[], '["a","b"]', '"[\"a\",\"b\"]"', etc.
 * Always returns a clean string[].
 */
export function parseJsonArray(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === 'string')

  if (typeof raw !== 'string') return []

  let value: unknown = raw
  // Unwrap up to 5 layers of JSON string encoding
  for (let i = 0; i < 5; i++) {
    if (typeof value !== 'string') break
    try {
      value = JSON.parse(value)
    } catch {
      // If it's not valid JSON, try comma-separated
      return (value as string).split(',').map(s => s.trim()).filter(Boolean)
    }
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === 'string')
    }
  }

  return typeof value === 'string' ? [value] : []
}
