"use client"

import { cn, formatCurrency } from '@/lib/utils'
import { StageMetrics, STAGE_CONFIG } from '@/lib/lead-engine-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts'

interface FunnelChartProps {
  metrics: StageMetrics[]
  title?: string
  className?: string
  showValue?: boolean // J2: Show dollar values
}

export function FunnelChart({ metrics, title = 'Pipeline Funnel', className, showValue = true }: FunnelChartProps) {
  // Calculate totals for header display
  const totalLeads = metrics.reduce((sum, m) => sum + m.leadCount, 0)
  const totalValue = metrics.reduce((sum, m) => sum + m.totalValue, 0)

  const data = metrics.map(m => ({
    name: STAGE_CONFIG[m.stage].shortName,
    fullName: STAGE_CONFIG[m.stage].name,
    total: m.leadCount,
    healthy: m.healthyCount,
    atRisk: m.atRiskCount,
    critical: m.criticalCount,
    isHandoff: STAGE_CONFIG[m.stage].isHandoffStage,
    // J2: Value metrics
    totalValue: m.totalValue,
    avgValue: m.avgValue,
    atRiskValue: m.atRiskValue
  }))

  const getBarColor = (entry: typeof data[0]) => {
    if (entry.critical > entry.atRisk && entry.critical > entry.healthy) {
      return '#ef4444' // red
    }
    if (entry.atRisk > entry.healthy) {
      return '#f59e0b' // yellow
    }
    return '#22c55e' // green
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {showValue && (
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalValue)}
              </div>
              <div className="text-xs text-gray-500">{totalLeads} leads</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <defs>
                <filter id="glow-funnel" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="font-medium mb-2">{data.fullName}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-500">Total:</span>
                            <span className="font-medium">{data.total} leads</span>
                          </div>
                          {/* J2: Show dollar values */}
                          <div className="flex justify-between gap-4 font-medium">
                            <span className="text-gray-500">Value:</span>
                            <span className="text-green-600">{formatCurrency(data.totalValue)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-500">Avg Deal:</span>
                            <span>{formatCurrency(data.avgValue)}</span>
                          </div>
                          <div className="border-t my-2 pt-2">
                            <div className="flex justify-between gap-4">
                              <span className="text-green-600">Healthy:</span>
                              <span>{data.healthy}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-yellow-600">At Risk:</span>
                              <span>{data.atRisk}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-red-600">Critical:</span>
                              <span>{data.critical}</span>
                            </div>
                          </div>
                          {data.atRiskValue > 0 && (
                            <div className="pt-1 text-xs text-red-600">
                              {formatCurrency(data.atRiskValue)} at risk
                            </div>
                          )}
                        </div>
                        {data.isHandoff && (
                          <div className="mt-2 pt-2 border-t text-xs text-orange-600 dark:text-orange-400">
                            Manual handoff stage
                          </div>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} activeBar={{ filter: 'url(#glow-funnel)' }}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry)}
                    stroke={entry.isHandoff ? '#f97316' : 'transparent'}
                    strokeWidth={entry.isHandoff ? 2 : 0}
                    strokeDasharray={entry.isHandoff ? '4 2' : '0'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Mostly Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">At Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-dashed border-orange-500" />
            <span className="text-gray-600 dark:text-gray-400">Handoff Stage</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Stacked version showing health breakdown
export function StackedFunnelChart({ metrics, title = 'Pipeline Health', className }: FunnelChartProps) {
  const data = metrics.map(m => ({
    name: STAGE_CONFIG[m.stage].shortName,
    fullName: STAGE_CONFIG[m.stage].name,
    healthy: m.healthyCount,
    atRisk: m.atRiskCount,
    critical: m.criticalCount,
    isHandoff: STAGE_CONFIG[m.stage].isHandoffStage
  }))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <defs>
                <filter id="glow-stacked-funnel" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="font-medium mb-2">{data.fullName}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-green-600">Healthy:</span>
                            <span>{data.healthy}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-yellow-600">At Risk:</span>
                            <span>{data.atRisk}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-red-600">Critical:</span>
                            <span>{data.critical}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="healthy" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} activeBar={{ filter: 'url(#glow-stacked-funnel)' }} />
              <Bar dataKey="atRisk" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} activeBar={{ filter: 'url(#glow-stacked-funnel)' }} />
              <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-stacked-funnel)' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">At Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Critical</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
