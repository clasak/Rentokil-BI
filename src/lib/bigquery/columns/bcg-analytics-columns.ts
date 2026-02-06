/**
 * Column Metadata for BCG_RTD_DB Dataset
 *
 * Tables: DR_ContractSales (3.2M rows), DR_Leads (3.3M rows)
 * Purpose: BCG analytics and reporting dataset
 * Owner: Data Platform Team
 * Refresh: Every 6 hours
 *
 * Used by queries:
 * - BCG analytics queries
 * - Sales analytics
 * - Lead analytics
 */

import type { TableColumns } from './types'
import { registerTable } from './index'

// DR_ContractSales table
export const DR_CONTRACT_SALES: TableColumns = {
  datasetId: 'BCG_RTD_DB',
  tableId: 'DR_ContractSales',
  tableName: 'BCG Contract Sales Analytics',
  description: 'BCG sales analytics with full contract lifecycle',

  columns: {
    sales_id: {
      columnName: 'sales_id',
      displayName: 'Sales ID',
      bigQueryType: 'INT64',
      nullable: false,
      mode: 'REQUIRED',
      description: 'Unique sales/contract identifier',
      businessPurpose: 'Primary key for sales transactions',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      joinKeys: ['W3_Contract_Checker.T0_unf_Contract_All ON sales_id = salesID'],

      sampleValues: ['12345678', '23456789'],
      valueFormat: 'Integer (8-9 digits)',

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    sell_date: {
      columnName: 'sell_date',
      displayName: 'Sell Date',
      bigQueryType: 'DATE',
      nullable: true,
      description: 'Date contract was sold',
      businessPurpose: 'Primary date for sales trending and analysis',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: [
        'sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)',
      ],

      aggregationExamples: [
        "FORMAT_DATE('%Y-%m', sell_date) as month",
        'COUNT(*) ... GROUP BY sell_date',
      ],

      sampleValues: ['2026-01-15', '2026-01-20'],
      valueFormat: 'YYYY-MM-DD',

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    sell_date_year_month: {
      columnName: 'sell_date_year_month',
      displayName: 'Sell Year-Month',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Year-month in YYYYMM format',
      businessPurpose: 'Monthly aggregation and trending',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      sampleValues: ['202601', '202512'],
      valueFormat: 'YYYYMM (integer)',

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    start_date: {
      columnName: 'start_date',
      displayName: 'Start Date',
      bigQueryType: 'DATE',
      nullable: true,
      description: 'Service start date',
      businessPurpose: 'Track installation and speed-to-start',
      businessOwner: 'Operations',
      domain: 'operations',

      sampleValues: ['2026-01-18', '2026-01-25'],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    cancel_date: {
      columnName: 'cancel_date',
      displayName: 'Cancel Date',
      bigQueryType: 'DATE',
      nullable: true,
      description: 'Cancellation date if cancelled',
      businessPurpose: 'Track cancellations and churn',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      sampleValues: ['2026-01-22', 'NULL'],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    product_group: {
      columnName: 'product_group',
      displayName: 'Product Group',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Product line category',
      businessPurpose: 'Product segmentation and revenue analysis',
      businessOwner: 'Product Management',
      domain: 'product',

      aggregationExamples: [
        'COUNT(*) ... GROUP BY product_group',
      ],

      sampleValues: ['Pest', 'Termite', 'Wildlife'],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    service_type_desc: {
      columnName: 'service_type_desc',
      displayName: 'Service Type Description',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Service type description (Commercial, Residential, etc.)',
      businessPurpose: 'Service type segmentation',
      businessOwner: 'Sales Operations',
      domain: 'product',

      sampleValues: ['Commercial', 'Residential Initial', 'Residential Recurring'],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    contract_value: {
      columnName: 'contract_value',
      displayName: 'Contract Value',
      bigQueryType: 'FLOAT64',
      nullable: true,
      precision: 2,
      description: 'Total contract value',
      businessPurpose: 'Revenue tracking and forecasting',
      businessOwner: 'Finance',
      domain: 'finance',

      aggregationExamples: [
        'SUM(contract_value) as total_revenue',
        'AVG(contract_value) as avg_deal_size',
      ],

      sampleValues: ['1200.00', '3500.00'],
      valueFormat: '$#,###.##',

      sourceSystem: 'sales_exec',

      sensitivity: 'confidential',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    sales_person: {
      columnName: 'sales_person',
      displayName: 'Sales Person',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Sales rep name',
      businessPurpose: 'Rep performance tracking',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      sampleValues: ['[Employee Name]'],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    sales_person_id: {
      columnName: 'sales_person_id',
      displayName: 'Sales Person ID',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Sales rep employee ID',
      businessPurpose: 'Rep identification and joins',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      sampleValues: ['12345', '23456'],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    customer_name: {
      columnName: 'customer_name',
      displayName: 'Customer Name',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Customer name',
      businessPurpose: 'Customer identification',
      businessOwner: 'Sales Operations',
      domain: 'customer',

      sampleValues: ['[REDACTED - PII]'],

      sourceSystem: 'sales_exec',

      sensitivity: 'confidential',
      piiFlag: true,
      encryptionRequired: true,
      lastVerified: '2026-01-29',
    },

    branch: {
      columnName: 'branch',
      displayName: 'Branch',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Branch identifier',
      businessPurpose: 'Branch-level attribution',
      businessOwner: 'Operations',
      domain: 'geography',

      sampleValues: ['1001', '2050'],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },
  },
}

// DR_Leads table
export const DR_LEADS: TableColumns = {
  datasetId: 'BCG_RTD_DB',
  tableId: 'DR_Leads',
  tableName: 'BCG Leads Analytics',
  description: 'BCG lead analytics with funnel tracking',

  columns: {
    rtx_lead_uid: {
      columnName: 'rtx_lead_uid',
      displayName: 'RTX Lead UID',
      bigQueryType: 'STRING',
      nullable: false,
      mode: 'REQUIRED',
      description: 'Unique lead identifier',
      businessPurpose: 'Primary key for lead tracking',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      sampleValues: ['UID-12345-67890', 'UID-23456-78901'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    lead_ID: {
      columnName: 'lead_ID',
      displayName: 'Lead ID',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Numeric lead identifier',
      businessPurpose: 'Lead identification and joins',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      sampleValues: ['1234567', '2345678'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    business: {
      columnName: 'business',
      displayName: 'Business',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Business unit identifier',
      businessPurpose: 'Business unit segmentation',
      businessOwner: 'Operations',
      domain: 'geography',

      sampleValues: ['Rentokil', 'Terminix'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    received_date: {
      columnName: 'received_date',
      displayName: 'Received Date',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date lead was received',
      businessPurpose: 'Lead funnel entry point',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: [
        'DATE(received_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)',
      ],

      sampleValues: ['2026-01-20 10:15:00 UTC'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    market_type: {
      columnName: 'market_type',
      displayName: 'Market Type',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Market code/identifier',
      businessPurpose: 'Market-level filtering',
      businessOwner: 'Operations',
      domain: 'geography',

      sampleValues: ['NE', 'SE', 'MW'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    lead_type: {
      columnName: 'lead_type',
      displayName: 'Lead Type',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Lead status/type (Sold, Proposed, New, etc.)',
      businessPurpose: 'Lead funnel stage classification',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: [
        "lead_type IN ('Sold', 'Won', 'Proposed', 'New')",
      ],

      sampleValues: ['Sold', 'Proposed', 'New', 'Cancelled'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    lead_source: {
      columnName: 'lead_source',
      displayName: 'Lead Source',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Lead source channel',
      businessPurpose: 'Marketing attribution and channel analysis',
      businessOwner: 'Marketing',
      domain: 'sales',

      aggregationExamples: [
        'COUNT(*) ... GROUP BY lead_source',
      ],

      sampleValues: ['Web', 'Phone', 'Referral', 'Marketing'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    lead_channel_1: {
      columnName: 'lead_channel_1',
      displayName: 'Lead Channel 1',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Primary lead channel detail',
      businessPurpose: 'Detailed channel attribution',
      businessOwner: 'Marketing',
      domain: 'sales',

      sampleValues: ['Google Ads', 'Organic Search', 'Direct Mail'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    primary_pest: {
      columnName: 'primary_pest',
      displayName: 'Primary Pest',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Primary pest type for this lead',
      businessPurpose: 'Product segmentation and service type analysis',
      businessOwner: 'Product Management',
      domain: 'product',

      sampleValues: ['Rodent', 'Ant', 'Termite', 'Cockroach'],

      sourceSystem: 'lead_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },
  },
}

registerTable(DR_CONTRACT_SALES)
registerTable(DR_LEADS)

const bcgAnalyticsColumns = { DR_CONTRACT_SALES, DR_LEADS }
export default bcgAnalyticsColumns
