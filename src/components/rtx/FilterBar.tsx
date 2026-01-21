'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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

const defaultMarkets: FilterOption[] = [
  { value: 'all', label: 'All Markets' },
  { value: 'northeast', label: 'Northeast' },
  { value: 'southeast', label: 'Southeast' },
  { value: 'midwest', label: 'Midwest' },
  { value: 'southwest', label: 'Southwest' },
  { value: 'west', label: 'West' },
  { value: 'northwest', label: 'Northwest' },
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
              {markets.map((market) => (
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
              {regions.map((region) => (
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
              {branches.map((branch) => (
                <SelectItem key={branch.value} value={branch.value}>
                  {branch.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Picker */}
        {showDateRange && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange?.(e.target.value)}
              className="w-[140px]"
              aria-label="Start date"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange?.(e.target.value)}
              className="w-[140px]"
              aria-label="End date"
            />
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
