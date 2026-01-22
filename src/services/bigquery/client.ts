/**
 * BigQuery Client Configuration
 *
 * Provides connection to Google BigQuery data warehouse with support
 * for production, staging, and development environments.
 *
 * IMPORTANT: This module is SERVER-ONLY. BigQuery SDK uses Node.js
 * modules (fs, net, etc.) that don't work in browser environments.
 * Only import this in API routes or server components.
 *
 * SETUP:
 * 1. Install: npm install @google-cloud/bigquery
 * 2. Authenticate locally: gcloud auth application-default login
 * 3. Set environment variables in .env.local:
 *    - NEXT_PUBLIC_BIGQUERY_PROJECT=bidata-sharedus-production
 *    - BIGQUERY_DATASET=rtx_data (optional, defaults to rtx_data)
 *
 * ENVIRONMENTS:
 *   bidata-sharedus-production  - Live production data (refreshed daily)
 *   bidata-sharedus-staging     - Pre-production testing
 *   bidata-sharedus-dev         - Development sandbox (safe to experiment)
 */

import 'server-only'
import { BigQuery, Query } from '@google-cloud/bigquery'
import type { BigQueryConfig, BigQueryEnvironment } from './types'

// Re-export types for convenience
export type { BigQueryConfig, BigQueryEnvironment }

// =============================================================================
// Configuration
// =============================================================================

const PROJECT_IDS: Record<BigQueryEnvironment, string> = {
  production: 'bidata-sharedus-production',
  staging: 'bidata-sharedus-staging',
  dev: 'bidata-sharedus-dev'
}

/**
 * Get BigQuery configuration from environment variables
 */
export function getBigQueryConfig(): BigQueryConfig {
  const projectId = process.env.NEXT_PUBLIC_BIGQUERY_PROJECT || PROJECT_IDS.production
  const dataset = process.env.BIGQUERY_DATASET || 'rtx_data'

  // Determine environment from project ID
  let environment: BigQueryEnvironment = 'production'
  if (projectId.includes('staging')) {
    environment = 'staging'
  } else if (projectId.includes('dev')) {
    environment = 'dev'
  }

  const isConfigured = !!projectId
  return { projectId, dataset, environment, isConfigured }
}

/**
 * Check if BigQuery is configured
 */
export function isBigQueryConfigured(): boolean {
  // BigQuery uses Application Default Credentials (ADC)
  // If running locally, user needs to run: gcloud auth application-default login
  // If running on GCP, it uses the service account automatically
  const config = getBigQueryConfig()
  return !!config.projectId
}

// =============================================================================
// BigQuery Client Class
// =============================================================================

export class BigQueryClient {
  private client: BigQuery
  private config: BigQueryConfig

  constructor(config?: Partial<BigQueryConfig>) {
    this.config = { ...getBigQueryConfig(), ...config }
    this.client = new BigQuery({
      projectId: this.config.projectId
    })
  }

  /**
   * Get the fully qualified table name
   */
  getTableName(table: string): string {
    return `\`${this.config.projectId}.${this.config.dataset}.${table}\``
  }

  /**
   * Run a query and return results
   */
  async query<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T[]> {
    const options: Query = {
      query: sql,
      params,
      location: 'US' // Adjust if your BigQuery is in a different location
    }

    const [rows] = await this.client.query(options)
    return rows as T[]
  }

  /**
   * Test connection to BigQuery
   */
  async testConnection(): Promise<{
    connected: boolean
    environment: BigQueryEnvironment
    projectId: string
    dataset: string
    error?: string
  }> {
    try {
      // Simple query to test connection
      await this.query('SELECT 1 as test')
      return {
        connected: true,
        environment: this.config.environment,
        projectId: this.config.projectId,
        dataset: this.config.dataset
      }
    } catch (error) {
      return {
        connected: false,
        environment: this.config.environment,
        projectId: this.config.projectId,
        dataset: this.config.dataset,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Discover available datasets
   */
  async getDatasets(): Promise<string[]> {
    const [datasets] = await this.client.getDatasets()
    return datasets.map(ds => ds.id || '')
  }

  /**
   * Discover tables in a dataset
   */
  async getTables(datasetId?: string): Promise<string[]> {
    const dataset = this.client.dataset(datasetId || this.config.dataset)
    const [tables] = await dataset.getTables()
    return tables.map(t => t.id || '')
  }

  /**
   * Get schema for a table
   */
  async getTableSchema(tableName: string, datasetId?: string): Promise<{
    name: string
    type: string
    mode: string
    description?: string
  }[]> {
    const dataset = this.client.dataset(datasetId || this.config.dataset)
    const table = dataset.table(tableName)
    const [metadata] = await table.getMetadata()
    return metadata.schema?.fields || []
  }

  /**
   * Check if configured
   */
  isConfigured(): boolean {
    return isBigQueryConfigured()
  }

  /**
   * Get current configuration
   */
  getConfig(): BigQueryConfig {
    return { ...this.config }
  }

  /**
   * Switch to a different environment
   */
  switchEnvironment(env: BigQueryEnvironment): void {
    this.config.projectId = PROJECT_IDS[env]
    this.config.environment = env
    this.client = new BigQuery({
      projectId: this.config.projectId
    })
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const bigQueryClient = new BigQueryClient()

// =============================================================================
// Error Types
// =============================================================================

export class BigQueryError extends Error {
  constructor(
    message: string,
    public code?: string,
    public query?: string
  ) {
    super(message)
    this.name = 'BigQueryError'
  }
}
