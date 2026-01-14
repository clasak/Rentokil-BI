import { NextRequest, NextResponse } from 'next/server'
import { rtxClient } from '@/services/rtx-hub'
import { createClient } from '@supabase/supabase-js'
import { validateRTXApiRequest } from '@/lib/auth/rtx-api-auth'

// Types
interface RTXHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unreachable'
  timestamp: string
  connection: {
    reachable: boolean
    latency_ms: number
    last_successful: string | null
    consecutive_failures: number
  }
  entities: Record<string, {
    available: boolean
    row_count: number | null
    last_sync: string | null
    freshness: 'fresh' | 'stale' | 'critical'
  }>
  last_sync: {
    at: string
    status: string
    records: number
  } | null
  thresholds: {
    latency_warning_ms: number
    latency_critical_ms: number
    stale_hours: number
    critical_hours: number
  }
}

// Thresholds
const THRESHOLDS = {
  latency_warning_ms: 1000,
  latency_critical_ms: 5000,
  stale_hours: 4,
  critical_hours: 24
}

/**
 * Get failover state from database (replaces module-level state)
 */
interface StatusRow { consecutive_failures: number }
interface HealthRow { captured_at: string }

async function getFailoverState(supabase: ReturnType<typeof createClient>): Promise<{
  consecutive_failures: number
  last_successful_at: string | null
}> {
  try {
    const { data } = await supabase
      .from('data_source_status')
      .select('consecutive_failures, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const statusRow = data as StatusRow | null

    // Get last successful from rtx_health_log
    const { data: healthData } = await supabase
      .from('rtx_health_log')
      .select('captured_at')
      .eq('is_reachable', true)
      .order('captured_at', { ascending: false })
      .limit(1)
      .single()

    const healthRow = healthData as HealthRow | null

    return {
      consecutive_failures: statusRow?.consecutive_failures || 0,
      last_successful_at: healthRow?.captured_at || null
    }
  } catch {
    return { consecutive_failures: 0, last_successful_at: null }
  }
}

/**
 * GET /api/rtx/health
 * Check RTX Data Hub connection health and entity availability
 *
 * Used by: OPS-UNIFIED-001 workflow (every 5 minutes)
 */
export async function GET(request: NextRequest): Promise<NextResponse<RTXHealthResponse>> {
  // Validate authentication (allow public read for dashboard)
  const auth = validateRTXApiRequest(request, { allowPublicRead: true })
  if (!auth.valid) return auth.error!

  const timestamp = new Date().toISOString()
  let status: RTXHealthResponse['status'] = 'healthy'
  let reachable = false
  let latency_ms = 0

  // Get Supabase client for state management
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  let supabase: ReturnType<typeof createClient> | null = null
  let failoverState = { consecutive_failures: 0, last_successful_at: null as string | null }

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
    failoverState = await getFailoverState(supabase)
  }

  let consecutiveFailures = failoverState.consecutive_failures
  let lastSuccessfulConnection = failoverState.last_successful_at

  // Check if RTX is configured
  if (!rtxClient.isConfigured()) {
    return NextResponse.json({
      status: 'unreachable',
      timestamp,
      connection: {
        reachable: false,
        latency_ms: 0,
        last_successful: lastSuccessfulConnection,
        consecutive_failures: consecutiveFailures
      },
      entities: {},
      last_sync: null,
      thresholds: THRESHOLDS
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  }

  // Test RTX connection
  try {
    const connectionStatus = await rtxClient.testConnection()
    reachable = connectionStatus.connected
    latency_ms = connectionStatus.responseTime || 0

    if (reachable) {
      consecutiveFailures = 0
      lastSuccessfulConnection = timestamp

      // Determine status based on latency
      if (latency_ms > THRESHOLDS.latency_critical_ms) {
        status = 'degraded'
      } else if (latency_ms > THRESHOLDS.latency_warning_ms) {
        status = 'degraded'
      }
    } else {
      consecutiveFailures++
      status = consecutiveFailures >= 3 ? 'unreachable' : 'unhealthy'
    }
  } catch (error) {
    consecutiveFailures++
    status = consecutiveFailures >= 3 ? 'unreachable' : 'unhealthy'
    console.error('[RTX Health] Connection test failed:', error)
  }

  // Get entity status (only if reachable)
  const entities: RTXHealthResponse['entities'] = {}

  if (reachable) {
    // For now, we report entities as available if connection is up
    // In production, this would query each entity endpoint
    const defaultEntities = ['accounts', 'opportunities', 'service_events', 'invoices']
    for (const entity of defaultEntities) {
      entities[entity] = {
        available: true,
        row_count: null, // Would be populated by actual API call
        last_sync: null,
        freshness: 'fresh'
      }
    }
  }

  // Get last sync from database (if Supabase is configured)
  let last_sync: RTXHealthResponse['last_sync'] = null

  if (supabase) {
    try {
      const { data: syncData } = await supabase
        .from('rtx_sync_log')
        .select('completed_at, status, records_fetched')
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      const syncRow = syncData as { completed_at: string; status: string; records_fetched: number } | null
      if (syncRow) {
        last_sync = {
          at: syncRow.completed_at,
          status: syncRow.status,
          records: syncRow.records_fetched
        }
      }
    } catch {
      // Sync log table may not exist yet - expected during initial setup
    }

    // Log health check to database
    try {
      await (supabase.from('rtx_health_log') as ReturnType<typeof supabase.from>).insert({
        status,
        is_reachable: reachable,
        latency_ms,
        consecutive_failures: consecutiveFailures,
        last_successful_at: lastSuccessfulConnection,
        entities,
        metadata: { thresholds: THRESHOLDS }
      } as Record<string, unknown>)
    } catch {
      // Database logging is best-effort
    }
  }

  const response: RTXHealthResponse = {
    status,
    timestamp,
    connection: {
      reachable,
      latency_ms,
      last_successful: lastSuccessfulConnection,
      consecutive_failures: consecutiveFailures
    },
    entities,
    last_sync,
    thresholds: THRESHOLDS
  }

  return NextResponse.json(response, {
    status: status === 'unreachable' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}
