/**
 * BigQuery Column Registry - Main Entry Point
 *
 * Centralized access to BigQuery column metadata with type-safe lookups.
 * Provides utility functions for searching, validating, and cross-referencing
 * column documentation across all datasets.
 *
 * @example
 * ```typescript
 * import { getColumnMetadata } from '@/lib/bigquery/columns'
 *
 * const sellDate = getColumnMetadata('W3_Contract_Checker', 'T0_unf_Contract_All', 'SellDate')
 * console.log(sellDate?.description)
 * console.log(sellDate?.commonFilters)
 * ```
 */

// Re-export types
export type {
  BigQueryType,
  ColumnMode,
  DataSensitivity,
  BusinessDomain,
  EnumValue,
  ColumnMetadata,
  TableColumns,
  DatasetColumns,
  ColumnLookupResult,
  TableColumnSummary,
  ColumnUsageExample,
} from './types'

// Import table column definitions
import './w3-contract-columns' // W3_Contract_Checker.T0_unf_Contract_All (18 columns)
import './s4-columns' // S4.Fact_Leads_Acc_Daily_Dtls_Snp (17 columns)
import './s0-tmx-columns' // S0_TMX.tmx_lead (17 columns)
import './reports-columns' // Reports.VwUnf_dim_ar_detail (12 columns)
import './s2-columns' // S2.VwUnf_Branch (10 columns)
import './bcg-analytics-columns' // BCG_RTD_DB.DR_ContractSales (12), DR_Leads (9 columns)
import './operations-columns' // S0.raw_RNA_PNIDetails_Daily (10), S0_TMX.Inspections (8 columns)

import type { ColumnMetadata, TableColumns, DatasetColumns, ColumnLookupResult } from './types'

/**
 * Registry of all documented columns organized by dataset → table → column
 * This is built dynamically from individual table column files
 */
const COLUMN_REGISTRY: Record<string, DatasetColumns> = {}

/**
 * Register a table's column definitions into the central registry
 * Called automatically when table column files are imported
 */
export function registerTable(tableColumns: TableColumns): void {
  const { datasetId, tableId } = tableColumns

  if (!COLUMN_REGISTRY[datasetId]) {
    COLUMN_REGISTRY[datasetId] = {
      datasetId,
      tables: {},
    }
  }

  COLUMN_REGISTRY[datasetId].tables[tableId] = tableColumns
}

/**
 * Get metadata for a specific column
 *
 * @param dataset - BigQuery dataset ID (e.g., 'W3_Contract_Checker')
 * @param table - BigQuery table ID (e.g., 'T0_unf_Contract_All')
 * @param column - Column name (e.g., 'SellDate')
 * @returns Column metadata or undefined if not found
 *
 * @example
 * ```typescript
 * const sellDate = getColumnMetadata('W3_Contract_Checker', 'T0_unf_Contract_All', 'SellDate')
 * if (sellDate) {
 *   console.log(sellDate.description)
 *   console.log(sellDate.bigQueryType)
 * }
 * ```
 */
export function getColumnMetadata(
  dataset: string,
  table: string,
  column: string
): ColumnMetadata | undefined {
  const tableColumns = COLUMN_REGISTRY[dataset]?.tables[table]
  return tableColumns?.columns[column]
}

/**
 * Get all columns for a specific table
 *
 * @param dataset - BigQuery dataset ID
 * @param table - BigQuery table ID
 * @returns Table columns or undefined if not found
 *
 * @example
 * ```typescript
 * const contractCols = getTableColumns('W3_Contract_Checker', 'T0_unf_Contract_All')
 * if (contractCols) {
 *   Object.keys(contractCols.columns).forEach(colName => {
 *     console.log(colName, contractCols.columns[colName].description)
 *   })
 * }
 * ```
 */
export function getTableColumns(dataset: string, table: string): TableColumns | undefined {
  return COLUMN_REGISTRY[dataset]?.tables[table]
}

/**
 * Get all tables for a specific dataset
 *
 * @param dataset - BigQuery dataset ID
 * @returns Dataset columns or undefined if not found
 */
export function getDatasetColumns(dataset: string): DatasetColumns | undefined {
  return COLUMN_REGISTRY[dataset]
}

/**
 * Search for columns across all datasets and tables
 *
 * @param query - Search term (matches column name, display name, or description)
 * @param options - Optional filters for dataset or table
 * @returns Array of matching columns with full context
 *
 * @example
 * ```typescript
 * // Find all date columns
 * const dateCols = searchColumns('date')
 *
 * // Find columns in specific dataset
 * const s4Cols = searchColumns('market', { dataset: 'S4' })
 *
 * // Find columns in specific table
 * const contractCols = searchColumns('cancel', {
 *   dataset: 'W3_Contract_Checker',
 *   table: 'T0_unf_Contract_All'
 * })
 * ```
 */
export function searchColumns(
  query: string,
  options?: { dataset?: string; table?: string }
): ColumnLookupResult[] {
  const results: ColumnLookupResult[] = []
  const lowerQuery = query.toLowerCase()

  const datasets = options?.dataset
    ? [COLUMN_REGISTRY[options.dataset]].filter(Boolean)
    : Object.values(COLUMN_REGISTRY)

  for (const dataset of datasets) {
    if (!dataset) continue

    const tables = options?.table
      ? [dataset.tables[options.table]].filter(Boolean)
      : Object.values(dataset.tables)

    for (const table of tables) {
      if (!table) continue

      for (const [colName, colMeta] of Object.entries(table.columns)) {
        // Search in column name, display name, and description
        const searchText = [colName, colMeta.displayName, colMeta.description]
          .join(' ')
          .toLowerCase()

        if (searchText.includes(lowerQuery)) {
          results.push({
            dataset: dataset.datasetId,
            table: table.tableId,
            column: colMeta,
          })
        }
      }
    }
  }

  return results
}

/**
 * Find all columns linked to a specific business field
 *
 * @param fieldId - Field ID from data-dictionary.ts
 * @returns Array of columns that reference this business field
 *
 * @example
 * ```typescript
 * const sellDateCols = getColumnsByBusinessField('sell_date')
 * // Returns SellDate from W3_Contract_Checker, sell_date from BCG_RTD_DB, etc.
 * ```
 */
export function getColumnsByBusinessField(fieldId: string): ColumnLookupResult[] {
  const results: ColumnLookupResult[] = []

  for (const dataset of Object.values(COLUMN_REGISTRY)) {
    for (const table of Object.values(dataset.tables)) {
      for (const [colName, colMeta] of Object.entries(table.columns)) {
        if (colMeta.relatedBusinessField === fieldId) {
          results.push({
            dataset: dataset.datasetId,
            table: table.tableId,
            column: colMeta,
          })
        }
      }
    }
  }

  return results
}

/**
 * Find all deprecated columns across all datasets
 *
 * @returns Array of deprecated columns
 */
export function getDeprecatedColumns(): ColumnLookupResult[] {
  const results: ColumnLookupResult[] = []

  for (const dataset of Object.values(COLUMN_REGISTRY)) {
    for (const table of Object.values(dataset.tables)) {
      for (const [colName, colMeta] of Object.entries(table.columns)) {
        if (colMeta.deprecated) {
          results.push({
            dataset: dataset.datasetId,
            table: table.tableId,
            column: colMeta,
          })
        }
      }
    }
  }

  return results
}

/**
 * Validate that a column exists in the registry
 *
 * @param dataset - BigQuery dataset ID
 * @param table - BigQuery table ID
 * @param column - Column name
 * @returns true if column is documented, false otherwise
 */
export function validateColumnExists(dataset: string, table: string, column: string): boolean {
  return getColumnMetadata(dataset, table, column) !== undefined
}

/**
 * Get all documented datasets
 *
 * @returns Array of dataset IDs
 */
export function getDocumentedDatasets(): string[] {
  return Object.keys(COLUMN_REGISTRY)
}

/**
 * Get all documented tables for a dataset
 *
 * @param dataset - BigQuery dataset ID
 * @returns Array of table IDs
 */
export function getDocumentedTables(dataset: string): string[] {
  const datasetCols = COLUMN_REGISTRY[dataset]
  return datasetCols ? Object.keys(datasetCols.tables) : []
}

/**
 * Get total counts of documented columns
 *
 * @returns Summary statistics
 */
export function getRegistrySummary(): {
  totalDatasets: number
  totalTables: number
  totalColumns: number
} {
  let totalTables = 0
  let totalColumns = 0

  for (const dataset of Object.values(COLUMN_REGISTRY)) {
    totalTables += Object.keys(dataset.tables).length
    for (const table of Object.values(dataset.tables)) {
      totalColumns += Object.keys(table.columns).length
    }
  }

  return {
    totalDatasets: Object.keys(COLUMN_REGISTRY).length,
    totalTables,
    totalColumns,
  }
}
