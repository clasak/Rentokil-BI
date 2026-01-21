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
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { RefreshCw, AlertTriangle, DollarSign, Calendar, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'
import { generateMockRenewalSummary, generateMockTermiteRenewals } from '@/lib/mock/termiteData'
import type { RenewalSummary, TermiteRenewal } from '@/types/termite'

export default function RenewalsPage() {
  const [summary, setSummary] = useState<RenewalSummary | null>(null)
  const [renewals, setRenewals] = useState<TermiteRenewal[]>([])

  useEffect(() => {
    setSummary(generateMockRenewalSummary())
    setRenewals(generateMockTermiteRenewals(50))
  }, [])

  // Renewal status breakdown
  const statusChartData = useMemo(() => {
    if (!summary) return []
    return [
      { name: 'Renewed', value: summary.renewed, fill: '#22c55e' },
      { name: 'Pending', value: summary.pending, fill: '#f59e0b' },
      { name: 'Canceled', value: summary.canceled, fill: '#ef4444' },
    ]
  }, [summary])

  // Upcoming renewals
  const upcomingRenewals = useMemo(() => {
    return renewals
      .filter(r => r.status === 'upcoming' || r.status === 'due')
      .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
      .slice(0, 15)
  }, [renewals])

  // At-risk renewals
  const atRiskRenewals = useMemo(() => {
    return renewals
      .filter(r => r.churnRisk === 'high')
      .sort((a, b) => b.currentAnnualValue - a.currentAnnualValue)
      .slice(0, 10)
  }, [renewals])

  // Simulated monthly trend data
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      month: new Date(2024, i).toLocaleDateString('en-US', { month: 'short' }),
      due: Math.round(80 + Math.random() * 40),
      renewed: Math.round(65 + Math.random() * 35),
      rate: 0.8 + Math.random() * 0.15,
    })).map(d => ({ ...d, rate: (d.renewed / d.due) * 100 }))
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'renewed': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Renewed</Badge>
      case 'upcoming': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Upcoming</Badge>
      case 'due': return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Due</Badge>
      case 'in_negotiation': return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">In Negotiation</Badge>
      case 'canceled': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Canceled</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'high': return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">High Risk</Badge>
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Medium Risk</Badge>
      default: return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Low Risk</Badge>
    }
  }

  if (!summary) return <div className="flex items-center justify-center h-64">Loading...</div>

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Termite', href: '/termite/pni' },
        { label: 'Renewals' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Termite Renewals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {summary.period} - Contract renewal management
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Due</div>
                <div className="text-2xl font-bold">{summary.totalDue}</div>
                <div className="text-xs text-gray-500">{formatCurrency(summary.totalValue)}</div>
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
                <div className="text-sm text-gray-500 dark:text-gray-400">Renewal Rate</div>
                <div className="text-2xl font-bold text-green-600">{formatPercent(summary.renewalRate)}</div>
                <div className="text-xs text-gray-500">{summary.renewed} renewed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Cancel Rate</div>
                <div className="text-2xl font-bold text-red-600">{formatPercent(summary.cancelRate)}</div>
                <div className="text-xs text-gray-500">{summary.canceled} canceled</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Price Increase</div>
                <div className="text-2xl font-bold text-purple-600">{formatPercent(summary.avgPriceIncreasePercent / 100)}</div>
                <div className="text-xs text-gray-500">{formatCurrency(summary.avgPriceIncrease)} avg</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">High Risk</div>
                <div className="text-2xl font-bold text-orange-600">{summary.highRiskCount}</div>
                <div className="text-xs text-gray-500">{formatCurrency(summary.highRiskValue)} at risk</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Renewal Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Renewal Status
            </CardTitle>
            <CardDescription>Current period breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{payload[0].name}</p>
                          <p className="text-sm">{payload[0].value} contracts</p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Value breakdown */}
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div className="p-2 rounded bg-green-50 dark:bg-green-900/20">
                <div className="text-lg font-bold text-green-600">{formatCurrency(summary.renewedValue)}</div>
                <div className="text-xs text-gray-500">Renewed Value</div>
              </div>
              <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
                <div className="text-lg font-bold text-yellow-600">{formatCurrency(summary.pendingValue)}</div>
                <div className="text-xs text-gray-500">Pending Value</div>
              </div>
              <div className="p-2 rounded bg-red-50 dark:bg-red-900/20">
                <div className="text-lg font-bold text-red-600">{formatCurrency(summary.canceledValue)}</div>
                <div className="text-xs text-gray-500">Canceled Value</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Renewal Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Renewal Trend
            </CardTitle>
            <CardDescription>Monthly renewal performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="renewalfill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium mb-2">{label}</p>
                          {payload.map((entry: any, i: number) => (
                            <p key={i} className="text-sm" style={{ color: entry.color }}>
                              {entry.name}: {entry.dataKey === 'rate' ? `${entry.value.toFixed(1)}%` : entry.value}
                            </p>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="due" fill="#3b82f6" name="Due" radius={[4, 4, 0, 0]} />
                  <Area yAxisId="left" type="monotone" dataKey="renewed" stroke="#22c55e" fill="url(#renewalfill)" name="Renewed" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Renewals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            At-Risk Accounts
          </CardTitle>
          <CardDescription>High churn risk contracts requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Contract Value</TableHead>
                <TableHead>Renewal Date</TableHead>
                <TableHead>Days Until</TableHead>
                <TableHead>Price Change</TableHead>
                <TableHead>Risk Factors</TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRiskRenewals.map(renewal => (
                <TableRow key={renewal.id}>
                  <TableCell>
                    <div className="font-medium">{renewal.accountName}</div>
                    <div className="text-xs text-gray-500">{renewal.propertyAddress}</div>
                  </TableCell>
                  <TableCell className="font-bold">{formatCurrency(renewal.currentAnnualValue)}</TableCell>
                  <TableCell className="text-sm">{renewal.renewalDate.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={renewal.daysUntilRenewal < 0 ? 'danger' : renewal.daysUntilRenewal < 30 ? 'warning' : 'outline'}>
                      {renewal.daysUntilRenewal < 0 ? `${Math.abs(renewal.daysUntilRenewal)} overdue` : `${renewal.daysUntilRenewal} days`}
                    </Badge>
                  </TableCell>
                  <TableCell className={renewal.priceChangePercent > 0 ? 'text-green-600' : 'text-red-600'}>
                    {renewal.priceChangePercent > 0 ? '+' : ''}{renewal.priceChangePercent.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {renewal.riskFactors?.map((factor, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{factor}</Badge>
                      ))}
                      {renewal.competitorThreat && (
                        <Badge variant="danger" className="text-xs">Competitor</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRiskBadge(renewal.churnRisk)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upcoming Renewals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Renewals
          </CardTitle>
          <CardDescription>Contracts due for renewal</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Treatment Type</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Proposed Value</TableHead>
                <TableHead>Price Change</TableHead>
                <TableHead>Renewal Date</TableHead>
                <TableHead>Days Until</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingRenewals.map(renewal => (
                <TableRow key={renewal.id}>
                  <TableCell>
                    <div className="font-medium">{renewal.accountName}</div>
                    <div className="text-xs text-gray-500">{renewal.contractId}</div>
                  </TableCell>
                  <TableCell className="capitalize">{renewal.treatmentType.replace('_', ' ')}</TableCell>
                  <TableCell>{formatCurrency(renewal.currentAnnualValue)}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(renewal.proposedRenewalValue)}</TableCell>
                  <TableCell className={renewal.priceChange > 0 ? 'text-green-600' : 'text-red-600'}>
                    {renewal.priceChange > 0 ? '+' : ''}{formatCurrency(renewal.priceChange)}
                  </TableCell>
                  <TableCell className="text-sm">{renewal.renewalDate.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={renewal.daysUntilRenewal < 0 ? 'danger' : renewal.daysUntilRenewal < 14 ? 'warning' : 'outline'}>
                      {renewal.daysUntilRenewal < 0 ? `${Math.abs(renewal.daysUntilRenewal)} overdue` : `${renewal.daysUntilRenewal} days`}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(renewal.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
