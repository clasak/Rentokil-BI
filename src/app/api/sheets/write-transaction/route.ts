/**
 * Google Sheets Write API
 *
 * POST endpoint to write transactions to Google Sheets as backup/audit trail.
 * This is write-only - the dashboard displays BigQuery data only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeTransaction, initializeMonthlySheet, isSheetsConfigured } from '@/lib/google-sheets/sales-tracker'
import type { Transaction } from '@/types/sales-tracker'

export async function POST(request: NextRequest) {
  try {
    // Check if Google Sheets is configured
    if (!isSheetsConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Google Sheets not configured - transaction not backed up (BigQuery data still displayed)'
        },
        { status: 200 } // Don't fail the request, just warn
      )
    }

    const body = await request.json()
    const { transaction } = body as { transaction: Transaction }

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction data required' },
        { status: 400 }
      )
    }

    // Extract month/year from transaction date
    const date = new Date(transaction.date)
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    const type = transaction.type === 'proposal' ? 'proposals' : 'sales'

    // Ensure the monthly sheet exists with proper headers
    await initializeMonthlySheet(month, year, type as 'proposals' | 'sales')

    // Write transaction to Google Sheets (backup only)
    await writeTransaction(transaction)

    return NextResponse.json({
      success: true,
      message: 'Transaction backed up to Google Sheets',
      sheetName: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]} ${year} ${type === 'proposals' ? 'Proposals' : 'Sales'}`,
    })
  } catch (error) {
    console.error('[Sheets API] Write failed:', error)

    // Don't fail the request - Sheets is backup only
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to backup to Google Sheets (BigQuery data still displayed)',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 } // Return 200 so the UI doesn't show an error
    )
  }
}
