"use client"

import { useEffect, useState } from 'react'
import { useAppStore, DEMO_MODE_CONFIG } from '@/store'
import { KPICard } from '@/components/features/KPICard'
import { VarianceNarrative } from '@/components/features/VarianceNarrative'
import { ActionList } from '@/components/features/ActionList'
import { TOP_10_KPIS } from '@/lib/kpis'
import { calculateKPIValues, getVarianceDrivers, getActionItems } from '@/lib/kpi-calculations'
import { KPIValue, ActionItem, VarianceDriver } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default function CommandCenterPage() {
  const { settings } = useAppStore()
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())
  const [varianceDrivers, setVarianceDrivers] = useState<VarianceDriver[]>([])
  const [actions, setActions] = useState<ActionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    setIsLoading(true)
    const timer = setTimeout(() => {
      setKpiValues(calculateKPIValues())
      setVarianceDrivers(getVarianceDrivers('revenue_mtd'))
      setActions(getActionItems())
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [settings.refreshSeed])

  const config = DEMO_MODE_CONFIG[settings.demoMode]
  const highlightedKpis = config.highlightedKpis

  // Get revenue trend for chart
  const revenueTrend = kpiValues.get('revenue_mtd')?.trend || []
  const revenueChartData = revenueTrend.map((value, index) => ({
    name: `W${index + 1}`,
    value: value,
  }))

  // Summary stats
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
          <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            {config.persona} • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
            Last updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
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

        <Card className={`${varianceToTarget && varianceToTarget.value >= 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white`}>
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

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">KPI Health</div>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{goodKpis.length}</div>
                <div className="text-xs text-gray-500">Good</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{warningKpis.length}</div>
                <div className="text-xs text-gray-500">Warning</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{criticalKpis.length}</div>
                <div className="text-xs text-gray-500">Critical</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Priority Actions</div>
            <div className="text-3xl font-bold mt-1">{actions.length}</div>
            <div className="text-sm mt-2 text-gray-500">
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
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Trend (Last 12 Periods)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#00A651"
                      fill="#00A65120"
                      strokeWidth={2}
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
