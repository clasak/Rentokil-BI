'use client'

import * as React from 'react'
import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type PeriodType = 'today' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom'

export interface PeriodSelectorProps {
  /** Currently selected period */
  selectedPeriod?: PeriodType
  /** Custom start date (when period is 'custom') */
  customStartDate?: string
  /** Custom end date (when period is 'custom') */
  customEndDate?: string
  /** Callback when period changes */
  onPeriodChange?: (period: PeriodType) => void
  /** Callback when custom date range changes */
  onCustomDateChange?: (startDate: string, endDate: string) => void
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: 'sm' | 'default' | 'lg'
}

interface PeriodButton {
  id: PeriodType
  label: string
  shortLabel: string
}

const periodButtons: PeriodButton[] = [
  { id: 'today', label: 'Today', shortLabel: 'Today' },
  { id: 'wtd', label: 'Week to Date', shortLabel: 'WTD' },
  { id: 'mtd', label: 'Month to Date', shortLabel: 'MTD' },
  { id: 'qtd', label: 'Quarter to Date', shortLabel: 'QTD' },
  { id: 'ytd', label: 'Year to Date', shortLabel: 'YTD' },
  { id: 'custom', label: 'Custom', shortLabel: 'Custom' },
]

export default function PeriodSelector({
  selectedPeriod = 'mtd',
  customStartDate = '',
  customEndDate = '',
  onPeriodChange,
  onCustomDateChange,
  className,
  size = 'default',
}: PeriodSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(selectedPeriod === 'custom')
  const [localStartDate, setLocalStartDate] = useState(customStartDate)
  const [localEndDate, setLocalEndDate] = useState(customEndDate)

  const handlePeriodClick = (period: PeriodType) => {
    if (period === 'custom') {
      setShowCustomPicker(true)
    } else {
      setShowCustomPicker(false)
    }
    onPeriodChange?.(period)
  }

  const handleCustomDateApply = () => {
    onCustomDateChange?.(localStartDate, localEndDate)
  }

  const sizeClasses = {
    sm: 'h-8 px-2 text-xs',
    default: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-base',
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {periodButtons.map((button) => (
          <Button
            key={button.id}
            variant={selectedPeriod === button.id ? 'default' : 'ghost'}
            className={cn(
              sizeClasses[size],
              'transition-all duration-200',
              selectedPeriod === button.id
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            onClick={() => handlePeriodClick(button.id)}
            title={button.label}
          >
            {button.id === 'custom' && (
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
            )}
            <span className="hidden sm:inline">{button.label}</span>
            <span className="sm:hidden">{button.shortLabel}</span>
          </Button>
        ))}
      </div>

      {/* Custom Date Range Picker */}
      {showCustomPicker && selectedPeriod === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              From:
            </label>
            <Input
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="w-[140px] h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              To:
            </label>
            <Input
              type="date"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              className="w-[140px] h-9"
            />
          </div>
          <Button
            size="sm"
            onClick={handleCustomDateApply}
            disabled={!localStartDate || !localEndDate}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  )
}
