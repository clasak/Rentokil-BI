/**
 * BigQuery Module
 *
 * Exports BigQuery client and types for use throughout the application.
 *
 * Usage:
 * ```typescript
 * import { bigQueryClient, createBigQueryClient } from '@/lib/bigquery'
 *
 * // Test connection
 * const status = await bigQueryClient.testConnection()
 *
 * // Discover schema
 * const discovery = await bigQueryClient.discover()
 *
 * // Run a query
 * const results = await bigQueryClient.query('SELECT * FROM dataset.table LIMIT 10')
 * ```
 */

export {
  bigQueryClient,
  createBigQueryClient,
  BigQueryClient,
  BigQueryApiError,
} from './client'

export {
  BIGQUERY_PROJECTS,
} from './types'

export type {
  BigQueryEnvironment,
  BigQueryConfig,
  BigQueryConnectionStatus,
  BigQueryColumn,
  BigQueryTable,
  BigQueryDataset,
  BigQueryQueryResult,
  BigQueryQueryOptions,
  BigQueryDiscoveryResult,
  BigQueryHealthResult,
} from './types'
