'use client'

import { useMemo } from 'react'

interface SpeedToInstallGaugeProps {
  value: number
  target: number
  min?: number
  max?: number
  unit?: string
  title?: string
  subtitle?: string
  showTrend?: boolean
  trendValue?: number
  trendLabel?: string
}

const defaultProps = {
  value: 3.2,
  target: 3.0,
  min: 0,
  max: 7,
  unit: 'days',
  title: 'Speed to Install',
  subtitle: 'Average days from sale to first service',
  showTrend: true,
  trendValue: -0.4,
  trendLabel: 'vs last month',
}

export function SpeedToInstallGauge({
  value = defaultProps.value,
  target = defaultProps.target,
  min = defaultProps.min,
  max = defaultProps.max,
  unit = defaultProps.unit,
  title = defaultProps.title,
  subtitle = defaultProps.subtitle,
  showTrend = defaultProps.showTrend,
  trendValue = defaultProps.trendValue,
  trendLabel = defaultProps.trendLabel,
}: SpeedToInstallGaugeProps) {
  const { percentage, targetPercentage, status, statusColor, bgColor } = useMemo(() => {
    const range = max - min
    const pct = ((value - min) / range) * 100
    const targetPct = ((target - min) / range) * 100

    // For "speed to install", lower is better
    let stat: 'excellent' | 'good' | 'warning' | 'critical'
    let statColor: string
    let bg: string

    if (value <= target * 0.8) {
      stat = 'excellent'
      statColor = 'text-green-600 dark:text-green-400'
      bg = 'from-green-500 to-green-400'
    } else if (value <= target) {
      stat = 'good'
      statColor = 'text-green-600 dark:text-green-400'
      bg = 'from-green-500 to-yellow-400'
    } else if (value <= target * 1.3) {
      stat = 'warning'
      statColor = 'text-yellow-600 dark:text-yellow-400'
      bg = 'from-yellow-500 to-orange-400'
    } else {
      stat = 'critical'
      statColor = 'text-red-600 dark:text-red-400'
      bg = 'from-orange-500 to-red-500'
    }

    return {
      percentage: Math.min(pct, 100),
      targetPercentage: Math.min(targetPct, 100),
      status: stat,
      statusColor: statColor,
      bgColor: bg,
    }
  }, [value, target, min, max])

  const arcPath = useMemo(() => {
    // Create a semi-circular arc
    const startAngle = -180
    const endAngle = 0
    const valueAngle = startAngle + (percentage / 100) * (endAngle - startAngle)
    const targetAngle = startAngle + (targetPercentage / 100) * (endAngle - startAngle)

    const cx = 100
    const cy = 100
    const r = 80

    const polarToCartesian = (angle: number) => {
      const rad = (angle * Math.PI) / 180
      return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
      }
    }

    const start = polarToCartesian(startAngle)
    const valueEnd = polarToCartesian(valueAngle)
    const targetPoint = polarToCartesian(targetAngle)

    const largeArcFlag = percentage > 50 ? 1 : 0

    return {
      backgroundArc: `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`,
      valueArc: `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${valueEnd.x} ${valueEnd.y}`,
      targetPoint,
    }
  }, [percentage, targetPercentage])

  const getStatusLabel = () => {
    switch (status) {
      case 'excellent': return 'Excellent'
      case 'good': return 'On Target'
      case 'warning': return 'Needs Attention'
      case 'critical': return 'Critical'
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-1">{title}</h3>
      )}
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">{subtitle}</p>
      )}

      <div className="relative">
        <svg viewBox="0 0 200 120" className="w-full">
          {/* Background track */}
          <path
            d={arcPath.backgroundArc}
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="round"
            className="text-gray-200 dark:text-gray-700"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className={`${bgColor.includes('green') ? 'stop-green-500' : bgColor.includes('yellow') ? 'stop-yellow-500' : 'stop-orange-500'}`} stopColor={status === 'excellent' || status === 'good' ? '#22c55e' : status === 'warning' ? '#eab308' : '#f97316'} />
              <stop offset="100%" className={`${bgColor.includes('green') ? 'stop-green-400' : bgColor.includes('red') ? 'stop-red-500' : 'stop-orange-400'}`} stopColor={status === 'excellent' ? '#4ade80' : status === 'good' ? '#facc15' : status === 'warning' ? '#f97316' : '#ef4444'} />
            </linearGradient>
          </defs>

          {/* Value arc */}
          <path
            d={arcPath.valueArc}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Target line */}
          <line
            x1={arcPath.targetPoint.x}
            y1={arcPath.targetPoint.y - 12}
            x2={arcPath.targetPoint.x}
            y2={arcPath.targetPoint.y + 12}
            stroke="currentColor"
            strokeWidth="3"
            className="text-gray-800 dark:text-gray-200"
          />
          <circle
            cx={arcPath.targetPoint.x}
            cy={arcPath.targetPoint.y}
            r="4"
            fill="currentColor"
            className="text-gray-800 dark:text-gray-200"
          />

          {/* Min/Max labels */}
          <text x="20" y="105" className="fill-gray-500 dark:fill-gray-400 text-xs" textAnchor="middle">
            {min}
          </text>
          <text x="180" y="105" className="fill-gray-500 dark:fill-gray-400 text-xs" textAnchor="middle">
            {max}
          </text>
        </svg>

        {/* Center value display */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <div className={`text-4xl font-bold ${statusColor}`}>
            {value.toFixed(1)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{unit}</div>
        </div>
      </div>

      {/* Status and trend */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status === 'excellent' || status === 'good'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : status === 'warning'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {getStatusLabel()}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Target: {target} {unit}
          </span>
        </div>

        {showTrend && trendValue !== undefined && (
          <div className="flex items-center justify-center gap-1">
            {trendValue < 0 ? (
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : trendValue > 0 ? (
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : null}
            <span className={`text-sm font-medium ${
              trendValue < 0 ? 'text-green-600 dark:text-green-400' :
              trendValue > 0 ? 'text-red-600 dark:text-red-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)} {unit}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default SpeedToInstallGauge
