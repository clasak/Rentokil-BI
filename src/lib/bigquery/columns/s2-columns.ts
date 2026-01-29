/**
 * Column Metadata for S2 Dataset
 *
 * Primary table: VwUnf_Branch
 * Purpose: Organization hierarchy (Market → Region → Branch)
 * Owner: Operations
 * Refresh: Daily
 *
 * Used by: Nearly all queries for organizational filtering
 */

import type { TableColumns } from './types'
import { registerTable } from './index'

export const VWUNF_BRANCH: TableColumns = {
  datasetId: 'S2',
  tableId: 'VwUnf_Branch',
  tableName: 'Branch Hierarchy View',
  description: 'Unified branch dimension with market/region/branch hierarchy (~1,000 branches)',

  columns: {
    Current_State_Branch_Code: {
      columnName: 'Current_State_Branch_Code',
      displayName: 'Branch Code',
      bigQueryType: 'STRING',
      nullable: false,
      mode: 'REQUIRED',
      description: 'Primary key - unique branch identifier',
      businessPurpose: 'Branch identification and joining with fact tables',
      businessOwner: 'Operations',
      domain: 'geography',

      joinKeys: [
        'Primary key for branch joins',
        'W3_Contract_Checker.T0_unf_Contract_All ON Current_State_Branch_Code = AssignedBranchCode',
      ],

      sampleValues: ['1001', '2050', '3125'],
      valueFormat: 'Numeric string (3-4 digits)',
      validationRules: ['Must be unique'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      notes: 'Primary key for all branch joins',
      lastVerified: '2026-01-29',
    },

    RTX_Branch_Name: {
      columnName: 'RTX_Branch_Name',
      displayName: 'Branch Name',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Human-readable branch name',
      businessPurpose: 'Display name for branch in UI and reports',
      businessOwner: 'Operations',
      domain: 'geography',

      sampleValues: ['Boston Branch', 'Dallas Branch', 'Los Angeles Branch'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    RTX_Market_Code: {
      columnName: 'RTX_Market_Code',
      displayName: 'Market Code',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Market code (highest org level)',
      businessPurpose: 'Market-level filtering and rollups',
      businessOwner: 'Operations',
      domain: 'geography',

      commonFilters: [
        'RTX_Market_Code = @marketCode',
        'RTX_Market_Code IN (@marketCodes)',
      ],

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

    RTX_Market_Name: {
      columnName: 'RTX_Market_Name',
      displayName: 'Market Name',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Human-readable market name',
      businessPurpose: 'Display name for market in UI',
      businessOwner: 'Operations',
      domain: 'geography',

      sampleValues: ['Northeast Market', 'Southeast Market', 'Midwest Market'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    RTX_Region_Code: {
      columnName: 'RTX_Region_Code',
      displayName: 'Region Code',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Region code (mid org level)',
      businessPurpose: 'Regional filtering and reporting',
      businessOwner: 'Operations',
      domain: 'geography',

      commonFilters: [
        'RTX_Region_Code = @regionCode',
      ],

      sampleValues: ['NE-01', 'SE-03', 'MW-02'],

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
      description: 'Human-readable region name',
      businessPurpose: 'Display name for region in UI',
      businessOwner: 'Operations',
      domain: 'geography',

      sampleValues: ['Northeast Region 1', 'Southeast Region 3'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    State: {
      columnName: 'State',
      displayName: 'State',
      bigQueryType: 'STRING',
      nullable: true,
      maxLength: 2,
      description: 'US state code where branch is located',
      businessPurpose: 'Geographic reporting and analysis',
      businessOwner: 'Operations',
      domain: 'geography',

      sampleValues: ['MA', 'TX', 'CA', 'IL'],
      valueFormat: 'Two-letter state code (uppercase)',

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    City: {
      columnName: 'City',
      displayName: 'City',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'City where branch is located',
      businessPurpose: 'Geographic analysis and branch location reference',
      businessOwner: 'Operations',
      domain: 'geography',

      sampleValues: ['Boston', 'Dallas', 'Los Angeles', 'Chicago'],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    Active_Flag: {
      columnName: 'Active_Flag',
      displayName: 'Active Flag',
      bigQueryType: 'STRING',
      nullable: true,
      maxLength: 1,
      description: 'Indicates if branch is currently active',
      businessPurpose: 'Filters out closed/inactive branches from reporting',
      businessOwner: 'Operations',
      domain: 'geography',

      commonFilters: [
        "Active_Flag = 'Y'",
      ],

      sampleValues: ['Y', 'N'],
      enumValues: [
        { value: 'Y', label: 'Active', description: 'Branch is currently operating' },
        { value: 'N', label: 'Inactive', description: 'Branch is closed or inactive' },
      ],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },

    Business_Unit_Type: {
      columnName: 'Business_Unit_Type',
      displayName: 'Business Unit Type',
      bigQueryType: 'STRING',
      nullable: true,
      description: 'Type of business unit (Rentokil, Terminix, etc.)',
      businessPurpose: 'Distinguishes legacy brands and acquisition integrations',
      businessOwner: 'Operations',
      domain: 'geography',

      sampleValues: ['Rentokil', 'Terminix', 'Bugout', 'Holders'],
      enumValues: [
        { value: 'Rentokil', label: 'Rentokil' },
        { value: 'Terminix', label: 'Terminix' },
        { value: 'Bugout', label: 'Bugout' },
        { value: 'Holders', label: 'Holders' },
      ],

      sourceSystem: 'rtx_data_hub',

      sensitivity: 'internal',
      piiFlag: false,
      lastVerified: '2026-01-29',
    },
  },
}

registerTable(VWUNF_BRANCH)
export default VWUNF_BRANCH
