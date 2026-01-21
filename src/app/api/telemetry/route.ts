import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface TelemetryEvent {
  user_id?: string
  user_email?: string
  user_role?: string
  page_url: string
  route?: string
  action: 'view' | 'click' | 'submit' | 'export' | 'search' | 'filter'
  session_id?: string
  duration_seconds?: number
  metadata?: Record<string, unknown>
}

interface StoredTelemetryEvent {
  user_id: string | null
  user_email: string | null
  user_role: string | null
  page_url: string
  route: string | null
  action: 'view' | 'click' | 'submit' | 'export' | 'search' | 'filter'
  session_id: string | null
  duration_seconds: number | null
  metadata: Record<string, unknown>
  created_at: string
}

interface TelemetryRequest {
  events: TelemetryEvent[]
}

// In-memory store for demo
const activityStore: StoredTelemetryEvent[] = []

/**
 * POST /api/telemetry
 * Receive client-side activity events (batch)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const now = new Date().toISOString()

  try {
    const body: TelemetryRequest = await request.json()

    // Validate events array
    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json({
        status: 'error',
        message: 'events array is required'
      }, { status: 400 })
    }

    if (body.events.length === 0) {
      return NextResponse.json({
        status: 'ok',
        message: 'No events to process',
        processed: 0
      })
    }

    if (body.events.length > 100) {
      return NextResponse.json({
        status: 'error',
        message: 'Maximum 100 events per batch'
      }, { status: 400 })
    }

    // Validate and sanitize events
    const validActions = ['view', 'click', 'submit', 'export', 'search', 'filter']
    const validatedEvents = body.events
      .filter(e => e.page_url && validActions.includes(e.action))
      .map(e => ({
        user_id: e.user_id || null,
        user_email: e.user_email || null,
        user_role: e.user_role || null,
        page_url: e.page_url.substring(0, 500), // Limit URL length
        route: e.route?.substring(0, 100) || null,
        action: e.action,
        session_id: e.session_id?.substring(0, 100) || null,
        duration_seconds: typeof e.duration_seconds === 'number' ? Math.min(e.duration_seconds, 86400) : null,
        metadata: e.metadata || {},
        created_at: now
      }))

    if (validatedEvents.length === 0) {
      return NextResponse.json({
        status: 'error',
        message: 'No valid events in batch'
      }, { status: 400 })
    }

    // Try Supabase first
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { error } = await supabase
        .from('user_activity')
        .insert(validatedEvents)

      if (error) {
        console.error('[Telemetry] Supabase insert error:', error)
        // Fall through to in-memory store
      } else {
        return NextResponse.json({
          status: 'ok',
          message: 'Events logged',
          processed: validatedEvents.length
        })
      }
    }

    // Use in-memory store
    for (const event of validatedEvents) {
      activityStore.unshift(event)
    }

    // Keep only last 10000 events
    while (activityStore.length > 10000) {
      activityStore.pop()
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Events logged (in-memory)',
      processed: validatedEvents.length
    })
  } catch (error) {
    console.error('[Telemetry] Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to process telemetry'
    }, { status: 500 })
  }
}

/**
 * GET /api/telemetry
 * Get recent telemetry events (for debugging)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const now = new Date().toISOString()
  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)

  try {
    let events: StoredTelemetryEvent[] = []

    // Try Supabase first
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error && data) {
        events = data as StoredTelemetryEvent[]
      }
    } else {
      // Use in-memory store
      events = activityStore.slice(0, limit)
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: now,
      events,
      count: events.length
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('[Telemetry] GET Error:', error)
    return NextResponse.json({
      status: 'error',
      timestamp: now,
      events: [],
      count: 0
    }, { status: 500 })
  }
}
