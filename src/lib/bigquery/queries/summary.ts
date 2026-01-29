/**
 * BigQuery Queries for Data Summary
 *
 * Provides live counts from BigQuery for the admin dashboard Data Summary section.
 *
 * Tables Used:
 * - S2.VwUnf_Branch - Markets, Regions, Branches
 * - S0_TMX.Employees_Main - Active employees (users)
 * - W3_Contract_Checker.T0_unf_Contract_All - Contracts (accounts/opportunities)
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { validateOrgCode, validateNumeric, validateString } from '../validation'

// =============================================================================
// Types
// =============================================================================

export interface DataSummaryMetric {
  metric: string
  count: number
  label: string
}

export interface DataSummary {
  markets: number
  regions: number
  branches: number
  users: number
  accounts: number
  opportunities: number
  lastUpdated: string
}

export interface DataSummaryQueryOptions {
  includeOpportunities?: boolean
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Get data summary counts from BigQuery
 * Returns live counts of markets, regions, branches, users, accounts, and opportunities
 */
export async function getDataSummary(
  options: DataSummaryQueryOptions = {}
): Promise<DataSummary> {
  const { includeOpportunities = true } = options

  // Query organization hierarchy counts
  const orgSql = `
    SELECT
      COUNT(DISTINCT RTX_Market_Code) as market_count,
      COUNT(DISTINCT RTX_Region_Code) as region_count,
      COUNT(DISTINCT RTX_Branch_Codes) as branch_count
    FROM \`${PROJECT}.S2.VwUnf_Branch\`
    WHERE RTX_Market_Code IS NOT NULL
  `

  // Query active employees count
  const usersSql = `
    SELECT COUNT(*) as user_count
    FROM \`${PROJECT}.S0_TMX.Employees_Main\`
  `

  // Query accounts (distinct customers) and opportunities (recent contracts)
  const contractsSql = `
    SELECT
      COUNT(DISTINCT customer_name) as account_count,
      COUNT(*) as opportunity_count
    FROM \`${PROJECT}.W3_Contract_Checker.T0_unf_Contract_All\`
    WHERE SellDateYearMonth >= FORMAT_DATE('%Y%m', DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH))
  `

  try {
    // Run queries in parallel
    const [orgResult, usersResult, contractsResult] = await Promise.all([
      bigQueryClient.query<{
        market_count: number
        region_count: number
        branch_count: number
      }>(orgSql),
      bigQueryClient.query<{ user_count: number }>(usersSql),
      includeOpportunities
        ? bigQueryClient.query<{
            account_count: number
            opportunity_count: number
          }>(contractsSql)
        : Promise.resolve({ rows: [{ account_count: 0, opportunity_count: 0 }] }),
    ])

    const org = orgResult.rows[0] || { market_count: 0, region_count: 0, branch_count: 0 }
    const users = usersResult.rows[0] || { user_count: 0 }
    const contracts = contractsResult.rows[0] || { account_count: 0, opportunity_count: 0 }

    return {
      markets: org.market_count,
      regions: org.region_count,
      branches: org.branch_count,
      users: users.user_count,
      accounts: contracts.account_count,
      opportunities: contracts.opportunity_count,
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[BigQuery Summary] Error fetching data summary:', error)
    // Return zeros on error - the UI will show fallback
    return {
      markets: 0,
      regions: 0,
      branches: 0,
      users: 0,
      accounts: 0,
      opportunities: 0,
      lastUpdated: new Date().toISOString(),
    }
  }
}

/**
 * Get individual metric counts for more granular display
 */
export async function getDataSummaryMetrics(): Promise<DataSummaryMetric[]> {
  const summary = await getDataSummary()

  return [
    { metric: 'markets', count: summary.markets, label: 'Markets' },
    { metric: 'regions', count: summary.regions, label: 'Regions' },
    { metric: 'branches', count: summary.branches, label: 'Branches' },
    { metric: 'users', count: summary.users, label: 'Users' },
    { metric: 'accounts', count: summary.accounts, label: 'Accounts' },
    { metric: 'opportunities', count: summary.opportunities, label: 'Opportunities' },
  ]
}
