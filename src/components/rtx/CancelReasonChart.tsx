'use client'

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

interface CancelReasonData {
  reason: string
  count: number
  percentage: number
  color?: string
}

interface CancelReasonChartProps {
  data?: CancelReasonData[]
  title?: string
  maxItems?: number
}

const defaultData: CancelReasonData[] = [
  { reason: 'Price/Cost', count: 145, percentage: 28.5 },
  { reason: 'Moved/Relocated', count: 98, percentage: 19.3 },
  { reason: 'Service Quality', count: 76, percentage: 14.9 },
  { reason: 'No Longer Needed', count: 64, percentage: 12.6 },
  { reason: 'Competitor Offer', count: 52, percentage: 10.2 },
  { reason: 'Communication Issues', count: 38, percentage: 7.5 },
  { reason: 'Scheduling Problems', count: 22, percentage: 4.3 },
  { reason: 'Other', count: 14, percentage: 2.7 },
]

const colors = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#6b7280', // gray-500
]

export function CancelReasonChart({
  data = defaultData,
  title = 'Cancel Reasons',
  maxItems = 10,
}: CancelReasonChartProps) {
  const displayData = data.slice(0, maxItems).map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length],
  }))

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: CancelReasonData }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">{item.reason}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Count: <span className="font-medium text-gray-900 dark:text-white">{item.count.toLocaleString()}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Percentage: <span className="font-medium text-gray-900 dark:text-white">{item.percentage.toFixed(1)}%</span>
          </p>
        </div>
      )
    }
    return null
  }

  const maxPercentage = Math.max(...displayData.map(d => d.percentage))

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div className="h-[350px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            layout="vertical"
            margin={{ top: 5, right: 80, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, Math.ceil(maxPercentage / 10) * 10]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="reason"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip cursor={false} content={<CustomTooltip />} />
            <Bar
              dataKey="percentage"
              radius={[0, 4, 4, 0]}
              label={{
                position: 'right',
                formatter: (value: number) => `${value.toFixed(1)}% (${displayData.find(d => d.percentage === value)?.count || 0})`,
                fill: 'currentColor',
                fontSize: 11,
                className: 'fill-gray-600 dark:fill-gray-400',
              }}
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {displayData.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">{item.reason}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CancelReasonChart
