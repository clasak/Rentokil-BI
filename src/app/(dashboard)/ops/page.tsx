"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAppStore } from '@/store'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { BranchWorkforce } from '@/lib/bigquery/queries/organization-workforce'
import { calculateKPIValues, getActionItems } from '@/lib/kpi-calculations'
import { KPICard } from '@/components/features/KPICard'
import { ActionList } from '@/components/features/ActionList'
import { ChartTooltip } from '@/components/features/ChartTooltip'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Wrench, AlertTriangle, Users, ChevronRight, MapPin, RefreshCw, Mail, FileText, ExternalLink } from 'lucide-react'
import { Account, KPIValue, ServiceEvent, Complaint } from '@/types'
import type { OpsOverview } from '@/lib/bigquery/queries/ops'
import { HierarchicalOrganizationFilter } from '@/components/layout/HierarchicalOrganizationFilter'

// Types for display data
interface OpsDisplayData {
  completionRate: number
  callbackRate: number
  totalServices: number
  completedServices: number
  callbacks: number
}

// Empty fallback data
const EMPTY_OPS_DATA: OpsDisplayData = {
  completionRate: 0,
  callbackRate: 0,
  totalServices: 0,
  completedServices: 0,
  callbacks: 0,
}

// Transform BigQuery data to display format
function transformBigQueryData(bqData: OpsOverview[]): OpsDisplayData {
  const metrics = new Map<string, number>()
  ;(bqData || []).forEach(row => {
    metrics.set(row.metric, row.value)
  })

  return {
    completionRate: metrics.get('Completion Rate') || 0,
    callbackRate: metrics.get('Callback Rate') || 0,
    totalServices: metrics.get('Services Completed') || 0,
    completedServices: Math.round((metrics.get('Services Completed') || 0) * ((metrics.get('Completion Rate') || 95) / 100)),
    callbacks: Math.round((metrics.get('Services Completed') || 0) * ((metrics.get('Callback Rate') || 3) / 100)),
  }
}

export default function OpsPage() {
  const { settings, showAllBranchTechnicians, setShowAllBranchTechnicians, organizationFilters } = useAppStore()
  const effectiveRole = useEffectiveRole()
  const [kpiValues, setKpiValues] = useState<Map<string, KPIValue>>(new Map())
  const [actions, setActions] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)

  // BigQuery integration for operations metrics
  const {
    data: opsData,
    isLoading: isBQLoading,
    dataSource,
    responseTime,
    error,
    errorType,
    refetch,
  } = useBigQueryData<OpsOverview[], OpsDisplayData>({
    queryName: 'ops-overview',
    filters: { daysBack: 30 },
    defaultData: EMPTY_OPS_DATA,
    transformBigQueryData,
    includeOrgFilters: true, // Filter operations data by user's market/region/branch
    includeRoleFilters: false, // Ops overview is org-wide, not user-specific
  })

  // Branch workforce data from BigQuery (real employee headcounts)
  const {
    data: workforceData,
  } = useBigQueryData<BranchWorkforce[], BranchWorkforce[]>({
    queryName: 'branch-workforce',
    defaultData: [],
    transformBigQueryData: (data) => data,
    includeOrgFilters: true, // Filter to user's market/region/branch
    includeRoleFilters: false, // No user-specific filtering needed
  })

  // Hydration fix
  useEffect(() => {
    setMounted(true)
  }, [])

  // Ops accounts via useBigQueryData (ensures role/org filters are applied)
  const { data: accountsBQ } = useBigQueryData<Record<string, unknown>[], Account[]>({
    queryName: 'ops-accounts',
    filters: { limit: 1000 },
    defaultData: [],
    transformBigQueryData: (data) => (data || []).map((acc: Record<string, unknown>) => ({
      id: acc.id as string,
      name: acc.name as string,
      vertical: 'Commercial' as const,
      contractValue: ((acc.monthlyValue as number) || 0) * 12,
      retentionRisk: 'low' as const,
      lastServiceDate: new Date(acc.lastServiceDate as string),
      openIssues: 0,
      marketId: '',
      branchId: (acc.branch as string) || '',
      ownerId: '',
      createdAt: new Date(),
      arBalance: 0,
      serviceFrequency: 'monthly' as const,
      complaints: 0,
    })),
    includeOrgFilters: true, // Filter to user's org hierarchy
    includeRoleFilters: false, // Ops overview - not filtered to individual
  })

  // Ops service events via useBigQueryData
  const { data: serviceEventsBQ } = useBigQueryData<Record<string, unknown>[], ServiceEvent[]>({
    queryName: 'ops-service-events',
    filters: { daysBack: 30, limit: 500 },
    defaultData: [],
    transformBigQueryData: (data) => (data || []).map((evt: Record<string, unknown>) => ({
      id: evt.id as string,
      accountId: evt.customerId as string,
      technicianId: evt.technicianId as string,
      routeId: '',
      scheduledDate: new Date(evt.date as string),
      completedDate: evt.status === 'completed' ? new Date(evt.date as string) : undefined,
      status: evt.status === 'completed' ? 'completed' as const :
              evt.status === 'in_progress' ? 'scheduled' as const :
              evt.status === 'escalated' ? 'callback' as const : 'scheduled' as const,
      timeOnSite: 45,
      serviceType: evt.type as string,
      notes: evt.reason as string,
    })),
    includeOrgFilters: true, // Filter to user's org hierarchy
    includeRoleFilters: false, // Ops overview - not filtered to individual
  })

  // Ops complaints via useBigQueryData
  const { data: complaintsBQ } = useBigQueryData<Record<string, unknown>[], Complaint[]>({
    queryName: 'ops-complaints',
    filters: { daysBack: 30, limit: 200 },
    defaultData: [],
    transformBigQueryData: (data) => (data || []).map((cmp: Record<string, unknown>) => ({
      id: cmp.id as string,
      accountId: cmp.customerId as string,
      type: (cmp.category as string)?.toLowerCase().includes('service') ? 'service_quality' as const :
            (cmp.category as string)?.toLowerCase().includes('billing') ? 'billing' as const :
            (cmp.category as string)?.toLowerCase().includes('scheduling') ? 'scheduling' as const :
            (cmp.category as string)?.toLowerCase().includes('tech') ? 'technician' as const : 'other' as const,
      severity: ((cmp.severity as string)?.toLowerCase() || 'medium') as 'low' | 'medium' | 'high' | 'critical',
      description: cmp.description as string,
      createdAt: new Date(cmp.date as string),
      status: (['open', 'in_progress', 'resolved', 'escalated'].includes(cmp.status as string)
        ? cmp.status as Complaint['status']
        : 'open') as Complaint['status'],
    })),
    includeOrgFilters: true, // Filter to user's org hierarchy
    includeRoleFilters: false, // Ops overview - not filtered to individual
  })

  // Use BigQuery data as primary source
  const accounts = accountsBQ
  const serviceEvents = serviceEventsBQ
  const complaints = complaintsBQ

  useEffect(() => {
    if (!mounted) return

    // Pass role and userId to filter KPI data to user's scope
    setKpiValues(calculateKPIValues(effectiveRole, settings.userId))
    setActions(getActionItems(effectiveRole, settings.userId).filter(a => a.type === 'at_risk_account' || a.type === 'capacity_pressure'))

    // Technicians are now sourced from BigQuery workforce data (workforceData state)
  }, [mounted, settings, showAllBranchTechnicians, effectiveRole, organizationFilters])

  // Show nothing until mounted (hydration fix)
  if (!mounted) return null

  const opsKpis = ['service_risk_index', 'callback_rate', 'missed_service_rate', 'avg_response_time_hours', 'retention_risk']

  // Service status breakdown
  const completedServices = serviceEvents.filter(s => s.status === 'completed').length
  const callbackServices = serviceEvents.filter(s => s.status === 'callback').length
  const missedServices = serviceEvents.filter(s => s.status === 'missed').length
  const scheduledServices = serviceEvents.filter(s => s.status === 'scheduled').length

  const serviceStatusData = [
    { name: 'Completed', value: completedServices, fill: '#22c55e' },
    { name: 'Callback', value: callbackServices, fill: '#f59e0b' },
    { name: 'Missed', value: missedServices, fill: '#ef4444' },
    { name: 'Scheduled', value: scheduledServices, fill: '#6366f1' },
  ]

  // Complaint breakdown
  const complaintTypes = ['service_quality', 'billing', 'scheduling', 'technician', 'other']
  const complaintData = complaintTypes.map(type => ({
    type: type.replace('_', ' '),
    count: complaints.filter(c => c.type === type).length,
  }))

  // At-risk accounts
  const atRiskAccounts = accounts
    .filter(a => a.retentionRisk === 'high' || a.retentionRisk === 'medium')
    .sort((a, b) => b.contractValue - a.contractValue)
    .slice(0, 10)

  // Branch staffing data from BigQuery workforce
  const branchCapacity = workforceData.slice(0, 8).map(w => ({
    name: w.branch_name || w.branch_code,
    technicians: w.technicians,
    aeSales: w.ae_sales,
    total: w.total,
  }))

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumbs */}
      <PageHeader
        title="Operations"
        breadcrumbs={[
          { label: 'Command Center', href: '/' },
          { label: 'Operations' },
        ]}
        dataSource={dataSource}
        responseTime={responseTime}
        error={error}
        onRefresh={refetch}
        isLoading={isBQLoading}
      >
        {/* Ops Manager toggle for technician visibility */}
        {effectiveRole === 'ops_manager' && (
          <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {showAllBranchTechnicians ? 'All Branch Technicians' : 'My Technicians'}
            </span>
            <Switch
              checked={showAllBranchTechnicians}
              onCheckedChange={setShowAllBranchTechnicians}
            />
          </div>
        )}
      </PageHeader>

      {/* Error Display Card */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Failed to Load Operations Data</span>
          </div>

          <div className="space-y-3">
            {/* Error message */}
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {error}
            </div>

            {/* Context */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Error Type:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{errorType || 'Unknown'}</p>
              </div>
              <div>
                <span className="text-gray-500">Query:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">ops-overview</p>
              </div>
            </div>

            {/* Recovery actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://console.cloud.google.com/bigquery', '_blank')}
              >
                <FileText className="h-3 w-3 mr-1.5" />
                View Logs
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `mailto:support@rentokil.com?subject=Operations Dashboard Error&body=Error: ${encodeURIComponent(error || 'Unknown error')}`}
              >
                <Mail className="h-3 w-3 mr-1.5" />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Hierarchy Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <HierarchicalOrganizationFilter
            showCounts
            showBreadcrumb
            maxHeight="calc(100vh - 240px)"
          />
        </div>

        <div className="lg:col-span-3 space-y-6">
          {/* KPI Cards */}
          <div id="ops-kpi-cards" className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {opsKpis.map(slug => {
          const kpiValue = kpiValues.get(slug)
          if (!kpiValue) return null
          return <KPICard key={slug} kpiValue={kpiValue} compact />
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Status */}
        <Card id="service-risk-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Service Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <filter id="glow-ops-pie" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <Pie
                    data={serviceStatusData}
                    cx="40%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    activeShape={{ filter: 'url(#glow-ops-pie)' }}
                  >
                    {serviceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ paddingLeft: '20px' }}
                    formatter={(value, entry) => {
                      const item = serviceStatusData.find(d => d.name === value)
                      const total = serviceStatusData.reduce((sum, d) => sum + d.value, 0)
                      const percent = item ? ((item.value / total) * 100).toFixed(0) : 0
                      return <span className="text-gray-700 dark:text-gray-300">{value} ({percent}%)</span>
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              {serviceStatusData.map(status => (
                <div key={status.name} className="text-center">
                  <div className="text-2xl font-bold">{status.value.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">{status.name}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Accounts Actions */}
        <ActionList
          actions={actions.filter(a => a.type === 'at_risk_account')}
          title="At-Risk Accounts"
          maxItems={6}
          type="at_risk_account"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Staffing */}
        <Card id="route-efficiency">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Branch Staffing (BigQuery)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchCapacity} layout="vertical">
                  <defs>
                    <filter id="glow-ops-bar1" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip content={<ChartTooltip />} cursor={false} />
                  <Bar dataKey="technicians" name="Technicians" fill="#22c55e" radius={[0, 4, 4, 0]} activeBar={{ filter: 'url(#glow-ops-bar1)' }} stackId="staff" />
                  <Bar dataKey="aeSales" name="AE/Sales" fill="#6366f1" radius={[0, 4, 4, 0]} stackId="staff" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Complaint Breakdown */}
        <Card id="callback-rate">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Complaints by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complaintData}>
                  <defs>
                    <filter id="glow-ops-bar2" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip content={<ChartTooltip />} cursor={false} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} activeBar={{ filter: 'url(#glow-ops-bar2)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Workforce Roster (BigQuery) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Branch Workforce
            <Badge variant="outline" className="ml-2">
              {workforceData.reduce((sum, w) => sum + w.total, 0)} Employees
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-center">BMs</TableHead>
                <TableHead className="text-center">Techs</TableHead>
                <TableHead className="text-center">AEs</TableHead>
                <TableHead className="text-center">Ops Mgrs</TableHead>
                <TableHead className="text-center">Sales Mgrs</TableHead>
                <TableHead className="text-center">CSR</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workforceData.slice(0, 15).map(w => (
                <TableRow key={w.branch_code}>
                  <TableCell>
                    <div className="font-medium">{w.branch_name || w.branch_code}</div>
                    <div className="text-xs text-gray-500 font-mono">{w.branch_code}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      {w.region_name || w.region_code}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={w.branch_managers === 0 ? 'text-red-500 font-medium' : ''}>
                      {w.branch_managers}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{w.technicians}</span>
                  </TableCell>
                  <TableCell className="text-center">{w.ae_sales}</TableCell>
                  <TableCell className="text-center">{w.ops_managers}</TableCell>
                  <TableCell className="text-center">{w.sales_managers}</TableCell>
                  <TableCell className="text-center">{w.csr_office}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{w.total}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/branch/${w.branch_code}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {workforceData.length > 15 && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm">
                View All {workforceData.length} Branches
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* At-Risk Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Accounts Requiring Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Vertical</TableHead>
                <TableHead className="text-right">Contract Value</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead className="text-right">Open Issues</TableHead>
                <TableHead className="text-right">Complaints</TableHead>
                <TableHead>Last Service</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRiskAccounts.map(account => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-xs text-gray-500">{account.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.vertical}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(account.contractValue)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.retentionRisk === 'high' ? 'danger' : 'warning'}>
                      {account.retentionRisk}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={account.openIssues > 2 ? 'text-red-600 font-medium' : ''}>
                      {account.openIssues}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={account.complaints > 2 ? 'text-red-600 font-medium' : ''}>
                      {account.complaints}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {account.lastServiceDate.toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/account/${account.id}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  )
}
