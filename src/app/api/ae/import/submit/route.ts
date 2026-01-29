/**
 * AE Import Submit API
 *
 * POST endpoint for submitting proposals, sales, and new starts from the AE import workflow
 * Persists data to Supabase and returns success with redirect URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

type ImportType = 'proposal' | 'sale' | 'new_start'

interface ProposalData {
  account_name: string
  service_type: string
  pricing: number
  parsed_data?: Record<string, unknown>
  pdf_url?: string
}

interface SaleData {
  account_name: string
  sell_amount: number
  sell_date: string // ISO date string
  contract_type?: string
  service_category?: string
  branch_code?: string
  region_code?: string
  market_code?: string
  notes?: string
}

interface NewStartData {
  account_name: string
  contract_type: string
  start_date: string // ISO date string
  service_category?: string
  branch_code?: string
  region_code?: string
  market_code?: string
  customer_contact?: {
    phone?: string
    email?: string
    address?: string
  }
  notes?: string
}

interface ImportRequestBody {
  type: ImportType
  data: ProposalData | SaleData | NewStartData
}

// =============================================================================
// Validation Functions
// =============================================================================

function validateProposal(data: unknown): data is ProposalData {
  const proposal = data as ProposalData
  return !!(
    proposal &&
    typeof proposal.account_name === 'string' &&
    proposal.account_name.length > 0 &&
    typeof proposal.service_type === 'string' &&
    proposal.service_type.length > 0 &&
    typeof proposal.pricing === 'number' &&
    proposal.pricing >= 0
  )
}

function validateSale(data: unknown): data is SaleData {
  const sale = data as SaleData
  return !!(
    sale &&
    typeof sale.account_name === 'string' &&
    sale.account_name.length > 0 &&
    typeof sale.sell_amount === 'number' &&
    sale.sell_amount > 0 &&
    typeof sale.sell_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(sale.sell_date) // Basic ISO date check
  )
}

function validateNewStart(data: unknown): data is NewStartData {
  const newStart = data as NewStartData
  return !!(
    newStart &&
    typeof newStart.account_name === 'string' &&
    newStart.account_name.length > 0 &&
    typeof newStart.contract_type === 'string' &&
    newStart.contract_type.length > 0 &&
    typeof newStart.start_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}/.test(newStart.start_date) // Basic ISO date check
  )
}

// =============================================================================
// API Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ImportRequestBody = await request.json()

    // Validate request structure
    if (!body || !body.type || !body.data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Must include type and data.',
        },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in.',
        },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Process based on import type
    let result
    let redirectUrl = '/ae/tracker'

    switch (body.type) {
      case 'proposal': {
        if (!validateProposal(body.data)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid proposal data. Required fields: account_name, service_type, pricing',
            },
            { status: 400 }
          )
        }

        const { data: proposal, error } = await supabase
          .from('proposals')
          .insert({
            ...body.data,
            created_by: userId,
            status: 'pending',
          })
          .select()
          .single()

        if (error) {
          console.error('[ae/import/submit] Proposal insert error:', error)
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to save proposal',
              details: error.message,
            },
            { status: 500 }
          )
        }

        result = proposal
        redirectUrl = '/ae/tracker?tab=proposals'
        break
      }

      case 'sale': {
        if (!validateSale(body.data)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid sale data. Required fields: account_name, sell_amount, sell_date',
            },
            { status: 400 }
          )
        }

        const { data: sale, error } = await supabase
          .from('sales')
          .insert({
            ...body.data,
            created_by: userId,
            status: 'pending_ops',
          })
          .select()
          .single()

        if (error) {
          console.error('[ae/import/submit] Sale insert error:', error)
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to save sale',
              details: error.message,
            },
            { status: 500 }
          )
        }

        result = sale
        redirectUrl = '/ae/tracker?tab=sales'
        break
      }

      case 'new_start': {
        if (!validateNewStart(body.data)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid new start data. Required fields: account_name, contract_type, start_date',
            },
            { status: 400 }
          )
        }

        const { data: newStart, error } = await supabase
          .from('new_starts')
          .insert({
            ...body.data,
            created_by: userId,
            status: 'pending_ops',
          })
          .select()
          .single()

        if (error) {
          console.error('[ae/import/submit] New start insert error:', error)
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to save new start',
              details: error.message,
            },
            { status: 500 }
          )
        }

        result = newStart
        redirectUrl = '/ae/tracker?tab=totals'
        break
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Invalid import type: ${body.type}. Must be one of: proposal, sale, new_start`,
          },
          { status: 400 }
        )
    }

    // Log to ops_events for tracking
    await supabase.from('ops_events').insert({
      source: 'ae_import',
      event_type: `${body.type}_submitted`,
      message: `${body.type} submitted for ${(body.data as any).account_name}`,
      metadata: {
        import_type: body.type,
        record_id: result.id,
        user_id: userId,
      },
    })

    return NextResponse.json({
      success: true,
      data: result,
      redirectUrl,
      message: `${body.type.charAt(0).toUpperCase() + body.type.slice(1)} submitted successfully`,
    })
  } catch (error) {
    console.error('[ae/import/submit] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
