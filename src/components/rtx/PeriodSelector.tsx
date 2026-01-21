"use client"

import { useState } from 'react'
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon } from 'lucide-react'
import type { DateRange as DayPickerDateRange } from 'react-day-picker'
import type { TimePeriod, ComparisonType, PeriodSelection, DateRange } from '@/types/filters'

interface PeriodSelectorProps {
  value: PeriodSelection
  onChange: (value: PeriodSelection) => void
  className?: string
}

const PERIOD_LABELS: Record<TimePeriod, string> = {
  today: 'Today',
  wtd: 'Week to Date',
  mtd: 'Month to Date',
  qtd: 'Quarter to Date',
  ytd: 'Year to Date',
  custom: 'Custom Range',
}

const COMPARISON_LABELS: Record<ComparisonType, string> = {
  prior_period: 'vs Prior Period',
  prior_year: 'vs Prior Year',
  budget: 'vs Budget',
  forecast: 'vs Forecast',
}

function getDateRangeForPeriod(period: TimePeriod): DateRange {
  const now = new Date()
  const today = startOfDay(now)

  switch (period) {
    case 'today':
      return { start: today, end: endOfDay(now) }
    case 'wtd':
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfDay(now) }
    case 'mtd':
      return { start: startOfMonth(today), end: endOfDay(now) }
    case 'qtd':
      return { start: startOfQuarter(today), end: endOfDay(now) }
    case 'ytd':
      return { start: startOfYear(today), end: endOfDay(now) }
    case 'custom':
      return { start: startOfMonth(today), end: endOfDay(now) }
    default:
      return { start: startOfMonth(today), end: endOfDay(now) }
  }
}

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [customRange, setCustomRange] = useState<DayPickerDateRange | undefined>(
    value.customRange ? { from: value.customRange.start, to: value.customRange.end } : undefined
  )

  const handlePeriodChange = (period: TimePeriod) => {
    if (period === 'custom') {
      onChange({
        ...value,
        period,
        customRange: customRange?.from && customRange?.to
          ? { start: customRange.from, end: customRange.to }
          : undefined
      })
    } else {
      onChange({
        ...value,
        period,
        customRange: undefined
      })
    }
  }

  const handleComparisonChange = (comparisonType: ComparisonType) => {
    onChange({
      ...value,
      comparisonType
    })
  }

  const handleCustomRangeSelect = (range: DayPickerDateRange | undefined) => {
    setCustomRange(range)
    if (range?.from && range?.to) {
      onChange({
        ...value,
        period: 'custom',
        customRange: { start: range.from, end: range.to }
      })
    }
  }

  const displayDateRange = value.period === 'custom' && value.customRange
    ? `${format(value.customRange.start, 'MMM d')} - ${format(value.customRange.end, 'MMM d, yyyy')}`
    : (() => {
        const range = getDateRangeForPeriod(value.period)
        return `${format(range.start, 'MMM d')} - ${format(range.end, 'MMM d, yyyy')}`
      })()

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Period Selector */}
      <Select value={value.period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PERIOD_LABELS) as TimePeriod[]).map((period) => (
            <SelectItem key={period} value={period}>
              {PERIOD_LABELS[period]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom Date Range Picker */}
      {value.period === 'custom' && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {displayDateRange}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={handleCustomRangeSelect}
              numberOfMonths={2}
              defaultMonth={customRange?.from}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Comparison Type */}
      <Select value={value.comparisonType} onValueChange={handleComparisonChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Compare" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(COMPARISON_LABELS) as ComparisonType[]).map((comparison) => (
            <SelectItem key={comparison} value={comparison}>
              {COMPARISON_LABELS[comparison]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range Display (when not custom) */}
      {value.period !== 'custom' && (
        <span className="text-sm text-muted-foreground">
          {displayDateRange}
        </span>
      )}
    </div>
  )
}
