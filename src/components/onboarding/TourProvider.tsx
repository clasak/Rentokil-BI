'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useAppStore } from '@/store'
import { TourStep, getTourStepsForRole } from '@/lib/onboarding/tourSteps'

const TOUR_COMPLETED_KEY = 'tour_completed'

interface TourContextValue {
  isActive: boolean
  currentStep: number
  steps: TourStep[]
  startTour: () => void
  endTour: () => void
  nextStep: () => void
  prevStep: () => void
  goToStep: (index: number) => void
}

const TourContext = createContext<TourContextValue | null>(null)

interface TourProviderProps {
  children: ReactNode
}

export function TourProvider({ children }: TourProviderProps) {
  const [mounted, setMounted] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const { settings } = useAppStore()

  // Get role-specific tour steps
  const steps = useMemo<TourStep[]>(() => {
    if (!mounted) return []
    return getTourStepsForRole(settings.role)
  }, [mounted, settings.role])

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if tour should auto-start for new users
  useEffect(() => {
    if (!mounted) return

    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY)
    if (!tourCompleted && steps.length > 0) {
      setIsActive(true)
      setCurrentStep(0)
    }
  }, [mounted, steps.length])

  const startTour = useCallback(() => {
    if (steps.length > 0) {
      setIsActive(true)
      setCurrentStep(0)
    }
  }, [steps.length])

  const endTour = useCallback(() => {
    setIsActive(false)
    setCurrentStep(0)
    // Persist tour completion
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true')
  }, [])

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      // End tour when reaching the last step
      endTour()
    }
  }, [currentStep, steps.length, endTour])

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < steps.length) {
        setCurrentStep(index)
      }
    },
    [steps.length]
  )

  const contextValue = useMemo<TourContextValue>(
    () => ({
      isActive,
      currentStep,
      steps,
      startTour,
      endTour,
      nextStep,
      prevStep,
      goToStep,
    }),
    [isActive, currentStep, steps, startTour, endTour, nextStep, prevStep, goToStep]
  )

  return <TourContext.Provider value={contextValue}>{children}</TourContext.Provider>
}

export function useTour(): TourContextValue {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return context
}
