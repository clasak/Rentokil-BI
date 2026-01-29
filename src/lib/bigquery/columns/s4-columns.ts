/**
 * Column Metadata for S4 Dataset
 *
 * Primary table: Fact_Leads_Acc_Daily_Dtls_Snp (11.8M+ rows)
 * Purpose: Lead funnel tracking and conversion analysis
 * Owner: Sales Operations
 * Refresh: Every 15 minutes (critical SLA)
 *
 * Used by queries:
 * - getLeadsByPestType (leads.ts)
 * - getLeadTrends (leads.ts)
 * - getLeadRankings (leads.ts)
 * - getLeadCancellations (leads.ts)
 * - getLeadGeographic (leads.ts)
 */

import type { TableColumns } from './types'
import { registerTable } from './index'

export const FACT_LEADS_ACC_DAILY_DTLS_SNP: TableColumns = {
  datasetId: 'S4',
  tableId: 'Fact_Leads_Acc_Daily_Dtls_Snp',
  tableName: 'Lead Funnel Snapshot (Daily)',
  description: 'Snapshot table for lead pipeline tracking - avoids cross-project reference issues',

  columns: {
    // ===== Pipeline Date Columns (Lead Journey) =====

    received_date: {
      columnName: 'received_date',
      displayName: 'Received Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date and time when the lead was first received into the system',
      businessPurpose: 'Start of lead funnel - primary date for lead aging and trends',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: [
        'DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)',
        "DATE(received_date) = CURRENT_DATE('America/New_York')",
      ],

      aggregationExamples: [
        'COUNT(*) ... GROUP BY DATE(received_date)',
        "FORMAT_DATE('%Y-%m', DATE(received_date)) as month",
      ],

      sampleValues: ['2026-01-20 14:32:15 UTC', '2026-01-22 09:15:00 UTC'],
      valueFormat: 'YYYY-MM-DD HH:MM:SS UTC',

      sourceSystem: 'lead_exec',
      notes: 'Stored as TIMESTAMP but commonly cast to DATE() for aggregation',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    scheduled_date: {
      columnName: 'scheduled_date',
      displayName: 'Scheduled Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date when the inspection was scheduled with the customer',
      businessPurpose: 'Funnel stage 2 - tracks lead progression and scheduling rate',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: ['scheduled_date IS NOT NULL', 'scheduled_date IS NULL (not scheduled)'],

      aggregationExamples: [
        'COUNTIF(scheduled_date IS NOT NULL) as scheduled_count',
        'SAFE_DIVIDE(COUNTIF(scheduled_date IS NOT NULL), COUNT(*)) as schedule_rate',
      ],

      sampleValues: ['2026-01-21 10:00:00 UTC', 'NULL (not scheduled)'],

      sourceSystem: 'lead_exec',
      notes: 'NULL indicates lead not yet scheduled for inspection',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    inspected_date: {
      columnName: 'inspected_date',
      displayName: 'Inspected Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date when the inspection was completed',
      businessPurpose: 'Funnel stage 3 - tracks fulfillment rate and inspection completion',
      businessOwner: 'Operations',
      domain: 'operations',

      commonFilters: [
        'inspected_date IS NOT NULL',
        'DATE(inspected_date) = @inspectionDate',
      ],

      aggregationExamples: [
        'COUNTIF(inspected_date IS NOT NULL) as inspected_count',
        'SAFE_DIVIDE(COUNTIF(inspected_date IS NOT NULL), COUNTIF(scheduled_date IS NOT NULL)) as fulfillment_rate',
      ],

      sampleValues: ['2026-01-22 14:30:00 UTC', 'NULL (not inspected)'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    proposed_date: {
      columnName: 'proposed_date',
      displayName: 'Proposed Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date when the proposal/quote was sent to the customer',
      businessPurpose: 'Funnel stage 4 - tracks proposal rate and sales activity',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: ['proposed_date IS NOT NULL'],

      aggregationExamples: [
        'COUNTIF(proposed_date IS NOT NULL) as proposed_count',
        'SAFE_DIVIDE(COUNTIF(proposed_date IS NOT NULL), COUNTIF(inspected_date IS NOT NULL)) as offer_rate',
      ],

      sampleValues: ['2026-01-22 16:45:00 UTC', 'NULL (no proposal)'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    sold_date: {
      columnName: 'sold_date',
      displayName: 'Sold Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date when the lead was converted to a sale (won)',
      businessPurpose: 'Funnel stage 5 (final) - conversion metric and revenue attribution',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: ['sold_date IS NOT NULL', 'DATE(sold_date) >= @startDate'],

      aggregationExamples: [
        'COUNTIF(sold_date IS NOT NULL) as sold_count',
        'SAFE_DIVIDE(COUNTIF(sold_date IS NOT NULL), COUNT(*)) as conversion_rate',
      ],

      sampleValues: ['2026-01-23 11:20:00 UTC', 'NULL (not sold)'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    cancel_date: {
      columnName: 'cancel_date',
      displayName: 'Cancel Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date when the lead was cancelled/lost',
      businessPurpose: 'Tracks lead cancellations and funnel drop-off analysis',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: ['cancel_date IS NOT NULL'],

      aggregationExamples: [
        'COUNTIF(cancel_date IS NOT NULL) as cancelled_count',
        'AVG(DATE_DIFF(DATE(cancel_date), DATE(received_date), DAY)) as avg_days_to_cancel',
      ],

      sampleValues: ['2026-01-24 09:00:00 UTC', 'NULL (active)'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    // ===== Classification Columns =====

    primary_pest_report_group: {
      columnName: 'primary_pest_report_group',
      displayName: 'Pest Type',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Primary pest type category for this lead',
      businessPurpose: 'Product segmentation and service type analysis',
      businessOwner: 'Product Management',
      domain: 'product',

      commonFilters: [
        "primary_pest_report_group = 'Rodent'",
        "primary_pest_report_group IN ('Ant', 'Rodent', 'Termite')",
      ],

      aggregationExamples: [
        'COUNT(*) ... GROUP BY primary_pest_report_group ORDER BY count DESC',
      ],

      sampleValues: ['Rodent', 'Ant', 'Termite', 'Cockroach', 'Bed Bug'],
      enumValues: [
        { value: 'Rodent', label: 'Rodent Control' },
        { value: 'Ant', label: 'Ant Control' },
        { value: 'Termite', label: 'Termite Services' },
        { value: 'Cockroach', label: 'Cockroach Control' },
        { value: 'Bed Bug', label: 'Bed Bug Treatment' },
      ],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    cancel_reason: {
      columnName: 'cancel_reason',
      displayName: 'Cancel Reason',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Reason code or description for why the lead was cancelled',
      businessPurpose: 'Root cause analysis for lead drop-off and win-back strategies',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      aggregationExamples: [
        'COUNT(*) ... GROUP BY cancel_reason WHERE cancel_date IS NOT NULL',
      ],

      sampleValues: ['Price too high', 'Went with competitor', 'No longer needed'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      notes: 'NULL when cancel_date IS NULL',
      lastVerified: '2026-01-29',
    },

    lead_date: {
      columnName: 'lead_date',
      displayName: 'Lead Date',
      bigQueryType: 'DATE',
      nullable: true,
      description: 'Derived date field from received_date (DATE type for efficiency)',
      businessPurpose: 'Optimized aggregation and grouping by date (avoids TIMESTAMP casting)',
      businessOwner: 'Data Platform',
      domain: 'sales',

      commonFilters: [
        'lead_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)',
        'lead_date BETWEEN @startDate AND @endDate',
      ],

      aggregationExamples: ['COUNT(*) ... GROUP BY lead_date ORDER BY lead_date'],

      sampleValues: ['2026-01-20', '2026-01-22', '2026-01-25'],
      valueFormat: 'YYYY-MM-DD',

      sourceSystem: 'lead_exec',
      transformationApplied: 'DATE(received_date)',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    // ===== Geography/Organization Columns =====

    market: {
      columnName: 'market',
      displayName: 'Market Code',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Market code (highest organizational level)',
      businessPurpose: 'Market-level filtering and executive reporting',
      businessOwner: 'Operations',
      domain: 'geography',

      commonFilters: ['market = @marketCode', 'market IN (@marketCodes)'],

      aggregationExamples: ['COUNT(*) ... GROUP BY market'],

      sampleValues: ['NE', 'SE', 'MW', 'W'],
      enumValues: [
        { value: 'NE', label: 'Northeast' },
        { value: 'SE', label: 'Southeast' },
        { value: 'MW', label: 'Midwest' },
        { value: 'W', label: 'West' },
      ],

      joinKeys: ['S2.VwUnf_Branch ON market = RTX_Market_Code'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    region: {
      columnName: 'region',
      displayName: 'Region Code',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Region code (mid-level organizational hierarchy)',
      businessPurpose: 'Regional filtering and performance tracking',
      businessOwner: 'Operations',
      domain: 'geography',

      commonFilters: ['region = @regionCode', 'region IN (@regionCodes)'],

      aggregationExamples: ['COUNT(*) ... GROUP BY region'],

      sampleValues: ['NE-01', 'SE-03', 'MW-02'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    report_branch: {
      columnName: 'report_branch',
      displayName: 'Branch Code',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Branch code responsible for this lead',
      businessPurpose: 'Branch-level lead attribution and performance',
      businessOwner: 'Operations',
      domain: 'geography',

      commonFilters: ['report_branch = @branchCode', 'report_branch IN (@branchCodes)'],

      joinKeys: [
        'S2.VwUnf_Branch ON CAST(report_branch AS STRING) = Current_State_Branch_Code',
      ],

      aggregationExamples: ['COUNT(*) ... GROUP BY report_branch'],

      sampleValues: ['1001', '2050', '3125'],
      valueFormat: 'Numeric string (3-4 digits)',

      sourceSystem: 'rtx_data_hub',
      notes: 'Often cast to STRING for joins with branch dimension tables',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    contact_state: {
      columnName: 'contact_state',
      displayName: 'Contact State',
      bigQueryType: 'STRING',
      nullable: true,
      maxLength: 2,
      description: 'US state code where the customer is located',
      businessPurpose: 'Geographic reporting and regional trends',
      businessOwner: 'Sales Operations',
      domain: 'geography',

      commonFilters: [
        "contact_state = 'CA'",
        "contact_state IN ('CA', 'TX', 'FL', 'NY')",
      ],

      aggregationExamples: ['COUNT(*) ... GROUP BY contact_state ORDER BY count DESC'],

      sampleValues: ['CA', 'TX', 'FL', 'NY', 'PA'],
      valueFormat: 'Two-letter state code (uppercase)',

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    // ===== Branch Dimension Join Columns (from S2.VwUnf_Branch) =====

    RTX_Market_Name: {
      columnName: 'RTX_Market_Name',
      displayName: 'Market Name',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Human-readable market name (from branch dimension join)',
      businessPurpose: 'Display name for market in reports and dashboards',
      businessOwner: 'Operations',
      domain: 'geography',

      joinKeys: ['S2.VwUnf_Branch.RTX_Market_Name'],

      sampleValues: ['Northeast Market', 'Southeast Market', 'Midwest Market'],

      sourceSystem: 'rtx_data_hub',
      notes: 'Populated via JOIN with S2.VwUnf_Branch on branch codes',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    RTX_Region_Name: {
      columnName: 'RTX_Region_Name',
      displayName: 'Region Name',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Human-readable region name (from branch dimension join)',
      businessPurpose: 'Display name for region in reports and dashboards',
      businessOwner: 'Operations',
      domain: 'geography',

      joinKeys: ['S2.VwUnf_Branch.RTX_Region_Name'],

      sampleValues: ['Northeast Region 1', 'Southeast Region 3'],

      sourceSystem: 'rtx_data_hub',
      notes: 'Populated via JOIN with S2.VwUnf_Branch on branch codes',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    RTX_Branch_Name: {
      columnName: 'RTX_Branch_Name',
      displayName: 'Branch Name',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Human-readable branch name (from branch dimension join)',
      businessPurpose: 'Display name for branch in reports and dashboards',
      businessOwner: 'Operations',
      domain: 'geography',

      joinKeys: ['S2.VwUnf_Branch.RTX_Branch_Name'],

      sampleValues: ['Boston Branch', 'Dallas Branch', 'Los Angeles Branch'],

      sourceSystem: 'rtx_data_hub',
      notes: 'Populated via JOIN with S2.VwUnf_Branch on branch codes',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },
  },
}

// Register this table in the global registry
registerTable(FACT_LEADS_ACC_DAILY_DTLS_SNP)

export default FACT_LEADS_ACC_DAILY_DTLS_SNP
