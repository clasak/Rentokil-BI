"use client"

import { useEffect, useState } from 'react'
import { CheckCircle, Sparkles } from 'lucide-react'

interface CelebrationProps {
  /** Show celebration */
  show: boolean
  /** Celebration message */
  message?: string
  /** Duration in ms before auto-hide */
  duration?: number
  /** Callback when celebration ends */
  onComplete?: () => void
}

interface Confetti {
  id: number
  x: number
  y: number
  color: string
  delay: number
  duration: number
}

/**
 * Success celebration with confetti and message
 * Perfect for completed actions, achievements, milestones
 */
export function Celebration({
  show,
  message = 'Success!',
  duration = 3000,
  onComplete,
}: CelebrationProps) {
  const [confetti, setConfetti] = useState<Confetti[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setVisible(true)

      // Generate confetti particles
      const particles: Confetti[] = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        color: ['#E4002B', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][
          Math.floor(Math.random() * 5)
        ],
        delay: Math.random() * 0.3,
        duration: 1 + Math.random() * 0.5,
      }))
      setConfetti(particles)

      // Auto-hide after duration
      const timer = setTimeout(() => {
        setVisible(false)
        setConfetti([])
        onComplete?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [show, duration, onComplete])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
      {/* Confetti */}
      {confetti.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}

      {/* Success message */}
      <div className="animate-bounce-in bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-sm mx-4 border-2 border-green-500">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {message}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Great work! Keep it up.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to trigger celebration
 */
export function useCelebration() {
  const [show, setShow] = useState(false)
  const [message, setMessage] = useState('Success!')

  const celebrate = (customMessage?: string) => {
    if (customMessage) setMessage(customMessage)
    setShow(true)
  }

  const handleComplete = () => {
    setShow(false)
  }

  return {
    celebrate,
    CelebrationComponent: () => (
      <Celebration
        show={show}
        message={message}
        onComplete={handleComplete}
      />
    ),
  }
}
