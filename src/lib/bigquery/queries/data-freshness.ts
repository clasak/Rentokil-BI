/**
 * BigQuery Queries for Data Freshness SLA Tracking
 *
 * Checks when tables were last updated by ETL pipelines using BigQuery metadata.
 * This tracks ACTUAL data freshness (when ETL last ran), not business event times.
 *
 * Source Systems Tracked:
 * - PestPac: Inspections table - field service data
 * - Workday: tmx_employee table - HR/employee data
 * - Lead Exec: tmx_lead table - lead management
 * - Sales Exec: tmx_lead table - sales transactions
 * - Salesforce: tmx_lead table - CRM proposals
 * - Contract Checker: T0_unf_Contract_All - contract/sales data
 * - BCG Analytics: DR_ContractSales - analytics dataset
 * - Qualtrics: Survey data - customer satisfaction
 *
 * SLA Targets (based on ETL schedule):
 * - Hourly (2h): Lead Exec (critical for lead routing)
 * - 2 hours: Contract Checker (critical for sales tracking)
 * - 6 hours: BCG Analytics
 * - Daily (24h): PestPac, Workday, Qualtrics
 * - 48 hours: Sales Exec, Salesforce (accounts for weekends)
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'

// =============================================================================
// Types
// =============================================================================

export type SLAStatus = 'met' | 'breached'
export type TrendDirection = 'up' | 'down' | 'stable'

export interface DataFreshnessSLA {
  id: string
  sourceName: string
  slaTarget: string
  slaMinutes: number
  actualFreshnessMinutes: number
  actualFreshness: string
  status: SLAStatus
  trend: TrendDirection
  lastChecked: string
  tableName: string
  datasetId: string
}

export interface DataFreshnessSummary {
  totalSources: number
  metCount: number
  breachedCount: number
  overallHealth: 'healthy' | 'degraded' | 'critical'
  sources: DataFreshnessSLA[]
  lastUpdated: string
}


// =============================================================================
// SLA Definitions with actual timestamp columns
// =============================================================================

interface SLADefinition {
  id: string
  sourceName: string
  slaTarget: string
  slaMinutes: number
  dataset: string
  tableName: string
  priority: 'critical' | 'high' | 'medium' | 'low'
}

const SLA_DEFINITIONS: SLADefinition[] = [
  // === Core TMX Tables (S0_TMX) ===
  {
    id: 'pp-1',
    sourceName: 'PestPac',
    slaTarget: 'Daily',
    slaMinutes: 1440, // 24 hours - field service data refreshes daily
    dataset: 'S0_TMX',
    tableName: 'Inspections',
    priority: 'critical',
  },
  {
    id: 'wd-1',
    sourceName: 'Workday',
    slaTarget: 'Daily',
    slaMinutes: 1440, // 24 hours - HR data refreshes daily
    dataset: 'S0_TMX',
    tableName: 'tmx_employee',
    priority: 'high',
  },
  {
    id: 'lead-1',
    sourceName: 'Lead Exec',
    slaTarget: '6 hours',
    slaMinutes: 360, // 6 hours - ETL runs every ~5 hours (updated from 2h based on actual schedule)
    dataset: 'S0_TMX',
    tableName: 'tmx_lead',
    priority: 'critical',
  },
  {
    id: 'sales-1',
    sourceName: 'Sales Exec',
    slaTarget: 'Daily',
    slaMinutes: 1440, // 24 hours - same table as Lead Exec, updates every ~5 hours
    dataset: 'S0_TMX',
    tableName: 'tmx_lead',
    priority: 'high',
  },
  {
    id: 'sf-1',
    sourceName: 'Salesforce',
    slaTarget: 'Daily',
    slaMinutes: 1440, // 24 hours - same table as Lead Exec, updates every ~5 hours
    dataset: 'S0_TMX',
    tableName: 'tmx_lead',
    priority: 'high',
  },

  // === Analytics Tables ===
  {
    id: 'bcg-sales-1',
    sourceName: 'BCG Contract Sales',
    slaTarget: '6 hours',
    slaMinutes: 360, // 6 hours - analytics refresh every ~3-4 hours
    dataset: 'BCG_RTD_DB',
    tableName: 'DR_ContractSales',
    priority: 'high',
  },
  {
    id: 'qualtrics-1',
    sourceName: 'Qualtrics Surveys',
    slaTarget: 'Daily',
    slaMinutes: 1440, // 24 hours - survey data refreshes daily
    dataset: 'S0_TMX',
    tableName: 'tmx_survey_Qualtrics_V5',
    priority: 'medium',
  },

  // === DEPRECATED TABLES - Removed from monitoring ===
  // Contract Checker - Table not actively maintained (last update: 6+ months ago)
  // Five9 Call Center - Table does not exist in production
]

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format minutes into human-readable string
 */
function formatFreshness(minutes: number): string {
  if (minutes < 0) return 'Unknown'
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${Math.round(minutes)} min ago`
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`
  }
  const days = Math.floor(minutes / 1440)
  const hours = Math.round((minutes % 1440) / 60)
  return hours > 0 ? `${days}d ${hours}h ago` : `${days}d ago`
}

/**
 * Determine SLA status based on actual vs target
 */
function getSLAStatus(actualMinutes: number, targetMinutes: number): SLAStatus {
  if (actualMinutes < 0) return 'breached' // Unknown = breached
  return actualMinutes <= targetMinutes ? 'met' : 'breached'
}

/**
 * Determine trend based on ratio to target
 */
function getTrend(actualMinutes: number, targetMinutes: number): TrendDirection {
  if (actualMinutes < 0) return 'stable'
  const ratio = actualMinutes / targetMinutes
  if (ratio < 0.5) return 'up' // Well under target = improving
  if (ratio > 0.9) return 'down' // Close to or over target = degrading
  return 'stable'
}

/**
 * Build the timestamp extraction SQL based on column type
 * This checks ACTUAL ETL update times, not business event times
 */
function buildTimestampSQL(sla: SLADefinition, project: string): string {
  // Use BigQuery __TABLES__ metadata to get actual last modification time
  // last_modified_time is in milliseconds since epoch (INT64), so we convert it to TIMESTAMP
  // This shows when the table was last updated by ETL, not when business events occurred
  return `
    SELECT
      TIMESTAMP_DIFF(
        CURRENT_TIMESTAMP(),
        TIMESTAMP_MILLIS(
          (SELECT last_modified_time
           FROM \`${project}.${sla.dataset}.__TABLES__\`
           WHERE table_id = '${sla.tableName}')
        ),
        MINUTE
      ) as freshness_minutes
  `
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Get data freshness for all tracked source systems
 * Checks table metadata to determine when ETL last updated each table
 */
export async function getDataFreshness(): Promise<DataFreshnessSummary> {
  const results: DataFreshnessSLA[] = []

  // Run all queries in parallel for better performance
  const queryPromises = SLA_DEFINITIONS.map(async (sla) => {
    try {
      const sql = buildTimestampSQL(sla, PROJECT)

      const result = await bigQueryClient.query<{
        freshness_minutes: number
      }>(sql)

      if (result.rows.length > 0 && result.rows[0].freshness_minutes !== null) {
        const actualMinutes = result.rows[0].freshness_minutes
        const status = getSLAStatus(actualMinutes, sla.slaMinutes)
        const trend = getTrend(actualMinutes, sla.slaMinutes)

        return {
          id: sla.id,
          sourceName: sla.sourceName,
          slaTarget: sla.slaTarget,
          slaMinutes: sla.slaMinutes,
          actualFreshnessMinutes: actualMinutes,
          actualFreshness: formatFreshness(actualMinutes),
          status,
          trend,
          lastChecked: new Date().toISOString(),
          tableName: sla.tableName,
          datasetId: sla.dataset,
        }
      } else {
        // No data found
        return {
          id: sla.id,
          sourceName: sla.sourceName,
          slaTarget: sla.slaTarget,
          slaMinutes: sla.slaMinutes,
          actualFreshnessMinutes: -1,
          actualFreshness: 'No data',
          status: 'breached' as SLAStatus,
          trend: 'stable' as TrendDirection,
          lastChecked: new Date().toISOString(),
          tableName: sla.tableName,
          datasetId: sla.dataset,
        }
      }
    } catch (error) {
      console.error(`[DataFreshness] Error checking ${sla.sourceName}:`, error)
      // Return error entry
      return {
        id: sla.id,
        sourceName: sla.sourceName,
        slaTarget: sla.slaTarget,
        slaMinutes: sla.slaMinutes,
        actualFreshnessMinutes: -1,
        actualFreshness: 'Error',
        status: 'breached' as SLAStatus,
        trend: 'stable' as TrendDirection,
        lastChecked: new Date().toISOString(),
        tableName: sla.tableName,
        datasetId: sla.dataset,
      }
    }
  })

  // Wait for all queries to complete
  const queryResults = await Promise.all(queryPromises)
  results.push(...queryResults)

  const metCount = results.filter((r) => r.status === 'met').length
  const breachedCount = results.filter((r) => r.status === 'breached').length
  const totalSources = results.length

  // Determine overall health
  let overallHealth: 'healthy' | 'degraded' | 'critical'
  if (breachedCount === 0) {
    overallHealth = 'healthy'
  } else if (breachedCount <= totalSources * 0.25) {
    overallHealth = 'degraded'
  } else {
    overallHealth = 'critical'
  }

  return {
    totalSources,
    metCount,
    breachedCount,
    overallHealth,
    sources: results,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Get freshness for a specific source system
 */
export async function getSourceFreshness(sourceId: string): Promise<DataFreshnessSLA | null> {
  const summary = await getDataFreshness()
  return summary.sources.find((s) => s.id === sourceId) || null
}

/**
 * Check if any critical sources are breached
 */
export async function hasCriticalBreaches(): Promise<boolean> {
  const summary = await getDataFreshness()
  const criticalSources = SLA_DEFINITIONS.filter((s) => s.priority === 'critical').map((s) => s.id)
  return summary.sources.some((s) => criticalSources.includes(s.id) && s.status === 'breached')
}
