/**
 * BigQuery Dataset Metadata
 *
 * Comprehensive metadata for all BigQuery datasets used in the BI platform.
 * This complements the data-dictionary.ts file with BigQuery-specific information.
 */

import type { DataSource } from './data-dictionary'

export interface BigQueryDatasetMetadata {
  datasetId: string
  name: string
  description: string
  tableCount: number
  viewCount?: number
  totalRows?: string
  totalSize?: string
  keyTables: string[]
  sourceSystems: DataSource[]
  refreshFrequency: string
  owner: string
  slaTarget?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
}

/**
 * Comprehensive BigQuery dataset metadata
 * Source: Live discovery from bidata-sharedus-production (2026-01-23)
 */
export const BIGQUERY_DATASETS_METADATA: BigQueryDatasetMetadata[] = [
  {
    datasetId: 'S4',
    name: 'S4 Unified Views',
    description: 'Unified views across all systems - single source of truth for leads, sales, and branch hierarchy',
    tableCount: 21,
    viewCount: 67,
    totalRows: '11.8M+',
    totalSize: '5.88 GB+',
    keyTables: [
      'Fact_Leads_Acc_Daily_Dtls_Snp',
      'Fact_ContractSales_Txn_Na_Daily_Dtl_Vw',
      'Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw',
      'VwUnf_Branch',
      'Branch_Hierarchy',
      'Fact_DSP_AllSales_Txn_Na_Daily',
      'Fact_PNI_Details_Txn_Na_Daily_Dtl_vw',
      'VwUnf_daily_ar'
    ],
    sourceSystems: ['rtx_data_hub'],
    refreshFrequency: 'Every 15 minutes',
    owner: 'Data Platform Team',
    slaTarget: '15 minutes',
    priority: 'critical'
  },
  {
    datasetId: 'S0_TMX',
    name: 'S0_TMX Source Data',
    description: 'TMX source data - leads, employees, inspections, business units (255 tables)',
    tableCount: 255,
    totalRows: '74.4M+ (leads), 1.29M (employees), 3.4M (inspections)',
    totalSize: '43.30 GB+ (leads), 0.62 GB (employees), 0.84 GB (inspections)',
    keyTables: [
      'tmx_lead',
      'tmx_lead_activity_fact',
      'tmx_employee',
      'Employees_Main',
      'Inspections',
      'tmx_sa_item',
      'tmx_business_unit',
      'Five9_CallLog_Export',
      'tmx_survey_Qualtrics_V5'
    ],
    sourceSystems: ['lead_exec', 'sales_exec', 'winning_formula', 'pestpac', 'workday', 'five9'],
    refreshFrequency: 'Hourly to Real-time',
    owner: 'Data Platform Team',
    slaTarget: '2 hours',
    priority: 'critical'
  },
  {
    datasetId: 'W3_Contract_Checker',
    name: 'Contract Checker',
    description: 'Primary sales and contract data - critical for sales queries',
    tableCount: 1,
    totalRows: '7.9M',
    totalSize: '6.03 GB',
    keyTables: ['T0_unf_Contract_All'],
    sourceSystems: ['sales_exec'],
    refreshFrequency: '2 hours',
    owner: 'Sales Operations',
    slaTarget: '2 hours',
    priority: 'critical'
  },
  {
    datasetId: 'BCG_RTD_DB',
    name: 'BCG Analytics',
    description: 'BCG reporting and analytics dataset (74 tables, 596M+ rows)',
    tableCount: 74,
    totalRows: '596M+',
    keyTables: [
      'DR_Leads',
      'DR_ContractSales',
      'DR_Terminations',
      'DR_Cancels'
    ],
    sourceSystems: ['sales_exec', 'lead_exec'],
    refreshFrequency: '6 hours',
    owner: 'Data Platform Team',
    slaTarget: '6 hours',
    priority: 'high'
  },
  {
    datasetId: 'Reports',
    name: 'Finance Reports',
    description: 'AR and finance reporting views',
    tableCount: 10,
    keyTables: [
      'VwUnf_dim_ar_detail',
      'VwUnf_ar_amount',
      'ar_rank_by_amount'
    ],
    sourceSystems: ['jde'],
    refreshFrequency: 'Hourly',
    owner: 'Finance',
    slaTarget: '1 hour',
    priority: 'high'
  },
  {
    datasetId: 'S4_Reports',
    name: 'S4 Reports',
    description: 'AR fact tables and YOY/MOM reporting',
    tableCount: 5,
    keyTables: ['ar_FactTable', 'Current_AR', 'YOY', 'MOM'],
    sourceSystems: ['jde'],
    refreshFrequency: 'Hourly',
    owner: 'Finance',
    slaTarget: '1 hour',
    priority: 'high'
  },
  {
    datasetId: 'S4_CusFP',
    name: 'Customer Financial Planning',
    description: 'Customer footprint and financial planning (3 tables, 1 view)',
    tableCount: 3,
    viewCount: 1,
    keyTables: ['CustomerFP', 'US_CustomerFootPrint'],
    sourceSystems: ['jde', 'rtx_data_hub'],
    refreshFrequency: 'Daily',
    owner: 'Finance',
    slaTarget: '24 hours',
    priority: 'medium'
  },
  {
    datasetId: 'Reference',
    name: 'Reference Data',
    description: 'Hierarchy mappings and reference tables (16 tables, 3 views)',
    tableCount: 16,
    viewCount: 3,
    keyTables: [
      'Ref_Map_BranchHeirarchy_GCS',
      'Ref_Map_Branch_GS',
      'ref_ProductMap_Rentokil',
      'ref_ProductMap_Terminix',
      'unf_ref_leads_lead_source',
      'unf_ref_service_code_map'
    ],
    sourceSystems: ['rtx_data_hub'],
    refreshFrequency: 'Daily',
    owner: 'Data Platform Team',
    slaTarget: '24 hours',
    priority: 'medium'
  },
  {
    datasetId: 'WorkDayTerm',
    name: 'Workday Terminations',
    description: 'Employee termination details from Workday (nested RECORD structure)',
    tableCount: 1,
    keyTables: ['WorkDayTermDtls'],
    sourceSystems: ['workday'],
    refreshFrequency: 'Daily',
    owner: 'HR Operations',
    slaTarget: '24 hours',
    priority: 'medium'
  },
  {
    datasetId: 'S0',
    name: 'S0 Raw Data',
    description: 'Raw data extracts - PNI details and other source data',
    tableCount: 15,
    keyTables: ['raw_RNA_PNIDetails_Daily'],
    sourceSystems: ['pestpac'],
    refreshFrequency: 'Daily',
    owner: 'Operations',
    slaTarget: '24 hours',
    priority: 'medium'
  },
  {
    datasetId: 'Leads_S3',
    name: 'Leads S3 (DEPRECATED)',
    description: 'RTX unified lead data (12 tables) - DEPRECATED, use S0_TMX.tmx_lead instead',
    tableCount: 12,
    keyTables: [
      'rtx_lead',
      'rtx_lead_stage',
      'rtx_lead_status',
      'rtx_lead_contact'
    ],
    sourceSystems: ['lead_exec'],
    refreshFrequency: 'Deprecated',
    owner: 'Data Platform Team',
    priority: 'low'
  },
  {
    datasetId: 'SalesReporting_RNA_PPNW',
    name: 'Sales Reporting PPNW',
    description: 'Contract sales reporting for PPNW region (7 views)',
    tableCount: 0,
    viewCount: 7,
    keyTables: [
      'Fact_ContractSales_Txn_Na_Daily_Dtl_PPNW',
      'vw_rpp_Contract_PPNW'
    ],
    sourceSystems: ['sales_exec'],
    refreshFrequency: 'Daily',
    owner: 'Sales Operations',
    slaTarget: '24 hours',
    priority: 'medium'
  },
  {
    datasetId: 'Custom_Data_Tables',
    name: 'Custom Data Tables',
    description: 'Custom data extracts and temporary tables (68 tables, 29 views)',
    tableCount: 68,
    viewCount: 29,
    keyTables: [],
    sourceSystems: ['calculated'],
    refreshFrequency: 'Varies',
    owner: 'Data Platform Team',
    priority: 'low'
  },
  {
    datasetId: 'AR',
    name: 'Accounts Receivable',
    description: 'AR-specific tables and views',
    tableCount: 5,
    keyTables: ['TopTenCustomers_ARBalance'],
    sourceSystems: ['jde'],
    refreshFrequency: 'Hourly',
    owner: 'Finance',
    slaTarget: '1 hour',
    priority: 'high'
  },
  {
    datasetId: 'S3_iCABS',
    name: 'iCABS (Legacy)',
    description: 'Legacy iCABS system data - prospect pipeline',
    tableCount: 5,
    keyTables: ['vw_ProspectPipelineNA9'],
    sourceSystems: ['salesforce'],
    refreshFrequency: 'Legacy',
    owner: 'Sales Operations',
    priority: 'low'
  }
]

/**
 * Get dataset by ID
 */
export function getDatasetById(datasetId: string): BigQueryDatasetMetadata | undefined {
  return BIGQUERY_DATASETS_METADATA.find(d => d.datasetId === datasetId)
}

/**
 * Get datasets by source system
 */
export function getDatasetsBySource(source: DataSource): BigQueryDatasetMetadata[] {
  return BIGQUERY_DATASETS_METADATA.filter(d => d.sourceSystems.includes(source))
}

/**
 * Get all critical datasets
 */
export function getCriticalDatasets(): BigQueryDatasetMetadata[] {
  return BIGQUERY_DATASETS_METADATA.filter(d => d.priority === 'critical')
}

/**
 * Get dataset summary stats
 */
export function getDatasetSummary() {
  const totalDatasets = BIGQUERY_DATASETS_METADATA.length
  const totalTables = BIGQUERY_DATASETS_METADATA.reduce((sum, d) => sum + d.tableCount, 0)
  const totalViews = BIGQUERY_DATASETS_METADATA.reduce((sum, d) => sum + (d.viewCount || 0), 0)
  const criticalCount = BIGQUERY_DATASETS_METADATA.filter(d => d.priority === 'critical').length
  const deprecatedCount = BIGQUERY_DATASETS_METADATA.filter(d => d.refreshFrequency === 'Deprecated' || d.refreshFrequency === 'Legacy').length

  return {
    totalDatasets,
    totalTables,
    totalViews,
    criticalCount,
    deprecatedCount,
    byPriority: {
      critical: BIGQUERY_DATASETS_METADATA.filter(d => d.priority === 'critical').length,
      high: BIGQUERY_DATASETS_METADATA.filter(d => d.priority === 'high').length,
      medium: BIGQUERY_DATASETS_METADATA.filter(d => d.priority === 'medium').length,
      low: BIGQUERY_DATASETS_METADATA.filter(d => d.priority === 'low').length
    }
  }
}
