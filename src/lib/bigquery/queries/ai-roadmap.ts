/**
 * BigQuery Queries for AI & Data Science Roadmap
 *
 * Fetches table metadata (row counts) from key datasets to show
 * data readiness for AI/ML initiatives. Uses __TABLES__ metadata
 * for efficient row count retrieval without scanning table contents.
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'

const PROJECT = BIGQUERY_CONFIG.projectId

// =============================================================================
// Types
// =============================================================================

export interface AIRoadmapTableCount {
  dataset: string
  table_id: string
  row_count: number
  size_bytes: number
  size_gb: number
}

export interface AIRoadmapDataCounts {
  tables: AIRoadmapTableCount[]
  totalRows: number
  totalSizeGB: number
  datasetCount: number
  tableCount: number
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get row counts from key tables across datasets for AI readiness indicators.
 * Uses __TABLES__ metadata (zero-cost, instant) instead of COUNT(*) scans.
 */
export async function getAIRoadmapDataCounts(
  options: Record<string, unknown> = {}
): Promise<AIRoadmapDataCounts> {
  void options
  try {
    // Query __TABLES__ metadata from multiple datasets in a single UNION ALL
    const sql = `
      SELECT dataset, table_id, row_count, size_bytes,
             ROUND(size_bytes / 1073741824, 2) AS size_gb
      FROM (
        SELECT 'BCG_RTD_DB' AS dataset, table_id, row_count, size_bytes
        FROM \`${PROJECT}.BCG_RTD_DB.__TABLES__\`
        WHERE table_id IN (
          'DR_Leads', 'DR_ContractSales', 'DR_Cancels', 'DR_PNI',
          'DR_PortfolioDaily', 'DR_PortfolioMonthly', 'DR_GLActivity',
          'DR_Terminations', 'DR_WorkOrders', 'DR_TechWorkOrders',
          'BCG_EmployeePayData_NT', 'MRLTVSummary'
        )

        UNION ALL

        SELECT 'W3_Contract_Checker' AS dataset, table_id, row_count, size_bytes
        FROM \`${PROJECT}.W3_Contract_Checker.__TABLES__\`
        WHERE table_id = 'T0_unf_Contract_All'

        UNION ALL

        SELECT 'S0_TMX' AS dataset, table_id, row_count, size_bytes
        FROM \`${PROJECT}.S0_TMX.__TABLES__\`
        WHERE table_id IN ('tmx_lead', 'tmx_employee', 'Five9_CallLog_Export')

        UNION ALL

        SELECT 'S4' AS dataset, table_id, row_count, size_bytes
        FROM \`${PROJECT}.S4.__TABLES__\`
        WHERE table_id = 'Fact_Leads_Acc_Daily_Dtls_Snp'
      )
      ORDER BY row_count DESC
    `

    const result = await bigQueryClient.query<AIRoadmapTableCount>(sql)
    const tables = (result.rows || []).map(row => ({
      dataset: row.dataset,
      table_id: row.table_id,
      row_count: Number(row.row_count) || 0,
      size_bytes: Number(row.size_bytes) || 0,
      size_gb: Number(row.size_gb) || 0,
    }))

    const totalRows = tables.reduce((sum, t) => sum + t.row_count, 0)
    const totalSizeGB = tables.reduce((sum, t) => sum + t.size_gb, 0)
    const datasets = new Set(tables.map(t => t.dataset))

    return {
      tables,
      totalRows,
      totalSizeGB: Math.round(totalSizeGB * 100) / 100,
      datasetCount: datasets.size,
      tableCount: tables.length,
    }
  } catch (error) {
    throw handleBigQueryError(error, 'ai-roadmap-data-counts')
  }
}
