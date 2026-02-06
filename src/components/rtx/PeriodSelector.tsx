'use client'

import * as React from 'react'
import { useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, parse } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

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

  const parseLocalDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined
    return parse(dateStr, 'yyyy-MM-dd', new Date())
  }

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return 'Pick a date'
    const d = parse(dateStr, 'yyyy-MM-dd', new Date())
    return format(d, 'MMM d, yyyy')
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
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[160px] h-9 justify-start text-left font-normal',
                    !localStartDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDisplayDate(localStartDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseLocalDate(localStartDate)}
                  onSelect={(date) => {
                    if (date) setLocalStartDate(format(date, 'yyyy-MM-dd'))
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
              To:
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[160px] h-9 justify-start text-left font-normal',
                    !localEndDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDisplayDate(localEndDate)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={parseLocalDate(localEndDate)}
                  onSelect={(date) => {
                    if (date) setLocalEndDate(format(date, 'yyyy-MM-dd'))
                  }}
                  disabled={(date) => {
                    if (!localStartDate) return false
                    return date < parse(localStartDate, 'yyyy-MM-dd', new Date())
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
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
