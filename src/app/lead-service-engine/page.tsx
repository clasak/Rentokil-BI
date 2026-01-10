"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getLeads,
  getStageMetrics,
  getHandoffMetrics,
  getPipelineSummary,
  StageMetrics,
  HandoffMetrics
} from '@/lib/lead-engine-data'
import { PipelineVisual, FunnelChart, StackedFunnelChart, HandoffCard } from '@/components/lead-engine'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Users, Clock, AlertTriangle, TrendingUp, Workflow, ArrowRight,
  Info, Mail, CheckCircle, XCircle
} from 'lucide-react'

export default function LeadServiceEnginePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [stageMetrics, setStageMetrics] = useState<StageMetrics[]>([])
  const [handoffMetrics, setHandoffMetrics] = useState<HandoffMetrics[]>([])
  const [summary, setSummary] = useState<ReturnType<typeof getPipelineSummary> | null>(null)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setStageMetrics(getStageMetrics())
      setHandoffMetrics(getHandoffMetrics())
      setSummary(getPipelineSummary())
      setIsLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const totalAtRisk = (summary?.atRiskLeads || 0) + (summary?.criticalLeads || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Workflow className="h-7 w-7 text-rentokil-red" />
            Master Lead Service Engine
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            End-to-end visibility from lead intake to service delivery
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={totalAtRisk > 10 ? 'danger' : totalAtRisk > 5 ? 'warning' : 'success'} className="gap-1">
            {totalAtRisk > 0 ? (
              <>
                <AlertTriangle className="h-3 w-3" />
                {totalAtRisk} At Risk
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3" />
                Pipeline Healthy
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Strategic Initiative Banner */}
      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Strategic Initiative Framework</strong> — Demo data shown, ready for real Salesforce integration.
          This dashboard visualizes the lead-to-service pipeline with emphasis on manual handoff bottlenecks.
        </AlertDescription>
      </Alert>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-rentokil-red to-rentokil-darkred text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 opacity-80" />
              <div>
                <div className="text-sm opacity-80">Total Active Leads</div>
                <div className="text-3xl font-bold">{summary?.totalLeads || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Lead-to-Service</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {summary?.avgLeadToServiceDays || 0}
                  <span className="text-lg font-normal text-gray-500 ml-1">days</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={summary && summary.bottleneckSlaCompliance < 70 ? 'border-red-300 dark:border-red-700' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-orange-500" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Bottleneck Stage</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {summary?.bottleneckStage || '-'}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400">
                  {summary?.bottleneckSlaCompliance || 100}% SLA
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={totalAtRisk > 5 ? 'border-yellow-300 dark:border-yellow-700' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">At-Risk Leads</div>
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {totalAtRisk}
                </div>
                <Link href="/lead-service-engine/at-risk">
                  <Button variant="link" className="p-0 h-auto text-sm">
                    View all <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Visual */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Overview</CardTitle>
          <CardDescription>
            Click any stage to view at-risk leads. Dashed borders indicate manual handoff stages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PipelineVisual metrics={stageMetrics} />
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelChart metrics={stageMetrics} title="Pipeline Funnel" />
        <StackedFunnelChart metrics={stageMetrics} title="Pipeline Health by Stage" />
      </div>

      {/* Handoff Alerts */}
      {handoffMetrics.some(m => m.slaCompliance < 85) && (
        <Alert className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <Mail className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <strong>Manual handoff delays detected.</strong> The BD→Sales and Sales→Ops handoffs are key bottlenecks.{' '}
            <Link href="/lead-service-engine/handoffs" className="underline font-medium">
              View handoff details
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Handoff Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {handoffMetrics.map(metrics => (
          <HandoffCard key={metrics.type} metrics={metrics} showChart={false} />
        ))}
      </div>

      {/* Stage Health Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stage Health Summary</CardTitle>
              <CardDescription>SLA compliance and lead distribution by stage</CardDescription>
            </div>
            <Link href="/lead-service-engine/stages">
              <Button variant="outline" size="sm">
                View Stage Definitions
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-center">Avg Time</TableHead>
                <TableHead className="text-center">SLA Target</TableHead>
                <TableHead className="text-center">Compliance</TableHead>
                <TableHead className="text-center">Health</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stageMetrics.map(stage => {
                const isHandoff = stage.stage === 'sales_handoff' || stage.stage === 'ops_handoff'
                return (
                  <TableRow key={stage.stage} className={isHandoff ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isHandoff && <Mail className="h-4 w-4 text-orange-500" />}
                        <span className="font-medium">{stage.stageName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{stage.leadCount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {stage.avgHoursInStage < 24
                        ? `${Math.round(stage.avgHoursInStage)}h`
                        : `${stage.avgDaysInStage}d`}
                    </TableCell>
                    <TableCell className="text-center text-gray-500">
                      {stage.avgHoursInStage < 48 ? '24h' : stage.stage === 'sales_process' ? '14d' : '7d'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={
                        stage.slaCompliance >= 90 ? 'text-green-600 dark:text-green-400 font-medium' :
                        stage.slaCompliance >= 70 ? 'text-yellow-600 dark:text-yellow-400 font-medium' :
                        'text-red-600 dark:text-red-400 font-medium'
                      }>
                        {stage.slaCompliance}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        stage.healthStatus === 'healthy' ? 'success' :
                        stage.healthStatus === 'at_risk' ? 'warning' : 'danger'
                      }>
                        {stage.healthStatus === 'healthy' ? 'Healthy' :
                         stage.healthStatus === 'at_risk' ? 'At Risk' : 'Critical'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/lead-service-engine/at-risk?stage=${stage.stage}`}>
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
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/lead-service-engine/handoffs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Mail className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <div className="font-medium">Handoff Monitor</div>
              <div className="text-sm text-gray-500">Track manual handoffs</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/lead-service-engine/stages">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Workflow className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="font-medium">Stage Definitions</div>
              <div className="text-sm text-gray-500">View stage rules</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/lead-service-engine/automation">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="font-medium">Automation ROI</div>
              <div className="text-sm text-gray-500">Calculate savings</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/lead-service-engine/integration">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="font-medium">Data Integration</div>
              <div className="text-sm text-gray-500">System connections</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
