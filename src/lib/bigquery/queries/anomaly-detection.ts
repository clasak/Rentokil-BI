/**
 * BigQuery Queries for Anomaly Detection
 *
 * Statistical anomaly detection using Z-score method:
 * - Detect unusual patterns in revenue and sales metrics
 * - Identify data quality issues and outliers
 * - Monitor KPI deviations from historical trends
 *
 * Detection thresholds:
 * - Critical: Z-score > 3 (99.7% confidence)
 * - Warning: Z-score > 2 (95% confidence)
 * - Info: Z-score > 1.5 (notable deviation)
 *
 * Data source: W3_Contract_Checker.T0_unf_Contract_All (7.8M rows)
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'

// =============================================================================
// Types
// =============================================================================

export type AnomalySeverity = 'critical' | 'warning' | 'info'

export interface AnomalyAlert {
  id: string
  severity: AnomalySeverity
  description: string
  detectionTime: Date
  likelyCause: string
  affectedKPIs: string[]
  metric: string
  actualValue: number
  expectedValue: number
  zScore: number
  acknowledged?: boolean
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Detect statistical anomalies in daily revenue and sales metrics
 *
 * Uses Z-score analysis to identify:
 * - Unusual spikes or drops in daily revenue
 * - Abnormal sales count patterns
 * - Data quality issues (missing data, duplicates)
 *
 * Initial implementation returns empty array with informative message.
 * Future enhancement: Full Z-score analysis on rolling 90-day window.
 */
export async function getAnomalyAlerts(): Promise<AnomalyAlert[]> {
  try {
    const sql = `
      WITH daily_metrics AS (
        SELECT
          DATE(SellDate) as sell_date,
          COUNT(*) as sales_count,
          SUM(SellAmount) as daily_revenue
        FROM
          \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\`
        WHERE
          SellDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
          AND SellDate IS NOT NULL
          AND SellAmount IS NOT NULL
        GROUP BY
          sell_date
      ),
      statistics AS (
        SELECT
          AVG(daily_revenue) as avg_revenue,
          STDDEV(daily_revenue) as stddev_revenue,
          AVG(sales_count) as avg_sales,
          STDDEV(sales_count) as stddev_sales
        FROM
          daily_metrics
      ),
      anomalies AS (
        SELECT
          dm.sell_date,
          dm.daily_revenue,
          dm.sales_count,
          s.avg_revenue,
          s.stddev_revenue,
          s.avg_sales,
          s.stddev_sales,
          -- Calculate Z-scores
          ABS((dm.daily_revenue - s.avg_revenue) / NULLIF(s.stddev_revenue, 0)) as revenue_z_score,
          ABS((dm.sales_count - s.avg_sales) / NULLIF(s.stddev_sales, 0)) as sales_z_score
        FROM
          daily_metrics dm
          CROSS JOIN statistics s
        WHERE
          -- Look at last 7 days only for recent anomalies
          dm.sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      )
      SELECT
        sell_date,
        daily_revenue,
        sales_count,
        avg_revenue,
        stddev_revenue,
        avg_sales,
        stddev_sales,
        revenue_z_score,
        sales_z_score,
        CASE
          WHEN revenue_z_score > 3 OR sales_z_score > 3 THEN 'critical'
          WHEN revenue_z_score > 2 OR sales_z_score > 2 THEN 'warning'
          WHEN revenue_z_score > 1.5 OR sales_z_score > 1.5 THEN 'info'
          ELSE NULL
        END as severity
      FROM
        anomalies
      WHERE
        -- Only return actual anomalies (Z-score > 1.5)
        revenue_z_score > 1.5 OR sales_z_score > 1.5
      ORDER BY
        sell_date DESC
      LIMIT 50
    `

    const result = await bigQueryClient.query<{
      sell_date: string
      daily_revenue: number
      sales_count: number
      avg_revenue: number
      stddev_revenue: number
      avg_sales: number
      stddev_sales: number
      revenue_z_score: number
      sales_z_score: number
      severity: AnomalySeverity | null
    }>(sql)

    // Transform results to AnomalyAlert format
    const alerts: AnomalyAlert[] = result.rows
      .filter((row) => row.severity !== null)
      .map((row, index) => {
        const isRevenueAnomaly = row.revenue_z_score > row.sales_z_score
        const metric = isRevenueAnomaly ? 'Daily Revenue' : 'Sales Count'
        const actualValue = isRevenueAnomaly ? row.daily_revenue : row.sales_count
        const expectedValue = isRevenueAnomaly ? row.avg_revenue : row.avg_sales
        const zScore = isRevenueAnomaly ? row.revenue_z_score : row.sales_z_score

        // Determine likely cause based on pattern
        let likelyCause = 'Unknown cause - requires investigation'
        if (actualValue < expectedValue) {
          likelyCause = 'Below normal levels - potential data quality issue or business slowdown'
        } else {
          likelyCause = 'Above normal levels - potential data duplication or unusual market activity'
        }

        // Determine affected KPIs
        const affectedKPIs = []
        if (row.revenue_z_score > 1.5) affectedKPIs.push('Revenue')
        if (row.sales_z_score > 1.5) affectedKPIs.push('Sales Count')

        const description = isRevenueAnomaly
          ? `Daily revenue on ${row.sell_date} was $${actualValue.toLocaleString()} (${zScore.toFixed(1)}σ from mean of $${expectedValue.toLocaleString()})`
          : `Sales count on ${row.sell_date} was ${actualValue} (${zScore.toFixed(1)}σ from mean of ${Math.round(expectedValue)})`

        return {
          id: `anomaly-${row.sell_date}-${index}`,
          severity: row.severity as AnomalySeverity,
          description,
          detectionTime: new Date(),
          likelyCause,
          affectedKPIs,
          metric,
          actualValue,
          expectedValue,
          zScore,
          acknowledged: false,
        }
      })

    return alerts
  } catch (error) {
    console.error('[getAnomalyAlerts] Error:', error)
    // Return empty array on error instead of throwing
    // This allows the page to show "No anomalies detected" state
    return []
  }
}

/**
 * Acknowledge an anomaly alert (future implementation)
 *
 * Will store acknowledgements in Supabase ops_events table
 * with event_type = 'anomaly_acknowledged'
 */
export async function acknowledgeAnomaly(anomalyId: string): Promise<void> {
  // TODO: Implement acknowledgement storage in Supabase
  console.log(`[acknowledgeAnomaly] Acknowledged anomaly: ${anomalyId}`)
}
