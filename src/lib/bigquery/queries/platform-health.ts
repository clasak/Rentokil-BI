/**
 * Platform Health Metrics Queries
 *
 * Provides real-time platform health monitoring by querying BigQuery INFORMATION_SCHEMA
 * for job execution statistics, query performance, and system uptime metrics.
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'

export interface PlatformHealthMetrics {
  pipelineUptime: number // Percentage (0-100)
  etlJobsSuccessful: number
  etlJobsTotal: number
  avgQueryTime: number // milliseconds
  apiLatency: number // milliseconds
  dataDowntimeMinutes: number
  failedJobsCount: number
  lastUpdated: Date
  restricted?: boolean // True if INFORMATION_SCHEMA access is restricted
}

export interface FailedJob {
  jobId: string
  query: string
  errorMessage: string
  creationTime: Date
  errorCode?: string
  user?: string
}

/**
 * Get platform health metrics from INFORMATION_SCHEMA.JOBS_BY_PROJECT
 * Analyzes last 24 hours of BigQuery job execution
 */
export async function getPlatformHealthMetrics(): Promise<PlatformHealthMetrics> {
  const sql = `
    WITH job_stats AS (
      SELECT
        COUNT(*) as total_jobs,
        COUNTIF(state = 'DONE' AND error_result IS NULL) as successful_jobs,
        COUNTIF(error_result IS NOT NULL) as failed_jobs,
        AVG(TIMESTAMP_DIFF(end_time, start_time, MILLISECOND)) as avg_duration_ms,
        SUM(CASE
          WHEN error_result IS NOT NULL
          THEN TIMESTAMP_DIFF(COALESCE(end_time, CURRENT_TIMESTAMP()), start_time, MINUTE)
          ELSE 0
        END) as downtime_minutes
      FROM
        \`region-us\`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
      WHERE
        creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        AND job_type = 'QUERY'
        AND statement_type NOT IN ('SCRIPT', 'CREATE_TABLE_AS_SELECT')
    )
    SELECT
      total_jobs,
      successful_jobs,
      failed_jobs,
      CAST(avg_duration_ms AS INT64) as avg_duration_ms,
      CAST(downtime_minutes AS INT64) as downtime_minutes,
      CASE
        WHEN total_jobs > 0
        THEN CAST((successful_jobs / total_jobs) * 100 AS FLOAT64)
        ELSE 0
      END as uptime_percentage
    FROM job_stats
  `

  try {
    const result = await bigQueryClient.query<{
      total_jobs: number
      successful_jobs: number
      failed_jobs: number
      avg_duration_ms: number
      downtime_minutes: number
      uptime_percentage: number
    }>(sql)

    if (result.rows.length === 0) {
      // No data available - might be restricted access
      return {
        pipelineUptime: 0,
        etlJobsSuccessful: 0,
        etlJobsTotal: 0,
        avgQueryTime: 0,
        apiLatency: 0,
        dataDowntimeMinutes: 0,
        failedJobsCount: 0,
        lastUpdated: new Date(),
        restricted: true
      }
    }

    const stats = result.rows[0]

    return {
      pipelineUptime: stats.uptime_percentage,
      etlJobsSuccessful: stats.successful_jobs,
      etlJobsTotal: stats.total_jobs,
      avgQueryTime: stats.avg_duration_ms,
      apiLatency: stats.avg_duration_ms, // Using query time as proxy for API latency
      dataDowntimeMinutes: stats.downtime_minutes,
      failedJobsCount: stats.failed_jobs,
      lastUpdated: new Date(),
      restricted: false
    }
  } catch (error: any) {
    // Check if error is due to missing permissions
    if (error?.message?.includes('bigquery.jobs.list') ||
        error?.message?.includes('Access Denied') ||
        error?.message?.includes('permission')) {
      console.log('[getPlatformHealthMetrics] INFORMATION_SCHEMA access restricted, returning placeholder data')
      return {
        pipelineUptime: 0,
        etlJobsSuccessful: 0,
        etlJobsTotal: 0,
        avgQueryTime: 0,
        apiLatency: 0,
        dataDowntimeMinutes: 0,
        failedJobsCount: 0,
        lastUpdated: new Date(),
        restricted: true
      }
    }
    throw handleBigQueryError(error, 'getPlatformHealthMetrics')
  }
}

/**
 * Get detailed information about failed jobs in the last 24 hours
 */
export async function getFailedJobs(limit: number = 10): Promise<FailedJob[]> {
  const sql = `
    SELECT
      job_id,
      SUBSTR(query, 1, 500) as query_excerpt,
      error_result.message as error_message,
      error_result.reason as error_code,
      user_email,
      creation_time
    FROM
      \`region-us\`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
    WHERE
      creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
      AND error_result IS NOT NULL
      AND job_type = 'QUERY'
    ORDER BY
      creation_time DESC
    LIMIT ${limit}
  `

  try {
    const result = await bigQueryClient.query<{
      job_id: string
      query_excerpt: string
      error_message: string
      error_code: string
      user_email: string
      creation_time: { value: string }
    }>(sql)

    return result.rows.map(row => ({
      jobId: row.job_id,
      query: row.query_excerpt,
      errorMessage: row.error_message || 'Unknown error',
      errorCode: row.error_code,
      user: row.user_email,
      creationTime: new Date(row.creation_time.value)
    }))
  } catch (error: any) {
    // If access is restricted, return empty array
    if (error?.message?.includes('bigquery.jobs.list') ||
        error?.message?.includes('Access Denied') ||
        error?.message?.includes('permission')) {
      console.log('[getFailedJobs] INFORMATION_SCHEMA access restricted, returning empty array')
      return []
    }
    throw handleBigQueryError(error, 'getFailedJobs')
  }
}

/**
 * Get ETL-specific job statistics (queries containing INSERT, UPDATE, DELETE, MERGE)
 */
export async function getETLJobStats(): Promise<{
  successfulJobs: number
  totalJobs: number
  avgDurationMinutes: number
}> {
  const sql = `
    SELECT
      COUNT(*) as total_jobs,
      COUNTIF(state = 'DONE' AND error_result IS NULL) as successful_jobs,
      AVG(TIMESTAMP_DIFF(end_time, start_time, MINUTE)) as avg_duration_minutes
    FROM
      \`region-us\`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
    WHERE
      creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
      AND job_type = 'QUERY'
      AND (
        UPPER(query) LIKE '%INSERT%'
        OR UPPER(query) LIKE '%UPDATE%'
        OR UPPER(query) LIKE '%DELETE%'
        OR UPPER(query) LIKE '%MERGE%'
      )
  `

  try {
    const result = await bigQueryClient.query<{
      total_jobs: number
      successful_jobs: number
      avg_duration_minutes: number
    }>(sql)

    if (result.rows.length === 0) {
      return {
        successfulJobs: 0,
        totalJobs: 0,
        avgDurationMinutes: 0
      }
    }

    const stats = result.rows[0]
    return {
      successfulJobs: stats.successful_jobs,
      totalJobs: stats.total_jobs,
      avgDurationMinutes: stats.avg_duration_minutes || 0
    }
  } catch (error: any) {
    if (error?.message?.includes('bigquery.jobs.list') ||
        error?.message?.includes('Access Denied')) {
      return {
        successfulJobs: 0,
        totalJobs: 0,
        avgDurationMinutes: 0
      }
    }
    throw handleBigQueryError(error, 'getETLJobStats')
  }
}
