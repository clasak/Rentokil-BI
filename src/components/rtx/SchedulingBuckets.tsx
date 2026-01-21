'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface SchedulingBucketData {
  category: string
  '0-24h': number
  '1-3 days': number
  '3-7 days': number
  '7+ days': number
}

interface SchedulingBucketsProps {
  data?: SchedulingBucketData[]
  title?: string
  showPercentages?: boolean
}

const defaultData: SchedulingBucketData[] = [
  { category: 'New Installs', '0-24h': 45, '1-3 days': 120, '3-7 days': 85, '7+ days': 32 },
  { category: 'Service Calls', '0-24h': 180, '1-3 days': 145, '3-7 days': 62, '7+ days': 18 },
  { category: 'Inspections', '0-24h': 25, '1-3 days': 95, '3-7 days': 130, '7+ days': 55 },
  { category: 'Renewals', '0-24h': 12, '1-3 days': 68, '3-7 days': 145, '7+ days': 92 },
  { category: 'Emergency', '0-24h': 215, '1-3 days': 35, '3-7 days': 8, '7+ days': 2 },
]

const bucketColors = {
  '0-24h': '#22c55e',    // green-500 - urgent/fast
  '1-3 days': '#3b82f6', // blue-500 - standard
  '3-7 days': '#f59e0b', // amber-500 - delayed
  '7+ days': '#ef4444',  // red-500 - backlog
}

export function SchedulingBuckets({
  data = defaultData,
  title = 'Scheduling Time Buckets',
  showPercentages = false,
}: SchedulingBucketsProps) {
  const processedData = data.map(item => {
    const total = item['0-24h'] + item['1-3 days'] + item['3-7 days'] + item['7+ days']
    if (showPercentages) {
      return {
        category: item.category,
        '0-24h': Number(((item['0-24h'] / total) * 100).toFixed(1)),
        '1-3 days': Number(((item['1-3 days'] / total) * 100).toFixed(1)),
        '3-7 days': Number(((item['3-7 days'] / total) * 100).toFixed(1)),
        '7+ days': Number(((item['7+ days'] / total) * 100).toFixed(1)),
        total,
      }
    }
    return { ...item, total }
  })

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const categoryData = processedData.find(d => d.category === label)
      const total = categoryData?.total || 0

      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Total: {total.toLocaleString()}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <p key={index} className="text-sm flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {showPercentages ? `${entry.value}%` : entry.value.toLocaleString()}
                </span>
              </p>
            ))}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      )}
      <div className="h-[300px] [&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-horizontal_line]:stroke-gray-700 [&_.recharts-cartesian-grid-vertical_line]:stroke-gray-200 dark:[&_.recharts-cartesian-grid-vertical_line]:stroke-gray-700 [&_.recharts-text]:fill-gray-600 dark:[&_.recharts-text]:fill-gray-400">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={processedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => showPercentages ? `${value}%` : value.toLocaleString()}
            />
            <Tooltip cursor={false} content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => (
                <span className="text-gray-700 dark:text-gray-300 text-sm">{value}</span>
              )}
            />
            <Bar
              dataKey="0-24h"
              stackId="a"
              fill={bucketColors['0-24h']}
              name="0-24h"
            />
            <Bar
              dataKey="1-3 days"
              stackId="a"
              fill={bucketColors['1-3 days']}
              name="1-3 days"
            />
            <Bar
              dataKey="3-7 days"
              stackId="a"
              fill={bucketColors['3-7 days']}
              name="3-7 days"
            />
            <Bar
              dataKey="7+ days"
              stackId="a"
              fill={bucketColors['7+ days']}
              name="7+ days"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {Object.entries(bucketColors).map(([bucket, color]) => {
          const total = data.reduce((sum, item) => sum + (item[bucket as keyof SchedulingBucketData] as number || 0), 0)
          return (
            <div key={bucket} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{bucket}</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{total.toLocaleString()}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SchedulingBuckets
