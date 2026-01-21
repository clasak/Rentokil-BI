'use client'

import * as React from 'react'
import { LayoutGrid, Table2, BarChart3, LineChart, PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type ViewType = 'table' | 'chart' | 'grid' | 'bar' | 'line' | 'pie'

export interface ViewOption {
  id: ViewType
  label: string
  icon: React.ReactNode
}

export interface ViewToggleProps {
  /** Currently selected view */
  selectedView?: ViewType
  /** Available view options (defaults to table and chart) */
  options?: ViewOption[]
  /** Callback when view changes */
  onViewChange?: (view: ViewType) => void
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'default' | 'lg'
  /** Whether to show labels alongside icons */
  showLabels?: boolean
}

const defaultOptions: ViewOption[] = [
  { id: 'table', label: 'Table', icon: <Table2 className="h-4 w-4" /> },
  { id: 'chart', label: 'Chart', icon: <BarChart3 className="h-4 w-4" /> },
]

const allViewOptions: Record<ViewType, ViewOption> = {
  table: { id: 'table', label: 'Table', icon: <Table2 className="h-4 w-4" /> },
  chart: { id: 'chart', label: 'Chart', icon: <BarChart3 className="h-4 w-4" /> },
  grid: { id: 'grid', label: 'Grid', icon: <LayoutGrid className="h-4 w-4" /> },
  bar: { id: 'bar', label: 'Bar Chart', icon: <BarChart3 className="h-4 w-4" /> },
  line: { id: 'line', label: 'Line Chart', icon: <LineChart className="h-4 w-4" /> },
  pie: { id: 'pie', label: 'Pie Chart', icon: <PieChart className="h-4 w-4" /> },
}

export default function ViewToggle({
  selectedView = 'table',
  options = defaultOptions,
  onViewChange,
  className,
  size = 'default',
  showLabels = false,
}: ViewToggleProps) {
  const sizeClasses = {
    sm: 'h-8 px-2',
    default: 'h-9 px-3',
    lg: 'h-10 px-4',
  }

  const iconSizeClasses = {
    sm: '[&_svg]:h-3.5 [&_svg]:w-3.5',
    default: '[&_svg]:h-4 [&_svg]:w-4',
    lg: '[&_svg]:h-5 [&_svg]:w-5',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg',
        className
      )}
      role="group"
      aria-label="View options"
    >
      {options.map((option) => {
        const isSelected = selectedView === option.id
        return (
          <Button
            key={option.id}
            variant="ghost"
            className={cn(
              sizeClasses[size],
              iconSizeClasses[size],
              'transition-all duration-200 rounded-md',
              isSelected
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            onClick={() => onViewChange?.(option.id)}
            aria-pressed={isSelected}
            title={option.label}
          >
            {option.icon}
            {showLabels && (
              <span className="ml-1.5 text-sm">{option.label}</span>
            )}
          </Button>
        )
      })}
    </div>
  )
}

// Helper to create custom view options
export function createViewOptions(viewTypes: ViewType[]): ViewOption[] {
  return viewTypes.map((type) => allViewOptions[type])
}
