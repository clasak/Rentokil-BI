"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, FileSignature, Briefcase, Hammer } from 'lucide-react'
import { SalesResultsMetrics } from '@/lib/mock/saltiData'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface SALTISalesResultsProps {
  data: SalesResultsMetrics
  className?: string
}

export function SALTISalesResults({ data, className }: SALTISalesResultsProps) {
  // Pie chart data for sales breakdown
  const breakdownData = [
    { name: 'Contracts', value: data.contracts_value, units: data.contracts_units, color: '#3b82f6' },
    { name: 'INIs', value: data.inis_value, units: data.inis_units, color: '#8b5cf6' },
    { name: 'Jobs', value: data.jobs_value, units: data.jobs_units, color: '#22c55e' }
  ]

  // Bar chart for Started vs Net
  const comparisonData = [
    { name: 'Started', value: data.started_sales, color: '#3b82f6' },
    { name: 'Net', value: data.net_sales, color: '#22c55e' }
  ]

  const isPositiveYoY = data.yoy_variance_pct > 0

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Sales Results
              <Badge
                variant={isPositiveYoY ? "default" : "destructive"}
                className={isPositiveYoY ? "bg-green-500" : ""}
              >
                {isPositiveYoY ? '+' : ''}{data.yoy_variance_pct.toFixed(1)}% YoY
              </Badge>
            </CardTitle>
            <CardDescription>
              Breakdown of contracts, initial services, and one-time jobs
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(data.net_sales)}
            </div>
            <div className="text-xs text-muted-foreground">Net Sales</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart - Sales Breakdown */}
          <div>
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Sales by Type
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {breakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="font-medium mb-1">{item.name}</div>
                            <div className="text-lg font-bold">{formatCurrency(item.value)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatNumber(item.units)} units
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-2">
              {breakdownData.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart - Started vs Net */}
          <div>
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Started vs Net Sales
            </div>
            <div className="h-[220px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                            <div className="font-medium mb-1">{item.name} Sales</div>
                            <div className="text-lg font-bold">{formatCurrency(item.value)}</div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {comparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Stats below chart */}
            <div className="flex justify-center gap-6 mt-2 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                Started as % of Net:
                <span className="font-medium text-foreground">
                  {data.started_as_pct_of_net.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Cards */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t dark:border-gray-700">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <FileSignature className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Contracts</span>
            </div>
            <div className="text-xl font-bold">{formatCurrency(data.contracts_value)}</div>
            <div className="text-xs text-muted-foreground">{formatNumber(data.contracts_units)} units</div>
          </div>

          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">INIs</span>
            </div>
            <div className="text-xl font-bold">{formatCurrency(data.inis_value)}</div>
            <div className="text-xs text-muted-foreground">{formatNumber(data.inis_units)} units</div>
          </div>

          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Hammer className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Jobs</span>
            </div>
            <div className="text-xl font-bold">{formatCurrency(data.jobs_value)}</div>
            <div className="text-xs text-muted-foreground">{formatNumber(data.jobs_units)} units</div>
          </div>
        </div>

        {/* YoY Variance */}
        <div className="mt-4 p-4 rounded-lg bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPositiveYoY ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium">Year-over-Year Variance</span>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${isPositiveYoY ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositiveYoY ? '+' : ''}{formatCurrency(data.yoy_variance)}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.cy_vs_lytd_pct.toFixed(1)}% of LYTD
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
