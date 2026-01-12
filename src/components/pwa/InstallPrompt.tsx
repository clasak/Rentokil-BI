"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Download, Share, Plus, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_STORAGE_KEY = 'pwa-prompt-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error - Safari specific
      window.navigator.standalone === true
    setIsStandalone(standalone)

    if (standalone) {
      return // Already installed, don't show prompt
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    setIsIOS(iOS)

    // Check if we should show prompt based on dismissal
    const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY)
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      if (Date.now() - dismissedTime < DISMISS_DURATION_MS) {
        return // Still within dismiss period
      }
    }

    // Listen for beforeinstallprompt event (Chrome/Edge/Samsung)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show prompt after 30 seconds of engagement
      setTimeout(() => {
        setShowPrompt(true)
      }, 30000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // For iOS, show prompt after 30 seconds
    if (iOS) {
      setTimeout(() => {
        setShowPrompt(true)
      }, 30000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install prompt')
      setDeferredPrompt(null)
    } else {
      console.log('[PWA] User dismissed install prompt')
    }

    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString())
  }

  // Don't render if already installed
  if (isStandalone) {
    return null
  }

  // Don't show if not ready
  if (!showPrompt) {
    return null
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <span>Install Rentokil BI</span>
          </DialogTitle>
          <DialogDescription>
            Get quick access to your dashboard with offline support and push notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits list */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-xs">
                1
              </span>
              <span>Quick launch from home screen</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-xs">
                2
              </span>
              <span>View cached data offline</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-xs">
                3
              </span>
              <span>Receive KPI alerts via push notifications</span>
            </div>
          </div>

          {isIOS ? (
            /* iOS-specific instructions */
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                To install on iOS:
              </p>
              <ol className="list-none space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Share className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>
                    Tap the <strong>Share</strong> button in Safari
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Plus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 dark:text-green-400 text-xs font-bold">
                      ✓
                    </span>
                  </div>
                  <span>
                    Tap <strong>Add</strong> to confirm
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            /* Standard install button */
            <div className="flex gap-3">
              <Button
                onClick={handleInstall}
                className="flex-1 h-12"
                disabled={!deferredPrompt}
              >
                <Download className="h-4 w-4 mr-2" />
                Install App
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="h-12"
              >
                Not Now
              </Button>
            </div>
          )}

          {isIOS && (
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="w-full h-12"
            >
              <X className="h-4 w-4 mr-2" />
              Maybe Later
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
