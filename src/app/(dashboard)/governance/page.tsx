"use client"

import { useState } from 'react'
import { ROLE_PERMISSIONS } from '@/store'
import { KPI_DICTIONARY } from '@/lib/kpis'
import { LineageModal } from '@/components/features/LineageModal'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDistanceToNow } from 'date-fns'
import {
  Book, Shield, Database, AlertTriangle, CheckCircle,
  Search, Download, Clock, Eye, Edit, FileText, RefreshCw, ExternalLink, Loader2
} from 'lucide-react'
import { KPIDefinition, Role } from '@/types'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import type { DataSourceHealthReal, DataQualityIssueReal } from '@/lib/bigquery/queries/data-quality'

// Empty defaults for BigQuery data (no mock fallback)
const EMPTY_SOURCES: DataSourceHealthReal[] = []
const EMPTY_ISSUES: DataQualityIssueReal[] = []

export default function GovernancePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedKpi, setSelectedKpi] = useState<KPIDefinition | null>(null)
  const [lineageOpen, setLineageOpen] = useState(false)

  // BigQuery: Data source health (replaces static getDataSources)
  const {
    data: dataSources,
    isLoading: sourcesLoading,
    dataSource: sourcesDataSource,
    responseTime: sourcesResponseTime,
    error: sourcesError,
    refetch: refetchSources,
  } = useBigQueryData<DataSourceHealthReal[], DataSourceHealthReal[]>({
    queryName: 'data-quality-source-health',
    defaultData: EMPTY_SOURCES,
    transformBigQueryData: (raw) => (raw || []).map(s => ({
      ...s,
      lastSync: s.lastSync ?? '',
      recordCount: s.recordCount ?? 0,
      freshnessMinutes: s.freshnessMinutes ?? 0,
      issueCount: s.issueCount ?? 0,
      criticalIssues: s.criticalIssues ?? 0,
      warningIssues: s.warningIssues ?? 0,
    })),
    includeOrgFilters: false,  // Governance view - intentionally shows company-wide data
    includeRoleFilters: false, // No user filtering needed for data quality monitoring
  })

  // BigQuery: Data quality issues (replaces static getDataQualityMetrics)
  const {
    data: qualityIssues,
    isLoading: issuesLoading,
    error: issuesError,
    refetch: refetchIssues,
  } = useBigQueryData<DataQualityIssueReal[], DataQualityIssueReal[]>({
    queryName: 'data-quality-issues',
    defaultData: EMPTY_ISSUES,
    transformBigQueryData: (raw) => (raw || []).map(issue => ({
      ...issue,
      affectedRecords: issue.affectedRecords ?? 0,
      totalRecords: issue.totalRecords ?? 0,
      percentageAffected: issue.percentageAffected ?? 0,
    })),
    includeOrgFilters: false,  // Governance view - intentionally shows company-wide data
    includeRoleFilters: false, // No user filtering needed for data quality monitoring
  })

  const isLoading = sourcesLoading || issuesLoading
  const error = sourcesError || issuesError

  // Filter KPIs
  const filteredKpis = KPI_DICTIONARY.filter(kpi => {
    const matchesSearch = kpi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kpi.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kpi.definition.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || kpi.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Export KPI Dictionary as CSV
  const exportCSV = () => {
    const headers = ['Name', 'Slug', 'Category', 'Definition', 'Calculation Notes', 'Grain', 'Primary Source', 'Refresh Cadence', 'Owner']
    const rows = KPI_DICTIONARY.map(kpi => [
      kpi.name,
      kpi.slug,
      kpi.category,
      kpi.definition,
      kpi.calculationNotes,
      kpi.grain,
      kpi.primarySource,
      kpi.refreshCadence,
      kpi.owner
    ])

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kpi_dictionary.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const categories = ['all', ...new Set(KPI_DICTIONARY.map(k => k.category))]

  // Derive summary counts from BigQuery data
  const healthySources = dataSources.filter(s => s.status === 'healthy').length
  const degradedSources = dataSources.filter(s => s.status === 'degraded').length
  const criticalSources = dataSources.filter(s => s.status === 'critical').length
  const criticalIssues = qualityIssues.filter(i => i.severity === 'critical')
  const warningIssues = qualityIssues.filter(i => i.severity === 'warning')

  const roles: Role[] = ['exec', 'market_vp', 'market_sales_director', 'region_director', 'region_sales_manager', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician']

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Governance' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Governance</h1>
          <p className="text-sm text-gray-500">KPI dictionary, data quality, and permissions</p>
        </div>
        <DataSourceBadge
          status={sourcesLoading ? 'loading' : sourcesError ? 'error' : sourcesDataSource}
          responseTime={sourcesResponseTime}
        />
      </div>

      <Tabs defaultValue="dictionary" className="space-y-4">
        <TabsList id="governance-tabs">
          <TabsTrigger value="dictionary" id="kpi-dictionary" className="gap-2">
            <Book className="h-4 w-4" />
            KPI Dictionary
          </TabsTrigger>
          <TabsTrigger value="quality" id="data-quality-panel" className="gap-2">
            <Database className="h-4 w-4" />
            Data Quality
          </TabsTrigger>
          <TabsTrigger value="permissions" id="permissions-tab" className="gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="changelog" className="gap-2">
            <FileText className="h-4 w-4" />
            Change Log
          </TabsTrigger>
        </TabsList>

        {/* KPI Dictionary Tab */}
        <TabsContent value="dictionary" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>KPI Dictionary</CardTitle>
                  <CardDescription>{KPI_DICTIONARY.length} KPIs defined</CardDescription>
                </div>
                <Button onClick={exportCSV} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search KPIs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat === 'all' ? 'All Categories' : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* KPI Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">KPI Name</TableHead>
                      <TableHead className="w-[100px]">Category</TableHead>
                      <TableHead>Definition</TableHead>
                      <TableHead className="w-[150px]">Primary Source</TableHead>
                      <TableHead className="w-[120px]">Refresh</TableHead>
                      <TableHead className="w-[150px]">Owner</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKpis.map(kpi => (
                      <TableRow key={kpi.slug}>
                        <TableCell>
                          <div className="font-medium">{kpi.name}</div>
                          <code className="text-xs text-gray-500">{kpi.slug}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{kpi.category}</Badge>
                        </TableCell>
                        <TableCell
                          className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate"
                          title={kpi.definition}
                        >
                          {kpi.definition}
                        </TableCell>
                        <TableCell className="text-sm">{kpi.primarySource}</TableCell>
                        <TableCell className="text-sm">{kpi.refreshCadence}</TableCell>
                        <TableCell className="text-sm">{kpi.owner}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedKpi(kpi)
                              setLineageOpen(true)
                            }}
                          >
                            <Database className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Quality Tab */}
        <TabsContent value="quality" className="space-y-6">
          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">Failed to Load Data Quality</span>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
                  {error}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
                    <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{sourcesDataSource}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Queries:</span>
                    <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">data-quality-source-health, data-quality-issues</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
                  <Button variant="outline" size="sm" onClick={() => { refetchSources(); refetchIssues() }}>
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Retry
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open('/platform-admin', '_blank')}>
                    <FileText className="h-3 w-3 mr-1.5" />
                    View Logs
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !error && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Loading data quality metrics from BigQuery...</span>
            </div>
          )}

          {/* Summary Cards */}
          {!isLoading && !error && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="glow-success">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Data Sources</div>
                        <div className="text-2xl font-bold">{dataSources.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glow-success">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Healthy</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {healthySources}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glow-warning">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Warnings</div>
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{warningIssues.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glow-danger">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Critical</div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalIssues.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Data Sources */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Data Sources
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => refetchSources()}>
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {dataSources.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No data sources found</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dataSources.map((source, i) => (
                        <Card key={i} className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">{source.name}</div>
                              <div className="text-sm text-gray-500">{source.source}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {source.recordCount.toLocaleString()} records
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={
                                source.status === 'healthy' ? 'success' :
                                source.status === 'degraded' ? 'warning' : 'danger'
                              }>
                                {source.status}
                              </Badge>
                              {source.lastSync && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(source.lastSync), { addSuffix: true })}
                                </div>
                              )}
                            </div>
                          </div>
                          {(source.criticalIssues > 0 || source.warningIssues > 0) && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex gap-3 text-xs">
                                {source.criticalIssues > 0 && (
                                  <span className="text-red-600 dark:text-red-400 font-medium">
                                    {source.criticalIssues} critical
                                  </span>
                                )}
                                {source.warningIssues > 0 && (
                                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                                    {source.warningIssues} warnings
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quality Issues */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Quality Issues</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => refetchIssues()}>
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {qualityIssues.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No quality issues detected</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Affected</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {qualityIssues.map((issue, i) => (
                          <TableRow key={issue.issueId || i}>
                            <TableCell className="font-medium text-sm">{issue.tableName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-xs">{issue.category}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                              {issue.description}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {issue.affectedRecords.toLocaleString()}
                              <span className="text-xs text-gray-400 ml-1">
                                ({issue.percentageAffected.toFixed(1)}%)
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                issue.severity === 'critical' ? 'danger' :
                                issue.severity === 'warning' ? 'warning' : 'outline'
                              }>
                                {issue.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-xs">{issue.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permissions Matrix</CardTitle>
              <CardDescription>Access levels by role</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        View
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Edit className="h-4 w-4" />
                        Edit
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        Export
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map(role => {
                    const perms = ROLE_PERMISSIONS[role]
                    return (
                      <TableRow key={role}>
                        <TableCell className="font-medium">{perms.label}</TableCell>
                        <TableCell className="text-sm text-gray-600">{perms.description}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {perms.canView.map(v => (
                              <Badge key={v} variant="outline" className="text-xs">{v.replace('_', ' ')}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {perms.canEdit.map(e => (
                              <Badge key={e} variant="outline" className="text-xs">{e.replace('_', ' ')}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {perms.canExport.map(ex => (
                              <Badge key={ex} variant="outline" className="text-xs">{ex.replace('_', ' ')}</Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Log Tab */}
        <TabsContent value="changelog">
          <Card>
            <CardHeader>
              <CardTitle>KPI Change Log</CardTitle>
              <CardDescription>Version history of KPI definitions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: '2024-01-15', kpi: 'service_risk_index', change: 'Updated weighting: callbacks 25% → 30%, complaints 30% → 25%', user: 'Sarah Johnson' },
                  { date: '2024-01-10', kpi: 'crm_hygiene_score', change: 'Added "stage validation" component (30%)', user: 'Mike Chen' },
                  { date: '2024-01-05', kpi: 'dso', change: 'Changed calculation window from 60 days to 30 days', user: 'Lisa Park' },
                  { date: '2023-12-20', kpi: 'win_rate', change: 'Excluded "No Decision" from lost count per leadership request', user: 'Sarah Johnson' },
                  { date: '2023-12-15', kpi: 'callback_rate', change: 'Extended callback window from 7 days to 14 days', user: 'Tom Wilson' },
                ].map((log, i) => (
                  <div key={i} className="flex gap-4 p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground w-24 flex-shrink-0">{log.date}</div>
                    <div className="flex-1">
                      <code className="text-sm bg-muted px-2 py-1 rounded">{log.kpi}</code>
                      <p className="text-sm mt-1">{log.change}</p>
                      <p className="text-xs text-muted-foreground mt-1">Changed by {log.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lineage Modal */}
      <LineageModal
        open={lineageOpen}
        onClose={() => setLineageOpen(false)}
        kpi={selectedKpi}
      />
    </div>
  )
}
