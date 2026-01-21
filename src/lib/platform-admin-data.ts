/**
 * Mock data for Platform Admin Console
 * This file provides realistic mock data that can later be replaced with real API calls
 */

// Platform Health Metrics
export interface PlatformHealthMetrics {
  pipelineUptime: number
  etlJobsSuccess: number
  etlJobsTotal: number
  avgQueryTime: number
  apiLatency: number
  dataDowntimeMinutes: number
  failedJobsCount: number
}

export function getPlatformHealthMetrics(): PlatformHealthMetrics {
  return {
    pipelineUptime: 99.7,
    etlJobsSuccess: 847,
    etlJobsTotal: 850,
    avgQueryTime: 1.2,
    apiLatency: 230,
    dataDowntimeMinutes: 12,
    failedJobsCount: 3,
  }
}

// Data Freshness SLA
export type SLAStatus = 'met' | 'breached'
export type TrendDirection = 'up' | 'down' | 'stable'

export interface DataFreshnessSLA {
  id: string
  sourceName: string
  slaTarget: string
  slaMinutes: number
  actualFreshnessMinutes: number
  actualFreshness: string
  status: SLAStatus
  trend: TrendDirection
  lastChecked: Date
}

export function getDataFreshnessSLAs(): DataFreshnessSLA[] {
  const now = new Date()
  return [
    {
      id: 'sf-1',
      sourceName: 'Salesforce',
      slaTarget: '15 min',
      slaMinutes: 15,
      actualFreshnessMinutes: 8,
      actualFreshness: '8 min ago',
      status: 'met',
      trend: 'stable',
      lastChecked: new Date(now.getTime() - 8 * 60 * 1000),
    },
    {
      id: 'erp-1',
      sourceName: 'Billing/ERP',
      slaTarget: '4 hours',
      slaMinutes: 240,
      actualFreshnessMinutes: 127,
      actualFreshness: '2h 7m ago',
      status: 'met',
      trend: 'up',
      lastChecked: new Date(now.getTime() - 127 * 60 * 1000),
    },
    {
      id: 'pp-1',
      sourceName: 'PestPac',
      slaTarget: '15 min',
      slaMinutes: 15,
      actualFreshnessMinutes: 23,
      actualFreshness: '23 min ago',
      status: 'breached',
      trend: 'down',
      lastChecked: new Date(now.getTime() - 23 * 60 * 1000),
    },
    {
      id: 'wd-1',
      sourceName: 'Workday',
      slaTarget: 'Daily',
      slaMinutes: 1440,
      actualFreshnessMinutes: 420,
      actualFreshness: '7h ago',
      status: 'met',
      trend: 'stable',
      lastChecked: new Date(now.getTime() - 420 * 60 * 1000),
    },
    {
      id: 'rtx-1',
      sourceName: 'RTX Hub',
      slaTarget: '1 hour',
      slaMinutes: 60,
      actualFreshnessMinutes: 42,
      actualFreshness: '42 min ago',
      status: 'met',
      trend: 'up',
      lastChecked: new Date(now.getTime() - 42 * 60 * 1000),
    },
  ]
}

// User Adoption Metrics
export interface DashboardViewStats {
  name: string
  views: number
  uniqueUsers: number
}

export interface FeatureUsageStats {
  feature: string
  usageCount: number
  usagePercent: number
}

export interface UserAdoptionMetrics {
  activeUsers: number
  totalUsers: number
  newUsersThisWeek: number
  mostViewedDashboards: DashboardViewStats[]
  leastViewedDashboards: DashboardViewStats[]
  featureUsage: FeatureUsageStats[]
}

export function getUserAdoptionMetrics(): UserAdoptionMetrics {
  return {
    activeUsers: 147,
    totalUsers: 200,
    newUsersThisWeek: 12,
    mostViewedDashboards: [
      { name: 'Command Center', views: 2847, uniqueUsers: 142 },
      { name: 'Sales Dashboard', views: 1923, uniqueUsers: 98 },
      { name: 'Operations', views: 1456, uniqueUsers: 87 },
      { name: 'Finance', views: 1102, uniqueUsers: 65 },
      { name: 'Forecast', views: 892, uniqueUsers: 54 },
    ],
    leastViewedDashboards: [
      { name: 'Field Lineage', views: 23, uniqueUsers: 8 },
      { name: 'Data Standards', views: 45, uniqueUsers: 12 },
      { name: 'QBR Report', views: 67, uniqueUsers: 18 },
    ],
    featureUsage: [
      { feature: 'Export CSV', usageCount: 342, usagePercent: 68 },
      { feature: 'Lineage View', usageCount: 156, usagePercent: 31 },
      { feature: 'Search', usageCount: 1247, usagePercent: 89 },
      { feature: 'Dark Mode', usageCount: 89, usagePercent: 45 },
      { feature: 'Presenter Mode', usageCount: 34, usagePercent: 17 },
    ],
  }
}

// Data Quality Scorecard
export interface DataQualityDimension {
  dimension: string
  currentScore: number
  targetScore: number
  trend: TrendDirection
  topIssue: string
}

export function getDataQualityScorecard(): DataQualityDimension[] {
  return [
    {
      dimension: 'Accuracy',
      currentScore: 94.2,
      targetScore: 95,
      trend: 'up',
      topIssue: 'Address validation failures in 12 accounts',
    },
    {
      dimension: 'Completeness',
      currentScore: 91.8,
      targetScore: 90,
      trend: 'stable',
      topIssue: 'Missing contact info on 847 leads',
    },
    {
      dimension: 'Consistency',
      currentScore: 88.5,
      targetScore: 90,
      trend: 'down',
      topIssue: 'Customer name mismatches across SF/ERP',
    },
    {
      dimension: 'Timeliness',
      currentScore: 96.1,
      targetScore: 95,
      trend: 'up',
      topIssue: 'PestPac sync delayed 8 minutes',
    },
    {
      dimension: 'Validity',
      currentScore: 87.3,
      targetScore: 85,
      trend: 'stable',
      topIssue: '234 records with invalid date formats',
    },
    {
      dimension: 'Uniqueness',
      currentScore: 97.8,
      targetScore: 98,
      trend: 'up',
      topIssue: '45 potential duplicate accounts detected',
    },
  ]
}

// Schema Change Alerts
export type SchemaChangeType = 'field_added' | 'field_removed' | 'type_changed' | 'constraint_changed'
export type SchemaChangeStatus = 'new' | 'acknowledged' | 'resolved'
export type ImpactLevel = 'high' | 'medium' | 'low'

export interface SchemaChangeAlert {
  id: string
  sourceSystem: string
  changeType: SchemaChangeType
  fieldName: string
  description: string
  impactAssessment: string
  impactLevel: ImpactLevel
  actionRequired: string | null
  status: SchemaChangeStatus
  detectedAt: Date
}

export function getSchemaChangeAlerts(): SchemaChangeAlert[] {
  const now = new Date()
  return [
    {
      id: 'sc-1',
      sourceSystem: 'Salesforce',
      changeType: 'field_added',
      fieldName: 'Lead_Score__c',
      description: 'New custom field added to Lead object',
      impactAssessment: 'May affect lead routing workflows',
      impactLevel: 'medium',
      actionRequired: 'Review lead intake process',
      status: 'new',
      detectedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      id: 'sc-2',
      sourceSystem: 'PestPac',
      changeType: 'type_changed',
      fieldName: 'service_duration',
      description: 'Field type changed from VARCHAR to INTEGER',
      impactAssessment: 'ETL transformation may fail',
      impactLevel: 'high',
      actionRequired: 'Update ETL pipeline mapping',
      status: 'acknowledged',
      detectedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },
    {
      id: 'sc-3',
      sourceSystem: 'Workday',
      changeType: 'field_removed',
      fieldName: 'legacy_employee_id',
      description: 'Deprecated field removed from Employee entity',
      impactAssessment: 'No downstream dependencies found',
      impactLevel: 'low',
      actionRequired: null,
      status: 'resolved',
      detectedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      id: 'sc-4',
      sourceSystem: 'Billing/ERP',
      changeType: 'constraint_changed',
      fieldName: 'invoice_amount',
      description: 'Precision changed from DECIMAL(10,2) to DECIMAL(12,4)',
      impactAssessment: 'Financial calculations may need review',
      impactLevel: 'medium',
      actionRequired: 'Verify KPI calculations',
      status: 'new',
      detectedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
  ]
}

// Anomaly Detection
export type AnomalySeverity = 'critical' | 'warning' | 'info'

export interface AnomalyAlert {
  id: string
  severity: AnomalySeverity
  description: string
  detectedAt: Date
  likelyCause: string
  affectedKpis: string[]
  acknowledged: boolean
}

export function getAnomalyAlerts(): AnomalyAlert[] {
  const now = new Date()
  return [
    {
      id: 'an-1',
      severity: 'critical',
      description: 'Revenue MTD dropped 23% compared to same period last month',
      detectedAt: new Date(now.getTime() - 45 * 60 * 1000),
      likelyCause: 'Missing invoice data from ERP sync failure',
      affectedKpis: ['revenue_mtd', 'revenue_growth', 'forecast_accuracy'],
      acknowledged: false,
    },
    {
      id: 'an-2',
      severity: 'warning',
      description: 'Win rate increased 15% in Northeast region - unusual spike',
      detectedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      likelyCause: 'Bulk opportunity closures by single rep',
      affectedKpis: ['win_rate', 'sales_velocity'],
      acknowledged: true,
    },
    {
      id: 'an-3',
      severity: 'info',
      description: 'Service callback rate trending 5% above historical average',
      detectedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      likelyCause: 'Seasonal pest activity increase',
      affectedKpis: ['callback_rate', 'service_risk_index'],
      acknowledged: true,
    },
    {
      id: 'an-4',
      severity: 'warning',
      description: 'Technician route efficiency dropped 12% this week',
      detectedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      likelyCause: 'New technicians onboarded without optimized routes',
      affectedKpis: ['route_efficiency', 'avg_stops_per_day'],
      acknowledged: false,
    },
    {
      id: 'an-5',
      severity: 'critical',
      description: 'DSO increased 8 days in past week - payment collection issue',
      detectedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      likelyCause: 'Large enterprise invoice past due (Acme Corp $45K)',
      affectedKpis: ['dso', 'ar_aging', 'cash_flow'],
      acknowledged: false,
    },
  ]
}

// Failed Jobs details
export interface FailedJob {
  id: string
  jobName: string
  source: string
  failedAt: Date
  errorMessage: string
  retryCount: number
}

export function getFailedJobs(): FailedJob[] {
  const now = new Date()
  return [
    {
      id: 'fj-1',
      jobName: 'PestPac Service Sync',
      source: 'PestPac',
      failedAt: new Date(now.getTime() - 23 * 60 * 1000),
      errorMessage: 'Connection timeout after 30s',
      retryCount: 2,
    },
    {
      id: 'fj-2',
      jobName: 'Salesforce Opportunity Delta',
      source: 'Salesforce',
      failedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      errorMessage: 'API rate limit exceeded',
      retryCount: 1,
    },
    {
      id: 'fj-3',
      jobName: 'RTX Data Quality Check',
      source: 'RTX Hub',
      failedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      errorMessage: 'Validation rule failure: null values in required field',
      retryCount: 0,
    },
  ]
}
