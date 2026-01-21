"use client"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Shield, TrendingUp, TrendingDown, Minus, CheckCircle,
  AlertTriangle, Target, Info
} from 'lucide-react'
import { DataQualityDimension, TrendDirection } from '@/lib/platform-admin-data'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface DataQualityScorecardProps {
  dimensions: DataQualityDimension[]
}

const dimensionDescriptions: Record<string, string> = {
  Accuracy: 'Data correctly represents the real-world entity it describes',
  Completeness: 'All required data fields are populated',
  Consistency: 'Data values are consistent across different systems',
  Timeliness: 'Data is available within expected time frames',
  Validity: 'Data conforms to defined formats and business rules',
  Uniqueness: 'No duplicate records exist in the dataset',
}

export function DataQualityScorecard({ dimensions }: DataQualityScorecardProps) {
  const getTrendIcon = (trend: TrendDirection) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getScoreStatus = (current: number, target: number) => {
    if (current >= target) return 'met'
    if (current >= target - 5) return 'close'
    return 'below'
  }

  const getScoreColor = (current: number, target: number) => {
    const status = getScoreStatus(current, target)
    switch (status) {
      case 'met':
        return 'text-green-600 dark:text-green-400'
      case 'close':
        return 'text-amber-600 dark:text-amber-400'
      default:
        return 'text-red-600 dark:text-red-400'
    }
  }

  const getProgressColor = (current: number, target: number) => {
    const status = getScoreStatus(current, target)
    switch (status) {
      case 'met':
        return '[&>div]:bg-green-500'
      case 'close':
        return '[&>div]:bg-amber-500'
      default:
        return '[&>div]:bg-red-500'
    }
  }

  const overallScore = dimensions.reduce((acc, d) => acc + d.currentScore, 0) / dimensions.length
  const metCount = dimensions.filter(d => d.currentScore >= d.targetScore).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Enterprise Data Quality Scorecard
            </CardTitle>
            <CardDescription>6 dimensions of data quality health</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {overallScore.toFixed(1)}%
            </div>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mt-1">
              {metCount}/6 targets met
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <TooltipProvider delayDuration={300}>
            {dimensions.map((dimension) => (
              <div
                key={dimension.dimension}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {dimension.dimension}
                    </span>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-sm">{dimensionDescriptions[dimension.dimension]}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {getTrendIcon(dimension.trend)}
                </div>

                <div className="flex items-end justify-between mb-2">
                  <div className={`text-3xl font-bold ${getScoreColor(dimension.currentScore, dimension.targetScore)}`}>
                    {dimension.currentScore}%
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Target className="h-3 w-3" />
                    {dimension.targetScore}%
                  </div>
                </div>

                <Progress
                  value={dimension.currentScore}
                  className={`h-2 ${getProgressColor(dimension.currentScore, dimension.targetScore)}`}
                />

                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-2">
                    {dimension.currentScore >= dimension.targetScore ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {dimension.topIssue}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}
