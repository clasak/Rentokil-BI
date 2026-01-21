"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Filter, ChevronDown, RotateCcw } from 'lucide-react'
import type {
  RTXFilters,
  HierarchyFilter,
  ServiceLineFilter,
  GranularityLevel,
} from '@/types/filters'

interface FilterBarProps {
  filters: RTXFilters
  onFiltersChange: (filters: RTXFilters) => void
  regions?: { id: string; name: string }[]
  markets?: { id: string; name: string }[]
  branches?: { id: string; name: string }[]
  className?: string
}

export function FilterBar({
  filters,
  onFiltersChange,
  regions = [],
  markets = [],
  branches = [],
  className,
}: FilterBarProps) {
  const [hierarchyOpen, setHierarchyOpen] = useState(false)
  const [serviceLineOpen, setServiceLineOpen] = useState(false)

  const handleGranularityChange = (granularity: GranularityLevel) => {
    onFiltersChange({
      ...filters,
      granularity
    })
  }

  const handleHierarchyChange = (key: keyof HierarchyFilter, values: string[]) => {
    onFiltersChange({
      ...filters,
      hierarchy: {
        ...filters.hierarchy,
        [key]: values
      }
    })
  }

  const handleServiceLineChange = (key: keyof ServiceLineFilter, value: boolean) => {
    onFiltersChange({
      ...filters,
      serviceLine: {
        ...filters.serviceLine,
        [key]: value
      }
    })
  }

  const handleReset = () => {
    onFiltersChange({
      ...filters,
      hierarchy: {
        regionIds: [],
        marketIds: [],
        branchIds: [],
        teamIds: [],
        repIds: [],
        technicianIds: []
      },
      serviceLine: {
        pestControl: true,
        termite: true,
        wildlife: true,
        mosquito: true,
        bedBug: true,
        commercial: true,
        residential: true
      }
    })
  }

  const activeFilterCount = [
    ...filters.hierarchy.regionIds,
    ...filters.hierarchy.marketIds,
    ...filters.hierarchy.branchIds,
  ].length + (
    Object.values(filters.serviceLine).filter(v => !v).length
  )

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      {/* Granularity Select */}
      <Select value={filters.granularity} onValueChange={handleGranularityChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Level" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="region">Region</SelectItem>
          <SelectItem value="market">Market</SelectItem>
          <SelectItem value="branch">Branch</SelectItem>
          <SelectItem value="team">Team</SelectItem>
          <SelectItem value="individual">Individual</SelectItem>
        </SelectContent>
      </Select>

      {/* Hierarchy Filter */}
      <Popover open={hierarchyOpen} onOpenChange={setHierarchyOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Location
            {(filters.hierarchy.regionIds.length > 0 ||
              filters.hierarchy.marketIds.length > 0 ||
              filters.hierarchy.branchIds.length > 0) && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {filters.hierarchy.regionIds.length +
                  filters.hierarchy.marketIds.length +
                  filters.hierarchy.branchIds.length}
              </span>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Regions</Label>
              <div className="mt-2 max-h-32 overflow-auto space-y-2">
                {regions.map(region => (
                  <div key={region.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`region-${region.id}`}
                      checked={filters.hierarchy.regionIds.includes(region.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleHierarchyChange('regionIds', [...filters.hierarchy.regionIds, region.id])
                        } else {
                          handleHierarchyChange('regionIds', filters.hierarchy.regionIds.filter(id => id !== region.id))
                        }
                      }}
                    />
                    <Label htmlFor={`region-${region.id}`} className="text-sm">
                      {region.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Markets</Label>
              <div className="mt-2 max-h-32 overflow-auto space-y-2">
                {markets.map(market => (
                  <div key={market.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`market-${market.id}`}
                      checked={filters.hierarchy.marketIds.includes(market.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleHierarchyChange('marketIds', [...filters.hierarchy.marketIds, market.id])
                        } else {
                          handleHierarchyChange('marketIds', filters.hierarchy.marketIds.filter(id => id !== market.id))
                        }
                      }}
                    />
                    <Label htmlFor={`market-${market.id}`} className="text-sm">
                      {market.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Branches</Label>
              <div className="mt-2 max-h-32 overflow-auto space-y-2">
                {branches.map(branch => (
                  <div key={branch.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`branch-${branch.id}`}
                      checked={filters.hierarchy.branchIds.includes(branch.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleHierarchyChange('branchIds', [...filters.hierarchy.branchIds, branch.id])
                        } else {
                          handleHierarchyChange('branchIds', filters.hierarchy.branchIds.filter(id => id !== branch.id))
                        }
                      }}
                    />
                    <Label htmlFor={`branch-${branch.id}`} className="text-sm">
                      {branch.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Service Line Filter */}
      <Popover open={serviceLineOpen} onOpenChange={setServiceLineOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            Service Lines
            {Object.values(filters.serviceLine).some(v => !v) && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {Object.values(filters.serviceLine).filter(v => v).length}
              </span>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="start">
          <div className="space-y-2">
            {[
              { key: 'pestControl' as const, label: 'Pest Control' },
              { key: 'termite' as const, label: 'Termite' },
              { key: 'wildlife' as const, label: 'Wildlife' },
              { key: 'mosquito' as const, label: 'Mosquito' },
              { key: 'bedBug' as const, label: 'Bed Bug' },
              { key: 'commercial' as const, label: 'Commercial' },
              { key: 'residential' as const, label: 'Residential' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`service-${key}`}
                  checked={filters.serviceLine[key]}
                  onCheckedChange={(checked) => handleServiceLineChange(key, checked as boolean)}
                />
                <Label htmlFor={`service-${key}`} className="text-sm">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Reset Button */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      )}
    </div>
  )
}
