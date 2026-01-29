/**
 * Automation Rules API
 *
 * CRUD endpoints for managing Lead Service Engine automation rules
 * Rules are stored in Supabase automation_rules table
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

interface AutomationRule {
  id?: string
  rule_name: string
  description?: string
  trigger_type: 'lead_received' | 'lead_updated' | 'stage_change' | 'time_based' | 'threshold'
  conditions: Record<string, unknown>
  actions: Record<string, unknown>[]
  priority?: number
  is_active?: boolean
}

// =============================================================================
// GET - List all automation rules
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const triggerType = searchParams.get('trigger_type')

    let query = supabase
      .from('automation_rules')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false })

    // Apply filters
    if (active !== null) {
      query = query.eq('is_active', active === 'true')
    }

    if (triggerType) {
      query = query.eq('trigger_type', triggerType)
    }

    const { data: rules, error } = await query

    if (error) {
      console.error('[automation-rules] GET error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch rules' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: rules,
      count: rules.length,
    })
  } catch (error) {
    console.error('[automation-rules] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Create new automation rule
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: AutomationRule = await request.json()

    // Validate required fields
    if (!body.rule_name || !body.trigger_type || !body.conditions || !body.actions) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: rule_name, trigger_type, conditions, actions',
        },
        { status: 400 }
      )
    }

    // Validate trigger type
    const validTriggerTypes = ['lead_received', 'lead_updated', 'stage_change', 'time_based', 'threshold']
    if (!validTriggerTypes.includes(body.trigger_type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid trigger_type. Must be one of: ${validTriggerTypes.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Insert rule
    const { data: rule, error } = await supabase
      .from('automation_rules')
      .insert({
        rule_name: body.rule_name,
        description: body.description,
        trigger_type: body.trigger_type,
        conditions: body.conditions,
        actions: body.actions,
        priority: body.priority || 100,
        is_active: body.is_active !== false, // Default to true
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('[automation-rules] POST error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create rule', details: error.message },
        { status: 500 }
      )
    }

    // Log creation event
    await supabase.from('ops_events').insert({
      source: 'automation_engine',
      event_type: 'rule_created',
      message: `Automation rule created: ${body.rule_name}`,
      metadata: {
        rule_id: rule.id,
        trigger_type: body.trigger_type,
        user_id: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Automation rule created successfully',
    })
  } catch (error) {
    console.error('[automation-rules] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PATCH - Update automation rule
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // Update rule (RLS ensures only creator can update)
    const { data: rule, error } = await supabase
      .from('automation_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[automation-rules] PATCH error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update rule', details: error.message },
        { status: 500 }
      )
    }

    // Log update event
    await supabase.from('ops_events').insert({
      source: 'automation_engine',
      event_type: 'rule_updated',
      message: `Automation rule updated: ${rule.rule_name}`,
      metadata: {
        rule_id: id,
        user_id: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Automation rule updated successfully',
    })
  } catch (error) {
    console.error('[automation-rules] PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE - Delete automation rule
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    // Get rule name before deletion
    const { data: rule } = await supabase
      .from('automation_rules')
      .select('rule_name')
      .eq('id', id)
      .single()

    // Delete rule (RLS ensures only creator can delete)
    const { error } = await supabase
      .from('automation_rules')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[automation-rules] DELETE error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete rule', details: error.message },
        { status: 500 }
      )
    }

    // Log deletion event
    await supabase.from('ops_events').insert({
      source: 'automation_engine',
      event_type: 'rule_deleted',
      message: `Automation rule deleted: ${rule?.rule_name || id}`,
      metadata: {
        rule_id: id,
        user_id: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Automation rule deleted successfully',
    })
  } catch (error) {
    console.error('[automation-rules] DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
