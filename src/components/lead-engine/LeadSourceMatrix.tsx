"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  LeadSourceMetrics,
  LeadSourceSummary,
  getLeadSourceMetrics,
  getLeadSourceSummary,
  LEAD_SOURCE_CONFIG
} from '@/lib/lead-source-data'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Tooltip, TooltipContent, TooltipTrigger
} from '@/components/ui/tooltip'
import {
  Database, Target, Truck, Users, Globe,
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  Star, Copy, ArrowRight, Info
} from 'lucide-react'

interface LeadSourceMatrixProps {
  className?: string
  showDuplicateWarning?: boolean
}

function getSourceIcon(source: string) {
  const config = LEAD_SOURCE_CONFIG[source as keyof typeof LEAD_SOURCE_CONFIG]
  if (!config) return <Database className="h-4 w-4" />

  switch (config.icon) {
    case 'database': return <Database className="h-4 w-4 text-blue-500" />
    case 'target': return <Target className="h-4 w-4 text-purple-500" />
    case 'truck': return <Truck className="h-4 w-4 text-green-500" />
    case 'users': return <Users className="h-4 w-4 text-orange-500" />
    case 'globe': return <Globe className="h-4 w-4 text-gray-500" />
    default: return <Database className="h-4 w-4" />
  }
}

function renderStars(score: number) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-3 w-3 ${i <= score
            ? 'text-yellow-500 fill-yellow-500'
            : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  )
}

function TrendBadge({ trend, percent }: { trend: 'up' | 'down' | 'flat'; percent: number }) {
  if (trend === 'up') {
    return (
      <Badge variant="success" className="gap-1 text-xs">
        <TrendingUp className="h-3 w-3" />
        +{percent}%
      </Badge>
    )
  }
  if (trend === 'down') {
    return (
      <Badge variant="danger" className="gap-1 text-xs">
        <TrendingDown className="h-3 w-3" />
        -{percent}%
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <Minus className="h-3 w-3" />
      Flat
    </Badge>
  )
}

export function LeadSourceMatrix({ className, showDuplicateWarning = true }: LeadSourceMatrixProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<LeadSourceMetrics[]>([])
  const [summary, setSummary] = useState<LeadSourceSummary | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = getLeadSourceMetrics()
      setMetrics(data)
      setSummary(getLeadSourceSummary(data))
      setIsLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  const hasDuplicates = summary && summary.potentialDuplicatesTotal > 5

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Lead Sources
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Unified view of leads across all intake sources. Quality scores reflect historical conversion rates and deal sizes.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              Last 30 days across all intake channels
            </CardDescription>
          </div>
          {summary && (
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(summary.totalValue)}
              </div>
              <div className="text-xs text-gray-500">
                {summary.totalLeads} leads total
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Duplicate Warning */}
        {showDuplicateWarning && hasDuplicates && summary && (
          <Alert className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
            <Copy className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>{summary.potentialDuplicatesTotal} potential duplicate leads</strong> detected across sources ({formatCurrency(summary.duplicateValueAtRisk)} at risk).{' '}
              <Link href="/lead-service-engine/duplicates" className="underline font-medium">
                Review duplicates
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Source Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-center">Leads</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-center">Conv %</TableHead>
              <TableHead className="text-center">Quality</TableHead>
              <TableHead className="text-center">Trend</TableHead>
              <TableHead className="text-center">Dupes</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map(m => {
              const config = LEAD_SOURCE_CONFIG[m.source]
              const isBestSource = summary?.bestSource === m.source
              const isWorstSource = summary?.worstSource === m.source

              return (
                <TableRow
                  key={m.source}
                  className={isBestSource ? 'bg-green-50/50 dark:bg-green-900/10' : ''}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSourceIcon(m.source)}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {m.sourceName}
                          {isBestSource && (
                            <Badge variant="success" className="text-xs">Best</Badge>
                          )}
                          {isWorstSource && (
                            <Badge variant="secondary" className="text-xs">Lowest Conv</Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                          {config.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold">{m.leadCount}</span>
                    {m.atRiskCount + m.criticalCount > 0 && (
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        {m.atRiskCount + m.criticalCount} at risk
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(m.totalValue)}
                    </span>
                    <div className="text-xs text-gray-500">
                      avg {formatCurrency(m.avgDealSize)}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={
                      m.conversionRate >= 0.4 ? 'text-green-600 dark:text-green-400 font-medium' :
                      m.conversionRate >= 0.25 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }>
                      {Math.round(m.conversionRate * 100)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {renderStars(m.qualityScore)}
                  </TableCell>
                  <TableCell className="text-center">
                    <TrendBadge trend={m.trend} percent={m.trendPercent} />
                  </TableCell>
                  <TableCell className="text-center">
                    {m.potentialDuplicates > 0 ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge
                            variant={m.potentialDuplicates > 5 ? 'warning' : 'secondary'}
                            className="gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {m.potentialDuplicates}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {m.potentialDuplicates} leads may exist in other sources
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/lead-service-engine/source/${m.source}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* Summary Row */}
        {summary && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-gray-500">Best Performer: </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {LEAD_SOURCE_CONFIG[summary.bestSource].name}
                </span>
                <span className="text-gray-500"> ({Math.round(metrics.find(m => m.source === summary.bestSource)?.conversionRate ?? 0 * 100)}% conv)</span>
              </div>
              <div className="text-gray-300 dark:text-gray-600">|</div>
              <div>
                <span className="text-gray-500">Avg Conversion: </span>
                <span className="font-medium">{Math.round(summary.avgConversionRate * 100)}%</span>
              </div>
            </div>
            <Link href="/lead-service-engine/sources">
              <Button variant="outline" size="sm">
                Source Analytics
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
