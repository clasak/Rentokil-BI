'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapPin, Building2, ChevronRight, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store'
import { useOrganizationData } from '@/hooks/useOrganizationData'
import { cn } from '@/lib/utils'

interface GlobalOrganizationFilterProps {
  showRegion?: boolean
  showBranch?: boolean
  compact?: boolean
  className?: string
}

export function GlobalOrganizationFilter({
  showRegion = true,
  showBranch = true,
  compact = false,
  className,
}: GlobalOrganizationFilterProps) {
  const [mounted, setMounted] = useState(false)

  const {
    organizationFilters,
    setOrganizationMarket,
    setOrganizationRegion,
    setOrganizationBranch,
    clearOrganizationFilters,
    getCurrentUserScope,
  } = useAppStore()

  const {
    markets,
    getRegionsForMarket,
    getBranchesForRegion,
    isLoading,
  } = useOrganizationData()

  // Get role-based scope to potentially restrict markets (must be called before early return)
  const userScope = getCurrentUserScope()

  // Filter markets based on user role (if they have restricted markets)
  // Handle both mock market IDs (MKT-001) and real BigQuery codes (NE, ATL)
  // Must be called before early return to maintain hook order
  const availableMarkets = useMemo(() => {
    if (!userScope.markets.length || userScope.markets[0] === '') {
      return markets // No restrictions - show all markets
    }

    // Filter markets that match either by code or by name
    // This handles: real codes (NE), mock IDs (MKT-001), and market names (Northeast)
    return markets.filter(m =>
      userScope.markets.includes(m.market_code) ||
      userScope.markets.includes(m.market_name) ||
      userScope.markets.some(code =>
        code.toLowerCase() === m.market_code.toLowerCase() ||
        code.toLowerCase() === m.market_name.toLowerCase()
      )
    )
  }, [markets, userScope.markets])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const { selectedMarket, selectedRegion, selectedBranch } = organizationFilters

  // Get available regions based on selected market
  const availableRegions = selectedMarket
    ? getRegionsForMarket(selectedMarket)
    : []

  // Get available branches based on selected region
  const availableBranches = selectedRegion
    ? getBranchesForRegion(selectedRegion)
    : []

  // Get display names for selected values
  const selectedMarketName = markets.find(m => m.market_code === selectedMarket)?.market_name
  const selectedRegionName = availableRegions.find(r => r.region_code === selectedRegion)?.region_name
  const selectedBranchName = availableBranches.find(b => b.branch_code === selectedBranch)?.branch_name

  const hasActiveFilters = selectedMarket || selectedRegion || selectedBranch

  if (compact) {
    // Compact mode: breadcrumb-style display with inline selects
    return (
      <div className={cn('flex items-center gap-1 text-sm', className)}>
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* Market Select */}
        <Select
          value={selectedMarket || 'all'}
          onValueChange={(value) => setOrganizationMarket(value === 'all' ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 w-auto min-w-[100px] max-w-[140px] border-0 bg-transparent px-2 hover:bg-muted/50">
            <SelectValue placeholder="All Markets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Markets</SelectItem>
            {availableMarkets
              .filter((market) => market.market_code && market.market_code.trim() !== '')
              .map((market) => (
                <SelectItem key={market.market_code} value={market.market_code}>
                  {market.market_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Region Select (only if market selected and showRegion) */}
        {showRegion && selectedMarket && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={selectedRegion || 'all'}
              onValueChange={(value) => setOrganizationRegion(value === 'all' ? null : value)}
              disabled={isLoading || availableRegions.length === 0}
            >
              <SelectTrigger className="h-8 w-auto min-w-[100px] max-w-[140px] border-0 bg-transparent px-2 hover:bg-muted/50">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {availableRegions
                  .filter((region) => region.region_code && region.region_code.trim() !== '')
                  .map((region) => (
                    <SelectItem key={region.region_code} value={region.region_code}>
                      {region.region_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </>
        )}

        {/* Branch Select (only if region selected and showBranch) */}
        {showBranch && selectedRegion && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={selectedBranch || 'all'}
              onValueChange={(value) => setOrganizationBranch(value === 'all' ? null : value)}
              disabled={isLoading || availableBranches.length === 0}
            >
              <SelectTrigger className="h-8 w-auto min-w-[100px] max-w-[140px] border-0 bg-transparent px-2 hover:bg-muted/50">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {availableBranches
                  .filter((branch) => branch.branch_code && branch.branch_code.trim() !== '')
                  .map((branch) => (
                    <SelectItem key={branch.branch_code} value={branch.branch_code}>
                      {branch.branch_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </>
        )}

        {/* Clear button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-1"
            onClick={clearOrganizationFilters}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Clear filters</span>
          </Button>
        )}
      </div>
    )
  }

  // Full mode: stacked or horizontal layout with labels
  return (
    <div className={cn('flex flex-col sm:flex-row gap-3', className)}>
      {/* Market Select */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Market</label>
        <Select
          value={selectedMarket || 'all'}
          onValueChange={(value) => setOrganizationMarket(value === 'all' ? null : value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[180px]">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All Markets" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Markets</SelectItem>
            {availableMarkets
              .filter((market) => market.market_code && market.market_code.trim() !== '')
              .map((market) => (
                <SelectItem key={market.market_code} value={market.market_code}>
                  {market.market_name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Region Select */}
      {showRegion && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Region</label>
          <Select
            value={selectedRegion || 'all'}
            onValueChange={(value) => setOrganizationRegion(value === 'all' ? null : value)}
            disabled={isLoading || !selectedMarket}
          >
            <SelectTrigger className={cn('w-[180px]', !selectedMarket && 'opacity-50')}>
              <SelectValue placeholder={selectedMarket ? 'All Regions' : 'Select Market First'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {availableRegions
                .filter((region) => region.region_code && region.region_code.trim() !== '')
                .map((region) => (
                  <SelectItem key={region.region_code} value={region.region_code}>
                    {region.region_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Branch Select */}
      {showBranch && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Branch</label>
          <Select
            value={selectedBranch || 'all'}
            onValueChange={(value) => setOrganizationBranch(value === 'all' ? null : value)}
            disabled={isLoading || !selectedRegion}
          >
            <SelectTrigger className={cn('w-[180px]', !selectedRegion && 'opacity-50')}>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={selectedRegion ? 'All Branches' : 'Select Region First'} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {availableBranches
                .filter((branch) => branch.branch_code && branch.branch_code.trim() !== '')
                .map((branch) => (
                  <SelectItem key={branch.branch_code} value={branch.branch_code}>
                    {branch.branch_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Clear All button */}
      {hasActiveFilters && (
        <div className="flex flex-col justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={clearOrganizationFilters}
            className="h-10"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
