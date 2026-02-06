'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  MapPin,
  Building,
  Building2,
  X,
  Search,
  Home,
  Globe,
  AlertTriangle
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/store'
import { useOrganizationData } from '@/hooks/useOrganizationData'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface HierarchicalOrganizationFilterProps {
  className?: string
  showCounts?: boolean
  showBreadcrumb?: boolean
  maxHeight?: string
}

export function HierarchicalOrganizationFilter({
  className,
  showCounts = true,
  showBreadcrumb = true,
  maxHeight = '600px',
}: HierarchicalOrganizationFilterProps) {
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set())
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

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
    getMarketByCode,
    getRegionByCode,
    getBranchByCode,
    isLoading,
  } = useOrganizationData()

  const userScope = getCurrentUserScope()

  // Filter markets based on role (STRICT MATCHING ONLY)
  // IMPORTANT: This must be BEFORE any early returns to maintain hook order
  const availableMarkets = useMemo(() => {
    // If no market restrictions, show all markets
    if (!userScope.markets.length || userScope.markets[0] === '') {
      return markets
    }

    // Filter markets with EXACT matching only (case-insensitive)
    const filtered = markets.filter(m => {
      return userScope.markets.some(scope => {
        const scopeLower = scope.toLowerCase()
        const marketCodeLower = m.market_code.toLowerCase()
        const marketNameLower = m.market_name.toLowerCase()

        // EXACT match on code or name ONLY - no fuzzy matching
        return scopeLower === marketCodeLower || scopeLower === marketNameLower
      })
    })

    // Fallback: If no markets match user scope, show all markets (prevents broken state)
    // This handles cases where user profile has outdated market codes
    if (filtered.length === 0 && markets.length > 0) {
      console.warn('[HierarchicalOrgFilter] ⚠️  No markets match user scope - showing all markets as fallback')
      console.table({
        'User Scope Markets': userScope.markets.join(', '),
        'Available Market Codes': markets.map(m => m.market_code).join(', '),
        'Available Market Names': markets.map(m => m.market_name).join(', '),
      })
      console.log('💡 Fix: Update your profile market codes to match actual BigQuery codes')
      console.log(`💡 Visit /api/organization/hierarchy to see available market codes`)

      // Return all markets as fallback to prevent broken UI
      return markets
    }

    return filtered
  }, [markets, userScope.markets])

  // Filter by search query
  // IMPORTANT: This must be BEFORE any early returns to maintain hook order
  const filteredMarkets = useMemo(() => {
    if (!searchQuery) return availableMarkets
    const query = searchQuery.toLowerCase()
    return availableMarkets.filter(market => {
      // Search in market name
      if (market.market_name.toLowerCase().includes(query)) return true

      // Search in regions
      const regions = getRegionsForMarket(market.market_code)
      if (regions.some(r => r.region_name.toLowerCase().includes(query))) return true

      // Search in branches
      const branches = regions.flatMap(r => getBranchesForRegion(r.region_code))
      if (branches.some(b => b.branch_name.toLowerCase().includes(query))) return true

      return false
    })
  }, [availableMarkets, searchQuery, getRegionsForMarket, getBranchesForRegion])

  // Hydration fix - set mounted state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-expand selected items and role-restricted markets
  useEffect(() => {
    if (organizationFilters.selectedMarket) {
      setExpandedMarkets(prev => new Set(prev).add(organizationFilters.selectedMarket!))
    }
    if (organizationFilters.selectedRegion) {
      const region = getRegionByCode(organizationFilters.selectedRegion)
      if (region) {
        setExpandedMarkets(prev => new Set(prev).add(region.market_code))
        setExpandedRegions(prev => new Set(prev).add(organizationFilters.selectedRegion!))
      }
    }

    // Auto-expand markets for role-restricted users (e.g., Market VP sees their regions)
    if (!organizationFilters.selectedMarket && availableMarkets.length > 0) {
      // If user only has access to 1-2 markets, auto-expand them
      if (availableMarkets.length <= 2) {
        setExpandedMarkets(new Set(availableMarkets.map(m => m.market_code)))
      }
    }
  }, [
    organizationFilters.selectedMarket,
    organizationFilters.selectedRegion,
    availableMarkets,
    getRegionByCode
  ])

  // Build breadcrumb (MUST be before early return to maintain hook order)
  const breadcrumb = useMemo(() => {
    const items: Array<{ label: string; type: 'market' | 'region' | 'branch' }> = []

    if (organizationFilters.selectedMarket) {
      const market = getMarketByCode(organizationFilters.selectedMarket)
      if (market) {
        items.push({ label: market.market_name, type: 'market' })
      }
    }

    if (organizationFilters.selectedRegion) {
      const region = getRegionByCode(organizationFilters.selectedRegion)
      if (region) {
        items.push({ label: region.region_name, type: 'region' })
      }
    }

    if (organizationFilters.selectedBranch) {
      const branch = getBranchByCode(organizationFilters.selectedBranch)
      if (branch) {
        items.push({ label: branch.branch_name, type: 'branch' })
      }
    }

    return items
  }, [organizationFilters, getMarketByCode, getRegionByCode, getBranchByCode])

  const hasActiveFilters = organizationFilters.selectedMarket || organizationFilters.selectedRegion || organizationFilters.selectedBranch

  if (!mounted) return null

  const toggleMarket = (marketCode: string) => {
    setExpandedMarkets(prev => {
      const next = new Set(prev)
      if (next.has(marketCode)) {
        next.delete(marketCode)
      } else {
        next.add(marketCode)
      }
      return next
    })
  }

  const toggleRegion = (regionCode: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev)
      if (next.has(regionCode)) {
        next.delete(regionCode)
      } else {
        next.add(regionCode)
      }
      return next
    })
  }

  const selectMarket = (marketCode: string) => {
    if (organizationFilters.selectedMarket === marketCode) {
      // Deselect if clicking the same market
      setOrganizationMarket(null)
    } else {
      setOrganizationMarket(marketCode)
      // Auto-expand the market
      setExpandedMarkets(prev => new Set(prev).add(marketCode))
    }
  }

  const selectRegion = (regionCode: string) => {
    if (organizationFilters.selectedRegion === regionCode) {
      // Deselect if clicking the same region
      setOrganizationRegion(null)
    } else {
      setOrganizationRegion(regionCode)
      // Auto-expand the region
      setExpandedRegions(prev => new Set(prev).add(regionCode))
    }
  }

  const selectBranch = (branchCode: string) => {
    if (organizationFilters.selectedBranch === branchCode) {
      // Deselect if clicking the same branch
      setOrganizationBranch(null)
    } else {
      setOrganizationBranch(branchCode)
    }
  }

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col gap-3 border rounded-lg p-4 bg-card', className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Organization</h3>
          </div>
          {hasActiveFilters && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={clearOrganizationFilters}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear all organization filters</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Breadcrumb */}
        {showBreadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 text-xs px-2 py-1.5 bg-muted/50 rounded-md">
            <Home className="h-3 w-3 text-muted-foreground" />
            {breadcrumb.map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span className={cn(
                  'font-medium',
                  item.type === 'market' && 'text-blue-600 dark:text-blue-400',
                  item.type === 'region' && 'text-purple-600 dark:text-purple-400',
                  item.type === 'branch' && 'text-green-600 dark:text-green-400'
                )}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search markets, regions, branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* All Markets Button */}
        {!isLoading && !searchQuery && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors border',
                  !hasActiveFilters
                    ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                    : 'hover:bg-muted/50 border-border'
                )}
                onClick={clearOrganizationFilters}
              >
                <Globe className={cn(
                  'h-4 w-4 shrink-0',
                  !hasActiveFilters ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-sm font-medium flex-1',
                  !hasActiveFilters && 'text-blue-700 dark:text-blue-300'
                )}>
                  All Markets
                </span>
                {!hasActiveFilters && (
                  <Badge variant="default" className="bg-blue-600 dark:bg-blue-500">
                    Active
                  </Badge>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>View all markets across the organization</p>
              <p className="text-xs text-muted-foreground mt-1">
                {availableMarkets.length} markets available
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Hierarchy Tree */}
        <ScrollArea className="flex-1" style={{ maxHeight }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
              <p>Loading organization hierarchy...</p>
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-sm text-muted-foreground gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div className="text-center">
                <p className="font-medium text-foreground">
                  {searchQuery ? 'No results found' : 'No markets available'}
                </p>
                {searchQuery && (
                  <p className="text-xs mt-2">
                    Try a different search term
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMarkets.map((market) => {
                const isExpanded = expandedMarkets.has(market.market_code)
                const isSelected = organizationFilters.selectedMarket === market.market_code
                const regions = getRegionsForMarket(market.market_code)

                return (
                  <div key={market.market_code}>
                    {/* Market Row */}
                    <div
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                        'hover:bg-muted/50',
                        isSelected && 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                      )}
                    >
                      <button
                        onClick={() => toggleMarket(market.market_code)}
                        className="flex items-center justify-center w-4 h-4 hover:bg-muted rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>

                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <div
                            className="flex items-center gap-2 flex-1"
                            onClick={() => selectMarket(market.market_code)}
                          >
                            <MapPin className={cn(
                              'h-4 w-4 shrink-0',
                              isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                            )} />
                            <span className={cn(
                              'text-sm font-medium',
                              isSelected && 'text-blue-700 dark:text-blue-300'
                            )}>
                              {market.market_name}
                            </span>
                            {showCounts && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {market.region_count}R / {market.branch_count}B
                              </Badge>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click to filter by {market.market_name} market</p>
                          {showCounts && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {market.region_count} regions, {market.branch_count} branches
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Regions (when expanded) */}
                    {isExpanded && regions.length > 0 && (
                      <div className="ml-6 mt-1 space-y-1">
                        {regions.map((region) => {
                          const isRegionExpanded = expandedRegions.has(region.region_code)
                          const isRegionSelected = organizationFilters.selectedRegion === region.region_code
                          const branches = getBranchesForRegion(region.region_code)

                          return (
                            <div key={region.region_code}>
                              {/* Region Row */}
                              <div
                                className={cn(
                                  'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                                  'hover:bg-muted/50',
                                  isRegionSelected && 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800'
                                )}
                              >
                                <button
                                  onClick={() => toggleRegion(region.region_code)}
                                  className="flex items-center justify-center w-4 h-4 hover:bg-muted rounded"
                                >
                                  {isRegionExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </button>

                                <Tooltip delayDuration={300}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="flex items-center gap-2 flex-1"
                                      onClick={() => selectRegion(region.region_code)}
                                    >
                                      <Building className={cn(
                                        'h-4 w-4 shrink-0',
                                        isRegionSelected ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'
                                      )} />
                                      <span className={cn(
                                        'text-sm',
                                        isRegionSelected && 'font-medium text-purple-700 dark:text-purple-300'
                                      )}>
                                        {region.region_name}
                                      </span>
                                      {showCounts && (
                                        <Badge variant="secondary" className="ml-auto text-xs">
                                          {region.branch_count}B
                                        </Badge>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Click to filter by {region.region_name} region</p>
                                    {showCounts && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {region.branch_count} branches
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </div>

                              {/* Branches (when region expanded) */}
                              {isRegionExpanded && branches.length > 0 && (
                                <div className="ml-6 mt-1 space-y-0.5">
                                  {branches.map((branch) => {
                                    const isBranchSelected = organizationFilters.selectedBranch === branch.branch_code

                                    return (
                                      <Tooltip key={branch.branch_code} delayDuration={300}>
                                        <TooltipTrigger asChild>
                                          <div
                                            className={cn(
                                              'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                                              'hover:bg-muted/50',
                                              isBranchSelected && 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                                            )}
                                            onClick={() => selectBranch(branch.branch_code)}
                                          >
                                            <Building2 className={cn(
                                              'h-3.5 w-3.5 shrink-0 ml-4',
                                              isBranchSelected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                                            )} />
                                            <span className={cn(
                                              'text-sm',
                                              isBranchSelected && 'font-medium text-green-700 dark:text-green-300'
                                            )}>
                                              {branch.branch_name}
                                            </span>
                                            <span className="ml-auto text-xs text-muted-foreground">
                                              {branch.city}, {branch.state}
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Click to filter by {branch.branch_name}</p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {branch.city}, {branch.state} • {branch.brand}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer Stats */}
        {showCounts && !isLoading && (
          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
            <span>
              {filteredMarkets.length} {filteredMarkets.length === 1 ? 'market' : 'markets'}
            </span>
            {hasActiveFilters && (
              <span className="font-medium">
                Filtered view active
              </span>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
