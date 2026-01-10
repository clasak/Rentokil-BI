"use client"

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/store'
import { calculateKPIValues, getVarianceDrivers, getActionItems } from '@/lib/kpi-calculations'
import { TOP_10_KPIS, getKPIBySlug } from '@/lib/kpis'
import { getMarkets, getBranches } from '@/lib/data'
import { KPICard } from '@/components/features/KPICard'
import { VarianceNarrative } from '@/components/features/VarianceNarrative'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { Download, Calendar, TrendingUp, AlertTriangle, CheckCircle, Target } from 'lucide-react'
import { KPIValue, ActionItem, VarianceDriver } from '@/types'

export default function WBRPage() {
  const { settings } = useAppStore()
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())
  const [varianceDrivers, setVarianceDrivers] = useState<VarianceDriver[]>([])
  const [actions, setActions] = useState<ActionItem[]>([])
  const [selectedMarket, setSelectedMarket] = useState<string>('all')
  const printRef = useRef<HTMLDivElement>(null)

  const markets = getMarkets()
  const branches = getBranches()

  useEffect(() => {
    setKpiValues(calculateKPIValues())
    setVarianceDrivers(getVarianceDrivers('revenue_mtd'))
    setActions(getActionItems())
  }, [settings])

  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(new Date())

  // Export to PDF (simplified client-side)
  const exportPDF = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Weekly Business Review - ${format(weekStart, 'MMM d')} to ${format(weekEnd, 'MMM d, yyyy')}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; }
                .grid { display: grid; gap: 16px; }
                .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
                .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
                .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
                .text-2xl { font-size: 1.5rem; font-weight: bold; }
                .text-sm { font-size: 0.875rem; }
                .text-gray-500 { color: #6b7280; }
                .text-green-600 { color: #059669; }
                .text-red-600 { color: #dc2626; }
                .mb-4 { margin-bottom: 1rem; }
                .mt-4 { margin-top: 1rem; }
                h1, h2, h3 { margin-top: 1.5rem; margin-bottom: 0.5rem; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                @media print { body { padding: 20px; } }
              </style>
            </head>
            <body>
              <h1>Weekly Business Review</h1>
              <p class="text-gray-500">${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}</p>
              ${printContent}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  // Get KPIs for display
  const revenueMTD = kpiValues.get('revenue_mtd')
  const varianceToTarget = kpiValues.get('variance_to_target_mtd')
  const pipelineKpi = kpiValues.get('pipeline_30_60_90')
  const serviceRisk = kpiValues.get('service_risk_index')

  // Top exceptions
  const criticalActions = actions.filter(a => a.severity === 'critical').slice(0, 5)
  const highActions = actions.filter(a => a.severity === 'high').slice(0, 5)

  // Market breakdown (simulated)
  const marketBreakdown = markets.map(market => ({
    market: market.name,
    revenue: (revenueMTD?.value || 0) / markets.length * (0.8 + Math.random() * 0.4),
    variance: (Math.random() - 0.5) * 0.2,
    pipeline: (pipelineKpi?.value || 0) / markets.length * (0.8 + Math.random() * 0.4),
    serviceRisk: 70 + Math.random() * 25,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Weekly Business Review</h1>
          <p className="text-sm text-gray-500">
            Week of {format(weekStart, 'MMMM d')} - {format(weekEnd, 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              {markets.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="space-y-6">
        {/* Section 1: Executive Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              1. Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Revenue MTD</div>
                <div className="text-2xl font-bold">{revenueMTD ? formatCurrency(revenueMTD.value) : '-'}</div>
                <div className={`text-sm ${revenueMTD && revenueMTD.deltaPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {revenueMTD ? `${(revenueMTD.deltaPercent * 100).toFixed(1)}% vs prior` : ''}
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Variance to Target</div>
                <div className={`text-2xl font-bold ${varianceToTarget && varianceToTarget.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {varianceToTarget ? `${(varianceToTarget.value * 100).toFixed(1)}%` : '-'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {varianceToTarget && varianceToTarget.value >= 0 ? 'Ahead of plan' : 'Behind plan'}
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Pipeline (30/60/90)</div>
                <div className="text-2xl font-bold">{pipelineKpi ? formatCurrency(pipelineKpi.value) : '-'}</div>
                <div className={`text-sm ${pipelineKpi && pipelineKpi.deltaPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {pipelineKpi ? `${(pipelineKpi.deltaPercent * 100).toFixed(1)}% vs prior` : ''}
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Service Risk Index</div>
                <div className="text-2xl font-bold">{serviceRisk ? Math.round(serviceRisk.value) : '-'}</div>
                <div className="text-sm text-muted-foreground">
                  Target: 85+
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Variance Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              2. Variance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VarianceNarrative
              kpiName="Revenue"
              drivers={varianceDrivers}
              totalVariance={revenueMTD?.deltaPercent || 0}
              isPositiveGood={true}
            />
          </CardContent>
        </Card>

        {/* Section 3: Top Exceptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              3. Top Exceptions Requiring Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalActions.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">Critical</h4>
                  <ul className="space-y-2">
                    {criticalActions.map(action => (
                      <li key={action.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/50 rounded">
                        <span>{action.title}</span>
                        <Badge variant="danger">{formatCurrency(action.financialImpact)}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {highActions.length > 0 && (
                <div>
                  <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">High Priority</h4>
                  <ul className="space-y-2">
                    {highActions.map(action => (
                      <li key={action.id} className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-950/50 rounded">
                        <span>{action.title}</span>
                        <Badge variant="warning">{formatCurrency(action.financialImpact)}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Market Drill-Down */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              4. Market Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead className="text-right">Revenue MTD</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Pipeline</TableHead>
                  <TableHead className="text-right">Service Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketBreakdown.map(row => (
                  <TableRow key={row.market}>
                    <TableCell className="font-medium">{row.market}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                    <TableCell className={`text-right ${row.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.variance >= 0 ? '+' : ''}{(row.variance * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.pipeline)}</TableCell>
                    <TableCell className="text-right">
                      <span className={row.serviceRisk >= 85 ? 'text-green-600' : row.serviceRisk >= 75 ? 'text-yellow-600' : 'text-red-600'}>
                        {row.serviceRisk.toFixed(0)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 5: KPI Scorecard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              5. KPI Scorecard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {TOP_10_KPIS.slice(0, 10).map(slug => {
                const kpiValue = kpiValues.get(slug)
                if (!kpiValue) return null
                return <KPICard key={slug} kpiValue={kpiValue} compact showSparkline={false} />
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
