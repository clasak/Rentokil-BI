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
      'sticky top-0 z-30 w-full',
      'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-600 dark:from-blue-800 dark:via-blue-900 dark:to-blue-800',
      'text-white border-b-2 border-blue-400 dark:border-blue-600',
      'flex items-center justify-between px-4 py-3 shadow-lg',
      'animate-in slide-in-from-top duration-300'
    )}>
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full animate-pulse">
          <Eye className="h-4 w-4" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="text-sm font-semibold">
            Previewing Role:
          </span>
          <span className="text-base font-bold bg-white/20 px-2 py-0.5 rounded">
            {roleLabel}
          </span>
        </div>
        <span className="text-xs text-blue-100 dark:text-blue-200 hidden md:inline ml-2">
          You are viewing the dashboard as this role would see it
        </span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={exitRolePreview}
        className="bg-white text-blue-700 hover:bg-blue-50 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900 gap-2 font-semibold shadow-md hover:shadow-lg transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Exit Preview</span>
        <X className="h-4 w-4 sm:hidden" />
      </Button>
    </div>
  )
}
