"use client"

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import {
  XCircle, TrendingUp, TrendingDown, DollarSign, Calendar,
  AlertTriangle, RefreshCw, ArrowRight, Clock
} from 'lucide-react'
import {
  generateMockCanceledAgreements,
  generateMockCancelReasonAnalysis,
} from '@/lib/mock/salesExtendedData'
import type { CanceledAgreement, CancelReason } from '@/types/sales-extended'

const REASON_COLORS: Record<CancelReason, string> = {
  price: '#ef4444',
  competitor: '#f97316',
  changed_mind: '#f59e0b',
  service_not_needed: '#84cc16',
  moved: '#22c55e',
  financial: '#14b8a6',
  poor_service: '#06b6d4',
  scheduling: '#3b82f6',
  other: '#8b5cf6',
}

export default function CanceledAgreementsPage() {
  const [agreements] = useState(() => generateMockCanceledAgreements(40))
  const [reasonAnalysis] = useState(() => generateMockCancelReasonAnalysis())
  const [reasonFilter, setReasonFilter] = useState<CancelReason | 'all'>('all')

  // Calculate summary metrics
  const totalCanceled = agreements.length
  const totalValue = agreements.reduce((sum, a) => sum + a.amount, 0)
  const avgDaysToCancel = agreements.reduce((sum, a) => sum + a.daysToCancel, 0) / totalCanceled
  const recoveryAttempts = agreements.filter(a => a.recoveryAttempted).length
  const successfulRecoveries = agreements.filter(a => a.recoverySuccessful).length
  const recoveryRate = recoveryAttempts > 0 ? successfulRecoveries / recoveryAttempts : 0

  // By initiator
  const customerInitiated = agreements.filter(a => a.cancelInitiator === 'customer').length
  const companyInitiated = agreements.filter(a => a.cancelInitiator === 'company').length

  // Pre vs post start
  const preStartCancels = agreements.filter(a => !a.wasStarted).length
  const postStartCancels = agreements.filter(a => a.wasStarted).length

  // Reason chart data
  const reasonChartData = reasonAnalysis.map(r => ({
    name: r.reasonLabel,
    count: r.count,
    value: r.value,
    fill: REASON_COLORS[r.reason],
  }))

  // Trend indicator data (mock weekly trend)
  const trendData = [
    { week: 'W1', cancels: 8, value: 24000 },
    { week: 'W2', cancels: 12, value: 36000 },
    { week: 'W3', cancels: 6, value: 18000 },
    { week: 'W4', cancels: 10, value: 30000 },
    { week: 'W5', cancels: 9, value: 27000 },
    { week: 'W6', cancels: 7, value: 21000 },
  ]

  // Filtered agreements
  const filteredAgreements = useMemo(() => {
    if (reasonFilter === 'all') return agreements
    return agreements.filter(a => a.cancelReason === reasonFilter)
  }, [agreements, reasonFilter])

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Sales', href: '/sales' },
        { label: 'Canceled Agreements' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Canceled Agreements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analysis of canceled sales and recovery efforts
          </p>
        </div>
        <Badge variant="danger">
          {totalCanceled} cancellations
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Canceled</p>
                <p className="text-2xl font-bold">{totalCanceled}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <DollarSign className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Lost Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Days to Cancel</p>
                <p className="text-2xl font-bold">{avgDaysToCancel.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <RefreshCw className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Recovery Rate</p>
                <p className="text-2xl font-bold">{formatPercent(recoveryRate)}</p>
                <p className="text-xs text-gray-500">{successfulRecoveries} of {recoveryAttempts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pre-Start Cancels</p>
                <p className="text-2xl font-bold">{preStartCancels}</p>
                <p className="text-xs text-gray-500">{postStartCancels} post-start</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reason Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Cancel Reasons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonChartData} layout="vertical">
                  <defs>
                    <filter id="glow-reason" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm">{data.count} cancellations</p>
                          <p className="text-sm text-gray-500">{formatCurrency(data.value)} lost</p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[0, 4, 4, 0]}
                    activeBar={{ filter: 'url(#glow-reason)' }}
                  >
                    {reasonChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trend Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Weekly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `$${v/1000}K`} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm text-red-600">{payload[0]?.value} cancellations</p>
                          <p className="text-sm text-yellow-600">{formatCurrency(payload[1]?.value as number)} lost</p>
                        </div>
                      )
                    }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cancels"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 0, r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', strokeWidth: 0, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Cancellations
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                Lost Revenue
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reason Analysis Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Reason Analysis with Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reasonAnalysis.slice(0, 6).map((reason) => (
              <div
                key={reason.reason}
                className="p-4 border rounded-lg dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{reason.reasonLabel}</span>
                  <Badge
                    variant={reason.trend === 'increasing' ? 'danger' : reason.trend === 'decreasing' ? 'success' : 'secondary'}
                    className="text-xs"
                  >
                    {reason.trend === 'increasing' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {reason.trend === 'decreasing' && <TrendingDown className="h-3 w-3 mr-1" />}
                    {reason.trend}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{reason.count} cancels</span>
                  <span className="font-medium">{formatCurrency(reason.value)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-500 dark:text-gray-400">Avg days to cancel</span>
                  <span>{reason.avgDaysToCancel.toFixed(1)}</span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${reason.percentOfTotal * 100}%`,
                      backgroundColor: REASON_COLORS[reason.reason],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Canceled Agreements Detail
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value as CancelReason | 'all')}
                className="px-3 py-1 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="all">All Reasons</option>
                {reasonAnalysis.map(r => (
                  <option key={r.reason} value={r.reason}>{r.reasonLabel}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Rep</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Canceled</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Recovery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgreements.slice(0, 20).map((agreement) => (
                  <TableRow key={agreement.id}>
                    <TableCell className="font-mono text-sm">{agreement.id}</TableCell>
                    <TableCell className="max-w-[120px] truncate" title={agreement.accountName}>
                      {agreement.accountName}
                    </TableCell>
                    <TableCell>{agreement.serviceType}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatCurrency(agreement.amount)}
                    </TableCell>
                    <TableCell>{agreement.repName}</TableCell>
                    <TableCell>
                      {agreement.soldDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      {agreement.cancelDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: REASON_COLORS[agreement.cancelReason], color: REASON_COLORS[agreement.cancelReason] }}
                      >
                        {reasonAnalysis.find(r => r.reason === agreement.cancelReason)?.reasonLabel || agreement.cancelReason}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {agreement.recoveryAttempted ? (
                        agreement.recoverySuccessful ? (
                          <Badge variant="success" className="text-xs">Recovered</Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">Attempted</Badge>
                        )
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredAgreements.length > 20 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
              Showing 20 of {filteredAgreements.length} canceled agreements
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
