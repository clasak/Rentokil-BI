import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateRTXApiRequest } from '@/lib/auth/rtx-api-auth'

// Types
interface SyncStatus {
  id: string
  sync_type: string
  entity_name: string | null
  status: string
  records_fetched: number
  records_created: number
  records_updated: number
  records_skipped: number
  records_failed: number
  duration_ms: number | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
}

interface SyncStatusResponse {
  success: boolean
  timestamp: string
  sync: SyncStatus | null
  message?: string
}

/**
 * GET /api/rtx/sync/status
 * Get the status of a specific sync or the latest sync
 *
 * Query params:
 * - sync_id: Specific sync ID to check
 * - entity: Filter by entity name
 *
 * Used by: OPS-RTX-INTAKE-001 workflow and dashboard status checks
 */
export async function GET(request: NextRequest): Promise<NextResponse<SyncStatusResponse | { success: boolean; syncs: SyncStatus[] }>> {
  // Validate authentication (allow public read for dashboard)
  const auth = validateRTXApiRequest(request, { allowPublicRead: true })
  if (!auth.valid) return auth.error!

  const { searchParams } = new URL(request.url)
  const syncId = searchParams.get('sync_id')
  const entity = searchParams.get('entity')
  const latest = searchParams.get('latest') === 'true'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      sync: null,
      message: 'Supabase not configured'
    }, { status: 200 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // If sync_id provided, get specific sync
    if (syncId) {
      const { data, error } = await supabase
        .from('rtx_sync_log')
        .select('*')
        .eq('id', syncId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        sync: data || null,
        message: data ? undefined : 'Sync not found'
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff'
        }
      })
    }

    // Get latest sync(s)
    let query = supabase
      .from('rtx_sync_log')
      .select('*')
      .order('started_at', { ascending: false, nullsFirst: false })

    if (entity) {
      query = query.eq('entity_name', entity)
    }

    if (latest) {
      query = query.limit(1)
    } else {
      query = query.limit(10)
    }

    const { data, error } = await query

    if (error) throw error

    if (latest) {
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        sync: data?.[0] || null,
        message: data?.length ? undefined : 'No syncs found'
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'max-age=5',
          'X-Content-Type-Options': 'nosniff'
        }
      })
    }

    return NextResponse.json({
      success: true,
      syncs: data || []
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
      timestamp: new Date().toISOString(),
      sync: null,
      message: error instanceof Error ? error.message : 'Failed to fetch sync status'
    }, { status: 500 })
  }
}
