/**
 * Data Quality Engine
 *
 * Simulates data quality monitoring, issue detection, and reconciliation
 * between data sources (RTX, Salesforce, PestPac, etc.)
 *
 * In production, this would connect to actual data sources and run
 * validation rules against live data.
 */

import {
  DATA_DICTIONARY,
  DATA_SOURCES_METADATA,
  getAllDataQualityRules,
  type DataSource,
  type DataQualitySeverity,
  type DataQualityRule
} from './data-dictionary'

export interface DataQualityIssue {
  issueId: string
  ruleId: string
  ruleName: string
  fieldId: string
  fieldName: string
  displayName: string
  severity: DataQualitySeverity
  source: DataSource
  description: string
  affectedRecords: number
  totalRecords: number
  percentageAffected: number
  detectedAt: string
  lastChecked: string
  status: 'open' | 'acknowledged' | 'resolved' | 'false_positive'
  remediation: string
  assignee?: string
  examples?: string[]
}

export interface ReconciliationResult {
  sourceA: DataSource
  sourceB: DataSource
  entityType: 'account' | 'opportunity' | 'service_event' | 'invoice'
  fieldName: string
  matchRate: number
  recordsInA: number
  recordsInB: number
  matchedRecords: number
  missingInA: number
  missingInB: number
  conflictingValues: number
  varianceThreshold: number
  varianceExceeded: boolean
  lastReconciled: string
  status: 'healthy' | 'warning' | 'critical'
  discrepancies: ReconciliationDiscrepancy[]
}

export interface ReconciliationDiscrepancy {
  recordId: string
  fieldName: string
  valueInA: string | number
  valueInB: string | number
  variance?: number
  variancePercent?: number
}

export interface DataSourceHealth {
  source: DataSource
  name: string
  status: 'healthy' | 'degraded' | 'offline' | 'unknown'
  lastSync: string
  recordCount: number
  freshness: 'fresh' | 'stale' | 'very_stale'
  freshnessMinutes: number
  issueCount: number
  criticalIssues: number
  warningIssues: number
  connectionStatus: 'connected' | 'disconnected' | 'intermittent'
  avgResponseTime: number
  errorRate: number
}

export interface DataQualityScore {
  overall: number
  byDimension: {
    completeness: number
    accuracy: number
    consistency: number
    timeliness: number
    uniqueness: number
    validity: number
  }
  bySource: Record<DataSource, number>
  trend: { date: string; score: number }[]
}

// Simulated data quality issues
function generateDataQualityIssues(): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [
    {
      issueId: 'DQ-001',
      ruleId: 'ACC_CV_003',
      ruleName: 'RTX vs Salesforce Variance',
      fieldId: 'ACC_CONTRACT_VALUE',
      fieldName: 'contract_value',
      displayName: 'Annual Contract Value',
      severity: 'warning',
      source: 'rtx_data_hub',
      description: 'Contract value variance > 5% detected between RTX Data Hub and Salesforce for 23 accounts',
      affectedRecords: 23,
      totalRecords: 1523,
      percentageAffected: 1.51,
      detectedAt: '2025-01-08T08:30:00Z',
      lastChecked: '2025-01-08T14:00:00Z',
      status: 'open',
      remediation: 'Reconcile contract values between systems and update source of truth',
      assignee: 'Data Platform Team',
      examples: ['ACC-123456: RTX $12,500 vs SF $11,875 (5.3% variance)', 'ACC-234567: RTX $8,200 vs SF $7,650 (7.2% variance)']
    },
    {
      issueId: 'DQ-002',
      ruleId: 'OPP_STAGE_002',
      ruleName: 'Closed Date Required for Closed Stages',
      fieldId: 'OPP_STAGE',
      fieldName: 'stage',
      displayName: 'Opportunity Stage',
      severity: 'warning',
      source: 'salesforce',
      description: 'Closed Won/Lost opportunities missing close date',
      affectedRecords: 12,
      totalRecords: 2450,
      percentageAffected: 0.49,
      detectedAt: '2025-01-07T16:45:00Z',
      lastChecked: '2025-01-08T14:00:00Z',
      status: 'acknowledged',
      remediation: 'Add close date to opportunity records in Salesforce',
      assignee: 'Sales Operations'
    },
    {
      issueId: 'DQ-003',
      ruleId: 'SVC_TOS_001',
      ruleName: 'Time on Site Range',
      fieldId: 'SVC_TIME_ON_SITE',
      fieldName: 'time_on_site',
      displayName: 'Time on Site (Minutes)',
      severity: 'info',
      source: 'pestpac',
      description: 'Service events with unusually short or long time on site values',
      affectedRecords: 45,
      totalRecords: 12340,
      percentageAffected: 0.36,
      detectedAt: '2025-01-08T06:00:00Z',
      lastChecked: '2025-01-08T14:00:00Z',
      status: 'open',
      remediation: 'Verify time entry accuracy with technicians',
      examples: ['SVC-10042567: 3 minutes (below minimum)', 'SVC-10042890: 485 minutes (above maximum)']
    },
    {
      issueId: 'DQ-004',
      ruleId: 'ACC_BR_001',
      ruleName: 'Valid Branch Reference',
      fieldId: 'ACC_BRANCH_ID',
      fieldName: 'branch_id',
      displayName: 'Branch ID',
      severity: 'critical',
      source: 'rtx_data_hub',
      description: 'Account records referencing invalid or deactivated branch IDs',
      affectedRecords: 7,
      totalRecords: 1523,
      percentageAffected: 0.46,
      detectedAt: '2025-01-08T02:15:00Z',
      lastChecked: '2025-01-08T14:00:00Z',
      status: 'open',
      remediation: 'Reassign accounts to valid active branches',
      assignee: 'Operations',
      examples: ['ACC-345678: BR-999 (branch not found)', 'ACC-456789: BR-050 (branch deactivated)']
    },
    {
      issueId: 'DQ-005',
      ruleId: 'OPP_AMT_002',
      ruleName: 'Amount Required for Late Stages',
      fieldId: 'OPP_AMOUNT',
      fieldName: 'amount',
      displayName: 'Opportunity Amount',
      severity: 'warning',
      source: 'salesforce',
      description: 'Opportunities in proposal or later stages without amount specified',
      affectedRecords: 18,
      totalRecords: 2450,
      percentageAffected: 0.73,
      detectedAt: '2025-01-07T09:30:00Z',
      lastChecked: '2025-01-08T14:00:00Z',
      status: 'open',
      remediation: 'Enter expected deal amount based on proposal',
      assignee: 'Sales Reps'
    },
    {
      issueId: 'DQ-006',
      ruleId: 'INV_STAT_002',
      ruleName: 'Paid Date for Paid Status',
      fieldId: 'INV_STATUS',
      fieldName: 'invoice_status',
      displayName: 'Invoice Status',
      severity: 'warning',
      source: 'jde',
      description: 'Paid invoices missing payment date',
      affectedRecords: 5,
      totalRecords: 6200,
      percentageAffected: 0.08,
      detectedAt: '2025-01-08T10:00:00Z',
      lastChecked: '2025-01-08T14:00:00Z',
      status: 'open',
      remediation: 'Add payment date from bank records',
      assignee: 'Finance'
    },
    {
      issueId: 'DQ-007',
      ruleId: 'SP_NAME_002',
      ruleName: 'Name Match Salesforce',
      fieldId: 'SP_CUSTOMER_NAME',
      fieldName: 'customer_name',
      displayName: 'Customer Name (Start Packet)',
      severity: 'info',
      source: 'start_packet_pdf',
      description: 'Customer names from start packets not matching Salesforce account names',
      affectedRecords: 8,
      totalRecords: 156,
      percentageAffected: 5.13,
      detectedAt: '2025-01-06T14:20:00Z',
      lastChecked: '2025-01-08T14:00:00Z',
      status: 'open',
      remediation: 'Review and reconcile customer name discrepancies',
      examples: ['Start Packet: "ACME CORP" vs SF: "Acme Corporation"']
    },
    {
      issueId: 'DQ-008',
      ruleId: 'KPI_REV_002',
      ruleName: 'Revenue Freshness',
      fieldId: 'KPI_REVENUE_MTD',
      fieldName: 'revenue_mtd',
      displayName: 'Revenue MTD',
      severity: 'critical',
      source: 'calculated',
      description: 'Revenue MTD calculation is stale (last updated > 24 hours ago)',
      affectedRecords: 1,
      totalRecords: 1,
      percentageAffected: 100,
      detectedAt: '2025-01-08T12:00:00Z',
      lastChecked: '2025-01-08T14:00:00Z',
      status: 'open',
      remediation: 'Trigger KPI recalculation job',
      assignee: 'Data Platform Team'
    }
  ]

  return issues
}

// Generate reconciliation results
function generateReconciliationResults(): ReconciliationResult[] {
  return [
    {
      sourceA: 'salesforce',
      sourceB: 'rtx_data_hub',
      entityType: 'account',
      fieldName: 'contract_value',
      matchRate: 94.5,
      recordsInA: 1520,
      recordsInB: 1523,
      matchedRecords: 1440,
      missingInA: 3,
      missingInB: 0,
      conflictingValues: 80,
      varianceThreshold: 5,
      varianceExceeded: true,
      lastReconciled: '2025-01-08T14:00:00Z',
      status: 'warning',
      discrepancies: [
        { recordId: 'ACC-123456', fieldName: 'contract_value', valueInA: 11875, valueInB: 12500, variance: 625, variancePercent: 5.3 },
        { recordId: 'ACC-234567', fieldName: 'contract_value', valueInA: 7650, valueInB: 8200, variance: 550, variancePercent: 7.2 },
        { recordId: 'ACC-345678', fieldName: 'contract_value', valueInA: 15200, valueInB: 14500, variance: 700, variancePercent: 4.6 }
      ]
    },
    {
      sourceA: 'salesforce',
      sourceB: 'rtx_data_hub',
      entityType: 'opportunity',
      fieldName: 'amount',
      matchRate: 98.2,
      recordsInA: 2450,
      recordsInB: 2445,
      matchedRecords: 2400,
      missingInA: 0,
      missingInB: 5,
      conflictingValues: 45,
      varianceThreshold: 5,
      varianceExceeded: false,
      lastReconciled: '2025-01-08T14:00:00Z',
      status: 'healthy',
      discrepancies: []
    },
    {
      sourceA: 'pestpac',
      sourceB: 'rtx_data_hub',
      entityType: 'service_event',
      fieldName: 'status',
      matchRate: 99.1,
      recordsInA: 12340,
      recordsInB: 12338,
      matchedRecords: 12230,
      missingInA: 0,
      missingInB: 2,
      conflictingValues: 108,
      varianceThreshold: 1,
      varianceExceeded: false,
      lastReconciled: '2025-01-08T13:45:00Z',
      status: 'healthy',
      discrepancies: []
    },
    {
      sourceA: 'jde',
      sourceB: 'rtx_data_hub',
      entityType: 'invoice',
      fieldName: 'amount',
      matchRate: 99.8,
      recordsInA: 6200,
      recordsInB: 6200,
      matchedRecords: 6188,
      missingInA: 0,
      missingInB: 0,
      conflictingValues: 12,
      varianceThreshold: 0.1,
      varianceExceeded: false,
      lastReconciled: '2025-01-08T14:00:00Z',
      status: 'healthy',
      discrepancies: []
    },
    {
      sourceA: 'salesforce',
      sourceB: 'pestpac',
      entityType: 'account',
      fieldName: 'service_frequency',
      matchRate: 96.8,
      recordsInA: 1520,
      recordsInB: 1515,
      matchedRecords: 1470,
      missingInA: 0,
      missingInB: 5,
      conflictingValues: 45,
      varianceThreshold: 3,
      varianceExceeded: true,
      lastReconciled: '2025-01-08T12:30:00Z',
      status: 'warning',
      discrepancies: [
        { recordId: 'ACC-567890', fieldName: 'service_frequency', valueInA: 'monthly', valueInB: 'bi-weekly' },
        { recordId: 'ACC-678901', fieldName: 'service_frequency', valueInA: 'weekly', valueInB: 'monthly' }
      ]
    }
  ]
}

// Generate data source health status
function generateDataSourceHealth(): DataSourceHealth[] {
  return [
    {
      source: 'rtx_data_hub',
      name: 'RTX Data Hub',
      status: 'healthy',
      lastSync: '2025-01-08T13:55:00Z',
      recordCount: 45230,
      freshness: 'fresh',
      freshnessMinutes: 5,
      issueCount: 2,
      criticalIssues: 1,
      warningIssues: 1,
      connectionStatus: 'connected',
      avgResponseTime: 245,
      errorRate: 0.02
    },
    {
      source: 'salesforce',
      name: 'Salesforce CRM',
      status: 'healthy',
      lastSync: '2025-01-08T14:00:00Z',
      recordCount: 28450,
      freshness: 'fresh',
      freshnessMinutes: 0,
      issueCount: 3,
      criticalIssues: 0,
      warningIssues: 3,
      connectionStatus: 'connected',
      avgResponseTime: 180,
      errorRate: 0.01
    },
    {
      source: 'pestpac',
      name: 'PestPac Field Service',
      status: 'healthy',
      lastSync: '2025-01-08T13:45:00Z',
      recordCount: 18560,
      freshness: 'fresh',
      freshnessMinutes: 15,
      issueCount: 1,
      criticalIssues: 0,
      warningIssues: 0,
      connectionStatus: 'connected',
      avgResponseTime: 320,
      errorRate: 0.03
    },
    {
      source: 'jde',
      name: 'SAP Financials',
      status: 'healthy',
      lastSync: '2025-01-08T13:00:00Z',
      recordCount: 12400,
      freshness: 'fresh',
      freshnessMinutes: 60,
      issueCount: 1,
      criticalIssues: 0,
      warningIssues: 1,
      connectionStatus: 'connected',
      avgResponseTime: 450,
      errorRate: 0.01
    },
    {
      source: 'workday',
      name: 'Workday HR',
      status: 'healthy',
      lastSync: '2025-01-08T06:00:00Z',
      recordCount: 2340,
      freshness: 'stale',
      freshnessMinutes: 480,
      issueCount: 0,
      criticalIssues: 0,
      warningIssues: 0,
      connectionStatus: 'connected',
      avgResponseTime: 380,
      errorRate: 0.00
    },
    {
      source: 'start_packet_pdf',
      name: 'Start Packet PDFs',
      status: 'healthy',
      lastSync: '2025-01-08T11:30:00Z',
      recordCount: 156,
      freshness: 'fresh',
      freshnessMinutes: 150,
      issueCount: 1,
      criticalIssues: 0,
      warningIssues: 0,
      connectionStatus: 'connected',
      avgResponseTime: 1200,
      errorRate: 0.05
    },
    {
      source: 'calculated',
      name: 'Calculated Fields',
      status: 'degraded',
      lastSync: '2025-01-07T23:00:00Z',
      recordCount: 21,
      freshness: 'stale',
      freshnessMinutes: 900,
      issueCount: 1,
      criticalIssues: 1,
      warningIssues: 0,
      connectionStatus: 'connected',
      avgResponseTime: 50,
      errorRate: 0.00
    }
  ]
}

// Calculate overall data quality score
function calculateDataQualityScore(): DataQualityScore {
  const issues = generateDataQualityIssues()
  const totalRules = getAllDataQualityRules().length

  // Calculate dimension scores (simulated)
  const completeness = 97.2
  const accuracy = 95.8
  const consistency = 94.5
  const timeliness = 92.1
  const uniqueness = 99.5
  const validity = 96.3

  const overall = (completeness + accuracy + consistency + timeliness + uniqueness + validity) / 6

  // Calculate by source
  const bySource: Record<DataSource, number> = {
    rtx_data_hub: 96.5,
    salesforce: 94.2,
    pestpac: 97.8,
    jde: 98.1,
    workday: 99.2,
    start_packet_pdf: 89.5,
    calculated: 91.0,
    invoca: 95.5,
    five9: 96.0,
    lead_exec: 94.8,
    sales_exec: 95.2,
    xactly: 98.5,
    winning_formula: 96.8,
  }

  // Historical trend (last 7 days)
  const trend = [
    { date: '2025-01-02', score: 94.2 },
    { date: '2025-01-03', score: 94.5 },
    { date: '2025-01-04', score: 95.1 },
    { date: '2025-01-05', score: 94.8 },
    { date: '2025-01-06', score: 95.3 },
    { date: '2025-01-07', score: 95.0 },
    { date: '2025-01-08', score: overall }
  ]

  return {
    overall: Math.round(overall * 10) / 10,
    byDimension: {
      completeness,
      accuracy,
      consistency,
      timeliness,
      uniqueness,
      validity
    },
    bySource,
    trend
  }
}

// Export all functions
export function getDataQualityIssues(): DataQualityIssue[] {
  return generateDataQualityIssues()
}

export function getReconciliationResults(): ReconciliationResult[] {
  return generateReconciliationResults()
}

export function getDataSourceHealth(): DataSourceHealth[] {
  return generateDataSourceHealth()
}

export function getDataQualityScore(): DataQualityScore {
  return calculateDataQualityScore()
}

export function getIssueSummary() {
  const issues = generateDataQualityIssues()
  return {
    total: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    acknowledged: issues.filter(i => i.status === 'acknowledged').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    bySeverity: {
      critical: issues.filter(i => i.severity === 'critical').length,
      warning: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length
    },
    bySource: issues.reduce((acc, i) => {
      acc[i.source] = (acc[i.source] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}
