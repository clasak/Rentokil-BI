"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Lock, AlertCircle, Loader2, BarChart3, Shield, Users, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logLoginSuccess, logLoginFailure, logPasswordReset } from '@/lib/security-logger'
import { detectSSOProvider, isAllowedDomain, type SSOProviderConfig } from '@/lib/sso-config'

type ViewMode = 'login' | 'signup' | 'forgot-password' | 'reset-sent' | 'sso-detected'

// Log login events to ops_events table for tracking
async function logLoginEvent(
  supabase: SupabaseClient,
  email: string,
  eventType: 'login' | 'signup' | 'sso'
) {
  try {
    await supabase.from('ops_events').insert({
      source: 'auth',
      event_type: eventType,
      severity: 'info',
      message: `User ${eventType}: ${email}`,
      metadata: {
        email,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      },
    })
  } catch (err) {
    console.log('Failed to log login event:', err)
  }
}

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('login')
  const [detectedProvider, setDetectedProvider] = useState<SSOProviderConfig | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check for error params from SSO callback
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')
    if (errorParam) {
      setError(messageParam || `Authentication error: ${errorParam}`)
    }
  }, [searchParams])

  // Detect SSO provider when email changes
  useEffect(() => {
    if (email && email.includes('@')) {
      const provider = detectSSOProvider(email)
      setDetectedProvider(provider)

      // Auto-switch to SSO view if provider detected
      if (provider && viewMode === 'login') {
        setViewMode('sso-detected')
      }
    } else {
      setDetectedProvider(null)
      if (viewMode === 'sso-detected') {
        setViewMode('login')
      }
    }
  }, [email])

  const handleSSOSignIn = async () => {
    if (!detectedProvider || !email) return

    setLoading(true)
    setError(null)

    try {
      // Log SSO attempt
      await logLoginEvent(supabase, email, 'sso')

      // Initiate SSO with Supabase
      const { data, error: ssoError } = await supabase.auth.signInWithSSO({
        domain: email.split('@')[1],
        options: {
          redirectTo: `${window.location.origin}/auth/sso-callback`,
        },
      })

      if (ssoError) {
        console.error('SSO error:', ssoError)
        setError(`SSO authentication failed: ${ssoError.message}`)
        await logLoginFailure(email, ssoError.message)
        setLoading(false)
        return
      }

      // Redirect to SSO provider
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('SSO error:', err)
      setError('Failed to initiate SSO. Please try again or use password login.')
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        await logLoginFailure(email, signInError.message, {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        })

        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Need an account? Click "Create Account" above.')
        } else {
          setError(signInError.message)
        }
      } else {
        await logLoginEvent(supabase, email, 'login')
        await logLoginSuccess(email, undefined, {
          action: 'login',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        })
        router.push('/onboarding')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    // Check if email domain is allowed
    if (!isAllowedDomain(email)) {
      setError('Please use your corporate email address (@rentokil.com, @prestox.com, etc.)')
      setLoading(false)
      return
    }

    // If SSO is available, suggest using it
    const provider = detectSSOProvider(email)
    if (provider) {
      setError(`Your organization uses ${provider.displayName} for sign-in. Please use the "Continue with ${provider.displayName}" button instead.`)
      setDetectedProvider(provider)
      setViewMode('sso-detected')
      setLoading(false)
      return
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('An account with this email already exists. Try signing in instead.')
          await logLoginFailure(email, 'User already registered')
        } else {
          setError(signUpError.message)
          await logLoginFailure(email, signUpError.message)
        }
      } else if (signUpData.user) {
        await logLoginEvent(supabase, email, 'signup')
        await logLoginSuccess(email, signUpData.user.id, {
          action: 'signup',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        })
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
        await logPasswordReset(email, 'requested', {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        })
        setViewMode('reset-sent')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderSSOView = () => {
    if (!detectedProvider) return null

    return (
      <>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to Rentokil BI
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Sign in with your corporate account
          </p>
        </div>

        <div className="space-y-4">
          {/* Email display */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@rentokil.com"
                className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* SSO Provider Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              {detectedProvider.name === 'azure' ? (
                <svg className="h-8 w-8" viewBox="0 0 23 23" fill="none">
                  <path fill="#f25022" d="M1 1h10v10H1z"/>
                  <path fill="#00a4ef" d="M1 12h10v10H1z"/>
                  <path fill="#7fba00" d="M12 1h10v10H12z"/>
                  <path fill="#ffb900" d="M12 12h10v10H12z"/>
                </svg>
              ) : (
                <svg className="h-8 w-8" viewBox="0 0 64 64" fill="none">
                  <rect width="64" height="64" rx="8" fill="#007dc1"/>
                  <text x="32" y="42" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">O</text>
                </svg>
              )}
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {detectedProvider.displayName} Single Sign-On
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your organization uses {detectedProvider.displayName} for authentication
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* SSO Button */}
          <Button
            onClick={handleSSOSignIn}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redirecting to {detectedProvider.displayName}...
              </>
            ) : (
              <>
                Continue with {detectedProvider.displayName}
              </>
            )}
          </Button>

          {/* Fallback to password login */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setViewMode('login')
              setDetectedProvider(null)
            }}
            className="w-full"
            disabled={loading}
          >
            <Lock className="h-4 w-4 mr-2" />
            Sign in with password instead
          </Button>
        </div>
      </>
    )
  }

  const renderForm = () => {
    if (viewMode === 'sso-detected' && detectedProvider) {
      return renderSSOView()
    }

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

    // Login or Signup view with tabs
    const isSignUp = viewMode === 'signup'

    return (
      <>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to Rentokil BI
          </h1>
        </div>

        {/* Tabs for Sign In / Create Account */}
        <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setViewMode('login')
              setError(null)
            }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
              !isSignUp
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('signup')
              setError(null)
            }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
              isSignUp
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-5">
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
            {/* SSO hint */}
            {detectedProvider && (
              <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                Your organization uses {detectedProvider.displayName} for sign-in.{' '}
                <button
                  type="button"
                  onClick={() => setViewMode('sso-detected')}
                  className="underline hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Use SSO instead
                </button>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              {!isSignUp && (
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
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'Create a password (min 6 characters)' : 'Enter your password'}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Remember Me - only show on sign in */}
          {!isSignUp && (
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                disabled={loading}
              />
              <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                Remember me
              </label>
            </div>
          )}

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
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </Button>
        </form>

        {isSignUp && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              By creating an account, you agree to the terms of service.
              <br />
              Password must be at least 6 characters.
            </p>
          </div>
        )}
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
            <Image src="/rentokil-logo.svg" alt="Rentokil" width={96} height={96} className="h-24 brightness-0 invert" />
            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-lg px-4 py-1">
              ALPHA
            </Badge>
          </div>

          <p className="text-white text-2xl font-light">Sales & Operations Intelligence Platform</p>

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
                <h3 className="text-white font-semibold text-lg">Enterprise SSO</h3>
                <p className="text-red-100 text-sm mt-1">
                  Sign in with Microsoft or Okta
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
            <Image src="/rentokil-logo.svg" alt="Rentokil" width={64} height={64} className="h-16" />
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              ALPHA
            </Badge>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            {renderForm()}
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading fallback for Suspense
function LoginPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  )
}

// Main export with Suspense boundary for useSearchParams
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageLoading />}>
      <LoginPageContent />
    </Suspense>
  )
}
