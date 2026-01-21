"use client"

import { useState, useEffect } from 'react'
import { useAppStore, ROLE_PERMISSIONS } from '@/store'
import { Eye, X, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * RolePreviewBanner displays when an admin is previewing a role dashboard.
 * Shows which role is being previewed and provides an "Exit Preview" button.
 */
export function RolePreviewBanner() {
  const [isClient, setIsClient] = useState(false)
  const { isAdmin, adminModeEnabled, isPreviewingRole, previewedRole, exitRolePreview } = useAppStore()

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Don't render on SSR or when not previewing
  if (!isClient || !isAdmin || !adminModeEnabled || !isPreviewingRole || !previewedRole) {
    return null
  }

  const roleLabel = ROLE_PERMISSIONS[previewedRole]?.label || previewedRole

  return (
    <div className={cn(
      'sticky top-0 z-30 w-full bg-blue-600 dark:bg-blue-800 text-white',
      'flex items-center justify-between px-4 py-2 shadow-md'
    )}>
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium">
          Previewing: <span className="font-bold">{roleLabel}</span>
        </span>
        <span className="text-xs text-blue-200 dark:text-blue-300 hidden sm:inline">
          You are viewing the dashboard as this role would see it
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={exitRolePreview}
        className="text-white hover:bg-blue-700 dark:hover:bg-blue-900 gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Exit Preview</span>
        <X className="h-4 w-4 sm:hidden" />
      </Button>
    </div>
  )
}
