'use client'

import * as React from 'react'
import { Search, X, CalendarIcon } from 'lucide-react'
import { format, parse } from 'date-fns'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterBarProps {
  /** Available markets for the market dropdown */
  markets?: FilterOption[]
  /** Available regions for the region dropdown */
  regions?: FilterOption[]
  /** Available branches for the branch dropdown */
  branches?: FilterOption[]
  /** Currently selected market */
  selectedMarket?: string
  /** Currently selected region */
  selectedRegion?: string
  /** Currently selected branch */
  selectedBranch?: string
  /** Current search query */
  searchQuery?: string
  /** Start date for date range filter */
  startDate?: string
  /** End date for date range filter */
  endDate?: string
  /** Callback when market selection changes */
  onMarketChange?: (value: string) => void
  /** Callback when region selection changes */
  onRegionChange?: (value: string) => void
  /** Callback when branch selection changes */
  onBranchChange?: (value: string) => void
  /** Callback when search query changes */
  onSearchChange?: (value: string) => void
  /** Callback when start date changes */
  onStartDateChange?: (value: string) => void
  /** Callback when end date changes */
  onEndDateChange?: (value: string) => void
  /** Callback when filters are cleared */
  onClearFilters?: () => void
  /** Whether to show the date range picker */
  showDateRange?: boolean
  /** Whether to show the search input */
  showSearch?: boolean
  /** Placeholder text for search input */
  searchPlaceholder?: string
  /** Additional CSS classes */
  className?: string
}

// Default filter options (shown while loading from BigQuery)
// Use useOrganizationData() hook to get live data from BigQuery
const defaultMarkets: FilterOption[] = [
  { value: 'all', label: 'All Markets' },
]

const defaultRegions: FilterOption[] = [
  { value: 'all', label: 'All Regions' },
]

const defaultBranches: FilterOption[] = [
  { value: 'all', label: 'All Branches' },
]

export default function FilterBar({
  markets = defaultMarkets,
  regions = defaultRegions,
  branches = defaultBranches,
  selectedMarket = 'all',
  selectedRegion = 'all',
  selectedBranch = 'all',
  searchQuery = '',
  startDate = '',
  endDate = '',
  onMarketChange,
  onRegionChange,
  onBranchChange,
  onSearchChange,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
  showDateRange = true,
  showSearch = true,
  searchPlaceholder = 'Search...',
  className,
}: FilterBarProps) {
  // Hydration fix: only render date pickers after mount
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const hasActiveFilters =
    selectedMarket !== 'all' ||
    selectedRegion !== 'all' ||
    selectedBranch !== 'all' ||
    searchQuery !== '' ||
    startDate !== '' ||
    endDate !== ''

  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Market Dropdown */}
        <div className="flex-1 min-w-[150px] max-w-[200px]">
          <Select value={selectedMarket} onValueChange={onMarketChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Market" />
            </SelectTrigger>
            <SelectContent>
              {markets
                .filter((market) => market.value && market.value.trim() !== '')
                .map((market) => (
                  <SelectItem key={market.value} value={market.value}>
                    {market.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Region Dropdown */}
        <div className="flex-1 min-w-[150px] max-w-[200px]">
          <Select value={selectedRegion} onValueChange={onRegionChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Region" />
            </SelectTrigger>
            <SelectContent>
              {regions
                .filter((region) => region.value && region.value.trim() !== '')
                .map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Branch Dropdown */}
        <div className="flex-1 min-w-[150px] max-w-[200px]">
          <Select value={selectedBranch} onValueChange={onBranchChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Branch" />
            </SelectTrigger>
            <SelectContent>
              {branches
                .filter((branch) => branch.value && branch.value.trim() !== '')
                .map((branch) => (
                  <SelectItem key={branch.value} value={branch.value}>
                    {branch.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Picker with Calendar Popups */}
        {showDateRange && mounted && (
          <div className="flex items-center gap-2">
            {/* Start Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[140px] justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(parse(startDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy') : 'Start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(date) => onStartDateChange?.(date ? format(date, 'yyyy-MM-dd') : '')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-gray-500 dark:text-gray-400">to</span>

            {/* End Date */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[140px] justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(parse(endDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy') : 'End date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate ? parse(endDate, 'yyyy-MM-dd', new Date()) : undefined}
                  onSelect={(date) => onEndDateChange?.(date ? format(date, 'yyyy-MM-dd') : '')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Date Range Placeholder during SSR */}
        {showDateRange && !mounted && (
          <div className="flex items-center gap-2">
            <Button variant="outline" className="w-[140px] justify-start text-left font-normal text-muted-foreground">
              <CalendarIcon className="mr-2 h-4 w-4" />
              Start date
            </Button>
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <Button variant="outline" className="w-[140px] justify-start text-left font-normal text-muted-foreground">
              <CalendarIcon className="mr-2 h-4 w-4" />
              End date
            </Button>
          </div>
        )}

        {/* Search Input */}
        {showSearch && (
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
