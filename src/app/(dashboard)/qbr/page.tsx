"use client"

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/store'
import { calculateKPIValues, getForecastData, getActionItems } from '@/lib/kpi-calculations'
import { TOP_10_KPIS, getKPIBySlug } from '@/lib/kpis'
import { getMarkets } from '@/lib/data'
import { KPICard } from '@/components/features/KPICard'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { format, startOfQuarter, endOfQuarter, subQuarters } from 'date-fns'
import {
  Download, Calendar, TrendingUp, Target, CheckCircle,
  AlertTriangle, ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import { KPIValue } from '@/types'

export default function QBRPage() {
  const { settings } = useAppStore()
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())
  const [forecastData, setForecastData] = useState<any>({ forecast: [], assumptions: [], backtest: [] })
  const printRef = useRef<HTMLDivElement>(null)

  const markets = getMarkets()

  useEffect(() => {
    // Pass role and userId to filter KPI data to user's scope
    setKpiValues(calculateKPIValues(settings.role, settings.userId))
    setForecastData(getForecastData(settings.scenario))
  }, [settings])

  const quarterStart = startOfQuarter(new Date())
  const quarterEnd = endOfQuarter(new Date())
  const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`

  // Export to PDF
  const exportPDF = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Quarterly Business Review - ${currentQuarter}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; }
                .grid { display: grid; gap: 16px; }
                .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
                .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
                .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
                .text-2xl { font-size: 1.5rem; font-weight: bold; }
                .text-sm { font-size: 0.875rem; }
                .text-gray-500 { color: #6b7280; }
                .text-green-600 { color: #059669; }
                .text-red-600 { color: #dc2626; }
                h1, h2, h3 { margin-top: 1.5rem; margin-bottom: 0.5rem; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                @media print { body { padding: 20px; } }
              </style>
            </head>
            <body>
              <h1>Quarterly Business Review</h1>
              <p class="text-gray-500">${currentQuarter} | ${format(quarterStart, 'MMMM d')} - ${format(quarterEnd, 'MMMM d, yyyy')}</p>
              ${printContent}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  // Quarter-over-quarter trends (simulated)
  const qoqTrends = [
    { quarter: 'Q1', revenue: 3200000, pipeline: 4500000, winRate: 0.32, serviceRisk: 82 },
    { quarter: 'Q2', revenue: 3450000, pipeline: 4800000, winRate: 0.34, serviceRisk: 84 },
    { quarter: 'Q3', revenue: 3680000, pipeline: 5100000, winRate: 0.33, serviceRisk: 86 },
    { quarter: 'Q4', revenue: kpiValues.get('revenue_mtd')?.value || 3800000, pipeline: kpiValues.get('pipeline_30_60_90')?.value || 5300000, winRate: kpiValues.get('win_rate')?.value || 0.35, serviceRisk: kpiValues.get('service_risk_index')?.value || 85 },
  ]

  // Strategic initiatives tracking (mock data)
  const initiatives = [
    { name: 'CRM Data Quality Initiative', status: 'on_track', progress: 75, owner: 'Sales Ops', target: 'Q4 2024' },
    { name: 'Route Optimization Rollout', status: 'at_risk', progress: 45, owner: 'Operations', target: 'Q1 2025' },
    { name: 'Customer Success Program', status: 'on_track', progress: 60, owner: 'Customer Experience', target: 'Q4 2024' },
    { name: 'Collections Process Improvement', status: 'complete', progress: 100, owner: 'Finance', target: 'Q3 2024' },
    { name: 'Technician Training Program', status: 'on_track', progress: 85, owner: 'HR/Operations', target: 'Q4 2024' },
  ]

  // KPI scorecard with targets
  const kpiScorecard = TOP_10_KPIS.map(slug => {
    const value = kpiValues.get(slug)
    const def = getKPIBySlug(slug)
    return { slug, value, def }
  }).filter(k => k.value && k.def)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Quarterly Business Review</h1>
          <p className="text-sm text-gray-500">
            {currentQuarter} | {format(quarterStart, 'MMMM d')} - {format(quarterEnd, 'MMMM d, yyyy')}
          </p>
        </div>
        <Button onClick={exportPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="space-y-6">
        {/* Section 1: Quarter Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              1. Quarter Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['revenue_mtd', 'pipeline_30_60_90', 'win_rate', 'service_risk_index'].map(slug => {
                const kpiValue = kpiValues.get(slug)
                if (!kpiValue) return null
                return <KPICard key={slug} kpiValue={kpiValue} compact showSparkline={false} />
              })}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Structural Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              2. Structural Trends (Quarter-over-Quarter)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qoqTrends}>
                  <defs>
                    <filter id="glow-qbr" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis yAxisId="left" tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'revenue' || name === 'pipeline'
                        ? formatCurrency(value)
                        : `${(value * 100).toFixed(1)}%`
                    }
                    cursor={false}
                  />
                  <Bar yAxisId="left" dataKey="revenue" fill="#00A651" name="Revenue" activeBar={{ filter: 'url(#glow-qbr)' }} />
                  <Bar yAxisId="left" dataKey="pipeline" fill="#6366f1" name="Pipeline" activeBar={{ filter: 'url(#glow-qbr)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Q1</TableHead>
                  <TableHead className="text-right">Q2</TableHead>
                  <TableHead className="text-right">Q3</TableHead>
                  <TableHead className="text-right">Q4 (Current)</TableHead>
                  <TableHead className="text-right">QoQ Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Revenue</TableCell>
                  {qoqTrends.map((q, i) => (
                    <TableCell key={i} className="text-right">{formatCurrency(q.revenue)}</TableCell>
                  ))}
                  <TableCell className="text-right text-green-600">
                    +{(((qoqTrends[3].revenue - qoqTrends[2].revenue) / qoqTrends[2].revenue) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Pipeline</TableCell>
                  {qoqTrends.map((q, i) => (
                    <TableCell key={i} className="text-right">{formatCurrency(q.pipeline)}</TableCell>
                  ))}
                  <TableCell className="text-right text-green-600">
                    +{(((qoqTrends[3].pipeline - qoqTrends[2].pipeline) / qoqTrends[2].pipeline) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Win Rate</TableCell>
                  {qoqTrends.map((q, i) => (
                    <TableCell key={i} className="text-right">{formatPercent(q.winRate)}</TableCell>
                  ))}
                  <TableCell className="text-right text-green-600">
                    +{((qoqTrends[3].winRate - qoqTrends[2].winRate) * 100).toFixed(1)}pp
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Service Risk Index</TableCell>
                  {qoqTrends.map((q, i) => (
                    <TableCell key={i} className="text-right">{q.serviceRisk.toFixed(0)}</TableCell>
                  ))}
                  <TableCell className="text-right text-green-600">
                    +{(qoqTrends[3].serviceRisk - qoqTrends[2].serviceRisk).toFixed(1)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 3: Strategic Initiatives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              3. Strategic Initiatives Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Initiative</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initiatives.map((init, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{init.name}</TableCell>
                    <TableCell>{init.owner}</TableCell>
                    <TableCell>{init.target}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={init.progress} className="w-24 h-2" />
                        <span className="text-sm">{init.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        init.status === 'complete' ? 'success' :
                        init.status === 'on_track' ? 'default' : 'warning'
                      } className="capitalize">
                        {init.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 4: KPI Scorecard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              4. KPI Scorecard vs Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Prior Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiScorecard.map(({ slug, value, def }) => {
                  if (!value || !def) return null
                  const formatVal = (v: number) =>
                    def.format === 'currency' ? formatCurrency(v) :
                    def.format === 'percent' ? formatPercent(v) :
                    def.format === 'days' ? `${Math.round(v)} days` :
                    Math.round(v).toString()

                  return (
                    <TableRow key={slug}>
                      <TableCell className="font-medium">{def.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{def.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatVal(value.value)}</TableCell>
                      <TableCell className="text-right text-gray-500">
                        {def.target !== undefined ? formatVal(def.target) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {formatVal(value.previousValue)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          value.status === 'good' ? 'success' :
                          value.status === 'warning' ? 'warning' : 'danger'
                        }>
                          {value.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {value.deltaPercent > 0.01 ? (
                          <ArrowUp className={`h-4 w-4 ${def.higherIsBetter ? 'text-green-600' : 'text-red-600'}`} />
                        ) : value.deltaPercent < -0.01 ? (
                          <ArrowDown className={`h-4 w-4 ${def.higherIsBetter ? 'text-red-600' : 'text-green-600'}`} />
                        ) : (
                          <Minus className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 5: Next Quarter Focus */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              5. Next Quarter Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Priority Initiatives</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <span>Complete CRM data quality initiative - improve hygiene score to 90+</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-1" />
                    <span>Accelerate route optimization rollout - address capacity pressure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Target className="h-4 w-4 text-blue-500 mt-1" />
                    <span>Launch proactive retention program for high-risk accounts</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Key Metrics to Watch</h4>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>Service Risk Index</span>
                    <Badge>Target: 90+</Badge>
                  </li>
                  <li className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>Stalled Opportunities</span>
                    <Badge>Target: &lt;$500K</Badge>
                  </li>
                  <li className="flex items-center justify-between p-2 bg-muted rounded">
                    <span>DSO</span>
                    <Badge>Target: &lt;35 days</Badge>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
