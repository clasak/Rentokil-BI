import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface EngagementSummary {
  summary_date: string
  total_users: number
  active_users: number
  new_users: number
  returning_users: number
  total_sessions: number
  avg_session_duration_seconds: number
  top_pages: Array<{ route: string; views: number }>
  top_features: Array<{ feature: string; usage: number }>
  engagement_by_role: Record<string, number>
}

interface EngagementResponse {
  status: 'ok' | 'low_engagement'
  timestamp: string
  summary: EngagementSummary | null
  trends: {
    dau_change_pct: number
    sessions_change_pct: number
    trend_direction: 'up' | 'down' | 'stable'
  }
  alerts: string[]
}

// Engagement thresholds for alerts
const THRESHOLDS = {
  min_daily_active_users: 5,
  min_sessions: 10,
  min_avg_duration_seconds: 60
}

/**
 * GET /api/engagement/summary
 * Get engagement metrics summary
 */
export async function GET(request: NextRequest): Promise<NextResponse<EngagementResponse>> {
  const now = new Date().toISOString()
  const searchParams = request.nextUrl.searchParams
  const dateParam = searchParams.get('date')

  // Default to yesterday
  const targetDate = dateParam
    ? new Date(dateParam)
    : new Date(Date.now() - 24 * 60 * 60 * 1000)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  try {
    let summary: EngagementSummary | null = null
    let previousSummary: EngagementSummary | null = null
    const alerts: string[] = []

    // Try Supabase first
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Get summary for target date
      const { data: summaryData } = await supabase
        .from('engagement_summary')
        .select('*')
        .eq('summary_date', targetDateStr)
        .single()

      if (summaryData) {
        summary = summaryData
      }

      // Get previous day for trend calculation
      const previousDate = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000)
      const previousDateStr = previousDate.toISOString().split('T')[0]

      const { data: prevData } = await supabase
        .from('engagement_summary')
        .select('*')
        .eq('summary_date', previousDateStr)
        .single()

      if (prevData) {
        previousSummary = prevData
      }

      // If no summary exists, calculate from user_activity
      if (!summary) {
        const { data: activityData } = await supabase
          .from('user_activity')
          .select('user_id, user_email, user_role, route, action, session_id, duration_seconds, created_at')
          .gte('created_at', `${targetDateStr}T00:00:00`)
          .lt('created_at', `${targetDateStr}T23:59:59`)

        if (activityData && activityData.length > 0) {
          // Calculate metrics
          const uniqueUsers = new Set(activityData.map(a => a.user_id || a.user_email))
          const uniqueSessions = new Set(activityData.map(a => a.session_id).filter(Boolean))

          // Group by route for top pages
          const routeCounts = activityData
            .filter(a => a.action === 'view')
            .reduce((acc, a) => {
              const route = a.route || 'unknown'
              acc[route] = (acc[route] || 0) + 1
              return acc
            }, {} as Record<string, number>)

          const topPages = Object.entries(routeCounts)
            .map(([route, views]) => ({ route, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10)

          // Group by role
          const roleCounts = activityData.reduce((acc, a) => {
            const role = a.user_role || 'unknown'
            acc[role] = (acc[role] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          // Calculate average duration
          const durations = activityData
            .map(a => a.duration_seconds)
            .filter((d): d is number => d !== null && d !== undefined)
          const avgDuration = durations.length > 0
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : 0

          summary = {
            summary_date: targetDateStr,
            total_users: uniqueUsers.size,
            active_users: uniqueUsers.size,
            new_users: 0, // Would need historical data to calculate
            returning_users: 0,
            total_sessions: uniqueSessions.size,
            avg_session_duration_seconds: avgDuration,
            top_pages: topPages,
            top_features: [],
            engagement_by_role: roleCounts
          }
        }
      }
    }

    // Generate demo data if no real data
    if (!summary) {
      summary = {
        summary_date: targetDateStr,
        total_users: 0,
        active_users: 0,
        new_users: 0,
        returning_users: 0,
        total_sessions: 0,
        avg_session_duration_seconds: 0,
        top_pages: [],
        top_features: [],
        engagement_by_role: {}
      }
    }

    // Calculate trends
    let dauChangePct = 0
    let sessionsChangePct = 0
    let trendDirection: 'up' | 'down' | 'stable' = 'stable'

    if (previousSummary && previousSummary.active_users > 0) {
      dauChangePct = ((summary.active_users - previousSummary.active_users) / previousSummary.active_users) * 100
      sessionsChangePct = previousSummary.total_sessions > 0
        ? ((summary.total_sessions - previousSummary.total_sessions) / previousSummary.total_sessions) * 100
        : 0

      if (dauChangePct > 10) trendDirection = 'up'
      else if (dauChangePct < -10) trendDirection = 'down'
    }

    // Check for alerts
    if (summary.active_users < THRESHOLDS.min_daily_active_users) {
      alerts.push(`Daily active users (${summary.active_users}) below threshold (${THRESHOLDS.min_daily_active_users})`)
    }
    if (summary.total_sessions < THRESHOLDS.min_sessions) {
      alerts.push(`Total sessions (${summary.total_sessions}) below threshold (${THRESHOLDS.min_sessions})`)
    }
    if (summary.avg_session_duration_seconds < THRESHOLDS.min_avg_duration_seconds) {
      alerts.push(`Average session duration (${summary.avg_session_duration_seconds}s) below threshold (${THRESHOLDS.min_avg_duration_seconds}s)`)
    }
    if (dauChangePct < -20) {
      alerts.push(`DAU dropped ${Math.abs(dauChangePct).toFixed(1)}% from previous day`)
    }

    return NextResponse.json({
      status: alerts.length > 0 ? 'low_engagement' : 'ok',
      timestamp: now,
      summary,
      trends: {
        dau_change_pct: Math.round(dauChangePct * 10) / 10,
        sessions_change_pct: Math.round(sessionsChangePct * 10) / 10,
        trend_direction: trendDirection
      },
      alerts
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('[Engagement Summary] Error:', error)
    return NextResponse.json({
      status: 'ok',
      timestamp: now,
      summary: null,
      trends: { dau_change_pct: 0, sessions_change_pct: 0, trend_direction: 'stable' },
      alerts: []
    }, { status: 500 })
  }
}
