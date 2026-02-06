/**
 * Revenue Forecasting Queries
 *
 * Provides historical revenue data and KPIs for time series forecasting.
 * Uses exponential smoothing for 8-week forward projection with scenario analysis.
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'

// Use environment-aware project ID
const PROJECT = BIGQUERY_CONFIG.projectId

export interface ForecastQueryOptions {
  filters?: {
    weeksBack?: number
    market?: string
    region?: string
    branch?: string
    [key: string]: unknown
  }
  role?: string
  userId?: string
}

export interface HistoricalRevenueRow {
  week_ending: string
  total_revenue: number
  new_sales: number
  renewals: number
  cancellations: number
  net_change: number
}

export interface RevenueKPIs {
  avgWeeklyRevenue: number
  revenueGrowthRate: number
  volatility: number
  seasonalityIndex: number[]
}

export interface ForecastMetrics {
  historicalData: HistoricalRevenueRow[]
  kpis: RevenueKPIs
  lastUpdated: Date
}

/**
 * Get historical weekly revenue data for forecasting
 * Retrieves 26 weeks (6 months) of data for model training
 */
export async function getHistoricalRevenue(options?: ForecastQueryOptions): Promise<HistoricalRevenueRow[]> {
  const weeksBack = options?.filters?.weeksBack || 26

  const sql = `
    WITH weekly_sales AS (
      SELECT
        DATE_TRUNC(SellDate, WEEK) as week_ending,
        SUM(ContractValue) as total_revenue,
        SUM(CASE WHEN ContractType = 'New' THEN ContractValue ELSE 0 END) as new_sales,
        SUM(CASE WHEN ContractType = 'Renewal' THEN ContractValue ELSE 0 END) as renewals,
        SUM(CASE WHEN Status = 'Cancelled' THEN ContractValue ELSE 0 END) as cancellations
      FROM
        \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\`
      WHERE
        SellDate >= DATE_SUB(CURRENT_DATE(), INTERVAL ${weeksBack} WEEK)
        AND SellDate <= CURRENT_DATE()
        AND ContractValue > 0
      GROUP BY
        week_ending
    )
    SELECT
      FORMAT_DATE('%Y-%m-%d', week_ending) as week_ending,
      CAST(total_revenue AS FLOAT64) as total_revenue,
      CAST(new_sales AS FLOAT64) as new_sales,
      CAST(renewals AS FLOAT64) as renewals,
      CAST(cancellations AS FLOAT64) as cancellations,
      CAST(new_sales + renewals - cancellations AS FLOAT64) as net_change
    FROM
      weekly_sales
    ORDER BY
      week_ending ASC
  `

  try {
    const result = await bigQueryClient.query<HistoricalRevenueRow>(sql)
    return result.rows
  } catch (error) {
    throw handleBigQueryError(error, 'getHistoricalRevenue')
  }
}

/**
 * Calculate revenue KPIs for forecasting model
 */
export async function getRevenueKPIs(): Promise<RevenueKPIs> {
  const sql = `
    WITH weekly_stats AS (
      SELECT
        DATE_TRUNC(SellDate, WEEK) as week_ending,
        SUM(ContractValue) as weekly_revenue
      FROM
        \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\`
      WHERE
        SellDate >= DATE_SUB(CURRENT_DATE(), INTERVAL 26 WEEK)
        AND ContractValue > 0
      GROUP BY
        week_ending
    ),
    stats AS (
      SELECT
        AVG(weekly_revenue) as avg_weekly,
        STDDEV(weekly_revenue) as stddev_weekly,
        COUNT(*) as week_count
      FROM weekly_stats
    ),
    growth AS (
      SELECT
        (MAX(weekly_revenue) - MIN(weekly_revenue)) / MIN(weekly_revenue) as growth_rate
      FROM weekly_stats
    )
    SELECT
      CAST(s.avg_weekly AS FLOAT64) as avg_weekly_revenue,
      CAST(g.growth_rate AS FLOAT64) as revenue_growth_rate,
      CAST(s.stddev_weekly / s.avg_weekly AS FLOAT64) as coefficient_of_variation
    FROM stats s
    CROSS JOIN growth g
  `

  try {
    const result = await bigQueryClient.query<{
      avg_weekly_revenue: number
      revenue_growth_rate: number
      coefficient_of_variation: number
    }>(sql)

    if (result.rows.length === 0) {
      return {
        avgWeeklyRevenue: 0,
        revenueGrowthRate: 0,
        volatility: 0,
        seasonalityIndex: Array(12).fill(1)
      }
    }

    const row = result.rows[0]
    return {
      avgWeeklyRevenue: row.avg_weekly_revenue,
      revenueGrowthRate: row.revenue_growth_rate,
      volatility: row.coefficient_of_variation,
      seasonalityIndex: Array(12).fill(1) // Simplified - could calculate monthly seasonality
    }
  } catch (error) {
    throw handleBigQueryError(error, 'getRevenueKPIs')
  }
}

/**
 * Get all forecast metrics in one call
 */
export async function getForecastMetrics(options?: ForecastQueryOptions): Promise<ForecastMetrics> {
  const [historicalData, kpis] = await Promise.all([
    getHistoricalRevenue(options),
    getRevenueKPIs()
  ])

  return {
    historicalData,
    kpis,
    lastUpdated: new Date()
  }
}
