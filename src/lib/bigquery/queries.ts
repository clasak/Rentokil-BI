/**
 * BigQuery SQL Queries
 *
 * Common SQL queries for each data type, templated with projectId and dataset.
 * Table and column names are best guesses based on Power BI report structure.
 * May need updates after running discovery against actual BigQuery schema.
 */

// =============================================================================
// Query Configuration
// =============================================================================

export interface BigQueryConfig {
  projectId: string
  dataset: string
}

export const ENVIRONMENTS = {
  production: {
    projectId: 'bidata-sharedus-production',
    dataset: 'analytics', // Actual dataset name TBD after discovery
  },
  staging: {
    projectId: 'bidata-sharedus-staging',
    dataset: 'analytics',
  },
  dev: {
    projectId: 'bidata-sharedus-dev',
    dataset: 'analytics',
  },
} as const

// =============================================================================
// Lead Queries
// =============================================================================

export const LEAD_QUERIES = {
  /**
   * Lead counts by type and pest category (last 30 days)
   */
  byTypePest: (projectId: string, dataset: string) => `
    SELECT
      lead_type,
      pest_solution,
      COUNT(*) as count,
      SUM(CASE WHEN lead_stage = 'Sold' THEN 1 ELSE 0 END) as sold_count
    FROM \`${projectId}.${dataset}.fact_leads\`
    WHERE received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY lead_type, pest_solution
    ORDER BY lead_type, count DESC
  `,

  /**
   * Lead funnel - counts by stage (last 30 days)
   */
  funnel: (projectId: string, dataset: string) => `
    SELECT
      lead_stage,
      COUNT(*) as count
    FROM \`${projectId}.${dataset}.fact_leads\`
    WHERE received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY lead_stage
    ORDER BY
      CASE lead_stage
        WHEN 'Contacts' THEN 1
        WHEN 'MQL' THEN 2
        WHEN 'SQL' THEN 3
        WHEN 'Scheduled' THEN 4
        WHEN 'Inspected' THEN 5
        WHEN 'Proposed' THEN 6
        WHEN 'Sold' THEN 7
        WHEN 'Lost' THEN 8
        WHEN 'Cancelled' THEN 9
        ELSE 10
      END
  `,

  /**
   * Cancelled lead reasons (last 30 days)
   */
  cancels: (projectId: string, dataset: string) => `
    SELECT
      cancel_reason,
      COUNT(*) as count
    FROM \`${projectId}.${dataset}.fact_leads\`
    WHERE lead_stage = 'Cancelled'
      AND received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY cancel_reason
    ORDER BY count DESC
  `,

  /**
   * Lead vintage analysis - cohort by received week
   */
  vintage: (projectId: string, dataset: string) => `
    SELECT
      DATE_TRUNC(received_date, WEEK) as received_week,
      lead_stage,
      COUNT(*) as count
    FROM \`${projectId}.${dataset}.fact_leads\`
    WHERE received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
    GROUP BY received_week, lead_stage
    ORDER BY received_week, lead_stage
  `,

  /**
   * Leads by brand and market
   */
  byBrandMarket: (projectId: string, dataset: string) => `
    SELECT
      brand,
      market,
      COUNT(*) as total_leads,
      SUM(CASE WHEN lead_stage = 'Sold' THEN 1 ELSE 0 END) as sold,
      SAFE_DIVIDE(
        SUM(CASE WHEN lead_stage = 'Sold' THEN 1 ELSE 0 END),
        COUNT(*)
      ) * 100 as conversion_rate
    FROM \`${projectId}.${dataset}.fact_leads\`
    WHERE received_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY brand, market
    ORDER BY brand, total_leads DESC
  `,
}

// =============================================================================
// SALTI Queries (Sales Activity Leading to Income)
// =============================================================================

export const SALTI_QUERIES = {
  /**
   * 5-10-2 metrics by sales employee
   */
  fiveTenTwo: (projectId: string, dataset: string) => `
    SELECT
      sales_employee,
      AVG(inspections_per_day) as avg_inspections,
      AVG(services_proposed_per_day) as avg_proposed,
      AVG(sales_per_day) as avg_sales
    FROM \`${projectId}.${dataset}.fact_salti_daily\`
    WHERE activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY sales_employee
    ORDER BY avg_sales DESC
  `,

  /**
   * Productivity funnel rates
   */
  productivityRates: (projectId: string, dataset: string) => `
    SELECT
      sales_org,
      AVG(schedule_rate) as avg_schedule_rate,
      AVG(fulfillment_rate) as avg_fulfillment_rate,
      AVG(offer_rate) as avg_offer_rate,
      AVG(win_rate) as avg_win_rate
    FROM \`${projectId}.${dataset}.fact_salti_daily\`
    WHERE activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY sales_org
    ORDER BY sales_org
  `,

  /**
   * Speed to lead analysis
   */
  speedToLead: (projectId: string, dataset: string) => `
    SELECT
      brand,
      market,
      AVG(speed_to_lead) as avg_speed_to_lead,
      PERCENTILE_CONT(speed_to_lead, 0.5) OVER() as median_speed_to_lead
    FROM \`${projectId}.${dataset}.fact_salti_daily\`
    WHERE activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      AND speed_to_lead IS NOT NULL
    GROUP BY brand, market
    ORDER BY avg_speed_to_lead
  `,

  /**
   * Bundle rate by sales org
   */
  bundleRate: (projectId: string, dataset: string) => `
    SELECT
      sales_org,
      sales_employee,
      AVG(bundle_rate) as avg_bundle_rate,
      SUM(net_sales) as total_net_sales
    FROM \`${projectId}.${dataset}.fact_salti_daily\`
    WHERE activity_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY sales_org, sales_employee
    HAVING total_net_sales > 0
    ORDER BY avg_bundle_rate DESC
  `,
}

// =============================================================================
// Sales Queries
// =============================================================================

export const SALES_QUERIES = {
  /**
   * Current backlog with age
   */
  backlog: (projectId: string, dataset: string) => `
    SELECT
      *,
      DATE_DIFF(CURRENT_DATE(), sell_date, DAY) as days_in_backlog
    FROM \`${projectId}.${dataset}.fact_backlog\`
    WHERE start_date IS NULL
    ORDER BY sell_date ASC
  `,

  /**
   * Backlog summary by branch
   */
  backlogSummary: (projectId: string, dataset: string) => `
    SELECT
      branch,
      COUNT(*) as backlog_count,
      SUM(sale_value) as backlog_value,
      AVG(DATE_DIFF(CURRENT_DATE(), sell_date, DAY)) as avg_age_days
    FROM \`${projectId}.${dataset}.fact_backlog\`
    WHERE start_date IS NULL
    GROUP BY branch
    ORDER BY backlog_value DESC
  `,

  /**
   * Speed to install metrics
   */
  speedToInstall: (projectId: string, dataset: string) => `
    SELECT
      COUNTIF(install_hours <= 48) / COUNT(*) * 100 as pct_48hr,
      COUNTIF(install_hours <= 72) / COUNT(*) * 100 as pct_72hr,
      COUNTIF(install_hours > 96) / COUNT(*) * 100 as pct_96plus,
      AVG(install_hours) as avg_install_hours
    FROM \`${projectId}.${dataset}.fact_installations\`
    WHERE install_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  `,

  /**
   * Speed to install by branch
   */
  speedToInstallByBranch: (projectId: string, dataset: string) => `
    SELECT
      branch,
      COUNTIF(install_hours <= 48) / COUNT(*) * 100 as pct_48hr,
      COUNTIF(install_hours <= 72) / COUNT(*) * 100 as pct_72hr,
      COUNTIF(install_hours > 96) / COUNT(*) * 100 as pct_96plus,
      AVG(install_hours) as avg_install_hours,
      COUNT(*) as total_installs
    FROM \`${projectId}.${dataset}.fact_installations\`
    WHERE install_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY branch
    ORDER BY pct_48hr DESC
  `,

  /**
   * Canceled agreements by reason
   */
  canceledAgreements: (projectId: string, dataset: string) => `
    SELECT
      cancel_reason,
      COUNT(*) as count,
      SUM(agreement_value) as total_value
    FROM \`${projectId}.${dataset}.fact_canceled_sales\`
    WHERE cancel_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY cancel_reason
    ORDER BY count DESC
  `,

  /**
   * Start rate metrics
   */
  startRate: (projectId: string, dataset: string) => `
    SELECT
      DATE_TRUNC(sell_date, WEEK) as sell_week,
      COUNT(*) as total_sold,
      COUNTIF(DATE_DIFF(start_date, sell_date, HOUR) <= 48) as started_48hr,
      COUNTIF(start_date IS NOT NULL AND
              DATE_TRUNC(start_date, MONTH) = DATE_TRUNC(sell_date, MONTH)) as started_in_month
    FROM \`${projectId}.${dataset}.fact_sales\`
    WHERE sell_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
    GROUP BY sell_week
    ORDER BY sell_week
  `,
}

// =============================================================================
// Finance Queries
// =============================================================================

export const FINANCE_QUERIES = {
  /**
   * Daily revenue trend
   */
  dailyRevenue: (projectId: string, dataset: string) => `
    SELECT
      revenue_date,
      SUM(daily_revenue) as daily_revenue,
      SUM(SUM(daily_revenue)) OVER (
        PARTITION BY DATE_TRUNC(revenue_date, MONTH)
        ORDER BY revenue_date
      ) as mtd_revenue
    FROM \`${projectId}.${dataset}.fact_revenue\`
    WHERE revenue_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY revenue_date
    ORDER BY revenue_date
  `,

  /**
   * AR aging buckets
   */
  arAging: (projectId: string, dataset: string) => `
    SELECT
      branch,
      SUM(ar_current) as ar_current,
      SUM(ar_30_day) as ar_30_day,
      SUM(ar_60_day) as ar_60_day,
      SUM(ar_90_day) as ar_90_day,
      SUM(ar_120_plus) as ar_120_plus,
      SUM(ar_current + ar_30_day + ar_60_day + ar_90_day + ar_120_plus) as ar_total
    FROM \`${projectId}.${dataset}.fact_ar\`
    WHERE snapshot_date = CURRENT_DATE()
    GROUP BY branch
    ORDER BY ar_total DESC
  `,

  /**
   * Revenue projection vs actual
   */
  revenueProjection: (projectId: string, dataset: string) => `
    SELECT
      DATE_TRUNC(revenue_date, MONTH) as month,
      SUM(daily_revenue) as actual_revenue,
      MAX(revenue_projection) as projected_revenue,
      SAFE_DIVIDE(SUM(daily_revenue), MAX(revenue_projection)) * 100 as attainment_pct
    FROM \`${projectId}.${dataset}.fact_revenue\`
    WHERE revenue_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
    GROUP BY month
    ORDER BY month
  `,
}

// =============================================================================
// HR Queries
// =============================================================================

export const HR_QUERIES = {
  /**
   * Headcount by function
   */
  headcount: (projectId: string, dataset: string) => `
    SELECT
      function_code,
      SUM(headcount) as headcount,
      SUM(voluntary_terms) as voluntary_terms,
      SUM(involuntary_terms) as involuntary_terms,
      AVG(retention_pct) as avg_retention_pct
    FROM \`${projectId}.${dataset}.fact_hr\`
    WHERE snapshot_date = (
      SELECT MAX(snapshot_date) FROM \`${projectId}.${dataset}.fact_hr\`
    )
    GROUP BY function_code
    ORDER BY headcount DESC
  `,

  /**
   * Retention trend
   */
  retentionTrend: (projectId: string, dataset: string) => `
    SELECT
      DATE_TRUNC(snapshot_date, MONTH) as month,
      AVG(retention_pct) as avg_retention_pct,
      SUM(voluntary_terms) as voluntary_terms,
      SUM(involuntary_terms) as involuntary_terms
    FROM \`${projectId}.${dataset}.fact_hr\`
    WHERE snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
    GROUP BY month
    ORDER BY month
  `,
}

// =============================================================================
// Termite Queries
// =============================================================================

export const TERMITE_QUERIES = {
  /**
   * PNI (Properties Not Inspected) summary
   */
  pniSummary: (projectId: string, dataset: string) => `
    SELECT
      branch,
      SUM(pni_total) as pni_total,
      SUM(pni_missed_schedule) as pni_missed_schedule,
      SUM(pni_not_scheduled) as pni_not_scheduled,
      SUM(pni_scheduled_future) as pni_scheduled_future,
      SUM(pni_scheduled_in_month) as pni_scheduled_in_month
    FROM \`${projectId}.${dataset}.fact_pni\`
    WHERE snapshot_date = CURRENT_DATE()
    GROUP BY branch
    ORDER BY pni_total DESC
  `,

  /**
   * Renewal rate by branch
   */
  renewalRate: (projectId: string, dataset: string) => `
    SELECT
      branch,
      SUM(renewals_due) as renewals_due,
      SUM(renewals_completed) as renewals_completed,
      SAFE_DIVIDE(SUM(renewals_completed), SUM(renewals_due)) * 100 as renewal_rate
    FROM \`${projectId}.${dataset}.fact_renewals\`
    WHERE renewal_month = DATE_TRUNC(CURRENT_DATE(), MONTH)
    GROUP BY branch
    ORDER BY renewal_rate DESC
  `,
}

// =============================================================================
// Workforce Queries
// =============================================================================

export const WORKFORCE_QUERIES = {
  /**
   * Overtime summary
   */
  overtime: (projectId: string, dataset: string) => `
    SELECT
      branch,
      SUM(overtime_hours) as overtime_hours,
      AVG(overtime_pct) as avg_overtime_pct,
      AVG(service_rev_per_hour) as avg_service_rev_per_hour
    FROM \`${projectId}.${dataset}.fact_tech_productivity\`
    WHERE work_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY branch
    ORDER BY overtime_hours DESC
  `,

  /**
   * Tech productivity metrics
   */
  techProductivity: (projectId: string, dataset: string) => `
    SELECT
      branch,
      AVG(hours_on_site_pct) as avg_hours_on_site_pct,
      AVG(service_rev_per_hour) as avg_service_rev_per_hour,
      SUM(total_hours) as total_hours,
      SUM(billable_hours) as billable_hours
    FROM \`${projectId}.${dataset}.fact_tech_productivity\`
    WHERE work_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY branch
    ORDER BY avg_service_rev_per_hour DESC
  `,
}

// =============================================================================
// Combined Query Object
// =============================================================================

export const QUERIES = {
  leads: LEAD_QUERIES,
  salti: SALTI_QUERIES,
  sales: SALES_QUERIES,
  finance: FINANCE_QUERIES,
  hr: HR_QUERIES,
  termite: TERMITE_QUERIES,
  workforce: WORKFORCE_QUERIES,
}

// =============================================================================
// Query Builder Utilities
// =============================================================================

/**
 * Creates a date filter clause for a given field and number of days back
 */
export function dateFilterClause(
  field: string,
  daysBack: number
): string {
  return `${field} >= DATE_SUB(CURRENT_DATE(), INTERVAL ${daysBack} DAY)`
}

/**
 * Creates a branch filter clause
 */
export function branchFilterClause(
  branches: string[]
): string {
  if (branches.length === 0) return '1=1'
  const escaped = branches.map((b) => `'${b.replace(/'/g, "''")}'`).join(', ')
  return `branch IN (${escaped})`
}

/**
 * Creates a market filter clause
 */
export function marketFilterClause(
  markets: string[]
): string {
  if (markets.length === 0) return '1=1'
  const escaped = markets.map((m) => `'${m.replace(/'/g, "''")}'`).join(', ')
  return `market IN (${escaped})`
}

/**
 * Combines multiple WHERE clauses with AND
 */
export function combineWhereClauses(
  ...clauses: string[]
): string {
  const nonEmpty = clauses.filter((c) => c && c !== '1=1')
  return nonEmpty.length > 0 ? nonEmpty.join(' AND ') : '1=1'
}

/**
 * Builds a fully qualified table name
 */
export function qualifiedTableName(
  projectId: string,
  dataset: string,
  table: string
): string {
  return `\`${projectId}.${dataset}.${table}\``
}
