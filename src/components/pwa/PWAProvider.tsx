"use client"

import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { registerServiceWorker, skipWaiting, getStatus } from '@/lib/pwa/register-sw'
import { offlineStorage } from '@/lib/pwa/offline-storage'
// InstallPrompt removed - using native app stores instead
// import { InstallPrompt } from './InstallPrompt'
import { OfflineBanner } from './OfflineBanner'
import { Button } from '@/components/ui/button'
import { RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PWAContextValue {
  isInstalled: boolean
  isOnline: boolean
  hasUpdate: boolean
  applyUpdate: () => Promise<void>
}

const PWAContext = createContext<PWAContextValue>({
  isInstalled: false,
  isOnline: true,
  hasUpdate: false,
  applyUpdate: async () => {},
})

export function usePWA() {
  return useContext(PWAContext)
}

interface PWAProviderProps {
  children: ReactNode
}

/**
 * PWA Provider Component
 *
 * Handles:
 * - Service worker registration
 * - Update notifications
 * - Install prompt
 * - Offline banner
 * - Offline storage initialization
 */
export function PWAProvider({ children }: PWAProviderProps) {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)

  // Initialize PWA features
  useEffect(() => {
    // Check if installed (standalone mode)
    const checkInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error - Safari specific
        window.navigator.standalone === true
      setIsInstalled(standalone)
    }
    checkInstalled()

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', checkInstalled)

    // Initialize offline storage
    offlineStorage.init().catch(err => {
      console.error('[PWAProvider] Failed to init offline storage:', err)
    })

    // Register service worker
    registerServiceWorker().catch(err => {
      console.error('[PWAProvider] Failed to register SW:', err)
    })

    // Listen for SW updates
    const handleUpdateAvailable = () => {
      console.log('[PWAProvider] Update available')
      setHasUpdate(true)
      setShowUpdateBanner(true)
    }

    window.addEventListener('sw-update-available', handleUpdateAvailable)

    // Online/offline status
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      mediaQuery.removeEventListener('change', checkInstalled)
      window.removeEventListener('sw-update-available', handleUpdateAvailable)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Apply update (skip waiting and reload)
  const applyUpdate = async () => {
    try {
      await skipWaiting()
      window.location.reload()
    } catch (error) {
      console.error('[PWAProvider] Failed to apply update:', error)
    }
  }

  const contextValue: PWAContextValue = {
    isInstalled,
    isOnline,
    hasUpdate,
    applyUpdate,
  }

  return (
    <PWAContext.Provider value={contextValue}>
      {children}

      {/* Update available banner */}
      {showUpdateBanner && (
        <div
          className={cn(
            "fixed bottom-20 lg:bottom-4 left-4 right-4 z-50",
            "max-w-md mx-auto",
            "bg-primary text-white rounded-lg shadow-lg",
            "p-4",
            "animate-in slide-in-from-bottom-4"
          )}
        >
          <div className="flex items-start gap-3">
            <RefreshCw className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Update available</p>
              <p className="text-sm text-white/80 mt-0.5">
                A new version is ready. Refresh to update.
              </p>
            </div>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="text-white/60 hover:text-white p-1 -m-1"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={applyUpdate}
              className="flex-1 bg-white text-primary hover:bg-white/90"
            >
              Refresh Now
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUpdateBanner(false)}
              className="text-white hover:text-white hover:bg-white/20"
            >
              Later
            </Button>
          </div>
        </div>
      )}

      {/* Install prompt removed - using native app stores instead */}

      {/* Offline banner */}
      <OfflineBanner />
    </PWAContext.Provider>
  )
}
