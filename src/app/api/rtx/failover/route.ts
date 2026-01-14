import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateRTXApiRequest } from '@/lib/auth/rtx-api-auth'

// Types
interface FailoverRequest {
  event: 'failover' | 'recovery'
  reason?: string
  rtx_health?: 'healthy' | 'degraded' | 'unhealthy' | 'unreachable'
  consecutive_failures?: number
}

interface FailoverResponse {
  success: boolean
  timestamp: string
  current_source: 'rtx' | 'mock'
  is_using_fallback: boolean
  event_logged: boolean
  alert_sent: boolean
  message?: string
}

// Default state (used when database not available)
const DEFAULT_STATE = {
  primary_source: 'rtx' as const,
  fallback_source: 'mock' as const,
  is_using_fallback: true, // Start with mock until RTX proven healthy
  failover_at: null as string | null,
  recovery_at: null as string | null
}

/**
 * Get failover state from database (replaces module-level state)
 */
interface FailoverStateRow {
  is_using_fallback: boolean
  failover_at: string | null
  recovery_at: string | null
}

async function getFailoverState(supabase: ReturnType<typeof createClient>): Promise<{
  is_using_fallback: boolean
  failover_at: string | null
  recovery_at: string | null
}> {
  try {
    const { data } = await supabase
      .from('data_source_status')
      .select('is_using_fallback, failover_at, recovery_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const row = data as FailoverStateRow | null
    return {
      is_using_fallback: row?.is_using_fallback ?? true,
      failover_at: row?.failover_at ?? null,
      recovery_at: row?.recovery_at ?? null
    }
  } catch {
    return {
      is_using_fallback: true,
      failover_at: null,
      recovery_at: null
    }
  }
}

/**
 * POST /api/rtx/failover
 * Log failover or recovery events and update data source status
 *
 * Request body:
 * {
 *   event: 'failover' | 'recovery',
 *   reason?: string,
 *   rtx_health?: string,
 *   consecutive_failures?: number
 * }
 *
 * Used by: OPS-UNIFIED-001 workflow and service layer
 */
export async function POST(request: NextRequest): Promise<NextResponse<FailoverResponse>> {
  // Validate authentication
  const auth = validateRTXApiRequest(request)
  if (!auth.valid) return auth.error!

  const timestamp = new Date().toISOString()

  // Get Supabase client early to read current state
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let currentState = { ...DEFAULT_STATE }
  let supabase: ReturnType<typeof createClient> | null = null

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
    const dbState = await getFailoverState(supabase)
    currentState = { ...DEFAULT_STATE, ...dbState }
  }

  // Parse request body
  let body: FailoverRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({
      success: false,
      timestamp,
      current_source: currentState.is_using_fallback ? 'mock' : 'rtx',
      is_using_fallback: currentState.is_using_fallback,
      event_logged: false,
      alert_sent: false,
      message: 'Invalid request body'
    }, { status: 400 })
  }

  const { event, reason, rtx_health, consecutive_failures } = body

  // Validate event type
  if (!['failover', 'recovery'].includes(event)) {
    return NextResponse.json({
      success: false,
      timestamp,
      current_source: currentState.is_using_fallback ? 'mock' : 'rtx',
      is_using_fallback: currentState.is_using_fallback,
      event_logged: false,
      alert_sent: false,
      message: 'Invalid event type. Must be "failover" or "recovery".'
    }, { status: 400 })
  }

  // Determine new state
  const newIsUsingFallback = event === 'failover'
  const newFailoverAt = event === 'failover' ? timestamp : currentState.failover_at
  const newRecoveryAt = event === 'recovery' ? timestamp : null

  let eventLogged = false
  let alertSent = false

  if (supabase) {
    try {
      // Log to data_source_status table
      // Type assertion required because Supabase client lacks generated types for custom tables
      await (supabase.from('data_source_status') as ReturnType<typeof supabase.from>).insert({
        primary_source: DEFAULT_STATE.primary_source,
        fallback_source: DEFAULT_STATE.fallback_source,
        is_using_fallback: newIsUsingFallback,
        event_type: event,
        failover_reason: reason || (event === 'failover' ? 'RTX unreachable' : null),
        consecutive_failures: consecutive_failures || 0,
        rtx_health: rtx_health || (event === 'failover' ? 'unreachable' : 'healthy'),
        failover_at: newFailoverAt,
        recovery_at: newRecoveryAt,
        alert_sent: true, // We'll try to send alert
        metadata: {
          triggered_by: 'api'
        }
      } as Record<string, unknown>)
      eventLogged = true

      // Update local state to reflect new database state
      currentState.is_using_fallback = newIsUsingFallback
      currentState.failover_at = newFailoverAt
      currentState.recovery_at = newRecoveryAt

      // Log to ops_events
      await (supabase.from('ops_events') as ReturnType<typeof supabase.from>).insert({
        event_type: event === 'failover' ? 'rtx_failover' : 'rtx_recovery',
        severity: event === 'failover' ? 'critical' : 'info',
        source: 'failover',
        route: '/api/rtx/failover',
        message: event === 'failover'
          ? `RTX failover activated: ${reason || 'Connection failed'}. Using mock data.`
          : `RTX recovered. Switched back to production data.`,
        metadata: {
          event,
          reason,
          rtx_health,
          consecutive_failures,
          previous_state: {
            was_using_fallback: !currentState.is_using_fallback
          }
        }
      } as Record<string, unknown>)

      // Send Slack alert (if webhook configured)
      const slackWebhook = process.env.SLACK_WEBHOOK_URL
      if (slackWebhook) {
        try {
          const color = event === 'failover' ? '#FF0000' : '#36A64F'
          const emoji = event === 'failover' ? '🚨' : '✅'
          const title = event === 'failover'
            ? 'CRITICAL: RTX Data Hub Failover'
            : 'RTX Data Hub Recovered'

          await fetch(slackWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attachments: [{
                color,
                blocks: [
                  {
                    type: 'header',
                    text: { type: 'plain_text', text: `${emoji} ${title}`, emoji: true }
                  },
                  {
                    type: 'section',
                    fields: [
                      {
                        type: 'mrkdwn',
                        text: `*Status:*\n${rtx_health || (event === 'failover' ? 'Unreachable' : 'Healthy')}`
                      },
                      {
                        type: 'mrkdwn',
                        text: `*Now Using:*\n${currentState.is_using_fallback ? 'Mock Data' : 'RTX Data Hub'}`
                      }
                    ]
                  },
                  ...(reason ? [{
                    type: 'section',
                    text: { type: 'mrkdwn', text: `*Reason:*\n${reason}` }
                  }] : []),
                  ...(event === 'failover' && consecutive_failures ? [{
                    type: 'section',
                    text: { type: 'mrkdwn', text: `*Consecutive Failures:*\n${consecutive_failures}` }
                  }] : []),
                  {
                    type: 'context',
                    elements: [{
                      type: 'mrkdwn',
                      text: `Agent: Failover | ${timestamp}`
                    }]
                  },
                  {
                    type: 'actions',
                    elements: [{
                      type: 'button',
                      text: { type: 'plain_text', text: 'View Status' },
                      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com'}/settings/data-sources`
                    }]
                  }
                ]
              }]
            })
          })
          alertSent = true
        } catch (slackError) {
          console.error('[RTX Failover] Slack alert failed:', slackError)
        }
      }
    } catch (error) {
      console.error('[RTX Failover] Database logging failed:', error)
    }
  }

  return NextResponse.json({
    success: true,
    timestamp,
    current_source: currentState.is_using_fallback ? 'mock' : 'rtx',
    is_using_fallback: currentState.is_using_fallback,
    event_logged: eventLogged,
    alert_sent: alertSent,
    message: event === 'failover'
      ? 'Failover activated. Application now using mock data.'
      : 'Recovery complete. Application now using RTX data.'
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

/**
 * GET /api/rtx/failover
 * Get current data source status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Validate authentication (allow public read for dashboard)
  const auth = validateRTXApiRequest(request, { allowPublicRead: true })
  if (!auth.valid) return auth.error!

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Return default state if no database
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      current_source: DEFAULT_STATE.is_using_fallback ? 'mock' : 'rtx',
      is_using_fallback: DEFAULT_STATE.is_using_fallback,
      failover_at: DEFAULT_STATE.failover_at,
      recovery_at: DEFAULT_STATE.recovery_at,
      source: 'default'
    }, { status: 200 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Get latest status from database
    const { data, error } = await supabase
      .from('data_source_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    // Use database state or default
    const currentState = data ? {
      is_using_fallback: data.is_using_fallback,
      failover_at: data.failover_at,
      recovery_at: data.recovery_at
    } : DEFAULT_STATE

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      current_source: currentState.is_using_fallback ? 'mock' : 'rtx',
      is_using_fallback: currentState.is_using_fallback,
      failover_at: currentState.failover_at,
      recovery_at: currentState.recovery_at,
      event_type: data?.event_type,
      failover_reason: data?.failover_reason,
      rtx_health: data?.rtx_health,
      source: 'database'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'max-age=5',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch status',
      current_source: DEFAULT_STATE.is_using_fallback ? 'mock' : 'rtx',
      is_using_fallback: DEFAULT_STATE.is_using_fallback
    }, { status: 500 })
  }
}
