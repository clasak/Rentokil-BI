'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
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
import { useOrganizationData } from '@/hooks/useOrganizationData'

export interface OrganizationFilterState {
  marketCode: string
  regionCode: string
  branchCode: string
  marketName?: string
  regionName?: string
  branchName?: string
  searchQuery: string
  startDate: string
  endDate: string
}

export interface OrganizationFilterBarProps {
  /** Callback when filters change - receives full filter state */
  onFiltersChange?: (filters: OrganizationFilterState) => void
  /** Initial filter values */
  initialFilters?: Partial<OrganizationFilterState>
  /** Whether to show the date range picker */
  showDateRange?: boolean
  /** Whether to show the search input */
  showSearch?: boolean
  /** Whether to show the branch dropdown */
  showBranch?: boolean
  /** Placeholder text for search input */
  searchPlaceholder?: string
  /** Additional CSS classes */
  className?: string
  /** Compact mode - single row */
  compact?: boolean
}

export default function OrganizationFilterBar({
  onFiltersChange,
  initialFilters,
  showDateRange = true,
  showSearch = true,
  showBranch = true,
  searchPlaceholder = 'Search...',
  className,
  compact = false,
}: OrganizationFilterBarProps) {
  // Organization data from BigQuery
  const {
    marketOptions,
    getRegionOptionsForMarket,
    getBranchOptionsForRegion,
    getMarketByCode,
    getRegionByCode,
    getBranchByCode,
    isLoading,
  } = useOrganizationData()

  // Filter state
  const [marketCode, setMarketCode] = useState(initialFilters?.marketCode || 'all')
  const [regionCode, setRegionCode] = useState(initialFilters?.regionCode || 'all')
  const [branchCode, setBranchCode] = useState(initialFilters?.branchCode || 'all')
  const [searchQuery, setSearchQuery] = useState(initialFilters?.searchQuery || '')
  const [startDate, setStartDate] = useState(initialFilters?.startDate || '')
  const [endDate, setEndDate] = useState(initialFilters?.endDate || '')

  // Derived options (cascading)
  const regionOptions = React.useMemo(
    () => getRegionOptionsForMarket(marketCode),
    [getRegionOptionsForMarket, marketCode]
  )

  const branchOptions = React.useMemo(
    () => getBranchOptionsForRegion(regionCode),
    [getBranchOptionsForRegion, regionCode]
  )

  // Build full filter state
  const buildFilterState = useCallback((): OrganizationFilterState => {
    const market = getMarketByCode(marketCode)
    const region = getRegionByCode(regionCode)
    const branch = getBranchByCode(branchCode)

    return {
      marketCode,
      regionCode,
      branchCode,
      marketName: market?.market_name,
      regionName: region?.region_name,
      branchName: branch?.branch_name,
      searchQuery,
      startDate,
      endDate,
    }
  }, [
    marketCode,
    regionCode,
    branchCode,
    searchQuery,
    startDate,
    endDate,
    getMarketByCode,
    getRegionByCode,
    getBranchByCode,
  ])

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange?.(buildFilterState())
  }, [buildFilterState, onFiltersChange])

  // Handle market change (reset region and branch)
  const handleMarketChange = (value: string) => {
    setMarketCode(value)
    setRegionCode('all')
    setBranchCode('all')
  }

  // Handle region change (reset branch)
  const handleRegionChange = (value: string) => {
    setRegionCode(value)
    setBranchCode('all')
  }

  // Handle branch change
  const handleBranchChange = (value: string) => {
    setBranchCode(value)
  }

  // Clear all filters
  const handleClearFilters = () => {
    setMarketCode('all')
    setRegionCode('all')
    setBranchCode('all')
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters =
    marketCode !== 'all' ||
    regionCode !== 'all' ||
    branchCode !== 'all' ||
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
      <div className={cn('flex flex-wrap items-center gap-3', compact && 'flex-nowrap')}>
        {/* Loading indicator */}
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        )}

        {/* Market Dropdown */}
        <div className="flex-1 min-w-[150px] max-w-[220px]">
          <Select value={marketCode} onValueChange={handleMarketChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Market" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {marketOptions
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
        <div className="flex-1 min-w-[150px] max-w-[220px]">
          <Select value={regionCode} onValueChange={handleRegionChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Region" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {regionOptions
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
        {showBranch && (
          <div className="flex-1 min-w-[150px] max-w-[220px]">
            <Select value={branchCode} onValueChange={handleBranchChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {branchOptions
                  .filter((branch) => branch.value && branch.value.trim() !== '')
                  .map((branch) => (
                    <SelectItem key={branch.value} value={branch.value}>
                      {branch.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Range Picker */}
        {showDateRange && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px]"
              aria-label="Start date"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
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
