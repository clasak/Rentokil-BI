// Push Notification Service for Rentokil BI

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported'

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus(): NotificationPermissionStatus {
  if (!('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission as NotificationPermissionStatus
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!('Notification' in window)) {
    console.log('[Push] Notifications not supported')
    return 'unsupported'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission as NotificationPermissionStatus
  }

  return Notification.permission as NotificationPermissionStatus
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!isPushSupported()) {
    console.log('[Push] Push notifications not supported')
    return null
  }

  try {
    // Request permission first
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      console.log('[Push] Permission not granted:', permission)
      return null
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Create new subscription
      if (!VAPID_PUBLIC_KEY) {
        console.warn('[Push] VAPID public key not configured')
        return null
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const subscriptionJson = subscription.toJSON()

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscriptionJson.keys?.p256dh || '',
        auth: subscriptionJson.keys?.auth || '',
      },
    }
  } catch (error) {
    console.error('[Push] Failed to subscribe:', error)
    return null
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      console.log('[Push] Unsubscribed successfully')
      return true
    }

    return false
  } catch (error) {
    console.error('[Push] Failed to unsubscribe:', error)
    return false
  }
}

/**
 * Check if currently subscribed to push
 */
export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch {
    return false
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

/**
 * Send subscription to server
 */
export async function saveSubscriptionToServer(subscription: PushSubscriptionData): Promise<boolean> {
  try {
    const response = await fetch('/api/push-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    })

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`)
    }

    console.log('[Push] Subscription saved to server')
    return true
  } catch (error) {
    console.error('[Push] Failed to save subscription:', error)
    return false
  }
}

/**
 * Remove subscription from server
 */
export async function removeSubscriptionFromServer(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch('/api/push-subscription', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`)
    }

    console.log('[Push] Subscription removed from server')
    return true
  } catch (error) {
    console.error('[Push] Failed to remove subscription:', error)
    return false
  }
}

/**
 * Show a local notification (for testing)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isPushSupported()) {
    console.log('[Push] Notifications not supported')
    return
  }

  const permission = getPermissionStatus()
  if (permission !== 'granted') {
    console.log('[Push] Permission not granted')
    return
  }

  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title, {
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/badge-72x72.svg',
    ...options,
  })
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert URL-safe base64 to Uint8Array
 * Required for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

// ============================================
// NOTIFICATION CATEGORY TYPES
// ============================================

export interface NotificationCategory {
  id: string
  name: string
  description: string
  enabled: boolean
}

export const DEFAULT_NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: 'kpi_alerts',
    name: 'KPI Alerts',
    description: 'Critical threshold breaches and KPI anomalies',
    enabled: true,
  },
  {
    id: 'daily_summary',
    name: 'Daily Summary',
    description: 'Daily performance digest at end of day',
    enabled: true,
  },
  {
    id: 'assignments',
    name: 'Task Assignments',
    description: 'New tasks, schedule changes, or service tickets',
    enabled: true,
  },
  {
    id: 'approvals',
    name: 'Approval Requests',
    description: 'Items requiring your review or approval',
    enabled: true,
  },
  {
    id: 'reconciliation',
    name: 'Reconciliation',
    description: 'Data reconciliation alerts and fixes',
    enabled: false,
  },
]

const NOTIFICATION_PREFS_KEY = 'notification_preferences'

/**
 * Get notification preferences from localStorage
 */
export function getNotificationPreferences(): NotificationCategory[] {
  if (typeof window === 'undefined') {
    return DEFAULT_NOTIFICATION_CATEGORIES
  }

  try {
    const saved = localStorage.getItem(NOTIFICATION_PREFS_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignore parse errors
  }

  return DEFAULT_NOTIFICATION_CATEGORIES
}

/**
 * Save notification preferences to localStorage
 */
export function saveNotificationPreferences(categories: NotificationCategory[]): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(categories))
  } catch (error) {
    console.error('[Push] Failed to save preferences:', error)
  }
}
