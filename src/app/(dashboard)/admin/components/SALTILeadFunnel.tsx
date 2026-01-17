"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList
} from 'recharts'
import { ArrowRight, TrendingDown, AlertTriangle } from 'lucide-react'
import { LeadFunnelMetrics } from '@/lib/mock/saltiData'
import { formatNumber } from '@/lib/utils'

interface SALTILeadFunnelProps {
  data: LeadFunnelMetrics
  className?: string
}

export function SALTILeadFunnel({ data, className }: SALTILeadFunnelProps) {
  const funnelStages = [
    { name: 'MQL', fullName: 'Marketing Qualified Leads', value: data.mql_count, color: '#3b82f6' },
    { name: 'SQL', fullName: 'Sales Qualified Leads', value: data.sql_count, color: '#6366f1' },
    { name: 'Scheduled', fullName: 'Scheduled Inspections', value: data.scheduled_count, color: '#8b5cf6' },
    { name: 'Inspected', fullName: 'Inspected', value: data.inspected_count, color: '#a855f7' },
    { name: 'Proposed', fullName: 'Proposals Sent', value: data.proposed_count, color: '#d946ef' },
    { name: 'Sold', fullName: 'Closed Won', value: data.sold_count, color: '#22c55e' }
  ]

  // Calculate conversion rates between stages
  const conversions = [
    { from: 'MQL', to: 'SQL', rate: data.mql_to_sql_rate },
    { from: 'SQL', to: 'Scheduled', rate: data.sql_to_scheduled_rate },
    { from: 'Scheduled', to: 'Inspected', rate: data.scheduled_to_inspected_rate },
    { from: 'Inspected', to: 'Proposed', rate: data.inspected_to_proposed_rate },
    { from: 'Proposed', to: 'Sold', rate: data.proposed_to_sold_rate }
  ]

  const getConversionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400'
    if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getBarColor = (rate: number) => {
    if (rate >= 80) return '#22c55e'
    if (rate >= 60) return '#f59e0b'
    return '#ef4444'
  }

  // Fallout data
  const fallout = [
    { name: 'Unscheduled', value: data.unscheduled_count, color: '#f97316' },
    { name: 'Canceled', value: data.canceled_count, color: '#ef4444' }
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Lead Funnel
              <Badge variant="outline" className="ml-2">
                {formatNumber(data.mql_count)} MQLs
              </Badge>
            </CardTitle>
            <CardDescription>
              Lead progression from MQL to Sold with conversion rates
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatNumber(data.sold_count)}
            </div>
            <div className="text-xs text-muted-foreground">Deals Closed</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funnel Chart */}
        <div className="h-[280px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelStages} layout="vertical">
              <defs>
                <filter id="glow-salti-funnel" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
              <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
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
                    const item = payload[0].payload
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="font-medium mb-2">{item.fullName}</div>
                        <div className="text-2xl font-bold">{formatNumber(item.value)}</div>
                        <div className="text-xs text-muted-foreground">leads at this stage</div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                activeBar={{ filter: 'url(#glow-salti-funnel)' }}
              >
                {funnelStages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => formatNumber(v)}
                  className="fill-gray-600 dark:fill-gray-400 text-xs"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Rates */}
        <div className="grid grid-cols-5 gap-2">
          {conversions.map((conv, i) => (
            <div
              key={i}
              className="flex flex-col items-center p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <span>{conv.from}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{conv.to}</span>
              </div>
              <div className={`text-lg font-bold ${getConversionColor(conv.rate)}`}>
                {conv.rate.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>

        {/* Fallout Indicators */}
        <div className="flex items-center gap-4 pt-4 border-t dark:border-gray-700">
          <div className="text-sm text-muted-foreground">Fallout:</div>
          {fallout.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.name === 'Canceled' ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
              <span className="text-sm font-medium">{formatNumber(item.value)}</span>
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
