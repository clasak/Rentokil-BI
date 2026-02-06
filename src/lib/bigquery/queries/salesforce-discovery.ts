/**
 * BigQuery Queries for Salesforce Table Discovery
 *
 * This module provides functions to discover and analyze all Salesforce-related
 * tables in BigQuery using INFORMATION_SCHEMA queries.
 *
 * Purpose: Identify all available Salesforce data tables beyond the 3 currently used
 * (Raw_RTXSF_Opportunity_Daily, Raw_RTXSF_Quote_Daily, Raw_RTXSF_QuoteLineItem_Daily)
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { validateString, ValidationError } from '../validation'

const PROJECT = BIGQUERY_CONFIG.projectId

// Allowlist of datasets that can be queried via Salesforce Discovery
// This prevents arbitrary dataset access through the discovery API
const ALLOWED_DATASETS = new Set([
  'S0_TMX',
  'S4',
  'W3_Contract_Checker',
  'Reports',
  'BCG_RTD_DB',
  'S0',
  'S2',
])

function validateDatasetAllowlist(datasetId: string): void {
  if (!ALLOWED_DATASETS.has(datasetId)) {
    throw new ValidationError(`Dataset '${datasetId}' is not in the allowed datasets list`)
  }
}

// =============================================================================
// Types
// =============================================================================

export interface SalesforceTableDiscovery {
  table_schema: string
  table_name: string
  row_count: number
  size_bytes: number
  creation_time: string
  last_modified: string
  is_rtxsf: boolean
  table_type: string
}

export interface SalesforceColumnSchema {
  column_name: string
  data_type: string
  is_nullable: string
  description: string | null
  ordinal_position: number
}

export interface SalesforceTableSample {
  [key: string]: unknown
}

export interface SalesforceDiscoveryOptions {
  searchPatterns?: string[]
  includeEmptyTables?: boolean
}

// =============================================================================
// Validation
// =============================================================================

function validateDiscoveryOptions(
  options: SalesforceDiscoveryOptions,
  functionName: string
): void {
  try {
    if (options.searchPatterns) {
      options.searchPatterns.forEach((pattern) => {
        validateString(pattern, 'searchPattern', 100)
      })
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error(
        `[SalesforceDiscovery] ${functionName} validation failed:`,
        error.message
      )
      throw error
    }
    throw error
  }
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Discover all Salesforce-related tables in BigQuery
 *
 * Searches INFORMATION_SCHEMA.TABLE_STORAGE for tables matching Salesforce patterns:
 * - %salesforce% - Tables with "salesforce" in name
 * - %RTXSF% - RTX Salesforce sync tables
 * - %lead% - Lead tracking tables
 * - %opportunity% - Opportunity/pipeline tables
 * - %quote% - Quote/proposal tables
 * - %account% - Account/customer tables
 * - %contact% - Contact tables
 *
 * @param options - Optional search patterns and filters
 * @returns Array of discovered tables with metadata
 */
export async function discoverSalesforceTables(
  options: SalesforceDiscoveryOptions = {}
): Promise<SalesforceTableDiscovery[]> {
  validateDiscoveryOptions(options, 'discoverSalesforceTables')

  const defaultPatterns = [
    '%salesforce%',
    '%RTXSF%',
    '%lead%',
    '%opportunity%',
    '%quote%',
    '%account%',
    '%contact%',
    '%contract%',
    '%proposal%',
  ]

  const patterns = options.searchPatterns || defaultPatterns
  const includeEmpty = options.includeEmptyTables ?? false

  try {
    // Build WHERE clause for multiple patterns
    const patternConditions = patterns
      .map((_, idx) => `LOWER(table_name) LIKE LOWER(@pattern${idx})`)
      .join(' OR ')

    // Query specific datasets that likely have Salesforce data
    // Based on the codebase, we know S0, W3_Contract_Checker, BCG_RTD_DB exist
    const datasets = ['S0', 'S0_TMX', 'S4', 'W3_Contract_Checker', 'BCG_RTD_DB', 'Reports']

    const allTables: SalesforceTableDiscovery[] = []

    for (const dataset of datasets) {
      try {
        // Note: INFORMATION_SCHEMA.TABLES doesn't have row_count in standard BigQuery
        // We'll query __TABLES__ metadata for size information
        const sql = `
          SELECT
            '${dataset}' as table_schema,
            table_id as table_name,
            IFNULL(row_count, 0) as row_count,
            IFNULL(size_bytes, 0) as size_bytes,
            FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', TIMESTAMP_MILLIS(creation_time)) as creation_time,
            FORMAT_TIMESTAMP('%Y-%m-%d %H:%M:%S', TIMESTAMP_MILLIS(last_modified_time)) as last_modified,
            CASE
              WHEN table_id LIKE 'Raw_RTXSF_%' OR table_id LIKE 'raw_RTXSF_%' THEN TRUE
              ELSE FALSE
            END as is_rtxsf,
            type as table_type
          FROM \`${PROJECT}.${dataset}.__TABLES__\`
          WHERE (${patterns.map((_, idx) => `LOWER(table_id) LIKE LOWER(@pattern${idx})`).join(' OR ')})
            ${!includeEmpty ? 'AND IFNULL(row_count, 0) > 0' : ''}
        `

        // Build params object with all patterns
        const params = patterns.reduce(
          (acc, pattern, idx) => {
            acc[`pattern${idx}`] = pattern
            return acc
          },
          {} as Record<string, string>
        )

        const result = await bigQueryClient.queryWithParams<SalesforceTableDiscovery>(
          sql,
          params
        )

        if (result.rows.length > 0) {
          console.log(`[SalesforceDiscovery] Found ${result.rows.length} tables in ${dataset}`)
          allTables.push(...result.rows)
        }
      } catch (datasetError) {
        // Dataset might not exist or no access - skip it
        console.log(`[SalesforceDiscovery] Skipping dataset ${dataset}:`, (datasetError as Error).message)
      }
    }

    console.log(`[SalesforceDiscovery] Discovered ${allTables.length} tables total`)

    // Sort by RTXSF status, then row count
    allTables.sort((a, b) => {
      if (a.is_rtxsf !== b.is_rtxsf) {
        return a.is_rtxsf ? -1 : 1
      }
      return b.row_count - a.row_count
    })

    return allTables
  } catch (error) {
    console.error('[SalesforceDiscovery] Discovery query failed:', error)
    return []
  }
}

/**
 * Get detailed schema for a specific Salesforce table
 *
 * @param datasetId - Dataset containing the table (e.g., "S0", "W3_Contract_Checker")
 * @param tableId - Table name (e.g., "Raw_RTXSF_Opportunity_Daily")
 * @returns Array of column schemas with data types and descriptions
 */
export async function getSalesforceTableSchema(
  datasetId: string,
  tableId: string
): Promise<SalesforceColumnSchema[]> {
  try {
    // Validate against allowlist to prevent arbitrary dataset access
    const datasetPattern = /^[a-zA-Z0-9_-]+$/
    const tablePattern = /^[a-zA-Z0-9_-]+$/

    if (!datasetPattern.test(datasetId)) {
      throw new ValidationError('Invalid dataset ID format')
    }
    if (!tablePattern.test(tableId)) {
      throw new ValidationError('Invalid table ID format')
    }
    validateDatasetAllowlist(datasetId)

    const sql = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        CAST(NULL AS STRING) as description,
        ordinal_position
      FROM \`${PROJECT}.${datasetId}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = @tableId
      ORDER BY ordinal_position
    `

    console.log(
      `[SalesforceDiscovery] Getting schema for ${datasetId}.${tableId}`
    )

    const result = await bigQueryClient.queryWithParams<SalesforceColumnSchema>(
      sql,
      { tableId }
    )

    console.log(
      `[SalesforceDiscovery] Found ${result.rows.length} columns for ${datasetId}.${tableId}`
    )

    return result.rows
  } catch (error) {
    console.error(
      `[SalesforceDiscovery] Schema query failed for ${datasetId}.${tableId}:`,
      error
    )
    return []
  }
}

/**
 * Get sample data from a Salesforce table (first 10 rows)
 *
 * @param datasetId - Dataset containing the table
 * @param tableId - Table name
 * @returns Array of sample rows
 */
export async function getSalesforceTableSample(
  datasetId: string,
  tableId: string,
  limit: number = 10
): Promise<SalesforceTableSample[]> {
  try {
    // Validate against allowlist to prevent arbitrary dataset access
    const datasetPattern = /^[a-zA-Z0-9_-]+$/
    const tablePattern = /^[a-zA-Z0-9_-]+$/

    if (!datasetPattern.test(datasetId)) {
      throw new ValidationError('Invalid dataset ID format')
    }
    if (!tablePattern.test(tableId)) {
      throw new ValidationError('Invalid table ID format')
    }
    validateDatasetAllowlist(datasetId)
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100')
    }

    // Use parameterized limit to prevent injection
    const validatedLimit = Math.floor(Number(limit))
    const sql = `
      SELECT *
      FROM \`${PROJECT}.${datasetId}.${tableId}\`
      LIMIT @resultLimit
    `

    console.log(
      `[SalesforceDiscovery] Getting sample data for ${datasetId}.${tableId} (limit: ${validatedLimit})`
    )

    const result = await bigQueryClient.queryWithParams<SalesforceTableSample>(sql, { resultLimit: validatedLimit })

    console.log(
      `[SalesforceDiscovery] Retrieved ${result.rows.length} sample rows from ${datasetId}.${tableId}`
    )

    return result.rows
  } catch (error) {
    console.error(
      `[SalesforceDiscovery] Sample query failed for ${datasetId}.${tableId}:`,
      error
    )
    return []
  }
}

/**
 * Get data quality metrics for a Salesforce table
 *
 * @param datasetId - Dataset containing the table
 * @param tableId - Table name
 * @returns Data quality metrics (null counts, distinct counts, etc.)
 */
export async function getSalesforceTableQuality(
  datasetId: string,
  tableId: string
): Promise<Record<string, unknown>> {
  try {
    // Validate against allowlist to prevent arbitrary dataset access
    const datasetPattern = /^[a-zA-Z0-9_-]+$/
    const tablePattern = /^[a-zA-Z0-9_-]+$/

    if (!datasetPattern.test(datasetId)) {
      throw new ValidationError('Invalid dataset ID format')
    }
    if (!tablePattern.test(tableId)) {
      throw new ValidationError('Invalid table ID format')
    }
    validateDatasetAllowlist(datasetId)

    const sql = `
      SELECT
        COUNT(*) as total_rows,
        COUNT(DISTINCT Id) as distinct_ids,
        COUNTIF(Id IS NULL) as null_ids,
        COUNTIF(CreatedDate IS NULL) as null_created_dates,
        MIN(CreatedDate) as earliest_record,
        MAX(CreatedDate) as latest_record
      FROM \`${PROJECT}.${datasetId}.${tableId}\`
    `

    console.log(
      `[SalesforceDiscovery] Getting data quality for ${datasetId}.${tableId}`
    )

    const result = await bigQueryClient.query<Record<string, unknown>>(sql)

    return result.rows[0] || {}
  } catch (error) {
    console.error(
      `[SalesforceDiscovery] Data quality query failed for ${datasetId}.${tableId}:`,
      error
    )
    return {}
  }
}
