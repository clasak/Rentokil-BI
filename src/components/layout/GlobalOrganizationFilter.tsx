'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapPin, Building, Building2, ChevronRight, X, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
  const [marketOpen, setMarketOpen] = useState(false)
  const [regionOpen, setRegionOpen] = useState(false)
  const [branchOpen, setBranchOpen] = useState(false)

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
  const availableMarkets = useMemo(() => {
    if (!userScope.markets.length || userScope.markets[0] === '') {
      return markets
    }

    const filtered = markets.filter(m =>
      userScope.markets.includes(m.market_code) ||
      userScope.markets.includes(m.market_name) ||
      userScope.markets.some(code =>
        code.toLowerCase() === m.market_code.toLowerCase() ||
        code.toLowerCase() === m.market_name.toLowerCase()
      )
    )

    if (filtered.length === 0 && markets.length > 0) {
      return markets
    }

    return filtered
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
    return (
      <div className={cn('flex items-center gap-1 text-sm', className)}>
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* Market Combobox */}
        <Popover open={marketOpen} onOpenChange={setMarketOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={marketOpen}
              className="h-8 w-auto min-w-[100px] max-w-[160px] justify-between px-2 font-normal"
              disabled={isLoading}
            >
              <span className="truncate">
                {selectedMarketName || 'All Markets'}
              </span>
              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search markets..." />
              <CommandList>
                <CommandEmpty>No market found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all-markets"
                    onSelect={() => {
                      setOrganizationMarket(null)
                      setMarketOpen(false)
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', !selectedMarket ? 'opacity-100' : 'opacity-0')} />
                    All Markets
                  </CommandItem>
                  {availableMarkets
                    .filter(m => m.market_code && m.market_code.trim() !== '')
                    .map((market) => (
                      <CommandItem
                        key={market.market_code}
                        value={market.market_name}
                        onSelect={() => {
                          setOrganizationMarket(
                            market.market_code === selectedMarket ? null : market.market_code
                          )
                          setMarketOpen(false)
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', selectedMarket === market.market_code ? 'opacity-100' : 'opacity-0')} />
                        {market.market_name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Region Combobox (only if market selected) */}
        {showRegion && selectedMarket && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Popover open={regionOpen} onOpenChange={setRegionOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  role="combobox"
                  aria-expanded={regionOpen}
                  className="h-8 w-auto min-w-[100px] max-w-[160px] justify-between px-2 font-normal"
                  disabled={isLoading || availableRegions.length === 0}
                >
                  <span className="truncate">
                    {selectedRegionName || 'All Regions'}
                  </span>
                  <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search regions..." />
                  <CommandList>
                    <CommandEmpty>No region found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all-regions"
                        onSelect={() => {
                          setOrganizationRegion(null)
                          setRegionOpen(false)
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', !selectedRegion ? 'opacity-100' : 'opacity-0')} />
                        All Regions
                      </CommandItem>
                      {availableRegions
                        .filter(r => r.region_code && r.region_code.trim() !== '')
                        .map((region) => (
                          <CommandItem
                            key={region.region_code}
                            value={region.region_name}
                            onSelect={() => {
                              setOrganizationRegion(
                                region.region_code === selectedRegion ? null : region.region_code
                              )
                              setRegionOpen(false)
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', selectedRegion === region.region_code ? 'opacity-100' : 'opacity-0')} />
                            {region.region_name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* Branch Combobox (only if region selected) */}
        {showBranch && selectedRegion && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Popover open={branchOpen} onOpenChange={setBranchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  role="combobox"
                  aria-expanded={branchOpen}
                  className="h-8 w-auto min-w-[100px] max-w-[160px] justify-between px-2 font-normal"
                  disabled={isLoading || availableBranches.length === 0}
                >
                  <span className="truncate">
                    {selectedBranchName || 'All Branches'}
                  </span>
                  <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search branches..." />
                  <CommandList>
                    <CommandEmpty>No branch found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all-branches"
                        onSelect={() => {
                          setOrganizationBranch(null)
                          setBranchOpen(false)
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', !selectedBranch ? 'opacity-100' : 'opacity-0')} />
                        All Branches
                      </CommandItem>
                      {availableBranches
                        .filter(b => b.branch_code && b.branch_code.trim() !== '')
                        .map((branch) => (
                          <CommandItem
                            key={branch.branch_code}
                            value={`${branch.branch_name} ${branch.city} ${branch.state}`}
                            onSelect={() => {
                              setOrganizationBranch(
                                branch.branch_code === selectedBranch ? null : branch.branch_code
                              )
                              setBranchOpen(false)
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', selectedBranch === branch.branch_code ? 'opacity-100' : 'opacity-0')} />
                            <span className="truncate">{branch.branch_name}</span>
                            <span className="ml-auto text-xs text-muted-foreground shrink-0">
                              {branch.city}, {branch.state}
                            </span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
      {/* Market Combobox */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Market</label>
        <Popover open={marketOpen} onOpenChange={setMarketOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={marketOpen}
              className="w-[180px] justify-between font-normal"
              disabled={isLoading}
            >
              <div className="flex items-center gap-2 truncate">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{selectedMarketName || 'All Markets'}</span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0">
            <Command>
              <CommandInput placeholder="Search markets..." />
              <CommandList>
                <CommandEmpty>No market found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all-markets"
                    onSelect={() => {
                      setOrganizationMarket(null)
                      setMarketOpen(false)
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', !selectedMarket ? 'opacity-100' : 'opacity-0')} />
                    All Markets
                  </CommandItem>
                  {availableMarkets
                    .filter(m => m.market_code && m.market_code.trim() !== '')
                    .map((market) => (
                      <CommandItem
                        key={market.market_code}
                        value={market.market_name}
                        onSelect={() => {
                          setOrganizationMarket(
                            market.market_code === selectedMarket ? null : market.market_code
                          )
                          setMarketOpen(false)
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', selectedMarket === market.market_code ? 'opacity-100' : 'opacity-0')} />
                        {market.market_name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Region Combobox */}
      {showRegion && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Region</label>
          <Popover open={regionOpen} onOpenChange={setRegionOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={regionOpen}
                className={cn('w-[180px] justify-between font-normal', !selectedMarket && 'opacity-50')}
                disabled={isLoading || !selectedMarket}
              >
                <div className="flex items-center gap-2 truncate">
                  <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{selectedRegionName || (selectedMarket ? 'All Regions' : 'Select Market First')}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0">
              <Command>
                <CommandInput placeholder="Search regions..." />
                <CommandList>
                  <CommandEmpty>No region found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all-regions"
                      onSelect={() => {
                        setOrganizationRegion(null)
                        setRegionOpen(false)
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', !selectedRegion ? 'opacity-100' : 'opacity-0')} />
                      All Regions
                    </CommandItem>
                    {availableRegions
                      .filter(r => r.region_code && r.region_code.trim() !== '')
                      .map((region) => (
                        <CommandItem
                          key={region.region_code}
                          value={region.region_name}
                          onSelect={() => {
                            setOrganizationRegion(
                              region.region_code === selectedRegion ? null : region.region_code
                            )
                            setRegionOpen(false)
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', selectedRegion === region.region_code ? 'opacity-100' : 'opacity-0')} />
                          {region.region_name}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Branch Combobox */}
      {showBranch && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Branch</label>
          <Popover open={branchOpen} onOpenChange={setBranchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={branchOpen}
                className={cn('w-[180px] justify-between font-normal', !selectedRegion && 'opacity-50')}
                disabled={isLoading || !selectedRegion}
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{selectedBranchName || (selectedRegion ? 'All Branches' : 'Select Region First')}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
              <Command>
                <CommandInput placeholder="Search branches..." />
                <CommandList>
                  <CommandEmpty>No branch found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all-branches"
                      onSelect={() => {
                        setOrganizationBranch(null)
                        setBranchOpen(false)
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', !selectedBranch ? 'opacity-100' : 'opacity-0')} />
                      All Branches
                    </CommandItem>
                    {availableBranches
                      .filter(b => b.branch_code && b.branch_code.trim() !== '')
                      .map((branch) => (
                        <CommandItem
                          key={branch.branch_code}
                          value={`${branch.branch_name} ${branch.city} ${branch.state}`}
                          onSelect={() => {
                            setOrganizationBranch(
                              branch.branch_code === selectedBranch ? null : branch.branch_code
                            )
                            setBranchOpen(false)
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', selectedBranch === branch.branch_code ? 'opacity-100' : 'opacity-0')} />
                          <span className="truncate">{branch.branch_name}</span>
                          <span className="ml-auto text-xs text-muted-foreground shrink-0">
                            {branch.city}, {branch.state}
                          </span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
