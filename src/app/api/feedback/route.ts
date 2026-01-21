import { NextRequest, NextResponse } from 'next/server'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import type { CreateFeedbackInput, FeedbackSubmission } from '@/types/feedback'

/**
 * Slack message payload for feedback notifications
 */
interface SlackBlock {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  fields?: Array<{ type: string; text: string }>
}

interface SlackPayload {
  blocks: SlackBlock[]
}

/**
 * Send Slack notification for high-priority feedback
 */
async function sendSlackNotification(feedback: Partial<FeedbackSubmission>): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.log('[Sophia] No SLACK_WEBHOOK_URL configured, skipping notification')
    return false
  }

  const severityEmoji = feedback.severity === 'critical' ? '🚨' : '⚠️'
  const typeIcon =
    feedback.feedback_type === 'bug' ? '🐛' :
    feedback.feedback_type === 'performance' ? '⚡' :
    feedback.feedback_type === 'data' ? '📊' :
    feedback.feedback_type === 'ui_ux' ? '🎨' :
    feedback.feedback_type === 'feature' ? '✨' :
    feedback.feedback_type === 'idea' ? '💡' : '📚'

  const payload: SlackPayload = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji} Alpha Feedback: ${feedback.feedback_type?.toUpperCase()}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Severity:*\n${feedback.severity}` },
          { type: 'mrkdwn', text: `*Type:*\n${typeIcon} ${feedback.feedback_type}` },
          { type: 'mrkdwn', text: `*From:*\n${feedback.submitter_name || 'Anonymous'}` },
          { type: 'mrkdwn', text: `*Role:*\n${feedback.submitter_role || 'Unknown'}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${feedback.title}*\n${feedback.description?.substring(0, 500)}${(feedback.description?.length || 0) > 500 ? '...' : ''}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Page:*\n\`${feedback.page_url}\`` },
          { type: 'mrkdwn', text: `*Time:*\n${new Date().toLocaleString()}` },
        ],
      },
    ],
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('[Sophia] Slack notification failed:', response.status)
      return false
    }

    console.log('[Sophia] Slack notification sent successfully')
    return true
  } catch (error) {
    console.error('[Sophia] Slack notification error:', error)
    return false
  }
}

/**
 * Log to ops_events table for Sophia tracking
 */
async function logToOpsEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  feedback: Partial<FeedbackSubmission>,
  feedbackId: string
): Promise<void> {
  try {
    await supabase.from('ops_events').insert({
      event_type: 'feedback_submitted',
      severity: feedback.severity === 'critical' ? 'critical' :
                feedback.severity === 'high' ? 'high' : 'info',
      source: 'sophia',
      message: `New feedback: ${feedback.title}`,
      metadata: {
        feedback_id: feedbackId,
        feedback_type: feedback.feedback_type,
        severity: feedback.severity,
        page_url: feedback.page_url,
        submitter_name: feedback.submitter_name,
        submitter_role: feedback.submitter_role,
      },
    })
  } catch (error) {
    // Non-critical, just log
    console.log('[Sophia] Could not log to ops_events:', error)
  }
}

/**
 * POST /api/feedback
 * Submit new feedback for Sophia agent to triage
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CreateFeedbackInput = await request.json()

    // Validate required fields
    if (!body.feedback_type || !body.title || !body.description || !body.page_url) {
      return NextResponse.json(
        { error: 'Missing required fields: feedback_type, title, description, page_url' },
        { status: 400 }
      )
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      console.log('[Sophia] Supabase not configured, returning mock response')
      return NextResponse.json({
        success: true,
        id: `mock-${Date.now()}`,
        message: 'Feedback received (demo mode - not saved to database)',
        slackNotified: false,
      })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()

    // Get user profile for enrichment
    let userProfile: { name: string; email: string; role: string; department: string } | null = null
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name, email, role, department')
        .eq('id', user.id)
        .single()

      if (profile) {
        userProfile = profile
      }
    }

    // Build the feedback submission record
    const feedbackData: Partial<FeedbackSubmission> = {
      submitter_id: user?.id || null,
      submitter_name: userProfile?.name || null,
      submitter_email: userProfile?.email || user?.email || null,
      submitter_role: userProfile?.role || null,
      submitter_department: userProfile?.department || null,
      feedback_type: body.feedback_type,
      severity: body.severity || 'medium',
      status: 'new',
      title: body.title,
      description: body.description,
      steps_to_reproduce: body.steps_to_reproduce || null,
      page_url: body.page_url,
      component_path: body.component_path || null,
      screenshot_urls: body.screenshot_urls || null,
      metadata: body.metadata || null,
    }

    // Insert into feedback_submissions table
    const { data: insertedFeedback, error: insertError } = await supabase
      .from('feedback_submissions')
      .insert(feedbackData)
      .select('id')
      .single()

    if (insertError) {
      console.error('[Sophia] Database insert error:', insertError)

      // If table doesn't exist, return graceful error
      if (insertError.code === '42P01') {
        return NextResponse.json({
          success: false,
          error: 'Feedback table not configured. Run migration 004_feedback_submissions.sql',
          fallback: true,
        }, { status: 503 })
      }

      return NextResponse.json(
        { error: 'Failed to save feedback', details: insertError.message },
        { status: 500 }
      )
    }

    const feedbackId = insertedFeedback?.id || 'unknown'

    // Log to ops_events for Sophia tracking
    await logToOpsEvents(supabase, feedbackData, feedbackId)

    // Send Slack notification for critical/high severity
    let slackNotified = false
    if (feedbackData.severity === 'critical' || feedbackData.severity === 'high') {
      slackNotified = await sendSlackNotification({ ...feedbackData, id: feedbackId })
    }

    return NextResponse.json({
      success: true,
      id: feedbackId,
      message: 'Feedback submitted successfully',
      slackNotified,
    })
  } catch (error) {
    console.error('[Sophia] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/feedback
 * Retrieve feedback submissions (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        feedback: [],
        message: 'Supabase not configured',
      })
    }

    const supabase = await createClient()

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('feedback_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data: feedback, error } = await query

    if (error) {
      console.error('[Sophia] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve feedback', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      feedback: feedback || [],
      count: feedback?.length || 0,
    })
  } catch (error) {
    console.error('[Sophia] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
