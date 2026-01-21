"use client"

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LayoutGrid, List, TrendingUp } from 'lucide-react'
import type { ViewMode } from '@/types/filters'

interface ViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
}

const VIEW_OPTIONS: { value: ViewMode; icon: React.ElementType; label: string }[] = [
  { value: 'summary', icon: LayoutGrid, label: 'Summary' },
  { value: 'detailed', icon: List, label: 'Detailed' },
  { value: 'trending', icon: TrendingUp, label: 'Trending' },
]

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center rounded-lg border bg-muted p-1', className)}>
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon
        const isActive = value === option.value

        return (
          <Button
            key={option.value}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(option.value)}
            className={cn(
              'gap-2 transition-all',
              isActive ? 'shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{option.label}</span>
          </Button>
        )
      })}
    </div>
  )
}

// Alternative pill-style toggle
interface ViewTogglePillsProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
  className?: string
}

export function ViewTogglePills({ value, onChange, className }: ViewTogglePillsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon
        const isActive = value === option.value

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
