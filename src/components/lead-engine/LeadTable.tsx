"use client"

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Lead, LeadStage, HealthStatus, RiskReason, STAGE_CONFIG } from '@/lib/lead-engine-data'
import { StageBadge } from './StageBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  ChevronUp, ChevronDown, Search, Filter, ExternalLink
} from 'lucide-react'

interface LeadTableProps {
  leads: Lead[]
  showFilters?: boolean
  defaultStageFilter?: LeadStage | 'all'
  defaultHealthFilter?: HealthStatus | 'all'
  onLeadClick?: (lead: Lead) => void
  className?: string
}

type SortField = 'id' | 'companyName' | 'currentStage' | 'daysInStage' | 'healthStatus' | 'owner' | 'estimatedValue'
type SortDirection = 'asc' | 'desc'

const riskReasonLabels: Record<RiskReason, string> = {
  exceeded_sla: 'Exceeded SLA',
  no_activity: 'No Activity',
  missing_data: 'Missing Data',
  handoff_delayed: 'Handoff Delayed',
  reassignment_pending: 'Reassignment Pending'
}

export function LeadTable({
  leads,
  showFilters = true,
  defaultStageFilter = 'all',
  defaultHealthFilter = 'all',
  onLeadClick,
  className
}: LeadTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState<LeadStage | 'all'>(defaultStageFilter)
  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'all'>(defaultHealthFilter)
  const [sortField, setSortField] = useState<SortField>('daysInStage')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(lead =>
        lead.id.toLowerCase().includes(query) ||
        lead.companyName.toLowerCase().includes(query) ||
        lead.contactName.toLowerCase().includes(query) ||
        lead.owner.toLowerCase().includes(query)
      )
    }

    // Apply stage filter
    if (stageFilter !== 'all') {
      result = result.filter(lead => lead.currentStage === stageFilter)
    }

    // Apply health filter
    if (healthFilter !== 'all') {
      result = result.filter(lead => lead.healthStatus === healthFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'id':
          comparison = a.id.localeCompare(b.id)
          break
        case 'companyName':
          comparison = a.companyName.localeCompare(b.companyName)
          break
        case 'currentStage':
          comparison = a.currentStage.localeCompare(b.currentStage)
          break
        case 'daysInStage':
          comparison = a.hoursInStage - b.hoursInStage
          break
        case 'healthStatus':
          const healthOrder = { critical: 0, at_risk: 1, healthy: 2 }
          comparison = healthOrder[a.healthStatus] - healthOrder[b.healthStatus]
          break
        case 'owner':
          comparison = a.owner.localeCompare(b.owner)
          break
        case 'estimatedValue':
          comparison = a.estimatedValue - b.estimatedValue
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [leads, searchQuery, stageFilter, healthFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4 inline" />
      : <ChevronDown className="h-4 w-4 inline" />
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by ID, company, contact, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as LeadStage | 'all')}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {Object.values(STAGE_CONFIG).map(config => (
                <SelectItem key={config.id} value={config.id}>
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={healthFilter} onValueChange={(v) => setHealthFilter(v as HealthStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Health" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Health</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredAndSortedLeads.length} of {leads.length} leads
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSort('id')}
              >
                Lead ID <SortIcon field="id" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSort('companyName')}
              >
                Company <SortIcon field="companyName" />
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSort('currentStage')}
              >
                Stage <SortIcon field="currentStage" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-right"
                onClick={() => handleSort('daysInStage')}
              >
                Time in Stage <SortIcon field="daysInStage" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSort('healthStatus')}
              >
                Health <SortIcon field="healthStatus" />
              </TableHead>
              <TableHead>Risk Reason(s)</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => handleSort('owner')}
              >
                Owner <SortIcon field="owner" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 text-right min-w-[90px]"
                onClick={() => handleSort('estimatedValue')}
              >
                Value <SortIcon field="estimatedValue" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No leads match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedLeads.map(lead => (
                <TableRow
                  key={lead.id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    lead.healthStatus === 'critical' && 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20',
                    lead.healthStatus === 'at_risk' && 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20',
                    lead.healthStatus === 'healthy' && 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                  onClick={() => onLeadClick?.(lead)}
                >
                  <TableCell className="font-mono text-sm">
                    {lead.id}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{lead.companyName}</div>
                    <div className="text-xs text-gray-500">{lead.propertyType}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{lead.contactName}</div>
                    <div className="text-xs text-gray-500">{lead.contactPhone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {STAGE_CONFIG[lead.currentStage].shortName}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      'font-medium',
                      lead.healthStatus === 'critical' && 'text-red-600 dark:text-red-400',
                      lead.healthStatus === 'at_risk' && 'text-yellow-600 dark:text-yellow-400'
                    )}>
                      {lead.hoursInStage < 24
                        ? `${Math.round(lead.hoursInStage)}h`
                        : `${lead.daysInStage}d`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StageBadge status={lead.healthStatus} size="sm" />
                  </TableCell>
                  <TableCell>
                    {lead.riskReasons.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.riskReasons.slice(0, 2).map(reason => (
                          <Badge
                            key={reason}
                            variant="outline"
                            className={cn(
                              'text-xs',
                              lead.healthStatus === 'critical'
                                ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-400'
                                : 'border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-400'
                            )}
                          >
                            {riskReasonLabels[reason]}
                          </Badge>
                        ))}
                        {lead.riskReasons.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{lead.riskReasons.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{lead.owner}</div>
                    <div className="text-xs text-gray-500">{lead.ownerRole}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {formatCurrency(lead.estimatedValue)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
