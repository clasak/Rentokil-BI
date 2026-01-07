"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getKPIBySlug } from '@/lib/kpis'
import { calculateKPIValues, getReconciliation, getVarianceDrivers, getActionItems } from '@/lib/kpi-calculations'
import { useAppStore } from '@/store'
import { KPIValue, ReconciliationItem, VarianceDriver, ActionItem } from '@/types'
import { LineageModal } from '@/components/features/LineageModal'
import { VarianceNarrative } from '@/components/features/VarianceNarrative'
import { ActionList } from '@/components/features/ActionList'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils'
import {
  ArrowLeft, Database, TrendingUp, Target, AlertTriangle,
  CheckCircle, Info, ExternalLink, RefreshCw
} from 'lucide-react'

export default function KPIDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const { settings } = useAppStore()

  const [kpiValue, setKpiValue] = useState<KPIValue | null>(null)
  const [reconciliation, setReconciliation] = useState<ReconciliationItem | null>(null)
  const [drivers, setDrivers] = useState<VarianceDriver[]>([])
  const [actions, setActions] = useState<ActionItem[]>([])
  const [lineageOpen, setLineageOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const definition = getKPIBySlug(slug)

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      const values = calculateKPIValues()
      setKpiValue(values.get(slug) || null)
      setReconciliation(getReconciliation(slug))
      setDrivers(getVarianceDrivers(slug))
      setActions(getActionItems().filter(a => {
        if (slug === 'stalled_opps') return a.type === 'stalled_opp'
        if (slug === 'retention_risk') return a.type === 'at_risk_account'
        if (slug === 'ar_aging') return a.type === 'collection_priority'
        if (slug === 'capacity_utilization' || slug === 'scheduling_pressure_index') return a.type === 'capacity_pressure'
        return true
      }))
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [slug, settings.refreshSeed])

  if (!definition) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold">KPI Not Found</h2>
          <p className="text-gray-500">The KPI &ldquo;{slug}&rdquo; does not exist.</p>
          <Button asChild className="mt-4">
            <Link href="/">Back to Command Center</Link>
          </Button>
        </div>
      </div>
    )
  }

  const formatValue = (value: number): string => {
    switch (definition.format) {
      case 'currency': return formatCurrency(value)
      case 'percent': return formatPercent(value)
      case 'days': return `${Math.round(value)} days`
      case 'index': return Math.round(value).toString()
      default: return formatNumber(value)
    }
  }

  const chartData = kpiValue?.trend.map((value, index) => ({
    period: `P${index + 1}`,
    value,
    target: definition.target,
  })) || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{definition.name}</h1>
              <Badge variant={
                kpiValue?.status === 'good' ? 'success' :
                kpiValue?.status === 'warning' ? 'warning' : 'danger'
              }>
                {kpiValue?.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">{definition.definition}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setLineageOpen(true)} className="gap-2">
            <Database className="h-4 w-4" />
            View Lineage
          </Button>
        </div>
      </div>

      {/* KPI Summary Card */}
      {kpiValue && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-500">Current Value</div>
                <div className="text-3xl font-bold mt-1">{formatValue(kpiValue.value)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Prior Period</div>
                <div className="text-2xl font-semibold mt-1 text-gray-600">
                  {formatValue(kpiValue.previousValue)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Change</div>
                <div className={`text-2xl font-semibold mt-1 ${
                  (definition.higherIsBetter ? kpiValue.deltaPercent > 0 : kpiValue.deltaPercent < 0)
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpiValue.deltaPercent > 0 ? '+' : ''}{(kpiValue.deltaPercent * 100).toFixed(1)}%
                </div>
              </div>
              {definition.target !== undefined && (
                <div>
                  <div className="text-sm text-gray-500">Target</div>
                  <div className="text-2xl font-semibold mt-1">{formatValue(definition.target)}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="reconcile">Reconcile</TabsTrigger>
          <TabsTrigger value="definition">Definition</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis tickFormatter={(value) =>
                      definition.format === 'currency' ? `$${(value / 1000).toFixed(0)}K` :
                      definition.format === 'percent' ? `${(value * 100).toFixed(0)}%` :
                      value.toString()
                    } />
                    <Tooltip formatter={(value: number) => [formatValue(value), definition.name]} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#00A651"
                      fill="#00A65120"
                      strokeWidth={2}
                    />
                    {definition.target && (
                      <Line
                        type="monotone"
                        dataKey="target"
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Refresh Cadence</div>
                    <div className="font-medium">{definition.refreshCadence}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Category</div>
                    <div className="font-medium capitalize">{definition.category}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Info className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Owner</div>
                    <div className="font-medium">{definition.owner}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-6">
          <VarianceNarrative
            kpiName={definition.name}
            drivers={drivers}
            totalVariance={kpiValue?.deltaPercent || 0}
            isPositiveGood={definition.higherIsBetter}
          />
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions">
          <ActionList
            actions={actions}
            title={`Actions for ${definition.name}`}
            maxItems={20}
            showViewAll={false}
          />
        </TabsContent>

        {/* Reconcile Tab */}
        <TabsContent value="reconcile" className="space-y-6">
          {reconciliation && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {reconciliation.isWithinTolerance ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    Reconciliation Status
                  </CardTitle>
                  <CardDescription>
                    Comparing KPI calculation to source system totals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">KPI Total</div>
                      <div className="text-2xl font-bold">{formatValue(reconciliation.kpiTotal)}</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Source Total</div>
                      <div className="text-2xl font-bold">{formatValue(reconciliation.sourceTotal)}</div>
                    </div>
                    <div className={`p-4 rounded-lg ${reconciliation.isWithinTolerance ? 'bg-green-50 dark:bg-green-950/50' : 'bg-yellow-50 dark:bg-yellow-950/50'}`}>
                      <div className="text-sm text-muted-foreground">Difference</div>
                      <div className={`text-2xl font-bold ${reconciliation.isWithinTolerance ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {formatValue(reconciliation.difference)}
                        <span className="text-sm font-normal ml-2">
                          ({((reconciliation.difference / reconciliation.kpiTotal) * 100).toFixed(3)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Tolerance Threshold</span>
                      <span className="text-sm font-medium">{reconciliation.tolerancePercent}%</span>
                    </div>
                    <Progress
                      value={Math.min(((reconciliation.difference / reconciliation.kpiTotal) * 100) / reconciliation.tolerancePercent * 100, 100)}
                      className={reconciliation.isWithinTolerance ? 'bg-green-100 dark:bg-green-950' : 'bg-yellow-100 dark:bg-yellow-950'}
                    />
                  </div>

                  {reconciliation.explanations.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-2">Explanation of Differences</h4>
                      <ul className="space-y-2">
                        {reconciliation.explanations.map((exp, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-yellow-500">•</span>
                            {exp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reconciliation Target</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{definition.reconciliationTarget}</p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Definition Tab */}
        <TabsContent value="definition" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>KPI Definition</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-1/3">Name</TableCell>
                    <TableCell>{definition.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Slug</TableCell>
                    <TableCell><code className="bg-muted px-2 py-1 rounded">{definition.slug}</code></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Category</TableCell>
                    <TableCell className="capitalize">{definition.category}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Definition</TableCell>
                    <TableCell>{definition.definition}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Calculation Notes</TableCell>
                    <TableCell><code className="text-xs">{definition.calculationNotes}</code></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Grain</TableCell>
                    <TableCell>{definition.grain}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Filters</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {definition.filters.map(f => (
                          <Badge key={f} variant="outline">{f}</Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Primary Source</TableCell>
                    <TableCell>{definition.primarySource}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Secondary Sources</TableCell>
                    <TableCell>{definition.secondarySources.join(', ') || 'None'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Refresh Cadence</TableCell>
                    <TableCell>{definition.refreshCadence}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Owner</TableCell>
                    <TableCell>{definition.owner}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Drill Path</TableCell>
                    <TableCell className="text-sm">{definition.drillPath}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Quality Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {definition.dataQualityChecks.map((check, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {check}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lineage Modal */}
      <LineageModal
        open={lineageOpen}
        onClose={() => setLineageOpen(false)}
        kpi={definition}
      />
    </div>
  )
}
