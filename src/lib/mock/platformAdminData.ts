// Mock data for Platform Admin Console
// This file contains realistic mock data that can be replaced with real API calls

// ============================================================================
// TEST MODE - Set to true to inject stress-test data that triggers all alerts
// This helps test UI protection mechanisms, error states, and alert handling
// ============================================================================
export const TEST_MODE = true  // Toggle this to switch between normal and stress-test data

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
  if (TEST_MODE) {
    // STRESS TEST: Degraded platform health - multiple issues
    return {
      pipelineUptime: 94.2,           // Below 99% threshold - triggers warning
      etlJobsSuccessful: 823,         // 27 failures
      etlJobsTotal: 850,
      avgQueryTime: 4.8,              // Slow queries - above 2s threshold
      apiLatency: 890,                // High latency - above 500ms threshold
      dataDowntimeMinutes: 47,        // Significant downtime
      failedJobsCount: 8,             // Multiple failed jobs
      lastUpdated: new Date()
    }
  }

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

  if (TEST_MODE) {
    // STRESS TEST: Multiple SLA breaches across critical systems
    return [
      {
        id: 'sf-1',
        sourceName: 'Salesforce',
        slaTarget: '15 min',
        slaMinutes: 15,
        actualFreshnessMinutes: 47,     // BREACHED - 3x over SLA
        status: 'breached',
        trend: 'down',
        lastSync: new Date(now.getTime() - 47 * 60 * 1000)
      },
      {
        id: 'erp-1',
        sourceName: 'Billing/ERP',
        slaTarget: '4 hours',
        slaMinutes: 240,
        actualFreshnessMinutes: 312,    // BREACHED - over by 72 min
        status: 'breached',
        trend: 'down',
        lastSync: new Date(now.getTime() - 312 * 60 * 1000)
      },
      {
        id: 'pp-1',
        sourceName: 'PestPac',
        slaTarget: '15 min',
        slaMinutes: 15,
        actualFreshnessMinutes: 89,     // CRITICAL BREACH - 6x over SLA
        status: 'breached',
        trend: 'down',
        lastSync: new Date(now.getTime() - 89 * 60 * 1000)
      },
      {
        id: 'wd-1',
        sourceName: 'Workday',
        slaTarget: 'Daily',
        slaMinutes: 1440,
        actualFreshnessMinutes: 2160,   // BREACHED - 1.5 days stale
        status: 'breached',
        trend: 'down',
        lastSync: new Date(now.getTime() - 2160 * 60 * 1000)
      },
      {
        id: 'rtx-1',
        sourceName: 'RTX Hub',
        slaTarget: '1 hour',
        slaMinutes: 60,
        actualFreshnessMinutes: 42,     // OK - within SLA (to show mixed state)
        status: 'met',
        trend: 'stable',
        lastSync: new Date(now.getTime() - 42 * 60 * 1000)
      }
    ]
  }

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
  if (TEST_MODE) {
    // STRESS TEST: Multiple data quality dimensions failing targets
    return [
      {
        dimension: 'Accuracy',
        currentScore: 87.3,             // BELOW TARGET (95%)
        target: 95,
        trend: 'down',
        topIssue: 'CRITICAL: 12.7% of revenue records have mismatched amounts between SF and ERP',
        affectedRecords: 4521
      },
      {
        dimension: 'Completeness',
        currentScore: 72.1,             // CRITICAL: Far below target (90%)
        target: 90,
        trend: 'down',
        topIssue: 'CRITICAL: Missing required fields in 27.9% of new lead records',
        affectedRecords: 8934
      },
      {
        dimension: 'Consistency',
        currentScore: 81.4,             // BELOW TARGET (90%)
        target: 90,
        trend: 'down',
        topIssue: 'Account status conflicts between Salesforce, PestPac, and Billing systems',
        affectedRecords: 3267
      },
      {
        dimension: 'Timeliness',
        currentScore: 78.9,             // CRITICAL: Below target (95%)
        target: 95,
        trend: 'down',
        topIssue: 'CRITICAL: 21% of records have stale data older than SLA thresholds',
        affectedRecords: 12456
      },
      {
        dimension: 'Validity',
        currentScore: 69.8,             // CRITICAL: Far below target (85%)
        target: 85,
        trend: 'down',
        topIssue: 'CRITICAL: Invalid data formats in phone, email, and date fields',
        affectedRecords: 15678
      },
      {
        dimension: 'Uniqueness',
        currentScore: 94.2,             // BELOW TARGET (98%)
        target: 98,
        trend: 'down',
        topIssue: 'Duplicate detection found 5.8% potential duplicate records',
        affectedRecords: 2341
      }
    ]
  }

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

  if (TEST_MODE) {
    // STRESS TEST: Multiple breaking schema changes requiring immediate action
    return [
      {
        id: 'sc-1',
        sourceSystem: 'Salesforce',
        changeType: 'field_removed',
        fieldName: 'Revenue__c',
        details: 'BREAKING: Critical revenue field removed from Opportunity object',
        impactAssessment: 'high',
        actionRequired: 'URGENT: Revenue KPIs will fail - need immediate field mapping update',
        status: 'new',
        detectedAt: new Date(now.getTime() - 15 * 60 * 1000)  // 15 min ago
      },
      {
        id: 'sc-2',
        sourceSystem: 'PestPac',
        changeType: 'type_changed',
        fieldName: 'CustomerID',
        details: 'BREAKING: CustomerID changed from INT to VARCHAR(50)',
        impactAssessment: 'high',
        actionRequired: 'URGENT: All joins and lookups will fail - update ETL immediately',
        status: 'new',
        detectedAt: new Date(now.getTime() - 30 * 60 * 1000)  // 30 min ago
      },
      {
        id: 'sc-3',
        sourceSystem: 'Billing/ERP',
        changeType: 'constraint_changed',
        fieldName: 'InvoiceDate',
        details: 'NOT NULL constraint added - 2,341 existing records have NULL values',
        impactAssessment: 'high',
        actionRequired: 'URGENT: Sync will fail until NULL values are resolved',
        status: 'new',
        detectedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000)  // 1 hour ago
      },
      {
        id: 'sc-4',
        sourceSystem: 'RTX Hub',
        changeType: 'field_added',
        fieldName: 'ComplianceFlag',
        details: 'New required field added to Account entity',
        impactAssessment: 'high',
        actionRequired: 'Add default value mapping for existing records',
        status: 'new',
        detectedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)  // 2 hours ago
      },
      {
        id: 'sc-5',
        sourceSystem: 'Workday',
        changeType: 'field_removed',
        fieldName: 'ManagerEmail',
        details: 'Field removed - used in notification workflows',
        impactAssessment: 'medium',
        actionRequired: 'Update notification service to use alternative field',
        status: 'acknowledged',
        detectedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000)
      },
      {
        id: 'sc-6',
        sourceSystem: 'Salesforce',
        changeType: 'type_changed',
        fieldName: 'CloseDate',
        details: 'Date format changed from MM/DD/YYYY to ISO 8601',
        impactAssessment: 'medium',
        actionRequired: 'Update date parsing in ETL pipeline',
        status: 'new',
        detectedAt: new Date(now.getTime() - 45 * 60 * 1000)
      }
    ]
  }

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

  if (TEST_MODE) {
    // STRESS TEST: Multiple critical anomalies requiring immediate attention
    return [
      {
        id: 'an-1',
        severity: 'critical',
        description: 'CRITICAL: Revenue MTD dropped 45% - potential data pipeline failure',
        detectionTime: new Date(now.getTime() - 5 * 60 * 1000),  // 5 min ago
        likelyCause: 'ERP sync failure causing missing invoice data - 12,456 records affected',
        affectedKPIs: ['revenue_mtd', 'revenue_growth', 'forecast_accuracy', 'cash_flow'],
        status: 'active'
      },
      {
        id: 'an-2',
        severity: 'critical',
        description: 'CRITICAL: Win rate collapsed to 8% (normal: 32%) - data integrity issue',
        detectionTime: new Date(now.getTime() - 12 * 60 * 1000),  // 12 min ago
        likelyCause: 'Salesforce opportunity status field corrupted during bulk update',
        affectedKPIs: ['win_rate', 'pipeline_value', 'sales_forecast', 'quota_attainment'],
        status: 'active'
      },
      {
        id: 'an-3',
        severity: 'critical',
        description: 'CRITICAL: Service Risk Index spiked to 156 (threshold: 85)',
        detectionTime: new Date(now.getTime() - 22 * 60 * 1000),  // 22 min ago
        likelyCause: 'PestPac service records showing 73% callback rate - likely duplicate entries',
        affectedKPIs: ['service_risk_index', 'callback_rate', 'customer_satisfaction', 'nps'],
        status: 'active'
      },
      {
        id: 'an-4',
        severity: 'critical',
        description: 'CRITICAL: AR Aging 90+ jumped 340% overnight',
        detectionTime: new Date(now.getTime() - 35 * 60 * 1000),  // 35 min ago
        likelyCause: 'Billing system date calculation error assigning wrong due dates',
        affectedKPIs: ['ar_aging_90', 'dso', 'bad_debt_ratio', 'collection_rate'],
        status: 'active'
      },
      {
        id: 'an-5',
        severity: 'warning',
        description: 'Technician utilization dropped to 34% across all regions',
        detectionTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        likelyCause: 'Route optimization algorithm failure - inefficient scheduling',
        affectedKPIs: ['tech_utilization', 'route_efficiency', 'cost_per_service'],
        status: 'investigating'
      },
      {
        id: 'an-6',
        severity: 'warning',
        description: 'Lead response time increased to 47 hours (SLA: 4 hours)',
        detectionTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        likelyCause: 'Lead assignment workflow broken - leads stuck in queue',
        affectedKPIs: ['lead_response_time', 'lead_conversion', 'sales_velocity'],
        status: 'active'
      },
      {
        id: 'an-7',
        severity: 'warning',
        description: 'Churn rate spike: 12.4% (normal: 3.2%)',
        detectionTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        likelyCause: 'Service cancellation records duplicated in sync',
        affectedKPIs: ['churn_rate', 'net_retention', 'customer_lifetime_value'],
        status: 'active'
      },
      {
        id: 'an-8',
        severity: 'info',
        description: 'Unusual pattern: 89% of new leads from single source',
        detectionTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        likelyCause: 'Possible lead source attribution error or bot traffic',
        affectedKPIs: ['lead_source_mix', 'lead_quality_score'],
        status: 'investigating'
      }
    ]
  }

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

  if (TEST_MODE) {
    // STRESS TEST: Multiple critical job failures across all systems
    return [
      {
        id: 'fj-1',
        jobName: 'ERP_Invoice_Sync',
        sourceSystem: 'Billing/ERP',
        failedAt: new Date(now.getTime() - 5 * 60 * 1000),  // 5 min ago
        errorMessage: 'CRITICAL: Database connection pool exhausted - all 100 connections in use',
        retryCount: 5,
        status: 'manual_intervention'
      },
      {
        id: 'fj-2',
        jobName: 'Salesforce_Opportunity_Sync',
        sourceSystem: 'Salesforce',
        failedAt: new Date(now.getTime() - 8 * 60 * 1000),  // 8 min ago
        errorMessage: 'CRITICAL: OAuth token expired and refresh failed - authentication broken',
        retryCount: 10,
        status: 'manual_intervention'
      },
      {
        id: 'fj-3',
        jobName: 'PestPac_Service_Events',
        sourceSystem: 'PestPac',
        failedAt: new Date(now.getTime() - 12 * 60 * 1000),  // 12 min ago
        errorMessage: 'Schema mismatch: Expected INT for CustomerID, received VARCHAR',
        retryCount: 3,
        status: 'failed'
      },
      {
        id: 'fj-4',
        jobName: 'RTX_KPI_Calculation',
        sourceSystem: 'RTX Hub',
        failedAt: new Date(now.getTime() - 18 * 60 * 1000),  // 18 min ago
        errorMessage: 'Division by zero in win_rate calculation - denominator is 0',
        retryCount: 1,
        status: 'failed'
      },
      {
        id: 'fj-5',
        jobName: 'Workday_Employee_Sync',
        sourceSystem: 'Workday',
        failedAt: new Date(now.getTime() - 25 * 60 * 1000),  // 25 min ago
        errorMessage: 'SSL certificate validation failed - certificate expired',
        retryCount: 2,
        status: 'retrying'
      },
      {
        id: 'fj-6',
        jobName: 'Salesforce_Lead_Import',
        sourceSystem: 'Salesforce',
        failedAt: new Date(now.getTime() - 30 * 60 * 1000),  // 30 min ago
        errorMessage: 'API rate limit exceeded (15,000/15,000 daily calls used)',
        retryCount: 0,
        status: 'failed'
      },
      {
        id: 'fj-7',
        jobName: 'PestPac_Route_Optimization',
        sourceSystem: 'PestPac',
        failedAt: new Date(now.getTime() - 45 * 60 * 1000),  // 45 min ago
        errorMessage: 'Memory limit exceeded: Job requires 16GB, limit is 8GB',
        retryCount: 2,
        status: 'manual_intervention'
      },
      {
        id: 'fj-8',
        jobName: 'RTX_Data_Quality_Check',
        sourceSystem: 'RTX Hub',
        failedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),  // 1 hour ago
        errorMessage: 'Validation failed: 2,341 records with NULL in required fields',
        retryCount: 0,
        status: 'manual_intervention'
      }
    ]
  }

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
