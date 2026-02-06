/**
 * Integration Status API
 *
 * GET endpoint that returns real-time sync status for all integrated source systems
 * by querying INFORMATION_SCHEMA.JOBS_BY_PROJECT for recent ETL job executions
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { bigQueryClient, BIGQUERY_CONFIG } from '@/lib/bigquery/client'

// =============================================================================
// Types
// =============================================================================

type IntegrationStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'

interface SourceSystemStatus {
  sourceName: string
  status: IntegrationStatus
  lastSyncTime: string | null
  lastJobId: string | null
  errorMessage?: string
  successRate: number
  jobCount: number
}

// =============================================================================
// Source System Definitions
// =============================================================================

interface SourceSystemDefinition {
  name: string
  jobNamePattern: string // Regex pattern to match job names
  slaMinutes: number // Expected sync frequency
}

const SOURCE_SYSTEMS: SourceSystemDefinition[] = [
  {
    name: 'Salesforce',
    jobNamePattern: 'salesforce|sf_|rtxsf',
    slaMinutes: 120, // 2 hours
  },
  {
    name: 'PestPac',
    jobNamePattern: 'pestpac|pp_',
    slaMinutes: 1440, // Daily
  },
  {
    name: 'Workday',
    jobNamePattern: 'workday|wd_|employee',
    slaMinutes: 1440, // Daily
  },
  {
    name: 'Five9',
    jobNamePattern: 'five9|call_center',
    slaMinutes: 60, // Hourly
  },
  {
    name: 'Qualtrics',
    jobNamePattern: 'qualtrics|survey',
    slaMinutes: 1440, // Daily
  },
  {
    name: 'Contract Checker',
    jobNamePattern: 'contract_checker|w3_contract',
    slaMinutes: 120, // 2 hours
  },
]

// =============================================================================
// Helper Functions
// =============================================================================

function determineStatus(
  lastSyncMinutesAgo: number | null,
  slaMinutes: number,
  successRate: number
): IntegrationStatus {
  // If no sync data, mark as critical
  if (lastSyncMinutesAgo === null || lastSyncMinutesAgo < 0) {
    return 'critical'
  }

  // Check success rate first
  if (successRate < 80) {
    return 'critical'
  } else if (successRate < 95) {
    return 'degraded'
  }

  // Check freshness
  if (lastSyncMinutesAgo > slaMinutes * 2) {
    return 'critical'
  } else if (lastSyncMinutesAgo > slaMinutes * 1.5) {
    return 'degraded'
  }

  return 'healthy'
}

/**
 * Generate fallback status when job history is unavailable.
 * Returns "unknown" status for all sources with explanation.
 */
function getFallbackStatus(reason: string): SourceSystemStatus[] {
  return SOURCE_SYSTEMS.map((sourceDef) => ({
    sourceName: sourceDef.name,
    status: 'unknown' as IntegrationStatus,
    lastSyncTime: null,
    lastJobId: null,
    errorMessage: reason,
    successRate: -1, // -1 indicates unknown
    jobCount: 0,
  }))
}

// =============================================================================
// API Handler
// =============================================================================

export async function GET(_request: NextRequest) {
  try {
    const PROJECT = BIGQUERY_CONFIG.projectId

    // Query INFORMATION_SCHEMA for all jobs in last 24 hours
    const sql = `
      SELECT
        job_id,
        user_email,
        creation_time,
        end_time,
        state,
        error_result.message as error_message,
        -- Extract job name from labels or query
        COALESCE(
          (SELECT value FROM UNNEST(labels) WHERE key = 'job_name'),
          REGEXP_EXTRACT(query, r'FROM \`[^.]+\\.([^.]+)\\.')
        ) as job_identifier
      FROM
        \`${PROJECT}.region-us.INFORMATION_SCHEMA.JOBS_BY_PROJECT\`
      WHERE
        creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        AND job_type = 'QUERY'
        AND state = 'DONE'
      ORDER BY
        creation_time DESC
      LIMIT 1000
    `

    const result = await bigQueryClient.query<{
      job_id: string
      user_email: string
      creation_time: string
      end_time: string
      state: string
      error_message: string | null
      job_identifier: string | null
    }>(sql)

    // Process jobs and group by source system
    const sourceStatuses: SourceSystemStatus[] = SOURCE_SYSTEMS.map((sourceDef) => {
      // Filter jobs matching this source system
      const pattern = new RegExp(sourceDef.jobNamePattern, 'i')
      const matchingJobs = result.rows.filter((job) =>
        job.job_identifier && pattern.test(job.job_identifier)
      )

      if (matchingJobs.length === 0) {
        return {
          sourceName: sourceDef.name,
          status: 'critical' as IntegrationStatus,
          lastSyncTime: null,
          lastJobId: null,
          errorMessage: 'No recent job executions found',
          successRate: 0,
          jobCount: 0,
        }
      }

      // Calculate success rate
      const successfulJobs = matchingJobs.filter((j) => !j.error_message)
      const successRate = (successfulJobs.length / matchingJobs.length) * 100

      // Get most recent job
      const lastJob = matchingJobs[0]
      const lastSyncTime = lastJob.end_time
      const lastSyncMinutesAgo = lastJob.end_time
        ? Math.floor(
            (Date.now() - new Date(lastJob.end_time).getTime()) / (1000 * 60)
          )
        : null

      const status = determineStatus(lastSyncMinutesAgo, sourceDef.slaMinutes, successRate)

      return {
        sourceName: sourceDef.name,
        status,
        lastSyncTime,
        lastJobId: lastJob.job_id,
        errorMessage: lastJob.error_message || undefined,
        successRate: Math.round(successRate),
        jobCount: matchingJobs.length,
      }
    })

    return NextResponse.json({
      success: true,
      data: sourceStatuses,
      metadata: {
        timestamp: new Date().toISOString(),
        windowHours: 24,
      },
    })
  } catch (error) {
    // Extract detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    // Check for common BigQuery permission errors
    const isPermissionError = errorMessage.includes('Permission') ||
                              errorMessage.includes('Access Denied') ||
                              errorMessage.includes('403') ||
                              errorMessage.includes('does not have permission')

    console.error('[integration-status] BigQuery Error:', {
      message: errorMessage,
      stack: errorStack,
      isPermissionError,
      projectId: BIGQUERY_CONFIG.projectId,
    })

    // For permission errors, return graceful fallback with "unknown" status
    // This allows the UI to still render without breaking
    if (isPermissionError) {
      return NextResponse.json({
        success: true,
        data: getFallbackStatus('Job history unavailable (requires bigquery.jobs.list permission)'),
        metadata: {
          timestamp: new Date().toISOString(),
          windowHours: 24,
          fallbackMode: true,
          fallbackReason: 'PERMISSION_DENIED',
          hint: 'Grant bigquery.jobs.list permission to enable ETL job tracking',
        },
      })
    }

    // For other errors, return error response with details
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch integration status',
        errorCode: 'QUERY_ERROR',
        details: {
          message: errorMessage,
          projectId: BIGQUERY_CONFIG.projectId,
          hint: 'Check BigQuery query syntax and table access',
        },
      },
      { status: 500 }
    )
  }
}
