"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MessageSquarePlus, ThumbsUp, ThumbsDown, Bug, Lightbulb, Send, CheckCircle, User } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store'

type FeedbackType = 'like' | 'dislike' | 'bug' | 'idea'

interface UserProfile {
  name: string
  email: string
  department: string
  role: string
}

interface FeedbackEntry {
  type: FeedbackType
  department: string
  role: string
  userName: string
  userEmail: string
  page: string
  message: string
  timestamp: string
  userAgent: string
}

export function AlphaFeedback() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<FeedbackType | null>(null)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
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
          // Try to get profile from Supabase
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('name, email, department, role')
            .eq('id', user.id)
            .single()

          if (profile) {
            setUserProfile(profile as UserProfile)
          } else {
            // Fallback to local storage profile
            const stored = localStorage.getItem('user_profile')
            if (stored) {
              setUserProfile(JSON.parse(stored))
            }
          }
        } else {
          // Not authenticated, check local storage
          const stored = localStorage.getItem('user_profile')
          if (stored) {
            setUserProfile(JSON.parse(stored))
          }
        }
      } catch (error) {
        // Fallback to local storage
        const stored = localStorage.getItem('user_profile')
        if (stored) {
          setUserProfile(JSON.parse(stored))
        }
      }
    }
    loadProfile()
  }, [supabase])

  const handleSubmit = async () => {
    if (!feedbackType || !message.trim()) return

    const feedback: FeedbackEntry = {
      type: feedbackType,
      department: userProfile?.department || 'Unknown',
      role: userProfile?.role || settings.role,
      userName: userProfile?.name || 'Anonymous',
      userEmail: userProfile?.email || 'unknown',
      page: pathname,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    }

    // Try to save to Supabase first
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('alpha_feedback').insert({
          user_id: user.id,
          feedback_type: feedbackType,
          department: feedback.department,
          page: pathname,
          message: feedback.message,
          user_agent: feedback.userAgent
        })
      }
    } catch (error) {
      console.log('[Alpha Feedback] Could not save to Supabase, saving locally')
    }

    // Always save locally as backup
    const existingFeedback = JSON.parse(localStorage.getItem('alpha_feedback') || '[]')
    existingFeedback.push(feedback)
    localStorage.setItem('alpha_feedback', JSON.stringify(existingFeedback))

    console.log('[Alpha Feedback]', feedback)

    setSubmitted(true)
    setTimeout(() => {
      setIsOpen(false)
      setSubmitted(false)
      setFeedbackType(null)
      setMessage('')
    }, 2000)
  }

  const feedbackTypes = [
    { type: 'like' as FeedbackType, icon: ThumbsUp, label: 'I like this', color: 'text-green-600' },
    { type: 'dislike' as FeedbackType, icon: ThumbsDown, label: "Doesn't work for me", color: 'text-red-600' },
    { type: 'bug' as FeedbackType, icon: Bug, label: 'Found a bug', color: 'text-orange-600' },
    { type: 'idea' as FeedbackType, icon: Lightbulb, label: 'Have an idea', color: 'text-blue-600' },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 gap-2 shadow-lg bg-white dark:bg-gray-800 border-2 border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
        >
          <MessageSquarePlus className="h-4 w-4 text-purple-600" />
          <span className="hidden sm:inline">Alpha Feedback</span>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            ALPHA
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-purple-600" />
            Alpha Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve! Your feedback shapes the final product.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
              Thank you for your feedback!
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Your input helps us build a better tool.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* User Info - Auto-filled from profile */}
            {userProfile && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{userProfile.name}</div>
                  <div className="text-xs text-gray-500">
                    {userProfile.department} • {userProfile.role?.replace('_', ' ')}
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Type Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">What kind of feedback?</label>
              <div className="grid grid-cols-2 gap-2">
                {feedbackTypes.map(({ type, icon: Icon, label, color }) => (
                  <button
                    key={type}
                    onClick={() => setFeedbackType(type)}
                    className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${
                      feedbackType === type
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${color}`} />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Page Display */}
            <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded">
              Feedback for page: <code className="font-mono">{pathname}</code>
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tell us more</label>
              <Textarea
                placeholder={
                  feedbackType === 'like' ? "What specifically do you like about this?" :
                  feedbackType === 'dislike' ? "What doesn't work for your workflow?" :
                  feedbackType === 'bug' ? "Describe what happened and what you expected..." :
                  feedbackType === 'idea' ? "Share your idea for improvement..." :
                  "Share your thoughts..."
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!feedbackType || !message.trim()}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              Submit Feedback
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Feedback is saved and reviewed by the development team.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Admin component to view collected feedback
export function FeedbackViewer() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])

  const loadFeedback = () => {
    const stored = JSON.parse(localStorage.getItem('alpha_feedback') || '[]')
    setFeedback(stored)
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

  const clearFeedback = () => {
    if (confirm('Are you sure you want to clear all feedback?')) {
      localStorage.removeItem('alpha_feedback')
      setFeedback([])
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Alpha Feedback ({feedback.length})</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadFeedback}>
            Load
          </Button>
          <Button variant="outline" size="sm" onClick={exportFeedback} disabled={feedback.length === 0}>
            Export
          </Button>
          <Button variant="destructive" size="sm" onClick={clearFeedback} disabled={feedback.length === 0}>
            Clear
          </Button>
        </div>
      </div>
      {feedback.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-auto">
          {feedback.map((f, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={f.type === 'like' ? 'success' : f.type === 'bug' ? 'destructive' : 'secondary'}>
                  {f.type}
                </Badge>
                <Badge variant="outline">{f.department}</Badge>
                <span className="text-xs text-gray-400">{f.userName}</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300">{f.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {f.page} • {new Date(f.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
