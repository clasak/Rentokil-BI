'use client'

interface BacklogStage {
  id: string
  name: string
  count: number
  value: number
  color: string
  description?: string
}

interface BacklogPipelineProps {
  stages?: BacklogStage[]
  title?: string
  showValues?: boolean
  valuePrefix?: string
}

const defaultStages: BacklogStage[] = [
  { id: 'pending', name: 'Pending Assignment', count: 45, value: 125000, color: '#6366f1', description: 'Awaiting tech assignment' },
  { id: 'scheduled', name: 'Scheduled', count: 128, value: 342000, color: '#3b82f6', description: 'Has appointment date' },
  { id: 'in-progress', name: 'In Progress', count: 32, value: 89000, color: '#22c55e', description: 'Currently being serviced' },
  { id: 'pending-parts', name: 'Pending Parts', count: 18, value: 52000, color: '#f59e0b', description: 'Waiting for materials' },
  { id: 'follow-up', name: 'Follow-up Required', count: 24, value: 68000, color: '#ef4444', description: 'Needs additional visit' },
]

const formatValue = (value: number, prefix: string = '$') => {
  if (value >= 1000000) {
    return `${prefix}${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `${prefix}${(value / 1000).toFixed(0)}K`
  }
  return `${prefix}${value}`
}

export function BacklogPipeline({
  stages = defaultStages,
  title = 'Service Backlog Pipeline',
  showValues = true,
  valuePrefix = '$',
}: BacklogPipelineProps) {
  const totalCount = stages.reduce((sum, stage) => sum + stage.count, 0)
  const totalValue = stages.reduce((sum, stage) => sum + stage.value, 0)
  const maxCount = Math.max(...stages.map(s => s.count))

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Total: <span className="font-semibold text-gray-900 dark:text-white">{totalCount.toLocaleString()} items</span>
            </span>
            {showValues && (
              <span className="text-gray-500 dark:text-gray-400">
                Value: <span className="font-semibold text-gray-900 dark:text-white">{formatValue(totalValue, valuePrefix)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Pipeline visualization */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 z-0 hidden md:block" style={{ top: '3rem' }} />

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {stages.map((stage, index) => {
            const widthPercent = (stage.count / maxCount) * 100

            return (
              <div key={stage.id} className="relative">
                {/* Stage card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow z-10 relative">
                  {/* Stage indicator dot */}
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 hidden md:block"
                    style={{ backgroundColor: stage.color }}
                  />

                  {/* Arrow connector for mobile */}
                  {index < stages.length - 1 && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-gray-300 dark:text-gray-600 md:hidden">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}

                  {/* Stage name with color indicator */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {stage.name}
                    </h4>
                  </div>

                  {/* Count */}
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {stage.count.toLocaleString()}
                  </div>

                  {/* Value */}
                  {showValues && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      {formatValue(stage.value, valuePrefix)}
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>

                  {/* Description */}
                  {stage.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {stage.description}
                    </p>
                  )}

                  {/* Percentage of total */}
                  <div className="absolute top-2 right-2 text-xs font-medium text-gray-400 dark:text-gray-500">
                    {((stage.count / totalCount) * 100).toFixed(0)}%
                  </div>
                </div>

                {/* Arrow to next stage (desktop) */}
                {index < stages.length - 1 && (
                  <div className="absolute top-12 -right-2 text-gray-300 dark:text-gray-600 z-20 hidden md:block">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        {stages.map((stage) => (
          <div
            key={`stat-${stage.id}`}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
            <div
              className="w-2 h-8 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stage.name}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {((stage.count / totalCount) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BacklogPipeline
