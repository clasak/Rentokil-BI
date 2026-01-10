"use client"

import { useMemo } from 'react'
import Link from 'next/link'
import { calculateKPIValues, getPipelineByStage } from '@/lib/kpi-calculations'
import { getOpportunities } from '@/lib/data'
import { getActiveBusinessUnits, formatRevenue } from '@/lib/business-units'
import { ViewToggle } from '@/components/features/ViewToggle'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend
} from 'recharts'
import {
  TrendingUp, DollarSign, Target, Users, ArrowRight,
  Building2, Percent, Trophy, AlertTriangle, ChevronRight
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const STAGE_COLORS = {
  prospecting: '#94a3b8',
  qualification: '#60a5fa',
  proposal: '#a78bfa',
  negotiation: '#f97316',
  closed_won: '#22c55e',
  closed_lost: '#ef4444'
}

export default function NationalSalesPage() {
  const kpiValues = useMemo(() => calculateKPIValues(), [])
  const pipelineByStage = useMemo(() => getPipelineByStage(), [])
  const opportunities = useMemo(() => getOpportunities(), [])
  const businessUnits = useMemo(() => getActiveBusinessUnits(), [])

  // Calculate key metrics
  const revenueMTD = kpiValues.get('revenue_mtd')
  const pipeline = kpiValues.get('pipeline_30_60_90')
  const winRate = kpiValues.get('win_rate')
  const avgDealSize = kpiValues.get('avg_deal_size')

  // Calculate regional breakdown (simulated)
  const regionalData = businessUnits.map(bu => ({
    name: bu.shortName,
    color: bu.color,
    revenue: bu.metrics.annualRevenue / 12, // Monthly estimate
    pipeline: Math.round(bu.metrics.annualRevenue * 0.3), // 30% of annual as pipeline
    winRate: Math.round(35 + Math.random() * 20), // 35-55%
    deals: Math.round(bu.metrics.accounts * 0.05) // 5% active deals
  }))

  // Top opportunities
  const topOpportunities = [...opportunities]
    .filter(o => !['closed_won', 'closed_lost'].includes(o.stage))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  // Pipeline chart data
  const pipelineChartData = pipelineByStage.map(stage => ({
    stage: stage.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: stage.count,
    value: stage.value,
    weighted: stage.weightedValue
  }))

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-blue-600" />
            National Sales View
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cross-regional sales performance and pipeline analysis
          </p>
        </div>
        <ViewToggle variant="dropdown" />
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 opacity-80" />
              <div>
                <div className="text-sm opacity-80">Revenue MTD</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(revenueMTD?.value ?? 0)}
                </div>
                <div className="text-xs opacity-70 flex items-center gap-1">
                  {revenueMTD && revenueMTD.deltaPercent >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                  {revenueMTD?.deltaPercent?.toFixed(1)}% vs prior
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 opacity-80" />
              <div>
                <div className="text-sm opacity-80">Total Pipeline</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(pipeline?.value ?? 0)}
                </div>
                <div className="text-xs opacity-70">30/60/90 day weighted</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Percent className="h-8 w-8 text-green-500" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Win Rate</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {((winRate?.value ?? 0) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">All time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-500" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Deal Size</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(avgDealSize?.value ?? 0)}
                </div>
                <div className="text-xs text-gray-500">Closed won</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
            <CardDescription>Opportunity count and value by sales stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 12 }} />
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="weighted" fill="#3b82f6" name="Weighted Value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Regional Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Sales Performance</CardTitle>
            <CardDescription>Pipeline and win rates by business unit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regionalData.slice(0, 5).map(region => (
                <div key={region.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: region.color }}
                      />
                      <span className="font-medium">{region.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{region.deals} deals</span>
                      <Badge variant={region.winRate >= 45 ? 'success' : region.winRate >= 35 ? 'warning' : 'secondary'}>
                        {region.winRate}% win rate
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress value={Math.min(100, (region.pipeline / 300) * 100)} className="flex-1" />
                    <span className="text-sm font-medium text-green-600 w-20 text-right">
                      ${region.pipeline}M
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Opportunities Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top Opportunities</CardTitle>
              <CardDescription>Highest value open opportunities across all regions</CardDescription>
            </div>
            <Link href="/sales">
              <Button variant="outline" size="sm">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-center">Probability</TableHead>
                <TableHead className="text-right">Weighted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topOpportunities.map(opp => (
                <TableRow key={opp.id}>
                  <TableCell>
                    <div className="font-medium">{opp.name}</div>
                    <div className="text-xs text-gray-500">{opp.id}</div>
                  </TableCell>
                  <TableCell>{opp.accountName}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: STAGE_COLORS[opp.stage as keyof typeof STAGE_COLORS] || '#94a3b8',
                        color: STAGE_COLORS[opp.stage as keyof typeof STAGE_COLORS] || '#94a3b8'
                      }}
                    >
                      {opp.stage.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(opp.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {Math.round(opp.probability * 100)}%
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {formatCurrency(opp.amount * opp.probability)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/sales/opportunity/${opp.id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/lead-service-engine">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="font-medium">Lead Engine</div>
              <div className="text-sm text-gray-500">Pipeline intake</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/forecast">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="font-medium">Forecast</div>
              <div className="text-sm text-gray-500">Revenue projections</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/sales">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="font-medium">Sales Dashboard</div>
              <div className="text-sm text-gray-500">Detailed view</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/wbr">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <div className="font-medium">WBR</div>
              <div className="text-sm text-gray-500">Weekly review</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
