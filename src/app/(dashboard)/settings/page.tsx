"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, ROLE_PERMISSIONS } from '@/store'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings, Shield, User, Sun, Moon, Monitor, Bell, Mail, LogOut, Loader2 } from 'lucide-react'
import { Scenario } from '@/types'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const {
    settings,
    setScenario,
    theme,
    setTheme,
    getCurrentUserScope,
  } = useAppStore()

  const scope = getCurrentUserScope()

  // Load user info
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          setUserEmail(user.email)
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('name')
            .eq('id', user.id)
            .single()
          if (profile?.name) {
            setUserName(profile.name)
          } else {
            const stored = localStorage.getItem('user_profile')
            if (stored) {
              const parsed = JSON.parse(stored)
              setUserName(parsed.name)
            }
          }
        }
      } catch (e) {
        const stored = localStorage.getItem('user_profile')
        if (stored) {
          const parsed = JSON.parse(stored)
          setUserName(parsed.name)
          setUserEmail(parsed.email)
        }
      }
    }
    loadUser()
  }, [supabase])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      document.cookie = 'onboarding_complete=; path=/; max-age=0'
      localStorage.removeItem('user_profile')
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account and preferences</p>
        </div>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Profile
          </CardTitle>
          <CardDescription>
            Your account information and role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold dark:text-gray-100">{userName || 'User'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {ROLE_PERMISSIONS[settings.role]?.label || 'User'}
            </Badge>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Role</div>
              <div className="font-medium dark:text-gray-100">{ROLE_PERMISSIONS[settings.role]?.label}</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Data Access</div>
              <div className="font-medium dark:text-gray-100">{scope.markets.length} market(s)</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Scope</div>
              <div className="font-medium dark:text-gray-100">{scope.scope}</div>
            </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Contact your administrator if you need to change your role or access level.
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how the dashboard looks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium dark:text-gray-100">Theme</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose your preferred color scheme
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="gap-2"
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Forecast Preferences
          </CardTitle>
          <CardDescription>
            Set your default forecast scenario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium dark:text-gray-100">Default Scenario</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Used for forecast projections throughout the dashboard
              </p>
            </div>
            <div className="flex gap-2">
              {(['base', 'upside', 'downside'] as Scenario[]).map((scenario) => (
                <Button
                  key={scenario}
                  variant={settings.scenario === scenario ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScenario(scenario)}
                  className="capitalize"
                >
                  {scenario}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Manage your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium dark:text-gray-100">Email Alerts</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive email notifications for important KPI changes
              </p>
            </div>
            <Switch disabled />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium dark:text-gray-100">Weekly Digest</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get a weekly summary of your KPI performance
              </p>
            </div>
            <Switch disabled />
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Email notifications coming soon
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <LogOut className="h-5 w-5" />
            Sign Out
          </CardTitle>
          <CardDescription>
            Sign out of your account on this device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Version Info */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-4">
        Rentokil BI Platform • Alpha Version
      </div>
    </div>
  )
}
