import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client (server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface SecurityEvent {
  id?: string
  event_type: 'login_success' | 'login_failure' | 'logout' | 'password_reset' | 'role_change' | 'session_anomaly' | 'brute_force' | 'privilege_escalation'
  user_email?: string
  user_id?: string
  ip_address?: string
  user_agent?: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  metadata?: Record<string, unknown>
  created_at?: string
}

interface SecurityEventsResponse {
  status: 'ok' | 'error'
  timestamp: string
  events: SecurityEvent[]
  summary: {
    total: number
    login_failures: number
    anomalies: number
    threats: number
  }
}

// In-memory store for demo (in production, would use Supabase)
const securityEventsStore: SecurityEvent[] = []

/**
 * GET /api/security/events
 * Query recent security events
 */
export async function GET(request: NextRequest): Promise<NextResponse<SecurityEventsResponse>> {
  const now = new Date().toISOString()
  const searchParams = request.nextUrl.searchParams
  const hours = parseInt(searchParams.get('hours') || '24')
  const eventType = searchParams.get('type')
  const email = searchParams.get('email')

  try {
    let events: SecurityEvent[] = []

    // Try Supabase first
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

      let query = supabase
        .from('security_events')
        .select('*')
        .gte('created_at', cutoffTime)
        .order('created_at', { ascending: false })
        .limit(100)

      if (eventType) {
        query = query.eq('event_type', eventType)
      }
      if (email) {
        query = query.eq('user_email', email)
      }

      const { data, error } = await query

      if (!error && data) {
        events = data
      }
    } else {
      // Use in-memory store for demo
      const cutoffTime = Date.now() - hours * 60 * 60 * 1000
      events = securityEventsStore
        .filter(e => {
          const eventTime = e.created_at ? new Date(e.created_at).getTime() : 0
          return eventTime >= cutoffTime
        })
        .filter(e => !eventType || e.event_type === eventType)
        .filter(e => !email || e.user_email === email)
        .slice(0, 100)
    }

    // Calculate summary
    const loginFailures = events.filter(e => e.event_type === 'login_failure').length
    const anomalies = events.filter(e => e.event_type === 'session_anomaly').length
    const threats = events.filter(e =>
      e.event_type === 'brute_force' || e.event_type === 'privilege_escalation'
    ).length

    return NextResponse.json({
      status: 'ok',
      timestamp: now,
      events,
      summary: {
        total: events.length,
        login_failures: loginFailures,
        anomalies,
        threats
      }
    })
  } catch (error) {
    console.error('[Security Events] Error:', error)
    return NextResponse.json({
      status: 'error',
      timestamp: now,
      events: [],
      summary: { total: 0, login_failures: 0, anomalies: 0, threats: 0 }
    }, { status: 500 })
  }
}

/**
 * POST /api/security/events
 * Log a new security event
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const now = new Date().toISOString()

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.event_type || !body.severity) {
      return NextResponse.json({
        status: 'error',
        message: 'event_type and severity are required'
      }, { status: 400 })
    }

    // Validate event_type
    const validEventTypes = ['login_success', 'login_failure', 'logout', 'password_reset', 'role_change', 'session_anomaly', 'brute_force', 'privilege_escalation']
    if (!validEventTypes.includes(body.event_type)) {
      return NextResponse.json({
        status: 'error',
        message: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`
      }, { status: 400 })
    }

    // Validate severity
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info']
    if (!validSeverities.includes(body.severity)) {
      return NextResponse.json({
        status: 'error',
        message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
      }, { status: 400 })
    }

    const event: SecurityEvent = {
      event_type: body.event_type,
      user_email: body.user_email || null,
      user_id: body.user_id || null,
      ip_address: body.ip_address || request.headers.get('x-forwarded-for') || null,
      user_agent: body.user_agent || request.headers.get('user-agent') || null,
      severity: body.severity,
      metadata: body.metadata || {},
      created_at: now
    }

    // Try Supabase first
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      const { error } = await supabase
        .from('security_events')
        .insert(event)

      if (error) {
        console.error('[Security Events] Supabase insert error:', error)
        // Fall through to in-memory store
      } else {
        return NextResponse.json({
          status: 'ok',
          message: 'Security event logged',
          event
        })
      }
    }

    // Use in-memory store for demo
    securityEventsStore.unshift({ ...event, id: crypto.randomUUID() })

    // Keep only last 1000 events
    if (securityEventsStore.length > 1000) {
      securityEventsStore.pop()
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Security event logged (in-memory)',
      event
    })
  } catch (error) {
    console.error('[Security Events] Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to log security event'
    }, { status: 500 })
  }
}
