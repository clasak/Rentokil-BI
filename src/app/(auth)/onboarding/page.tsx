"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Building2, TrendingUp, Truck, Users, UserCheck, Wrench,
  Briefcase, Crown, Loader2, CheckCircle, BookOpen
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Role } from '@/types'
import { useAppStore } from '@/store'

interface RoleOption {
  value: Role
  label: string
  description: string
  icon: typeof Building2
  color: string
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'exec',
    label: 'Executive',
    description: 'C-suite, VP level - cross-functional view of all metrics',
    icon: Crown,
    color: 'text-purple-600'
  },
  {
    value: 'market_director',
    label: 'Market Director',
    description: 'Oversees multiple regions within a market',
    icon: Building2,
    color: 'text-blue-600'
  },
  {
    value: 'region_director',
    label: 'Region Director',
    description: 'Manages branches within a region',
    icon: Users,
    color: 'text-indigo-600'
  },
  {
    value: 'manager',
    label: 'Branch Manager',
    description: 'Day-to-day branch operations and team management',
    icon: Briefcase,
    color: 'text-green-600'
  },
  {
    value: 'sales_manager',
    label: 'Sales Manager',
    description: 'Sales team leadership and pipeline management',
    icon: TrendingUp,
    color: 'text-cyan-600'
  },
  {
    value: 'ops_manager',
    label: 'Operations Manager',
    description: 'Service delivery and technician management',
    icon: Truck,
    color: 'text-orange-600'
  },
  {
    value: 'rep',
    label: 'Account Executive',
    description: 'Direct sales and account management',
    icon: UserCheck,
    color: 'text-teal-600'
  },
  {
    value: 'technician',
    label: 'Service Technician',
    description: 'Field service and customer visits',
    icon: Wrench,
    color: 'text-amber-600'
  },
]

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [startTutorial, setStartTutorial] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { setRole, setTutorialActive, setTutorialStep } = useAppStore()

  useEffect(() => {
    // Get the current user's email
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        // Pre-fill name from email if available
        const namePart = user.email.split('@')[0]
        const formattedName = namePart
          .split(/[._-]/)
          .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
        setName(formattedName)
      } else {
        // Not authenticated, redirect to login
        router.push('/login')
      }
    }
    getUser()
  }, [router, supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRole || !name.trim()) {
      setError('Please enter your name and select a role')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated. Please sign in again.')
        router.push('/login')
        return
      }

      // Save profile to Supabase
      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name: name.trim(),
          role: selectedRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (upsertError) {
        console.error('Profile save error:', upsertError)
        // If Supabase table doesn't exist yet, store locally and continue
        localStorage.setItem('user_profile', JSON.stringify({
          id: user.id,
          email: user.email,
          name: name.trim(),
          role: selectedRole,
        }))
      }

      // Set role in app store
      setRole(selectedRole)

      // Set onboarding complete cookie (1 year expiry)
      document.cookie = 'onboarding_complete=true; path=/; max-age=31536000'

      // Start tutorial if user opted in
      if (startTutorial) {
        setTutorialStep(0)
        setTutorialActive(true)
      }

      // Redirect to main dashboard
      router.push('/')
    } catch (err) {
      console.error('Onboarding error:', err)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/rentokil-logo.svg" alt="Rentokil" className="h-12" />
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              ALPHA
            </Badge>
          </div>
          <CardTitle className="text-2xl">Welcome! Select your role</CardTitle>
          <CardDescription>
            {userEmail && (
              <span>Signed in as <strong>{userEmail}</strong></span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="text-sm font-medium block mb-2">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:border-gray-700"
                disabled={loading}
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="text-sm font-medium block mb-3">
                Select Your Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((role) => {
                  const Icon = role.icon
                  const isSelected = selectedRole === role.value

                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value)}
                      disabled={loading}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${role.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{role.label}</span>
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {role.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tutorial Option */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <div className="font-medium text-sm text-blue-900 dark:text-blue-100">Start with a guided tour</div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Learn how to use your dashboard step by step
                  </p>
                </div>
              </div>
              <Switch
                checked={startTutorial}
                onCheckedChange={setStartTutorial}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !selectedRole || !name.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : startTutorial ? (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Start Tutorial
                </>
              ) : (
                'Continue to Dashboard'
              )}
            </Button>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Your role determines which dashboard view you&apos;ll see.
              <br />
              You can restart the tutorial anytime from Settings.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
