"use client"

import { useState, useEffect } from 'react'
import { Bell, BellOff, AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  isPushSupported,
  getPermissionStatus,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  saveSubscriptionToServer,
  removeSubscriptionFromServer,
  getPushSubscription,
  getNotificationPreferences,
  saveNotificationPreferences,
  showLocalNotification,
  NotificationCategory,
  NotificationPermissionStatus,
} from '@/lib/pwa/push-notifications'

export function NotificationPreferences() {
  const [isSupported, setIsSupported] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<NotificationCategory[]>([])
  const { toast } = useToast()

  // Initialize state
  useEffect(() => {
    setIsSupported(isPushSupported())
    setPermissionStatus(getPermissionStatus())
    setCategories(getNotificationPreferences())

    // Check subscription status
    isSubscribedToPush().then(setIsSubscribed)
  }, [])

  // Handle enable notifications
  const handleEnableNotifications = async () => {
    setIsLoading(true)

    try {
      // Request permission
      const permission = await requestNotificationPermission()
      setPermissionStatus(permission)

      if (permission !== 'granted') {
        toast({
          variant: 'error',
          title: 'Permission denied',
          description: 'Please enable notifications in your browser settings',
        })
        return
      }

      // Subscribe to push
      const subscription = await subscribeToPush()

      if (subscription) {
        // Save to server
        const saved = await saveSubscriptionToServer(subscription)

        if (saved) {
          setIsSubscribed(true)
          toast({
            title: 'Notifications enabled',
            description: 'You will now receive push notifications',
          })
        } else {
          toast({
            variant: 'error',
            title: 'Failed to save',
            description: 'Could not save notification preferences to server',
          })
        }
      }
    } catch (error) {
      console.error('[NotificationPreferences] Enable failed:', error)
      toast({
        variant: 'error',
        title: 'Error',
        description: 'Failed to enable notifications',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle disable notifications
  const handleDisableNotifications = async () => {
    setIsLoading(true)

    try {
      // Get current subscription to remove from server
      const subscription = await getPushSubscription()

      if (subscription) {
        await removeSubscriptionFromServer(subscription.endpoint)
      }

      // Unsubscribe
      const success = await unsubscribeFromPush()

      if (success) {
        setIsSubscribed(false)
        toast({
          title: 'Notifications disabled',
          description: 'You will no longer receive push notifications',
        })
      }
    } catch (error) {
      console.error('[NotificationPreferences] Disable failed:', error)
      toast({
        variant: 'error',
        title: 'Error',
        description: 'Failed to disable notifications',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle category toggle
  const handleCategoryToggle = (categoryId: string) => {
    const updated = categories.map(c =>
      c.id === categoryId ? { ...c, enabled: !c.enabled } : c
    )
    setCategories(updated)
    saveNotificationPreferences(updated)
  }

  // Send test notification
  const handleTestNotification = async () => {
    try {
      await showLocalNotification('Test Notification', {
        body: 'This is a test notification from Rentokil BI',
        tag: 'test',
      })
      toast({
        title: 'Test notification sent',
        description: 'Check your notification tray',
      })
    } catch (error) {
      console.error('[NotificationPreferences] Test failed:', error)
      toast({
        variant: 'error',
        title: 'Error',
        description: 'Failed to send test notification',
      })
    }
  }

  // Not supported state
  if (!isSupported) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <BellOff className="h-5 w-5" />
            <div>
              <p className="font-medium">Push notifications not available</p>
              <p className="text-sm">Your browser or device does not support push notifications</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Permission denied state
  if (permissionStatus === 'denied') {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start gap-3 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">Notifications blocked</p>
              <p className="text-sm mt-1">
                You have blocked notifications for this site. To enable them:
              </p>
              <ol className="text-sm mt-2 list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li>Click the lock/info icon in your browser address bar</li>
                <li>Find &quot;Notifications&quot; in the permissions</li>
                <li>Change from &quot;Block&quot; to &quot;Allow&quot;</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive alerts about KPI changes, task assignments, and more
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Enable Notifications</Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Receive important updates even when the app is closed
            </p>
          </div>
          {isSubscribed ? (
            <Button
              variant="outline"
              onClick={handleDisableNotifications}
              disabled={isLoading}
            >
              {isLoading ? 'Disabling...' : 'Disable'}
            </Button>
          ) : (
            <Button
              onClick={handleEnableNotifications}
              disabled={isLoading}
            >
              {isLoading ? 'Enabling...' : 'Enable'}
            </Button>
          )}
        </div>

        {/* Category toggles - only show if subscribed */}
        {isSubscribed && (
          <>
            <div className="border-t dark:border-gray-700 pt-6">
              <Label className="text-sm text-gray-500 dark:text-gray-400 mb-4 block">
                Notification Types
              </Label>

              <div className="space-y-4">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <Label
                        htmlFor={category.id}
                        className="font-medium cursor-pointer"
                      >
                        {category.name}
                      </Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {category.description}
                      </p>
                    </div>
                    <Switch
                      id={category.id}
                      checked={category.enabled}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Test notification button */}
            <div className="border-t dark:border-gray-700 pt-6">
              <Button
                variant="outline"
                onClick={handleTestNotification}
                className="w-full sm:w-auto"
              >
                Send Test Notification
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
