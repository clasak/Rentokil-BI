"use client"

import { cn } from '@/lib/utils'
import { STAGE_ORDER, STAGE_CONFIG, StageMetrics, LeadStage } from '@/lib/lead-engine-data'
import { StageBadge, HealthDot } from './StageBadge'
import { ArrowRight, Mail, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface PipelineVisualProps {
  metrics: StageMetrics[]
  onStageClick?: (stage: LeadStage) => void
  className?: string
}

export function PipelineVisual({ metrics, onStageClick, className }: PipelineVisualProps) {
  const getMetrics = (stage: LeadStage) => metrics.find(m => m.stage === stage)

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop view - horizontal */}
      <div className="hidden lg:flex items-stretch justify-between gap-2">
        {STAGE_ORDER.map((stage, index) => {
          const config = STAGE_CONFIG[stage]
          const stageMetrics = getMetrics(stage)
          const isHandoff = config.isHandoffStage

          return (
            <div key={stage} className="flex items-center flex-1">
              {/* Stage Card */}
              <Link
                href={`/lead-service-engine/at-risk?stage=${stage}`}
                className={cn(
                  'flex-1 rounded-lg border-2 p-4 transition-all hover:shadow-md cursor-pointer',
                  isHandoff && 'border-dashed',
                  stageMetrics?.healthStatus === 'critical'
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                    : stageMetrics?.healthStatus === 'at_risk'
                    ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                )}
                onClick={(e) => {
                  if (onStageClick) {
                    e.preventDefault()
                    onStageClick(stage)
                  }
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isHandoff && (
                      <Mail className="h-4 w-4 text-orange-500" />
                    )}
                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                      {config.shortName}
                    </span>
                  </div>
                  {stageMetrics && (
                    <HealthDot status={stageMetrics.healthStatus} />
                  )}
                </div>

                {/* Metrics */}
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stageMetrics?.leadCount || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    leads
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Avg: {stageMetrics?.avgHoursInStage || 0}h
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className={cn(
                      'font-medium',
                      (stageMetrics?.slaCompliance || 100) >= 90
                        ? 'text-green-600 dark:text-green-400'
                        : (stageMetrics?.slaCompliance || 100) >= 70
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    )}>
                      {stageMetrics?.slaCompliance || 100}%
                    </span>
                    <span className="text-gray-400">SLA</span>
                  </div>
                </div>

                {/* Risk indicator */}
                {stageMetrics && (stageMetrics.atRiskCount > 0 || stageMetrics.criticalCount > 0) && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1 text-xs">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      <span className="text-yellow-600 dark:text-yellow-400">
                        {stageMetrics.atRiskCount + stageMetrics.criticalCount} at risk
                      </span>
                    </div>
                  </div>
                )}
              </Link>

              {/* Arrow between stages */}
              {index < STAGE_ORDER.length - 1 && (
                <div className="flex-shrink-0 px-1">
                  <ArrowRight className={cn(
                    'h-5 w-5',
                    STAGE_CONFIG[STAGE_ORDER[index + 1]].isHandoffStage
                      ? 'text-orange-400'
                      : 'text-gray-300 dark:text-gray-600'
                  )} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile view - vertical */}
      <div className="lg:hidden space-y-3">
        {STAGE_ORDER.map((stage, index) => {
          const config = STAGE_CONFIG[stage]
          const stageMetrics = getMetrics(stage)
          const isHandoff = config.isHandoffStage

          return (
            <div key={stage}>
              <Link
                href={`/lead-service-engine/at-risk?stage=${stage}`}
                className={cn(
                  'block rounded-lg border-2 p-4 transition-all',
                  isHandoff && 'border-dashed',
                  stageMetrics?.healthStatus === 'critical'
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                    : stageMetrics?.healthStatus === 'at_risk'
                    ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isHandoff && <Mail className="h-4 w-4 text-orange-500" />}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {config.name}
                      </span>
                    </div>
                    {stageMetrics && <StageBadge status={stageMetrics.healthStatus} size="sm" />}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900 dark:text-white">
                      {stageMetrics?.leadCount || 0}
                    </div>
                    <div className="text-xs text-gray-500">
                      {stageMetrics?.slaCompliance || 100}% SLA
                    </div>
                  </div>
                </div>
              </Link>
              {index < STAGE_ORDER.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowRight className="h-4 w-4 text-gray-300 rotate-90" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
