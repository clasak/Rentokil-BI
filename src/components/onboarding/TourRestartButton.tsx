'use client'

import { PlayCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTour } from './TourProvider'
import { cn } from '@/lib/utils'

interface TourRestartButtonProps {
  variant?: 'button' | 'link' | 'icon'
  className?: string
}

export function TourRestartButton({
  variant = 'button',
  className
}: TourRestartButtonProps) {
  const { startTour } = useTour()

  const handleClick = () => {
    startTour()
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className={cn(
          'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
          className
        )}
        aria-label="Restart tour"
        title="Restart tour"
      >
        <PlayCircle className="h-5 w-5" />
      </Button>
    )
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300',
          'underline-offset-4 hover:underline',
          'transition-colors duration-200',
          className
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Restart Tour
        </span>
      </button>
    )
  }

  // Default: 'button' variant
  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={cn(
        'gap-2',
        className
      )}
    >
      <PlayCircle className="h-4 w-4" />
      Restart Tour
    </Button>
  )
}
