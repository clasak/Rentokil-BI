"use client"

import { cn } from '@/lib/utils'
import { INTEGRATION_SOURCES, IntegrationSource } from '@/lib/lead-engine-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Database, Cloud, FileText, Table2, ArrowRight, ArrowDown, CheckCircle,
  Clock, AlertTriangle, Loader2
} from 'lucide-react'

interface DataFlowDiagramProps {
  className?: string
}

const statusConfig: Record<IntegrationSource['status'], {
  label: string
  icon: typeof CheckCircle
  color: string
  bgColor: string
}> = {
  active: {
    label: 'Active',
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  pending_access: {
    label: 'Pending Access',
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
  },
  access_requested: {
    label: 'Access Requested',
    icon: Loader2,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  ready: {
    label: 'Ready',
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  planned: {
    label: 'Planned',
    icon: AlertTriangle,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800'
  }
}

const systemIcons: Record<string, typeof Database> = {
  'CRM': Cloud,
  'Data Warehouse': Database,
  'Document Processing': FileText,
  'Internal Spreadsheet': Table2
}

export function DataFlowDiagram({ className }: DataFlowDiagramProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Data Flow Architecture</CardTitle>
        <CardDescription>How data flows through the Lead Service Engine</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Diagram */}
        <div className="relative py-8">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-center gap-4">
            {/* Source Systems */}
            <div className="flex flex-col gap-3">
              {INTEGRATION_SOURCES.slice(0, 2).map((source) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>

            {/* Arrow */}
            <ArrowRight className="h-8 w-8 text-gray-300 flex-shrink-0" />

            {/* Central Hub */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-rentokil-red to-rentokil-darkred text-white text-center min-w-[200px]">
              <Database className="h-8 w-8 mx-auto mb-2" />
              <div className="font-bold text-lg">Lead Service Engine</div>
              <div className="text-sm opacity-80">Central Processing</div>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-8 w-8 text-gray-300 flex-shrink-0" />

            {/* More Source Systems */}
            <div className="flex flex-col gap-3">
              {INTEGRATION_SOURCES.slice(2).map((source) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-4">
            {/* Source Systems */}
            <div className="grid grid-cols-2 gap-3">
              {INTEGRATION_SOURCES.map((source) => (
                <SourceCard key={source.id} source={source} compact />
              ))}
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowDown className="h-6 w-6 text-gray-300" />
            </div>

            {/* Central Hub */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-rentokil-red to-rentokil-darkred text-white text-center">
              <Database className="h-6 w-6 mx-auto mb-2" />
              <div className="font-bold">Lead Service Engine</div>
              <div className="text-sm opacity-80">Central Processing</div>
            </div>
          </div>
        </div>

        {/* Flow Description */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-4">Data Flow Process</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="font-medium text-sm mb-2">1. Ingest</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Lead data flows from Salesforce and other sources into the central engine
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="font-medium text-sm mb-2">2. Process</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Data is validated, enriched, and stage status is calculated in real-time
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="font-medium text-sm mb-2">3. Output</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Metrics, alerts, and reports are generated for dashboards and notifications
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SourceCard({ source, compact = false }: { source: IntegrationSource; compact?: boolean }) {
  const config = statusConfig[source.status]
  const StatusIcon = config.icon
  const SystemIcon = systemIcons[source.system] || Database

  return (
    <div className={cn(
      'border rounded-lg transition-all',
      source.status === 'active' && 'border-green-300 dark:border-green-700',
      source.status === 'pending_access' && 'border-yellow-300 dark:border-yellow-700',
      source.status === 'access_requested' && 'border-blue-300 dark:border-blue-700',
      source.status === 'ready' && 'border-green-300 dark:border-green-700',
      source.status === 'planned' && 'border-gray-300 dark:border-gray-700',
      compact ? 'p-3' : 'p-4'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'rounded-lg flex items-center justify-center flex-shrink-0',
          config.bgColor,
          compact ? 'w-8 h-8' : 'w-10 h-10'
        )}>
          <SystemIcon className={cn(config.color, compact ? 'h-4 w-4' : 'h-5 w-5')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn('font-medium truncate', compact && 'text-sm')}>
            {source.name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {source.system}
          </div>
          {!compact && (
            <div className="flex items-center gap-1 mt-2">
              <StatusIcon className={cn('h-3 w-3', config.color)} />
              <span className={cn('text-xs', config.color)}>
                {config.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Integration status cards for the integration page
export function IntegrationStatusCards({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {INTEGRATION_SOURCES.map((source) => {
        const config = statusConfig[source.status]
        const StatusIcon = config.icon
        const SystemIcon = systemIcons[source.system] || Database

        return (
          <Card key={source.id} className={cn(
            'transition-all',
            source.status === 'active' && 'border-green-300 dark:border-green-700',
            source.status === 'pending_access' && 'border-yellow-300 dark:border-yellow-700',
            source.status === 'access_requested' && 'border-blue-300 dark:border-blue-700',
            source.status === 'ready' && 'border-green-300 dark:border-green-700'
          )}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center',
                  config.bgColor
                )}>
                  <SystemIcon className={cn('h-6 w-6', config.color)} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{source.name}</h3>
                    <Badge variant={
                      source.status === 'active' || source.status === 'ready' ? 'success' :
                      source.status === 'pending_access' ? 'warning' :
                      source.status === 'access_requested' ? 'outline' :
                      'outline'
                    }>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {source.description}
                  </p>
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-1">Available Fields:</div>
                    <div className="flex flex-wrap gap-1">
                      {source.fields.map((field, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {source.lastSync && (
                    <div className="mt-3 text-xs text-gray-500">
                      Last sync: {source.lastSync.toLocaleString()}
                      {source.recordCount && ` • ${source.recordCount.toLocaleString()} records`}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
