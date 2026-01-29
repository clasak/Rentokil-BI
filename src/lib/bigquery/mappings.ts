/**
 * BigQuery Table Mappings
 *
 * Maps application entities to BigQuery tables and columns.
 * Used for schema discovery and query generation.
 */

import type { SourceSystemId } from './source-systems'

// =============================================================================
// KNOWN BIGQUERY TABLES
// =============================================================================

/**
 * Known BigQuery Tables - LIVE VERIFIED from bidata-sharedus-production (2026-01-23)
 *
 * Production Totals (Live Query Results):
 * - Total Datasets: 74
 * - Total Tables: 1,873+
 * - Total Views: 320+
 *
 * Key Tables with VERIFIED Row Counts:
 * - S0_TMX.tmx_lead: 74.4M rows, 43.30 GB, 88 columns
 * - S0_TMX.tmx_lead_activity_fact: 205M rows, 82.94 GB, 38 columns
 * - S0_TMX.tmx_sa_item: 533M rows, 428.96 GB, 101 columns
 * - S0_TMX.Inspections: 3.4M rows, 0.84 GB, 41 columns
 * - S0_TMX.tmx_employee: 1.3M rows, 0.62 GB, 38 columns
 * - S0_TMX.Employees_Main: 29.7K rows, 0.03 GB, 89 columns
 * - S0_TMX.tmx_business_unit: 13.8K rows, 0.01 GB, 52 columns
 * - W3_Contract_Checker.T0_unf_Contract_All: 7.9M rows, 6.03 GB, 88 columns
 * - S4.Fact_Leads_Acc_Daily_Dtls_Snp: 11.8M rows, 5.88 GB, 71 columns
 *
 * Top Datasets by Table Count (from live discovery):
 * - BCG_RTD_DB: 74 tables (BCG reporting)
 * - Custom_Data_Tables: 68 tables, 29 views
 * - Deprecated: 11 tables
 *
 * Dashboard Coverage: 43/91 pages (47%) connected to BigQuery
 * Tables Actively Used: 15
 */
export const KNOWN_BIGQUERY_TABLES = {
  // === LEADS ===
  // S0_TMX - TMX lead source data (255 tables, 2.2M rows in tmx_lead)
  tmxLead: 'S0_TMX.tmx_lead',
  tmxLeadActivity: 'S0_TMX.tmx_lead_activity',
  tmxLeadActivityFact: 'S0_TMX.tmx_lead_activity_fact', // 7.7M rows
  tmxLeadAttributes: 'S0_TMX.tmx_lead_attributes',

  // Leads_S3 - RTX unified lead data (12 tables)
  rtxLead: 'Leads_S3.rtx_lead',
  rtxLeadStage: 'Leads_S3.rtx_lead_stage',
  rtxLeadStatus: 'Leads_S3.rtx_lead_status',
  rtxLeadContact: 'Leads_S3.rtx_lead_contact',
  rtxLeadSales: 'Leads_S3.rtx_lead_sales',
  rtxLeadInspections: 'Leads_S3.rtx_lead_inspections',
  rtxLeadFieldAssignment: 'Leads_S3.rtx_lead_field_assignment',

  // S4 - Final stage lead facts (~2.5M rows in snapshot)
  factLeadsDaily: 'S4.Fact_Leads_Acc_Daily_Dtls_Snp',
  factLeadsDailyAgg: 'S4.Fact_Leads_Acc_Daily_Agg_Vw',

  // === SALES ===
  // S4 - Contract sales facts (21 tables, 67 views)
  factContractSales: 'S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw',
  factContractTotalSales: 'S4.Fact_ContractTotalSales_Txn_Na_Daily_Dtl_Vw',
  factContractCancels: 'S4.Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw',
  factDspAllSales: 'S4.Fact_DSP_AllSales_Txn_Na_Daily',
  factDspGrossSales: 'S4.Fact_DSP_GrossSales_Txn_Na_Daily_Dtl_Vw',
  factDspNetSales: 'S4.Fact_DSP_NetSales_Txn_Na_Daily_Dtl_Vw',
  factDspStartedSales: 'S4.Fact_DSP_StartedSales_Txn_Na_Daily_Dtl_Vw',

  // SalesReporting_RNA_PPNW (7 views)
  factContractSalesPpnw: 'SalesReporting_RNA_PPNW.Fact_ContractSales_Txn_Na_Daily_Dtl_PPNW',
  vwContractPpnw: 'SalesReporting_RNA_PPNW.vw_rpp_Contract_PPNW',

  // === FINANCE / AR ===
  // AR dataset - Updated to use verified S4 view
  dailyAr: 'S4.VwUnf_daily_ar',
  topTenCustomersAr: 'AR.TopTenCustomers_ARBalance',

  // Reports - AR reporting (verified working tables)
  arDetail: 'Reports.VwUnf_dim_ar_detail',
  arBalances: 'Reports.VwUnf_ar_amount',
  arBalancesSummary: 'Reports.ar_rank_by_amount',
  arFactTable: 'S4_Reports.ar_FactTable',
  currentAr: 'S4_Reports.Current_AR',
  yoyReport: 'S4_Reports.YOY',
  momReport: 'S4_Reports.MOM',

  // S4_CusFP - Customer Financial Planning (3 tables, 1 view)
  customerFootprint: 'S4_CusFP.CustomerFP',
  usCustomerFootprint: 'S4_CusFP.US_CustomerFootPrint',

  // === PORTFOLIO / SERVICE ===
  // S4 Portfolio and inspection facts
  factPortfolioActivity: 'S4.Fact_PortfolioActivity_Txn_Na_Daily_Dtl_Vw_WithProd',
  factPortfolioSnapshot: 'S4.Fact_Portfolio_Snp_Na_Daily_Dnm_Hist_Vw',
  factPniDetails: 'S4.Fact_PNI_Details_Txn_Na_Daily_Dtl_vw',
  factInpDetails: 'S4.Fact_INP_Details_Txn_Na_Daily_Dtl_vw',

  // === BRANCH / HIERARCHY ===
  // S4 dimensions
  branchHierarchy: 'S4.Branch_Hierarchy',
  dimBranch: 'S2.VwUnf_Branch',
  dimEmployee: 'S4.Dim_employee',
  dimTime: 'S4.Dim_RTX_Time',
  dimAcMonth: 'S4.Dim_RTX_AC_Month',

  // S4 Branch source (verified working)
  rawBranchDaily: 'S2.VwUnf_Branch',

  // Reference - hierarchy mappings (16 tables, 3 views)
  refBranchHierarchy: 'Reference.Ref_Map_BranchHeirarchy_GCS',
  refBranchGs: 'Reference.Ref_Map_Branch_GS',
  refProductMapRentokil: 'Reference.ref_ProductMap_Rentokil',
  refProductMapTerminix: 'Reference.ref_ProductMap_Terminix',
  refLeadSource: 'Reference.unf_ref_leads_lead_source',
  refLeadSeStage: 'Reference.unf_ref_leads_SE_stage',
  refActivityMap: 'Reference.unf_ref_Activity_Map',
  refServiceCodeMap: 'Reference.unf_ref_service_code_map',

  // === HR / WORKFORCE (Workday-sourced via TMX ETL) ===
  // Primary Workday data tables (flattened for queries)
  tmxEmployee: 'S0_TMX.tmx_employee',                    // 1.29M rows - Employee master + terminations
  tmxEmployeesMain: 'S0_TMX.Employees_Main',             // 29K rows - Current employee directory

  // Raw Workday extracts (nested/external - for reference only)
  workdayTerminations: 'WorkDayTerm.WorkDayTermDtls',    // Nested RECORD structure
  tmxEmployeeExtended: 'S0_TMX.ExtRaw_wrkday_Employee_extended',
  tmxTerminationDetails: 'S0_TMX.ExtRaw_wrkday_Termination_Details',

  // === SURVEYS / CUSTOMER ===
  extractSurveysDetractors: 'S4.Extract_Surveys_Detractors_Ops_Daily',
  azugaCustomerClassification: 'S4.Azuga_Customer_Classification',

  // === W3_CONTRACT_CHECKER (Primary Sales Table) ===
  // T0_unf_Contract_All - 7.8M rows, 88 columns - CRITICAL for sales queries
  contractAll: 'W3_Contract_Checker.T0_unf_Contract_All',

  // === BCG_RTD_DB (62 tables - Future Integration) ===
  // BCG reporting tables - not yet integrated
  bcgDrLeads: 'BCG_RTD_DB.DR_Leads',
  bcgDrContracts: 'BCG_RTD_DB.DR_Contracts',
  bcgDrTerminations: 'BCG_RTD_DB.DR_Terminations',

  // === S0_TMX ADDITIONAL TABLES ===
  // Verified working tables with row counts
  tmxBusinessUnit: 'S0_TMX.tmx_business_unit', // 13K rows
  // tmxEmployee defined in HR/Workforce section above (1.29M rows)
  tmxInspections: 'S0_TMX.Inspections', // 3.3M rows
  tmxSaItem: 'S0_TMX.tmx_sa_item', // 66M rows

  // === S0 RAW DATA ===
  rawRnaPniDaily: 'S0.raw_RNA_PNIDetails_Daily', // ~100K rows

  // === LEGACY TABLES (keep for backward compatibility) ===
  salesExecExtract: 'SalesExecAPIExtract',
  leadsExecExtract: 'LeadsExecAPIExtract_STG',
  prospectPipeline: 'S3_iCABS.vw_ProspectPipelineNA9',
  contracts: 'S0_TMX.vw_rp_p_stage2_Contract',
} as const

export type KnownTableKey = keyof typeof KNOWN_BIGQUERY_TABLES

// =============================================================================
// COLUMN MAPPINGS
// =============================================================================

export interface ColumnMapping {
  bigQueryColumn: string
  appField: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'timestamp'
  transform?: (value: unknown) => unknown
  nullable?: boolean
}

export interface TableMapping {
  bigQueryTable: string
  bigQueryDataset?: string
  sourceSystem: SourceSystemId
  description: string
  columns: ColumnMapping[]
  primaryKey: string
  lastModifiedColumn?: string
}

/**
 * Lead Exec API Extract mapping
 */
export const LEAD_EXEC_MAPPING: TableMapping = {
  bigQueryTable: 'LeadsExecAPIExtract_STG',
  sourceSystem: 'LEAD_EXEC',
  description: 'Lead management data from Lead Exec system',
  primaryKey: 'lead_id',
  lastModifiedColumn: 'last_modified_date',
  columns: [
    { bigQueryColumn: 'lead_id', appField: 'id', type: 'string' },
    { bigQueryColumn: 'lead_source', appField: 'source', type: 'string' },
    { bigQueryColumn: 'lead_stage', appField: 'stage', type: 'string' },
    { bigQueryColumn: 'assigned_to', appField: 'assignedTo', type: 'string' },
    { bigQueryColumn: 'received_date', appField: 'receivedAt', type: 'timestamp' },
    { bigQueryColumn: 'last_modified_date', appField: 'updatedAt', type: 'timestamp' },
    { bigQueryColumn: 'disposition', appField: 'disposition', type: 'string', nullable: true },
    { bigQueryColumn: 'market', appField: 'market', type: 'string' },
    { bigQueryColumn: 'region', appField: 'region', type: 'string' },
    { bigQueryColumn: 'branch', appField: 'branch', type: 'string', nullable: true },
    { bigQueryColumn: 'first_name', appField: 'firstName', type: 'string', nullable: true },
    { bigQueryColumn: 'last_name', appField: 'lastName', type: 'string', nullable: true },
    { bigQueryColumn: 'email', appField: 'email', type: 'string', nullable: true },
    { bigQueryColumn: 'phone', appField: 'phone', type: 'string', nullable: true },
    { bigQueryColumn: 'address', appField: 'address', type: 'string', nullable: true },
    { bigQueryColumn: 'city', appField: 'city', type: 'string', nullable: true },
    { bigQueryColumn: 'state', appField: 'state', type: 'string', nullable: true },
    { bigQueryColumn: 'zip', appField: 'zip', type: 'string', nullable: true },
  ],
}

/**
 * Sales Exec API Extract mapping
 */
export const SALES_EXEC_MAPPING: TableMapping = {
  bigQueryTable: 'SalesExecAPIExtract',
  sourceSystem: 'SALES_EXEC',
  description: 'Sales pipeline data from Sales Exec system',
  primaryKey: 'opportunity_id',
  lastModifiedColumn: 'last_modified_date',
  columns: [
    { bigQueryColumn: 'lead_id', appField: 'leadId', type: 'string', nullable: true },
    { bigQueryColumn: 'opportunity_id', appField: 'id', type: 'string' },
    { bigQueryColumn: 'stage', appField: 'stage', type: 'string' },
    { bigQueryColumn: 'amount', appField: 'amount', type: 'number' },
    { bigQueryColumn: 'close_date', appField: 'closeDate', type: 'date', nullable: true },
    { bigQueryColumn: 'created_date', appField: 'createdAt', type: 'timestamp' },
    { bigQueryColumn: 'last_modified_date', appField: 'updatedAt', type: 'timestamp' },
    { bigQueryColumn: 'owner_id', appField: 'ownerId', type: 'string' },
    { bigQueryColumn: 'owner_name', appField: 'ownerName', type: 'string', nullable: true },
    { bigQueryColumn: 'source', appField: 'source', type: 'string' },
    { bigQueryColumn: 'market', appField: 'market', type: 'string' },
    { bigQueryColumn: 'region', appField: 'region', type: 'string' },
    { bigQueryColumn: 'branch', appField: 'branch', type: 'string', nullable: true },
    { bigQueryColumn: 'account_name', appField: 'accountName', type: 'string', nullable: true },
    { bigQueryColumn: 'service_type', appField: 'serviceType', type: 'string', nullable: true },
    { bigQueryColumn: 'contract_term', appField: 'contractTerm', type: 'number', nullable: true },
    { bigQueryColumn: 'probability', appField: 'probability', type: 'number', nullable: true },
  ],
}

/**
 * Prospect Pipeline view mapping
 */
export const PROSPECT_PIPELINE_MAPPING: TableMapping = {
  bigQueryTable: 'S3_iCABS.vw_ProspectPipelineNA9',
  sourceSystem: 'SALESFORCE',
  description: 'Prospect pipeline view from iCABS',
  primaryKey: 'prospect_id',
  columns: [
    { bigQueryColumn: 'prospect_id', appField: 'id', type: 'string' },
    { bigQueryColumn: 'prospect_name', appField: 'name', type: 'string' },
    { bigQueryColumn: 'status', appField: 'status', type: 'string' },
    { bigQueryColumn: 'created_date', appField: 'createdAt', type: 'timestamp' },
    { bigQueryColumn: 'market_code', appField: 'market', type: 'string' },
    { bigQueryColumn: 'region_code', appField: 'region', type: 'string' },
    { bigQueryColumn: 'branch_code', appField: 'branch', type: 'string', nullable: true },
    { bigQueryColumn: 'estimated_value', appField: 'estimatedValue', type: 'number', nullable: true },
  ],
}

/**
 * Contracts view mapping
 */
export const CONTRACTS_MAPPING: TableMapping = {
  bigQueryTable: 'S0_TMX.vw_rp_p_stage2_Contract',
  sourceSystem: 'PESTPAC',
  description: 'Contract data from TMX',
  primaryKey: 'contract_id',
  columns: [
    { bigQueryColumn: 'contract_id', appField: 'id', type: 'string' },
    { bigQueryColumn: 'account_id', appField: 'accountId', type: 'string' },
    { bigQueryColumn: 'contract_status', appField: 'status', type: 'string' },
    { bigQueryColumn: 'start_date', appField: 'startDate', type: 'date' },
    { bigQueryColumn: 'end_date', appField: 'endDate', type: 'date', nullable: true },
    { bigQueryColumn: 'annual_value', appField: 'annualValue', type: 'number' },
    { bigQueryColumn: 'service_type', appField: 'serviceType', type: 'string' },
    { bigQueryColumn: 'renewal_date', appField: 'renewalDate', type: 'date', nullable: true },
  ],
}

// =============================================================================
// DISCOVERED TABLE MAPPINGS - bidata-sharedus-dev (2026-01-22)
// =============================================================================

/**
 * Reports.VwUnf_dim_ar_detail - Accounts Receivable detail view (verified working)
 * Maps to: Finance > AR dashboard page
 */
export const DAILY_AR_MAPPING: TableMapping = {
  bigQueryTable: 'Reports.VwUnf_dim_ar_detail',
  bigQueryDataset: 'Reports',
  sourceSystem: 'ERP',
  description: 'Daily accounts receivable balances by customer',
  primaryKey: 'CUSTNUM',
  columns: [
    { bigQueryColumn: 'RTX_Market_Code', appField: 'marketCode', type: 'string' },
    { bigQueryColumn: 'RTX_Market_Name', appField: 'marketName', type: 'string' },
    { bigQueryColumn: 'RTX_Region_Code', appField: 'regionCode', type: 'string' },
    { bigQueryColumn: 'RTX_Region_Name', appField: 'regionName', type: 'string' },
    { bigQueryColumn: 'RTX_Branch_Codes', appField: 'branchCode', type: 'number' },
    { bigQueryColumn: 'RTX_Branch_Name', appField: 'branchName', type: 'string' },
    { bigQueryColumn: 'CUSTNUM', appField: 'customerId', type: 'string' },
    { bigQueryColumn: 'Customer_Name', appField: 'customerName', type: 'string' },
    { bigQueryColumn: 'date', appField: 'date', type: 'string' },
    { bigQueryColumn: 'ARSBAL', appField: 'arBalance', type: 'number' },
    { bigQueryColumn: 'SA', appField: 'serviceAgreement', type: 'string', nullable: true },
    { bigQueryColumn: 'PASTDUE', appField: 'pastDue', type: 'number' },
    { bigQueryColumn: 'FUTURE', appField: 'future', type: 'number' },
    { bigQueryColumn: 'PDBUCKET', appField: 'agingBucket', type: 'string' },
    { bigQueryColumn: 'LOB', appField: 'lineOfBusiness', type: 'string' },
    { bigQueryColumn: 'source_code', appField: 'sourceCode', type: 'string' },
    { bigQueryColumn: 'source_system', appField: 'sourceSystem', type: 'string' },
  ],
}

/**
 * S2.VwUnf_Branch - Branch hierarchy dimension (verified working)
 * Maps to: Reference data for all dashboard filtering
 */
export const BRANCH_HIERARCHY_MAPPING: TableMapping = {
  bigQueryTable: 'S2.VwUnf_Branch',
  bigQueryDataset: 'S4',
  sourceSystem: 'RTX_HUB',
  description: 'Branch hierarchy master data with market/region/branch structure',
  primaryKey: 'RTX_Branch_Codes',
  columns: [
    { bigQueryColumn: 'RTX_Market_Code', appField: 'marketCode', type: 'string' },
    { bigQueryColumn: 'RTX_Market_Name', appField: 'marketName', type: 'string' },
    { bigQueryColumn: 'RTX_Region_Code', appField: 'regionCode', type: 'string' },
    { bigQueryColumn: 'RTX_Region_Name', appField: 'regionName', type: 'string' },
    { bigQueryColumn: 'RTX_Branch_Codes', appField: 'branchCode', type: 'string' },
    { bigQueryColumn: 'RTX_Branch_Name', appField: 'branchName', type: 'string' },
    { bigQueryColumn: 'Heritage_Org', appField: 'heritageOrg', type: 'string' },
    { bigQueryColumn: 'Brand', appField: 'brand', type: 'string' },
    { bigQueryColumn: 'Operating_System', appField: 'operatingSystem', type: 'string' },
    { bigQueryColumn: 'Branch_Status', appField: 'branchStatus', type: 'string' },
    { bigQueryColumn: 'BranchManager', appField: 'branchManager', type: 'string', nullable: true },
    { bigQueryColumn: 'BranchManagerEmail', appField: 'branchManagerEmail', type: 'string', nullable: true },
    { bigQueryColumn: 'RegionalManager', appField: 'regionalManager', type: 'string', nullable: true },
    { bigQueryColumn: 'MarketManager', appField: 'marketManager', type: 'string', nullable: true },
    { bigQueryColumn: 'City', appField: 'city', type: 'string', nullable: true },
    { bigQueryColumn: 'State', appField: 'state', type: 'string', nullable: true },
    { bigQueryColumn: 'ZipCode', appField: 'zipCode', type: 'string', nullable: true },
  ],
}

/**
 * S0_TMX.tmx_lead - TMX lead data (74M rows, 88 columns)
 * Maps to: Lead Service Engine, Lead Journey, SALTI, Leads dashboards
 * MOST USED TABLE - Critical for all lead-based queries
 */
export const TMX_LEAD_MAPPING: TableMapping = {
  bigQueryTable: 'S0_TMX.tmx_lead',
  bigQueryDataset: 'S0_TMX',
  sourceSystem: 'TMX',
  description: 'TMX lead management data with full lead lifecycle tracking (74M rows, 88 columns)',
  primaryKey: 'tmx_lead_sid',
  lastModifiedColumn: 'udt_date',
  columns: [
    // Primary Keys & Foreign Keys
    { bigQueryColumn: 'tmx_lead_sid', appField: 'id', type: 'number' },
    { bigQueryColumn: 'curr_assigned_employee_sid', appField: 'assignedEmployeeId', type: 'number', nullable: true },
    { bigQueryColumn: 'tmx_lead_attribute_sid', appField: 'attributeId', type: 'number', nullable: true },
    { bigQueryColumn: 'assigned_bunit_sid', appField: 'assignedBusinessUnitId', type: 'number', nullable: true },
    { bigQueryColumn: 'originating_bunit_sid', appField: 'originatingBusinessUnitId', type: 'number', nullable: true },
    { bigQueryColumn: 'tmx_lead_prospect_sid', appField: 'prospectId', type: 'number', nullable: true },
    { bigQueryColumn: 'tmx_sa_item_service_line_sid', appField: 'serviceLineId', type: 'number', nullable: true },
    { bigQueryColumn: 'tmx_lead_activity_sid', appField: 'activityId', type: 'number', nullable: true },
    { bigQueryColumn: 'actid', appField: 'activityIdLegacy', type: 'number', nullable: true },

    // User & Source
    { bigQueryColumn: 'created_by_user_profile', appField: 'createdBy', type: 'string', nullable: true },
    { bigQueryColumn: 'external_lead_id', appField: 'externalLeadId', type: 'string', nullable: true },

    // Lead Lifecycle Dates (Original - First Occurrence)
    { bigQueryColumn: 'received_date', appField: 'receivedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'assigned_date', appField: 'assignedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'scheduled_date', appField: 'scheduledAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'inspected_date', appField: 'inspectedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'proposed_date', appField: 'proposedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'sold_date', appField: 'soldAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'cancel_date', appField: 'canceledAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'uncancel_date', appField: 'uncanceledAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'call_back_date', appField: 'callbackAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'call_back_rqs_date', appField: 'callbackRequestedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'rescheduled_date', appField: 'rescheduledAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'skipped_date', appField: 'skippedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'transfer_date', appField: 'transferredAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'unassigned_date', appField: 'unassignedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'unscheduled_date', appField: 'unscheduledAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'unskipped_date', appField: 'unskippedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'complete_date', appField: 'completedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'scheduled_on_date', appField: 'scheduledOnAt', type: 'timestamp', nullable: true },

    // Lead Lifecycle Dates (Current - Most Recent Occurrence)
    { bigQueryColumn: 'curr_assigned_date', appField: 'currentAssignedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_inspected_date', appField: 'currentInspectedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_proposed_date', appField: 'currentProposedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_sold_date', appField: 'currentSoldAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_cancel_date', appField: 'currentCanceledAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_uncancel_date', appField: 'currentUncanceledAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_rescheduled_date', appField: 'currentRescheduledAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_skipped_date', appField: 'currentSkippedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_transfer_date', appField: 'currentTransferredAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_call_back_date', appField: 'currentCallbackAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_call_back_rqs_date', appField: 'currentCallbackRequestedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_unassigned_date', appField: 'currentUnassignedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_unscheduled_date', appField: 'currentUnscheduledAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_unskipped_date', appField: 'currentUnskippedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_complete_date', appField: 'currentCompletedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_scheduled_date', appField: 'currentScheduledAt', type: 'timestamp', nullable: true },

    // Territory & Location
    { bigQueryColumn: 'originating_territory_code', appField: 'originatingTerritoryCode', type: 'string', nullable: true },
    { bigQueryColumn: 'originating_territory_description', appField: 'originatingTerritoryName', type: 'string', nullable: true },
    { bigQueryColumn: 'assigned_territory_code', appField: 'assignedTerritoryCode', type: 'string', nullable: true },
    { bigQueryColumn: 'assigned_territory_description', appField: 'assignedTerritoryName', type: 'string', nullable: true },

    // Lead Metrics & Counts
    { bigQueryColumn: 'number_of_proposals', appField: 'proposalCount', type: 'number', nullable: true },
    { bigQueryColumn: 'number_of_valid_proposals', appField: 'validProposalCount', type: 'number', nullable: true },
    { bigQueryColumn: 'number_of_cross_sell_proposals', appField: 'crossSellProposalCount', type: 'number', nullable: true },
    { bigQueryColumn: 'number_of_sales_agreements', appField: 'salesAgreementCount', type: 'number', nullable: true },
    { bigQueryColumn: 'number_valid_sales_agreements', appField: 'validSalesAgreementCount', type: 'number', nullable: true },
    { bigQueryColumn: 'number_of_assignments', appField: 'assignmentCount', type: 'number', nullable: true },

    // Financial Fields (Standard Currency)
    { bigQueryColumn: 'total_raw_sales_amount', appField: 'totalRawSalesAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'proposal_contract_amount', appField: 'proposalContractAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'proposal_annual_amount', appField: 'proposalAnnualAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'proposal_initial_amount', appField: 'proposalInitialAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'proposal_regular_amount', appField: 'proposalRegularAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'proposal_renewal_amount', appField: 'proposalRenewalAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'proposal_special_amount', appField: 'proposalSpecialAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'proposal_excinitial_amount', appField: 'proposalExcInitialAmount', type: 'number', nullable: true },

    // Financial Fields (Local Currency)
    { bigQueryColumn: 'local_currency_sid', appField: 'localCurrencyId', type: 'number', nullable: true },
    { bigQueryColumn: 'local_currency_total_raw_sales_amount', appField: 'localTotalRawSalesAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'currency_conversion_rate_to_standard', appField: 'currencyConversionRate', type: 'number', nullable: true },
    { bigQueryColumn: 'local_currency_proposal_contract_amt', appField: 'localProposalContractAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'local_currency_proposal_annual_amt', appField: 'localProposalAnnualAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'local_currency_proposal_initial_amt', appField: 'localProposalInitialAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'local_currency_proposal_regular_amt', appField: 'localProposalRegularAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'local_currency_proposal_renewal_amt', appField: 'localProposalRenewalAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'local_currency_proposal_special_amt', appField: 'localProposalSpecialAmount', type: 'number', nullable: true },
    { bigQueryColumn: 'local_currency_proposal_excinitial_amt', appField: 'localProposalExcInitialAmount', type: 'number', nullable: true },

    // Marketing & Lead Source
    { bigQueryColumn: 'customer_dialed_phone', appField: 'customerDialedPhone', type: 'string', nullable: true },
    { bigQueryColumn: 'direct_marketing_response_code', appField: 'marketingResponseCode', type: 'string', nullable: true },
    { bigQueryColumn: 'partner_lead_data', appField: 'partnerLeadData', type: 'string', nullable: true },
    { bigQueryColumn: 'ad_name', appField: 'adName', type: 'string', nullable: true },

    // Flags & Status
    { bigQueryColumn: 'with_opportunity_yn', appField: 'hasOpportunity', type: 'boolean', transform: (v) => v === 'Y', nullable: true },
    { bigQueryColumn: 'skipped_reason_code', appField: 'skippedReasonCode', type: 'string', nullable: true },
    { bigQueryColumn: 'skipped_reason_description', appField: 'skippedReason', type: 'string', nullable: true },

    // Audit & System Fields
    { bigQueryColumn: 'eff_date', appField: 'effectiveDate', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'end_date', appField: 'endDate', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'xxdate', appField: 'legacyDate', type: 'number', nullable: true },
    { bigQueryColumn: 'xxtime', appField: 'legacyTime', type: 'number', nullable: true },
    { bigQueryColumn: 'udt_date', appField: 'updatedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'cre_date', appField: 'createdAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_ind', appField: 'isCurrent', type: 'boolean', transform: (v) => v === 'Y', nullable: true },
    { bigQueryColumn: 'etl_load_date', appField: 'etlLoadedAt', type: 'timestamp', nullable: true },
  ],
}

/**
 * Leads_S3.rtx_lead - Unified lead data (DEPRECATED - use TMX_LEAD_MAPPING)
 * Maps to: Lead Service Engine, Lead Journey pages
 */
export const RTX_LEAD_MAPPING: TableMapping = {
  bigQueryTable: 'Leads_S3.rtx_lead',
  bigQueryDataset: 'Leads_S3',
  sourceSystem: 'LEAD_EXEC',
  description: 'RTX unified lead data from all source systems (DEPRECATED - use S0_TMX.tmx_lead)',
  primaryKey: 'lead_uid',
  columns: [
    { bigQueryColumn: 'lead_uid', appField: 'id', type: 'string' },
    { bigQueryColumn: 'lead_source', appField: 'source', type: 'string' },
    { bigQueryColumn: 'lead_type', appField: 'type', type: 'string' },
    { bigQueryColumn: 'market_code', appField: 'marketCode', type: 'string' },
    { bigQueryColumn: 'region_code', appField: 'regionCode', type: 'string' },
    { bigQueryColumn: 'branch_code', appField: 'branchCode', type: 'string', nullable: true },
    { bigQueryColumn: 'created_date', appField: 'createdAt', type: 'timestamp' },
    { bigQueryColumn: 'modified_date', appField: 'updatedAt', type: 'timestamp' },
  ],
}

/**
 * S0_TMX.tmx_employee - TMX employee data (1.29M rows, 38 columns)
 * Maps to: HR, Workforce, Organization dashboards
 * Source: Workday via TMX ETL
 */
export const TMX_EMPLOYEE_MAPPING: TableMapping = {
  bigQueryTable: 'S0_TMX.tmx_employee',
  bigQueryDataset: 'S0_TMX',
  sourceSystem: 'WORKDAY',
  description: 'Employee master data from Workday via TMX (1.29M rows, 38 columns)',
  primaryKey: 'tmx_employee_sid',
  lastModifiedColumn: 'udt_date',
  columns: [
    // Primary Keys
    { bigQueryColumn: 'tmx_employee_sid', appField: 'id', type: 'number' },
    { bigQueryColumn: 'employee_id', appField: 'employeeId', type: 'string' },
    { bigQueryColumn: 'employee_party_id', appField: 'partyId', type: 'number', nullable: true },
    { bigQueryColumn: 'employee_jde_number', appField: 'jdeNumber', type: 'number', nullable: true },

    // Business Unit
    { bigQueryColumn: 'home_bunit', appField: 'businessUnit', type: 'string', nullable: true },
    { bigQueryColumn: 'home_bunit_description', appField: 'businessUnitName', type: 'string', nullable: true },
    { bigQueryColumn: 'home_bunit_corp_code', appField: 'corpCode', type: 'string', nullable: true },
    { bigQueryColumn: 'home_bunit_corp_name', appField: 'corpName', type: 'string', nullable: true },
    { bigQueryColumn: 'home_bunit_comp_code', appField: 'companyCode', type: 'string', nullable: true },
    { bigQueryColumn: 'home_bunit_comp_name', appField: 'companyName', type: 'string', nullable: true },
    { bigQueryColumn: 'home_bunit_division_code', appField: 'divisionCode', type: 'string', nullable: true },
    { bigQueryColumn: 'home_bunit_division_name', appField: 'divisionName', type: 'string', nullable: true },
    { bigQueryColumn: 'home_bunit_region_code', appField: 'regionCode', type: 'string', nullable: true },
    { bigQueryColumn: 'home_bunit_region_name', appField: 'regionName', type: 'string', nullable: true },

    // Current Business Unit (for SCD Type 2 tracking)
    { bigQueryColumn: 'curr_home_bunit_division_code', appField: 'currentDivisionCode', type: 'string', nullable: true },
    { bigQueryColumn: 'curr_home_bunit_division_name', appField: 'currentDivisionName', type: 'string', nullable: true },
    { bigQueryColumn: 'curr_home_bunit_region_code', appField: 'currentRegionCode', type: 'string', nullable: true },
    { bigQueryColumn: 'curr_home_bunit_region_name', appField: 'currentRegionName', type: 'string', nullable: true },

    // Personal Info
    { bigQueryColumn: 'last_name', appField: 'lastName', type: 'string', nullable: true },
    { bigQueryColumn: 'first_name', appField: 'firstName', type: 'string', nullable: true },
    { bigQueryColumn: 'common_name', appField: 'commonName', type: 'string', nullable: true },

    // Job & Employment
    { bigQueryColumn: 'job_code', appField: 'jobCode', type: 'string', nullable: true },
    { bigQueryColumn: 'job_code_description', appField: 'jobTitle', type: 'string', nullable: true },
    { bigQueryColumn: 'employee_status', appField: 'employeeStatus', type: 'string', nullable: true },
    { bigQueryColumn: 'employment_type_code', appField: 'employmentTypeCode', type: 'string', nullable: true },
    { bigQueryColumn: 'employment_type_description', appField: 'employmentType', type: 'string', nullable: true },
    { bigQueryColumn: 'employee_primary_designation_code', appField: 'designationCode', type: 'string', nullable: true },
    { bigQueryColumn: 'employee_primary_designation_desc', appField: 'designation', type: 'string', nullable: true },

    // Employment Dates
    { bigQueryColumn: 'hire_date', appField: 'hireDate', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'in_job_date', appField: 'inJobDate', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'termination_date', appField: 'terminationDate', type: 'timestamp', nullable: true },

    // Audit Fields
    { bigQueryColumn: 'eff_date', appField: 'effectiveDate', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'end_date', appField: 'endDate', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'xxdate', appField: 'legacyDate', type: 'number', nullable: true },
    { bigQueryColumn: 'udt_date', appField: 'updatedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'cre_date', appField: 'createdAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'curr_ind', appField: 'isCurrent', type: 'boolean', transform: (v) => v === 'Y', nullable: true },
    { bigQueryColumn: 'etl_load_date', appField: 'etlLoadedAt', type: 'timestamp', nullable: true },
  ],
}

/**
 * S0_TMX.Inspections - PestPac inspection data (3.4M rows, 41 columns)
 * Maps to: Termite, Ops, Tech dashboards
 * Source: PestPac via TMX ETL
 */
export const TMX_INSPECTIONS_MAPPING: TableMapping = {
  bigQueryTable: 'S0_TMX.Inspections',
  bigQueryDataset: 'S0_TMX',
  sourceSystem: 'PESTPAC',
  description: 'Field inspection data from PestPac (3.4M rows, 41 columns)',
  primaryKey: 'InspectionId',
  lastModifiedColumn: 'LastModifedDate',
  columns: [
    // Primary Keys & Identifiers
    { bigQueryColumn: 'InspectionId', appField: 'id', type: 'number' },
    { bigQueryColumn: 'AppointmentId', appField: 'appointmentId', type: 'string', nullable: true },
    { bigQueryColumn: 'AppGenInspectionId', appField: 'appGenInspectionId', type: 'string', nullable: true },
    { bigQueryColumn: 'EZConnectLinkId', appField: 'ezConnectLinkId', type: 'string', nullable: true },

    // Business Unit & Employee
    { bigQueryColumn: 'BUCode', appField: 'businessUnitCode', type: 'string', nullable: true },
    { bigQueryColumn: 'EmployeeNumber', appField: 'employeeNumber', type: 'string', nullable: true },

    // Customer & Party
    { bigQueryColumn: 'PartyId', appField: 'partyId', type: 'string', nullable: true },
    { bigQueryColumn: 'CustomerNumber', appField: 'customerNumber', type: 'string', nullable: true },

    // Inspection Dates
    { bigQueryColumn: 'DateInspected', appField: 'inspectedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'DateLastInspected', appField: 'lastInspectedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'CreatedDate', appField: 'createdAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'LastModifedDate', appField: 'updatedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'ExpectedCloseDate', appField: 'expectedCloseDate', type: 'string', nullable: true },

    // Inspection Status & Type
    { bigQueryColumn: 'Status', appField: 'status', type: 'string', nullable: true },
    { bigQueryColumn: 'InspectionType', appField: 'inspectionType', type: 'string', nullable: true },
    { bigQueryColumn: 'KeywordStatus', appField: 'keywordStatus', type: 'string', nullable: true },
    { bigQueryColumn: 'SourceApplication', appField: 'sourceApplication', type: 'string', nullable: true },

    // E-Signature & Documents
    { bigQueryColumn: 'EsignDate', appField: 'eSignedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'EsignIPAddress', appField: 'eSignIpAddress', type: 'string', nullable: true },
    { bigQueryColumn: 'EConsent', appField: 'eConsent', type: 'string', nullable: true },
    { bigQueryColumn: 'IsMultiSigatureCaptured', appField: 'hasMultiSignature', type: 'string', nullable: true },
    { bigQueryColumn: 'PartyNotSignedReason', appField: 'notSignedReason', type: 'string', nullable: true },

    // Document Repository
    { bigQueryColumn: 'DocRepositoryFolderId', appField: 'documentFolderId', type: 'string', nullable: true },
    { bigQueryColumn: 'FrontViewPhotoDocId', appField: 'frontViewPhotoId', type: 'string', nullable: true },
    { bigQueryColumn: 'MergedDocId', appField: 'mergedDocId', type: 'string', nullable: true },
    { bigQueryColumn: 'OSPSignatureDocId', appField: 'ospSignatureDocId', type: 'string', nullable: true },
    { bigQueryColumn: 'PartySignatureDocId', appField: 'partySignatureDocId', type: 'string', nullable: true },
    { bigQueryColumn: 'FloorPlanDocumentID', appField: 'floorPlanDocId', type: 'string', nullable: true },

    // Sale Information
    { bigQueryColumn: 'DateOfSale', appField: 'saleDate', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'SaleExpiryDate', appField: 'saleExpiryDate', type: 'timestamp', nullable: true },

    // Billing Address
    { bigQueryColumn: 'BillingStreet', appField: 'billingStreet', type: 'string', nullable: true },
    { bigQueryColumn: 'BillingCity', appField: 'billingCity', type: 'string', nullable: true },
    { bigQueryColumn: 'BillingState', appField: 'billingState', type: 'string', nullable: true },
    { bigQueryColumn: 'BillingPostalCode', appField: 'billingZip', type: 'string', nullable: true },
    { bigQueryColumn: 'BillingCountry', appField: 'billingCountry', type: 'string', nullable: true },
    { bigQueryColumn: 'BillingLocationName', appField: 'billingLocationName', type: 'string', nullable: true },
    { bigQueryColumn: 'BillingContactPerson', appField: 'billingContactPerson', type: 'string', nullable: true },
    { bigQueryColumn: 'BillingPhone', appField: 'billingPhone', type: 'string', nullable: true },

    // Export & ETL
    { bigQueryColumn: 'ExportStatus', appField: 'exportStatus', type: 'string', nullable: true },
    { bigQueryColumn: 'ExportDate', appField: 'exportedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'etl_load_date', appField: 'etlLoadedAt', type: 'timestamp', nullable: true },
  ],
}

/**
 * Leads_S3.rtx_lead_stage - Lead stage tracking
 * Maps to: Lead Service Engine stages
 */
export const RTX_LEAD_STAGE_MAPPING: TableMapping = {
  bigQueryTable: 'Leads_S3.rtx_lead_stage',
  bigQueryDataset: 'Leads_S3',
  sourceSystem: 'LEAD_EXEC',
  description: 'Lead stage history and transitions',
  primaryKey: 'stage_id',
  columns: [
    { bigQueryColumn: 'lead_uid', appField: 'leadId', type: 'string' },
    { bigQueryColumn: 'stage_name', appField: 'stageName', type: 'string' },
    { bigQueryColumn: 'stage_code', appField: 'stageCode', type: 'string' },
    { bigQueryColumn: 'entered_date', appField: 'enteredAt', type: 'timestamp' },
    { bigQueryColumn: 'exited_date', appField: 'exitedAt', type: 'timestamp', nullable: true },
    { bigQueryColumn: 'duration_minutes', appField: 'durationMinutes', type: 'number', nullable: true },
  ],
}

// =============================================================================
// ALL MAPPINGS REGISTRY
// =============================================================================

export const TABLE_MAPPINGS: Record<string, TableMapping> = {
  // Legacy mappings
  leadExec: LEAD_EXEC_MAPPING,
  salesExec: SALES_EXEC_MAPPING,
  prospectPipeline: PROSPECT_PIPELINE_MAPPING,
  contracts: CONTRACTS_MAPPING,

  // TMX Core Tables (S0_TMX - Most Used)
  tmxLead: TMX_LEAD_MAPPING,              // 74M rows, 88 columns - CRITICAL
  tmxEmployee: TMX_EMPLOYEE_MAPPING,      // 1.29M rows, 38 columns
  tmxInspections: TMX_INSPECTIONS_MAPPING, // 3.4M rows, 41 columns

  // Discovered mappings
  dailyAr: DAILY_AR_MAPPING,
  branchHierarchy: BRANCH_HIERARCHY_MAPPING,

  // Deprecated (use TMX mappings instead)
  rtxLead: RTX_LEAD_MAPPING,
  rtxLeadStage: RTX_LEAD_STAGE_MAPPING,
}

// =============================================================================
// DASHBOARD PAGE TO TABLE MAPPINGS
// =============================================================================

/**
 * Maps dashboard pages to their BigQuery data sources
 * Use this to determine which tables to query for each page
 */
export const PAGE_TABLE_MAPPINGS: Record<string, string[]> = {
  // Executive Dashboard
  '/': ['S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw', 'S4.Fact_Leads_Acc_Daily_Dtls_Snp', 'Reports.VwUnf_dim_ar_detail'],

  // Leads Module
  '/leads/type-pest': ['S4.Fact_Leads_Acc_Daily_Dtls_Snp', 'Leads_S3.rtx_lead'],
  '/leads/trends': ['S4.Fact_Leads_Acc_Daily_Agg_Vw'],
  '/leads/rankings': ['S4.Fact_Leads_Acc_Daily_Dtls_Snp'],
  '/leads/cancels': ['S4.Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw'],
  '/leads/geographic': ['S4.Fact_Leads_Acc_Daily_Dtls_Snp', 'Reference.Ref_Map_BranchHeirarchy_GCS'],

  // Lead Service Engine
  '/lead-service-engine': ['Leads_S3.rtx_lead', 'Leads_S3.rtx_lead_stage', 'Leads_S3.rtx_lead_status'],
  '/lead-service-engine/stages': ['Leads_S3.rtx_lead_stage'],
  '/lead-service-engine/at-risk': ['Leads_S3.rtx_lead', 'Leads_S3.rtx_lead_stage'],

  // SALTI Module
  '/salti/daily-check-in': ['S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw'],
  '/salti/productivity': ['S4.Fact_DSP_AllSales_Txn_Na_Daily'],
  '/salti/proposal-pipeline': ['S4.Fact_INP_Details_Txn_Na_Daily_Dtl_vw'],
  '/salti/yoy-trends': ['S4_Reports.YOY'],
  '/salti/funnel-fallout': ['Leads_S3.rtx_lead_stage'],
  '/salti/sales-ladders': ['S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw'],
  '/salti/weekend-blitz': ['S4.Fact_DSP_AllSales_Txn_Na_Daily'],

  // Sales Module
  '/sales/speed-to-install': ['S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw'],
  '/sales/today': ['S4.Fact_DSP_AllSales_Txn_Na_Daily'],
  '/sales/backlog': ['S4.Fact_DSP_StartedSales_Txn_Na_Daily_Dtl_Vw'],
  '/sales/canceled-agreements': ['S4.Fact_ContractCancels_Txn_Na_Daily_Dtl_Vw'],
  '/sales/start-rate': ['S4.Fact_ContractSales_Txn_Na_Daily_Dtl_Vw'],

  // Finance Module
  '/finance/ar': ['Reports.VwUnf_dim_ar_detail', 'Reports.VwUnf_ar_amount'],
  '/finance/pnl': ['Reports.VwUnf_ar_amount'],
  '/finance/projections': ['S4_CusFP.CustomerFP'],

  // Termite Module
  '/termite/pni': ['S4.Fact_PNI_Details_Txn_Na_Daily_Dtl_vw'],
  '/termite/renewals': ['S4.Fact_PortfolioActivity_Txn_Na_Daily_Dtl_Vw_WithProd'],

  // Workforce Module
  '/workforce/tech-productivity': ['S4.Dim_employee', 'S0_TMX.Employees_Main'],

  // HR Module (Workday-sourced via TMX ETL)
  '/hr/retention': ['S0_TMX.tmx_employee', 'S0_TMX.Employees_Main'],

  // Reference/Admin
  '/admin': ['S2.VwUnf_Branch', 'Reference.Ref_Map_BranchHeirarchy_GCS'],
}

/**
 * Get mapping by BigQuery table name
 */
export function getMappingByTable(tableName: string): TableMapping | undefined {
  return Object.values(TABLE_MAPPINGS).find(
    m => m.bigQueryTable.toLowerCase() === tableName.toLowerCase()
  )
}

/**
 * Get mapping by source system
 */
export function getMappingsBySourceSystem(sourceSystem: SourceSystemId): TableMapping[] {
  return Object.values(TABLE_MAPPINGS).filter(m => m.sourceSystem === sourceSystem)
}

/**
 * Transform BigQuery row to app format using column mappings
 */
export function transformRow<T>(
  row: Record<string, unknown>,
  mapping: TableMapping
): T {
  const result: Record<string, unknown> = {}

  for (const col of mapping.columns) {
    const value = row[col.bigQueryColumn]

    if (value === null || value === undefined) {
      if (!col.nullable) {
        console.warn(`Missing required field: ${col.bigQueryColumn}`)
      }
      result[col.appField] = null
      continue
    }

    if (col.transform) {
      result[col.appField] = col.transform(value)
    } else {
      switch (col.type) {
        case 'number':
          result[col.appField] = Number(value)
          break
        case 'boolean':
          result[col.appField] = Boolean(value)
          break
        case 'date':
        case 'timestamp':
          result[col.appField] = new Date(value as string)
          break
        default:
          result[col.appField] = String(value)
      }
    }
  }

  return result as T
}

/**
 * Generate SELECT clause from mapping
 */
export function generateSelectClause(mapping: TableMapping): string {
  return mapping.columns
    .map(col => `${col.bigQueryColumn} AS ${col.appField}`)
    .join(',\n  ')
}
