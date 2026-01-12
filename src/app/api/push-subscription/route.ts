import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PushSubscriptionPayload {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  preferences?: {
    kpiAlerts: boolean
    dailySummary: boolean
    taskAssignments: boolean
    approvalRequests: boolean
  }
}

// Validate push endpoint URL to prevent malicious URLs
function isValidPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    // Only allow HTTPS endpoints
    if (url.protocol !== 'https:') return false
    // Common push service domains (allowlist approach)
    const allowedDomains = [
      'fcm.googleapis.com',
      'updates.push.services.mozilla.com',
      'wns.windows.com',
      'notify.windows.com',
      'push.apple.com',
      'web.push.apple.com',
    ]
    // Check if domain matches or is subdomain of allowed domains
    return allowedDomains.some(domain =>
      url.hostname === domain || url.hostname.endsWith('.' + domain)
    )
  } catch {
    return false
  }
}

// Validate key format (base64 strings)
function isValidKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false
  // Keys should be base64 encoded, reasonable length
  if (key.length < 20 || key.length > 500) return false
  // Basic base64 character check
  return /^[A-Za-z0-9+/=_-]+$/.test(key)
}

/**
 * POST /api/push-subscription
 * Save a push notification subscription to the database
 */
export async function POST(request: NextRequest) {
  try {
    const body: PushSubscriptionPayload = await request.json()

    // Validate required fields
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      )
    }

    // Validate endpoint URL for security
    if (!isValidPushEndpoint(body.endpoint)) {
      return NextResponse.json(
        { error: 'Invalid push endpoint' },
        { status: 400 }
      )
    }

    // Validate key formats
    if (!isValidKey(body.keys.p256dh) || !isValidKey(body.keys.auth)) {
      return NextResponse.json(
        { error: 'Invalid key format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user - only use authenticated user ID
    // Never accept userId from request body (prevents spoofing)
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id, user_id')
      .eq('endpoint', body.endpoint)
      .single()

    if (existing) {
      // Only allow update if: no owner, or current user is owner
      if (existing.user_id && existing.user_id !== userId) {
        return NextResponse.json(
          { error: 'Subscription belongs to another user' },
          { status: 403 }
        )
      }

      // Update existing subscription
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          p256dh_key: body.keys.p256dh,
          auth_key: body.keys.auth,
          user_id: userId,
          preferences: body.preferences || {
            kpiAlerts: true,
            dailySummary: true,
            taskAssignments: true,
            approvalRequests: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('endpoint', body.endpoint)

      if (error) {
        console.error('[Push API] Update error:', error)
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, updated: true })
    }

    // Create new subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .insert({
        endpoint: body.endpoint,
        p256dh_key: body.keys.p256dh,
        auth_key: body.keys.auth,
        user_id: userId,
        preferences: body.preferences || {
          kpiAlerts: true,
          dailySummary: true,
          taskAssignments: true,
          approvalRequests: true,
        },
      })

    if (error) {
      console.error('[Push API] Insert error:', error)
      // Handle case where table doesn't exist yet
      if (error.code === '42P01') {
        console.log('[Push API] Table does not exist - subscription saved locally only')
        return NextResponse.json({ success: true, localOnly: true })
      }
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, created: true })
  } catch (error) {
    console.error('[Push API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/push-subscription
 * Remove a push notification subscription
 * Only allows deleting own subscriptions or unowned subscriptions
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      )
    }

    // Validate endpoint format
    if (!isValidPushEndpoint(endpoint)) {
      return NextResponse.json(
        { error: 'Invalid push endpoint' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // First check if subscription exists and who owns it
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id, user_id')
      .eq('endpoint', endpoint)
      .single()

    if (!existing) {
      // Already doesn't exist, return success
      return NextResponse.json({ success: true })
    }

    // Security check: only delete if no owner or current user is owner
    if (existing.user_id && existing.user_id !== user?.id) {
      return NextResponse.json(
        { error: 'Cannot delete subscription belonging to another user' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    if (error) {
      console.error('[Push API] Delete error:', error)
      // Handle case where table doesn't exist
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, localOnly: true })
      }
      return NextResponse.json(
        { error: 'Failed to remove subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Push API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/push-subscription
 * Check if a subscription exists (only returns data for own subscriptions)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      )
    }

    // Validate endpoint format
    if (!isValidPushEndpoint(endpoint)) {
      return NextResponse.json(
        { error: 'Invalid push endpoint' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, preferences, created_at')
      .eq('endpoint', endpoint)
      .single()

    if (error) {
      // Handle not found or table doesn't exist
      if (error.code === 'PGRST116' || error.code === '42P01') {
        return NextResponse.json({ exists: false })
      }
      console.error('[Push API] Get error:', error)
      return NextResponse.json(
        { error: 'Failed to check subscription' },
        { status: 500 }
      )
    }

    // Only return preferences if subscription is unowned or belongs to current user
    const isOwner = !data.user_id || data.user_id === user?.id

    return NextResponse.json({
      exists: true,
      isOwner,
      preferences: isOwner ? data.preferences : null,
      createdAt: data.created_at,
    })
  } catch (error) {
    console.error('[Push API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
