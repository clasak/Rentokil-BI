/**
 * BigQuery Query Templates
 *
 * Pre-built queries for common data access patterns.
 * These queries are parameterized and can be customized.
 */

import { KNOWN_BIGQUERY_TABLES } from './mappings'

// =============================================================================
// QUERY BUILDER HELPERS
// =============================================================================

export interface QueryParams {
  project?: string
  dataset?: string
  daysBack?: number
  market?: string
  region?: string
  branch?: string
  limit?: number
  offset?: number
}

function buildWhereClause(params: QueryParams, dateColumn: string): string {
  const conditions: string[] = []

  if (params.daysBack) {
    conditions.push(`${dateColumn} >= DATE_SUB(CURRENT_DATE(), INTERVAL ${params.daysBack} DAY)`)
  }

  if (params.market) {
    conditions.push(`market = '${params.market}'`)
  }

  if (params.region) {
    conditions.push(`region = '${params.region}'`)
  }

  if (params.branch) {
    conditions.push(`branch = '${params.branch}'`)
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
}

function buildLimitClause(params: QueryParams): string {
  if (params.limit) {
    const offset = params.offset ? `OFFSET ${params.offset}` : ''
    return `LIMIT ${params.limit} ${offset}`
  }
  return ''
}

// =============================================================================
// LEAD QUERIES
// =============================================================================

export const LEAD_QUERIES = {
  /**
   * Get all leads from Lead Exec
   */
  getAllLeads: (params: QueryParams = {}) => `
    SELECT
      lead_id,
      lead_source,
      lead_stage,
      assigned_to,
      received_date,
      last_modified_date,
      disposition,
      market,
      region,
      branch,
      first_name,
      last_name,
      email,
      phone
    FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.leadsExecExtract}\`
    ${buildWhereClause(params, 'received_date')}
    ORDER BY received_date DESC
    ${buildLimitClause(params)}
  `,

  /**
   * Get lead counts by stage
   */
  getLeadsByStage: (params: QueryParams = {}) => `
    SELECT
      lead_stage,
      COUNT(*) as count,
      COUNT(DISTINCT assigned_to) as unique_assignees
    FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.leadsExecExtract}\`
    ${buildWhereClause(params, 'received_date')}
    GROUP BY lead_stage
    ORDER BY count DESC
  `,

  /**
   * Get lead counts by source
   */
  getLeadsBySource: (params: QueryParams = {}) => `
    SELECT
      lead_source,
      COUNT(*) as count,
      COUNT(CASE WHEN disposition = 'Converted' THEN 1 END) as converted,
      SAFE_DIVIDE(
        COUNT(CASE WHEN disposition = 'Converted' THEN 1 END),
        COUNT(*)
      ) as conversion_rate
    FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.leadsExecExtract}\`
    ${buildWhereClause(params, 'received_date')}
    GROUP BY lead_source
    ORDER BY count DESC
  `,

  /**
   * Get lead funnel metrics
   */
  getLeadFunnel: (params: QueryParams = {}) => `
    WITH lead_stages AS (
      SELECT
        lead_id,
        lead_stage,
        received_date,
        ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY last_modified_date DESC) as rn
      FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.leadsExecExtract}\`
      ${buildWhereClause(params, 'received_date')}
    )
    SELECT
      lead_stage,
      COUNT(*) as count
    FROM lead_stages
    WHERE rn = 1
    GROUP BY lead_stage
    ORDER BY
      CASE lead_stage
        WHEN 'New' THEN 1
        WHEN 'Contacted' THEN 2
        WHEN 'Qualified' THEN 3
        WHEN 'Scheduled' THEN 4
        WHEN 'Proposed' THEN 5
        WHEN 'Negotiating' THEN 6
        WHEN 'Closed Won' THEN 7
        WHEN 'Closed Lost' THEN 8
        ELSE 99
      END
  `,

  /**
   * Get leads by type (pest type)
   */
  getLeadsByTypePest: (params: QueryParams = {}) => `
    SELECT
      COALESCE(service_type, 'General Pest') as pest_type,
      COUNT(*) as lead_count,
      SUM(CASE WHEN disposition = 'Converted' THEN 1 ELSE 0 END) as converted,
      AVG(CASE WHEN estimated_value IS NOT NULL THEN estimated_value ELSE 0 END) as avg_value
    FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.leadsExecExtract}\`
    ${buildWhereClause(params, 'received_date')}
    GROUP BY pest_type
    ORDER BY lead_count DESC
  `,
}

// =============================================================================
// SALES QUERIES
// =============================================================================

export const SALES_QUERIES = {
  /**
   * Get all opportunities from Sales Exec
   */
  getAllOpportunities: (params: QueryParams = {}) => `
    SELECT
      lead_id,
      opportunity_id,
      stage,
      amount,
      close_date,
      created_date,
      owner_id,
      owner_name,
      source,
      market,
      region,
      account_name,
      service_type,
      probability
    FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.salesExecExtract}\`
    ${buildWhereClause(params, 'created_date')}
    ORDER BY created_date DESC
    ${buildLimitClause(params)}
  `,

  /**
   * Get pipeline summary by stage
   */
  getPipelineByStage: (params: QueryParams = {}) => `
    SELECT
      stage,
      COUNT(*) as opportunity_count,
      SUM(amount) as total_value,
      AVG(amount) as avg_value,
      AVG(probability) as avg_probability
    FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.salesExecExtract}\`
    ${buildWhereClause(params, 'created_date')}
    GROUP BY stage
    ORDER BY
      CASE stage
        WHEN 'Qualification' THEN 1
        WHEN 'Needs Analysis' THEN 2
        WHEN 'Proposal' THEN 3
        WHEN 'Negotiation' THEN 4
        WHEN 'Closed Won' THEN 5
        WHEN 'Closed Lost' THEN 6
        ELSE 99
      END
  `,

  /**
   * Get sales by rep (sales ladder)
   */
  getSalesLadder: (params: QueryParams = {}) => `
    SELECT
      owner_id,
      owner_name,
      COUNT(*) as total_opportunities,
      SUM(CASE WHEN stage = 'Closed Won' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN stage = 'Closed Lost' THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN stage = 'Closed Won' THEN amount ELSE 0 END) as revenue,
      SAFE_DIVIDE(
        SUM(CASE WHEN stage = 'Closed Won' THEN 1 ELSE 0 END),
        SUM(CASE WHEN stage IN ('Closed Won', 'Closed Lost') THEN 1 ELSE 0 END)
      ) as win_rate
    FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.salesExecExtract}\`
    ${buildWhereClause(params, 'created_date')}
    GROUP BY owner_id, owner_name
    ORDER BY revenue DESC
    ${buildLimitClause(params)}
  `,

  /**
   * Get speed to install metrics
   */
  getSpeedToInstall: (params: QueryParams = {}) => `
    SELECT
      DATE_TRUNC(close_date, WEEK) as week,
      AVG(DATE_DIFF(install_date, close_date, DAY)) as avg_days_to_install,
      COUNT(*) as installs,
      SUM(CASE WHEN DATE_DIFF(install_date, close_date, DAY) <= 7 THEN 1 ELSE 0 END) as within_7_days,
      SUM(CASE WHEN DATE_DIFF(install_date, close_date, DAY) <= 14 THEN 1 ELSE 0 END) as within_14_days
    FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.salesExecExtract}\`
    WHERE stage = 'Closed Won'
      AND install_date IS NOT NULL
      ${params.daysBack ? `AND close_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${params.daysBack} DAY)` : ''}
    GROUP BY week
    ORDER BY week DESC
  `,

  /**
   * Get canceled agreements
   */
  getCanceledAgreements: (params: QueryParams = {}) => `
    SELECT
      opportunity_id,
      account_name,
      owner_name,
      amount,
      cancel_date,
      cancel_reason,
      days_to_cancel
    FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.salesExecExtract}\`
    WHERE stage = 'Canceled'
      ${params.daysBack ? `AND cancel_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${params.daysBack} DAY)` : ''}
    ORDER BY cancel_date DESC
    ${buildLimitClause(params)}
  `,

  /**
   * Get backlog pipeline
   */
  getBacklog: (params: QueryParams = {}) => `
    SELECT
      opportunity_id,
      account_name,
      owner_name,
      amount,
      stage,
      close_date,
      scheduled_install_date,
      DATE_DIFF(CURRENT_DATE(), close_date, DAY) as days_since_close
    FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.salesExecExtract}\`
    WHERE stage = 'Closed Won'
      AND install_date IS NULL
      ${params.daysBack ? `AND close_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ${params.daysBack} DAY)` : ''}
    ORDER BY days_since_close DESC
    ${buildLimitClause(params)}
  `,
}

// =============================================================================
// FINANCE QUERIES
// =============================================================================

export const FINANCE_QUERIES = {
  /**
   * Get AR aging summary
   */
  getARAging: (params: QueryParams = {}) => `
    SELECT
      CASE
        WHEN days_outstanding <= 30 THEN '0-30'
        WHEN days_outstanding <= 60 THEN '31-60'
        WHEN days_outstanding <= 90 THEN '61-90'
        ELSE '90+'
      END as aging_bucket,
      COUNT(*) as invoice_count,
      SUM(amount_due) as total_amount,
      AVG(amount_due) as avg_amount
    FROM (
      SELECT
        invoice_id,
        amount_due,
        DATE_DIFF(CURRENT_DATE(), due_date, DAY) as days_outstanding
      FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.invoices\`
      WHERE status = 'Outstanding'
    )
    GROUP BY aging_bucket
    ORDER BY
      CASE aging_bucket
        WHEN '0-30' THEN 1
        WHEN '31-60' THEN 2
        WHEN '61-90' THEN 3
        ELSE 4
      END
  `,

  /**
   * Get revenue projections
   */
  getRevenueProjections: (params: QueryParams = {}) => `
    SELECT
      DATE_TRUNC(close_date, MONTH) as month,
      SUM(amount) as projected_revenue,
      SUM(amount * probability / 100) as weighted_revenue,
      COUNT(*) as opportunity_count
    FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.salesExecExtract}\`
    WHERE stage NOT IN ('Closed Won', 'Closed Lost')
      AND close_date >= CURRENT_DATE()
      AND close_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 6 MONTH)
    GROUP BY month
    ORDER BY month
  `,
}

// =============================================================================
// TRACEABILITY QUERIES
// =============================================================================

export const TRACEABILITY_QUERIES = {
  /**
   * Join leads across systems to calculate traceability
   */
  getLeadTraceability: (params: QueryParams = {}) => `
    WITH lead_exec AS (
      SELECT
        lead_id,
        'LEAD_EXEC' as system,
        received_date as event_time,
        lead_stage as stage,
        assigned_to,
        lead_source,
        market,
        region,
        branch
      FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.leadsExecExtract}\`
      ${buildWhereClause(params, 'received_date')}
    ),
    sales_exec AS (
      SELECT
        lead_id,
        'SALES_EXEC' as system,
        created_date as event_time,
        stage,
        owner_id as assigned_to,
        source as lead_source,
        market,
        region,
        NULL as branch
      FROM \`${params.project || '{project}'}.${params.dataset || '{dataset}'}.${KNOWN_BIGQUERY_TABLES.salesExecExtract}\`
      ${buildWhereClause(params, 'created_date')}
    ),
    combined AS (
      SELECT * FROM lead_exec
      UNION ALL
      SELECT * FROM sales_exec
    )
    SELECT
      lead_id,
      ARRAY_AGG(STRUCT(system, event_time, stage, assigned_to) ORDER BY event_time) as journey,
      COUNT(DISTINCT system) as systems_touched,
      MIN(event_time) as first_seen,
      MAX(event_time) as last_seen,
      ANY_VALUE(lead_source) as source,
      ANY_VALUE(market) as market,
      ANY_VALUE(region) as region
    FROM combined
    GROUP BY lead_id
    ORDER BY first_seen DESC
    ${buildLimitClause(params)}
  `,

  /**
   * Calculate match rates by flow
   */
  getMatchRatesByFlow: (params: QueryParams = {}) => `
    WITH lead_journey AS (
      SELECT
        lead_id,
        systems_touched,
        first_seen,
        last_seen,
        source,
        CASE
          WHEN source LIKE '%outbound%' AND systems_touched = 1 THEN 4
          WHEN source LIKE '%outbound%' AND systems_touched > 1 THEN 5
          WHEN source LIKE '%field%' THEN 6
          WHEN source LIKE '%web%' AND systems_touched = 2 THEN 7
          WHEN source LIKE '%web%' AND systems_touched = 1 THEN 8
          WHEN source LIKE '%tech%' OR source LIKE '%tap%' THEN 10
          ELSE 0
        END as flow_id
      FROM lead_traceability_view
      ${buildWhereClause(params, 'first_seen')}
    )
    SELECT
      flow_id,
      COUNT(*) as total_leads,
      SUM(CASE WHEN systems_touched > 0 THEN 1 ELSE 0 END) as traceable_leads,
      SAFE_DIVIDE(
        SUM(CASE WHEN systems_touched > 0 THEN 1 ELSE 0 END),
        COUNT(*)
      ) as match_rate
    FROM lead_journey
    WHERE flow_id > 0
    GROUP BY flow_id
    ORDER BY flow_id
  `,
}

// =============================================================================
// EXPORT ALL QUERIES
// =============================================================================

export const QUERIES = {
  leads: LEAD_QUERIES,
  sales: SALES_QUERIES,
  finance: FINANCE_QUERIES,
  traceability: TRACEABILITY_QUERIES,
}
