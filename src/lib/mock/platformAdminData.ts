// Mock data for Platform Admin Console
// This file contains realistic mock data that can be replaced with real API calls

export interface PlatformHealthMetrics {
  pipelineUptime: number
  etlJobsSuccessful: number
  etlJobsTotal: number
  avgQueryTime: number
  apiLatency: number
  dataDowntimeMinutes: number
  failedJobsCount: number
  lastUpdated: Date
}

export interface DataFreshnessSLA {
  id: string
  sourceName: string
  slaTarget: string
  slaMinutes: number
  actualFreshnessMinutes: number
  status: 'met' | 'breached'
  trend: 'up' | 'down' | 'stable'
  lastSync: Date
}

export interface UserAdoptionMetrics {
  activeUsers: number
  totalUsers: number
  newUsersThisWeek: number
  mostViewedDashboards: { name: string; views: number; trend: number }[]
  leastViewedDashboards: { name: string; views: number }[]
  featureUsage: { feature: string; usageCount: number; usagePercent: number }[]
}

export interface DataQualityDimension {
  dimension: string
  currentScore: number
  target: number
  trend: 'up' | 'down' | 'stable'
  topIssue: string
  affectedRecords: number
}

export interface SchemaChangeAlert {
  id: string
  sourceSystem: string
  changeType: 'field_added' | 'field_removed' | 'type_changed' | 'constraint_changed'
  fieldName: string
  details: string
  impactAssessment: 'high' | 'medium' | 'low'
  actionRequired: string | null
  status: 'new' | 'acknowledged' | 'resolved'
  detectedAt: Date
}

export interface AnomalyAlert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  description: string
  detectionTime: Date
  likelyCause: string
  affectedKPIs: string[]
  status: 'active' | 'investigating' | 'resolved'
}

// Platform Health Mock Data
export function getPlatformHealthMetrics(): PlatformHealthMetrics {
  return {
    pipelineUptime: 99.7,
    etlJobsSuccessful: 847,
    etlJobsTotal: 850,
    avgQueryTime: 1.2,
    apiLatency: 230,
    dataDowntimeMinutes: 12,
    failedJobsCount: 3,
    lastUpdated: new Date()
  }
}

// Data Freshness SLA Mock Data
export function getDataFreshnessSLAs(): DataFreshnessSLA[] {
  const now = new Date()
  return [
    {
      id: 'sf-1',
      sourceName: 'Salesforce',
      slaTarget: '15 min',
      slaMinutes: 15,
      actualFreshnessMinutes: 8,
      status: 'met',
      trend: 'stable',
      lastSync: new Date(now.getTime() - 8 * 60 * 1000)
    },
    {
      id: 'erp-1',
      sourceName: 'Billing/ERP',
      slaTarget: '4 hours',
      slaMinutes: 240,
      actualFreshnessMinutes: 185,
      status: 'met',
      trend: 'up',
      lastSync: new Date(now.getTime() - 185 * 60 * 1000)
    },
    {
      id: 'pp-1',
      sourceName: 'PestPac',
      slaTarget: '15 min',
      slaMinutes: 15,
      actualFreshnessMinutes: 22,
      status: 'breached',
      trend: 'down',
      lastSync: new Date(now.getTime() - 22 * 60 * 1000)
    },
    {
      id: 'wd-1',
      sourceName: 'Workday',
      slaTarget: 'Daily',
      slaMinutes: 1440,
      actualFreshnessMinutes: 720,
      status: 'met',
      trend: 'stable',
      lastSync: new Date(now.getTime() - 720 * 60 * 1000)
    },
    {
      id: 'rtx-1',
      sourceName: 'RTX Hub',
      slaTarget: '1 hour',
      slaMinutes: 60,
      actualFreshnessMinutes: 45,
      status: 'met',
      trend: 'up',
      lastSync: new Date(now.getTime() - 45 * 60 * 1000)
    }
  ]
}

// User Adoption Mock Data
export function getUserAdoptionMetrics(): UserAdoptionMetrics {
  return {
    activeUsers: 147,
    totalUsers: 200,
    newUsersThisWeek: 12,
    mostViewedDashboards: [
      { name: 'Executive Command Center', views: 1842, trend: 8.5 },
      { name: 'Sales Pipeline', views: 1456, trend: 12.3 },
      { name: 'Operations Dashboard', views: 1203, trend: -2.1 },
      { name: 'Finance Overview', views: 987, trend: 5.7 },
      { name: 'Daily Sales Cadence', views: 876, trend: 15.2 }
    ],
    leastViewedDashboards: [
      { name: 'Field Lineage', views: 23 },
      { name: 'Data Standards', views: 45 },
      { name: 'QBR Reports', views: 67 }
    ],
    featureUsage: [
      { feature: 'Export CSV', usageCount: 342, usagePercent: 68 },
      { feature: 'Lineage View', usageCount: 156, usagePercent: 31 },
      { feature: 'Search', usageCount: 523, usagePercent: 78 },
      { feature: 'KPI Drill-down', usageCount: 412, usagePercent: 65 },
      { feature: 'Filter by Region', usageCount: 289, usagePercent: 58 }
    ]
  }
}

// Data Quality Scorecard Mock Data
export function getDataQualityScorecard(): DataQualityDimension[] {
  return [
    {
      dimension: 'Accuracy',
      currentScore: 96.2,
      target: 95,
      trend: 'up',
      topIssue: 'Mismatched account names between SF and PestPac',
      affectedRecords: 127
    },
    {
      dimension: 'Completeness',
      currentScore: 88.5,
      target: 90,
      trend: 'down',
      topIssue: 'Missing email addresses in 4.2% of contact records',
      affectedRecords: 1847
    },
    {
      dimension: 'Consistency',
      currentScore: 91.8,
      target: 90,
      trend: 'stable',
      topIssue: 'Date format inconsistencies in service records',
      affectedRecords: 342
    },
    {
      dimension: 'Timeliness',
      currentScore: 97.1,
      target: 95,
      trend: 'up',
      topIssue: 'PestPac sync delays during peak hours',
      affectedRecords: 89
    },
    {
      dimension: 'Validity',
      currentScore: 82.4,
      target: 85,
      trend: 'down',
      topIssue: 'Invalid phone number formats in leads',
      affectedRecords: 2341
    },
    {
      dimension: 'Uniqueness',
      currentScore: 99.1,
      target: 98,
      trend: 'stable',
      topIssue: 'Duplicate account entries from bulk imports',
      affectedRecords: 56
    }
  ]
}

// Schema Change Alerts Mock Data
export function getSchemaChangeAlerts(): SchemaChangeAlert[] {
  const now = new Date()
  return [
    {
      id: 'sc-1',
      sourceSystem: 'Salesforce',
      changeType: 'field_added',
      fieldName: 'Lead_Quality_Score__c',
      details: 'New custom field added to Lead object',
      impactAssessment: 'low',
      actionRequired: 'Add field to data dictionary',
      status: 'new',
      detectedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    },
    {
      id: 'sc-2',
      sourceSystem: 'PestPac',
      changeType: 'type_changed',
      fieldName: 'ServiceAmount',
      details: 'Changed from INT to DECIMAL(10,2)',
      impactAssessment: 'high',
      actionRequired: 'Update ETL transformations and KPI calculations',
      status: 'acknowledged',
      detectedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
    },
    {
      id: 'sc-3',
      sourceSystem: 'Workday',
      changeType: 'field_removed',
      fieldName: 'LegacyEmployeeCode',
      details: 'Deprecated field removed from Employee export',
      impactAssessment: 'medium',
      actionRequired: 'Remove from sync mappings',
      status: 'resolved',
      detectedAt: new Date(now.getTime() - 72 * 60 * 60 * 1000)
    },
    {
      id: 'sc-4',
      sourceSystem: 'RTX Hub',
      changeType: 'constraint_changed',
      fieldName: 'AccountId',
      details: 'NOT NULL constraint added',
      impactAssessment: 'medium',
      actionRequired: 'Ensure all records have AccountId before sync',
      status: 'new',
      detectedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000)
    }
  ]
}

// Anomaly Detection Alerts Mock Data
export function getAnomalyAlerts(): AnomalyAlert[] {
  const now = new Date()
  return [
    {
      id: 'an-1',
      severity: 'critical',
      description: 'Revenue MTD dropped 23% compared to same period last month',
      detectionTime: new Date(now.getTime() - 30 * 60 * 1000),
      likelyCause: 'Large account churn detected in Northeast region',
      affectedKPIs: ['revenue_mtd', 'net_retention', 'churn_rate'],
      status: 'active'
    },
    {
      id: 'an-2',
      severity: 'warning',
      description: 'Pipeline velocity slowed by 18% over past 7 days',
      detectionTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      likelyCause: 'Increased days in negotiation stage',
      affectedKPIs: ['pipeline_velocity', 'sales_cycle_days', 'win_rate'],
      status: 'investigating'
    },
    {
      id: 'an-3',
      severity: 'warning',
      description: 'Service completion rate below threshold for 3 consecutive days',
      detectionTime: new Date(now.getTime() - 18 * 60 * 60 * 1000),
      likelyCause: 'Technician capacity constraints in R52 region',
      affectedKPIs: ['service_completion_rate', 'first_time_fix', 'customer_satisfaction'],
      status: 'active'
    },
    {
      id: 'an-4',
      severity: 'info',
      description: 'Unusual spike in new lead volume (+45%)',
      detectionTime: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      likelyCause: 'Marketing campaign launched - expected behavior',
      affectedKPIs: ['lead_volume', 'lead_response_time'],
      status: 'resolved'
    },
    {
      id: 'an-5',
      severity: 'critical',
      description: 'DSO increased by 12 days in past week',
      detectionTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      likelyCause: 'Invoice processing delays in billing system',
      affectedKPIs: ['dso', 'ar_aging', 'collection_rate'],
      status: 'active'
    }
  ]
}

// Failed Jobs Details
export interface FailedJob {
  id: string
  jobName: string
  sourceSystem: string
  failedAt: Date
  errorMessage: string
  retryCount: number
  status: 'failed' | 'retrying' | 'manual_intervention'
}

export function getFailedJobs(): FailedJob[] {
  const now = new Date()
  return [
    {
      id: 'fj-1',
      jobName: 'PestPac_Daily_Sync',
      sourceSystem: 'PestPac',
      failedAt: new Date(now.getTime() - 45 * 60 * 1000),
      errorMessage: 'Connection timeout after 30s',
      retryCount: 3,
      status: 'retrying'
    },
    {
      id: 'fj-2',
      jobName: 'Salesforce_Lead_Import',
      sourceSystem: 'Salesforce',
      failedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      errorMessage: 'API rate limit exceeded',
      retryCount: 1,
      status: 'failed'
    },
    {
      id: 'fj-3',
      jobName: 'RTX_Account_Reconciliation',
      sourceSystem: 'RTX Hub',
      failedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      errorMessage: 'Data validation failed: 47 orphan records',
      retryCount: 0,
      status: 'manual_intervention'
    }
  ]
}
