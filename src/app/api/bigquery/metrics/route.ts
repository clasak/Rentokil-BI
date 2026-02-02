/**
 * BigQuery Performance Metrics API
 *
 * Exposes monitoring metrics for BigQuery query performance, costs, and errors.
 * Used by Admin Dashboard and Platform Health monitoring.
 *
 * GET /api/bigquery/metrics - Get performance summary
 * GET /api/bigquery/metrics?query=sales-today - Get metrics for specific query
 * GET /api/bigquery/metrics?errors=true - Get error metrics only
 * POST /api/bigquery/metrics/clear - Clear all metrics (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPerformanceSummary, getQueryMetrics, getErrorMetrics, getRealtimeStats, clearMetrics } from '@/lib/bigquery/monitoring'

export const runtime = 'nodejs'

// GET - Retrieve metrics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryName = searchParams.get('query')
    const errorsOnly = searchParams.get('errors') === 'true'
    const realtime = searchParams.get('realtime') === 'true'
    const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000', 10) // Default 1 hour

    // Return error metrics only
    if (errorsOnly) {
      const errors = getErrorMetrics()
      return NextResponse.json({
        success: true,
        errors,
        count: errors.length,
      })
    }

    // Return real-time stats (last 5 min + last 1 hour)
    if (realtime) {
      const stats = getRealtimeStats()
      return NextResponse.json({
        success: true,
        stats,
      })
    }

    // Return metrics for specific query
    if (queryName) {
      const limit = parseInt(searchParams.get('limit') || '50', 10)
      const metrics = getQueryMetrics(queryName, limit)

      // Calculate summary stats for this query
      const avgTime = metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length
        : 0
      const maxTime = metrics.length > 0
        ? Math.max(...metrics.map(m => m.durationMs))
        : 0
      const errorCount = metrics.filter(m => m.error).length

      return NextResponse.json({
        success: true,
        queryName,
        metrics,
        summary: {
          totalCalls: metrics.length,
          avgResponseTime: Math.round(avgTime),
          maxResponseTime: Math.round(maxTime),
          errorCount,
          errorRate: metrics.length > 0 ? errorCount / metrics.length : 0,
        },
      })
    }

    // Return performance summary for time window
    const summary = getPerformanceSummary(timeWindow)
    return NextResponse.json({
      success: true,
      timeWindowMs: timeWindow,
      timeWindowLabel: timeWindow === 3600000 ? '1 hour' :
                      timeWindow === 300000 ? '5 minutes' :
                      `${Math.round(timeWindow / 60000)} minutes`,
      summary,
    })
  } catch (error) {
    console.error('[BigQuery Metrics API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get metrics',
      },
      { status: 500 }
    )
  }
}

// POST - Clear metrics (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.action === 'clear') {
      clearMetrics()
      return NextResponse.json({
        success: true,
        message: 'Metrics cleared successfully',
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Use {"action": "clear"} to clear metrics.',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('[BigQuery Metrics API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear metrics',
      },
      { status: 500 }
    )
  }
}
