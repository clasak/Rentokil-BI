"use client"

import { useState, useEffect, useCallback } from 'react'
import { offlineStorage } from '@/lib/pwa/offline-storage'

interface OnlineStatusState {
  isOnline: boolean
  pendingActionsCount: number
  lastOnline: Date | null
  isSyncing: boolean
}

/**
 * Hook to track online/offline status and pending actions
 */
export function useOnlineStatus() {
  const [state, setState] = useState<OnlineStatusState>({
    isOnline: true,
    pendingActionsCount: 0,
    lastOnline: null,
    isSyncing: false,
  })

  // Update pending actions count
  const updatePendingCount = useCallback(async () => {
    try {
      const actions = await offlineStorage.getPendingActions()
      setState(prev => ({ ...prev, pendingActionsCount: actions.length }))
    } catch (error) {
      console.error('[useOnlineStatus] Failed to get pending actions:', error)
    }
  }, [])

  // Sync offline actions when back online
  const syncOfflineActions = useCallback(async () => {
    setState(prev => ({ ...prev, isSyncing: true }))

    try {
      const actions = await offlineStorage.getPendingActions()

      for (const action of actions) {
        try {
          // Attempt to replay the action
          const response = await fetch(action.endpoint, {
            method: action.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: action.body ? JSON.stringify(action.body) : undefined,
          })

          if (response.ok) {
            // Mark as synced
            await offlineStorage.markActionSynced(action.id!)
          } else {
            // Increment retry count
            const retryCount = await offlineStorage.incrementRetryCount(action.id!)
            if (retryCount >= 3) {
              // Remove after 3 failed attempts
              await offlineStorage.deleteAction(action.id!)
              console.warn('[useOnlineStatus] Action deleted after 3 retries:', action)
            }
          }
        } catch (error) {
          console.error('[useOnlineStatus] Failed to sync action:', action, error)
          await offlineStorage.incrementRetryCount(action.id!)
        }
      }

      // Clear synced actions
      await offlineStorage.clearSyncedActions()

      // Update count
      await updatePendingCount()
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }))
    }
  }, [updatePendingCount])

  // Queue an action for offline sync
  const queueOfflineAction = useCallback(async (action: {
    type: string
    endpoint: string
    method: string
    body?: unknown
  }) => {
    await offlineStorage.queueAction(action)
    await updatePendingCount()
  }, [updatePendingCount])

  useEffect(() => {
    // Set initial online status
    setState(prev => ({
      ...prev,
      isOnline: navigator.onLine,
      lastOnline: navigator.onLine ? new Date() : prev.lastOnline,
    }))

    // Initialize offline storage and get pending count
    offlineStorage.init().then(() => {
      updatePendingCount()
    })

    // Online handler
    const handleOnline = () => {
      console.log('[useOnlineStatus] Back online')
      setState(prev => ({
        ...prev,
        isOnline: true,
        lastOnline: new Date(),
      }))

      // Trigger background sync if supported
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          if ('sync' in registration) {
            (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
              .sync.register('sync-offline-actions')
              .catch(err => console.log('[useOnlineStatus] Background sync registration failed:', err))
          }
        })
      }

      // Also sync directly
      syncOfflineActions()
    }

    // Offline handler
    const handleOffline = () => {
      console.log('[useOnlineStatus] Gone offline')
      setState(prev => ({
        ...prev,
        isOnline: false,
      }))
    }

    // Listen for sync complete message from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        console.log('[useOnlineStatus] Sync complete from service worker')
        updatePendingCount()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage)
      }
    }
  }, [syncOfflineActions, updatePendingCount])

  return {
    isOnline: state.isOnline,
    pendingActionsCount: state.pendingActionsCount,
    lastOnline: state.lastOnline,
    isSyncing: state.isSyncing,
    queueOfflineAction,
    syncNow: syncOfflineActions,
    refreshPendingCount: updatePendingCount,
  }
}
