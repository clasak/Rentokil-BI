'use client'

import { useEffect, useState, useRef } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TourStep } from '@/lib/onboarding/tourSteps'

interface TourTooltipProps {
  step: TourStep
  stepNumber: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  position: { top: number; left: number }
}

/**
 * Calculate the optimal tooltip position to stay within viewport
 */
function adjustPositionForViewport(
  position: { top: number; left: number },
  tooltipRef: React.RefObject<HTMLDivElement | null>,
  placement: TourStep['placement']
): { top: number; left: number } {
  if (!tooltipRef.current) return position

  const rect = tooltipRef.current.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const padding = 16

  let { top, left } = position

  // Horizontal bounds check
  if (left < padding) {
    left = padding
  } else if (left + rect.width > viewportWidth - padding) {
    left = viewportWidth - rect.width - padding
  }

  // Vertical bounds check
  if (top < padding) {
    top = padding
  } else if (top + rect.height > viewportHeight - padding) {
    top = viewportHeight - rect.height - padding
  }

  return { top, left }
}

/**
 * Arrow component that points to the target element
 */
function TooltipArrow({ placement }: { placement: TourStep['placement'] }) {
  const baseClasses =
    'absolute w-3 h-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 transform rotate-45'

  const positionClasses: Record<TourStep['placement'], string> = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-b border-r',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-t border-l',
    left: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-t border-r',
    right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-b border-l',
  }

  return <div className={`${baseClasses} ${positionClasses[placement]}`} />
}

export function TourTooltip({
  step,
  stepNumber,
  totalSteps,
  onNext,
  onPrev,
  onClose,
  position,
}: TourTooltipProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [adjustedPosition, setAdjustedPosition] = useState(position)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Handle mount state for hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Animate entrance after mount
  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(timer)
    }
  }, [mounted])

  // Adjust position to stay within viewport
  useEffect(() => {
    if (mounted && tooltipRef.current) {
      const adjusted = adjustPositionForViewport(position, tooltipRef, step.placement)
      setAdjustedPosition(adjusted)
    }
  }, [mounted, position, step.placement])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowRight':
        case 'Enter':
          if (stepNumber < totalSteps) {
            onNext()
          } else {
            onClose()
          }
          break
        case 'ArrowLeft':
          if (stepNumber > 1) {
            onPrev()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNext, onPrev, stepNumber, totalSteps])

  // Prevent SSR mismatch
  if (!mounted) {
    return null
  }

  const isFirstStep = stepNumber === 1
  const isLastStep = stepNumber === totalSteps
  const hasTarget = step.target && step.target.length > 0

  return (
    <div
      ref={tooltipRef}
      role="dialog"
      aria-labelledby="tour-tooltip-title"
      aria-describedby="tour-tooltip-content"
      className={`
        fixed z-[60] w-80 max-w-[calc(100vw-2rem)]
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-lg shadow-xl
        transition-all duration-200 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      style={{
        top: `${adjustedPosition.top}px`,
        left: `${adjustedPosition.left}px`,
      }}
    >
      {/* Arrow pointing to target (only shown when there is a target) */}
      {hasTarget && <TooltipArrow placement={step.placement} />}

      {/* Close button */}
      <button
        onClick={onClose}
        className="
          absolute top-2 right-2
          p-1 rounded-md
          text-gray-400 hover:text-gray-600
          dark:text-gray-500 dark:hover:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-700
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-800
        "
        aria-label="Close tour"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="p-4 pr-8">
        {/* Title */}
        <h3
          id="tour-tooltip-title"
          className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2"
        >
          {step.title}
        </h3>

        {/* Description */}
        <p
          id="tour-tooltip-content"
          className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4"
        >
          {step.content}
        </p>

        {/* Footer with progress and navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          {/* Step progress indicator */}
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Step {stepNumber} of {totalSteps}
          </span>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {/* Previous button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              disabled={isFirstStep}
              className={`
                h-8 px-2
                ${isFirstStep ? 'invisible' : ''}
              `}
              aria-label="Previous step"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Next/Finish button */}
            <Button
              size="sm"
              onClick={isLastStep ? onClose : onNext}
              className="
                h-8 px-3
                bg-blue-600 hover:bg-blue-700
                dark:bg-blue-600 dark:hover:bg-blue-500
                text-white
              "
            >
              {isLastStep ? (
                'Finish'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1 pb-3">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`
              w-1.5 h-1.5 rounded-full transition-colors duration-200
              ${
                i + 1 === stepNumber
                  ? 'bg-blue-600 dark:bg-blue-500'
                  : i + 1 < stepNumber
                    ? 'bg-blue-300 dark:bg-blue-700'
                    : 'bg-gray-200 dark:bg-gray-600'
              }
            `}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  )
}
