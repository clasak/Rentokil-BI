"use client"

import Link from 'next/link'
import { KPIValue } from '@/types'
import { KPIDefinition } from '@/types'
import { getKPIBySlug } from '@/lib/kpis'
import { cn, formatCurrency, formatPercent, formatNumber, getDeltaColor, getDeltaIcon } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, Minus, Info, AlertTriangle } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber'

interface KPICardProps {
  kpiValue: KPIValue
  showSparkline?: boolean
  compact?: boolean
  highlighted?: boolean
}

export function KPICard({ kpiValue, showSparkline = true, compact = false, highlighted = false }: KPICardProps) {
  const definition = getKPIBySlug(kpiValue.slug)

  // Animated number with appropriate decimals - must be called before early return
  const decimals = definition?.format === 'percent' ? 1 : (definition?.format === 'currency' ? 0 : 0)
  const animatedValue = useAnimatedNumber(kpiValue.value, {
    duration: 1000,
    decimals,
    enabled: !!definition,
  })

  if (!definition) return null

  const formatValue = (value: number): string => {
    switch (definition.format) {
      case 'currency':
        return formatCurrency(value)
      case 'percent':
        return formatPercent(value)
      case 'days':
        return `${Math.round(value)} days`
      case 'index':
        return Math.round(value).toString()
      default:
        return formatNumber(value)
    }
  }

  const deltaPercent = kpiValue.deltaPercent * 100
  // Determine if the CHANGE is good or bad based on higherIsBetter
  const isPositiveChange = definition.higherIsBetter ? deltaPercent > 0 : deltaPercent < 0
  const isNegativeChange = definition.higherIsBetter ? deltaPercent < 0 : deltaPercent > 0

  // Glow matches border status - consistent visual language
  // Red = critical (constant glow), Yellow = warning (pulse), Green = good (hover only)
  const getGlowClass = () => {
    if (kpiValue.status === 'critical') return 'glow-danger'
    if (kpiValue.status === 'warning') return 'glow-warning'
    if (kpiValue.status === 'good') return 'glow-success'
    return '' // Neutral - no special glow
  }

  // Border color based on overall status vs target
  const statusBorderStyles = {
    good: 'border-l-green-500',
    warning: 'border-l-yellow-500',
    critical: 'border-l-red-500',
    neutral: 'border-l-gray-300',
  }

  const sparklineData = kpiValue.trend.map((value, index) => ({ value, index }))

  // Calculate prior period value from delta percentage
  const priorValue = kpiValue.deltaPercent !== 0
    ? kpiValue.value / (1 + kpiValue.deltaPercent)
    : kpiValue.value

  // Get target methodology based on KPI category/format
  const getTargetMethodology = (): string => {
    if (definition.category === 'revenue' || definition.category === 'finance') {
      return 'Annual quota pro-rated to month-to-date'
    }
    if (definition.format === 'percent') {
      return 'Based on historical performance benchmark'
    }
    if (definition.format === 'index') {
      return 'Calculated from weighted scoring model'
    }
    if (definition.format === 'days') {
      return 'Industry standard benchmark'
    }
    return 'Target based on business objectives'
  }

  return (
    <Link href={`/kpi/${kpiValue.slug}`}>
      <Card className={cn(
        'transition-all duration-300 cursor-pointer border-l-4 hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1',
        statusBorderStyles[kpiValue.status],
        getGlowClass(),
        highlighted && 'ring-2 ring-primary ring-offset-2',
        compact ? 'p-3' : ''
      )}>
        <CardContent className={compact ? 'p-0' : 'p-4'}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'font-medium text-gray-600 dark:text-gray-300',
                  compact ? 'text-xs' : 'text-sm'
                )}>
                  {definition.name}
                </span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{definition.definition}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Source: {definition.primarySource} | Refresh: {definition.refreshCadence}
                    </p>
                  </TooltipContent>
                </Tooltip>
                {kpiValue.status === 'critical' && (
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                )}
              </div>

              <div className={cn(
                'font-bold text-gray-900 dark:text-white transition-all',
                compact ? 'text-xl' : 'text-2xl'
              )}>
                {formatValue(animatedValue)}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      'flex items-center gap-1 text-sm font-medium cursor-help',
                      isPositiveChange && 'text-green-600 dark:text-green-400',
                      isNegativeChange && 'text-red-600 dark:text-red-400',
                      !isPositiveChange && !isNegativeChange && 'text-gray-500 dark:text-gray-400'
                    )}>
                      {isPositiveChange && <TrendingUp className="h-3 w-3" />}
                      {isNegativeChange && <TrendingDown className="h-3 w-3" />}
                      {!isPositiveChange && !isNegativeChange && <Minus className="h-3 w-3" />}
                      <span>{deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Change vs Prior Period</p>
                      <div className="text-xs text-gray-400">
                        <p>Prior: {formatValue(priorValue)}</p>
                        <p>Current: {formatValue(kpiValue.value)}</p>
                        <p className="mt-1 pt-1 border-t border-gray-600">
                          {isPositiveChange && definition.higherIsBetter && '✓ Improving trend'}
                          {isPositiveChange && !definition.higherIsBetter && '⚠ Worsening trend'}
                          {isNegativeChange && definition.higherIsBetter && '⚠ Declining trend'}
                          {isNegativeChange && !definition.higherIsBetter && '✓ Improving trend'}
                          {!isPositiveChange && !isNegativeChange && '— Stable'}
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
                <span className="text-xs text-gray-400">vs prior period</span>
              </div>

              {kpiValue.target !== undefined && !compact && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span>Target: {formatValue(kpiValue.target)}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-medium">Target Methodology</p>
                      <p className="text-xs text-gray-400 mt-1">{getTargetMethodology()}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>

            {showSparkline && !compact && (
              <div className="w-20 h-12">
                {sparklineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                      <YAxis domain={['dataMin', 'dataMax']} hide />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={isNegativeChange ? '#ef4444' : isPositiveChange ? '#22c55e' : '#E4002B'}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Skeleton className="w-full h-full" />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
