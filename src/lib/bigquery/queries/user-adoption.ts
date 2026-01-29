/**
 * BigQuery Queries for User Adoption Metrics
 *
 * Tracks dashboard adoption and engagement metrics:
 * - Active user counts from tmx_employee
 * - Dashboard view analytics (if ops_events tracking available)
 * - Feature usage statistics
 *
 * Note: Dashboard tracking depends on ops_events instrumentation.
 * Shows disclaimer if tracking data is unavailable.
 */

import { bigQueryClient, BIGQUERY_CONFIG } from '../client'
import { handleBigQueryError } from '../error-handler'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export interface UserAdoptionMetrics {
  activeUsers: number // Users active in last 30 days
  totalUsers: number // Total users in tmx_employee
  newUsersThisWeek: number // New users added this week
  mostViewedDashboards: Array<{ name: string; views: number }>
  featureUsage: Array<{ feature: string; usageCount: number }>
  trackingAvailable: boolean // Whether dashboard tracking is instrumented
  lastUpdated: Date
}

// =============================================================================
// Queries
// =============================================================================

const PROJECT = BIGQUERY_CONFIG.projectId

/**
 * Get user adoption metrics from tmx_employee and ops_events
 *
 * Primary data source: S0_TMX.tmx_employee (1.2M rows)
 * Secondary data source: Supabase ops_events (for dashboard tracking)
 *
 * Returns user counts and engagement metrics with tracking availability flag.
 */
export async function getUserAdoptionMetrics(): Promise<UserAdoptionMetrics> {
  try {
    // Get user counts from BigQuery tmx_employee
    // Note: tmx_employee doesn't track login activity, so we use employee_status and hire_date
    const userCountSql = `
      SELECT
        -- Active = currently employed (status = ACT)
        COUNT(DISTINCT CASE
          WHEN employee_status = 'ACT' AND (termination_date IS NULL OR DATE(termination_date) > CURRENT_DATE())
          THEN employee_jde_number
        END) as active_users,
        -- Total = all current records (curr_ind = Y)
        COUNT(DISTINCT employee_jde_number) as total_users,
        -- New users = hired in last 7 days
        COUNT(DISTINCT CASE
          WHEN hire_date IS NOT NULL AND DATE(hire_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
          THEN employee_jde_number
        END) as new_users_this_week
      FROM
        \`${PROJECT}.S0_TMX.tmx_employee\`
      WHERE
        curr_ind = 'Y'
        AND employee_jde_number IS NOT NULL
    `

    const userCountResult = await bigQueryClient.query<{
      active_users: number
      total_users: number
      new_users_this_week: number
    }>(userCountSql)

    const userCounts = userCountResult.rows[0] || {
      active_users: 0,
      total_users: 0,
      new_users_this_week: 0,
    }

    // Check if ops_events tracking is available
    let trackingAvailable = false
    let mostViewedDashboards: Array<{ name: string; views: number }> = []
    let featureUsage: Array<{ feature: string; usageCount: number }> = []

    try {
      const supabase = await createClient()

      // Check if ops_events table has page_view events
      const { data: viewData, error: viewError } = await supabase
        .from('ops_events')
        .select('metadata')
        .eq('event_type', 'page_view')
        .limit(1)

      if (!viewError && viewData && viewData.length > 0) {
        trackingAvailable = true

        // Get most viewed dashboards (last 30 days)
        const { data: dashboardData } = await supabase
          .from('ops_events')
          .select('metadata')
          .eq('event_type', 'page_view')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1000)

        if (dashboardData) {
          // Aggregate by page
          const viewCounts = new Map<string, number>()
          dashboardData.forEach((event) => {
            const page = event.metadata?.page || 'Unknown'
            viewCounts.set(page, (viewCounts.get(page) || 0) + 1)
          })

          mostViewedDashboards = Array.from(viewCounts.entries())
            .map(([name, views]) => ({ name, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10)
        }

        // Get feature usage (last 30 days)
        const { data: featureData } = await supabase
          .from('ops_events')
          .select('event_type, metadata')
          .in('event_type', ['export_csv', 'lineage_view', 'search', 'theme_toggle', 'presenter_mode'])
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1000)

        if (featureData) {
          const featureCounts = new Map<string, number>()
          featureData.forEach((event) => {
            const feature = formatFeatureName(event.event_type)
            featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1)
          })

          featureUsage = Array.from(featureCounts.entries())
            .map(([feature, usageCount]) => ({ feature, usageCount }))
            .sort((a, b) => b.usageCount - a.usageCount)
        }
      }
    } catch (opsError) {
      console.log('[getUserAdoptionMetrics] ops_events tracking not available:', opsError)
      trackingAvailable = false
    }

    // If tracking not available, provide sample feature usage based on common patterns
    if (!trackingAvailable) {
      featureUsage = [
        { feature: 'Export CSV', usageCount: 0 },
        { feature: 'Lineage View', usageCount: 0 },
        { feature: 'Search', usageCount: 0 },
        { feature: 'Dark Mode', usageCount: 0 },
        { feature: 'Presenter Mode', usageCount: 0 },
      ]
    }

    return {
      activeUsers: userCounts.active_users,
      totalUsers: userCounts.total_users,
      newUsersThisWeek: userCounts.new_users_this_week,
      mostViewedDashboards,
      featureUsage,
      trackingAvailable,
      lastUpdated: new Date(),
    }
  } catch (error) {
    handleBigQueryError(error, 'getUserAdoptionMetrics')
    throw error
  }
}

/**
 * Format event_type to human-readable feature name
 */
function formatFeatureName(eventType: string): string {
  const nameMap: Record<string, string> = {
    export_csv: 'Export CSV',
    lineage_view: 'Lineage View',
    search: 'Search',
    theme_toggle: 'Dark Mode',
    presenter_mode: 'Presenter Mode',
  }
  return nameMap[eventType] || eventType
}
