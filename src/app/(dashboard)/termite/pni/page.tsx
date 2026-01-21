'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, FunnelChart, Funnel, LabelList
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Search, AlertTriangle, TrendingUp, DollarSign, FileSearch, CheckCircle, Bug } from 'lucide-react'
import { generateMockPNISummary, generateMockPNIInspections } from '@/lib/mock/termiteData'
import type { PNISummary, PNIInspection } from '@/types/termite'

export default function PNIPage() {
  const [summary, setSummary] = useState<PNISummary | null>(null)
  const [inspections, setInspections] = useState<PNIInspection[]>([])

  useEffect(() => {
    setSummary(generateMockPNISummary())
    setInspections(generateMockPNIInspections(50))
  }, [])

  // Inspection type breakdown
  const typeChartData = useMemo(() => {
    if (!summary) return []
    return Object.entries(summary.byInspectionType).map(([type, data]) => ({
      type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: data.count,
      activityRate: data.activityRate * 100,
      conversionRate: data.conversionRate * 100,
      revenue: data.revenue,
    }))
  }, [summary])

  // Conversion funnel data
  const funnelData = useMemo(() => {
    if (!summary) return []
    return [
      { name: 'Inspections', value: summary.totalInspections, fill: '#3b82f6' },
      { name: 'Activity Found', value: summary.withActivityFound, fill: '#f59e0b' },
      { name: 'Proposals Sent', value: summary.proposalsSent, fill: '#8b5cf6' },
      { name: 'Sales Converted', value: summary.salesConverted, fill: '#22c55e' },
    ]
  }, [summary])

  // Recent inspections with activity
  const recentWithActivity = useMemo(() => {
    return inspections
      .filter(i => i.termiteActivityFound)
      .sort((a, b) => b.inspectionDate.getTime() - a.inspectionDate.getTime())
      .slice(0, 10)
  }, [inspections])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'converted': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Converted</Badge>
      case 'proposal_sent': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Proposal Sent</Badge>
      case 'needs_follow_up': return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Needs Follow-up</Badge>
      case 'completed': return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">Completed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDamageBadge = (level: string) => {
    switch (level) {
      case 'extensive': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Extensive</Badge>
      case 'severe': return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Severe</Badge>
      case 'moderate': return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Moderate</Badge>
      case 'minor': return <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400">Minor</Badge>
      default: return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">None</Badge>
    }
  }

  if (!summary) return <div className="flex items-center justify-center h-64">Loading...</div>

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Termite', href: '/termite/pni' },
        { label: 'PNI Inspections' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PNI Inspections</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {summary.period} - Pre-New Install inspection dashboard
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileSearch className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Inspections</div>
                <div className="text-2xl font-bold">{summary.totalInspections}</div>
                <div className="text-xs text-gray-500">{summary.completedInspections} completed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Bug className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Activity Rate</div>
                <div className="text-2xl font-bold text-orange-600">{formatPercent(summary.activityRate)}</div>
                <div className="text-xs text-gray-500">{summary.withActivityFound} with activity</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Search className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Proposal Rate</div>
                <div className="text-2xl font-bold text-purple-600">{formatPercent(summary.proposalRate)}</div>
                <div className="text-xs text-gray-500">{summary.proposalsSent} proposals sent</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Conversion Rate</div>
                <div className="text-2xl font-bold text-green-600">{formatPercent(summary.conversionRate)}</div>
                <div className="text-xs text-gray-500">{summary.salesConverted} converted</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(summary.totalRevenue)}</div>
                <div className="text-xs text-gray-500">Avg: {formatCurrency(summary.avgSaleAmount)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>Inspection to sale conversion flow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm">{data.value.toLocaleString()}</p>
                        </div>
                      )
                    }}
                  />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="#374151" stroke="none" dataKey="name" />
                    <LabelList position="center" fill="#fff" stroke="none" dataKey="value" />
                    {funnelData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
            {/* Funnel conversion rates */}
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div className="p-2 rounded bg-gray-50 dark:bg-gray-800/50">
                <div className="text-lg font-bold text-orange-600">{formatPercent(summary.activityRate)}</div>
                <div className="text-xs text-gray-500">Activity Rate</div>
              </div>
              <div className="p-2 rounded bg-gray-50 dark:bg-gray-800/50">
                <div className="text-lg font-bold text-purple-600">{formatPercent(summary.proposalRate)}</div>
                <div className="text-xs text-gray-500">Proposal Rate</div>
              </div>
              <div className="p-2 rounded bg-gray-50 dark:bg-gray-800/50">
                <div className="text-lg font-bold text-green-600">{formatPercent(summary.conversionRate)}</div>
                <div className="text-xs text-gray-500">Close Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspections by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Inspections by Type
            </CardTitle>
            <CardDescription>Volume and conversion by inspection type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{data.type}</p>
                          <p className="text-sm">Count: {data.count}</p>
                          <p className="text-sm text-orange-600">Activity: {data.activityRate.toFixed(1)}%</p>
                          <p className="text-sm text-green-600">Conversion: {data.conversionRate.toFixed(1)}%</p>
                          <p className="text-sm">Revenue: {formatCurrency(data.revenue)}</p>
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Inspections" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="conversionRate" fill="#22c55e" name="Conversion %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Inspectors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Inspectors</CardTitle>
          <CardDescription>Performance by inspector</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {summary.topInspectors.map((inspector, i) => (
              <div key={i} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
                  <span className="text-lg font-bold text-blue-600">#{i + 1}</span>
                </div>
                <div className="font-medium text-sm">{inspector.inspectorName}</div>
                <div className="text-xs text-gray-500 mt-1">{inspector.inspections} inspections</div>
                <div className="text-sm font-bold text-green-600 mt-1">{formatPercent(inspector.conversionRate)}</div>
                <div className="text-xs text-gray-500">{formatCurrency(inspector.revenue)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Inspections with Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Recent Inspections with Activity
          </CardTitle>
          <CardDescription>Properties requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Activity Type</TableHead>
                <TableHead>Damage Level</TableHead>
                <TableHead className="text-right">Est. Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentWithActivity.map(inspection => (
                <TableRow key={inspection.id}>
                  <TableCell>
                    <div className="font-medium">{inspection.accountName}</div>
                    <div className="text-xs text-gray-500">{inspection.propertyAddress}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{inspection.inspectionType.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{inspection.inspectorName}</TableCell>
                  <TableCell className="text-sm text-gray-500">{inspection.inspectionDate.toLocaleDateString()}</TableCell>
                  <TableCell className="capitalize">{inspection.activityType || '-'}</TableCell>
                  <TableCell>{getDamageBadge(inspection.damageLevel || 'none')}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(inspection.estimatedCost)}</TableCell>
                  <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
