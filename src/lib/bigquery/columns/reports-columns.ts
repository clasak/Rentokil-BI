/**
 * Column Metadata for Reports Dataset
 *
 * Primary table: VwUnf_dim_ar_detail
 * Purpose: Accounts Receivable aging and collections tracking
 * Owner: Finance
 * Refresh: Hourly
 *
 * Used by queries:
 * - getARDetails (finance.ts)
 * - getARByAging (finance.ts)
 */

import type { TableColumns } from './types'
import { registerTable } from './index'

export const VWUNF_DIM_AR_DETAIL: TableColumns = {
  datasetId: 'Reports',
  tableId: 'VwUnf_dim_ar_detail',
  tableName: 'AR Detail with Aging',
  description: 'Detailed accounts receivable with aging buckets and customer information',

  columns: {
    Outstanding_Amount: {
      columnName: 'Outstanding_Amount',
      displayName: 'Outstanding Amount',
      bigQueryType: 'NUMERIC',
      nullable: true,
      precision: 2,
      description: 'Current outstanding AR balance for this invoice',
      businessPurpose: 'Primary metric for AR tracking and collections prioritization',
      businessOwner: 'Finance',
      domain: 'finance',

      aggregationExamples: [
        'SUM(Outstanding_Amount) as total_ar',
        'SUM(CASE WHEN Age = \'120+\' THEN Outstanding_Amount END) as over_120',
      ],

      sampleValues: ['1250.50', '3400.00', '525.75'],
      valueFormat: '$#,###.##',

      sourceSystem: 'jde',

      sensitivity: 'confidential',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    Original_Amount: {
      columnName: 'Original_Amount',
      displayName: 'Original Invoice Amount',
      bigQueryType: 'NUMERIC',
      nullable: true,
      precision: 2,
      description: 'Original invoice amount before any payments',
      businessPurpose: 'Baseline for payment tracking and collection rate calculations',
      businessOwner: 'Finance',
      domain: 'finance',

      sampleValues: ['2000.00', '5000.00', '800.00'],
      valueFormat: '$#,###.##',

      sourceSystem: 'jde',

      sensitivity: 'confidential',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    Paid_Amount: {
      columnName: 'Paid_Amount',
      displayName: 'Paid Amount',
      bigQueryType: 'NUMERIC',
      nullable: true,
      precision: 2,
      description: 'Amount paid to date on this invoice',
      businessPurpose: 'Tracks partial payments and payment progress',
      businessOwner: 'Finance',
      domain: 'finance',

      calculationFormulas: [
        'Original_Amount - Outstanding_Amount = Paid_Amount',
      ],

      sampleValues: ['750.00', '1600.00', '275.00'],
      valueFormat: '$#,###.##',

      sourceSystem: 'jde',

      sensitivity: 'confidential',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    Days: {
      columnName: 'Days',
      displayName: 'Days Outstanding',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Number of days invoice has been outstanding',
      businessPurpose: 'Age calculation for aging bucket assignment',
      businessOwner: 'Finance',
      domain: 'finance',

      commonFilters: [
        'Days > 90',
        'Days > 120',
      ],

      aggregationExamples: [
        'AVG(Days) as avg_days_outstanding',
        'MAX(Days) as oldest_invoice',
      ],

      sampleValues: ['15', '45', '95', '150'],
      typicalRange: { min: 0, max: 365 },

      sourceSystem: 'jde',
      transformationApplied: 'DATE_DIFF(CURRENT_DATE, invoice_date, DAY)',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    Age: {
      columnName: 'Age',
      displayName: 'Aging Bucket',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Aging bucket category (Current, 1-30, 31-60, 61-90, 91-120, 120+)',
      businessPurpose: 'Standard AR aging buckets for reporting and collections workflow',
      businessOwner: 'Finance',
      domain: 'finance',

      commonFilters: [
        "Age IN ('91-120', '120+')",
        "Age = 'Current'",
      ],

      aggregationExamples: [
        'SUM(Outstanding_Amount) ... GROUP BY Age ORDER BY CASE Age WHEN \'Current\' THEN 1...',
      ],

      sampleValues: ['Current', '1-30', '31-60', '61-90', '91-120', '120+'],
      enumValues: [
        { value: 'Current', label: 'Current (0-30 days)' },
        { value: '1-30', label: '1-30 days' },
        { value: '31-60', label: '31-60 days' },
        { value: '61-90', label: '61-90 days' },
        { value: '91-120', label: '91-120 days' },
        { value: '120+', label: 'Over 120 days' },
      ],

      sourceSystem: 'jde',
      transformationApplied: 'CASE WHEN Days <= 30 THEN \'Current\' WHEN Days <= 60 THEN \'1-30\'...',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    Invoice_number: {
      columnName: 'Invoice_number',
      displayName: 'Invoice Number',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Unique invoice identifier from JDE',
      businessPurpose: 'Primary key for invoice tracking and customer inquiries',
      businessOwner: 'Finance',
      domain: 'finance',

      sampleValues: ['INV-2026-001234', 'INV-2026-005678'],
      valueFormat: 'INV-YYYY-######',

      sourceSystem: 'jde',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    CUSTNUM: {
      columnName: 'CUSTNUM',
      displayName: 'Customer Number',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'JDE customer number',
      businessPurpose: 'Links AR records to customer master data',
      businessOwner: 'Finance',
      domain: 'customer',

      joinKeys: ['Customer master tables ON CUSTNUM = customer_id'],

      sampleValues: ['100234', '200567', '300891'],
      valueFormat: 'Integer (6 digits)',

      sourceSystem: 'jde',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    invoice_date: {
      columnName: 'invoice_date',
      displayName: 'Invoice Date',
      bigQueryType: 'DATE',
      nullable: true,
      description: 'Date invoice was issued',
      businessPurpose: 'Base date for aging calculations',
      businessOwner: 'Finance',
      domain: 'finance',

      commonFilters: [
        'invoice_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)',
      ],

      aggregationExamples: [
        "FORMAT_DATE('%Y-%m', invoice_date) as invoice_month",
      ],

      sampleValues: ['2025-12-15', '2026-01-10', '2026-01-20'],
      valueFormat: 'YYYY-MM-DD',

      sourceSystem: 'jde',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    RTX_Market_Name: {
      columnName: 'RTX_Market_Name',
      displayName: 'Market Name',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Market name for organizational filtering',
      businessPurpose: 'Market-level AR reporting',
      businessOwner: 'Finance',
      domain: 'geography',

      commonFilters: [
        'RTX_Market_Name = @marketName',
      ],

      sampleValues: ['Northeast Market', 'Southeast Market'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    RTX_Region_Name: {
      columnName: 'RTX_Region_Name',
      displayName: 'Region Name',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Region name for organizational filtering',
      businessPurpose: 'Regional AR reporting',
      businessOwner: 'Finance',
      domain: 'geography',

      sampleValues: ['Northeast Region 1', 'Southeast Region 2'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    RTX_Branch_Codes: {
      columnName: 'RTX_Branch_Codes',
      displayName: 'Branch Code',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Branch code responsible for this AR',
      businessPurpose: 'Branch-level AR attribution',
      businessOwner: 'Finance',
      domain: 'geography',

      commonFilters: [
        'RTX_Branch_Codes = @branchCode',
      ],

      sampleValues: ['1001', '2050', '3125'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    RTX_Branch_Name: {
      columnName: 'RTX_Branch_Name',
      displayName: 'Branch Name',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Branch name for display',
      businessPurpose: 'Human-readable branch identification in AR reports',
      businessOwner: 'Finance',
      domain: 'geography',

      sampleValues: ['Boston Branch', 'Atlanta Branch', 'Chicago Branch'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },
  },
}

registerTable(VWUNF_DIM_AR_DETAIL)
export default VWUNF_DIM_AR_DETAIL
