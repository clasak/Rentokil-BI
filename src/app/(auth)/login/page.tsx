"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Lock, AlertCircle, Loader2, BarChart3, Shield, Users, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type ViewMode = 'login' | 'forgot-password' | 'reset-sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('login')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Basic validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // First, try to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // If invalid credentials, could be new user OR existing magic link user
        if (signInError.message.includes('Invalid login credentials')) {
          // Try to sign up - this will set password for existing users or create new ones
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          })

          if (signUpError) {
            // If user already exists with different auth method
            if (signUpError.message.includes('User already registered')) {
              setError('Account exists with a different password. Use "Forgot Password" to reset.')
            } else {
              setError(signUpError.message)
            }
          } else if (signUpData.user) {
            // New account created successfully
            router.push('/onboarding')
          }
        } else {
          setError(signInError.message)
        }
      } else {
        router.push('/onboarding')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setViewMode('reset-sent')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderForm = () => {
    if (viewMode === 'reset-sent') {
      return (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Check your email
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            We sent a password reset link to<br />
            <strong className="text-gray-700 dark:text-gray-200">{email}</strong>
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setViewMode('login')
              setError(null)
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </div>
      )
    }

    if (viewMode === 'forgot-password') {
      return (
        <>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Reset your password
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@rentokil.com"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setViewMode('login')
                setError(null)
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Button>
          </form>
        </>
      )
    }

    // Default: login view
    return (
      <>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to Rentokil BI
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Sign in or create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@rentokil.com"
                className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setViewMode('forgot-password')
                  setError(null)
                }}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            New users will be automatically registered.
            <br />
            Use at least 6 characters for your password.
          </p>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 via-red-700 to-red-800 p-12 flex-col justify-center items-center relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white/20 rounded-full" />
          <div className="absolute bottom-40 right-10 w-96 h-96 border border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-white/20 rounded-full" />
        </div>

        <div className="relative z-10 text-center space-y-8">
          {/* Large Logo */}
          <div className="flex flex-col items-center gap-4">
            <img src="/rentokil-logo.svg" alt="Rentokil" className="h-24 brightness-0 invert" />
            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-lg px-4 py-1">
              ALPHA
            </Badge>
          </div>

          <p className="text-white text-2xl font-light">Business Intelligence Platform</p>

          {/* Feature highlights */}
          <div className="space-y-6 mt-12 text-left max-w-md">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Real-Time Analytics</h3>
                <p className="text-red-100 text-sm mt-1">
                  Monitor KPIs, revenue, and operational metrics
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Role-Based Dashboards</h3>
                <p className="text-red-100 text-sm mt-1">
                  Personalized views for every team member
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Data Governance</h3>
                <p className="text-red-100 text-sm mt-1">
                  Enterprise-grade security and audit trails
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <img src="/rentokil-logo.svg" alt="Rentokil" className="h-16" />
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              ALPHA
            </Badge>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {renderForm()}
          </div>
        </div>
      </div>
    </div>
  )
}
