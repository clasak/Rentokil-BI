"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  MessageSquarePlus,
  Send,
  CheckCircle,
  User,
  AlertCircle,
  ChevronLeft,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'
import {
  FeedbackType,
  FeedbackSeverity,
  CreateFeedbackInput,
  FEEDBACK_TYPE_CONFIGS,
  SEVERITY_CONFIGS,
  requiresSeverity,
  requiresStepsToReproduce,
} from '@/types/feedback'

interface UserProfile {
  name: string
  email: string
  department: string
  role: string
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

export function AlphaFeedback() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<'type' | 'details'>('type')
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null)
  const [severity, setSeverity] = useState<FeedbackSeverity>('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const pathname = usePathname()
  const { settings } = useAppStore()

  const supabase = createClient()

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('name, email, department, role')
            .eq('id', user.id)
            .single()

          if (profile) {
            setUserProfile(profile as UserProfile)
          } else {
            const stored = localStorage.getItem('user_profile')
            if (stored) {
              setUserProfile(JSON.parse(stored))
            }
          }
        } else {
          const stored = localStorage.getItem('user_profile')
          if (stored) {
            setUserProfile(JSON.parse(stored))
          }
        }
      } catch {
        const stored = localStorage.getItem('user_profile')
        if (stored) {
          setUserProfile(JSON.parse(stored))
        }
      }
    }
    loadProfile()
  }, [supabase])

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('type')
        setFeedbackType(null)
        setSeverity('medium')
        setTitle('')
        setDescription('')
        setStepsToReproduce('')
        setSubmitState('idle')
        setSubmittedId(null)
        setErrorMessage(null)
      }, 300)
    }
  }, [isOpen])

  const handleTypeSelect = (type: FeedbackType) => {
    setFeedbackType(type)
    setStep('details')
  }

  const handleBack = () => {
    setStep('type')
    setFeedbackType(null)
  }

  const handleSubmit = async () => {
    if (!feedbackType || !title.trim() || !description.trim()) return

    setSubmitState('submitting')
    setErrorMessage(null)

    const feedbackInput: CreateFeedbackInput = {
      feedback_type: feedbackType,
      severity: requiresSeverity(feedbackType) ? severity : 'medium',
      title: title.trim(),
      description: description.trim(),
      steps_to_reproduce: requiresStepsToReproduce(feedbackType) && stepsToReproduce.trim()
        ? stepsToReproduce.trim()
        : undefined,
      page_url: pathname,
      metadata: {
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        screen_width: typeof window !== 'undefined' ? window.innerWidth : 0,
        screen_height: typeof window !== 'undefined' ? window.innerHeight : 0,
        timestamp: new Date().toISOString(),
      },
    }

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackInput),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSubmittedId(result.id)
        setSubmitState('success')

        // Also save locally as backup
        const localFeedback = {
          ...feedbackInput,
          id: result.id,
          submitter_name: userProfile?.name || 'Anonymous',
          submitter_role: userProfile?.role || settings.role,
          timestamp: new Date().toISOString(),
        }
        const existing = JSON.parse(localStorage.getItem('alpha_feedback_v2') || '[]')
        existing.push(localFeedback)
        localStorage.setItem('alpha_feedback_v2', JSON.stringify(existing))

        // Close dialog after delay
        setTimeout(() => setIsOpen(false), 3000)
      } else {
        setErrorMessage(result.error || 'Failed to submit feedback')
        setSubmitState('error')

        // Still save locally on error
        const localFeedback = {
          ...feedbackInput,
          id: `local-${Date.now()}`,
          submitter_name: userProfile?.name || 'Anonymous',
          submitter_role: userProfile?.role || settings.role,
          timestamp: new Date().toISOString(),
          sync_pending: true,
        }
        const existing = JSON.parse(localStorage.getItem('alpha_feedback_v2') || '[]')
        existing.push(localFeedback)
        localStorage.setItem('alpha_feedback_v2', JSON.stringify(existing))
      }
    } catch (error) {
      console.error('[Alpha Feedback] Submit error:', error)
      setErrorMessage('Network error. Feedback saved locally.')
      setSubmitState('error')

      // Save locally on network error
      const localFeedback = {
        ...feedbackInput,
        id: `local-${Date.now()}`,
        submitter_name: userProfile?.name || 'Anonymous',
        submitter_role: userProfile?.role || settings.role,
        timestamp: new Date().toISOString(),
        sync_pending: true,
      }
      const existing = JSON.parse(localStorage.getItem('alpha_feedback_v2') || '[]')
      existing.push(localFeedback)
      localStorage.setItem('alpha_feedback_v2', JSON.stringify(existing))
    }
  }

  const currentTypeConfig = feedbackType
    ? FEEDBACK_TYPE_CONFIGS.find((c) => c.type === feedbackType)
    : null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 gap-2 shadow-lg bg-white dark:bg-gray-800 border-2 border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
        >
          <MessageSquarePlus className="h-4 w-4 text-purple-600" />
          <span className="hidden sm:inline">Feedback</span>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            ALPHA
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'details' && feedbackType && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <MessageSquarePlus className="h-5 w-5 text-purple-600" />
            {step === 'type' ? 'What type of feedback?' : currentTypeConfig?.label || 'Feedback'}
          </DialogTitle>
          <DialogDescription>
            {step === 'type'
              ? 'Help us improve! Select the type of feedback you want to share.'
              : 'Provide details about your feedback.'}
          </DialogDescription>
        </DialogHeader>

        {submitState === 'success' ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
              Thank you for your feedback!
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Your feedback has been submitted and will be reviewed by Sophia.
            </p>
            {submittedId && (
              <p className="text-xs text-gray-400 mt-2 font-mono">
                Reference: {submittedId.substring(0, 8)}
              </p>
            )}
          </div>
        ) : step === 'type' ? (
          <div className="py-4">
            {/* User Info */}
            {userProfile && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{userProfile.name}</div>
                  <div className="text-xs text-gray-500">
                    {userProfile.department} &bull; {userProfile.role?.replace('_', ' ')}
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Type Grid */}
            <div className="grid grid-cols-2 gap-3">
              {FEEDBACK_TYPE_CONFIGS.map(({ type, label, description, icon }) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  className="p-4 rounded-lg border-2 transition-all text-left hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{icon}</span>
                    <span className="font-medium">{label}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                </button>
              ))}
            </div>

            {/* Current Page */}
            <div className="text-xs text-gray-400 mt-4 text-center">
              Feedback for: <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{pathname}</code>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Severity Selector (only for certain types) */}
            {currentTypeConfig?.showSeverity && (
              <div>
                <label className="text-sm font-medium mb-2 block">How severe is this?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SEVERITY_CONFIGS.map(({ severity: sev, label, description }) => (
                    <button
                      key={sev}
                      onClick={() => setSeverity(sev)}
                      className={`p-2 rounded-lg border-2 transition-all text-center ${
                        severity === sev
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className={`text-sm font-medium ${severity === sev ? 'text-purple-700 dark:text-purple-400' : ''}`}>
                        {label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 hidden sm:block">{description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Brief title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder={
                  feedbackType === 'bug' ? 'e.g., Button not responding on Sales page' :
                  feedbackType === 'feature' ? 'e.g., Add export to PDF option' :
                  feedbackType === 'data' ? 'e.g., Win rate calculation seems incorrect' :
                  'Brief summary of your feedback'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              <div className="text-xs text-gray-400 text-right mt-1">{title.length}/100</div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Details <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder={
                  feedbackType === 'bug' ? 'What happened? What did you expect to happen?' :
                  feedbackType === 'feature' ? 'Describe the feature and why it would be helpful...' :
                  feedbackType === 'data' ? 'Which data looks wrong? What values did you expect?' :
                  feedbackType === 'performance' ? 'What felt slow? How long did it take?' :
                  'Provide as much detail as possible...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Steps to Reproduce (only for bugs/performance/data) */}
            {currentTypeConfig?.showStepsToReproduce && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Steps to reproduce <span className="text-gray-400">(optional)</span>
                </label>
                <Textarea
                  placeholder={"1. Go to /sales page\n2. Click on the filter dropdown\n3. Select 'All' option\n4. Notice the page freezes"}
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  className="min-h-[80px] font-mono text-sm"
                />
              </div>
            )}

            {/* Error Message */}
            {submitState === 'error' && errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || !description.trim() || submitState === 'submitting'}
              className="w-full gap-2"
            >
              {submitState === 'submitting' ? (
                <>
                  <span className="animate-spin">&#8987;</span>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Feedback
                </>
              )}
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Feedback is triaged by Sophia and reviewed by the development team.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Admin component to view collected feedback
export function FeedbackViewer() {
  const [feedback, setFeedback] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)

  const loadFeedback = async () => {
    setLoading(true)
    try {
      // Try API first
      const response = await fetch('/api/feedback?limit=100')
      const result = await response.json()
      if (result.feedback && result.feedback.length > 0) {
        setFeedback(result.feedback)
      } else {
        // Fallback to local storage
        const stored = JSON.parse(localStorage.getItem('alpha_feedback_v2') || '[]')
        setFeedback(stored)
      }
    } catch {
      // Fallback to local storage
      const stored = JSON.parse(localStorage.getItem('alpha_feedback_v2') || '[]')
      setFeedback(stored)
    }
    setLoading(false)
  }

  const exportFeedback = () => {
    const data = JSON.stringify(feedback, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alpha-feedback-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    const config = FEEDBACK_TYPE_CONFIGS.find(c => c.type === type)
    return config?.icon || '&#128221;'
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Alpha Feedback ({feedback.length})</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadFeedback} disabled={loading}>
            {loading ? 'Loading...' : 'Load'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportFeedback} disabled={feedback.length === 0}>
            Export
          </Button>
        </div>
      </div>
      {feedback.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-auto">
          {feedback.map((f, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-lg">{getTypeIcon(String(f.feedback_type))}</span>
                <Badge variant="outline">{String(f.feedback_type)}</Badge>
                {f.severity ? (
                  <Badge className={getSeverityColor(String(f.severity))}>
                    {String(f.severity)}
                  </Badge>
                ) : null}
                <Badge variant="secondary">{String(f.status || 'new')}</Badge>
              </div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">{String(f.title)}</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{String(f.description)}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <span>{String(f.submitter_name || 'Anonymous')}</span>
                <span>&bull;</span>
                <span>{String(f.page_url)}</span>
                <span>&bull;</span>
                <span>{new Date(String(f.created_at || f.timestamp)).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
