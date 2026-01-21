"use client"

import { useState, useMemo } from 'react'
import {
  LEAD_INTAKE_STANDARDS,
  getLeadIntakeStats,
  START_PACKET_REQUIREMENTS,
  getStartPacketStats,
  getAllSections,
  getSectionDisplayName,
  getRequirementsBySection,
  AT_RISK_DEFINITIONS,
  getAtRiskStats,
  getAllAtRiskCategories,
  getAtRiskCategoryDisplayName,
  LEAD_SOURCE_CLASSIFICATIONS,
  getLeadSourceStats,
  getAllChannels,
  getChannelDisplayName,
  getAllDataStandardsStats,
  type LeadIntakeStandard,
  type StartPacketRequirement,
  type StartPacketSection,
  type AtRiskDefinition,
  type AtRiskCategory,
  type LeadSourceClassification,
  type LeadChannel
} from '@/lib/data-standards'
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  ClipboardList, FileText, AlertTriangle, Target,
  Search, Download, CheckCircle, XCircle, Info,
  ArrowRight, ChevronRight, Shield, Users, Clock,
  Zap, AlertCircle, Database, Workflow, Phone,
  Mail, MapPin, Building, DollarSign, Calendar,
  TrendingUp, TrendingDown, Package
} from 'lucide-react'

// =============================================================================
// STATS CARD COMPONENT
// =============================================================================
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

// =============================================================================
// LEAD INTAKE TAB COMPONENT
// =============================================================================
function LeadIntakeTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedField, setSelectedField] = useState<LeadIntakeStandard | null>(null)

  const stats = getLeadIntakeStats()

  const filteredFields = useMemo(() => {
    let fields = LEAD_INTAKE_STANDARDS

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      fields = fields.filter(f =>
        f.displayName.toLowerCase().includes(query) ||
        f.fieldName.toLowerCase().includes(query) ||
        f.whyNeeded.toLowerCase().includes(query)
      )
    }

    if (categoryFilter !== 'all') {
      fields = fields.filter(f => f.category === categoryFilter)
    }

    return fields
  }, [searchQuery, categoryFilter])

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      contact: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      property: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      service_needs: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      qualification: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      source_tracking: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      scheduling: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
    }
    return colors[category] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total Fields" value={stats.total} icon={Database} variant="info" />
        <StatsCard title="Required" value={stats.required} icon={CheckCircle} variant="danger" />
        <StatsCard title="Optional" value={stats.optional} icon={Info} variant="default" />
        <StatsCard title="Categories" value={Object.keys(stats.byCategory).length} icon={Package} variant="success" />
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search lead intake fields..."
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
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="contact">Contact Info</SelectItem>
                <SelectItem value="property">Property</SelectItem>
                <SelectItem value="service_needs">Service Needs</SelectItem>
                <SelectItem value="qualification">Qualification</SelectItem>
                <SelectItem value="source_tracking">Source Tracking</SelectItem>
                <SelectItem value="scheduling">Scheduling</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fields Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Intake Data Standards</CardTitle>
          <CardDescription>
            Required and optional fields for lead collection across all channels.
            {filteredFields.length} of {LEAD_INTAKE_STANDARDS.length} fields shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[200px]">Field</TableHead>
                  <TableHead className="w-[100px]">Required</TableHead>
                  <TableHead className="w-[120px]">Category</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Why Needed</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFields.map(field => (
                  <TableRow
                    key={field.fieldId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedField(field)}
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{field.displayName}</div>
                      <code className="text-xs text-muted-foreground">{field.fieldName}</code>
                    </TableCell>
                    <TableCell>
                      {field.required ? (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Optional</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadge(field.category)}`}>
                        {field.category.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{field.dataType}</span>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground line-clamp-2">{field.whyNeeded}</p>
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

      {/* Field Detail Dialog */}
      <Dialog open={!!selectedField} onOpenChange={() => setSelectedField(null)}>
        <DialogContent className="max-w-2xl">
          {selectedField && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedField.displayName}</DialogTitle>
                <DialogDescription>
                  <code>{selectedField.fieldName}</code> - {selectedField.required ? 'Required' : 'Optional'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Why This Field Is Needed</h4>
                  <p className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                    {selectedField.whyNeeded}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Data Type</h4>
                    <Badge variant="outline" className="capitalize">{selectedField.dataType}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Collection Sources</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedField.collectionSource.map(source => (
                        <Badge key={source} variant="secondary" className="text-xs">{source}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedField.validValues && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Valid Values</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedField.validValues.map(value => (
                        <Badge key={value} variant="outline" className="text-xs">{value}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-2">Downstream Systems</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedField.downstreamSystems.map(system => (
                      <Badge key={system} variant="secondary" className="text-xs">{system}</Badge>
                    ))}
                  </div>
                </div>

                {selectedField.exampleValue && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Example Value</h4>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{selectedField.exampleValue}</code>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-2">Validation Rules</h4>
                  <div className="space-y-2">
                    {selectedField.validationRules.map((rule, i) => (
                      <div key={i} className="text-sm p-2 bg-muted rounded">
                        <span className="font-medium">{rule.type}:</span> {rule.errorMessage}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// START PACKET TAB COMPONENT
// =============================================================================
function StartPacketTab() {
  const [selectedSection, setSelectedSection] = useState<string>('all')
  const [selectedRequirement, setSelectedRequirement] = useState<StartPacketRequirement | null>(null)

  const stats = getStartPacketStats()
  const sections = getAllSections()

  const filteredRequirements = useMemo(() => {
    if (selectedSection === 'all') {
      return START_PACKET_REQUIREMENTS
    }
    return getRequirementsBySection(selectedSection as StartPacketSection)
  }, [selectedSection])

  const getSectionIcon = (section: StartPacketSection) => {
    const icons: Record<StartPacketSection, React.ElementType> = {
      customer_information: Users,
      service_address: MapPin,
      billing_information: DollarSign,
      service_agreement: FileText,
      equipment_details: Package,
      pricing: DollarSign,
      special_instructions: Info,
      signatures: CheckCircle
    }
    return icons[section] || FileText
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard title="Total Fields" value={stats.total} icon={Database} variant="info" />
        <StatsCard title="Required" value={stats.required} icon={CheckCircle} variant="danger" />
        <StatsCard title="Optional" value={stats.optional} icon={Info} variant="default" />
        <StatsCard title="Sales Fills" value={stats.salesFields} icon={TrendingUp} variant="success" />
        <StatsCard title="Ops Reviews" value={stats.opsFields} icon={Workflow} variant="warning" />
      </div>

      {/* Section Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Start Packet Sections</CardTitle>
          <CardDescription>Click a section to filter requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sections.map(section => {
              const Icon = getSectionIcon(section)
              const sectionStats = stats.bySection[section]
              const isSelected = selectedSection === section

              return (
                <Card
                  key={section}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedSection(isSelected ? 'all' : section)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{getSectionDisplayName(section)}</div>
                        <div className="text-xs text-muted-foreground">
                          {sectionStats.required} required / {sectionStats.total} total
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Requirements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Start Packet Requirements</CardTitle>
          <CardDescription>
            Fields required for complete handoff from Sales to Operations.
            {selectedSection !== 'all' && ` Showing ${getSectionDisplayName(selectedSection as StartPacketSection)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[200px]">Field</TableHead>
                  <TableHead className="w-[120px]">Section</TableHead>
                  <TableHead className="w-[80px]">Required</TableHead>
                  <TableHead className="w-[80px]">Sales</TableHead>
                  <TableHead className="w-[80px]">Ops</TableHead>
                  <TableHead>Business Justification</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequirements.map(req => (
                  <TableRow
                    key={req.fieldId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedRequirement(req)}
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{req.displayName}</div>
                      <code className="text-xs text-muted-foreground">{req.fieldName}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {req.section.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {req.required ? (
                        <CheckCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {req.salesResponsibility ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {req.opsResponsibility ? (
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground line-clamp-2">{req.businessJustification}</p>
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

      {/* Requirement Detail Dialog */}
      <Dialog open={!!selectedRequirement} onOpenChange={() => setSelectedRequirement(null)}>
        <DialogContent className="max-w-2xl">
          {selectedRequirement && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRequirement.displayName}</DialogTitle>
                <DialogDescription>
                  {getSectionDisplayName(selectedRequirement.section)} - {selectedRequirement.required ? 'Required' : 'Optional'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Business Justification</h4>
                  <p className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                    {selectedRequirement.businessJustification}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Responsibility</h4>
                    <div className="space-y-1">
                      {selectedRequirement.salesResponsibility && (
                        <Badge variant="outline" className="mr-2">Sales Fills</Badge>
                      )}
                      {selectedRequirement.opsResponsibility && (
                        <Badge variant="outline">Ops Reviews</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Data Type</h4>
                    <Badge variant="outline" className="capitalize">{selectedRequirement.dataType}</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Downstream Systems</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedRequirement.downstreamSystems.map(system => (
                      <Badge key={system} variant="secondary" className="text-xs">{system}</Badge>
                    ))}
                  </div>
                </div>

                {selectedRequirement.extractionHints && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Common Labels in PDFs</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedRequirement.extractionHints.map(hint => (
                        <Badge key={hint} variant="outline" className="text-xs">{hint}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-2">Example Value</h4>
                  <code className="text-sm bg-muted px-2 py-1 rounded">{selectedRequirement.exampleValue}</code>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// AT-RISK DEFINITIONS TAB COMPONENT
// =============================================================================
function AtRiskTab() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedRisk, setSelectedRisk] = useState<AtRiskDefinition | null>(null)

  const stats = getAtRiskStats()
  const categories = getAllAtRiskCategories()

  const filteredRisks = useMemo(() => {
    if (categoryFilter === 'all') {
      return AT_RISK_DEFINITIONS
    }
    return AT_RISK_DEFINITIONS.filter(r => r.category === categoryFilter)
  }, [categoryFilter])

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
    return styles[severity] || styles.medium
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard title="Total Definitions" value={stats.total} icon={AlertTriangle} variant="info" />
        <StatsCard title="Critical" value={stats.bySeverity.critical || 0} icon={AlertCircle} variant="danger" />
        <StatsCard title="High" value={stats.bySeverity.high || 0} icon={AlertTriangle} variant="warning" />
        <StatsCard title="Medium" value={stats.bySeverity.medium || 0} icon={Info} variant="default" />
        <StatsCard title="Automated Alerts" value={stats.automatedCount} icon={Zap} variant="success" />
      </div>

      {/* Category Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('all')}
            >
              All Categories
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={categoryFilter === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(category)}
              >
                {getAtRiskCategoryDisplayName(category)}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {stats.byCategory[category] || 0}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Definitions as Accordion */}
      <Card>
        <CardHeader>
          <CardTitle>At-Risk Trigger Definitions</CardTitle>
          <CardDescription>
            Clear definitions of what triggers at-risk status and required actions.
            {categoryFilter !== 'all' && ` Showing ${getAtRiskCategoryDisplayName(categoryFilter as AtRiskCategory)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {filteredRisks.map(risk => (
              <AccordionItem key={risk.riskId} value={risk.riskId}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-4 text-left">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityBadge(risk.severity)}`}>
                      {risk.severity}
                    </span>
                    <div>
                      <div className="font-medium">{risk.triggerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {risk.condition} {risk.threshold}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{risk.description}</p>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                      <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Business Impact</h4>
                      <p className="text-sm text-red-600 dark:text-red-300">{risk.businessImpact}</p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                      <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">Recommended Action</h4>
                      <p className="text-sm text-green-600 dark:text-green-300">{risk.recommendedAction}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Owner</div>
                        <Badge variant="outline">{risk.owner}</Badge>
                      </div>
                      {risk.escalateTo && (
                        <div>
                          <div className="text-xs text-muted-foreground">Escalate To</div>
                          <Badge variant="outline">{risk.escalateTo}</Badge>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-muted-foreground">Alert</div>
                        <Badge variant={risk.automatedAlert ? 'default' : 'outline'}>
                          {risk.automatedAlert ? `Auto - ${risk.alertFrequency}` : 'Manual'}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Category</div>
                        <Badge variant="outline">{getAtRiskCategoryDisplayName(risk.category)}</Badge>
                      </div>
                    </div>

                    {risk.escalationTrigger && (
                      <div>
                        <div className="text-xs text-muted-foreground">Escalation Trigger</div>
                        <p className="text-sm">{risk.escalationTrigger}</p>
                      </div>
                    )}

                    <div>
                      <div className="text-xs text-muted-foreground mb-2">KPIs Affected</div>
                      <div className="flex flex-wrap gap-1">
                        {risk.kpisAffected.map(kpi => (
                          <Badge key={kpi} variant="secondary" className="text-xs font-mono">{kpi}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// LEAD SOURCE CLASSIFICATIONS TAB COMPONENT
// =============================================================================
function LeadSourceTab() {
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<LeadSourceClassification | null>(null)

  const stats = getLeadSourceStats()
  const channels = getAllChannels()

  const filteredSources = useMemo(() => {
    if (channelFilter === 'all') {
      return LEAD_SOURCE_CLASSIFICATIONS
    }
    return LEAD_SOURCE_CLASSIFICATIONS.filter(s => s.channel === channelFilter)
  }, [channelFilter])

  const getChannelBadge = (channel: LeadChannel) => {
    const colors: Record<LeadChannel, string> = {
      inbound: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      outbound: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      partner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      marketing: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
    }
    return colors[channel]
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Source Types" value={stats.total} icon={Target} variant="info" />
        <StatsCard title="Inbound" value={stats.byChannel.inbound || 0} icon={Phone} variant="success" />
        <StatsCard title="Outbound" value={stats.byChannel.outbound || 0} icon={Users} variant="info" />
        <StatsCard title="Marketing" value={stats.byChannel.marketing || 0} icon={TrendingUp} variant="warning" />
      </div>

      {/* Channel Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={channelFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChannelFilter('all')}
            >
              All Channels
            </Button>
            {channels.map(channel => (
              <Button
                key={channel}
                variant={channelFilter === channel ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChannelFilter(channel)}
              >
                {getChannelDisplayName(channel)}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {stats.byChannel[channel] || 0}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Source Classifications Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSources.map(source => (
          <Card
            key={source.sourceId}
            className="cursor-pointer hover:shadow-md transition-all"
            onClick={() => setSelectedSource(source)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{source.sourceName}</CardTitle>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getChannelBadge(source.channel)}`}>
                  {getChannelDisplayName(source.channel)}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{source.definition}</p>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {Math.round(source.typicalConversionRate.mid * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Conv. Rate</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    ${source.costPerLead.mid}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg CPL</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">
                    ${source.averageValueRange.min.toLocaleString()}-{source.averageValueRange.max.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Value Range</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Source Detail Dialog */}
      <Dialog open={!!selectedSource} onOpenChange={() => setSelectedSource(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedSource && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-xl">{selectedSource.sourceName}</DialogTitle>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getChannelBadge(selectedSource.channel)}`}>
                    {getChannelDisplayName(selectedSource.channel)}
                  </span>
                </div>
                <DialogDescription>{selectedSource.definition}</DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-6 mt-4">
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(selectedSource.typicalConversionRate.low * 100)}-{Math.round(selectedSource.typicalConversionRate.high * 100)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Conversion Rate Range</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          ${selectedSource.costPerLead.low}-${selectedSource.costPerLead.high}
                        </div>
                        <div className="text-xs text-muted-foreground">Cost Per Lead Range</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          ${selectedSource.averageValueRange.min.toLocaleString()}-${selectedSource.averageValueRange.max.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Average Deal Value</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Examples */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Examples</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {selectedSource.examples.map((example, i) => (
                        <li key={i}>{example}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Qualification Criteria */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Qualification Criteria</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {selectedSource.qualificationCriteria.map((criteria, i) => (
                        <li key={i}>{criteria}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Attribution Rules */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Attribution Rules</h4>
                    <p className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                      {selectedSource.attributionRules}
                    </p>
                  </div>

                  {/* Sales Process */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Sales Process</h4>
                    <p className="text-sm text-muted-foreground">{selectedSource.salesProcess}</p>
                  </div>

                  {/* Required Fields */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Required Fields</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedSource.requiredFields.map(field => (
                        <Badge key={field} variant="outline" className="text-xs font-mono">{field}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Best Practices */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-green-600">Best Practices</h4>
                    <ul className="space-y-1">
                      {selectedSource.bestPractices.map((practice, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {practice}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Common Mistakes */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-red-600">Common Mistakes</h4>
                    <ul className="space-y-1">
                      {selectedSource.commonMistakes.map((mistake, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                          {mistake}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================
export default function DataStandardsPage() {
  const stats = getAllDataStandardsStats()

  const exportAllStandards = () => {
    const data = {
      exportDate: new Date().toISOString(),
      summary: stats.summary,
      leadIntakeStandards: LEAD_INTAKE_STANDARDS,
      startPacketRequirements: START_PACKET_REQUIREMENTS,
      atRiskDefinitions: AT_RISK_DEFINITIONS,
      leadSourceClassifications: LEAD_SOURCE_CLASSIFICATIONS
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rentokil_data_standards.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Command Center', href: '/' },
        { label: 'Governance', href: '/governance' },
        { label: 'Data Standards' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Data Standards
          </h1>
          <p className="text-sm text-muted-foreground">
            Enterprise data collection standards - the framework for what data must be sent and received at what level of detail
          </p>
        </div>
        <Button onClick={exportAllStandards} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export All Standards
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatsCard title="Total Standards" value={stats.totalStandards} icon={Database} variant="info" />
        <StatsCard title="Lead Fields" value={stats.summary.leadIntakeFields} icon={Users} variant="default" />
        <StatsCard title="Lead Required" value={stats.summary.leadIntakeRequired} icon={CheckCircle} variant="danger" />
        <StatsCard title="Packet Fields" value={stats.summary.startPacketFields} icon={FileText} variant="default" />
        <StatsCard title="Packet Required" value={stats.summary.startPacketRequired} icon={CheckCircle} variant="warning" />
        <StatsCard title="Risk Triggers" value={stats.summary.atRiskDefinitions} icon={AlertTriangle} variant="danger" />
        <StatsCard title="Lead Sources" value={stats.summary.leadSourceTypes} icon={Target} variant="success" />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="lead-intake" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="lead-intake" className="gap-2">
            <Users className="h-4 w-4" />
            Lead Intake
          </TabsTrigger>
          <TabsTrigger value="start-packet" className="gap-2">
            <FileText className="h-4 w-4" />
            Start Packet
          </TabsTrigger>
          <TabsTrigger value="at-risk" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            At-Risk Definitions
          </TabsTrigger>
          <TabsTrigger value="lead-sources" className="gap-2">
            <Target className="h-4 w-4" />
            Lead Sources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lead-intake">
          <LeadIntakeTab />
        </TabsContent>

        <TabsContent value="start-packet">
          <StartPacketTab />
        </TabsContent>

        <TabsContent value="at-risk">
          <AtRiskTab />
        </TabsContent>

        <TabsContent value="lead-sources">
          <LeadSourceTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
