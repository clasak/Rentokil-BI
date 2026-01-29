"use client"

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  LeadStage,
  HealthStatus,
  STAGE_CONFIG
} from '@/lib/lead-engine-data'
import {
  BQAtRiskLeadRow,
  BQRiskReasonRow,
  transformAtRiskLeads,
  transformRiskReasons,
  LeadServiceAtRiskLead,
  RiskReasonBreakdown,
} from '@/lib/bigquery/queries/lead-service-transformers'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  ArrowLeft, AlertTriangle, XCircle, Clock, Filter
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts'

// Empty data defaults
const EMPTY_AT_RISK_LEADS: LeadServiceAtRiskLead[] = []
const EMPTY_RISK_REASONS: RiskReasonBreakdown[] = []

function AtRiskPageContent() {
  const searchParams = useSearchParams()
  const initialStage = searchParams.get('stage') as LeadStage | null

  const [stageFilter, setStageFilter] = useState<LeadStage | 'all'>(initialStage || 'all')
  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'all'>('all')

  // Fetch at-risk leads from BigQuery
  const {
    data: atRiskLeadsRaw,
    isLoading: isLoadingLeads,
    dataSource: leadsDataSource,
    responseTime: leadsResponseTime,
    error: leadsError,
    refetch: refetchLeads,
  } = useBigQueryData<BQAtRiskLeadRow[], LeadServiceAtRiskLead[]>({
    queryName: 'lead-service-at-risk-leads',
    filters: { daysBack: 90 },
    defaultData: EMPTY_AT_RISK_LEADS,
    transformBigQueryData: transformAtRiskLeads,
  })

  // Fetch risk reasons from BigQuery
  const {
    data: riskReasonsData,
    isLoading: isLoadingReasons,
  } = useBigQueryData<BQRiskReasonRow[], RiskReasonBreakdown[]>({
    queryName: 'lead-service-risk-reasons',
    filters: { daysBack: 90 },
    defaultData: EMPTY_RISK_REASONS,
    transformBigQueryData: transformRiskReasons,
  })

  // Update filter when URL param changes
  useEffect(() => {
    if (initialStage) {
      setStageFilter(initialStage)
    }
  }, [initialStage])

  // Filter leads
  const atRiskLeads = useMemo(() => {
    let filtered = atRiskLeadsRaw

    if (stageFilter !== 'all') {
      filtered = filtered.filter(l => l.currentStage === stageFilter)
    }

    if (healthFilter !== 'all') {
      filtered = filtered.filter(l => l.healthStatus === healthFilter)
    }

    return filtered
  }, [atRiskLeadsRaw, stageFilter, healthFilter])

  // Risk by stage calculation
  const riskByStage = useMemo(() => {
    const stageData: Record<string, { atRisk: number; critical: number }> = {}

    Object.values(STAGE_CONFIG).forEach(config => {
      stageData[config.shortName] = { atRisk: 0, critical: 0 }
    })

    atRiskLeadsRaw.forEach(lead => {
      const stageName = STAGE_CONFIG[lead.currentStage]?.shortName || lead.currentStage
      if (stageData[stageName]) {
        if (lead.healthStatus === 'at_risk') {
          stageData[stageName].atRisk++
        } else if (lead.healthStatus === 'critical') {
          stageData[stageName].critical++
        }
      }
    })

    return Object.entries(stageData).map(([name, data]) => ({
      name,
      ...data
    }))
  }, [atRiskLeadsRaw])

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16']

  const isLoading = isLoadingLeads || isLoadingReasons

  const handleRefresh = useCallback(() => {
    refetchLeads()
  }, [refetchLeads])

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
      {/* Page Header with Data Source Badge */}
      <PageHeader
        title="At-Risk Leads"
        breadcrumbs={[
          { label: 'Command Center', href: '/' },
          { label: 'Lead Service Engine', href: '/lead-service-engine' },
          { label: 'At Risk' }
        ]}
        dataSource={leadsDataSource}
        responseTime={leadsResponseTime}
        error={leadsError}
        onRefresh={handleRefresh}
        isLoading={isLoadingLeads}
      />

      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/lead-service-engine">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
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
                  <Tooltip cursor={false} />
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
              {riskReasonsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskReasonsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                    >
                      {riskReasonsData.map((entry, index) => (
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

      {/* Filters & Table */}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead ID</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Hours in Stage</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRiskLeads.slice(0, 50).map(lead => (
                <TableRow
                  key={lead.id}
                  className={
                    lead.healthStatus === 'critical' ? 'bg-red-50 dark:bg-red-900/10' :
                    lead.healthStatus === 'at_risk' ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                  }
                >
                  <TableCell className="font-mono text-sm">{lead.id}</TableCell>
                  <TableCell>
                    <div className="max-w-[160px]">
                      <div className="font-medium truncate" title={lead.companyName}>{lead.companyName}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500 truncate" title={lead.contactName}>{lead.contactName}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {STAGE_CONFIG[lead.currentStage]?.shortName || lead.currentStage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={
                      lead.hoursInStage > 24 ? 'text-red-600 font-medium' :
                      lead.hoursInStage > 18 ? 'text-yellow-600 font-medium' : ''
                    }>
                      {Math.round(lead.hoursInStage)}h
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={lead.healthStatus === 'critical' ? 'destructive' : 'warning'}>
                      {lead.healthStatus === 'critical' ? 'Critical' : 'At Risk'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${lead.estimatedValue.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {atRiskLeads.length > 50 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing 50 of {atRiskLeads.length} leads
            </div>
          )}
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
