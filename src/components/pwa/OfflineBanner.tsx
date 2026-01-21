"use client"

import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OfflineBanner() {
  const { isOnline, pendingActionsCount, isSyncing } = useOnlineStatus()

  // Don't show if online and no pending actions
  if (isOnline && pendingActionsCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div
      className={cn(
        // Positioning
        "fixed top-0 left-0 right-0 z-[100]",
        // Safe area padding for notched devices
        "pt-safe",
        // Padding and text
        "px-4 py-2 text-center text-sm font-medium",
        // Animation
        "transition-all duration-300 transform",
        // Colors based on status
        isOnline
          ? isSyncing
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
          : "bg-gray-800 text-white dark:bg-gray-900"
      )}
      role="status"
      aria-live="polite"
    >
      {!isOnline ? (
        // Offline state
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>
            You&apos;re offline
            {pendingActionsCount > 0 && (
              <> &mdash; {pendingActionsCount} change{pendingActionsCount !== 1 ? 's' : ''} will sync when connected</>
            )}
          </span>
        </span>
      ) : isSyncing ? (
        // Syncing state
        <span className="flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing your changes...</span>
        </span>
      ) : pendingActionsCount > 0 ? (
        // Online but has pending actions (shouldn't happen often)
        <span className="flex items-center justify-center gap-2">
          <Cloud className="h-4 w-4" />
          <span>
            {pendingActionsCount} pending change{pendingActionsCount !== 1 ? 's' : ''} waiting to sync
          </span>
        </span>
      ) : null}
    </div>
  )
}

/**
 * Compact offline indicator for header/status bar
 */
export function OfflineIndicator() {
  const { isOnline, pendingActionsCount, isSyncing } = useOnlineStatus()

  if (isOnline && pendingActionsCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        isOnline
          ? isSyncing
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
          : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
      )}
      title={
        !isOnline
          ? `Offline${pendingActionsCount > 0 ? ` - ${pendingActionsCount} pending` : ''}`
          : isSyncing
            ? 'Syncing...'
            : `${pendingActionsCount} pending`
      }
    >
      {!isOnline ? (
        <>
          <CloudOff className="h-3 w-3" />
          <span>Offline</span>
          {pendingActionsCount > 0 && (
            <span className="ml-0.5 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full px-1.5 py-0.5 text-[10px]">
              {pendingActionsCount}
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Syncing</span>
        </>
      ) : (
        <>
          <Cloud className="h-3 w-3" />
          <span>{pendingActionsCount}</span>
        </>
      )}
    </div>
  )
}
