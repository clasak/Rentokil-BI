/**
 * Platform Detection Utility
 *
 * Detects whether the app is running as:
 * - 'web': Standard web browser (PWA or regular)
 * - 'ios': Native iOS app via Capacitor
 * - 'android': Native Android app via Capacitor
 *
 * Usage:
 *   import { getPlatform, isNative, isWeb } from '@/lib/platform'
 *
 *   if (isNative()) {
 *     // Use native APIs
 *   } else {
 *     // Use web APIs
 *   }
 */

export type Platform = 'web' | 'ios' | 'android'

// Capacitor global type declaration
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean
      getPlatform?: () => string
      isPluginAvailable?: (name: string) => boolean
    }
  }
}

/**
 * Get the current platform
 * @returns 'web' | 'ios' | 'android'
 */
export function getPlatform(): Platform {
  // Server-side rendering check
  if (typeof window === 'undefined') {
    return 'web'
  }

  // Check for Capacitor native platform
  // Capacitor injects these globals when running natively
  try {
    if (window.Capacitor?.isNativePlatform?.()) {
      const platform = window.Capacitor.getPlatform?.()
      if (platform === 'ios') return 'ios'
      if (platform === 'android') return 'android'
    }
  } catch {
    // Capacitor not available
  }

  return 'web'
}

/**
 * Check if running in a native app (iOS or Android)
 */
export function isNative(): boolean {
  return getPlatform() !== 'web'
}

/**
 * Check if running in a web browser
 */
export function isWeb(): boolean {
  return getPlatform() === 'web'
}

/**
 * Check if running on iOS (native or Safari)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false

  // Check native iOS first
  if (getPlatform() === 'ios') return true

  // Check Safari on iOS
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent) && !('MSStream' in window)
}

/**
 * Check if running on Android (native or Chrome)
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false

  // Check native Android first
  if (getPlatform() === 'android') return true

  // Check Android browser
  const userAgent = window.navigator.userAgent.toLowerCase()
  return /android/.test(userAgent)
}

/**
 * Check if a Capacitor plugin is available
 * @param pluginName The name of the plugin (e.g., 'PushNotifications')
 */
export function isPluginAvailable(pluginName: string): boolean {
  if (typeof window === 'undefined') return false
  return window.Capacitor?.isPluginAvailable?.(pluginName) ?? false
}

/**
 * Check if running in standalone mode (installed PWA or native app)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false

  // Native apps are always "standalone"
  if (isNative()) return true

  // Check PWA standalone mode
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches
  // Safari-specific check
  const isSafariStandalone = (window.navigator as { standalone?: boolean }).standalone === true

  return isStandaloneMedia || isSafariStandalone
}
