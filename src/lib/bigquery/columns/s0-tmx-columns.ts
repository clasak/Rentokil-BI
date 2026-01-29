/**
 * Column Metadata for S0_TMX Dataset
 *
 * Primary table: tmx_lead (2.2M+ rows)
 * Purpose: TMX lead tracking - source system for SALTI dashboard
 * Owner: Sales Operations
 * Refresh: Hourly to Real-time
 *
 * Used by queries:
 * - SALTI dashboard (8 queries: daily-check-in, productivity, proposal-pipeline, etc.)
 * - Lead Service Engine queries
 * - Executive dashboards
 */

import type { TableColumns } from './types'
import { registerTable } from './index'

export const TMX_LEAD: TableColumns = {
  datasetId: 'S0_TMX',
  tableId: 'tmx_lead',
  tableName: 'TMX Lead Transactions',
  description: 'Source system lead data from TMX - real-time lead pipeline tracking',

  columns: {
    // ===== Lead Pipeline Dates =====

    received_date: {
      columnName: 'received_date',
      displayName: 'Received Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date and time when lead entered the system',
      businessPurpose: 'Lead funnel entry point - used for age calculations and trends',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: [
        'DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)',
        'DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)',
      ],

      aggregationExamples: [
        'COUNT(*) ... GROUP BY DATE(received_date)',
        'DATE_DIFF(CURRENT_DATE(), DATE(received_date), DAY) as lead_age',
      ],

      sampleValues: ['2026-01-20 08:15:30 UTC', '2026-01-22 14:22:00 UTC'],
      valueFormat: 'YYYY-MM-DD HH:MM:SS UTC',

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    assigned_date: {
      columnName: 'assigned_date',
      displayName: 'Assigned Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date when lead was assigned to a sales rep',
      businessPurpose: 'Tracks routing speed and assignment efficiency',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: ['assigned_date IS NOT NULL', 'assigned_date IS NULL (unassigned)'],

      calculationFormulas: [
        'DATE_DIFF(DATE(assigned_date), DATE(received_date), DAY) as days_to_assign',
      ],

      sampleValues: ['2026-01-20 09:00:00 UTC', 'NULL (not assigned)'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    scheduled_date: {
      columnName: 'scheduled_date',
      displayName: 'Scheduled Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date when inspection was scheduled',
      businessPurpose: 'SALTI funnel stage 2 - tracks schedule rate',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: ['scheduled_date IS NOT NULL'],

      aggregationExamples: [
        'COUNTIF(scheduled_date IS NOT NULL) as scheduled',
        'SAFE_DIVIDE(COUNTIF(scheduled_date IS NOT NULL), COUNT(*)) as schedule_rate',
      ],

      sampleValues: ['2026-01-21 10:00:00 UTC', 'NULL'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    inspected_date: {
      columnName: 'inspected_date',
      displayName: 'Inspected Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date when inspection was completed',
      businessPurpose: 'SALTI funnel stage 3 - tracks fulfillment rate',
      businessOwner: 'Operations',
      domain: 'operations',

      aggregationExamples: [
        'COUNTIF(inspected_date IS NOT NULL) as inspected',
        'SAFE_DIVIDE(COUNTIF(inspected_date IS NOT NULL), COUNTIF(scheduled_date IS NOT NULL)) as fulfillment_rate',
      ],

      sampleValues: ['2026-01-22 14:30:00 UTC', 'NULL'],

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
      description: 'Date when proposal/quote was sent',
      businessPurpose: 'SALTI funnel stage 4 - tracks offer rate',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      aggregationExamples: [
        'COUNTIF(proposed_date IS NOT NULL) as proposed',
        'SAFE_DIVIDE(COUNTIF(proposed_date IS NOT NULL), COUNTIF(inspected_date IS NOT NULL)) as offer_rate',
      ],

      sampleValues: ['2026-01-22 16:00:00 UTC', 'NULL'],

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
      description: 'Date when lead was converted to sale (won)',
      businessPurpose: 'SALTI funnel stage 5 (final) - win rate calculation',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      aggregationExamples: [
        'COUNTIF(sold_date IS NOT NULL) as sold',
        'SAFE_DIVIDE(COUNTIF(sold_date IS NOT NULL), COUNTIF(proposed_date IS NOT NULL)) as win_rate',
        'SAFE_DIVIDE(COUNTIF(sold_date IS NOT NULL), COUNT(*)) as close_rate',
      ],

      sampleValues: ['2026-01-23 11:00:00 UTC', 'NULL'],

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
      description: 'Date when lead was cancelled/lost',
      businessPurpose: 'Tracks funnel drop-off and cancellation analysis',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: ['cancel_date IS NOT NULL', 'cancel_date IS NULL (active)'],

      sampleValues: ['2026-01-24 09:30:00 UTC', 'NULL'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    uncancel_date: {
      columnName: 'uncancel_date',
      displayName: 'Uncancel Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date when cancelled lead was reactivated',
      businessPurpose: 'Tracks lead resurrection and win-back efforts',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      sampleValues: ['2026-01-25 10:00:00 UTC', 'NULL (not uncancelled)'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      notes: 'Rare - only populated when cancelled lead is revived',
      lastVerified: '2026-01-29',
    },

    // ===== Assignment/Ownership Columns =====

    curr_assigned_employee_sid: {
      columnName: 'curr_assigned_employee_sid',
      displayName: 'Assigned Employee ID',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Current employee (sales rep) assigned to this lead',
      businessPurpose: 'Sales rep attribution and performance tracking',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: [
        'curr_assigned_employee_sid = @employeeId',
        'curr_assigned_employee_sid IS NOT NULL',
      ],

      joinKeys: ['S0_TMX.tmx_employee ON curr_assigned_employee_sid = employee_sid'],

      aggregationExamples: [
        'COUNT(*) ... GROUP BY curr_assigned_employee_sid',
        'CAST(curr_assigned_employee_sid AS STRING) for joins',
      ],

      sampleValues: ['12345', '23456', '34567'],
      valueFormat: 'Integer (5-6 digits)',

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      notes: 'Join to tmx_employee table for employee names',
      lastVerified: '2026-01-29',
    },

    assigned_bunit_sid: {
      columnName: 'assigned_bunit_sid',
      displayName: 'Assigned Business Unit ID',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Business unit (branch) assigned to this lead',
      businessPurpose: 'Branch-level lead attribution and routing',
      businessOwner: 'Operations',
      domain: 'geography',

      commonFilters: [
        'assigned_bunit_sid = @branchId',
        'assigned_bunit_sid IN (@branchIds)',
      ],

      joinKeys: ['S0_TMX.tmx_business_unit ON assigned_bunit_sid = business_unit_sid'],

      aggregationExamples: ['COUNT(*) ... GROUP BY assigned_bunit_sid'],

      sampleValues: ['1001', '2050', '3125'],
      valueFormat: 'Integer (4 digits)',

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    originating_bunit_sid: {
      columnName: 'originating_bunit_sid',
      displayName: 'Originating Business Unit ID',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Original business unit where lead first entered',
      businessPurpose: 'Tracks lead transfers and origination analysis',
      businessOwner: 'Sales Operations',
      domain: 'geography',

      sampleValues: ['1001', '2050'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      notes: 'Different from assigned_bunit_sid if lead was transferred',
      lastVerified: '2026-01-29',
    },

    // ===== Primary Keys & Foreign Keys =====

    tmx_lead_sid: {
      columnName: 'tmx_lead_sid',
      displayName: 'TMX Lead ID',
      bigQueryType: 'INT64',
      nullable: false,
      mode: 'REQUIRED',
      description: 'Primary key - unique identifier for this lead in TMX system',
      businessPurpose: 'Primary key for joins and lead tracking',
      businessOwner: 'Data Platform',
      domain: 'sales',

      joinKeys: ['Primary key for tmx_lead table'],

      sampleValues: ['1234567890', '2345678901'],
      valueFormat: 'Integer (10 digits)',
      validationRules: ['Must be unique', 'Must be > 0'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      notes: 'Primary key; NOT NULL constraint enforced',
      lastVerified: '2026-01-29',
    },

    tmx_lead_prospect_sid: {
      columnName: 'tmx_lead_prospect_sid',
      displayName: 'TMX Lead Prospect ID',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Foreign key to prospect/customer record',
      businessPurpose: 'Links lead to customer/prospect master data',
      businessOwner: 'Data Platform',
      domain: 'customer',

      joinKeys: ['tmx_prospect ON tmx_lead_prospect_sid = prospect_sid'],

      sampleValues: ['9876543210', '8765432109'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    tmx_lead_attribute_sid: {
      columnName: 'tmx_lead_attribute_sid',
      displayName: 'TMX Lead Attribute ID',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Foreign key to lead attributes/characteristics',
      businessPurpose: 'Links to extended lead attributes (source, channel, etc.)',
      businessOwner: 'Data Platform',
      domain: 'sales',

      joinKeys: ['tmx_lead_attribute ON tmx_lead_attribute_sid = attribute_sid'],

      sampleValues: ['5555555', '6666666'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    // ===== Financial Columns =====

    raw_sales_amt: {
      columnName: 'raw_sales_amt',
      displayName: 'Raw Sales Amount',
      bigQueryType: 'FLOAT64',
      nullable: true,
      precision: 2,
      description: 'Initial quoted/proposed sales amount',
      businessPurpose: 'Revenue forecasting and deal sizing',
      businessOwner: 'Finance',
      domain: 'finance',

      aggregationExamples: [
        'SUM(raw_sales_amt) as total_pipeline_value',
        'AVG(raw_sales_amt) as avg_deal_size',
      ],

      sampleValues: ['1500.00', '3200.00', '850.00'],
      valueFormat: '$#,###.##',
      typicalRange: { min: 100, max: 50000 },

      sourceSystem: 'lead_exec',

      sensitivity: 'confidential',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    proposal_contract_amount: {
      columnName: 'proposal_contract_amount',
      displayName: 'Proposal Contract Amount',
      bigQueryType: 'FLOAT64',
      nullable: true,
      precision: 2,
      description: 'Final proposed contract value sent to customer',
      businessPurpose: 'Proposal value tracking and win rate analysis by deal size',
      businessOwner: 'Sales Operations',
      domain: 'finance',

      aggregationExamples: [
        'SUM(proposal_contract_amount) WHERE proposed_date IS NOT NULL',
        'AVG(proposal_contract_amount) WHERE sold_date IS NOT NULL',
      ],

      sampleValues: ['1450.00', '3100.00', '900.00'],
      valueFormat: '$#,###.##',

      sourceSystem: 'lead_exec',

      sensitivity: 'confidential',
      piiFlag: false,
      notes: 'May differ from raw_sales_amt due to negotiations or discounts',
      lastVerified: '2026-01-29',
    },

    activity_date: {
      columnName: 'activity_date',
      displayName: 'Last Activity Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date of most recent activity on this lead',
      businessPurpose: 'Identifies stale/inactive leads for follow-up',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: [
        'activity_date < DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY) (stale)',
      ],

      calculationFormulas: [
        'DATE_DIFF(CURRENT_DATE(), DATE(activity_date), DAY) as days_inactive',
      ],

      sampleValues: ['2026-01-28 15:00:00 UTC', '2026-01-15 09:30:00 UTC'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },
  },
}

// Register this table in the global registry
registerTable(TMX_LEAD)

export default TMX_LEAD
