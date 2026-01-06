"use client"

import Link from 'next/link'
import { KPIValue } from '@/types'
import { KPIDefinition } from '@/types'
import { getKPIBySlug } from '@/lib/kpis'
import { cn, formatCurrency, formatPercent, formatNumber, getDeltaColor, getDeltaIcon } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, Minus, Info, AlertTriangle } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

interface KPICardProps {
  kpiValue: KPIValue
  showSparkline?: boolean
  compact?: boolean
  highlighted?: boolean
}

export function KPICard({ kpiValue, showSparkline = true, compact = false, highlighted = false }: KPICardProps) {
  const definition = getKPIBySlug(kpiValue.slug)

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
  const isPositive = definition.higherIsBetter ? deltaPercent > 0 : deltaPercent < 0
  const isNegative = definition.higherIsBetter ? deltaPercent < 0 : deltaPercent > 0

  const statusColors = {
    good: 'border-l-green-500',
    warning: 'border-l-yellow-500',
    critical: 'border-l-red-500',
    neutral: 'border-l-gray-300',
  }

  const sparklineData = kpiValue.trend.map((value, index) => ({ value, index }))

  return (
    <Link href={`/kpi/${kpiValue.slug}`}>
      <Card className={cn(
        'hover:shadow-md transition-all cursor-pointer border-l-4',
        statusColors[kpiValue.status],
        highlighted && 'ring-2 ring-primary ring-offset-2',
        compact ? 'p-3' : ''
      )}>
        <CardContent className={compact ? 'p-0' : 'p-4'}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'font-medium text-gray-600',
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
                'font-bold text-gray-900',
                compact ? 'text-xl' : 'text-2xl'
              )}>
                {formatValue(kpiValue.value)}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <div className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  isPositive && 'text-green-600',
                  isNegative && 'text-red-600',
                  !isPositive && !isNegative && 'text-gray-500'
                )}>
                  {isPositive && <TrendingUp className="h-3 w-3" />}
                  {isNegative && <TrendingDown className="h-3 w-3" />}
                  {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
                  <span>{deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%</span>
                </div>
                <span className="text-xs text-gray-400">vs prior</span>
              </div>

              {kpiValue.target !== undefined && !compact && (
                <div className="mt-2 text-xs text-gray-500">
                  Target: {formatValue(kpiValue.target)}
                </div>
              )}
            </div>

            {showSparkline && !compact && (
              <div className="w-20 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={isNegative ? '#ef4444' : '#22c55e'}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
