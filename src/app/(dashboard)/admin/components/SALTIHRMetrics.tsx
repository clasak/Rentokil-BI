"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { Users, TrendingUp, TrendingDown, UserMinus, UserCheck } from 'lucide-react'
import { HRMetrics } from '@/lib/mock/saltiData'
import { formatNumber } from '@/lib/utils'

interface SALTIHRMetricsProps {
  data: HRMetrics
  className?: string
}

export function SALTIHRMetrics({ data, className }: SALTIHRMetricsProps) {
  const totalTerms = data.voluntary_terms + data.involuntary_terms
  const termRate = ((totalTerms / data.headcount) * 100).toFixed(1)
  const isGoodRetention = data.retention_rate >= 95

  // Pie chart for termination breakdown
  const termsData = [
    { name: 'Voluntary', value: data.voluntary_terms, color: '#f59e0b' },
    { name: 'Involuntary', value: data.involuntary_terms, color: '#ef4444' }
  ]

  // Sparkline data (mock 12 month trend)
  const headcountTrend = Array.from({ length: 12 }, (_, i) => ({
    month: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i],
    value: Math.round(data.headcount * (0.95 + Math.random() * 0.1))
  }))

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              HR Metrics
              <Badge
                variant={isGoodRetention ? "default" : "destructive"}
                className={isGoodRetention ? "bg-green-500" : ""}
              >
                {data.retention_rate}% Retention
              </Badge>
            </CardTitle>
            <CardDescription>
              Workforce metrics and retention analysis
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Headcount with Trend */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Headcount</div>
                  <div className="text-2xl font-bold">{formatNumber(data.headcount)}</div>
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>

            {/* Sparkline */}
            <div className="h-[60px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={headcountTrend}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground text-center">12-month trend</div>
          </div>

          {/* Retention Rate Gauge */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-sm font-medium mb-2">Retention Rate</div>
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={isGoodRetention ? '#22c55e' : '#ef4444'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(data.retention_rate / 100) * 352} 352`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{data.retention_rate}</span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              Target: 95%
              {isGoodRetention ? (
                <UserCheck className="h-3 w-3 text-green-500" />
              ) : (
                <UserMinus className="h-3 w-3 text-red-500" />
              )}
            </div>
          </div>

          {/* Terminations Breakdown */}
          <div>
            <div className="text-sm font-medium mb-2 text-center">Terminations Breakdown</div>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={termsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {termsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        return (
                          <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-lg border border-gray-200 dark:border-gray-700 text-sm">
                            <div>{item.name}: {item.value}</div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-2">
              {termsData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold">{formatNumber(data.headcount)}</div>
            <div className="text-xs text-muted-foreground">Total Headcount</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {data.voluntary_terms}
            </div>
            <div className="text-xs text-muted-foreground">Voluntary Terms</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {data.involuntary_terms}
            </div>
            <div className="text-xs text-muted-foreground">Involuntary Terms</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{termRate}%</div>
            <div className="text-xs text-muted-foreground">Term Rate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
