"use client"

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  getLeads,
  Lead,
  LeadStage,
  HealthStatus,
  RiskReason,
  STAGE_CONFIG
} from '@/lib/lead-engine-data'
import { LeadTable } from '@/components/lead-engine'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  ArrowLeft, AlertTriangle, XCircle, Clock, Filter
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts'

function AtRiskPageContent() {
  const searchParams = useSearchParams()
  const initialStage = searchParams.get('stage') as LeadStage | null

  const [isLoading, setIsLoading] = useState(true)
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [stageFilter, setStageFilter] = useState<LeadStage | 'all'>(initialStage || 'all')
  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'all'>('all')

  useEffect(() => {
    const timer = setTimeout(() => {
      setAllLeads(getLeads())
      setIsLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // Update filter when URL param changes
  useEffect(() => {
    if (initialStage) {
      setStageFilter(initialStage)
    }
  }, [initialStage])

  // Filter leads to at-risk and critical only (unless viewing all)
  const atRiskLeads = useMemo(() => {
    let filtered = allLeads.filter(l =>
      l.healthStatus === 'at_risk' || l.healthStatus === 'critical'
    )

    if (stageFilter !== 'all') {
      filtered = filtered.filter(l => l.currentStage === stageFilter)
    }

    if (healthFilter !== 'all') {
      filtered = filtered.filter(l => l.healthStatus === healthFilter)
    }

    return filtered
  }, [allLeads, stageFilter, healthFilter])

  // Risk reason breakdown
  const riskReasons = useMemo(() => {
    const reasons: Record<RiskReason, number> = {
      exceeded_sla: 0,
      no_activity: 0,
      missing_data: 0,
      handoff_delayed: 0,
      reassignment_pending: 0
    }

    atRiskLeads.forEach(lead => {
      lead.riskReasons.forEach(reason => {
        reasons[reason]++
      })
    })

    return Object.entries(reasons)
      .map(([reason, count]) => ({
        name: reason === 'exceeded_sla' ? 'Exceeded SLA' :
              reason === 'no_activity' ? 'No Activity' :
              reason === 'missing_data' ? 'Missing Data' :
              reason === 'handoff_delayed' ? 'Handoff Delayed' :
              'Reassignment Pending',
        value: count
      }))
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [atRiskLeads])

  // Risk by stage
  const riskByStage = useMemo(() => {
    const stageData: Record<string, { atRisk: number; critical: number }> = {}

    Object.values(STAGE_CONFIG).forEach(config => {
      stageData[config.shortName] = { atRisk: 0, critical: 0 }
    })

    atRiskLeads.forEach(lead => {
      const stageName = STAGE_CONFIG[lead.currentStage].shortName
      if (lead.healthStatus === 'at_risk') {
        stageData[stageName].atRisk++
      } else if (lead.healthStatus === 'critical') {
        stageData[stageName].critical++
      }
    })

    return Object.entries(stageData).map(([name, data]) => ({
      name,
      ...data
    }))
  }, [atRiskLeads])

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16']

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const criticalCount = atRiskLeads.filter(l => l.healthStatus === 'critical').length
  const atRiskCount = atRiskLeads.filter(l => l.healthStatus === 'at_risk').length

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Lead Service Engine', href: '/lead-service-engine' },
        { label: 'At Risk' }
      ]} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/lead-service-engine">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-yellow-500" />
            At-Risk Leads
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Leads requiring immediate attention due to SLA breaches or process delays
          </p>
        </div>
      </div>

      {/* Critical Alert */}
      {criticalCount > 0 && (
        <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>{criticalCount} leads are in critical status</strong> and have exceeded SLA thresholds.
            These require immediate action to prevent customer impact.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 dark:border-red-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Critical</div>
                <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">At Risk</div>
                <div className="text-3xl font-bold text-yellow-600">{atRiskCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total At-Risk</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {atRiskLeads.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskByStage}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="atRisk" name="At Risk" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="critical" name="Critical" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Risk Reasons */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Reasons Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {riskReasons.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskReasons}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                    >
                      {riskReasons.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No risk reasons to display
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>At-Risk Lead Details</CardTitle>
              <CardDescription>
                {atRiskLeads.length} leads matching current filters
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as LeadStage | 'all')}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {Object.values(STAGE_CONFIG).map(config => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select value={healthFilter} onValueChange={(v) => setHealthFilter(v as HealthStatus | 'all')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Health status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="critical">Critical Only</SelectItem>
                  <SelectItem value="at_risk">At Risk Only</SelectItem>
                </SelectContent>
              </Select>
              {(stageFilter !== 'all' || healthFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStageFilter('all')
                    setHealthFilter('all')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LeadTable
            leads={atRiskLeads}
            showFilters={false}
            defaultHealthFilter="all"
          />
        </CardContent>
      </Card>

      {/* Action Guidance */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800 mb-4 lg:mb-0">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-lg mb-3">Recommended Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-red-700 dark:text-red-400">For Critical Leads:</h4>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                <li>Immediately contact the lead owner</li>
                <li>Identify blocker (missing data, pending handoff, etc.)</li>
                <li>Escalate to manager if unresolved within 2 hours</li>
                <li>Document resolution in activity notes</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-yellow-700 dark:text-yellow-400">For At-Risk Leads:</h4>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                <li>Review lead status and last activity</li>
                <li>Send reminder to owner if no recent activity</li>
                <li>Check for missing required fields</li>
                <li>Monitor for transition to critical</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AtRiskPageFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}

export default function AtRiskPage() {
  return (
    <Suspense fallback={<AtRiskPageFallback />}>
      <AtRiskPageContent />
    </Suspense>
  )
}
