'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'rentokil_bi_welcome_dismissed'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onStartTour: () => void
  userName?: string
}

export function WelcomeModal({
  isOpen,
  onClose,
  onStartTour,
  userName,
}: WelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    onClose()
  }

  const handleStartTour = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    onStartTour()
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {userName ? `Welcome, ${userName}!` : 'Welcome to Rentokil BI!'}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400 pt-2">
            Your centralized business intelligence dashboard for pest control operations.
            Track KPIs, monitor performance, and make data-driven decisions all in one place.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Get started by taking a quick tour to learn about the key features,
            or skip for now and explore on your own.
          </p>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:gap-2">
          <div className="flex items-center gap-2 order-last sm:order-first sm:mr-auto">
            <input
              type="checkbox"
              id="dont-show-again"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600
                         text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400
                         bg-white dark:bg-gray-800 cursor-pointer"
            />
            <label
              htmlFor="dont-show-again"
              className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none"
            >
              Don&apos;t show this again
            </label>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 sm:flex-none"
            >
              Skip for now
            </Button>
            <Button
              onClick={handleStartTour}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700
                         dark:bg-blue-600 dark:hover:bg-blue-500 text-white"
            >
              Take a Tour
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Utility function to check if the welcome modal should be shown
 * @returns true if the modal should be shown, false if dismissed
 */
export function shouldShowWelcomeModal(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(STORAGE_KEY) !== 'true'
}

/**
 * Utility function to reset the welcome modal preference
 */
export function resetWelcomeModalPreference(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
