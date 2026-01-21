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

export const KNOWN_BIGQUERY_TABLES = {
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
// ALL MAPPINGS REGISTRY
// =============================================================================

export const TABLE_MAPPINGS: Record<string, TableMapping> = {
  leadExec: LEAD_EXEC_MAPPING,
  salesExec: SALES_EXEC_MAPPING,
  prospectPipeline: PROSPECT_PIPELINE_MAPPING,
  contracts: CONTRACTS_MAPPING,
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
