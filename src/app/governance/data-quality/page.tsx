"use client"

import { useState, useMemo } from 'react'
import {
  getDataQualityIssues,
  getReconciliationResults,
  getDataSourceHealth,
  getDataQualityScore,
  getIssueSummary,
  type DataQualityIssue,
  type ReconciliationResult,
  type DataSourceHealth
} from '@/lib/data-quality-engine'
import { DATA_SOURCES_METADATA, type DataSource } from '@/lib/data-dictionary'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts'
import {
  Shield, Database, AlertTriangle, AlertCircle, CheckCircle,
  RefreshCw, Clock, Activity, TrendingUp, TrendingDown,
  ArrowRight, ChevronRight, Eye, User, Zap, Server,
  GitCompare, FileWarning, CheckCircle2, XCircle, Info,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

// Quality score gauge component
function QualityScoreGauge({ score, label }: { score: number; label: string }) {
  const getColor = (s: number) => {
    if (s >= 95) return 'text-green-500'
    if (s >= 85) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getBgColor = (s: number) => {
    if (s >= 95) return 'bg-green-500'
    if (s >= 85) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className="text-muted/20"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="12"
            fill="none"
            className={getColor(score)}
            strokeDasharray={`${(score / 100) * 251.2} 251.2`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${getColor(score)}`}>{score}%</span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground mt-2">{label}</span>
    </div>
  )
}

// Severity icon component
function SeverityIcon({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
  const icons = {
    critical: <AlertCircle className="h-4 w-4 text-red-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    info: <Info className="h-4 w-4 text-blue-500" />
  }
  return icons[severity]
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    acknowledged: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    false_positive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    healthy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    degraded: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    offline: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[status] || styles.healthy}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

// Source badge
function SourceBadge({ source }: { source: DataSource }) {
  const colors: Record<DataSource, string> = {
    rtx_data_hub: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    salesforce: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pestpac: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    start_packet_pdf: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    calculated: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    workday: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    sap: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
  }

  const labels: Record<DataSource, string> = {
    rtx_data_hub: 'RTX Hub',
    salesforce: 'Salesforce',
    pestpac: 'PestPac',
    start_packet_pdf: 'Start Packet',
    calculated: 'Calculated',
    workday: 'Workday',
    sap: 'SAP'
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[source]}`}>
      {labels[source]}
    </span>
  )
}

// Issue detail modal
function IssueDetailModal({
  issue,
  open,
  onClose
}: {
  issue: DataQualityIssue | null
  open: boolean
  onClose: () => void
}) {
  if (!issue) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <SeverityIcon severity={issue.severity} />
            <div>
              <DialogTitle>{issue.ruleName}</DialogTitle>
              <DialogDescription>
                <code className="text-xs">{issue.ruleId}</code> - {issue.fieldName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm">{issue.description}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold text-red-500">{issue.affectedRecords}</div>
                <div className="text-xs text-muted-foreground">Affected Records</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{issue.totalRecords.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Records</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold">{issue.percentageAffected}%</div>
                <div className="text-xs text-muted-foreground">Percentage</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Remediation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-600 dark:text-green-400">{issue.remediation}</p>
            </CardContent>
          </Card>

          {issue.examples && issue.examples.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Example Records</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {issue.examples.map((ex, i) => (
                    <li key={i} className="text-sm font-mono text-muted-foreground">{ex}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Detected: {format(new Date(issue.detectedAt), 'MMM d, yyyy h:mm a')}</span>
            <span>Last Checked: {formatDistanceToNow(new Date(issue.lastChecked), { addSuffix: true })}</span>
          </div>

          {issue.assignee && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Assigned to: <strong>{issue.assignee}</strong></span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function DataQualityPage() {
  const [selectedIssue, setSelectedIssue] = useState<DataQualityIssue | null>(null)
  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const issues = useMemo(() => getDataQualityIssues(), [])
  const reconciliation = useMemo(() => getReconciliationResults(), [])
  const sourceHealth = useMemo(() => getDataSourceHealth(), [])
  const qualityScore = useMemo(() => getDataQualityScore(), [])
  const issueSummary = useMemo(() => getIssueSummary(), [])

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSeverity = severityFilter === 'all' || issue.severity === severityFilter
      const matchesStatus = statusFilter === 'all' || issue.status === statusFilter
      return matchesSeverity && matchesStatus
    })
  }, [issues, severityFilter, statusFilter])

  const openIssueDetail = (issue: DataQualityIssue) => {
    setSelectedIssue(issue)
    setIssueModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Data Quality Monitor
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time data quality monitoring, issue detection, and cross-system reconciliation
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Now
        </Button>
      </div>

      {/* Overall Score Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Score Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Overall Data Quality</CardTitle>
            <CardDescription>Composite score across all dimensions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <QualityScoreGauge score={qualityScore.overall} label="Overall Score" />
            <div className="mt-4 w-full grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded bg-muted/50">
                <div className="text-lg font-semibold text-green-500">
                  <TrendingUp className="h-4 w-4 inline mr-1" />
                  +0.8%
                </div>
                <div className="text-xs text-muted-foreground">vs Last Week</div>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <div className="text-lg font-semibold">{issueSummary.open}</div>
                <div className="text-xs text-muted-foreground">Open Issues</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Quality Score Trend</CardTitle>
            <CardDescription>7-day data quality score history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={qualityScore.trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[90, 100]} tick={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dimension Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quality Dimensions
          </CardTitle>
          <CardDescription>Score breakdown by data quality dimension</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(qualityScore.byDimension).map(([dimension, score]) => (
              <div key={dimension} className="text-center">
                <QualityScoreGauge score={score} label={dimension.charAt(0).toUpperCase() + dimension.slice(1)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="issues" className="space-y-4">
        <TabsList>
          <TabsTrigger value="issues" className="gap-2">
            <FileWarning className="h-4 w-4" />
            Issues ({issueSummary.total})
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="gap-2">
            <GitCompare className="h-4 w-4" />
            Reconciliation
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-2">
            <Server className="h-4 w-4" />
            Source Health
          </TabsTrigger>
        </TabsList>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          {/* Issue Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{issueSummary.bySeverity.critical}</div>
                    <div className="text-xs text-muted-foreground">Critical</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{issueSummary.bySeverity.warning}</div>
                    <div className="text-xs text-muted-foreground">Warning</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Info className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{issueSummary.bySeverity.info}</div>
                    <div className="text-xs text-muted-foreground">Info</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{issueSummary.resolved}</div>
                    <div className="text-xs text-muted-foreground">Resolved</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Issues Table */}
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Affected</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIssues.map(issue => (
                    <TableRow
                      key={issue.issueId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openIssueDetail(issue)}
                    >
                      <TableCell>
                        <SeverityIcon severity={issue.severity} />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{issue.ruleName}</div>
                        <code className="text-xs text-muted-foreground">{issue.issueId}</code>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{issue.displayName}</div>
                        <code className="text-xs text-muted-foreground">{issue.fieldName}</code>
                      </TableCell>
                      <TableCell>
                        <SourceBadge source={issue.source} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{issue.affectedRecords.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">{issue.percentageAffected}%</div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={issue.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {issue.assignee || '-'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitCompare className="h-5 w-5" />
                Cross-System Reconciliation
              </CardTitle>
              <CardDescription>
                Comparing data between source systems to identify discrepancies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reconciliation.map((recon, i) => (
                  <Card key={i} className={`border-l-4 ${
                    recon.status === 'healthy' ? 'border-l-green-500' :
                    recon.status === 'warning' ? 'border-l-yellow-500' :
                    'border-l-red-500'
                  }`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <SourceBadge source={recon.sourceA} />
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <SourceBadge source={recon.sourceB} />
                          <span className="text-sm text-muted-foreground">|</span>
                          <span className="text-sm font-medium capitalize">{recon.entityType.replace('_', ' ')}</span>
                          <span className="text-sm text-muted-foreground">/ {recon.fieldName}</span>
                        </div>
                        <StatusBadge status={recon.status} />
                      </div>

                      <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-green-500">{recon.matchRate}%</div>
                          <div className="text-xs text-muted-foreground">Match Rate</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{recon.matchedRecords.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">Matched</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-red-500">{recon.conflictingValues}</div>
                          <div className="text-xs text-muted-foreground">Conflicts</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{recon.missingInA}</div>
                          <div className="text-xs text-muted-foreground">Missing in A</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{recon.missingInB}</div>
                          <div className="text-xs text-muted-foreground">Missing in B</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(recon.lastReconciled), { addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      {recon.discrepancies.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="text-sm font-medium mb-2">Sample Discrepancies</div>
                          <div className="space-y-2">
                            {recon.discrepancies.slice(0, 3).map((disc, j) => (
                              <div key={j} className="flex items-center gap-4 text-sm bg-muted/50 p-2 rounded">
                                <code className="text-xs">{disc.recordId}</code>
                                <span className="text-muted-foreground">:</span>
                                <span className="text-blue-600">{typeof disc.valueInA === 'number' ? disc.valueInA.toLocaleString() : disc.valueInA}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="text-purple-600">{typeof disc.valueInB === 'number' ? disc.valueInB.toLocaleString() : disc.valueInB}</span>
                                {disc.variancePercent && (
                                  <Badge variant="outline" className="text-xs text-red-500">
                                    {disc.variancePercent > 0 ? '+' : ''}{disc.variancePercent}%
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Source Health Tab */}
        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sourceHealth.map(source => (
              <Card key={source.source} className={`border-l-4 ${
                source.status === 'healthy' ? 'border-l-green-500' :
                source.status === 'degraded' ? 'border-l-yellow-500' :
                'border-l-red-500'
              }`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <CardTitle className="text-base">{source.name}</CardTitle>
                    </div>
                    <StatusBadge status={source.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Connection Status */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Connection</span>
                      <div className="flex items-center gap-1">
                        {source.connectionStatus === 'connected' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : source.connectionStatus === 'intermittent' ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="capitalize">{source.connectionStatus}</span>
                      </div>
                    </div>

                    {/* Last Sync */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last Sync</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(source.lastSync), { addSuffix: true })}
                      </div>
                    </div>

                    {/* Record Count */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Records</span>
                      <span className="font-medium">{source.recordCount.toLocaleString()}</span>
                    </div>

                    {/* Response Time */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avg Response</span>
                      <span className={`font-medium ${source.avgResponseTime > 500 ? 'text-yellow-500' : ''}`}>
                        {source.avgResponseTime}ms
                      </span>
                    </div>

                    {/* Error Rate */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Error Rate</span>
                      <span className={`font-medium ${source.errorRate > 1 ? 'text-red-500' : source.errorRate > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {source.errorRate}%
                      </span>
                    </div>

                    {/* Issues */}
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Open Issues</span>
                      <div className="flex items-center gap-2">
                        {source.criticalIssues > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {source.criticalIssues} critical
                          </Badge>
                        )}
                        {source.warningIssues > 0 && (
                          <Badge variant="outline" className="text-xs text-yellow-600">
                            {source.warningIssues} warning
                          </Badge>
                        )}
                        {source.issueCount === 0 && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            None
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Freshness Bar */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Data Freshness</span>
                        <span className={
                          source.freshness === 'fresh' ? 'text-green-500' :
                          source.freshness === 'stale' ? 'text-yellow-500' :
                          'text-red-500'
                        }>{source.freshness}</span>
                      </div>
                      <Progress
                        value={Math.max(0, 100 - (source.freshnessMinutes / 60))}
                        className={`h-2 ${
                          source.freshness === 'fresh' ? '[&>div]:bg-green-500' :
                          source.freshness === 'stale' ? '[&>div]:bg-yellow-500' :
                          '[&>div]:bg-red-500'
                        }`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Issue Detail Modal */}
      <IssueDetailModal
        issue={selectedIssue}
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
      />
    </div>
  )
}
