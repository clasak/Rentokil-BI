"use client"

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  GitBranch,
  Database,
  ArrowRight,
  Search,
  Info,
  FileSpreadsheet,
  Server,
  Cloud,
  FileText,
  Calculator,
  Users,
  Briefcase,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Table,
  Eye,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import {
  DATA_DICTIONARY,
  getFieldsBySource,
  searchFields,
  type FieldDefinition,
  type DataSource,
} from '@/lib/data-dictionary'

// Source system metadata
const SOURCE_SYSTEMS: Record<DataSource, { name: string; icon: typeof Database; color: string; description: string }> = {
  rtx_data_hub: {
    name: 'RTX Data Hub',
    icon: Server,
    color: 'bg-blue-500',
    description: 'Enterprise data warehouse - primary source of truth'
  },
  salesforce: {
    name: 'Salesforce',
    icon: Cloud,
    color: 'bg-sky-500',
    description: 'CRM system - opportunities, accounts, contacts'
  },
  pestpac: {
    name: 'PestPac',
    icon: Briefcase,
    color: 'bg-green-500',
    description: 'Field service management - routes, services, equipment'
  },
  start_packet_pdf: {
    name: 'Start Packet PDF',
    icon: FileText,
    color: 'bg-orange-500',
    description: 'Scanned field documents - contract details'
  },
  calculated: {
    name: 'Calculated',
    icon: Calculator,
    color: 'bg-purple-500',
    description: 'Derived metrics computed in the BI platform'
  },
  workday: {
    name: 'Workday',
    icon: Users,
    color: 'bg-pink-500',
    description: 'HR system - employee data, org hierarchy'
  },
  sap: {
    name: 'SAP',
    icon: FileSpreadsheet,
    color: 'bg-yellow-500',
    description: 'ERP system - financial data, GL'
  },
}

// Target destinations
const DESTINATIONS = [
  { id: 'bi_dashboard', name: 'BI Dashboards', icon: BarChart3 },
  { id: 'kpi_metrics', name: 'KPI Metrics', icon: Table },
  { id: 'reports', name: 'Executive Reports', icon: FileText },
]

export default function FieldLineagePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<DataSource | 'all'>('all')
  const [selectedDomain, setSelectedDomain] = useState<string>('all')
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
  const [selectedField, setSelectedField] = useState<FieldDefinition | null>(null)

  const allFields = DATA_DICTIONARY

  // Get unique domains
  const domains = useMemo(() => {
    const domainSet = new Set(allFields.map(f => f.domain))
    return Array.from(domainSet).sort()
  }, [allFields])

  // Filter fields
  const filteredFields = useMemo(() => {
    let fields = searchQuery ? searchFields(searchQuery) : allFields

    if (selectedSource !== 'all') {
      fields = fields.filter(f => f.primarySource === selectedSource)
    }

    if (selectedDomain !== 'all') {
      fields = fields.filter(f => f.domain === selectedDomain)
    }

    return fields
  }, [allFields, searchQuery, selectedSource, selectedDomain])

  // Group fields by domain for display
  const fieldsByDomain = useMemo(() => {
    const grouped: Record<string, FieldDefinition[]> = {}
    filteredFields.forEach(field => {
      if (!grouped[field.domain]) {
        grouped[field.domain] = []
      }
      grouped[field.domain].push(field)
    })
    return grouped
  }, [filteredFields])

  // Toggle field expansion
  const toggleField = (fieldId: string) => {
    const newExpanded = new Set(expandedFields)
    if (newExpanded.has(fieldId)) {
      newExpanded.delete(fieldId)
    } else {
      newExpanded.add(fieldId)
    }
    setExpandedFields(newExpanded)
  }

  // Get source icon color
  const getSourceColor = (source: DataSource) => {
    return SOURCE_SYSTEMS[source]?.color || 'bg-gray-500'
  }

  // Calculate lineage stats
  const stats = useMemo(() => {
    const totalFields = allFields.length
    const withMultipleSources = allFields.filter(f => f.secondarySources && f.secondarySources.length > 0).length
    const withTransformations = allFields.filter(f => f.transformations.length > 1).length
    const calculatedFields = allFields.filter(f => f.primarySource === 'calculated').length

    return { totalFields, withMultipleSources, withTransformations, calculatedFields }
  }, [allFields])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">Field Lineage</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Trace data flow from source systems to BI dashboards
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <GitBranch className="h-3 w-3" />
          {stats.totalFields} Fields Tracked
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{stats.totalFields}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Fields</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.withMultipleSources}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Multi-Source</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.withTransformations}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Transformed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.calculatedFields}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Calculated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Flow Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Data Flow Overview</CardTitle>
          <CardDescription>
            How data flows from source systems into the BI platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between overflow-x-auto pb-4">
            {/* Source Systems */}
            <div className="flex flex-col gap-2 min-w-[180px]">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">SOURCE SYSTEMS</p>
              {Object.entries(SOURCE_SYSTEMS).map(([key, system]) => {
                const count = getFieldsBySource(key as DataSource).length
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedSource(selectedSource === key ? 'all' : key as DataSource)}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors text-left ${
                      selectedSource === key
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`p-1.5 rounded ${system.color}`}>
                      <system.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium dark:text-gray-100 truncate">{system.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{count} fields</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Flow Arrows */}
            <div className="flex flex-col items-center gap-4 px-6">
              <div className="w-24 h-px bg-gradient-to-r from-gray-300 to-primary relative">
                <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              </div>
              <div className="text-center">
                <div className="px-3 py-1.5 bg-primary/10 rounded-full border border-primary/30">
                  <p className="text-xs font-medium text-primary">ETL / Transform</p>
                </div>
              </div>
              <div className="w-24 h-px bg-gradient-to-r from-primary to-gray-300 relative">
                <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* BI Platform */}
            <div className="flex flex-col items-center gap-2 px-6">
              <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/30">
                <Database className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-medium dark:text-gray-100">Rentokil BI</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unified Data Model</p>
            </div>

            {/* Flow Arrows */}
            <div className="flex flex-col items-center gap-4 px-6">
              <div className="w-24 h-px bg-gradient-to-r from-gray-300 to-green-500 relative">
                <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              </div>
              <div className="text-center">
                <div className="px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/30">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">Visualize</p>
                </div>
              </div>
              <div className="w-24 h-px bg-gradient-to-r from-green-500 to-gray-300 relative">
                <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Destinations */}
            <div className="flex flex-col gap-2 min-w-[160px]">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">DESTINATIONS</p>
              {DESTINATIONS.map(dest => (
                <div
                  key={dest.id}
                  className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="p-1.5 rounded bg-green-500">
                    <dest.icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xs font-medium dark:text-gray-100">{dest.name}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search fields by name, ID, or definition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedSource} onValueChange={(v) => setSelectedSource(v as DataSource | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(SOURCE_SYSTEMS).map(([key, system]) => (
                  <SelectItem key={key} value={key}>{system.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Domains</SelectItem>
                {domains.map(domain => (
                  <SelectItem key={domain} value={domain} className="capitalize">
                    {domain.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Field Lineage List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Field List */}
        <Card className="lg:max-h-[600px] overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Fields ({filteredFields.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {Object.entries(fieldsByDomain).map(([domain, fields]) => (
              <div key={domain} className="mb-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {domain.replace('_', ' ')} ({fields.length})
                </p>
                <div className="space-y-1">
                  {fields.map(field => (
                    <div key={field.fieldId}>
                      <button
                        onClick={() => {
                          toggleField(field.fieldId)
                          setSelectedField(field)
                        }}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${
                          selectedField?.fieldId === field.fieldId ? 'bg-primary/5 border border-primary/30' : ''
                        }`}
                      >
                        {expandedFields.has(field.fieldId) ? (
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                        <div className={`p-1 rounded ${getSourceColor(field.primarySource)}`}>
                          <span className="h-3 w-3 text-white flex items-center justify-center text-[8px] font-bold">
                            {field.primarySource.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium dark:text-gray-100 truncate">
                            {field.displayName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {field.fieldId} • {field.dataType}
                          </p>
                        </div>
                        {field.transformations.length > 1 && (
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {field.transformations.length} sources
                          </Badge>
                        )}
                      </button>

                      {/* Expanded View */}
                      {expandedFields.has(field.fieldId) && (
                        <div className="ml-8 mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                          <p className="text-gray-600 dark:text-gray-300 mb-2">{field.definition}</p>
                          <div className="flex flex-wrap gap-2">
                            {field.kpisUsing.slice(0, 3).map(kpi => (
                              <Badge key={kpi} variant="secondary" className="text-[10px]">
                                {kpi}
                              </Badge>
                            ))}
                            {field.kpisUsing.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{field.kpisUsing.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredFields.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No fields match your search criteria</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Field Detail */}
        <Card className="lg:max-h-[600px] overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Field Lineage Detail</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {selectedField ? (
              <div className="space-y-6">
                {/* Field Header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded ${getSourceColor(selectedField.primarySource)}`}>
                      <Database className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold dark:text-gray-100">{selectedField.displayName}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{selectedField.fieldId}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedField.definition}</p>
                </div>

                <Separator />

                {/* Lineage Visualization */}
                <div>
                  <p className="text-sm font-medium mb-3 dark:text-gray-100">Data Lineage</p>
                  <div className="space-y-3">
                    {selectedField.transformations.map((transform, idx) => {
                      const sourceSystem = SOURCE_SYSTEMS[transform.sourceSystem]
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`p-2 rounded ${sourceSystem?.color || 'bg-gray-500'}`}>
                              {sourceSystem?.icon && <sourceSystem.icon className="h-4 w-4 text-white" />}
                            </div>
                            {idx < selectedField.transformations.length - 1 && (
                              <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mt-2" />
                            )}
                          </div>
                          <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium dark:text-gray-100">
                                {sourceSystem?.name || transform.sourceSystem}
                              </p>
                              <Badge variant="outline" className="text-[10px]">
                                {transform.transformationType.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Source: <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                                {transform.sourceField}
                              </code>
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{transform.transformationLogic}</p>
                            {transform.exampleInput && (
                              <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border dark:border-gray-700 text-xs font-mono">
                                <span className="text-gray-500">Input:</span>{' '}
                                <span className="text-orange-600 dark:text-orange-400">{transform.exampleInput}</span>
                                <ArrowRight className="inline h-3 w-3 mx-2 text-gray-400" />
                                <span className="text-gray-500">Output:</span>{' '}
                                <span className="text-green-600 dark:text-green-400">{transform.exampleOutput}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Final Destination */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded bg-green-500">
                        <BarChart3 className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">Rentokil BI Platform</p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Used in {selectedField.kpisUsing.length} KPIs
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Governance */}
                <div>
                  <p className="text-sm font-medium mb-3 dark:text-gray-100">Governance</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Owner</p>
                      <p className="dark:text-gray-100">{selectedField.governanceOwner}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Steward</p>
                      <p className="dark:text-gray-100">{selectedField.steward}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                      <Badge variant={selectedField.governanceStatus === 'approved' ? 'default' : 'secondary'}>
                        {selectedField.governanceStatus === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {selectedField.governanceStatus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last Reviewed</p>
                      <p className="dark:text-gray-100">{selectedField.lastReviewedDate}</p>
                    </div>
                  </div>
                </div>

                {/* Quality Rules */}
                {selectedField.dataQualityRules.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-3 dark:text-gray-100">
                        Quality Rules ({selectedField.dataQualityRules.length})
                      </p>
                      <div className="space-y-2">
                        {selectedField.dataQualityRules.map(rule => (
                          <div
                            key={rule.ruleId}
                            className={`p-2 rounded-lg border ${
                              rule.severity === 'critical'
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                : rule.severity === 'warning'
                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  rule.severity === 'critical' ? 'text-red-700 dark:text-red-400' :
                                  rule.severity === 'warning' ? 'text-yellow-700 dark:text-yellow-400' :
                                  'text-blue-700 dark:text-blue-400'
                                }`}
                              >
                                {rule.severity}
                              </Badge>
                              <p className="text-xs font-medium dark:text-gray-100">{rule.ruleName}</p>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{rule.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Related Fields */}
                {selectedField.relatedFields.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2 dark:text-gray-100">Related Fields</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedField.relatedFields.map(fieldId => (
                          <Button
                            key={fieldId}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const field = allFields.find(f => f.fieldId === fieldId)
                              if (field) {
                                setSelectedField(field)
                                setExpandedFields(new Set([...expandedFields, fieldId]))
                              }
                            }}
                          >
                            {fieldId}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Eye className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">Select a field to view lineage</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Click on any field in the list to see its data flow and governance details
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm font-medium mb-3 dark:text-gray-100">Source System Legend</p>
          <div className="flex flex-wrap gap-4">
            {Object.entries(SOURCE_SYSTEMS).map(([key, system]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${system.color}`}>
                  <system.icon className="h-3 w-3 text-white" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">{system.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
