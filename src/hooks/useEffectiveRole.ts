"use client"

import { useAppStore } from '@/store'
import { Role } from '@/types'

/**
 * Returns the effective role for dashboard rendering.
 * When admin is previewing a role, returns the previewed role.
 * Otherwise returns the actual user role from settings.
 *
 * @param mounted - Whether the component has mounted (for hydration safety)
 * @returns The effective role to use for rendering
 */
export function useEffectiveRole(mounted: boolean = true): Role {
  const { settings, isAdmin, adminModeEnabled, isPreviewingRole, previewedRole } = useAppStore()

  // During SSR or before mount, return default role
  if (!mounted) {
    return 'exec'
  }

  // Admin previewing a role
  if (isAdmin && adminModeEnabled && isPreviewingRole && previewedRole) {
    return previewedRole
  }

  // Normal case: return actual role
  return settings.role
}
