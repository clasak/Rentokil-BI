"use client"

import { VarianceDriver } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, MessageSquare } from 'lucide-react'

interface VarianceNarrativeProps {
  kpiName: string
  drivers: VarianceDriver[]
  totalVariance: number
  isPositiveGood?: boolean
}

export function VarianceNarrative({
  kpiName,
  drivers,
  totalVariance,
  isPositiveGood = true
}: VarianceNarrativeProps) {
  const isUp = totalVariance > 0
  const isGood = isPositiveGood ? isUp : !isUp

  const positiveDrivers = drivers.filter(d => d.direction === 'positive')
  const negativeDrivers = drivers.filter(d => d.direction === 'negative')

  const generateNarrative = (): string => {
    const direction = isUp ? 'ahead' : 'behind'
    const topPositive = positiveDrivers.slice(0, 2).map(d => d.factor.toLowerCase()).join(' and ')
    const topNegative = negativeDrivers.slice(0, 2).map(d => d.factor.toLowerCase()).join(' and ')

    let narrative = `${kpiName} is ${Math.abs(totalVariance * 100).toFixed(1)}% ${direction} target`

    if (positiveDrivers.length > 0 && negativeDrivers.length > 0) {
      narrative += `, driven by ${topPositive}, partially offset by ${topNegative}.`
    } else if (positiveDrivers.length > 0) {
      narrative += `, primarily driven by ${topPositive}.`
    } else if (negativeDrivers.length > 0) {
      narrative += `, impacted by ${topNegative}.`
    }

    return narrative
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Variance Narrative
          </CardTitle>
          <Badge variant={isGood ? 'success' : 'danger'}>
            {isUp ? '+' : ''}{(totalVariance * 100).toFixed(1)}% vs Target
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          {generateNarrative()}
        </p>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Contributing Factors
          </h4>
          {drivers.map((driver, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="flex items-center gap-3">
                {driver.direction === 'positive' ? (
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{driver.factor}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{driver.explanation}</div>
                </div>
              </div>
              <div className={`text-sm font-semibold ${
                driver.direction === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {driver.direction === 'positive' ? '+' : '-'}{formatCurrency(Math.abs(driver.impact))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
