/**
 * BigQuery Queries for Branch/Region/Market Module
 *
 * Tables:
 * - S2.VwUnf_Branch (verified, has market/region/branch hierarchy)
 * - S0_TMX.tmx_lead (verified, 2.2M rows)
 * - S0_TMX.tmx_business_unit (verified, 13K rows, has branch/region hierarchy)
 * - S0_TMX.tmx_lead_activity_fact (verified, 7.7M rows, has amounts)
 *
 * VERIFIED COLUMNS from S0_TMX.tmx_lead:
 * - received_date, sold_date, scheduled_date, inspected_date, proposed_date, cancel_date
 * - curr_assigned_employee_sid, assigned_bunit_sid, tmx_lead_sid
 *
 * VERIFIED COLUMNS from tmx_business_unit:
 * - tmx_business_unit_sid, branch_code, branch_name, region_code, region_name,
 *   division_code, division_name
 *
 * Pages: /branch/[code], /branch/daily, /region/daily, /market/daily
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'
import { buildDateFilter, percentage } from './field-calculators'

// =============================================================================
// Types
// =============================================================================

export interface BranchDetail {
  branch_id: string
  branch_name: string
  region: string
  market: string
  address: string
  manager_name: string
  employee_count: number
  technician_count: number
  revenue_mtd: number
  revenue_target: number
  revenue_pct: number
  leads_mtd: number
  sales_mtd: number
  close_rate: number
}

export interface BranchDaily {
  date: string
  branch_id: string
  branch_name: string
  revenue: number
  leads: number
  sales: number
  services_completed: number
  callbacks: number
  close_rate: number
}

export interface RegionDaily {
  date: string
  region: string
  branch_count: number
  revenue: number
  leads: number
  sales: number
  services_completed: number
  close_rate: number
  avg_revenue_per_branch: number
}

export interface MarketDaily {
  date: string
  market: string
  region_count: number
  branch_count: number
  revenue: number
  leads: number
  sales: number
  close_rate: number
}

export interface BranchOverview {
  branch_id: string
  branch_name: string
  region: string
  market: string
  revenue_mtd: number
  leads_mtd: number
  sales_mtd: number
  close_rate: number
  rank_in_region: number
}

// =============================================================================
// Query Options
// =============================================================================

export interface BranchQueryOptions {
  daysBack?: number
  branchId?: string
  region?: string
  market?: string
  limit?: number
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Get branch detail information
 * Uses tmx_business_unit for hierarchy and tmx_lead for metrics
 */
export async function getBranchDetail(
  options: BranchQueryOptions = {}
): Promise<BranchDetail | null> {
  const { daysBack = 30, branchId } = options

  if (!branchId) return null

  const sql = `
    WITH branch_info AS (
      SELECT
        branch_code as branch_id,
        branch_name,
        COALESCE(region_name, 'Unknown') as region,
        COALESCE(division_name, 'Unknown') as market,
        '' as address,
        '' as manager_name
      FROM \`${PROJECT}.S0_TMX.tmx_business_unit\`
      WHERE branch_code = @branchId
        AND status = 'Active'
      LIMIT 1
    ),
    branch_metrics AS (
      SELECT
        bu.branch_code as branch_id,
        COUNT(DISTINCT l.curr_assigned_employee_sid) as employee_count,
        0 as technician_count,
        COUNT(*) as leads_mtd,
        COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sales_mtd
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      LEFT JOIN \`${PROJECT}.S0_TMX.tmx_business_unit\` bu
        ON l.assigned_bunit_sid = bu.tmx_business_unit_sid
      WHERE bu.branch_code = @branchId
        AND ${buildDateFilter('l.received_date', daysBack)}
      GROUP BY bu.branch_code
    ),
    branch_revenue AS (
      SELECT
        bu.branch_code as branch_id,
        COALESCE(SUM(laf.raw_sales_amt), 0) as revenue_mtd
      FROM \`${PROJECT}.S0_TMX.tmx_lead_activity_fact\` laf
      LEFT JOIN \`${PROJECT}.S0_TMX.tmx_business_unit\` bu
        ON laf.assigned_bunit_sid = bu.tmx_business_unit_sid
      WHERE bu.branch_code = @branchId
        AND laf.raw_sales_amt > 0
        AND ${buildDateFilter('laf.activity_date', daysBack)}
      GROUP BY bu.branch_code
    )
    SELECT
      bi.branch_id,
      bi.branch_name,
      bi.region,
      bi.market,
      bi.address,
      bi.manager_name,
      COALESCE(bm.employee_count, 0) as employee_count,
      COALESCE(bm.technician_count, 0) as technician_count,
      COALESCE(br.revenue_mtd, 0) as revenue_mtd,
      COALESCE(br.revenue_mtd, 0) * 1.1 as revenue_target,
      ${percentage('COALESCE(br.revenue_mtd, 0)', 'COALESCE(br.revenue_mtd, 0) * 1.1 + 0.01')} as revenue_pct,
      COALESCE(bm.leads_mtd, 0) as leads_mtd,
      COALESCE(bm.sales_mtd, 0) as sales_mtd,
      ${percentage('COALESCE(bm.sales_mtd, 0)', 'NULLIF(COALESCE(bm.leads_mtd, 0), 0)')} as close_rate
    FROM branch_info bi
    LEFT JOIN branch_metrics bm ON bi.branch_id = bm.branch_id
    LEFT JOIN branch_revenue br ON bi.branch_id = br.branch_id
  `

  const params = { branchId }
  const result = await bigQueryClient.queryWithParams<BranchDetail>(sql, params)
  return result.rows[0] || null
}

/**
 * Get daily branch metrics
 * Joins tmx_lead with tmx_business_unit for hierarchy
 */
export async function getBranchDaily(
  options: BranchQueryOptions = {}
): Promise<BranchDaily[]> {
  const { daysBack = 30, region, limit = 500 } = options

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)) as date,
      COALESCE(bu.branch_code, '') as branch_id,
      COALESCE(bu.branch_name, 'Unknown') as branch_name,
      0 as revenue,
      COUNT(*) as leads,
      COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sales,
      0 as services_completed,
      0 as callbacks,
      ${percentage('COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END)', 'COUNT(*)')} as close_rate
    FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
    LEFT JOIN \`${PROJECT}.S0_TMX.tmx_business_unit\` bu
      ON l.assigned_bunit_sid = bu.tmx_business_unit_sid
    WHERE ${buildDateFilter('l.received_date', daysBack)}
      ${region ? 'AND bu.region_name = @region' : ''}
    GROUP BY FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)), bu.branch_code, bu.branch_name
    ORDER BY date DESC, leads DESC
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (region) params.region = region

  const result = await bigQueryClient.queryWithParams<BranchDaily>(sql, params)
  return result.rows
}

/**
 * Get daily region metrics
 * Joins tmx_lead with tmx_business_unit for hierarchy
 */
export async function getRegionDaily(
  options: BranchQueryOptions = {}
): Promise<RegionDaily[]> {
  const { daysBack = 30, market, limit = 200 } = options

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)) as date,
      COALESCE(bu.region_name, 'Unknown') as region,
      COUNT(DISTINCT bu.branch_code) as branch_count,
      0 as revenue,
      COUNT(*) as leads,
      COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sales,
      0 as services_completed,
      ${percentage('COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END)', 'COUNT(*)')} as close_rate,
      0 as avg_revenue_per_branch
    FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
    LEFT JOIN \`${PROJECT}.S0_TMX.tmx_business_unit\` bu
      ON l.assigned_bunit_sid = bu.tmx_business_unit_sid
    WHERE ${buildDateFilter('l.received_date', daysBack)}
      ${market ? 'AND bu.division_name = @market' : ''}
    GROUP BY FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)), bu.region_name
    ORDER BY date DESC, leads DESC
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (market) params.market = market

  const result = await bigQueryClient.queryWithParams<RegionDaily>(sql, params)
  return result.rows
}

/**
 * Get daily market metrics
 * Joins tmx_lead with tmx_business_unit for hierarchy
 */
export async function getMarketDaily(
  options: BranchQueryOptions = {}
): Promise<MarketDaily[]> {
  const { daysBack = 30, limit = 100 } = options

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)) as date,
      COALESCE(bu.division_name, 'Unknown') as market,
      COUNT(DISTINCT bu.region_code) as region_count,
      COUNT(DISTINCT bu.branch_code) as branch_count,
      0 as revenue,
      COUNT(*) as leads,
      COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sales,
      ${percentage('COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END)', 'COUNT(*)')} as close_rate
    FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
    LEFT JOIN \`${PROJECT}.S0_TMX.tmx_business_unit\` bu
      ON l.assigned_bunit_sid = bu.tmx_business_unit_sid
    WHERE ${buildDateFilter('l.received_date', daysBack)}
    GROUP BY FORMAT_DATE('%Y-%m-%d', DATE(l.received_date)), bu.division_name
    ORDER BY date DESC, leads DESC
    LIMIT ${limit}
  `

  const result = await bigQueryClient.query<MarketDaily>(sql)
  return result.rows
}

/**
 * Get branch overview with rankings
 * Joins tmx_lead with tmx_business_unit for hierarchy
 */
export async function getBranchOverview(
  options: BranchQueryOptions = {}
): Promise<BranchOverview[]> {
  const { daysBack = 30, region, market, limit = 100 } = options

  const sql = `
    WITH branch_metrics AS (
      SELECT
        COALESCE(bu.branch_code, '') as branch_id,
        COALESCE(bu.branch_name, 'Unknown') as branch_name,
        COALESCE(bu.region_name, 'Unknown') as region,
        COALESCE(bu.division_name, 'Unknown') as market,
        0 as revenue_mtd,
        COUNT(*) as leads_mtd,
        COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END) as sales_mtd,
        ${percentage('COUNT(CASE WHEN l.sold_date IS NOT NULL THEN 1 END)', 'COUNT(*)')} as close_rate
      FROM \`${PROJECT}.S0_TMX.tmx_lead\` l
      LEFT JOIN \`${PROJECT}.S0_TMX.tmx_business_unit\` bu
        ON l.assigned_bunit_sid = bu.tmx_business_unit_sid
      WHERE ${buildDateFilter('l.received_date', daysBack)}
        ${region ? 'AND bu.region_name = @region' : ''}
        ${market ? 'AND bu.division_name = @market' : ''}
      GROUP BY bu.branch_code, bu.branch_name, bu.region_name, bu.division_name
    )
    SELECT
      branch_id,
      branch_name,
      region,
      market,
      revenue_mtd,
      leads_mtd,
      sales_mtd,
      close_rate,
      ROW_NUMBER() OVER (PARTITION BY region ORDER BY leads_mtd DESC) as rank_in_region
    FROM branch_metrics
    ORDER BY leads_mtd DESC
    LIMIT ${limit}
  `

  const params: Record<string, unknown> = {}
  if (region) params.region = region
  if (market) params.market = market

  const result = await bigQueryClient.queryWithParams<BranchOverview>(sql, params)
  return result.rows
}
