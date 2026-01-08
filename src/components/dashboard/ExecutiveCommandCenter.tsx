"use client"

import { useEffect, useState } from 'react'
import { useAppStore, DEMO_MODE_CONFIG } from '@/store'
import { KPICard } from '@/components/features/KPICard'
import { VarianceNarrative } from '@/components/features/VarianceNarrative'
import { ActionList } from '@/components/features/ActionList'
import { ChartTooltip } from '@/components/features/ChartTooltip'
import { TOP_10_KPIS } from '@/lib/kpis'
import { calculateKPIValues, getVarianceDrivers, getActionItems } from '@/lib/kpi-calculations'
import { KPIValue, ActionItem, VarianceDriver } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export function ExecutiveCommandCenter() {
  const { settings } = useAppStore()
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())
  const [varianceDrivers, setVarianceDrivers] = useState<VarianceDriver[]>([])
  const [actions, setActions] = useState<ActionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState('')
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    setCurrentTime(new Date().toLocaleTimeString())
  }, [])

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      setKpiValues(calculateKPIValues())
      setVarianceDrivers(getVarianceDrivers('revenue_mtd'))
      setActions(getActionItems())
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [settings.refreshSeed])

  const demoMode = settings.demoMode in DEMO_MODE_CONFIG
    ? settings.demoMode
    : 'bi_leadership'
  const config = DEMO_MODE_CONFIG[demoMode]
  const highlightedKpis = config?.highlightedKpis || []

  const revenueTrend = kpiValues.get('revenue_mtd')?.trend || []
  const revenueChartData = revenueTrend.map((value, index) => ({
    name: `W${index + 1}`,
    value: value,
  }))

  const criticalKpis = Array.from(kpiValues.values()).filter(k => k.status === 'critical')
  const warningKpis = Array.from(kpiValues.values()).filter(k => k.status === 'warning')
  const goodKpis = Array.from(kpiValues.values()).filter(k => k.status === 'good')

  const revenueMTD = kpiValues.get('revenue_mtd')
  const varianceToTarget = kpiValues.get('variance_to_target_mtd')

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Command Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {config.persona} • {currentDate || 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={criticalKpis.length > 0 ? 'danger' : 'success'} className="gap-1">
            {criticalKpis.length > 0 ? (
              <>
                <AlertTriangle className="h-3 w-3" />
                {criticalKpis.length} Critical
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3" />
                All Systems Healthy
              </>
            )}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Last updated: {currentTime || '--:--:--'}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card id="revenue-mtd-card" className="bg-gradient-to-br from-rentokil-red to-rentokil-darkred text-white glow-primary">
          <CardContent className="pt-6">
            <div className="text-sm opacity-80">Revenue MTD</div>
            <div className="text-3xl font-bold mt-1">
              {revenueMTD ? formatCurrency(revenueMTD.value) : '-'}
            </div>
            <div className="text-sm mt-2 opacity-80">
              {revenueMTD && revenueMTD.deltaPercent > 0 ? '+' : ''}
              {revenueMTD ? (revenueMTD.deltaPercent * 100).toFixed(1) : 0}% vs prior
            </div>
          </CardContent>
        </Card>

        <Card id="variance-card" className={`${varianceToTarget && varianceToTarget.value >= 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600 glow-info' : 'bg-gradient-to-br from-red-500 to-red-600 glow-danger'} text-white`}>
          <CardContent className="pt-6">
            <div className="text-sm opacity-80">Variance to Target</div>
            <div className="text-3xl font-bold mt-1">
              {varianceToTarget ? `${(varianceToTarget.value * 100).toFixed(1)}%` : '-'}
            </div>
            <div className="text-sm mt-2 opacity-80">
              {varianceToTarget && varianceToTarget.value >= 0 ? 'Ahead of plan' : 'Behind plan'}
            </div>
          </CardContent>
        </Card>

        <Card id="kpi-health-card">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">KPI Health</div>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{goodKpis.length}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Good</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{warningKpis.length}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Warning</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalKpis.length}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Critical</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="priority-actions-card">
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Priority Actions</div>
            <div className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{actions.length}</div>
            <div className="text-sm mt-2 text-gray-500 dark:text-gray-400">
              {actions.filter(a => a.severity === 'critical').length} critical
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Cards - Left 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top KPI Cards */}
          <div id="kpi-grid">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <TrendingUp className="h-5 w-5" />
              Key Performance Indicators
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TOP_10_KPIS.map(slug => {
                const kpiValue = kpiValues.get(slug)
                if (!kpiValue) return null
                return (
                  <KPICard
                    key={slug}
                    kpiValue={kpiValue}
                    highlighted={highlightedKpis.includes(slug)}
                  />
                )
              })}
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <Card id="revenue-trend-chart">
            <CardHeader>
              <CardTitle className="text-base">Revenue Trend (Last 12 Periods)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <filter id="glow-cmd" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="blur"/>
                        <feMerge>
                          <feMergeNode in="blur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    <Tooltip content={<ChartTooltip formatter={formatCurrency} />} cursor={false} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#E4002B"
                      fill="#E4002B20"
                      strokeWidth={2}
                      activeDot={{ r: 6, filter: 'url(#glow-cmd)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Variance Narrative */}
          <VarianceNarrative
            kpiName="Revenue"
            drivers={varianceDrivers}
            totalVariance={revenueMTD?.deltaPercent || 0}
            isPositiveGood={true}
          />
        </div>

        {/* Right Sidebar - Actions */}
        <div className="space-y-6">
          <ActionList
            actions={actions}
            title="Priority Actions"
            maxItems={8}
          />
        </div>
      </div>
    </div>
  )
}
