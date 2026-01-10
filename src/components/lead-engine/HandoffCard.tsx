"use client"

import { cn } from '@/lib/utils'
import { HandoffMetrics, HandoffType } from '@/lib/lead-engine-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Mail, Clock, AlertTriangle, TrendingUp, TrendingDown, Users } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'

interface HandoffCardProps {
  metrics: HandoffMetrics
  showChart?: boolean
  className?: string
}

export function HandoffCard({ metrics, showChart = true, className }: HandoffCardProps) {
  const isAtRisk = metrics.slaCompliance < 85
  const isCritical = metrics.slaCompliance < 70

  const getComplianceColor = () => {
    if (isCritical) return 'text-red-600 dark:text-red-400'
    if (isAtRisk) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getProgressColor = () => {
    if (isCritical) return 'bg-red-500'
    if (isAtRisk) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <Card className={cn(
      'transition-all',
      isCritical && 'border-red-300 dark:border-red-700',
      isAtRisk && !isCritical && 'border-yellow-300 dark:border-yellow-700',
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className={cn(
              'h-5 w-5',
              isCritical ? 'text-red-500' : isAtRisk ? 'text-yellow-500' : 'text-orange-500'
            )} />
            {metrics.displayName}
          </CardTitle>
          {(isCritical || isAtRisk) && (
            <Badge variant={isCritical ? 'danger' : 'warning'} className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {isCritical ? 'Critical' : 'At Risk'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manual email handoff - key automation opportunity
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics.pending}
            </div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics.avgWaitHours}h
            </div>
            <div className="text-xs text-gray-500">Avg Wait</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {metrics.delayedCount}
            </div>
            <div className="text-xs text-gray-500">Delayed</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className={cn('text-2xl font-bold', getComplianceColor())}>
              {metrics.slaCompliance}%
            </div>
            <div className="text-xs text-gray-500">SLA Compliance</div>
          </div>
        </div>

        {/* SLA Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">SLA Target: 90%</span>
            <span className={getComplianceColor()}>
              {metrics.slaCompliance >= 90 ? (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" /> On Track
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" /> Below Target
                </span>
              )}
            </span>
          </div>
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', getProgressColor())}
              style={{ width: `${Math.min(metrics.slaCompliance, 100)}%` }}
            />
            {/* Target marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-600 dark:bg-gray-300"
              style={{ left: '90%' }}
            />
          </div>
        </div>

        {/* Alert for critical handoffs */}
        {metrics.leadsAtRisk > 0 && (
          <div className={cn(
            'p-3 rounded-lg flex items-start gap-2',
            isCritical
              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
          )}>
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>{metrics.leadsAtRisk} leads</strong> require immediate attention.
              {metrics.type === 'bd_to_sales'
                ? ' These leads are waiting for AE assignment.'
                : ' These won deals are awaiting ops handoff.'}
            </div>
          </div>
        )}

        {/* Trend Chart */}
        {showChart && metrics.trend.length > 0 && (
          <div className="pt-4 border-t dark:border-gray-700">
            <div className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
              Avg Wait Time (Last 14 Days)
            </div>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.trend.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-gray-800 p-2 rounded shadow border dark:border-gray-700 text-sm">
                            <div className="font-medium">{payload[0].payload.day}</div>
                            <div className="text-gray-600 dark:text-gray-400">
                              {payload[0].value} hours avg
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke={isCritical ? '#ef4444' : isAtRisk ? '#f59e0b' : '#22c55e'}
                    strokeWidth={2}
                    dot={false}
                  />
                  {/* Target line at 24 hours */}
                  <Line
                    type="monotone"
                    dataKey={() => 24}
                    stroke="#9ca3af"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-gray-400 text-center mt-1">
              Dashed line = 24h SLA target
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
