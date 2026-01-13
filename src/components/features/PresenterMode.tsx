"use client"

import { useEffect, useCallback, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore, PRESENTER_MODE_CONFIG } from '@/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight,
  ChevronLeft,
  X,
  Minimize2,
  Maximize2,
  Presentation
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function PresenterMode() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const {
    presenterMode,
    setPresenterMode,
    presenterMinimized,
    setPresenterMinimized,
    presenterStep,
    nextPresenterStep,
    prevPresenterStep,
    settings
  } = useAppStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Debug logging
  useEffect(() => {
    console.log('[PresenterMode] mounted:', mounted, 'presenterMode:', presenterMode)
  }, [mounted, presenterMode])

  // Use default values during SSR to prevent hydration mismatch
  const isPresenterMode = mounted ? presenterMode : false
  const isMinimized = mounted ? presenterMinimized : false
  const currentStepIndex = mounted ? presenterStep : 0

  // Fallback to bi_leadership if the stored demoMode doesn't exist in config
  const demoMode = (mounted && settings.demoMode in PRESENTER_MODE_CONFIG)
    ? settings.demoMode
    : 'bi_leadership'
  const config = PRESENTER_MODE_CONFIG[demoMode]
  const currentStep = config?.steps?.[currentStepIndex]
  const totalSteps = config?.steps?.length || 0
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === totalSteps - 1

  // Navigate to the current step's route when step changes
  useEffect(() => {
    if (isPresenterMode && currentStep && pathname !== currentStep.route) {
      router.push(currentStep.route)
    }
  }, [isPresenterMode, currentStep, pathname, router])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isPresenterMode) return

    // Don't capture if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    switch (e.key) {
      case 'ArrowRight':
      case ' ':
        e.preventDefault()
        nextPresenterStep()
        break
      case 'ArrowLeft':
        e.preventDefault()
        prevPresenterStep()
        break
      case 'Escape':
        e.preventDefault()
        setPresenterMode(false)
        break
      case 'm':
      case 'M':
        e.preventDefault()
        setPresenterMinimized(!isMinimized)
        break
    }
  }, [isPresenterMode, isMinimized, nextPresenterStep, prevPresenterStep, setPresenterMode, setPresenterMinimized])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleClose = () => {
    setPresenterMode(false)
  }

  const handleNext = () => {
    if (isLastStep) {
      handleClose()
    } else {
      nextPresenterStep()
    }
  }

  if (!isPresenterMode) return null

  // Minimized view - small pill in bottom right
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={() => setPresenterMinimized(false)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
        >
          <Presentation className="h-4 w-4" />
          <span className="font-medium">Step {currentStepIndex + 1}/{totalSteps}</span>
          <Maximize2 className="h-4 w-4 ml-1" />
        </button>
      </div>
    )
  }

  // Full presenter panel
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Presentation className="h-4 w-4 text-rentokil-red" />
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{config.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              Step {currentStepIndex + 1} of {totalSteps}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPresenterMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-rentokil-red transition-all duration-300"
            style={{ width: `${((presenterStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step title */}
          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">
            {currentStep?.title}
          </h3>

          {/* Script - scrollable */}
          <div className="max-h-[240px] overflow-y-auto space-y-3 pr-2">
            {currentStep?.script.map((line, index) => (
              <p
                key={index}
                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
              >
                <span className="text-gray-400 dark:text-gray-500 mr-2">&ldquo;</span>
                {line}
                <span className="text-gray-400 dark:text-gray-500 ml-1">&rdquo;</span>
              </p>
            ))}
          </div>
        </div>

        {/* Footer with controls */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPresenterStep}
              disabled={isFirstStep}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">←</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px] mx-1">→</kbd>
              <span className="mx-1">navigate</span>
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">M</kbd>
              <span className="ml-1">minimize</span>
            </div>

            <Button
              size="sm"
              onClick={handleNext}
              className={cn(
                "gap-1",
                isLastStep && "bg-green-600 hover:bg-green-700"
              )}
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
