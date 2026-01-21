"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, ArrowDown, ArrowUp, Minus, DollarSign } from 'lucide-react'
import { PortfolioMetrics } from '@/lib/mock/saltiData'
import { formatCurrency } from '@/lib/utils'

interface SALTIPortfolioProps {
  data: PortfolioMetrics
  className?: string
}

export function SALTIPortfolio({ data, className }: SALTIPortfolioProps) {
  // Waterfall chart data
  const waterfallData = [
    {
      name: 'Gross Sales',
      value: data.gross_sales,
      displayValue: data.gross_sales,
      fill: '#3b82f6',
      isTotal: false
    },
    {
      name: 'Adjustments',
      value: -data.gross_adjustments,
      displayValue: data.gross_adjustments,
      fill: '#f59e0b',
      isTotal: false
    },
    {
      name: 'Terminations',
      value: -data.gross_terminations,
      displayValue: data.gross_terminations,
      fill: '#ef4444',
      isTotal: false
    },
    {
      name: 'Net Gain',
      value: data.net_gain,
      displayValue: data.net_gain,
      fill: '#22c55e',
      isTotal: true
    }
  ]

  // Calculate running total for waterfall positioning
  let runningTotal = 0
  const processedData = waterfallData.map((item, index) => {
    const start = runningTotal
    if (!item.isTotal) {
      runningTotal += item.value
    }
    return {
      ...item,
      start: item.isTotal ? 0 : start,
      end: item.isTotal ? item.value : runningTotal
    }
  })

  const netGainPercent = ((data.net_gain / data.gross_sales) * 100).toFixed(1)
  const isPositiveNet = data.net_gain > 0

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Portfolio Metrics
              <Badge
                variant={isPositiveNet ? "default" : "destructive"}
                className={isPositiveNet ? "bg-green-500" : ""}
              >
                {netGainPercent}% Net
              </Badge>
            </CardTitle>
            <CardDescription>
              Sales portfolio health: Gross to Net walkdown
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(data.net_gain)}
            </div>
            <div className="text-xs text-muted-foreground">Net Gain</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Gross Sales</span>
            </div>
            <div className="text-lg font-bold">{formatCurrency(data.gross_sales)}</div>
          </div>

          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <div className="flex items-center gap-2 mb-1">
              <Minus className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Adjustments</span>
            </div>
            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              -{formatCurrency(data.gross_adjustments)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDown className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Terminations</span>
            </div>
            <div className="text-lg font-bold text-red-600 dark:text-red-400">
              -{formatCurrency(data.gross_terminations)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Net Gain</span>
            </div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(data.net_gain)}
            </div>
          </div>
        </div>

        {/* Waterfall Chart */}
        <div className="h-[250px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload
                    const isNegative = item.value < 0 && !item.isTotal
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="font-medium mb-1">{item.name}</div>
                        <div className={`text-lg font-bold ${
                          item.isTotal ? 'text-green-600' :
                          isNegative ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {isNegative ? '-' : ''}{formatCurrency(item.displayValue)}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <ReferenceLine y={0} stroke="#9ca3af" />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {waterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Net Price Indicator */}
        <div className="mt-4 p-4 rounded-lg bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Net Price (After Adjustments)</span>
          </div>
          <div className="text-lg font-bold">
            {formatCurrency(data.net_price)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
