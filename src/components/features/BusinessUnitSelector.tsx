"use client"

import { useState } from 'react'
import {
  BusinessUnitId,
  BusinessUnit,
  getAllBusinessUnits,
  getBusinessUnit,
  formatRevenue,
  BUSINESS_UNITS
} from '@/lib/business-units'
import { useAppStore } from '@/store'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Building2, ChevronDown, MapPin, Users, Briefcase,
  DollarSign, Check, Info
} from 'lucide-react'

interface BusinessUnitSelectorProps {
  className?: string
  showDetails?: boolean
  variant?: 'dropdown' | 'compact' | 'full'
}

export function BusinessUnitSelector({
  className,
  showDetails = false,
  variant = 'dropdown'
}: BusinessUnitSelectorProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)

  // In production, this would come from Zustand store
  // For now, default to 'rentokil'
  const [selectedUnit, setSelectedUnit] = useState<BusinessUnitId>('rentokil')

  const currentUnit = getBusinessUnit(selectedUnit)
  const allUnits = getAllBusinessUnits()

  const handleUnitChange = (value: string) => {
    setSelectedUnit(value as BusinessUnitId)
    // In production: update Zustand store, trigger data refetch
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: currentUnit?.color }}
        />
        <span className="text-sm font-medium">{currentUnit?.shortName}</span>
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Business Unit</h3>
          <Button variant="outline" size="sm" onClick={() => setDetailsOpen(true)}>
            <Info className="h-4 w-4 mr-1" />
            View All Units
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {allUnits.map(unit => (
            <Card
              key={unit.id}
              className={`cursor-pointer transition-all ${
                selectedUnit === unit.id
                  ? 'ring-2 ring-primary'
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleUnitChange(unit.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: unit.color }}
                    />
                    <span className="font-medium">{unit.shortName}</span>
                  </div>
                  {selectedUnit === unit.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {unit.region}
                </div>
                <div className="mt-1 text-sm font-semibold text-green-600">
                  {formatRevenue(unit.metrics.annualRevenue)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <BusinessUnitDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          selectedUnit={selectedUnit}
          onSelect={handleUnitChange}
        />
      </div>
    )
  }

  // Default dropdown variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={selectedUnit} onValueChange={handleUnitChange}>
        <SelectTrigger className="w-[200px]">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: currentUnit?.color }}
            />
            <SelectValue placeholder="Select business unit" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Business Units</SelectLabel>
            {allUnits.filter(u => u.id !== 'all').map(unit => (
              <SelectItem key={unit.id} value={unit.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: unit.color }}
                  />
                  <span>{unit.shortName}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {unit.metrics.marketShare}%
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Consolidated</SelectLabel>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3" />
                <span>All Business Units</span>
              </div>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {showDetails && currentUnit && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Info className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: currentUnit.color }}
                />
                {currentUnit.name}
              </DialogTitle>
              <DialogDescription>{currentUnit.description}</DialogDescription>
            </DialogHeader>
            <BusinessUnitDetails unit={currentUnit} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function BusinessUnitDetails({ unit }: { unit: BusinessUnit }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <div>
            <div className="text-xs text-gray-500">Region</div>
            <div className="font-medium">{unit.region}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <div>
            <div className="text-xs text-gray-500">Headquarters</div>
            <div className="font-medium">{unit.headquarters}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold">{unit.metrics.branches}</div>
          <div className="text-xs text-gray-500">Branches</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{unit.metrics.technicians.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Technicians</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{(unit.metrics.accounts / 1000).toFixed(0)}K</div>
          <div className="text-xs text-gray-500">Accounts</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{formatRevenue(unit.metrics.annualRevenue)}</div>
          <div className="text-xs text-gray-500">Revenue</div>
        </div>
      </div>

      <div className="pt-4 border-t">
        <div className="text-sm font-medium mb-2">Available Features</div>
        <div className="flex flex-wrap gap-2">
          {unit.features.hasLeadEngine && <Badge variant="secondary">Lead Engine</Badge>}
          {unit.features.hasForecast && <Badge variant="secondary">Forecasting</Badge>}
          {unit.features.hasGovernance && <Badge variant="secondary">Governance</Badge>}
          {unit.features.hasFieldService && <Badge variant="secondary">Field Service</Badge>}
          {unit.features.hasFinance && <Badge variant="secondary">Finance</Badge>}
          {unit.features.hasPdfParser && <Badge variant="secondary">PDF Parser</Badge>}
        </div>
      </div>
    </div>
  )
}

function BusinessUnitDetailsDialog({
  open,
  onOpenChange,
  selectedUnit,
  onSelect
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUnit: BusinessUnitId
  onSelect: (id: string) => void
}) {
  const units = getAllBusinessUnits().filter(u => u.id !== 'all')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Rentokil North America Business Units</DialogTitle>
          <DialogDescription>
            Select a business unit to filter dashboard data. Each unit has its own
            data partitioning and feature availability.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
          {units.map(unit => (
            <Card
              key={unit.id}
              className={`cursor-pointer transition-all ${
                selectedUnit === unit.id
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:shadow-md'
              }`}
              onClick={() => {
                onSelect(unit.id)
                onOpenChange(false)
              }}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: unit.color }}
                      />
                      <span className="font-semibold">{unit.name}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{unit.description}</div>
                  </div>
                  {selectedUnit === unit.id && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <div className="font-bold">{unit.metrics.branches}</div>
                    <div className="text-xs text-gray-500">Branches</div>
                  </div>
                  <div>
                    <div className="font-bold">{unit.metrics.technicians.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Techs</div>
                  </div>
                  <div>
                    <div className="font-bold">{(unit.metrics.accounts / 1000).toFixed(0)}K</div>
                    <div className="text-xs text-gray-500">Accounts</div>
                  </div>
                  <div>
                    <div className="font-bold text-green-600">{formatRevenue(unit.metrics.annualRevenue)}</div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  {unit.region} • {unit.headquarters}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onSelect('all')
              onOpenChange(false)
            }}
          >
            <Building2 className="h-4 w-4 mr-2" />
            View Consolidated (All Business Units)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
