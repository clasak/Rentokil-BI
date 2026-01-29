/**
 * Column Metadata for W3_Contract_Checker Dataset
 *
 * Primary table: T0_unf_Contract_All (7.9M rows, 88 columns)
 * Purpose: Contract sales tracking and lifecycle management
 * Owner: Sales Operations
 * Refresh: Every 2 hours
 *
 * Used by queries:
 * - getSpeedToInstall (sales.ts)
 * - getSalesToday (sales.ts)
 * - getBacklog (sales.ts)
 * - getCanceledAgreements (sales.ts)
 * - getStartRate (sales.ts)
 */

import type { TableColumns } from './types'
import { registerTable } from './index'

export const T0_UNF_CONTRACT_ALL: TableColumns = {
  datasetId: 'W3_Contract_Checker',
  tableId: 'T0_unf_Contract_All',
  tableName: 'Unified Contract Details',
  description: 'Comprehensive contract lifecycle tracking from sale to installation',

  columns: {
    // ===== Primary Date Columns =====

    SellDate: {
      columnName: 'SellDate',
      displayName: 'Sell Date',
      bigQueryType: 'DATE',
      nullable: true,
      description: 'Date when the contract was sold/closed',
      businessPurpose: 'Primary date for sales reporting and pipeline analysis',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: [
        "SellDate = CURRENT_DATE('America/New_York')",
        'SellDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)',
        'SellDate BETWEEN @startDate AND @endDate',
      ],

      aggregationExamples: [
        'COUNT(*) ... GROUP BY SellDate',
        "FORMAT_DATE('%Y-%m', SellDate) as month",
      ],

      sampleValues: ['2026-01-15', '2026-01-20', '2026-01-28'],
      valueFormat: 'YYYY-MM-DD',

      sourceSystem: 'sales_exec',
      sourceFieldName: 'Close_Date',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    SellDateYearMonth: {
      columnName: 'SellDateYearMonth',
      displayName: 'Sell Year-Month',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Year and month of sale in YYYYMM integer format',
      businessPurpose: 'Optimized for monthly aggregation and trend analysis',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: [
        'SellDateYearMonth >= 202401',
        'SellDateYearMonth = @yearMonth',
        'SellDateYearMonth BETWEEN 202001 AND 209912',
      ],

      aggregationExamples: [
        'COUNT(*) ... GROUP BY SellDateYearMonth ORDER BY SellDateYearMonth',
      ],

      sampleValues: ['202601', '202512', '202511'],
      valueFormat: 'YYYYMM (integer)',
      validationRules: ['Must be >= 200001 (Jan 2000)', 'Month component (last 2 digits) must be 01-12'],
      typicalRange: { min: 202001, max: 209912 },

      sourceSystem: 'sales_exec',
      transformationApplied: "CAST(FORMAT_DATE('%Y%m', SellDate) AS INT64)",

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    StartDate: {
      columnName: 'StartDate',
      displayName: 'Start Date',
      bigQueryType: 'DATE',
      nullable: true,
      description: 'Date when service was installed/started for the customer',
      businessPurpose: 'Tracks speed-to-install and backlog aging',
      businessOwner: 'Operations',
      domain: 'operations',

      commonFilters: [
        'StartDate IS NULL (backlog)',
        'StartDate IS NOT NULL (started)',
        'StartDate >= @startDate',
      ],

      calculationFormulas: ['DATE_DIFF(StartDate, SellDate, DAY) as days_to_start'],

      sampleValues: ['2026-01-18', '2026-01-25', 'NULL (backlog)'],
      valueFormat: 'YYYY-MM-DD',

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      notes: 'NULL indicates contract sold but not yet installed (backlog)',
      lastVerified: '2026-01-29',
    },

    CancelDate: {
      columnName: 'CancelDate',
      displayName: 'Cancel Date',
      bigQueryType: 'DATE',
      nullable: true,
      description: 'Date when the contract was cancelled',
      businessPurpose: 'Tracks cancellation trends and churn analysis',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: [
        'CancelDate IS NOT NULL',
        'CancelDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)',
      ],

      calculationFormulas: ['DATE_DIFF(CancelDate, SellDate, DAY) as days_to_cancel'],

      sampleValues: ['2026-01-10', '2026-01-22', 'NULL (active)'],
      valueFormat: 'YYYY-MM-DD',

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      notes: 'NULL indicates active contract (not cancelled)',
      lastVerified: '2026-01-29',
    },

    // ===== Value Columns =====

    ContractValue: {
      columnName: 'ContractValue',
      displayName: 'Contract Value',
      bigQueryType: 'FLOAT64',
      nullable: true,
      precision: 2,
      description: 'Total value of the contract in USD',
      businessPurpose: 'Revenue tracking and sales performance metrics',
      businessOwner: 'Finance',
      domain: 'finance',

      aggregationExamples: [
        'SUM(ContractValue) as total_revenue',
        'AVG(ContractValue) as avg_deal_size',
        "SUM(CASE WHEN StartedInd = 'Y' THEN ContractValue END) as started_revenue",
      ],

      sampleValues: ['1200.00', '3500.00', '850.00'],
      valueFormat: '$#,###.##',
      validationRules: ['Must be > 0', 'Typical range: $100 - $50,000'],
      typicalRange: { min: 100, max: 50000 },

      sourceSystem: 'sales_exec',
      sourceFieldName: 'Total_Contract_Value__c',

      sensitivity: 'confidential',
      piiFlag: false,
      notes: 'Includes setup fees and recurring service value',
      lastVerified: '2026-01-29',
    },

    // ===== Status Indicator Columns =====

    StartedInd: {
      columnName: 'StartedInd',
      displayName: 'Started Indicator',
      bigQueryType: 'STRING',
      nullable: true,
      maxLength: 1,
      description: 'Indicates whether the service has been started/installed',
      businessPurpose: 'Differentiates closed-won sales from installed services',
      businessOwner: 'Operations',
      domain: 'operations',

      commonFilters: ["StartedInd = 'Y'", "StartedInd = 'N' (backlog)"],

      aggregationExamples: [
        "COUNTIF(StartedInd = 'Y') as started_count",
        "SAFE_DIVIDE(COUNTIF(StartedInd = 'Y'), COUNT(*)) as start_rate",
      ],

      sampleValues: ['Y', 'N'],
      enumValues: [
        { value: 'Y', label: 'Yes', description: 'Service has been installed' },
        { value: 'N', label: 'No', description: 'Sold but not yet installed (backlog)' },
      ],
      validationRules: ["Must be either 'Y' or 'N'"],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    RawCancelInd: {
      columnName: 'RawCancelInd',
      displayName: 'Raw Cancel Indicator',
      bigQueryType: 'STRING',
      nullable: true,
      maxLength: 1,
      description: 'Indicates whether the contract was cancelled before installation',
      businessPurpose: 'Tracks pre-install cancellations (different from churn)',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      commonFilters: ["RawCancelInd = 'Y'", "(RawCancelInd IS NULL OR RawCancelInd = 'N') (active)"],

      aggregationExamples: ["COUNTIF(RawCancelInd = 'Y') as cancelled_count"],

      sampleValues: ['Y', 'N', 'NULL'],
      enumValues: [
        { value: 'Y', label: 'Yes', description: 'Cancelled before installation' },
        { value: 'N', label: 'No', description: 'Not cancelled' },
      ],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      notes: 'Different from post-install churn; this is pre-service cancellation',
      lastVerified: '2026-01-29',
    },

    // ===== Calculated/Derived Columns =====

    DaysToStart: {
      columnName: 'DaysToStart',
      displayName: 'Days to Start',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Number of days from sale to installation',
      businessPurpose: 'Measures speed-to-install performance (critical ops metric)',
      businessOwner: 'Operations',
      domain: 'operations',

      commonFilters: [
        'DaysToStart IS NOT NULL',
        'DaysToStart <= 7 (within target)',
        'DaysToStart > 14 (aged backlog)',
      ],

      aggregationExamples: [
        'AVG(DaysToStart) as avg_days_to_install',
        'COUNTIF(DaysToStart <= 2) as within_48_hours',
        'PERCENTILE_CONT(DaysToStart, 0.5) OVER() as median_days',
      ],

      sampleValues: ['2', '5', '14', '21'],
      typicalRange: { min: 0, max: 90 },
      validationRules: ['Must be >= 0', 'Target: <= 7 days', 'Red flag: > 30 days'],

      sourceSystem: 'sales_exec',
      transformationApplied: 'DATE_DIFF(StartDate, SellDate, DAY)',

      sensitivity: 'internal',
      piiFlag: false,
      notes: 'NULL when StartDate is NULL (not yet started)',
      lastVerified: '2026-01-29',
    },

    DaysToRawCancel: {
      columnName: 'DaysToRawCancel',
      displayName: 'Days to Raw Cancel',
      bigQueryType: 'INT64',
      nullable: true,
      description: 'Number of days from sale to cancellation',
      businessPurpose: 'Identifies early cancellation patterns and reasons',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      aggregationExamples: [
        'AVG(DaysToRawCancel) as avg_days_to_cancel',
        'COUNTIF(DaysToRawCancel <= 7) as quick_cancels',
      ],

      sampleValues: ['3', '10', '21'],
      typicalRange: { min: 0, max: 90 },

      sourceSystem: 'sales_exec',
      transformationApplied: 'DATE_DIFF(CancelDate, SellDate, DAY)',

      sensitivity: 'internal',
      piiFlag: false,
      notes: "NULL when RawCancelInd != 'Y'",
      lastVerified: '2026-01-29',
    },

    // ===== Organization/Geography Columns =====

    AssignedBranchCode: {
      columnName: 'AssignedBranchCode',
      displayName: 'Branch Code',
      bigQueryType: 'STRING',
      nullable: true,
      maxLength: 10,
      description: 'Code of the branch responsible for this contract',
      businessPurpose: 'Primary dimension for organizational hierarchy filtering',
      businessOwner: 'Operations',
      domain: 'geography',

      commonFilters: [
        'AssignedBranchCode = @branchCode',
        'AssignedBranchCode IN (@branchCodes)',
      ],

      joinKeys: ['S2.VwUnf_Branch ON AssignedBranchCode = Current_State_Branch_Code'],

      aggregationExamples: [
        'GROUP BY AssignedBranchCode',
        'COUNT(*) ... GROUP BY AssignedBranchCode ORDER BY count DESC',
      ],

      sampleValues: ['1001', '2050', '3125'],
      valueFormat: 'Numeric string (3-4 digits)',

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    RegionCode: {
      columnName: 'RegionCode',
      displayName: 'Region Code',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Code of the region containing the assigned branch',
      businessPurpose: 'Regional reporting and hierarchy filtering',
      businessOwner: 'Operations',
      domain: 'geography',

      commonFilters: ['RegionCode = @regionCode', 'RegionCode IN (@regionCodes)'],

      aggregationExamples: ['GROUP BY RegionCode'],

      sampleValues: ['NE-01', 'SE-03', 'MW-02'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    MarketCode: {
      columnName: 'MarketCode',
      displayName: 'Market Code',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Code of the market (highest org level) containing the region',
      businessPurpose: 'Market-level reporting and executive dashboards',
      businessOwner: 'Operations',
      domain: 'geography',

      commonFilters: ['MarketCode = @marketCode', 'MarketCode IN (@marketCodes)'],

      aggregationExamples: ['GROUP BY MarketCode'],

      sampleValues: ['NE', 'SE', 'MW', 'W'],
      enumValues: [
        { value: 'NE', label: 'Northeast' },
        { value: 'SE', label: 'Southeast' },
        { value: 'MW', label: 'Midwest' },
        { value: 'W', label: 'West' },
      ],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    // ===== Product Columns =====

    ProductGroup: {
      columnName: 'ProductGroup',
      displayName: 'Product Group',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'High-level product category (Pest, Termite, etc.)',
      businessPurpose: 'Product line reporting and revenue analysis',
      businessOwner: 'Product Management',
      domain: 'product',

      commonFilters: ["ProductGroup = 'Pest'", "ProductGroup IN ('Pest', 'Termite')"],

      aggregationExamples: ['SUM(ContractValue) ... GROUP BY ProductGroup'],

      sampleValues: ['Pest', 'Termite', 'Wildlife', 'Lawn'],
      enumValues: [
        { value: 'Pest', label: 'Pest Control' },
        { value: 'Termite', label: 'Termite Services' },
        { value: 'Wildlife', label: 'Wildlife Management' },
        { value: 'Lawn', label: 'Lawn Care' },
      ],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    ServiceType: {
      columnName: 'ServiceType',
      displayName: 'Service Type',
      bigQueryType: 'STRING',
      nullable: true,
      maxLength: 1,
      description: 'Service type code (C=Commercial, I=Initial Residential, J=Recurring Residential)',
      businessPurpose: 'Differentiates commercial vs residential revenue streams',
      businessOwner: 'Sales Operations',
      domain: 'product',

      commonFilters: [
        "ServiceType IN ('C', 'I', 'J')",
        "ServiceType = 'C' (commercial only)",
      ],

      aggregationExamples: ['COUNT(*) ... GROUP BY ServiceType'],

      sampleValues: ['C', 'I', 'J'],
      enumValues: [
        { value: 'C', label: 'Commercial', description: 'B2B commercial accounts' },
        { value: 'I', label: 'Initial Residential', description: 'Initial residential service' },
        {
          value: 'J',
          label: 'Recurring Residential',
          description: 'Ongoing residential service',
        },
      ],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    // ===== Customer/People Columns =====

    customer_name: {
      columnName: 'customer_name',
      displayName: 'Customer Name',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Full name of the customer',
      businessPurpose: 'Customer identification in reports and lists',
      businessOwner: 'Sales Operations',
      domain: 'customer',

      sampleValues: ['[REDACTED - PII]'],

      sourceSystem: 'sales_exec',
      sourceFieldName: 'Account_Name',

      sensitivity: 'confidential',
      piiFlag: true,
      encryptionRequired: true,
      notes: 'Contains PII - mask in screenshots/examples',
      lastVerified: '2026-01-29',
    },

    SalesPerson: {
      columnName: 'SalesPerson',
      displayName: 'Sales Person',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Name of the sales representative who closed the deal',
      businessPurpose: 'Sales performance tracking and commission calculations',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      aggregationExamples: ['COUNT(*) ... GROUP BY SalesPerson ORDER BY count DESC'],

      sampleValues: ['[Employee Name]'],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    CancelReasonCode: {
      columnName: 'CancelReasonCode',
      displayName: 'Cancel Reason Code',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Code indicating the reason for contract cancellation',
      businessPurpose: 'Cancellation trend analysis and retention improvement',
      businessOwner: 'Sales Operations',
      domain: 'sales',

      aggregationExamples: [
        "COUNT(*) ... GROUP BY CancelReasonCode WHERE RawCancelInd = 'Y'",
      ],

      sampleValues: ['PRICE', 'TIMING', 'COMPETITION', 'SERVICE'],
      enumValues: [
        { value: 'PRICE', label: 'Price Objection' },
        { value: 'TIMING', label: 'Timing Not Right' },
        { value: 'COMPETITION', label: 'Chose Competitor' },
        { value: 'SERVICE', label: 'Service Issues' },
        { value: 'OTHER', label: 'Other Reason' },
      ],

      sourceSystem: 'sales_exec',

      sensitivity: 'internal',
      piiFlag: false,
      notes: "NULL when RawCancelInd != 'Y'",
      lastVerified: '2026-01-29',
    },

    // ===== Primary Key =====

    salesID: {
      columnName: 'salesID',
      displayName: 'Sales ID',
      bigQueryType: 'INT64',
      nullable: false,
      mode: 'REQUIRED',
      description: 'Unique identifier for the contract/sale',
      businessPurpose:
        'Primary key for joining with other tables and tracking individual contracts',
      businessOwner: 'Data Platform',
      domain: 'sales',

      joinKeys: [
        'BCG_RTD_DB.DR_ContractSales ON salesID = sales_id',
        'S0_TMX.tmx_lead ON salesID = sale_id',
      ],

      sampleValues: ['12345678', '23456789', '34567890'],
      valueFormat: 'Integer (8-9 digits)',
      validationRules: ['Must be unique', 'Must be > 0'],

      sourceSystem: 'sales_exec',
      sourceFieldName: 'Opportunity_ID',

      sensitivity: 'internal',
      piiFlag: false,
      notes: 'Primary key; NOT NULL constraint enforced',
      lastVerified: '2026-01-29',
    },
  },
}

// Register this table in the global registry
registerTable(T0_UNF_CONTRACT_ALL)

export default T0_UNF_CONTRACT_ALL
