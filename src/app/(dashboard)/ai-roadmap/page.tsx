"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataSourceBadge } from '@/components/ui/data-source-badge'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table'
import {
  Brain, Database, TrendingUp, Target, AlertTriangle,
  RefreshCw, CheckCircle, Clock, Zap, BarChart3,
  Users, Shield, ArrowRight, Layers, FileText,
  ExternalLink
} from 'lucide-react'
import { useBigQueryData } from '@/hooks/useBigQueryData'
import type { AIRoadmapDataCounts } from '@/lib/bigquery/queries/ai-roadmap'

// =============================================================================
// Empty state (no mock fallback)
// =============================================================================

const EMPTY_DATA: AIRoadmapDataCounts = {
  tables: [],
  totalRows: 0,
  totalSizeGB: 0,
  datasetCount: 0,
  tableCount: 0,
}

// =============================================================================
// Roadmap initiative definitions
// =============================================================================

interface Initiative {
  id: string
  name: string
  description: string
  horizon: 1 | 2 | 3
  horizonLabel: string
  category: 'predictive' | 'optimization' | 'nlp' | 'detection'
  primaryTables: string[]
  businessImpact: string
  corporateAlignment: string
  readinessFactors: { label: string; score: number }[]
  elementId?: string
}

const INITIATIVES: Initiative[] = [
  // Horizon 1: Q1-Q2 2026 — Foundation + Quick Wins
  {
    id: 'lead-scoring',
    name: 'Predictive Lead Scoring',
    description: 'ML model to score incoming leads by conversion probability using historical lead-to-sale patterns across 7 source systems.',
    horizon: 1,
    horizonLabel: 'Q1-Q2 2026',
    category: 'predictive',
    primaryTables: ['BCG_RTD_DB.DR_Leads', 'S0_TMX.tmx_lead', 'S4.Fact_Leads_Acc_Daily_Dtls_Snp'],
    businessImpact: 'Increase lead conversion rate from ~12% to projected 18-22% by prioritizing high-value leads.',
    corporateAlignment: 'Revenue Growth — Optimize sales resource allocation by routing highest-probability leads first.',
    readinessFactors: [
      { label: 'Data Volume', score: 95 },
      { label: 'Feature Completeness', score: 80 },
      { label: 'Label Quality', score: 70 },
    ],
    elementId: 'ai-lead-scoring',
  },
  {
    id: 'churn-prediction',
    name: 'Customer Churn Prediction',
    description: 'Identify at-risk accounts before cancellation using contract, service history, and payment patterns.',
    horizon: 1,
    horizonLabel: 'Q1-Q2 2026',
    category: 'predictive',
    primaryTables: ['BCG_RTD_DB.DR_Cancels', 'BCG_RTD_DB.DR_PortfolioDaily', 'W3_Contract_Checker.T0_unf_Contract_All'],
    businessImpact: 'Reduce churn rate by 15-20% through proactive retention outreach on flagged accounts.',
    corporateAlignment: 'Customer Retention — Early warning system enables targeted intervention before contract expiry.',
    readinessFactors: [
      { label: 'Data Volume', score: 90 },
      { label: 'Feature Completeness', score: 85 },
      { label: 'Label Quality', score: 90 },
    ],
    elementId: 'ai-churn-prediction',
  },
  {
    id: 'anomaly-detection',
    name: 'Statistical Anomaly Detection',
    description: 'Z-score based anomaly detection on sales, cancellation, and operational metrics with automated alerting.',
    horizon: 1,
    horizonLabel: 'Q1-Q2 2026',
    category: 'detection',
    primaryTables: ['W3_Contract_Checker.T0_unf_Contract_All', 'BCG_RTD_DB.DR_ContractSales'],
    businessImpact: 'Detect revenue anomalies within hours vs. current weekly review cycle. POC already running.',
    corporateAlignment: 'Operational Excellence — Real-time quality gate for financial data integrity.',
    readinessFactors: [
      { label: 'Data Volume', score: 95 },
      { label: 'Feature Completeness', score: 90 },
      { label: 'Label Quality', score: 85 },
    ],
  },

  // Horizon 2: Q3-Q4 2026 — Advanced Analytics
  {
    id: 'revenue-forecasting',
    name: 'Revenue Forecasting (Time Series)',
    description: 'ARIMA/Prophet-based revenue forecasting using 3+ years of historical contract and GL data.',
    horizon: 2,
    horizonLabel: 'Q3-Q4 2026',
    category: 'predictive',
    primaryTables: ['W3_Contract_Checker.T0_unf_Contract_All', 'BCG_RTD_DB.DR_GLActivity'],
    businessImpact: '8-12 week rolling forecasts with 85%+ accuracy, replacing manual spreadsheet projections.',
    corporateAlignment: 'Financial Planning — Automated forecasting aligned with corporate FP&A cadence.',
    readinessFactors: [
      { label: 'Data Volume', score: 95 },
      { label: 'Feature Completeness', score: 75 },
      { label: 'Temporal Coverage', score: 80 },
    ],
  },
  {
    id: 'route-optimization',
    name: 'Technician Route Optimization',
    description: 'Optimize daily technician routes using service location data, appointment windows, and travel time predictions.',
    horizon: 2,
    horizonLabel: 'Q3-Q4 2026',
    category: 'optimization',
    primaryTables: ['BCG_RTD_DB.DR_WorkOrders', 'BCG_RTD_DB.DR_TechWorkOrders', 'S0_TMX.tmx_employee'],
    businessImpact: 'Reduce average drive time by 15-20%, increasing daily service capacity per technician.',
    corporateAlignment: 'Operational Efficiency — Maximizes technician productivity and reduces fuel costs.',
    readinessFactors: [
      { label: 'Data Volume', score: 85 },
      { label: 'Geo Data Quality', score: 60 },
      { label: 'Feature Completeness', score: 65 },
    ],
  },
  {
    id: 'call-center-nlp',
    name: 'Call Center NLP Analysis',
    description: 'Natural language processing on call transcripts and survey responses to extract sentiment and topic patterns.',
    horizon: 2,
    horizonLabel: 'Q3-Q4 2026',
    category: 'nlp',
    primaryTables: ['S0_TMX.Five9_CallLog_Export'],
    businessImpact: 'Automate call categorization, detect emerging service issues, and quantify customer sentiment trends.',
    corporateAlignment: 'Customer Experience — Data-driven insight into customer voice at scale.',
    readinessFactors: [
      { label: 'Data Volume', score: 95 },
      { label: 'Text Data Quality', score: 55 },
      { label: 'NLP Infrastructure', score: 30 },
    ],
  },

  // Horizon 3: 2027+ — Transformative AI
  {
    id: 'dynamic-pricing',
    name: 'Dynamic Pricing Engine',
    description: 'ML-driven pricing recommendations based on market conditions, competition, service complexity, and customer lifetime value.',
    horizon: 3,
    horizonLabel: '2027+',
    category: 'optimization',
    primaryTables: ['BCG_RTD_DB.DR_ContractSales', 'BCG_RTD_DB.MRLTVSummary', 'BCG_RTD_DB.DR_PortfolioMonthly'],
    businessImpact: 'Optimize contract pricing to maximize revenue while maintaining competitive win rates.',
    corporateAlignment: 'Revenue Optimization — Algorithmic pricing aligned with Rentokil margin targets.',
    readinessFactors: [
      { label: 'Data Volume', score: 90 },
      { label: 'Feature Completeness', score: 50 },
      { label: 'Model Complexity', score: 25 },
    ],
  },
  {
    id: 'workforce-planning',
    name: 'Predictive Workforce Planning',
    description: 'Forecast staffing needs by role, region, and season using attrition patterns, growth projections, and service demand.',
    horizon: 3,
    horizonLabel: '2027+',
    category: 'predictive',
    primaryTables: ['BCG_RTD_DB.DR_Terminations', 'BCG_RTD_DB.BCG_EmployeePayData_NT', 'S0_TMX.tmx_employee'],
    businessImpact: 'Reduce time-to-fill by 30% and decrease understaffing incidents through proactive hiring triggers.',
    corporateAlignment: 'People Strategy — Proactive workforce management tied to business growth models.',
    readinessFactors: [
      { label: 'Data Volume', score: 85 },
      { label: 'Feature Completeness', score: 55 },
      { label: 'HR Data Integration', score: 40 },
    ],
  },
  {
    id: 'ai-copilot',
    name: 'BI Copilot (Natural Language Queries)',
    description: 'LLM-powered interface for natural language questions against the data warehouse. "Show me churn rate by region for Q4."',
    horizon: 3,
    horizonLabel: '2027+',
    category: 'nlp',
    primaryTables: ['All datasets'],
    businessImpact: 'Democratize data access — any user can query without SQL knowledge or dashboard navigation.',
    corporateAlignment: 'Digital Transformation — Self-service analytics aligned with Rentokil&apos;s data democratization goals.',
    readinessFactors: [
      { label: 'Data Catalog Coverage', score: 70 },
      { label: 'Schema Documentation', score: 65 },
      { label: 'LLM Infrastructure', score: 20 },
    ],
  },
]

// =============================================================================
// Helper functions
// =============================================================================

function formatRowCount(count: number): string {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toLocaleString()
}

function getOverallReadiness(factors: { score: number }[]): number {
  if (factors.length === 0) return 0
  return Math.round(factors.reduce((sum, f) => sum + f.score, 0) / factors.length)
}

function getReadinessColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getReadinessBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30'
  if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/30'
  return 'bg-red-100 dark:bg-red-900/30'
}

function getReadinessLabel(score: number): string {
  if (score >= 80) return 'Ready'
  if (score >= 60) return 'In Progress'
  return 'Not Ready'
}

function getCategoryIcon(category: Initiative['category']) {
  switch (category) {
    case 'predictive': return TrendingUp
    case 'optimization': return Zap
    case 'nlp': return Brain
    case 'detection': return Shield
  }
}

function getCategoryColor(category: Initiative['category']): string {
  switch (category) {
    case 'predictive': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'optimization': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    case 'nlp': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'detection': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  }
}

function getHorizonColor(horizon: 1 | 2 | 3): string {
  switch (horizon) {
    case 1: return 'border-l-green-500'
    case 2: return 'border-l-blue-500'
    case 3: return 'border-l-purple-500'
  }
}

// =============================================================================
// Component
// =============================================================================

export default function AIRoadmapPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch live table row counts from BigQuery __TABLES__ metadata
  const {
    data,
    isLoading,
    dataSource,
    responseTime,
    queryTimestamp,
    error,
    refetch,
  } = useBigQueryData<AIRoadmapDataCounts, AIRoadmapDataCounts>({
    queryName: 'ai-roadmap-data-counts',
    defaultData: EMPTY_DATA,
    transformBigQueryData: (raw) => raw,
    includeOrgFilters: false, // Platform-wide view — intentionally shows all data
    includeRoleFilters: false, // No user filtering — strategic planning page
  })

  // Build a lookup map for quick table row count access
  const tableRowCounts = new Map<string, number>()
  data.tables.forEach(t => {
    tableRowCounts.set(`${t.dataset}.${t.table_id}`, t.row_count)
  })

  // Get row count for a table reference like "BCG_RTD_DB.DR_Leads"
  const getRowCount = (tableRef: string): number => {
    return tableRowCounts.get(tableRef) || 0
  }

  if (!mounted) return null

  if (error) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[
          { label: 'Governance', href: '/governance' },
          { label: 'AI Roadmap' },
        ]} />
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">Failed to Load Data</span>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2.5 rounded font-mono leading-relaxed">
              {error}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Data Source:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">{dataSource}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Query:</span>
                <p className="font-medium text-red-800 dark:text-red-200 mt-0.5">ai-roadmap-data-counts</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200 dark:border-red-800">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open('/platform-admin', '_blank')}>
                <FileText className="h-3 w-3 mr-1.5" />
                View Logs
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Governance', href: '/governance' },
        { label: 'AI & Data Science Roadmap' },
      ]} />

      {/* Page Header */}
      <div id="ai-roadmap-header" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            AI & Data Science Roadmap
          </h1>
          <p className="text-muted-foreground mt-1">
            Strategic ML/AI initiatives mapped to production BigQuery data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataSourceBadge status={dataSource} responseTime={responseTime} timestamp={queryTimestamp} />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Data Foundation Banner */}
      <Card id="ai-roadmap-data-banner" className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-primary" />
            Data Foundation
          </CardTitle>
          <CardDescription>
            Live row counts from bidata-sharedus-production — the data powering these AI initiatives
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="text-2xl font-bold text-primary">{formatRowCount(data.totalRows)}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Rows</div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="text-2xl font-bold text-primary">{data.totalSizeGB} GB</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Size</div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="text-2xl font-bold text-primary">{data.datasetCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Datasets</div>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="text-2xl font-bold text-primary">{data.tableCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Key Tables</div>
                </div>
              </div>

              {/* Table row counts grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.tables.map(t => (
                  <div key={`${t.dataset}.${t.table_id}`} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border text-sm">
                    <Database className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate" title={`${t.dataset}.${t.table_id}`}>
                        {t.table_id}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatRowCount(t.row_count)} rows</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Three Horizons */}
      {[1, 2, 3].map(horizon => {
        const horizonInitiatives = INITIATIVES.filter(i => i.horizon === horizon)
        const horizonLabels: Record<number, { title: string; subtitle: string; color: string }> = {
          1: { title: 'Horizon 1: Foundation + Quick Wins', subtitle: 'Q1-Q2 2026 — High data readiness, proven patterns', color: 'text-green-600 dark:text-green-400' },
          2: { title: 'Horizon 2: Advanced Analytics', subtitle: 'Q3-Q4 2026 — Requires additional data prep or infrastructure', color: 'text-blue-600 dark:text-blue-400' },
          3: { title: 'Horizon 3: Transformative AI', subtitle: '2027+ — Strategic investments, new capabilities required', color: 'text-purple-600 dark:text-purple-400' },
        }
        const label = horizonLabels[horizon]

        return (
          <div key={horizon} id={`ai-horizon-${horizon}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`text-lg font-bold ${label.color}`}>{label.title}</div>
              <Badge variant="outline" className="text-xs">{horizonInitiatives.length} initiatives</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{label.subtitle}</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              {horizonInitiatives.map(initiative => {
                const CategoryIcon = getCategoryIcon(initiative.category)
                const overallReadiness = getOverallReadiness(initiative.readinessFactors)

                return (
                  <Card
                    key={initiative.id}
                    id={initiative.elementId}
                    className={`border-l-4 ${getHorizonColor(initiative.horizon as 1 | 2 | 3)}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-tight">{initiative.name}</CardTitle>
                        <Badge className={`text-xs flex-shrink-0 ${getCategoryColor(initiative.category)}`}>
                          <CategoryIcon className="h-3 w-3 mr-1" />
                          {initiative.category}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        {initiative.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Primary data tables with live row counts */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          Data Sources
                        </div>
                        <div className="space-y-1">
                          {initiative.primaryTables.map(table => {
                            const rowCount = getRowCount(table)
                            return (
                              <div key={table} className="flex items-center justify-between text-xs">
                                <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded truncate max-w-[65%]" title={table}>
                                  {table}
                                </code>
                                {table !== 'All datasets' && (
                                  <span className={rowCount > 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}>
                                    {rowCount > 0 ? formatRowCount(rowCount) : 'N/A'}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Business impact */}
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Business Impact
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{initiative.businessImpact}</p>
                      </div>

                      {/* Readiness score */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">Data Readiness</span>
                          <span className={`text-sm font-bold ${getReadinessColor(overallReadiness)}`}>
                            {overallReadiness}%
                          </span>
                        </div>
                        <Progress value={overallReadiness} className="h-2" />
                        <div className="mt-2 space-y-1">
                          {initiative.readinessFactors.map(factor => (
                            <div key={factor.label} className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">{factor.label}</span>
                              <span className={getReadinessColor(factor.score)}>{factor.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Readiness Summary Table */}
      <Card id="ai-readiness-summary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Readiness Summary
          </CardTitle>
          <CardDescription>
            Data readiness assessment across all 9 AI/ML initiatives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Initiative</TableHead>
                  <TableHead className="w-[100px]">Horizon</TableHead>
                  <TableHead className="w-[100px]">Category</TableHead>
                  <TableHead className="w-[100px]">Readiness</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead>Primary Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {INITIATIVES.map(initiative => {
                  const overallReadiness = getOverallReadiness(initiative.readinessFactors)
                  const firstTable = initiative.primaryTables[0]
                  const rowCount = getRowCount(firstTable)

                  return (
                    <TableRow key={initiative.id}>
                      <TableCell className="font-medium">{initiative.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {initiative.horizonLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${getCategoryColor(initiative.category)}`}>
                          {initiative.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={overallReadiness} className="h-2 w-16" />
                          <span className={`text-sm font-medium ${getReadinessColor(overallReadiness)}`}>
                            {overallReadiness}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${getReadinessBgColor(overallReadiness)} ${getReadinessColor(overallReadiness)} border-0`}>
                          {overallReadiness >= 80 && <CheckCircle className="h-3 w-3 mr-1" />}
                          {overallReadiness >= 60 && overallReadiness < 80 && <Clock className="h-3 w-3 mr-1" />}
                          {overallReadiness < 60 && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {getReadinessLabel(overallReadiness)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">
                          {firstTable}
                        </code>
                        {firstTable !== 'All datasets' && rowCount > 0 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({formatRowCount(rowCount)})
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Corporate Alignment */}
      <Card id="ai-corporate-alignment">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Corporate Strategic Alignment
          </CardTitle>
          <CardDescription>
            How each initiative maps to Rentokil corporate objectives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {INITIATIVES.map(initiative => (
              <div key={initiative.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{initiative.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{initiative.corporateAlignment}</div>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0 ml-auto">
                  {initiative.horizonLabel}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
