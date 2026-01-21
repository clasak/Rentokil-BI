'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Search,
  BarChart3,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Clock,
  Database,
  Calculator,
  ExternalLink,
  Filter
} from 'lucide-react'

// KPI Data
const KPI_DATA = [
  // Revenue KPIs
  {
    slug: 'revenue_mtd',
    name: 'Revenue MTD',
    category: 'Revenue',
    format: 'currency',
    higherIsBetter: true,
    definition: 'Total recognized revenue from all invoices in the current month to date.',
    formula: 'SUM(Invoice Amount) for current month where Status is Paid or Open',
    dataSource: 'Billing/ERP',
    refreshCadence: 'Every 4 hours',
    owner: 'Finance - Controller'
  },
  {
    slug: 'forecast_revenue_8w',
    name: 'Forecast Revenue (8 Weeks)',
    category: 'Revenue',
    format: 'currency',
    higherIsBetter: true,
    definition: 'Projected revenue for the next 8 weeks based on weighted pipeline, historical conversion rates, and seasonality adjustments.',
    formula: 'SUM(Pipeline Weighted Amount) + Baseline Recurring Revenue + Seasonality Adjustment',
    dataSource: 'CRM (Salesforce), Billing/ERP',
    refreshCadence: 'Weekly (Monday 6am)',
    owner: 'Finance - FP&A'
  },
  {
    slug: 'variance_to_target_mtd',
    name: 'Variance to Target MTD',
    category: 'Revenue',
    format: 'percent',
    higherIsBetter: true,
    definition: 'Percentage difference between actual revenue MTD and the monthly target.',
    formula: '(Actual Revenue MTD - Target Revenue MTD) / Target Revenue MTD x 100',
    dataSource: 'Billing/ERP, Budget System',
    refreshCadence: 'Every 4 hours',
    owner: 'Finance - Controller'
  },
  {
    slug: 'margin_proxy',
    name: 'Margin Proxy',
    category: 'Revenue',
    format: 'percent',
    higherIsBetter: true,
    definition: 'Estimated gross margin based on service mix and standard cost assumptions.',
    formula: '(Revenue - Estimated Direct Costs) / Revenue x 100',
    dataSource: 'Billing/ERP, Cost Model',
    refreshCadence: 'Daily',
    owner: 'Finance - Controller'
  },
  // Sales KPIs
  {
    slug: 'pipeline_30_60_90',
    name: 'Pipeline 30/60/90',
    category: 'Sales',
    format: 'currency',
    higherIsBetter: true,
    definition: 'Total opportunity value segmented by expected close date: 0-30 days, 31-60 days, 61-90 days.',
    formula: 'SUM(Opportunity Amount x Stage Probability) grouped by close date buckets',
    dataSource: 'CRM (Salesforce)',
    refreshCadence: 'Every 2 hours',
    owner: 'Sales Ops - Director'
  },
  {
    slug: 'win_rate',
    name: 'Win Rate',
    category: 'Sales',
    format: 'percent',
    higherIsBetter: true,
    definition: 'Percentage of opportunities that closed as won out of all opportunities that closed (won + lost) in the period.',
    formula: 'COUNT(Closed Won) / COUNT(Closed Won + Closed Lost) x 100',
    dataSource: 'CRM (Salesforce)',
    refreshCadence: 'Daily',
    owner: 'Sales Ops - Director'
  },
  {
    slug: 'avg_cycle_time_days',
    name: 'Avg Sales Cycle (Days)',
    category: 'Sales',
    format: 'days',
    higherIsBetter: false,
    definition: 'Average number of days from opportunity creation to close for won opportunities.',
    formula: 'AVG(Close Date - Created Date) for Closed Won opportunities',
    dataSource: 'CRM (Salesforce)',
    refreshCadence: 'Daily',
    owner: 'Sales Ops - Director'
  },
  {
    slug: 'stalled_opps',
    name: 'Stalled Opportunities',
    category: 'Sales',
    format: 'count',
    higherIsBetter: false,
    definition: 'Number of open opportunities with no activity in the last 14 days.',
    formula: 'COUNT(Open Opportunities) WHERE Last Activity Date < Today - 14 days',
    dataSource: 'CRM (Salesforce)',
    refreshCadence: 'Daily',
    owner: 'Sales Ops - Director'
  },
  {
    slug: 'crm_hygiene_score',
    name: 'CRM Hygiene Score',
    category: 'Sales',
    format: 'percent',
    higherIsBetter: true,
    definition: 'Quality score based on opportunity data completeness and freshness.',
    formula: 'Weighted average of: Required fields populated, Close dates valid, Stage probability aligned, Recent activity',
    dataSource: 'CRM (Salesforce)',
    refreshCadence: 'Daily',
    owner: 'Sales Ops - Director'
  },
  // Operations KPIs
  {
    slug: 'service_risk_index',
    name: 'Service Risk Index',
    category: 'Operations',
    format: 'score',
    higherIsBetter: true,
    definition: 'Composite score measuring service delivery reliability. Higher scores indicate lower risk.',
    formula: 'Weighted score: (On-time % x 0.4) + (Completion % x 0.3) + (Customer Satisfaction x 0.3)',
    dataSource: 'Service Management System',
    refreshCadence: 'Daily',
    owner: 'Ops - Regional Director'
  },
  {
    slug: 'callback_rate',
    name: 'Callback Rate',
    category: 'Operations',
    format: 'percent',
    higherIsBetter: false,
    definition: 'Percentage of service visits that required a callback within 7 days.',
    formula: 'COUNT(Callbacks within 7 days) / COUNT(Total Service Visits) x 100',
    dataSource: 'Service Management System',
    refreshCadence: 'Daily',
    owner: 'Ops - Regional Director'
  },
  {
    slug: 'missed_service_rate',
    name: 'Missed Service Rate',
    category: 'Operations',
    format: 'percent',
    higherIsBetter: false,
    definition: 'Percentage of scheduled services that were not completed as planned.',
    formula: 'COUNT(Missed Services) / COUNT(Scheduled Services) x 100',
    dataSource: 'Service Management System',
    refreshCadence: 'Daily',
    owner: 'Ops - Regional Director'
  },
  {
    slug: 'avg_response_time_hours',
    name: 'Avg Response Time (Hours)',
    category: 'Operations',
    format: 'hours',
    higherIsBetter: false,
    definition: 'Average time from customer service request to first technician visit.',
    formula: 'AVG(First Visit DateTime - Request DateTime)',
    dataSource: 'Service Management System',
    refreshCadence: 'Daily',
    owner: 'Ops - Regional Director'
  },
  {
    slug: 'capacity_utilization',
    name: 'Capacity Utilization',
    category: 'Operations',
    format: 'percent',
    higherIsBetter: true,
    definition: 'Percentage of available technician hours that are scheduled for service.',
    formula: 'Scheduled Hours / Available Hours x 100',
    dataSource: 'Workforce Management System',
    refreshCadence: 'Daily',
    owner: 'Ops - Workforce Manager'
  },
  // Finance KPIs
  {
    slug: 'ar_aging',
    name: 'AR Aging',
    category: 'Finance',
    format: 'currency',
    higherIsBetter: false,
    definition: 'Total accounts receivable grouped by aging buckets: Current, 30, 60, 90+ days.',
    formula: 'SUM(Outstanding Invoice Amount) grouped by Days Since Invoice Date',
    dataSource: 'Billing/ERP',
    refreshCadence: 'Daily',
    owner: 'Finance - AR Manager'
  },
  {
    slug: 'dso',
    name: 'Days Sales Outstanding',
    category: 'Finance',
    format: 'days',
    higherIsBetter: false,
    definition: 'Average number of days to collect payment after a sale is made.',
    formula: '(Accounts Receivable / Total Credit Sales) x Number of Days',
    dataSource: 'Billing/ERP',
    refreshCadence: 'Daily',
    owner: 'Finance - AR Manager'
  },
  // Lead Funnel KPIs
  {
    slug: 'mql_count',
    name: 'MQL Count',
    category: 'Lead Funnel',
    format: 'count',
    higherIsBetter: true,
    definition: 'Number of Marketing Qualified Leads received in the period.',
    formula: 'COUNT(Leads) WHERE Status = MQL AND Created Date in period',
    dataSource: 'CRM (Salesforce), Marketing Automation',
    refreshCadence: 'Every 2 hours',
    owner: 'Marketing Ops'
  },
  {
    slug: 'sql_count',
    name: 'SQL Count',
    category: 'Lead Funnel',
    format: 'count',
    higherIsBetter: true,
    definition: 'Number of Sales Qualified Leads (leads converted to opportunities).',
    formula: 'COUNT(Leads) WHERE Status = SQL AND Qualification Date in period',
    dataSource: 'CRM (Salesforce)',
    refreshCadence: 'Every 2 hours',
    owner: 'Sales Ops'
  },
  {
    slug: 'close_rate',
    name: 'Close Rate',
    category: 'Lead Funnel',
    format: 'percent',
    higherIsBetter: true,
    definition: 'Percentage of SQLs that convert to closed-won sales.',
    formula: 'COUNT(Closed Won) / COUNT(SQLs in same cohort) x 100',
    dataSource: 'CRM (Salesforce)',
    refreshCadence: 'Daily',
    owner: 'Sales Ops'
  },
  {
    slug: 'speed_to_lead',
    name: 'Speed to Lead',
    category: 'Lead Funnel',
    format: 'minutes',
    higherIsBetter: false,
    definition: 'Average time from lead creation to first sales contact.',
    formula: 'AVG(First Contact DateTime - Lead Created DateTime)',
    dataSource: 'CRM (Salesforce)',
    refreshCadence: 'Every 2 hours',
    owner: 'Sales Ops'
  },
  // People KPIs
  {
    slug: 'headcount',
    name: 'Headcount',
    category: 'People',
    format: 'count',
    higherIsBetter: true,
    definition: 'Total number of active employees by role and location.',
    formula: 'COUNT(Employees) WHERE Status = Active',
    dataSource: 'HR System',
    refreshCadence: 'Daily',
    owner: 'HR Operations'
  },
  {
    slug: 'retention_rate',
    name: 'Retention Rate',
    category: 'People',
    format: 'percent',
    higherIsBetter: true,
    definition: 'Percentage of employees retained over the measurement period.',
    formula: '(Employees at End - New Hires) / Employees at Start x 100',
    dataSource: 'HR System',
    refreshCadence: 'Monthly',
    owner: 'HR Operations'
  }
]

const CATEGORIES = ['All', 'Revenue', 'Sales', 'Operations', 'Finance', 'Lead Funnel', 'People']

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Revenue': return DollarSign
    case 'Sales': return TrendingUp
    case 'Operations': return Clock
    case 'Finance': return DollarSign
    case 'Lead Funnel': return Target
    case 'People': return Users
    default: return BarChart3
  }
}

const getFormatLabel = (format: string) => {
  switch (format) {
    case 'currency': return 'Currency ($)'
    case 'percent': return 'Percentage (%)'
    case 'count': return 'Count (#)'
    case 'days': return 'Days'
    case 'hours': return 'Hours'
    case 'minutes': return 'Minutes'
    case 'score': return 'Score (0-100)'
    default: return format
  }
}

export default function KPIGlossaryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [expandedKPI, setExpandedKPI] = useState<string | null>(null)

  const filteredKPIs = useMemo(() => {
    return KPI_DATA.filter(kpi => {
      const matchesSearch =
        kpi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kpi.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kpi.slug.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = selectedCategory === 'All' || kpi.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const groupedKPIs = useMemo(() => {
    const groups: Record<string, typeof KPI_DATA> = {}
    filteredKPIs.forEach(kpi => {
      if (!groups[kpi.category]) {
        groups[kpi.category] = []
      }
      groups[kpi.category].push(kpi)
    })
    return groups
  }, [filteredKPIs])

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/help" className="hover:text-primary flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Help Center
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 dark:text-gray-100">KPI Glossary</span>
      </div>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold dark:text-gray-100">KPI Glossary</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Complete reference of all KPI definitions, formulas, and data sources
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search KPIs by name, definition, or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Filter className="h-4 w-4 text-gray-500 mt-1.5" />
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredKPIs.length} of {KPI_DATA.length} KPIs
      </div>

      {/* KPI List by Category */}
      {Object.entries(groupedKPIs).map(([category, kpis]) => {
        const CategoryIcon = getCategoryIcon(category)
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <CategoryIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold dark:text-gray-100">{category}</h2>
              <Badge variant="secondary">{kpis.length}</Badge>
            </div>

            <div className="space-y-2">
              {kpis.map((kpi) => {
                const isExpanded = expandedKPI === kpi.slug
                return (
                  <Card
                    key={kpi.slug}
                    className={`transition-all ${isExpanded ? 'border-primary' : ''}`}
                  >
                    <CardHeader
                      className="cursor-pointer py-4"
                      onClick={() => setExpandedKPI(isExpanded ? null : kpi.slug)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded ${kpi.higherIsBetter ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                            {kpi.higherIsBetter ? (
                              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-base">{kpi.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {kpi.slug}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {getFormatLabel(kpi.format)}
                          </Badge>
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0 pb-4">
                        <Separator className="mb-4" />
                        <div className="space-y-4">
                          {/* Definition */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                              Definition
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {kpi.definition}
                            </p>
                          </div>

                          {/* Formula */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
                              <Calculator className="h-4 w-4" />
                              Formula
                            </h4>
                            <code className="block text-sm p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-800 dark:text-gray-200">
                              {kpi.formula}
                            </code>
                          </div>

                          {/* Metadata Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                <Database className="h-3 w-3" />
                                Data Source
                              </div>
                              <div className="text-sm font-medium dark:text-gray-100">
                                {kpi.dataSource}
                              </div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                <Clock className="h-3 w-3" />
                                Refresh
                              </div>
                              <div className="text-sm font-medium dark:text-gray-100">
                                {kpi.refreshCadence}
                              </div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                <Users className="h-3 w-3" />
                                Owner
                              </div>
                              <div className="text-sm font-medium dark:text-gray-100">
                                {kpi.owner}
                              </div>
                            </div>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Direction
                              </div>
                              <div className="text-sm font-medium dark:text-gray-100">
                                {kpi.higherIsBetter ? 'Higher is better' : 'Lower is better'}
                              </div>
                            </div>
                          </div>

                          {/* View Detail Link */}
                          <Link href={`/kpi/${kpi.slug}`}>
                            <Button variant="outline" size="sm" className="mt-2">
                              View KPI Detail
                              <ExternalLink className="h-3 w-3 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* No Results */}
      {filteredKPIs.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No KPIs found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {/* Additional Info */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Understanding KPI Status Indicators
              </h3>
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <p><span className="font-medium text-green-600 dark:text-green-400">Green</span> - On track or exceeding target</p>
                <p><span className="font-medium text-amber-600 dark:text-amber-400">Yellow</span> - Approaching threshold, needs attention</p>
                <p><span className="font-medium text-red-600 dark:text-red-400">Red</span> - Critical status, requires immediate action</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
