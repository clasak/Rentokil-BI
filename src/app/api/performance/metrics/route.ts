import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface PerformanceMetric {
  endpoint: string
  method: string
  response_time_ms: number
  status_code: number
  is_error: boolean
  captured_at: string
}

interface EndpointStats {
  endpoint: string
  sample_count: number
  p50_ms: number
  p95_ms: number
  p99_ms: number
  avg_ms: number
  error_rate: number
  min_ms: number
  max_ms: number
}

interface PerformanceResponse {
  status: 'ok' | 'sla_breach'
  timestamp: string
  endpoints: EndpointStats[]
  overall: {
    total_requests: number
    avg_response_ms: number
    error_rate: number
    sla_breaches: string[]
  }
  sla_thresholds: {
    p50_target_ms: number
    p95_target_ms: number
    p99_target_ms: number
    error_rate_target: number
  }
}

// SLA thresholds
const SLA_THRESHOLDS = {
  p50_target_ms: 500,
  p95_target_ms: 2000,
  p99_target_ms: 5000,
  error_rate_target: 1 // 1%
}

// In-memory store for demo
const metricsStore: PerformanceMetric[] = []

// Calculate percentile from sorted array
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

/**
 * GET /api/performance/metrics
 * Get performance statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse<PerformanceResponse>> {
  const now = new Date().toISOString()
  const searchParams = request.nextUrl.searchParams
  const hours = parseInt(searchParams.get('hours') || '24')

  try {
    let metrics: PerformanceMetric[] = []

    // Try Supabase first
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('captured_at', cutoffTime)
        .order('captured_at', { ascending: false })

      if (!error && data) {
        metrics = data
      }
    } else {
      // Use in-memory store
      const cutoffTime = Date.now() - hours * 60 * 60 * 1000
      metrics = metricsStore.filter(m =>
        new Date(m.captured_at).getTime() >= cutoffTime
      )
    }

    // Group by endpoint
    const byEndpoint = metrics.reduce((acc, m) => {
      if (!acc[m.endpoint]) acc[m.endpoint] = []
      acc[m.endpoint].push(m)
      return acc
    }, {} as Record<string, PerformanceMetric[]>)

    // Calculate stats per endpoint
    const endpoints: EndpointStats[] = []
    const slaBreaches: string[] = []

    for (const [endpoint, endpointMetrics] of Object.entries(byEndpoint)) {
      const responseTimes = endpointMetrics.map(m => m.response_time_ms)
      const errors = endpointMetrics.filter(m => m.is_error).length

      const p50 = percentile(responseTimes, 50)
      const p95 = percentile(responseTimes, 95)
      const p99 = percentile(responseTimes, 99)
      const errorRate = (errors / endpointMetrics.length) * 100

      const stats: EndpointStats = {
        endpoint,
        sample_count: endpointMetrics.length,
        p50_ms: Math.round(p50),
        p95_ms: Math.round(p95),
        p99_ms: Math.round(p99),
        avg_ms: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
        error_rate: Math.round(errorRate * 100) / 100,
        min_ms: Math.min(...responseTimes),
        max_ms: Math.max(...responseTimes)
      }

      endpoints.push(stats)

      // Check SLA breaches
      if (p50 > SLA_THRESHOLDS.p50_target_ms) {
        slaBreaches.push(`${endpoint}: p50 ${p50}ms > ${SLA_THRESHOLDS.p50_target_ms}ms target`)
      }
      if (p95 > SLA_THRESHOLDS.p95_target_ms) {
        slaBreaches.push(`${endpoint}: p95 ${p95}ms > ${SLA_THRESHOLDS.p95_target_ms}ms target`)
      }
      if (p99 > SLA_THRESHOLDS.p99_target_ms) {
        slaBreaches.push(`${endpoint}: p99 ${p99}ms > ${SLA_THRESHOLDS.p99_target_ms}ms target`)
      }
      if (errorRate > SLA_THRESHOLDS.error_rate_target) {
        slaBreaches.push(`${endpoint}: error rate ${errorRate.toFixed(1)}% > ${SLA_THRESHOLDS.error_rate_target}% target`)
      }
    }

    // Sort by sample count (most traffic first)
    endpoints.sort((a, b) => b.sample_count - a.sample_count)

    // Calculate overall stats
    const allResponseTimes = metrics.map(m => m.response_time_ms)
    const allErrors = metrics.filter(m => m.is_error).length

    return NextResponse.json({
      status: slaBreaches.length > 0 ? 'sla_breach' : 'ok',
      timestamp: now,
      endpoints,
      overall: {
        total_requests: metrics.length,
        avg_response_ms: allResponseTimes.length > 0
          ? Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length)
          : 0,
        error_rate: metrics.length > 0
          ? Math.round((allErrors / metrics.length) * 10000) / 100
          : 0,
        sla_breaches: slaBreaches
      },
      sla_thresholds: SLA_THRESHOLDS
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('[Performance Metrics] Error:', error)
    return NextResponse.json({
      status: 'ok',
      timestamp: now,
      endpoints: [],
      overall: { total_requests: 0, avg_response_ms: 0, error_rate: 0, sla_breaches: [] },
      sla_thresholds: SLA_THRESHOLDS
    }, { status: 500 })
  }
}

/**
 * POST /api/performance/metrics
 * Log a performance measurement
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const now = new Date().toISOString()

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.endpoint || body.response_time_ms === undefined) {
      return NextResponse.json({
        status: 'error',
        message: 'endpoint and response_time_ms are required'
      }, { status: 400 })
    }

    // Validate response_time_ms is a positive number
    if (typeof body.response_time_ms !== 'number' || body.response_time_ms < 0) {
      return NextResponse.json({
        status: 'error',
        message: 'response_time_ms must be a non-negative number'
      }, { status: 400 })
    }

    const metric: PerformanceMetric = {
      endpoint: body.endpoint,
      method: body.method || 'GET',
      response_time_ms: Math.round(body.response_time_ms),
      status_code: body.status_code || 200,
      is_error: body.is_error || (body.status_code && body.status_code >= 400),
      captured_at: now
    }

    // Try Supabase first
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const { error } = await supabase
        .from('performance_metrics')
        .insert(metric)

      if (error) {
        console.error('[Performance Metrics] Supabase insert error:', error)
      } else {
        return NextResponse.json({ status: 'ok', message: 'Metric logged' })
      }
    }

    // Use in-memory store
    metricsStore.unshift(metric)

    // Keep only last 10000 metrics
    if (metricsStore.length > 10000) {
      metricsStore.pop()
    }

    return NextResponse.json({ status: 'ok', message: 'Metric logged (in-memory)' })
  } catch (error) {
    console.error('[Performance Metrics] Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to log metric'
    }, { status: 500 })
  }
}
