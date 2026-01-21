'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, Cell, ComposedChart, Area
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { TrendingUp, TrendingDown, Target, DollarSign, Calendar, AlertCircle } from 'lucide-react'
import { generateMockRevenueProjections } from '@/lib/mock/financeExtendedData'
import type { RevenueProjection } from '@/types/finance-extended'

export default function ProjectionsPage() {
  const [projections, setProjections] = useState<RevenueProjection[]>([])

  useEffect(() => {
    setProjections(generateMockRevenueProjections(6))
  }, [])

  // Summary metrics
  const currentMonth = projections[0]
  const nextQuarterTotal = projections.slice(0, 3).reduce((sum, p) => sum + p.totalProjected, 0)
  const avgConfidence = projections.filter(p => p.confidenceLevel === 'high').length / projections.length

  // Chart data
  const chartData = useMemo(() => projections.map(p => ({
    period: p.period,
    recurring: p.recurringRevenue,
    pipeline: p.weightedPipeline,
    renewals: p.renewalRevenue,
    expansion: p.expansionRevenue,
    total: p.totalProjected,
    target: p.totalProjected - p.vsTarget,
    confidence: p.confidenceLevel,
  })), [projections])

  // Scenario comparison data
  const scenarioData = useMemo(() => projections.map(p => ({
    period: p.period,
    base: p.totalProjected,
    upside: p.totalProjected * 1.15,
    downside: p.totalProjected * 0.85,
  })), [projections])

  const getConfidenceBadge = (level: string) => {
    switch (level) {
      case 'high': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">High</Badge>
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Medium</Badge>
      default: return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Low</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Finance', href: '/finance' },
        { label: 'Revenue Projections' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue Projections</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">6-month forward-looking revenue forecast</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Current Month</div>
                <div className="text-2xl font-bold">{currentMonth ? formatCurrency(currentMonth.totalProjected) : '-'}</div>
                {currentMonth && (
                  <div className={`text-xs ${currentMonth.vsTargetPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currentMonth.vsTargetPercent >= 0 ? '+' : ''}{currentMonth.vsTargetPercent.toFixed(1)}% vs target
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Next Quarter</div>
                <div className="text-2xl font-bold">{formatCurrency(nextQuarterTotal)}</div>
                <div className="text-xs text-gray-500">3-month projection</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Confidence</div>
                <div className="text-2xl font-bold">{formatPercent(avgConfidence)}</div>
                <div className="text-xs text-gray-500">High confidence months</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                {currentMonth && currentMonth.vsPriorYearPercent >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">vs Prior Year</div>
                <div className={`text-2xl font-bold ${currentMonth && currentMonth.vsPriorYearPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentMonth ? `${currentMonth.vsPriorYearPercent >= 0 ? '+' : ''}${currentMonth.vsPriorYearPercent.toFixed(1)}%` : '-'}
                </div>
                <div className="text-xs text-gray-500">YoY comparison</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Projections Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Revenue Projections
          </CardTitle>
          <CardDescription>Revenue components by source</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <filter id="glow-projections" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge>
                      <feMergeNode in="blur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                        <p className="font-medium mb-2">{label}</p>
                        {payload.map((entry: any, i: number) => (
                          <p key={i} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {formatCurrency(entry.value)}
                          </p>
                        ))}
                      </div>
                    )
                  }}
                />
                <Legend />
                <Bar dataKey="recurring" stackId="a" fill="#22c55e" name="Recurring" />
                <Bar dataKey="renewals" stackId="a" fill="#3b82f6" name="Renewals" />
                <Bar dataKey="pipeline" stackId="a" fill="#8b5cf6" name="Pipeline" />
                <Bar dataKey="expansion" stackId="a" fill="#f59e0b" name="Expansion" />
                <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="Target" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scenario Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Scenario Comparison
            </CardTitle>
            <CardDescription>Base, upside, and downside projections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scenarioData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium mb-2">{label}</p>
                          {payload.map((entry: any, i: number) => (
                            <p key={i} className="text-sm" style={{ color: entry.color }}>
                              {entry.name}: {formatCurrency(entry.value)}
                            </p>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="upside" stroke="#22c55e" strokeWidth={2} name="Upside (+15%)" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="base" stroke="#3b82f6" strokeWidth={2} name="Base" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="downside" stroke="#ef4444" strokeWidth={2} name="Downside (-15%)" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Confidence Levels */}
        <Card>
          <CardHeader>
            <CardTitle>Projection Details</CardTitle>
            <CardDescription>Monthly breakdown with confidence levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projections.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{p.period}</div>
                    {getConfidenceBadge(p.confidenceLevel)}
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(p.totalProjected)}</div>
                    <div className={`text-xs ${p.vsTargetPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {p.vsTargetPercent >= 0 ? '+' : ''}{p.vsTargetPercent.toFixed(1)}% vs target
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
