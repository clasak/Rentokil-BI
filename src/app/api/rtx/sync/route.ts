import { NextRequest, NextResponse } from 'next/server'
import { rtxClient } from '@/services/rtx-hub'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { validateRTXApiRequest } from '@/lib/auth/rtx-api-auth'

// Allowed entity names for validation
const ALLOWED_ENTITIES = ['accounts', 'opportunities', 'service_events', 'invoices', 'employees']

// Types
interface SyncRequest {
  type: 'full' | 'incremental'
  entities?: string[]
}

interface SyncResponse {
  success: boolean
  sync_id: string
  timestamp: string
  status: 'started' | 'queued' | 'failed'
  type: 'full' | 'incremental'
  entities: string[]
  estimated_records?: number
  message?: string
}

/**
 * POST /api/rtx/sync
 * Trigger a manual data sync from RTX Data Hub
 *
 * Used by: OPS-RTX-INTAKE-001 workflow and manual triggers
 *
 * Request body:
 * {
 *   type: 'full' | 'incremental',
 *   entities?: string[]
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<SyncResponse>> {
  // Validate authentication
  const auth = validateRTXApiRequest(request)
  if (!auth.valid) return auth.error!

  const timestamp = new Date().toISOString()
  const sync_id = randomUUID()

  // Check if RTX is configured
  if (!rtxClient.isConfigured()) {
    return NextResponse.json({
      success: false,
      sync_id,
      timestamp,
      status: 'failed',
      type: 'full',
      entities: [],
      message: 'RTX Data Hub not configured. Set RTX_API_ENDPOINT and RTX_API_KEY environment variables.'
    }, { status: 200 })
  }

  // Parse request body
  let body: SyncRequest = { type: 'incremental' }
  try {
    body = await request.json()
  } catch {
    // Use defaults
  }

  const { type = 'incremental', entities: requestedEntities } = body

  // Default entities
  const defaultEntities = ['accounts', 'opportunities', 'service_events', 'invoices']
  const entities = requestedEntities && requestedEntities.length > 0
    ? requestedEntities
    : defaultEntities

  // Validate entity names
  const invalidEntities = entities.filter(e => !ALLOWED_ENTITIES.includes(e))
  if (invalidEntities.length > 0) {
    return NextResponse.json({
      success: false,
      sync_id,
      timestamp,
      status: 'failed',
      type,
      entities: [],
      message: `Invalid entity names: ${invalidEntities.join(', ')}. Allowed: ${ALLOWED_ENTITIES.join(', ')}`
    }, { status: 400 })
  }

  // Get Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      success: false,
      sync_id,
      timestamp,
      status: 'failed',
      type,
      entities,
      message: 'Supabase not configured for sync logging'
    }, { status: 200 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Check RTX health before starting sync
  try {
    const connectionStatus = await rtxClient.testConnection()
    if (!connectionStatus.connected) {
      // Log failed sync attempt
      await supabase.from('rtx_sync_log').insert({
        sync_type: type,
        status: 'failed',
        error_message: 'RTX connection failed before sync',
        started_at: timestamp
      })

      return NextResponse.json({
        success: false,
        sync_id,
        timestamp,
        status: 'failed',
        type,
        entities,
        message: 'RTX connection failed. Cannot start sync.'
      }, { status: 200 })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      sync_id,
      timestamp,
      status: 'failed',
      type,
      entities,
      message: error instanceof Error ? error.message : 'RTX connection check failed'
    }, { status: 200 })
  }

  // Create sync log entry (status: started)
  try {
    await supabase.from('rtx_sync_log').insert({
      sync_type: type,
      status: 'started',
      started_at: timestamp,
      metadata: {
        sync_id,
        requested_entities: entities,
        triggered_by: 'api'
      }
    })
  } catch (error) {
    console.error('[RTX Sync] Failed to create sync log:', error)
  }

  // Log to ops_events
  try {
    await supabase.from('ops_events').insert({
      event_type: 'rtx_sync_started',
      severity: 'info',
      source: 'intake',
      route: '/api/rtx/sync',
      message: `${type === 'full' ? 'Full' : 'Incremental'} sync started for ${entities.length} entities`,
      metadata: {
        sync_id,
        type,
        entities
      }
    })
  } catch {
    // Best effort
  }

  // Note: In a production system, the actual sync would be performed
  // asynchronously by a background job or the n8n workflow.
  // This endpoint just initiates the sync and returns immediately.

  return NextResponse.json({
    success: true,
    sync_id,
    timestamp,
    status: 'started',
    type,
    entities,
    message: `Sync initiated. Monitor progress at /api/rtx/sync/status?sync_id=${sync_id}`
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

/**
 * GET /api/rtx/sync
 * Get recent sync history
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Validate authentication (allow public read for dashboard)
  const auth = validateRTXApiRequest(request, { allowPublicRead: true })
  if (!auth.valid) return auth.error!

  const { searchParams } = new URL(request.url)

  // Validate and clamp limit parameter
  const rawLimit = parseInt(searchParams.get('limit') || '10', 10)
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 10 : rawLimit), 100)

  const entity = searchParams.get('entity')

  // Validate entity if provided
  if (entity && !ALLOWED_ENTITIES.includes(entity)) {
    return NextResponse.json({
      success: false,
      message: `Invalid entity: ${entity}. Allowed: ${ALLOWED_ENTITIES.join(', ')}`,
      syncs: []
    }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      success: false,
      message: 'Supabase not configured',
      syncs: []
    }, { status: 200 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    let query = supabase
      .from('rtx_sync_log')
      .select('*')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (entity) {
      query = query.eq('entity_name', entity)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      syncs: data || [],
      count: data?.length || 0
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'max-age=10',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch sync history',
      syncs: []
    }, { status: 500 })
  }
}
