"use client"

import { useState, useMemo } from 'react'
import {
  DATA_DICTIONARY,
  DATA_SOURCES_METADATA,
  getDataDictionaryStats,
  getFieldsBySource,
  getFieldsByDomain,
  searchFields,
  type FieldDefinition,
  type DataSource,
  type DataQualitySeverity
} from '@/lib/data-dictionary'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Book, Database, Search, Download, Filter, Layers,
  CheckCircle, AlertTriangle, AlertCircle, Info,
  Code, Link2, Shield, Clock, User, FileText,
  ArrowRight, ChevronRight, Workflow, GitBranch,
  ExternalLink, Copy, Check, X
} from 'lucide-react'

// Stats card component
function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default'
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const variantStyles = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${variantStyles[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{title}</div>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Source badge component
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

// Severity badge
function SeverityBadge({ severity }: { severity: DataQualitySeverity }) {
  const styles = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }

  const icons = {
    critical: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const Icon = icons[severity]

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${styles[severity]}`}>
      <Icon className="h-3 w-3" />
      {severity}
    </span>
  )
}

// Field detail modal
function FieldDetailModal({
  field,
  open,
  onClose
}: {
  field: FieldDefinition | null
  open: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  if (!field) return null

  const copyFieldId = () => {
    navigator.clipboard.writeText(field.fieldId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{field.displayName}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{field.fieldName}</code>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyFieldId}>
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <Tabs defaultValue="overview" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rules">Business Rules</TabsTrigger>
              <TabsTrigger value="lineage">Data Lineage</TabsTrigger>
              <TabsTrigger value="governance">Governance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {/* Definition */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Book className="h-4 w-4" />
                    Definition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{field.definition}</p>
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground italic">{field.businessContext}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Technical Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Data Type</div>
                      <div className="font-medium">{field.dataType}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Format</div>
                      <div className="font-medium font-mono text-sm">{field.format || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Nullable</div>
                      <div className="font-medium">{field.nullable ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Default Value</div>
                      <div className="font-medium">{field.defaultValue?.toString() || 'None'}</div>
                    </div>
                  </div>

                  {field.validValues && (
                    <div className="mt-4">
                      <div className="text-xs text-muted-foreground mb-2">Valid Values</div>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(field.validValues) && field.validValues.map((v, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {typeof v === 'string' ? v : v.value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {field.valueRanges && (
                    <div className="mt-4">
                      <div className="text-xs text-muted-foreground mb-1">Value Range</div>
                      <p className="text-sm">
                        {field.valueRanges.min !== undefined && `Min: ${field.valueRanges.min}`}
                        {field.valueRanges.max !== undefined && ` | Max: ${field.valueRanges.max}`}
                        {field.valueRanges.typical && ` | Typical: ${field.valueRanges.typical}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Classification */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Classification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Domain</div>
                      <Badge variant="outline" className="mt-1 capitalize">{field.domain}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Category</div>
                      <Badge variant="outline" className="mt-1 capitalize">{field.category}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Access Level</div>
                      <Badge
                        variant="outline"
                        className={`mt-1 capitalize ${
                          field.accessLevel === 'pii' ? 'border-red-500 text-red-500' :
                          field.accessLevel === 'restricted' ? 'border-yellow-500 text-yellow-500' :
                          ''
                        }`}
                      >
                        {field.accessLevel}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Primary Source</div>
                      <div className="mt-1"><SourceBadge source={field.primarySource} /></div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-2">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {field.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KPIs Using This Field */}
              {field.kpisUsing.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      KPIs Using This Field
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {field.kpisUsing.map(kpi => (
                        <Badge key={kpi} variant="outline" className="font-mono text-xs">
                          {kpi}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="rules" className="space-y-4 mt-4">
              {/* Data Quality Rules */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Data Quality Rules ({field.dataQualityRules.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {field.dataQualityRules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No quality rules defined for this field.</p>
                  ) : (
                    <div className="space-y-3">
                      {field.dataQualityRules.map(rule => (
                        <div key={rule.ruleId} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{rule.ruleId}</code>
                                <span className="font-medium text-sm">{rule.ruleName}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                            </div>
                            <SeverityBadge severity={rule.severity} />
                          </div>
                          <div className="mt-3 space-y-2">
                            <div>
                              <div className="text-xs text-muted-foreground">Validation Logic</div>
                              <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 whitespace-pre-wrap">
                                {rule.validationLogic}
                              </code>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-muted-foreground">Failure Message</div>
                                <p className="text-sm text-red-600 dark:text-red-400">{rule.failureMessage}</p>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Remediation</div>
                                <p className="text-sm text-green-600 dark:text-green-400">{rule.remediation}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lineage" className="space-y-4 mt-4">
              {/* Source Transformations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Data Transformations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {field.transformations.map((transform, i) => (
                      <div key={i} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <SourceBadge source={transform.sourceSystem} />
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{field.displayName}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">Source Field</div>
                            <code className="text-xs bg-muted px-2 py-0.5 rounded">{transform.sourceField}</code>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Transformation Type</div>
                            <Badge variant="outline" className="text-xs capitalize">
                              {transform.transformationType.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-xs text-muted-foreground">Transformation Logic</div>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 whitespace-pre-wrap overflow-x-auto">
                            {transform.transformationLogic}
                          </pre>
                        </div>
                        {transform.exampleInput && transform.exampleOutput && (
                          <div className="mt-3 flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Input:</span>
                              <code className="bg-muted px-1.5 py-0.5 rounded">{transform.exampleInput}</code>
                            </div>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Output:</span>
                              <code className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                                {transform.exampleOutput}
                              </code>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Related Fields */}
              {field.relatedFields.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Related Fields
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {field.relatedFields.map(relatedId => (
                        <Badge key={relatedId} variant="outline" className="font-mono text-xs">
                          {relatedId}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="governance" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Ownership & Governance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Governance Owner</div>
                      <div className="font-medium">{field.governanceOwner}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Data Steward</div>
                      <div className="font-medium">{field.steward}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <Badge
                        variant={field.governanceStatus === 'approved' ? 'default' : 'outline'}
                        className={`capitalize ${
                          field.governanceStatus === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          field.governanceStatus === 'pending_review' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          field.governanceStatus === 'deprecated' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          ''
                        }`}
                      >
                        {field.governanceStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Version</div>
                      <div className="font-medium">v{field.version}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Review Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Last Reviewed</div>
                      <div className="font-medium">{field.lastReviewedDate}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Next Review</div>
                      <div className="font-medium">{field.nextReviewDate}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Created</div>
                      <div>{field.createdAt}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Last Updated</div>
                      <div>{field.updatedAt}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Field ID</div>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">{field.fieldId}</code>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Source Field Name</div>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded">{field.sourceFieldName}</code>
                    </div>
                  </div>
                  {field.usageNotes && (
                    <div className="mt-4">
                      <div className="text-xs text-muted-foreground">Usage Notes</div>
                      <p className="text-sm mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        {field.usageNotes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default function DataDictionaryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [domainFilter, setDomainFilter] = useState<string>('all')
  const [selectedField, setSelectedField] = useState<FieldDefinition | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const stats = useMemo(() => getDataDictionaryStats(), [])

  // Filter fields
  const filteredFields = useMemo(() => {
    let fields = DATA_DICTIONARY

    if (searchQuery) {
      fields = searchFields(searchQuery)
    }

    if (sourceFilter !== 'all') {
      fields = fields.filter(f =>
        f.primarySource === sourceFilter ||
        f.secondarySources?.includes(sourceFilter as DataSource)
      )
    }

    if (domainFilter !== 'all') {
      fields = fields.filter(f => f.domain === domainFilter)
    }

    return fields
  }, [searchQuery, sourceFilter, domainFilter])

  // Get unique domains
  const domains = useMemo(() =>
    ['all', ...new Set(DATA_DICTIONARY.map(f => f.domain))],
    []
  )

  // Export as CSV
  const exportCSV = () => {
    const headers = [
      'Field ID', 'Field Name', 'Display Name', 'Domain', 'Category',
      'Data Type', 'Primary Source', 'Definition', 'Governance Owner',
      'Status', 'Version', 'Tags'
    ]
    const rows = filteredFields.map(f => [
      f.fieldId,
      f.fieldName,
      f.displayName,
      f.domain,
      f.category,
      f.dataType,
      f.primarySource,
      f.definition.replace(/"/g, '""'),
      f.governanceOwner,
      f.governanceStatus,
      f.version,
      f.tags.join('; ')
    ])

    const csvContent = [headers, ...rows].map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'data_dictionary.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const openFieldDetail = (field: FieldDefinition) => {
    setSelectedField(field)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Governance', href: '/governance' },
        { label: 'Data Dictionary' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Book className="h-6 w-6" />
            Data Dictionary
          </h1>
          <p className="text-sm text-muted-foreground">
            Enterprise data governance catalog - field definitions, transformations, and quality rules
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Total Fields"
          value={stats.totalFields}
          icon={Database}
          variant="info"
        />
        <StatsCard
          title="Quality Rules"
          value={stats.totalRules}
          icon={Shield}
          variant="default"
        />
        <StatsCard
          title="Approved"
          value={stats.approvedFields}
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="Critical Rules"
          value={stats.rulesBySeverity.critical}
          icon={AlertCircle}
          variant="danger"
        />
        <StatsCard
          title="Warning Rules"
          value={stats.rulesBySeverity.warning}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatsCard
          title="Data Sources"
          value={Object.keys(stats.bySource).length}
          icon={Layers}
          variant="info"
        />
      </div>

      {/* Source System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Source Systems
          </CardTitle>
          <CardDescription>Data sources feeding the BI platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(DATA_SOURCES_METADATA).map(([key, source]) => {
              const fieldCount = getFieldsBySource(key as DataSource).length
              return (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    sourceFilter === key ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSourceFilter(sourceFilter === key ? 'all' : key)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <SourceBadge source={key as DataSource} />
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {source.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{fieldCount} fields</span>
                      <span className="text-muted-foreground">{source.refreshFrequency}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fields by name, definition, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Source System" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(DATA_SOURCES_METADATA).map(([key, source]) => (
                  <SelectItem key={key} value={key}>{source.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map(domain => (
                  <SelectItem key={domain} value={domain} className="capitalize">
                    {domain === 'all' ? 'All Domains' : domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Field Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Field Definitions</CardTitle>
              <CardDescription>
                {filteredFields.length} of {DATA_DICTIONARY.length} fields
                {(sourceFilter !== 'all' || domainFilter !== 'all' || searchQuery) && ' (filtered)'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[180px]">Field</TableHead>
                  <TableHead className="w-[100px]">Domain</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[120px]">Source</TableHead>
                  <TableHead>Definition</TableHead>
                  <TableHead className="w-[80px]">Rules</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFields.map(field => (
                  <TableRow
                    key={field.fieldId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openFieldDetail(field)}
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{field.displayName}</div>
                      <code className="text-xs text-muted-foreground">{field.fieldName}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{field.domain}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{field.dataType}</span>
                    </TableCell>
                    <TableCell>
                      <SourceBadge source={field.primarySource} />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground truncate">{field.definition}</p>
                    </TableCell>
                    <TableCell>
                      {field.dataQualityRules.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">{field.dataQualityRules.length}</span>
                          {field.dataQualityRules.some(r => r.severity === 'critical') && (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize ${
                          field.governanceStatus === 'approved'
                            ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                            : ''
                        }`}
                      >
                        {field.governanceStatus === 'approved' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : null}
                        {field.governanceStatus.replace('_', ' ')}
                      </Badge>
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
          </div>
        </CardContent>
      </Card>

      {/* Field Detail Modal */}
      <FieldDetailModal
        field={selectedField}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
