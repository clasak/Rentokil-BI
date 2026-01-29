/**
 * Column Metadata for Operations Tables
 *
 * Tables:
 * - S0.raw_RNA_PNIDetails_Daily (Termite PNI inspections)
 * - S0_TMX.Inspections (Field service inspections)
 *
 * Purpose: Operations and field service tracking
 * Owner: Operations
 */

import type { TableColumns } from './types'
import { registerTable } from './index'

// S0.raw_RNA_PNIDetails_Daily
export const RAW_RNA_PNI_DETAILS_DAILY: TableColumns = {
  datasetId: 'S0',
  tableId: 'raw_RNA_PNIDetails_Daily',
  tableName: 'PNI Termite Inspection Details',
  description: 'Daily termite PNI (Pre-Need Inspection) details from RNA system',

  columns: {
    orderdate: {
      columnName: 'orderdate',
      displayName: 'Order Date',
      bigQueryType: 'DATE',
      nullable: true,
      description: 'Date of PNI inspection order',
      businessPurpose: 'Primary date for PNI tracking and trending',
      businessOwner: 'Operations',
      domain: 'operations',

      commonFilters: [
        'orderdate >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)',
      ],

      sampleValues: ['2026-01-15', '2026-01-20'],
      valueFormat: 'YYYY-MM-DD',

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    ordertype: {
      columnName: 'ordertype',
      displayName: 'Order Type',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Type of PNI order',
      businessPurpose: 'Order classification and reporting',
      businessOwner: 'Operations',
      domain: 'operations',

      sampleValues: ['PNI', 'Renewal', 'Initial'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    setup_total: {
      columnName: 'setup_total',
      displayName: 'Setup Total',
      bigQueryType: 'FLOAT64',
      nullable: true,
      precision: 2,
      description: 'Setup/installation charges',
      businessPurpose: 'Revenue tracking for setup fees',
      businessOwner: 'Finance',
      domain: 'finance',

      aggregationExamples: [
        'SUM(setup_total) as total_setup_revenue',
      ],

      sampleValues: ['150.00', '250.00'],
      valueFormat: '$#,###.##',

      sourceSystem: 'pestpac',

      sensitivity: 'confidential',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    order_total: {
      columnName: 'order_total',
      displayName: 'Order Total',
      bigQueryType: 'FLOAT64',
      nullable: true,
      precision: 2,
      description: 'Total order value',
      businessPurpose: 'Total revenue tracking for PNI orders',
      businessOwner: 'Finance',
      domain: 'finance',

      aggregationExamples: [
        'SUM(order_total) as total_pni_revenue',
        'AVG(order_total) as avg_pni_value',
      ],

      sampleValues: ['1200.00', '1800.00'],
      valueFormat: '$#,###.##',

      sourceSystem: 'pestpac',

      sensitivity: 'confidential',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    branchnumber: {
      columnName: 'branchnumber',
      displayName: 'Branch Number',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Branch code responsible for PNI',
      businessPurpose: 'Branch-level attribution',
      businessOwner: 'Operations',
      domain: 'geography',

      commonFilters: [
        'branchnumber = @branchCode',
      ],

      sampleValues: ['1001', '2050'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    status: {
      columnName: 'status',
      displayName: 'Status',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'PNI order status',
      businessPurpose: 'Track completion and pending inspections',
      businessOwner: 'Operations',
      domain: 'operations',

      sampleValues: ['Completed', 'Pending', 'Cancelled'],
      enumValues: [
        { value: 'Completed', label: 'Completed' },
        { value: 'Pending', label: 'Pending' },
        { value: 'Cancelled', label: 'Cancelled' },
      ],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    inspection_date: {
      columnName: 'inspection_date',
      displayName: 'Inspection Date',
      bigQueryType: 'DATE',
      nullable: true,
      description: 'Actual inspection completion date',
      businessPurpose: 'Track inspection completion and speed',
      businessOwner: 'Operations',
      domain: 'operations',

      sampleValues: ['2026-01-16', '2026-01-22'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    technician_id: {
      columnName: 'technician_id',
      displayName: 'Technician ID',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Technician who performed inspection',
      businessPurpose: 'Technician productivity and quality tracking',
      businessOwner: 'Operations',
      domain: 'operations',

      sampleValues: ['TECH-12345', 'TECH-23456'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    service_type: {
      columnName: 'service_type',
      displayName: 'Service Type',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Type of termite service',
      businessPurpose: 'Service classification and product analysis',
      businessOwner: 'Product Management',
      domain: 'product',

      sampleValues: ['Termite PNI', 'Termite Treatment', 'Termite Renewal'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    renewal_date: {
      columnName: 'renewal_date',
      displayName: 'Renewal Date',
      bigQueryType: 'DATE',
      nullable: true,
      description: 'PNI renewal date',
      businessPurpose: 'Renewal tracking and revenue forecasting',
      businessOwner: 'Operations',
      domain: 'operations',

      commonFilters: [
        'renewal_date >= CURRENT_DATE()',
      ],

      sampleValues: ['2027-01-15', '2027-06-20'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },
  },
}

// S0_TMX.Inspections (adding to s0-tmx-columns.ts conceptually)
export const INSPECTIONS: TableColumns = {
  datasetId: 'S0_TMX',
  tableId: 'Inspections',
  tableName: 'Field Service Inspections',
  description: 'Field service inspection records from TMX (3.3M+ rows)',

  columns: {
    DateInspected: {
      columnName: 'DateInspected',
      displayName: 'Date Inspected',
      bigQueryType: 'TIMESTAMP',
      nullable: true,
      description: 'Date and time inspection was performed',
      businessPurpose: 'Primary date for inspection tracking and SLA monitoring',
      businessOwner: 'Operations',
      domain: 'operations',

      commonFilters: [
        'DATE(DateInspected) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)',
      ],

      sampleValues: ['2026-01-20 14:30:00 UTC'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    InspectionID: {
      columnName: 'InspectionID',
      displayName: 'Inspection ID',
      bigQueryType: 'INT64',
      nullable: false,
      mode: 'REQUIRED',
      description: 'Unique inspection identifier',
      businessPurpose: 'Primary key for inspection tracking',
      businessOwner: 'Operations',
      domain: 'operations',

      sampleValues: ['12345678', '23456789'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    TechnicianID: {
      columnName: 'TechnicianID',
      displayName: 'Technician ID',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Technician who performed inspection',
      businessPurpose: 'Technician productivity tracking',
      businessOwner: 'Operations',
      domain: 'operations',

      commonFilters: [
        'TechnicianID = @techId',
      ],

      sampleValues: ['TECH-001', 'TECH-002'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    ServiceType: {
      columnName: 'ServiceType',
      displayName: 'Service Type',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Type of service inspection',
      businessPurpose: 'Service classification',
      businessOwner: 'Operations',
      domain: 'product',

      sampleValues: ['Initial Inspection', 'Follow-up', 'Renewal'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    CompletionStatus: {
      columnName: 'CompletionStatus',
      displayName: 'Completion Status',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Inspection completion status',
      businessPurpose: 'Track completed vs pending inspections',
      businessOwner: 'Operations',
      domain: 'operations',

      commonFilters: [
        "CompletionStatus = 'Completed'",
      ],

      sampleValues: ['Completed', 'Pending', 'Cancelled'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    BranchCode: {
      columnName: 'BranchCode',
      displayName: 'Branch Code',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Branch responsible for inspection',
      businessPurpose: 'Branch-level attribution',
      businessOwner: 'Operations',
      domain: 'geography',

      sampleValues: ['1001', '2050'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    Duration: {
      columnName: 'Duration',
      displayName: 'Duration (minutes)',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Inspection duration in minutes',
      businessPurpose: 'Efficiency tracking and resource planning',
      businessOwner: 'Operations',
      domain: 'operations',

      aggregationExamples: [
        'AVG(Duration) as avg_inspection_time',
      ],

      sampleValues: ['45', '60', '90'],
      typicalRange: { min: 15, max: 180 },

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    CustomerID: {
      columnName: 'CustomerID',
      displayName: 'Customer ID',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Customer identifier',
      businessPurpose: 'Link to customer master',
      businessOwner: 'Operations',
      domain: 'customer',

      sampleValues: ['100123', '200456'],

      sourceSystem: 'pestpac',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },
  },
}

registerTable(RAW_RNA_PNI_DETAILS_DAILY)
registerTable(INSPECTIONS)

export default { RAW_RNA_PNI_DETAILS_DAILY, INSPECTIONS }
