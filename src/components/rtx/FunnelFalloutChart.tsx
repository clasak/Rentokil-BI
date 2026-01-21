'use client'

import { useMemo } from 'react'

interface FunnelStage {
  name: string
  value: number
  color?: string
}

interface FunnelFalloutChartProps {
  data?: FunnelStage[]
  title?: string
  showPercentages?: boolean
  showDropoff?: boolean
  height?: number
}

const defaultData: FunnelStage[] = [
  { name: 'Leads', value: 10000 },
  { name: 'Qualified', value: 6500 },
  { name: 'Proposals', value: 3200 },
  { name: 'Negotiations', value: 1800 },
  { name: 'Won', value: 850 },
]

const defaultColors = [
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#a855f7', // purple-500
  '#22c55e', // green-500
]

export function FunnelFalloutChart({
  data = defaultData,
  title = 'Sales Funnel',
  showPercentages = true,
  showDropoff = true,
  height = 400,
}: FunnelFalloutChartProps) {
  const processedData = useMemo(() => {
    const firstValue = data[0]?.value || 1
    return data.map((stage, index) => {
      const prevValue = index > 0 ? data[index - 1].value : stage.value
      const conversionRate = index > 0 ? (stage.value / prevValue) * 100 : 100
      const overallRate = (stage.value / firstValue) * 100
      const dropoff = index > 0 ? prevValue - stage.value : 0
      const dropoffPercent = index > 0 ? ((prevValue - stage.value) / prevValue) * 100 : 0

      return {
        ...stage,
        color: stage.color || defaultColors[index % defaultColors.length],
        conversionRate,
        overallRate,
        dropoff,
        dropoffPercent,
        widthPercent: (stage.value / firstValue) * 100,
      }
    })
  }, [data])

  const maxValue = data[0]?.value || 1

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{title}</h3>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Funnel visualization */}
        <div className="flex-1" style={{ minHeight: height }}>
          <div className="relative h-full flex flex-col justify-between">
            {processedData.map((stage, index) => {
              const isLast = index === processedData.length - 1

              return (
                <div key={stage.name} className="relative group">
                  {/* Stage bar */}
                  <div className="flex items-center gap-4">
                    {/* Funnel shape */}
                    <div
                      className="relative h-12 rounded-lg transition-all duration-300 group-hover:shadow-lg"
                      style={{
                        width: `${stage.widthPercent}%`,
                        minWidth: '80px',
                        backgroundColor: stage.color,
                        marginLeft: `${(100 - stage.widthPercent) / 2}%`,
                      }}
                    >
                      {/* Stage name inside bar */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-semibold text-white truncate px-2">
                          {stage.name}
                        </span>
                      </div>
                    </div>

                    {/* Value and percentage */}
                    <div className="flex-shrink-0 w-32 text-right">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {stage.value.toLocaleString()}
                      </span>
                      {showPercentages && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          ({stage.overallRate.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dropoff indicator between stages */}
                  {showDropoff && !isLast && (
                    <div className="flex items-center justify-center my-2">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                          -{processedData[index + 1]?.dropoff.toLocaleString()} ({processedData[index + 1]?.dropoffPercent.toFixed(1)}% drop)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats panel */}
        <div className="w-full md:w-64 space-y-4">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Conversion Summary</h4>
            <div className="space-y-3">
              {processedData.slice(1).map((stage, index) => (
                <div key={`conv-${stage.name}`} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {processedData[index].name} → {stage.name}
                  </span>
                  <span className={`text-sm font-semibold ${
                    stage.conversionRate >= 70 ? 'text-green-600 dark:text-green-400' :
                    stage.conversionRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {stage.conversionRate.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Overall Metrics</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Total Conversion</span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  {processedData[processedData.length - 1]?.overallRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Total Drop-off</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  {(100 - (processedData[processedData.length - 1]?.overallRate || 0)).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Biggest Drop</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {(() => {
                    const maxDrop = processedData.slice(1).reduce((max, stage) =>
                      stage.dropoffPercent > max.dropoffPercent ? stage : max
                    , processedData[1])
                    return `${maxDrop?.name} (${maxDrop?.dropoffPercent.toFixed(1)}%)`
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Stage breakdown */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Stage Distribution</h4>
            <div className="space-y-2">
              {processedData.map((stage) => (
                <div key={`dist-${stage.name}`} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-300">{stage.name}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {stage.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FunnelFalloutChart
