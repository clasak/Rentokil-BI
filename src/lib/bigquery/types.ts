/**
 * BigQuery Type Definitions
 *
 * Types for BigQuery client configuration, connection status,
 * and schema discovery.
 */

/**
 * BigQuery environment/project options
 */
export type BigQueryEnvironment = 'production' | 'staging' | 'dev'

/**
 * Project ID mapping for each environment
 */
export const BIGQUERY_PROJECTS: Record<BigQueryEnvironment, string> = {
  production: 'bidata-sharedus-production',
  staging: 'bidata-sharedus-staging',
  dev: 'bidata-sharedus-dev',
}

/**
 * BigQuery client configuration
 */
export interface BigQueryConfig {
  /**
   * Environment to use (production, staging, dev)
   * Determines which GCP project to connect to
   */
  environment: BigQueryEnvironment

  /**
   * GCP project ID (derived from environment if not specified)
   */
  projectId?: string

  /**
   * Default dataset to query from
   */
  dataset?: string

  /**
   * Location for dataset (default: US)
   */
  location?: string

  /**
   * Request timeout in milliseconds
   */
  timeout?: number

  /**
   * Path to service account key file (optional - uses ADC if not set)
   */
  keyFilename?: string
}

/**
 * BigQuery connection status
 */
export interface BigQueryConnectionStatus {
  connected: boolean
  lastChecked: string
  responseTime?: number
  projectId?: string
  environment?: BigQueryEnvironment
  error?: string
  datasets?: string[]
}

/**
 * BigQuery table schema column
 */
export interface BigQueryColumn {
  name: string
  type: string
  mode: 'NULLABLE' | 'REQUIRED' | 'REPEATED'
  description?: string
  fields?: BigQueryColumn[] // For RECORD types
}

/**
 * BigQuery table metadata
 */
export interface BigQueryTable {
  id: string
  name: string
  datasetId: string
  projectId: string
  type: 'TABLE' | 'VIEW' | 'MATERIALIZED_VIEW' | 'EXTERNAL'
  numRows?: string
  numBytes?: string
  creationTime: string
  lastModifiedTime: string
  description?: string
  schema?: BigQueryColumn[]
}

/**
 * BigQuery dataset metadata
 */
export interface BigQueryDataset {
  id: string
  projectId: string
  location: string
  creationTime: string
  lastModifiedTime: string
  description?: string
  tables?: BigQueryTable[]
}

/**
 * BigQuery query result
 */
export interface BigQueryQueryResult<T = Record<string, unknown>> {
  rows: T[]
  totalRows: number
  schema: BigQueryColumn[]
  jobId: string
  cacheHit?: boolean
  totalBytesProcessed?: string
  totalBytesBilled?: string
}

/**
 * BigQuery query options
 */
export interface BigQueryQueryOptions {
  /**
   * Maximum number of rows to return
   */
  maxResults?: number

  /**
   * Use query cache if available
   */
  useQueryCache?: boolean

  /**
   * Use legacy SQL syntax (default: false = Standard SQL)
   */
  useLegacySql?: boolean

  /**
   * Request timeout in milliseconds
   */
  timeout?: number

  /**
   * Dry run - validate query without executing
   */
  dryRun?: boolean

  /**
   * Query parameters for parameterized queries
   */
  params?: Record<string, unknown> | unknown[]
}

/**
 * BigQuery discovery result
 */
export interface BigQueryDiscoveryResult {
  projectId: string
  environment: BigQueryEnvironment
  datasets: BigQueryDataset[]
  timestamp: string
  error?: string
}

/**
 * BigQuery health check result
 */
export interface BigQueryHealthResult {
  status: 'ok' | 'warning' | 'error'
  message?: string
  projectId?: string
  environment?: BigQueryEnvironment
  datasets?: string[]
  responseTime?: number
  permissions?: {
    canQuery: boolean
    canListDatasets: boolean
    canListTables: boolean
  }
}
