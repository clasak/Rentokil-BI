'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils'
import { TrendingUp, DollarSign, Target } from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { PageHeader } from '@/components/layout/PageHeader'
import type { LeadsByPestType } from '@/lib/bigquery/queries/leads'
import type { LeadsByTypePest } from '@/types/leads'

const PEST_COLORS: Record<string, string> = {
  'General Pest': '#3b82f6', // blue
  'Termite': '#ef4444',      // red
  'Rodent': '#f59e0b',       // amber
  'Wildlife': '#22c55e',     // green
  'Bed Bug': '#8b5cf6',      // violet
  'Mosquito': '#06b6d4',     // cyan
  'Commercial': '#6366f1',   // indigo
  'Other': '#94a3b8',        // gray
}

// Average values by pest type for estimation (when BigQuery doesn't provide)
const AVG_VALUES: Record<string, number> = {
  'General Pest': 850,
  'Termite': 3500,
  'Rodent': 650,
  'Wildlife': 1200,
  'Bed Bug': 1800,
  'Mosquito': 400,
  'Commercial': 5500,
  'Other': 750,
}

const EMPTY_LEADS_BY_TYPE_PEST: LeadsByTypePest[] = []

function transformBigQueryToDisplay(bqData: LeadsByPestType[]): LeadsByTypePest[] {
  const totalLeads = bqData.reduce((sum, d) => sum + d.lead_count, 0)

  return bqData.map((d) => ({
    pestType: d.pest_type,
    leadCount: d.lead_count,
    converted: d.converted,
    avgValue: AVG_VALUES[d.pest_type] || AVG_VALUES['Other'],
    marketShare: d.lead_count / totalLeads,
  }))
}

export default function LeadsByTypePestPage() {
  const {
    data,
    isLoading,
    dataSource,
    responseTime,
    error,
    refetch,
  } = useBigQueryData<LeadsByPestType[], LeadsByTypePest[]>({
    queryName: 'leads-by-pest-type',
    filters: { daysBack: 30 },
    defaultData: EMPTY_LEADS_BY_TYPE_PEST,
    transformBigQueryData: transformBigQueryToDisplay,
  })

  const totalLeads = useMemo(
    () => data.reduce((sum, d) => sum + d.leadCount, 0),
    [data]
  )

  const totalConverted = useMemo(
    () => data.reduce((sum, d) => sum + d.converted, 0),
    [data]
  )

  const totalValue = useMemo(
    () => data.reduce((sum, d) => sum + d.avgValue * d.converted, 0),
    [data]
  )

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.pestType,
        leads: d.leadCount,
        converted: d.converted,
        fill: PEST_COLORS[d.pestType] || PEST_COLORS['Other'],
      })),
    [data]
  )

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumbs */}
      <PageHeader
        title="Leads by Pest Type"
        breadcrumbs={[
          { label: 'Leads', href: '/leads' },
          { label: 'By Type & Pest' },
        ]}
        dataSource={dataSource}
        responseTime={responseTime}
        error={error}
        onRefresh={refetch}
        isLoading={isLoading}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Leads</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(totalLeads)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <Target className="h-4 w-4 mr-1" />
              Across {data.length} pest types
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Converted</CardDescription>
            <CardTitle className="text-3xl">{formatNumber(totalConverted)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {formatPercent(totalConverted / totalLeads)} conversion rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Est. Revenue</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totalValue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4 mr-1" />
              From converted leads
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Deal Size</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(totalValue / totalConverted)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground">
              Per converted lead
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Volume by Pest Type</CardTitle>
            <CardDescription>
              Comparing lead counts and conversions across pest categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <defs>
                    <filter id="glow-pest" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded shadow border border-gray-200 dark:border-gray-700">
                            <p className="font-medium">{d.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Leads: {formatNumber(d.leads)}
                            </p>
                            <p className="text-sm text-green-600">
                              Converted: {formatNumber(d.converted)}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="leads"
                    name="Leads"
                    radius={[0, 4, 4, 0]}
                    activeBar={{ filter: 'url(#glow-pest)' }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate by Pest Type</CardTitle>
            <CardDescription>
              Percentage of leads that converted to customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.map((d) => {
                const rate = d.converted / d.leadCount
                return (
                  <div key={d.pestType} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: PEST_COLORS[d.pestType] || PEST_COLORS['Other'],
                          }}
                        />
                        <span>{d.pestType}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          {d.converted}/{d.leadCount}
                        </span>
                        <span className="font-medium w-16 text-right">
                          {formatPercent(rate)}
                        </span>
                      </div>
                    </div>
                    <Progress value={rate * 100} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pest Type Summary</CardTitle>
          <CardDescription>
            Detailed breakdown of leads, conversions, and values by pest type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pest Type</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Converted</TableHead>
                <TableHead className="text-right">Conversion Rate</TableHead>
                <TableHead className="text-right">Avg Value</TableHead>
                <TableHead className="text-right">Market Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.pestType}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: PEST_COLORS[d.pestType] || PEST_COLORS['Other'],
                        }}
                      />
                      <span className="font-medium">{d.pestType}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(d.leadCount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{formatNumber(d.converted)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        d.converted / d.leadCount > 0.2
                          ? 'default'
                          : d.converted / d.leadCount > 0.1
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {formatPercent(d.converted / d.leadCount)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(d.avgValue)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatPercent(d.leadCount / totalLeads)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
