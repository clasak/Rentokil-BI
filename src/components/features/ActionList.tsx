"use client"

import { useState } from 'react'
import Link from 'next/link'
import { ActionItem } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  AlertTriangle, Clock, DollarSign, User,
  ChevronRight, Zap, Target, Filter, ArrowUpDown
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type FilterOption = 'all' | 'critical' | 'high' | 'collections' | 'stalled'

// Tooltip descriptions for each filter type
const FILTER_TOOLTIPS: Record<FilterOption, string> = {
  all: 'Show all priority actions',
  critical: 'Requires immediate action - significant financial impact',
  high: 'Should be addressed within 24-48 hours',
  collections: 'Accounts with outstanding AR issues',
  stalled: 'Opportunities with no activity for 7+ days',
}

interface ActionListProps {
  actions: ActionItem[]
  title?: string
  maxItems?: number
  showViewAll?: boolean
  type?: ActionItem['type']
  viewAllHref?: string
  showFilters?: boolean
}

export function ActionList({
  actions,
  title = 'Priority Actions',
  maxItems = 10,
  showViewAll = true,
  type,
  viewAllHref,
  showFilters = true
}: ActionListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all')

  // Apply type filter first (from props)
  const typeFilteredActions = type ? actions.filter(a => a.type === type) : actions

  // Apply UI filter chips
  const filteredActions = typeFilteredActions.filter(action => {
    switch (activeFilter) {
      case 'critical':
        return action.severity === 'critical'
      case 'high':
        return action.severity === 'high'
      case 'collections':
        return action.type === 'collection_priority'
      case 'stalled':
        return action.type === 'stalled_opp'
      default:
        return true
    }
  })

  // Sort by: severity (critical first), then by financial impact (highest first)
  const sortedActions = [...filteredActions].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    return b.financialImpact - a.financialImpact
  })

  const displayActions = sortedActions.slice(0, maxItems)

  const filterOptions: { key: FilterOption; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: typeFilteredActions.length },
    { key: 'critical', label: 'Critical', count: typeFilteredActions.filter(a => a.severity === 'critical').length },
    { key: 'high', label: 'High', count: typeFilteredActions.filter(a => a.severity === 'high').length },
    { key: 'collections', label: 'Collections', count: typeFilteredActions.filter(a => a.type === 'collection_priority').length },
    { key: 'stalled', label: 'Stalled', count: typeFilteredActions.filter(a => a.type === 'stalled_opp').length },
  ]

  const getSeverityColor = (severity: ActionItem['severity']) => {
    switch (severity) {
      case 'critical': return 'danger'
      case 'high': return 'warning'
      case 'medium': return 'secondary'
      default: return 'outline'
    }
  }

  const getTypeLabel = (actionType: ActionItem['type']) => {
    switch (actionType) {
      case 'stalled_opp': return 'Stalled Opp'
      case 'at_risk_account': return 'At-Risk Account'
      case 'capacity_pressure': return 'Capacity'
      case 'collection_priority': return 'Collections'
      default: return actionType
    }
  }

  const getActionLink = (action: ActionItem) => {
    switch (action.entityType) {
      case 'opportunity': return `/sales/opportunity/${action.entityId}`
      case 'account': return `/account/${action.entityId}`
      case 'invoice': return `/finance/invoice/${action.entityId}`
      case 'branch': return `/ops`
      default: return '#'
    }
  }

  const getViewAllLink = () => {
    if (viewAllHref) return viewAllHref
    // Default view all links based on action type
    switch (type) {
      case 'stalled_opp': return '/sales'
      case 'at_risk_account': return '/ops'
      case 'collection_priority': return '/finance'
      case 'capacity_pressure': return '/ops'
      default: return '/'
    }
  }

  if (displayActions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Zap className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p>No priority actions at this time</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            {title}
          </CardTitle>
          <Badge variant="outline">
            {filteredActions.length} items
          </Badge>
        </div>

        {/* Filter Chips */}
        {showFilters && !type && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map(option => (
                <Tooltip key={option.key}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setActiveFilter(option.key)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                        activeFilter === option.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                      )}
                      aria-label={`${option.label}: ${FILTER_TOOLTIPS[option.key]}`}
                    >
                      {option.label}
                      <span className={cn(
                        "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]",
                        activeFilter === option.key
                          ? "bg-primary-foreground/20"
                          : "bg-gray-200 dark:bg-gray-700"
                      )}>
                        {option.count}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">{FILTER_TOOLTIPS[option.key]}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <ArrowUpDown className="h-3 w-3" />
              Sorted by severity, then by $ impact
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {displayActions.map((action) => (
            <Link
              key={action.id}
              href={getActionLink(action)}
              className="block hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(action.severity)} className="text-xs">
                        {action.severity}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getTypeLabel(action.type)}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm truncate text-gray-900 dark:text-white" title={action.title}>{action.title}</h4>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {action.owner}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(action.financialImpact)}
                      </span>
                      {action.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due {action.dueDate.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </div>

                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-xs">
                  <span className="font-medium text-blue-700 dark:text-blue-300">Next Best Action: </span>
                  <span
                    className="text-blue-600 dark:text-blue-400 line-clamp-2"
                    title={action.nextBestAction}
                  >
                    {action.nextBestAction}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {showViewAll && sortedActions.length > maxItems && (
          <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <Button variant="ghost" className="w-full" asChild>
              <Link href={getViewAllLink()}>
                View all {sortedActions.length} actions
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
