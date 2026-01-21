"use client"

import { useEffect, useState, useCallback } from 'react'
import { getPlatform, isNative, Platform } from '@/lib/platform'

/**
 * Hook for initializing and managing native app features
 *
 * This hook:
 * - Detects the current platform (web/ios/android)
 * - Initializes Capacitor plugins when running natively
 * - Handles splash screen, status bar, keyboard, and back button
 *
 * Note: Capacitor plugins are dynamically imported when running natively.
 * The hook works without Capacitor installed - it just returns web mode.
 *
 * Usage:
 *   const { platform, isNative, ready } = useNativeApp()
 *
 *   if (!ready) return <LoadingScreen />
 *   if (isNative) {
 *     // Show native-specific UI
 *   }
 */

interface NativeAppState {
  platform: Platform
  isNative: boolean
  ready: boolean
  error: Error | null
}

// Helper to dynamically import Capacitor modules
// Returns undefined if the module isn't available
async function tryImport<T>(modulePath: string): Promise<T | undefined> {
  try {
    return await import(/* webpackIgnore: true */ modulePath)
  } catch {
    return undefined
  }
}

export function useNativeApp(): NativeAppState {
  const [state, setState] = useState<NativeAppState>({
    platform: 'web',
    isNative: false,
    ready: false,
    error: null,
  })

  useEffect(() => {
    const platform = getPlatform()
    const native = isNative()

    // Initialize native plugins when running in Capacitor
    const initNative = async () => {
      // Web mode - ready immediately
      if (!native) {
        setState({
          platform,
          isNative: native,
          ready: true,
          error: null,
        })
        return
      }

      try {
        // Dynamic imports - only load when native
        // These will fail gracefully if Capacitor isn't installed

        // Hide splash screen after app loads
        const splashModule = await tryImport<{
          SplashScreen: { hide: () => Promise<void> }
        }>('@capacitor/splash-screen')
        if (splashModule) {
          await splashModule.SplashScreen.hide()
        }

        // Configure status bar
        const statusBarModule = await tryImport<{
          StatusBar: {
            setStyle: (opts: { style: string }) => Promise<void>
            setBackgroundColor: (opts: { color: string }) => Promise<void>
          }
          Style: { Light: string }
        }>('@capacitor/status-bar')
        if (statusBarModule) {
          await statusBarModule.StatusBar.setStyle({ style: statusBarModule.Style.Light })
          await statusBarModule.StatusBar.setBackgroundColor({ color: '#E4002B' })
        }

        // Handle keyboard events (iOS)
        const keyboardModule = await tryImport<{
          Keyboard: {
            addListener: (event: string, callback: () => void) => void
          }
        }>('@capacitor/keyboard')
        if (keyboardModule) {
          keyboardModule.Keyboard.addListener('keyboardWillShow', () => {
            document.body.classList.add('keyboard-open')
          })
          keyboardModule.Keyboard.addListener('keyboardWillHide', () => {
            document.body.classList.remove('keyboard-open')
          })
        }

        // Handle back button (Android)
        const appModule = await tryImport<{
          App: {
            addListener: (
              event: string,
              callback: (data: { canGoBack: boolean }) => void
            ) => void
            exitApp: () => void
          }
        }>('@capacitor/app')
        if (appModule) {
          appModule.App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
              window.history.back()
            } else {
              appModule.App.exitApp()
            }
          })
        }

        setState({
          platform,
          isNative: native,
          ready: true,
          error: null,
        })
      } catch (error) {
        console.error('[Native] Init error:', error)
        setState({
          platform,
          isNative: native,
          ready: true,
          error: error instanceof Error ? error : new Error('Unknown error'),
        })
      }
    }

    initNative()
  }, [])

  return state
}

/**
 * Hook for handling app lifecycle events in native apps
 *
 * Usage:
 *   useAppLifecycle({
 *     onResume: () => refetchData(),
 *     onPause: () => saveState(),
 *   })
 */
interface AppLifecycleCallbacks {
  onResume?: () => void
  onPause?: () => void
  onStateChange?: (isActive: boolean) => void
}

export function useAppLifecycle(callbacks: AppLifecycleCallbacks) {
  const { onResume, onPause, onStateChange } = callbacks

  useEffect(() => {
    if (!isNative()) return

    let cleanup: (() => void) | undefined

    const setupListeners = async () => {
      const appModule = await tryImport<{
        App: {
          addListener: (
            event: string,
            callback: (data: { isActive: boolean }) => void
          ) => Promise<{ remove: () => void }>
        }
      }>('@capacitor/app')

      if (!appModule) return

      const listener = await appModule.App.addListener(
        'appStateChange',
        ({ isActive }) => {
          onStateChange?.(isActive)
          if (isActive) {
            onResume?.()
          } else {
            onPause?.()
          }
        }
      )

      cleanup = () => listener.remove()
    }

    setupListeners()

    return () => {
      cleanup?.()
    }
  }, [onResume, onPause, onStateChange])
}

/**
 * Hook for hiding the splash screen manually
 * Useful when you want to control exactly when the splash hides
 */
export function useSplashScreen() {
  const hide = useCallback(async () => {
    if (!isNative()) return

    const splashModule = await tryImport<{
      SplashScreen: { hide: () => Promise<void> }
    }>('@capacitor/splash-screen')

    if (splashModule) {
      await splashModule.SplashScreen.hide()
    }
  }, [])

  const show = useCallback(async () => {
    if (!isNative()) return

    const splashModule = await tryImport<{
      SplashScreen: { show: () => Promise<void> }
    }>('@capacitor/splash-screen')

    if (splashModule) {
      await splashModule.SplashScreen.show()
    }
  }, [])

  return { hide, show }
}
