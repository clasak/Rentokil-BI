"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2, TrendingUp, Truck, Users, UserCheck, Wrench,
  Briefcase, Crown, Loader2, CheckCircle
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

const DEPARTMENTS = [
  'Operations',
  'Sales',
  'Finance',
  'Marketing',
  'IT',
  'HR',
  'Executive',
  'Other'
]

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { setRole } = useAppStore()

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

    if (!selectedRole || !name.trim() || !department) {
      setError('Please fill in all fields')
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
          department,
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
          department,
        }))
      }

      // Set role in app store
      setRole(selectedRole)

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
            <img src="/rentokil-logo.svg" alt="Rentokil" className="h-8" />
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              ALPHA
            </Badge>
          </div>
          <CardTitle className="text-2xl">Welcome! Let&apos;s set up your profile</CardTitle>
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

            {/* Department */}
            <div>
              <label className="text-sm font-medium block mb-2">
                Your Department
              </label>
              <Select value={department} onValueChange={setDepartment} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Selection */}
            <div>
              <label className="text-sm font-medium block mb-3">
                Your Role
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

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !selectedRole || !name.trim() || !department}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Continue to Dashboard'
              )}
            </Button>

            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Your role selection will be verified by the admin team.
              <br />
              You can change your role later from the header dropdown.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
