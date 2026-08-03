import type { UserRole } from '@/types'

/**
 * Dashboard URL segment for a user role. Used to build role-scoped links such as
 * `/${segment}/messages`. ADMIN and SUPER_ADMIN share the `/admin` segment, and
 * SUPPORT_AGENT maps to `/support` — a raw `role.toLowerCase()` gets both wrong
 * (`super_admin`, `support_agent`) and 404s.
 */
const ROLE_SEGMENTS: Record<UserRole, string> = {
  CLIENT: 'client',
  BUILDER: 'builder',
  SUPPLIER: 'supplier',
  SUPPORT_AGENT: 'support',
  ADMIN: 'admin',
  SUPER_ADMIN: 'admin',
}

/** Returns the dashboard route segment for a role, falling back to `client` for unknown input. */
export function roleToSegment(role: string | undefined | null): string {
  if (role && role in ROLE_SEGMENTS) {
    return ROLE_SEGMENTS[role as UserRole]
  }
  return 'client'
}
