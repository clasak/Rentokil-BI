"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Shield, TrendingUp, TrendingDown, Minus, CheckCircle,
  AlertTriangle, XCircle, Target
} from 'lucide-react'
import { getDataQualityScorecard, type DataQualityDimension } from '@/lib/mock/platformAdminData'

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return <TrendingUp className="h-4 w-4 text-green-500" />
  }
  if (trend === 'down') {
    return <TrendingDown className="h-4 w-4 text-red-500" />
  }
  return <Minus className="h-4 w-4 text-gray-400" />
}

function getStatusInfo(score: number, target: number) {
  const diff = score - target
  if (diff >= 0) {
    return {
      status: 'met' as const,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: CheckCircle,
      label: 'Target Met'
    }
  }
  if (diff >= -5) {
    return {
      status: 'warning' as const,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      icon: AlertTriangle,
      label: 'Near Target'
    }
  }
  return {
    status: 'critical' as const,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: XCircle,
    label: 'Below Target'
  }
}

function DimensionCard({ dimension }: { dimension: DataQualityDimension }) {
  const statusInfo = getStatusInfo(dimension.currentScore, dimension.target)
  const StatusIcon = statusInfo.icon
  const progressPercent = Math.min((dimension.currentScore / dimension.target) * 100, 100)

  return (
    <Card className={`border-l-4 ${
      statusInfo.status === 'met' ? 'border-l-green-500' :
      statusInfo.status === 'warning' ? 'border-l-yellow-500' :
      'border-l-red-500'
    }`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">{dimension.dimension}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`text-xs ${statusInfo.color}`}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
              <TrendIcon trend={dimension.trend} />
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${statusInfo.color}`}>
              {dimension.currentScore.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
              <Target className="h-3 w-3" />
              Target: {dimension.target}%
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress to Target</span>
            <span className={statusInfo.color}>{(dimension.currentScore - dimension.target).toFixed(1)}%</span>
          </div>
          <Progress
            value={progressPercent}
            className={`h-2 ${
              statusInfo.status === 'met' ? '[&>div]:bg-green-500' :
              statusInfo.status === 'warning' ? '[&>div]:bg-yellow-500' :
              '[&>div]:bg-red-500'
            }`}
          />
        </div>

        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <div className="text-xs font-medium text-muted-foreground mb-1">Top Issue</div>
          <p className="text-sm">{dimension.topIssue}</p>
          <div className="mt-2 text-xs text-muted-foreground">
            {dimension.affectedRecords.toLocaleString()} affected records
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DataQualityScorecard() {
  const dimensions = getDataQualityScorecard()

  // Calculate overall score
  const overallScore = dimensions.reduce((sum, d) => sum + d.currentScore, 0) / dimensions.length
  const metCount = dimensions.filter(d => d.currentScore >= d.target).length
  const belowCount = dimensions.length - metCount

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Enterprise Data Quality Scorecard
              </CardTitle>
              <CardDescription>
                Roll-up of 6 data quality dimensions across all sources
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{overallScore.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm">
                <strong>{metCount}</strong> dimensions meeting target
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm">
                <strong>{belowCount}</strong> dimensions below target
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dimensions.map(dimension => (
          <DimensionCard key={dimension.dimension} dimension={dimension} />
        ))}
      </div>
    </div>
  )
}
