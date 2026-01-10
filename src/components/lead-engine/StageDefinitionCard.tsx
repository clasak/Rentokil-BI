"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { StageDefinition, LeadStage } from '@/lib/lead-engine-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronDown, ChevronUp, Clock, User, CheckCircle,
  AlertTriangle, XCircle, FileText, Zap, Mail
} from 'lucide-react'

interface StageDefinitionCardProps {
  definition: StageDefinition
  className?: string
  defaultExpanded?: boolean
}

const stageIcons: Record<LeadStage, typeof Clock> = {
  lead_intake: FileText,
  sales_handoff: Mail,
  sales_process: User,
  start_packet: FileText,
  ops_handoff: Mail,
  service_delivery: CheckCircle
}

export function StageDefinitionCard({
  definition,
  className,
  defaultExpanded = false
}: StageDefinitionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const Icon = stageIcons[definition.id]

  const formatHours = (hours: number) => {
    if (hours >= 24) {
      const days = hours / 24
      return `${days} day${days !== 1 ? 's' : ''}`
    }
    return `${hours} hours`
  }

  return (
    <Card className={cn(
      'transition-all',
      definition.isHandoffStage && 'border-orange-300 dark:border-orange-700 border-dashed',
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              definition.isHandoffStage
                ? 'bg-orange-100 dark:bg-orange-900/30'
                : 'bg-blue-100 dark:bg-blue-900/30'
            )}>
              <Icon className={cn(
                'h-5 w-5',
                definition.isHandoffStage
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-blue-600 dark:text-blue-400'
              )} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {definition.name}
                {definition.isHandoffStage && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                    Manual Handoff
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {definition.owner}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {definition.description}
        </p>

        {/* Time Thresholds */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">
              <span className="text-gray-500">Target:</span>{' '}
              <span className="font-medium">{formatHours(definition.targetHours)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">
              <span className="text-gray-500">At Risk:</span>{' '}
              <span className="font-medium">{formatHours(definition.atRiskThresholdHours)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm">
              <span className="text-gray-500">Critical:</span>{' '}
              <span className="font-medium">{formatHours(definition.criticalThresholdHours)}</span>
            </span>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="pt-4 border-t space-y-4">
            {/* Entry & Exit Criteria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">
                  Entry Criteria
                </h4>
                <ul className="space-y-1">
                  {definition.entryCriteria.map((criteria, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      {criteria}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">
                  Exit Criteria
                </h4>
                <ul className="space-y-1">
                  {definition.exitCriteria.map((criteria, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      {criteria}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Required Fields */}
            <div>
              <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">
                Required Fields
              </h4>
              <div className="flex flex-wrap gap-2">
                {definition.requiredFields.map((field, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Automation Opportunities */}
            {definition.automationOpportunities.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-medium text-sm mb-2 text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Automation Opportunities
                </h4>
                <ul className="space-y-1">
                  {definition.automationOpportunities.map((opp, i) => (
                    <li key={i} className="text-sm text-yellow-700 dark:text-yellow-400 flex items-start gap-2">
                      <span className="mt-1">→</span>
                      {opp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
