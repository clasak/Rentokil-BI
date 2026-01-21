'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'

interface YoYDataPoint {
  month: string
  currentYear: number
  priorYear: number
  changePercent: number
}

interface YoYComparisonChartProps {
  data?: YoYDataPoint[]
  title?: string
  currentYearLabel?: string
  priorYearLabel?: string
  valuePrefix?: string
  showChangeLabels?: boolean
}

const defaultData: YoYDataPoint[] = [
  { month: 'Jan', currentYear: 125000, priorYear: 110000, changePercent: 13.6 },
  { month: 'Feb', currentYear: 138000, priorYear: 122000, changePercent: 13.1 },
  { month: 'Mar', currentYear: 152000, priorYear: 135000, changePercent: 12.6 },
  { month: 'Apr', currentYear: 148000, priorYear: 140000, changePercent: 5.7 },
  { month: 'May', currentYear: 165000, priorYear: 148000, changePercent: 11.5 },
  { month: 'Jun', currentYear: 178000, priorYear: 155000, changePercent: 14.8 },
  { month: 'Jul', currentYear: 172000, priorYear: 160000, changePercent: 7.5 },
  { month: 'Aug', currentYear: 185000, priorYear: 168000, changePercent: 10.1 },
  { month: 'Sep', currentYear: 192000, priorYear: 175000, changePercent: 9.7 },
  { month: 'Oct', currentYear: 205000, priorYear: 182000, changePercent: 12.6 },
  { month: 'Nov', currentYear: 198000, priorYear: 178000, changePercent: 11.2 },
  { month: 'Dec', currentYear: 215000, priorYear: 195000, changePercent: 10.3 },
]

const formatValue = (value: number, prefix: string = '$') => {
  if (value >= 1000000) {
    return `${prefix}${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${prefix}${(value / 1000).toFixed(0)}K`
  }
  return `${prefix}${value}`
}

export function YoYComparisonChart({
  data = defaultData,
  title = 'Year-over-Year Revenue Comparison',
  currentYearLabel = '2026',
  priorYearLabel = '2025',
  valuePrefix = '$',
  showChangeLabels = true,
}: YoYComparisonChartProps) {
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const currentYearValue = payload.find(p => p.dataKey === 'currentYear')?.value || 0
      const priorYearValue = payload.find(p => p.dataKey === 'priorYear')?.value || 0
      const changePercent = priorYearValue > 0
        ? ((currentYearValue - priorYearValue) / priorYearValue * 100).toFixed(1)
        : '0'
      const isPositive = Number(changePercent) >= 0

      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded mr-2" style={{ backgroundColor: '#3b82f6' }}></span>
              <span className="text-gray-600 dark:text-gray-400">{currentYearLabel}: </span>
              <span className="font-medium text-gray-900 dark:text-white">{formatValue(currentYearValue, valuePrefix)}</span>
            </p>
            <p className="text-sm">
              <span className="inline-block w-3 h-3 rounded mr-2" style={{ backgroundColor: '#94a3b8' }}></span>
              <span className="text-gray-600 dark:text-gray-400">{priorYearLabel}: </span>
              <span className="font-medium text-gray-900 dark:text-white">{formatValue(priorYearValue, valuePrefix)}</span>
            </p>
            <p className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? '+' : ''}{changePercent}% YoY
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const renderChangeLabel = (props: Record<string, unknown>) => {
    const x = (props.x as number) ?? 0
    const y = (props.y as number) ?? 0
    const width = (props.width as number) ?? 0
    const index = (props.index as number) ?? 0
    const item = data[index]
    if (!item) return null
    const isPositive = item.changePercent >= 0

    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill={isPositive ? '#16a34a' : '#dc2626'}
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
      >
        {isPositive ? '+' : ''}{item.changePercent.toFixed(1)}%
      </text>
    )
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 30, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => formatValue(value, valuePrefix)}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip cursor={false} content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => (
                <span className="text-gray-700 dark:text-gray-300">
                  {value === 'currentYear' ? currentYearLabel : priorYearLabel}
                </span>
              )}
            />
            <Bar
              dataKey="priorYear"
              fill="#94a3b8"
              radius={[4, 4, 0, 0]}
              name="priorYear"
            />
            <Bar
              dataKey="currentYear"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              name="currentYear"
            >
              {showChangeLabels && (
                <LabelList content={renderChangeLabel as (props: object) => React.ReactNode} />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default YoYComparisonChart
