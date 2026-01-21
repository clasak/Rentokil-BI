/**
 * BigQuery Client
 *
 * Client for connecting to Google BigQuery.
 * Supports switching between production/staging/dev environments via env var.
 *
 * Authentication:
 * - Local development: Use `gcloud auth application-default login`
 * - Production: Use service account JSON or Workload Identity
 *
 * Configuration via environment variables:
 * - BIGQUERY_ENVIRONMENT: production | staging | dev (default: dev)
 * - GOOGLE_CLOUD_PROJECT: Override project ID (optional)
 * - BIGQUERY_DATASET: Default dataset name
 * - BIGQUERY_LOCATION: Dataset location (default: US)
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to service account key file (optional)
 */

import { BigQuery, Query } from '@google-cloud/bigquery'
import type {
  BigQueryConfig,
  BigQueryEnvironment,
  BigQueryConnectionStatus,
  BigQueryColumn,
  BigQueryTable,
  BigQueryDataset,
  BigQueryQueryResult,
  BigQueryQueryOptions,
  BigQueryDiscoveryResult,
} from './types'
import { BIGQUERY_PROJECTS } from './types'

/**
 * Get the project ID for a given environment
 */
function getProjectIdForEnvironment(environment: BigQueryEnvironment): string {
  return BIGQUERY_PROJECTS[environment]
}

/**
 * Parse environment from string with fallback
 */
function parseEnvironment(env: string | undefined): BigQueryEnvironment {
  if (env === 'production' || env === 'staging' || env === 'dev') {
    return env
  }
  return 'dev' // Default to dev for safety
}

/**
 * Default configuration from environment variables
 */
function getDefaultConfig(): BigQueryConfig {
  const environment = parseEnvironment(process.env.BIGQUERY_ENVIRONMENT)
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || getProjectIdForEnvironment(environment)

  return {
    environment,
    projectId,
    dataset: process.env.BIGQUERY_DATASET,
    location: process.env.BIGQUERY_LOCATION || 'US',
    timeout: parseInt(process.env.BIGQUERY_TIMEOUT || '30000', 10),
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  }
}

/**
 * BigQuery Client class
 *
 * Provides methods to query BigQuery and discover schema.
 */
export class BigQueryClient {
  private client: BigQuery
  private config: BigQueryConfig

  constructor(config: Partial<BigQueryConfig> = {}) {
    const defaultConfig = getDefaultConfig()
    this.config = { ...defaultConfig, ...config }

    // Ensure projectId matches environment if not explicitly set
    if (!config.projectId) {
      this.config.projectId = getProjectIdForEnvironment(this.config.environment)
    }

    // Initialize BigQuery client
    this.client = new BigQuery({
      projectId: this.config.projectId,
      location: this.config.location,
      keyFilename: this.config.keyFilename,
    })
  }

  /**
   * Get current configuration
   */
  getConfig(): BigQueryConfig {
    return { ...this.config }
  }

  /**
   * Check if client is configured with a valid project
   */
  isConfigured(): boolean {
    return !!this.config.projectId
  }

  /**
   * Get the project ID
   */
  getProjectId(): string | undefined {
    return this.config.projectId
  }

  /**
   * Get the environment
   */
  getEnvironment(): BigQueryEnvironment {
    return this.config.environment
  }

  /**
   * Get the default dataset
   */
  getDefaultDataset(): string | undefined {
    return this.config.dataset
  }

  // ===========================================================================
  // Connection & Health
  // ===========================================================================

  /**
   * Test connection to BigQuery
   */
  async testConnection(): Promise<BigQueryConnectionStatus> {
    const startTime = Date.now()

    try {
      // Try to list datasets as a connection test
      const [datasets] = await this.client.getDatasets({
        maxResults: 10,
      })

      return {
        connected: true,
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        projectId: this.config.projectId,
        environment: this.config.environment,
        datasets: datasets.map((ds) => ds.id || '').filter(Boolean),
      }
    } catch (error) {
      return {
        connected: false,
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        projectId: this.config.projectId,
        environment: this.config.environment,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ===========================================================================
  // Discovery
  // ===========================================================================

  /**
   * List all datasets in the project
   */
  async listDatasets(): Promise<BigQueryDataset[]> {
    const [datasets] = await this.client.getDatasets()

    return Promise.all(
      datasets.map(async (dataset) => {
        const [metadata] = await dataset.getMetadata()

        return {
          id: dataset.id || '',
          projectId: this.config.projectId || '',
          location: metadata.location || this.config.location || 'US',
          creationTime: metadata.creationTime
            ? new Date(parseInt(metadata.creationTime, 10)).toISOString()
            : '',
          lastModifiedTime: metadata.lastModifiedTime
            ? new Date(parseInt(metadata.lastModifiedTime, 10)).toISOString()
            : '',
          description: metadata.description,
        }
      })
    )
  }

  /**
   * List all tables in a dataset
   */
  async listTables(datasetId: string): Promise<BigQueryTable[]> {
    const dataset = this.client.dataset(datasetId)
    const [tables] = await dataset.getTables()

    return Promise.all(
      tables.map(async (table) => {
        const [metadata] = await table.getMetadata()

        // Extract schema columns
        const schema: BigQueryColumn[] = metadata.schema?.fields?.map(
          (field: { name: string; type: string; mode?: string; description?: string; fields?: unknown[] }) => ({
            name: field.name,
            type: field.type,
            mode: (field.mode || 'NULLABLE') as 'NULLABLE' | 'REQUIRED' | 'REPEATED',
            description: field.description,
            fields: field.fields
              ? (field.fields as { name: string; type: string; mode?: string; description?: string }[]).map((f) => ({
                  name: f.name,
                  type: f.type,
                  mode: (f.mode || 'NULLABLE') as 'NULLABLE' | 'REQUIRED' | 'REPEATED',
                  description: f.description,
                }))
              : undefined,
          })
        ) || []

        return {
          id: table.id || '',
          name: metadata.tableReference?.tableId || table.id || '',
          datasetId,
          projectId: this.config.projectId || '',
          type: (metadata.type || 'TABLE') as 'TABLE' | 'VIEW' | 'MATERIALIZED_VIEW' | 'EXTERNAL',
          numRows: metadata.numRows,
          numBytes: metadata.numBytes,
          creationTime: metadata.creationTime
            ? new Date(parseInt(metadata.creationTime, 10)).toISOString()
            : '',
          lastModifiedTime: metadata.lastModifiedTime
            ? new Date(parseInt(metadata.lastModifiedTime, 10)).toISOString()
            : '',
          description: metadata.description,
          schema,
        }
      })
    )
  }

  /**
   * Get full schema for a specific table
   */
  async getTableSchema(datasetId: string, tableId: string): Promise<BigQueryColumn[]> {
    const dataset = this.client.dataset(datasetId)
    const table = dataset.table(tableId)
    const [metadata] = await table.getMetadata()

    return (
      metadata.schema?.fields?.map(
        (field: { name: string; type: string; mode?: string; description?: string; fields?: unknown[] }) => ({
          name: field.name,
          type: field.type,
          mode: (field.mode || 'NULLABLE') as 'NULLABLE' | 'REQUIRED' | 'REPEATED',
          description: field.description,
          fields: field.fields
            ? (field.fields as { name: string; type: string; mode?: string; description?: string }[]).map((f) => ({
                name: f.name,
                type: f.type,
                mode: (f.mode || 'NULLABLE') as 'NULLABLE' | 'REQUIRED' | 'REPEATED',
                description: f.description,
              }))
            : undefined,
        })
      ) || []
    )
  }

  /**
   * Discover all datasets and tables in the project
   */
  async discover(): Promise<BigQueryDiscoveryResult> {
    try {
      const datasets = await this.listDatasets()

      // Fetch tables for each dataset
      const datasetsWithTables = await Promise.all(
        datasets.map(async (dataset) => {
          try {
            const tables = await this.listTables(dataset.id)
            return { ...dataset, tables }
          } catch (error) {
            // If we can't list tables (permission issue), return dataset without tables
            console.warn(
              `[BigQuery] Could not list tables for dataset ${dataset.id}:`,
              error instanceof Error ? error.message : error
            )
            return { ...dataset, tables: [] }
          }
        })
      )

      return {
        projectId: this.config.projectId || '',
        environment: this.config.environment,
        datasets: datasetsWithTables,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        projectId: this.config.projectId || '',
        environment: this.config.environment,
        datasets: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Discovery failed',
      }
    }
  }

  // ===========================================================================
  // Queries
  // ===========================================================================

  /**
   * Execute a query and return results
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    options: BigQueryQueryOptions = {}
  ): Promise<BigQueryQueryResult<T>> {
    const queryOptions: Query = {
      query: sql,
      location: this.config.location,
      useLegacySql: options.useLegacySql ?? false,
      useQueryCache: options.useQueryCache ?? true,
      dryRun: options.dryRun ?? false,
      maxResults: options.maxResults,
      params: options.params,
    }

    // Set default dataset if configured
    if (this.config.dataset) {
      queryOptions.defaultDataset = {
        datasetId: this.config.dataset,
        projectId: this.config.projectId,
      }
    }

    const [job] = await this.client.createQueryJob(queryOptions)
    const [rows] = await job.getQueryResults({
      maxResults: options.maxResults,
      timeoutMs: options.timeout || this.config.timeout,
    })

    // Get job metadata for stats
    const [metadata] = await job.getMetadata()
    const stats = metadata.statistics?.query

    // Extract schema from job metadata
    const schema: BigQueryColumn[] =
      metadata.configuration?.query?.destinationTable?.schema?.fields?.map(
        (field: { name: string; type: string; mode?: string; description?: string }) => ({
          name: field.name,
          type: field.type,
          mode: (field.mode || 'NULLABLE') as 'NULLABLE' | 'REQUIRED' | 'REPEATED',
          description: field.description,
        })
      ) || []

    return {
      rows: rows as T[],
      totalRows: parseInt(stats?.numDmlAffectedRows || rows.length.toString(), 10),
      schema,
      jobId: job.id || '',
      cacheHit: stats?.cacheHit,
      totalBytesProcessed: stats?.totalBytesProcessed,
      totalBytesBilled: stats?.totalBytesBilled,
    }
  }

  /**
   * Execute a query with named parameters
   */
  async queryWithParams<T = Record<string, unknown>>(
    sql: string,
    params: Record<string, unknown>,
    options: Omit<BigQueryQueryOptions, 'params'> = {}
  ): Promise<BigQueryQueryResult<T>> {
    return this.query<T>(sql, { ...options, params })
  }

  /**
   * Execute a query with positional parameters
   */
  async queryWithPositionalParams<T = Record<string, unknown>>(
    sql: string,
    params: unknown[],
    options: Omit<BigQueryQueryOptions, 'params'> = {}
  ): Promise<BigQueryQueryResult<T>> {
    return this.query<T>(sql, { ...options, params })
  }

  /**
   * Validate a query without executing it (dry run)
   */
  async validateQuery(sql: string): Promise<{
    valid: boolean
    bytesProcessed?: string
    error?: string
  }> {
    try {
      const result = await this.query(sql, { dryRun: true })
      return {
        valid: true,
        bytesProcessed: result.totalBytesBilled,
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ===========================================================================
  // Convenience Methods
  // ===========================================================================

  /**
   * Get a sample of rows from a table
   */
  async sampleTable<T = Record<string, unknown>>(
    datasetId: string,
    tableId: string,
    limit = 10
  ): Promise<T[]> {
    const sql = `SELECT * FROM \`${this.config.projectId}.${datasetId}.${tableId}\` LIMIT ${limit}`
    const result = await this.query<T>(sql)
    return result.rows
  }

  /**
   * Get row count for a table
   */
  async getRowCount(datasetId: string, tableId: string): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM \`${this.config.projectId}.${datasetId}.${tableId}\``
    const result = await this.query<{ count: number }>(sql)
    return result.rows[0]?.count || 0
  }

  /**
   * Check if a table exists
   */
  async tableExists(datasetId: string, tableId: string): Promise<boolean> {
    try {
      const dataset = this.client.dataset(datasetId)
      const table = dataset.table(tableId)
      const [exists] = await table.exists()
      return exists
    } catch {
      return false
    }
  }
}

/**
 * BigQuery API Error
 */
export class BigQueryApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public query?: string
  ) {
    super(message)
    this.name = 'BigQueryApiError'
  }
}

// Export singleton instance with default config
export const bigQueryClient = new BigQueryClient()

// Export factory function for custom config
export function createBigQueryClient(config: Partial<BigQueryConfig>): BigQueryClient {
  return new BigQueryClient(config)
}
