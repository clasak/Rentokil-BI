// Service Worker Registration Utility

export interface ServiceWorkerStatus {
  isSupported: boolean
  isRegistered: boolean
  isUpdateAvailable: boolean
  registration: ServiceWorkerRegistration | null
}

let swRegistration: ServiceWorkerRegistration | null = null

/**
 * Register the service worker
 * Should be called on app mount
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return null
  }

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported')
    return null
  }

  try {
    // Register the service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })

    swRegistration = registration
    console.log('[PWA] Service worker registered:', registration.scope)

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing

      if (newWorker) {
        console.log('[PWA] New service worker installing...')

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content available - dispatch event for UI to handle
              console.log('[PWA] New content available')
              window.dispatchEvent(new CustomEvent('sw-update-available', {
                detail: { registration }
              }))
            } else {
              // First install - content cached for offline
              console.log('[PWA] Content cached for offline use')
              window.dispatchEvent(new CustomEvent('sw-cached', {
                detail: { registration }
              }))
            }
          }
        })
      }
    })

    // Check for updates periodically (every hour)
    setInterval(() => {
      registration.update()
    }, 60 * 60 * 1000)

    return registration
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error)
    return null
  }
}

/**
 * Get the current service worker registration
 */
export function getRegistration(): ServiceWorkerRegistration | null {
  return swRegistration
}

/**
 * Check if there's a waiting service worker
 */
export function hasWaitingWorker(): boolean {
  return swRegistration?.waiting !== null && swRegistration?.waiting !== undefined
}

/**
 * Skip waiting and activate new service worker
 */
export async function skipWaiting(): Promise<void> {
  if (!swRegistration?.waiting) {
    return
  }

  // Tell the waiting service worker to skip waiting
  swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })

  // Wait for the new service worker to take control
  return new Promise((resolve) => {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      resolve()
    }, { once: true })
  })
}

/**
 * Get service worker status
 */
export function getStatus(): ServiceWorkerStatus {
  return {
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
    isRegistered: swRegistration !== null,
    isUpdateAvailable: hasWaitingWorker(),
    registration: swRegistration,
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(r => r.unregister()))
    swRegistration = null
    console.log('[PWA] Service workers unregistered')
    return true
  } catch (error) {
    console.error('[PWA] Failed to unregister service workers:', error)
    return false
  }
}

/**
 * Clear all service worker caches
 */
export async function clearCaches(): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return false
  }

  try {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(name => caches.delete(name)))
    console.log('[PWA] All caches cleared')
    return true
  } catch (error) {
    console.error('[PWA] Failed to clear caches:', error)
    return false
  }
}
