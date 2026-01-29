/**
 * BigQuery Queries for Sales Tracker (Transaction-level tracking)
 *
 * Data Source: BCG_RTD_DB.DR_ContractSales (3.2M rows, 76 columns)
 *
 * This module pulls individual sales transactions for the sales tracker dashboard.
 * BigQuery provides: Date, Company, Service Type, Contract Value, Started status
 * Google Sheets provides: Lead Type, detailed price breakdown, additional metadata
 *
 * Pages: /ae/tracker (consolidated with tabs)
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'
import type { Transaction, ServiceType, JobType } from '@/types/sales-tracker'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build flexible salesPerson filter (handles "First Last" and "LAST, FIRST" formats)
 */
function buildSalesPersonFilter(columnName: string, paramName: string = 'salesPerson'): string {
  return `AND (
    LOWER(${columnName}) LIKE CONCAT('%', LOWER(SPLIT(@${paramName}, ' ')[SAFE_OFFSET(0)]), '%')
    AND LOWER(${columnName}) LIKE CONCAT('%', LOWER(SPLIT(@${paramName}, ' ')[SAFE_OFFSET(1)]), '%')
    OR LOWER(${columnName}) LIKE CONCAT('%', LOWER(SPLIT(@${paramName}, ', ')[SAFE_OFFSET(0)]), '%')
    AND LOWER(${columnName}) LIKE CONCAT('%', LOWER(SPLIT(@${paramName}, ', ')[SAFE_OFFSET(1)]), '%')
    OR LOWER(${columnName}) LIKE LOWER(CONCAT('%', @${paramName}, '%'))
  )`
}

/**
 * Map product_group to service type
 */
function mapProductGroupToService(productGroup: string): ServiceType {
  const pg = productGroup?.toUpperCase() || ''
  if (pg.includes('TERM') || pg === 'T' || pg === 'WD') return 'Termite'
  if (pg.includes('PEST') || pg === 'P' || pg === 'PC') return 'Pest Control'
  if (pg.includes('WILD') || pg === 'W' || pg === 'WL') return 'Wildlife'
  if (pg.includes('MOSQ') || pg === 'M' || pg === 'MQ') return 'Mosquito'
  if (pg.includes('BEDB') || pg === 'B' || pg === 'BB') return 'Bed Bug'
  if (pg.includes('RODE') || pg.includes('RODENT')) return 'Rodent Control'
  return 'Pest Control'
}

/**
 * Map service_type_desc to job type
 */
function mapServiceTypeToJobType(serviceType: string): JobType {
  const st = serviceType?.toLowerCase() || ''
  if (st.includes('one') || st.includes('initial') || st === 'i' || st === 'j') return 'One-Time'
  if (st.includes('contract') || st.includes('recurring') || st === 'c') return 'Contract'
  return 'Recurring'
}

// =============================================================================
// Query Options
// =============================================================================

export interface SalesTrackerQueryOptions {
  salesPerson?: string
  month?: number    // 1-12
  year?: number
  type?: 'proposal' | 'sale' // Filter by transaction type
  limit?: number
}

// =============================================================================
// Table Configuration
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId
const DATASET = 'BCG_RTD_DB'
const TABLE = 'DR_ContractSales'

// =============================================================================
// Queries
// =============================================================================

/**
 * Get sales tracker transactions from DR_ContractSales
 *
 * Returns: Individual transactions with BigQuery data
 * Note: Lead Type and detailed price breakdown come from Google Sheets
 */
export async function getSalesTrackerTransactions(
  options: SalesTrackerQueryOptions = {}
): Promise<Transaction[]> {
  const {
    salesPerson,
    month,
    year = new Date().getFullYear(),
    type,
    limit = 500,
  } = options

  const monthFilter = month ? 'AND EXTRACT(MONTH FROM sell_date) = @month' : ''

  // Build query based on type filter:
  // - type='proposal': Return ONLY proposals (all transactions)
  // - type='sale': Return ONLY sales (sold transactions with PestPac ID)
  // - type=undefined: Return BOTH (dual classification via UNION)

  const sql = type === undefined ? `
    -- DUAL CLASSIFICATION MODE: Return all transactions as proposals + sold ones as sales
    WITH AggregatedSales AS (
      SELECT
        customer_name,
        sell_date,
        sales_person_nm,
        assigned_branch_code,
        region_cd,
        market_cd,
        -- Aggregate identifiers
        MIN(sales_id) as sales_id,
        MIN(COALESCE(bill_to_id, location_id)) as pestPacId,
        -- Sum all product values
        SUM(COALESCE(job_ini_value, 0)) + SUM(COALESCE(job_non_ini_value, 0)) as total_job_work_price,
        SUM(COALESCE(contract_value, 0)) as total_contract_price,
        -- Consolidate product info
        STRING_AGG(DISTINCT COALESCE(product_group, 'Unknown'), ', ') as product_groups,
        STRING_AGG(DISTINCT COALESCE(service_type_desc, 'Unknown'), ', ') as service_types,
        -- Determine status
        MAX(CASE WHEN started_ind = 'Y' THEN 1 ELSE 0 END) as has_started,
        MAX(location_zip) as location_zip
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
      WHERE EXTRACT(YEAR FROM sell_date) = @year
        ${monthFilter}
        ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
      GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code, region_cd, market_cd
    )
    -- All transactions as proposals
    SELECT
      CONCAT('proposal-', CAST(sales_id AS STRING)) as id,
      FORMAT_DATE('%Y-%m-%d', sell_date) as date,
      COALESCE(customer_name, 'Customer') as companyName,
      'Inbound' as leadType,
      product_groups as productGroup,
      service_types as serviceTypeDesc,
      'proposal' as type,
      total_job_work_price as jobWorkPrice,
      0 as termitePrice,
      total_contract_price as contractPrice,
      CASE WHEN pestPacId IS NOT NULL THEN TRUE ELSE FALSE END as sold,
      FALSE as dead,
      CAST(NULL AS BOOL) as started,
      CAST(NULL AS BOOL) as paid,
      CAST(pestPacId AS STRING) as pestPacId,
      'bigquery' as source
    FROM AggregatedSales

    UNION ALL

    -- Sold transactions as sales
    SELECT
      CONCAT('sale-', CAST(sales_id AS STRING)) as id,
      FORMAT_DATE('%Y-%m-%d', sell_date) as date,
      COALESCE(customer_name, 'Customer') as companyName,
      'Inbound' as leadType,
      product_groups as productGroup,
      service_types as serviceTypeDesc,
      'sale' as type,
      total_job_work_price as jobWorkPrice,
      0 as termitePrice,
      total_contract_price as contractPrice,
      CAST(NULL AS BOOL) as sold,
      CAST(NULL AS BOOL) as dead,
      CASE WHEN has_started = 1 THEN TRUE ELSE FALSE END as started,
      FALSE as paid,
      CAST(pestPacId AS STRING) as pestPacId,
      'bigquery' as source
    FROM AggregatedSales
    WHERE pestPacId IS NOT NULL

    ORDER BY date DESC
    LIMIT ${limit}
  ` : `
    -- SINGLE TYPE MODE: Return only the requested type
    WITH AggregatedSales AS (
      SELECT
        customer_name,
        sell_date,
        sales_person_nm,
        assigned_branch_code,
        region_cd,
        market_cd,
        -- Aggregate identifiers
        MIN(sales_id) as sales_id,
        MIN(COALESCE(bill_to_id, location_id)) as pestPacId,
        -- Sum all product values
        SUM(COALESCE(job_ini_value, 0)) + SUM(COALESCE(job_non_ini_value, 0)) as total_job_work_price,
        SUM(COALESCE(contract_value, 0)) as total_contract_price,
        -- Consolidate product info
        STRING_AGG(DISTINCT COALESCE(product_group, 'Unknown'), ', ') as product_groups,
        STRING_AGG(DISTINCT COALESCE(service_type_desc, 'Unknown'), ', ') as service_types,
        -- Determine status
        MAX(CASE WHEN started_ind = 'Y' THEN 1 ELSE 0 END) as has_started,
        MAX(location_zip) as location_zip
      FROM \`${PROJECT}.BCG_RTD_DB.DR_ContractSales\`
      WHERE EXTRACT(YEAR FROM sell_date) = @year
        ${monthFilter}
        ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
        ${type === 'sale' ? 'AND COALESCE(bill_to_id, location_id) IS NOT NULL' : ''}
      GROUP BY customer_name, sell_date, sales_person_nm, assigned_branch_code, region_cd, market_cd
    )
    SELECT
      CONCAT('${type}-', CAST(sales_id AS STRING)) as id,
      FORMAT_DATE('%Y-%m-%d', sell_date) as date,
      COALESCE(customer_name, 'Customer') as companyName,
      'Inbound' as leadType,
      product_groups as productGroup,
      service_types as serviceTypeDesc,
      '${type}' as type,
      total_job_work_price as jobWorkPrice,
      0 as termitePrice,
      total_contract_price as contractPrice,
      -- PROPOSAL fields (populated when type='proposal')
      ${type === 'proposal' ? 'CASE WHEN pestPacId IS NOT NULL THEN TRUE ELSE FALSE END' : 'CAST(NULL AS BOOL)'} as sold,
      ${type === 'proposal' ? 'FALSE' : 'CAST(NULL AS BOOL)'} as dead,
      -- SALE fields (populated when type='sale')
      ${type === 'sale' ? 'CASE WHEN has_started = 1 THEN TRUE ELSE FALSE END' : 'CAST(NULL AS BOOL)'} as started,
      ${type === 'sale' ? 'FALSE' : 'CAST(NULL AS BOOL)'} as paid,
      CAST(pestPacId AS STRING) as pestPacId,
      'bigquery' as source
    FROM AggregatedSales
    ORDER BY sell_date DESC
    LIMIT ${limit}
  `

  try {
    const params: Record<string, unknown> = {
      year,
    }
    if (month) params.month = month
    if (salesPerson) params.salesPerson = salesPerson

    interface BQRow {
      id: string
      date: string
      companyName: string
      leadType: string
      productGroup: string  // Now comma-separated: "I, P, PC"
      serviceTypeDesc: string  // Now comma-separated
      type: 'proposal' | 'sale'
      jobWorkPrice: number
      termitePrice: number
      contractPrice: number
      started: boolean | null  // NULL for proposals
      paid: boolean | null     // NULL for proposals
      pestPacId: string | null
      sold: boolean | null     // NULL for sales
      dead: boolean | null     // NULL for sales
      source: 'bigquery' | 'manual'
    }

    const result = await bigQueryClient.queryWithParams<BQRow>(sql, params)

    // Transform to Transaction type
    return result.rows.map(row => ({
      id: row.id,
      date: row.date,
      companyName: row.companyName,
      leadType: 'Inbound', // Default, will be overridden by Sheets
      productGroup: row.productGroup || undefined, // Raw comma-separated product groups
      service: mapProductGroupToService(row.productGroup),
      jobType: mapServiceTypeToJobType(row.serviceTypeDesc),
      type: row.type,
      // Proposal-only fields (undefined for sales)
      sold: row.sold !== null ? row.sold : undefined,
      dead: row.dead !== null ? row.dead : undefined,
      // Sale-only fields (undefined for proposals)
      started: row.started !== null ? row.started : undefined,
      paid: row.paid !== null ? row.paid : undefined,
      jobWorkPrice: Number(row.jobWorkPrice) || 0,
      termitePrice: Number(row.termitePrice) || 0,
      contractPrice: Number(row.contractPrice) || 0,
      pestPacId: row.pestPacId || undefined,
      source: 'bigquery',
    }))
  } catch (error) {
    console.error('[Sales Tracker] getSalesTrackerTransactions failed:', error)
    return []
  }
}

/**
 * Get sales tracker monthly totals (used for summary cards)
 */
export async function getSalesTrackerMonthlyTotals(
  options: SalesTrackerQueryOptions = {}
): Promise<{
  month: number
  year: number
  proposalCount: number
  proposalTotal: number
  salesCount: number
  salesTotal: number
  startedCount: number
}> {
  const {
    salesPerson,
    month,
    year = new Date().getFullYear(),
  } = options

  // Build date filter
  let dateFilter = `EXTRACT(YEAR FROM sell_date) = ${year}`
  if (month) {
    dateFilter += ` AND EXTRACT(MONTH FROM sell_date) = ${month}`
  }

  const sql = `
    SELECT
      ${month || 'EXTRACT(MONTH FROM sell_date)'} as month,
      ${year} as year,
      COUNT(*) as proposalCount,
      COALESCE(SUM(contract_value), 0) as proposalTotal,
      COUNTIF(started_ind = 'Y') as salesCount,
      COALESCE(SUM(CASE WHEN started_ind = 'Y' THEN contract_value END), 0) as salesTotal,
      COUNTIF(started_ind = 'Y') as startedCount
    FROM \`${PROJECT}.${DATASET}.${TABLE}\`
    WHERE ${dateFilter}
      ${salesPerson ? buildSalesPersonFilter('sales_person_nm') : ''}
    ${month ? '' : 'GROUP BY EXTRACT(MONTH FROM sell_date)'}
  `

  try {
    const params: Record<string, unknown> = {}
    if (salesPerson) params.salesPerson = salesPerson

    const result = await bigQueryClient.queryWithParams<{
      month: number
      year: number
      proposalCount: number
      proposalTotal: number
      salesCount: number
      salesTotal: number
      startedCount: number
    }>(sql, params)

    return result.rows[0] || {
      month: month || new Date().getMonth() + 1,
      year,
      proposalCount: 0,
      proposalTotal: 0,
      salesCount: 0,
      salesTotal: 0,
      startedCount: 0,
    }
  } catch (error) {
    console.error('[Sales Tracker] getSalesTrackerMonthlyTotals failed:', error)
    return {
      month: month || new Date().getMonth() + 1,
      year,
      proposalCount: 0,
      proposalTotal: 0,
      salesCount: 0,
      salesTotal: 0,
      startedCount: 0,
    }
  }
}

/**
 * Get data freshness metadata for sales tracker
 * Returns the most recent sale date in the DR_ContractSales table
 */
export async function getSalesTrackerDataFreshness(): Promise<{
  lastSaleDate: string
  hoursOld: number
  dataAsOf: string
  isStale: boolean
}> {
  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', MAX(sell_date)) as last_sale_date,
      TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(CAST(sell_date AS TIMESTAMP)), HOUR) as hours_old,
      FORMAT_TIMESTAMP('%Y-%m-%d %I:%M %p %Z', MAX(CAST(sell_date AS TIMESTAMP))) as data_as_of
    FROM \`${PROJECT}.${DATASET}.${TABLE}\`
  `

  try {
    const result = await bigQueryClient.query<{
      last_sale_date: string
      hours_old: number
      data_as_of: string
    }>(sql)

    const row = result.rows[0]

    return {
      lastSaleDate: row.last_sale_date,
      hoursOld: row.hours_old,
      dataAsOf: row.data_as_of,
      isStale: row.hours_old > 6, // Stale if older than 6-hour SLA
    }
  } catch (error) {
    console.error('[Sales Tracker] getSalesTrackerDataFreshness failed:', error)
    return {
      lastSaleDate: 'Unknown',
      hoursOld: 999,
      dataAsOf: 'Unknown',
      isStale: true,
    }
  }
}
