"use client"

import { useEffect, useState } from 'react'
import { useAppStore, ROLE_PERMISSIONS } from '@/store'
import { KPI_DICTIONARY, DATA_SOURCES } from '@/lib/kpis'
import { getDataSources, getDataQualityMetrics } from '@/lib/data'
import { LineageModal } from '@/components/features/LineageModal'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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
  Search, Download, Clock, Eye, Edit, FileText
} from 'lucide-react'
import { KPIDefinition, DataSource, DataQualityMetric, Role } from '@/types'

export default function GovernancePage() {
  const { settings } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [qualityMetrics, setQualityMetrics] = useState<DataQualityMetric[]>([])
  const [selectedKpi, setSelectedKpi] = useState<KPIDefinition | null>(null)
  const [lineageOpen, setLineageOpen] = useState(false)

  useEffect(() => {
    setDataSources(getDataSources())
    setQualityMetrics(getDataQualityMetrics())
  }, [settings])

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

  const criticalIssues = qualityMetrics.filter(m => m.status === 'critical')
  const warningIssues = qualityMetrics.filter(m => m.status === 'warning')

  const roles: Role[] = ['exec', 'market_director', 'market_sales_director', 'region_director', 'manager', 'sales_manager', 'ops_manager', 'rep', 'technician']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Governance</h1>
          <p className="text-sm text-gray-500">KPI dictionary, data quality, and permissions</p>
        </div>
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
                        <TableCell className="text-sm text-gray-600 max-w-xs truncate">
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glow-success">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
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
                      {qualityMetrics.filter(m => m.status === 'good').length}
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
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dataSources.map((source, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{source.name}</div>
                        <div className="text-sm text-gray-500">{source.system}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {source.recordCount.toLocaleString()} records
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          source.status === 'fresh' ? 'success' :
                          source.status === 'stale' ? 'warning' : 'danger'
                        }>
                          {source.status}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(source.lastRefresh, { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    {source.knownIssues.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-yellow-600 font-medium">Known Issues:</div>
                        <ul className="text-xs text-gray-600 mt-1">
                          {source.knownIssues.map((issue, j) => (
                            <li key={j}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Threshold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qualityMetrics.map((metric, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{metric.source}</TableCell>
                      <TableCell>{metric.metric}</TableCell>
                      <TableCell className="text-right">{metric.value}</TableCell>
                      <TableCell className="text-right">{metric.threshold}</TableCell>
                      <TableCell>
                        <Badge variant={
                          metric.status === 'good' ? 'success' :
                          metric.status === 'warning' ? 'warning' : 'danger'
                        }>
                          {metric.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{metric.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
