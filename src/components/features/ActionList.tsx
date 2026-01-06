"use client"

import Link from 'next/link'
import { ActionItem } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import {
  AlertTriangle, Clock, DollarSign, User,
  ChevronRight, Zap, Target
} from 'lucide-react'

interface ActionListProps {
  actions: ActionItem[]
  title?: string
  maxItems?: number
  showViewAll?: boolean
  type?: ActionItem['type']
}

export function ActionList({
  actions,
  title = 'Priority Actions',
  maxItems = 10,
  showViewAll = true,
  type
}: ActionListProps) {
  const filteredActions = type ? actions.filter(a => a.type === type) : actions
  const displayActions = filteredActions.slice(0, maxItems)

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
          <div className="text-center py-8 text-gray-500">
            <Zap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
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
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {displayActions.map((action) => (
            <Link
              key={action.id}
              href={getActionLink(action)}
              className="block hover:bg-gray-50 transition-colors"
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
                    <h4 className="font-medium text-sm truncate">{action.title}</h4>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
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

                <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                  <span className="font-medium text-blue-700">Next Best Action: </span>
                  <span className="text-blue-600">{action.nextBestAction}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {showViewAll && filteredActions.length > maxItems && (
          <div className="p-4 border-t bg-gray-50">
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/kpi/stalled_opps">
                View all {filteredActions.length} actions
                <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
