"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Target, Clock, Layers, DollarSign } from 'lucide-react'
import { TargetKPIMetrics } from '@/lib/mock/saltiData'
import { formatCurrency } from '@/lib/utils'

interface SALTITargetKPIGaugeProps {
  data: TargetKPIMetrics
  className?: string
}

interface GaugeCardProps {
  title: string
  value: number
  target: number
  format: 'percent' | 'days' | 'ratio' | 'currency'
  icon: React.ReactNode
  higherIsBetter?: boolean
}

function GaugeCard({ title, value, target, format, icon, higherIsBetter = true }: GaugeCardProps) {
  const progress = Math.min((value / target) * 100, 100)
  const isAtTarget = higherIsBetter ? value >= target : value <= target
  const delta = ((value - target) / target) * 100

  const formatValue = (v: number) => {
    switch (format) {
      case 'percent':
        return `${v.toFixed(1)}%`
      case 'days':
        return `${v.toFixed(1)} days`
      case 'ratio':
        return v.toFixed(2)
      case 'currency':
        return formatCurrency(v)
      default:
        return v.toString()
    }
  }

  const getStatusColor = () => {
    if (isAtTarget) return 'text-green-600 dark:text-green-400'
    if (Math.abs(delta) <= 10) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getProgressColor = () => {
    if (isAtTarget) return 'bg-green-500'
    if (Math.abs(delta) <= 10) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-6">
        {/* Icon and Title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-muted">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">{title}</div>
            <div className={`text-2xl font-bold ${getStatusColor()}`}>
              {formatValue(value)}
            </div>
          </div>
        </div>

        {/* Progress Bar with Target Marker */}
        <div className="relative mb-2">
          <Progress
            value={progress}
            className="h-3"
          />
          {/* Target marker */}
          <div
            className="absolute top-0 h-3 w-0.5 bg-gray-900 dark:bg-white"
            style={{ left: `${Math.min((target / Math.max(value, target)) * 100, 100)}%` }}
          />
        </div>

        {/* Target and Delta */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Target className="h-3 w-3" />
            <span>Target: {formatValue(target)}</span>
          </div>
          <div className={`flex items-center gap-1 ${getStatusColor()}`}>
            {isAtTarget ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>

      {/* Status indicator border */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${getProgressColor()}`} />
    </Card>
  )
}

export function SALTITargetKPIGauge({ data, className }: SALTITargetKPIGaugeProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <GaugeCard
        title="Close Rate"
        value={data.close_rate}
        target={data.close_rate_target}
        format="percent"
        icon={<Target className="h-5 w-5 text-blue-500" />}
        higherIsBetter={true}
      />
      <GaugeCard
        title="Speed to Lead"
        value={data.speed_to_lead}
        target={data.speed_to_lead_target}
        format="days"
        icon={<Clock className="h-5 w-5 text-purple-500" />}
        higherIsBetter={false}
      />
      <GaugeCard
        title="Bundle Rate"
        value={data.bundle_rate}
        target={data.bundle_rate_target}
        format="ratio"
        icon={<Layers className="h-5 w-5 text-indigo-500" />}
        higherIsBetter={true}
      />
      <GaugeCard
        title="Avg $/SQL"
        value={data.avg_started_value}
        target={data.avg_started_value_target}
        format="currency"
        icon={<DollarSign className="h-5 w-5 text-green-500" />}
        higherIsBetter={true}
      />
    </div>
  )
}
