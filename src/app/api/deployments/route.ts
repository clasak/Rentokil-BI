import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface Deployment {
  id?: string
  deployment_id: string
  git_commit?: string
  git_branch?: string
  git_message?: string
  status: 'building' | 'ready' | 'error' | 'canceled'
  duration_ms?: number
  health_status?: 'healthy' | 'degraded' | 'unhealthy' | 'pending' | 'skipped'
  health_checks?: Record<string, unknown>
  metadata?: Record<string, unknown>
  deployed_at?: string
  verified_at?: string
  created_at?: string
}

interface DeploymentsResponse {
  status: 'ok' | 'error'
  timestamp: string
  deployments: Deployment[]
  latest?: Deployment
  health_verified: boolean
  summary: {
    total: number
    ready: number
    error: number
    building: number
  }
}

// In-memory store for demo
const deploymentsStore: Deployment[] = []

/**
 * GET /api/deployments
 * List recent deployments
 */
export async function GET(request: NextRequest): Promise<NextResponse<DeploymentsResponse>> {
  const now = new Date().toISOString()
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '10')

  try {
    let deployments: Deployment[] = []

    // Try Supabase first
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data, error } = await supabase
        .from('deployments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!error && data) {
        deployments = data
      }
    } else {
      // Use in-memory store
      deployments = deploymentsStore.slice(0, limit)
    }

    // Get latest deployment
    const latest = deployments.length > 0 ? deployments[0] : undefined
    const healthVerified = latest?.health_status === 'healthy'

    // Calculate summary
    const ready = deployments.filter(d => d.status === 'ready').length
    const error = deployments.filter(d => d.status === 'error').length
    const building = deployments.filter(d => d.status === 'building').length

    return NextResponse.json({
      status: 'ok',
      timestamp: now,
      deployments,
      latest,
      health_verified: healthVerified,
      summary: {
        total: deployments.length,
        ready,
        error,
        building
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (err) {
    console.error('[Deployments] Error:', err)
    return NextResponse.json({
      status: 'error',
      timestamp: now,
      deployments: [],
      health_verified: false,
      summary: { total: 0, ready: 0, error: 0, building: 0 }
    }, { status: 500 })
  }
}

/**
 * POST /api/deployments
 * Log a new deployment or update existing
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const now = new Date().toISOString()

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.deployment_id || !body.status) {
      return NextResponse.json({
        status: 'error',
        message: 'deployment_id and status are required'
      }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['building', 'ready', 'error', 'canceled']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({
        status: 'error',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 })
    }

    const deployment: Deployment = {
      deployment_id: body.deployment_id,
      git_commit: body.git_commit || null,
      git_branch: body.git_branch || null,
      git_message: body.git_message || null,
      status: body.status,
      duration_ms: body.duration_ms || null,
      health_status: body.health_status || 'pending',
      health_checks: body.health_checks || {},
      metadata: body.metadata || {},
      deployed_at: body.deployed_at || (body.status === 'ready' ? now : null),
      verified_at: body.verified_at || null,
      created_at: now
    }

    // Try Supabase first
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Upsert - update if exists, insert if not
      const { error } = await supabase
        .from('deployments')
        .upsert(deployment, { onConflict: 'deployment_id' })

      if (error) {
        console.error('[Deployments] Supabase upsert error:', error)
      } else {
        return NextResponse.json({
          status: 'ok',
          message: 'Deployment logged',
          deployment
        })
      }
    }

    // Use in-memory store
    const existingIndex = deploymentsStore.findIndex(d => d.deployment_id === body.deployment_id)
    if (existingIndex >= 0) {
      deploymentsStore[existingIndex] = { ...deploymentsStore[existingIndex], ...deployment }
    } else {
      deploymentsStore.unshift({ ...deployment, id: crypto.randomUUID() })
    }

    // Keep only last 100 deployments
    if (deploymentsStore.length > 100) {
      deploymentsStore.pop()
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Deployment logged (in-memory)',
      deployment
    })
  } catch (err) {
    console.error('[Deployments] Error:', err)
    return NextResponse.json({
      status: 'error',
      message: err instanceof Error ? err.message : 'Failed to log deployment'
    }, { status: 500 })
  }
}
