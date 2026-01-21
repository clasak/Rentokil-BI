import { NextResponse } from 'next/server'
import { bigQueryClient } from '@/lib/bigquery'
import type { BigQueryHealthResult } from '@/lib/bigquery'

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  bigquery: BigQueryHealthResult
  config: {
    environment: string
    projectId: string | undefined
    dataset: string | undefined
    location: string | undefined
  }
}

/**
 * GET /api/bigquery/health
 *
 * Test BigQuery connection and return health status.
 * Use this endpoint to verify BigQuery access is working.
 *
 * Authentication:
 * - Local: Run `gcloud auth application-default login` first
 * - Production: Use service account or Workload Identity
 *
 * Returns:
 * - Connection status
 * - Available datasets (if connected)
 * - Response time
 * - Configuration details
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const startTime = Date.now()

  // Get configuration
  const config = bigQueryClient.getConfig()

  // Test connection
  const connectionStatus = await bigQueryClient.testConnection()

  // Build health result
  const healthResult: BigQueryHealthResult = {
    status: connectionStatus.connected ? 'ok' : 'error',
    projectId: connectionStatus.projectId,
    environment: connectionStatus.environment,
    datasets: connectionStatus.datasets,
    responseTime: connectionStatus.responseTime,
  }

  if (connectionStatus.error) {
    healthResult.message = connectionStatus.error
  }

  // If connected, check permissions
  if (connectionStatus.connected) {
    healthResult.permissions = {
      canQuery: true, // If we can list datasets, we likely have query access
      canListDatasets: true,
      canListTables: !!(connectionStatus.datasets && connectionStatus.datasets.length > 0),
    }
  }

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy'
  if (connectionStatus.connected) {
    overallStatus = connectionStatus.datasets && connectionStatus.datasets.length > 0
      ? 'healthy'
      : 'degraded'
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    bigquery: healthResult,
    config: {
      environment: config.environment,
      projectId: config.projectId,
      dataset: config.dataset,
      location: config.location,
    },
  }

  // Return appropriate HTTP status
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Response-Time': `${Date.now() - startTime}ms`,
    },
  })
}
