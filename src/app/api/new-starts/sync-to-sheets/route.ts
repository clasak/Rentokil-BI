/**
 * Google Sheets Sync API for New Start Log
 *
 * Exports new start data from BigQuery to Google Sheets
 *
 * POST /api/new-starts/sync-to-sheets
 * Body: { mode: 'append' | 'overwrite', filters?: QueryOptions }
 *
 * Modes:
 * - append: Add new rows to end of sheet
 * - overwrite: Clear existing data and write fresh data
 *
 * Setup Required:
 * 1. Google Cloud project with Sheets API enabled
 * 2. Service account with credentials
 * 3. Share Google Sheet with service account email
 * 4. Environment variables configured (see GOOGLE-SHEETS-INTEGRATION-GUIDE.md)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getNewStarts } from '@/lib/bigquery/queries/new-starts'

// Configuration from environment
const SHEET_ID = process.env.GOOGLE_SHEETS_NEW_START_LOG_ID
const PRIVATE_KEY = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')
const CLIENT_EMAIL = process.env.GOOGLE_SHEETS_CLIENT_EMAIL

/**
 * POST handler - Sync new starts to Google Sheets
 */
export async function POST(request: NextRequest) {
  try {
    // Validate configuration
    if (!SHEET_ID || !PRIVATE_KEY || !CLIENT_EMAIL) {
      return NextResponse.json(
        {
          error: 'Google Sheets integration not configured',
          details: 'Missing environment variables. See GOOGLE-SHEETS-INTEGRATION-GUIDE.md for setup instructions.',
          missing: {
            sheetId: !SHEET_ID,
            privateKey: !PRIVATE_KEY,
            clientEmail: !CLIENT_EMAIL,
          }
        },
        { status: 500 }
      )
    }

    // Parse request body
    const { mode = 'smart-sync', filters = {} } = await request.json()

    // Validate mode
    if (mode !== 'append' && mode !== 'smart-sync') {
      return NextResponse.json(
        { error: 'Invalid mode. Use "append" or "smart-sync"' },
        { status: 400 }
      )
    }

    // Lazy load googleapis (only when needed)
    const { google } = await import('googleapis')

    // Authenticate with Google Sheets API
    const auth = new google.auth.JWT({
      email: CLIENT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    // Fetch data from BigQuery
    console.log('[Sheets Sync] Fetching data from BigQuery...', filters)
    const newStarts = await getNewStarts(filters)

    if (newStarts.length === 0) {
      return NextResponse.json({
        message: 'No data to sync',
        rowsSynced: 0,
        mode
      })
    }

    console.log(`[Sheets Sync] Preparing ${newStarts.length} rows for export...`)

    // Transform data to sheet rows
    // NOTE: We generate Sales ID as first column for lookup/matching
    // Format: Sales ID, Sold Date, Account Name, Service Address, Sales Rep(s), Initial Price, Maintenance Price, Type, Frequency, Log Book, TAP Lead, PestPac Entry, Customer Start, POC, Special Notes, Ops Manager, Specialist, Materials, Confirmed Start, Install Started, Status
    const rows = newStarts.map(entry => [
      entry.id,                                    // 0: Sales ID (for matching - will be column A)
      entry.soldDate,                              // 1: Sold Date (AE)
      entry.accountName,                           // 2: Account Name (AE)
      entry.serviceAddress,                        // 3: Service Address (AE)
      entry.salesPerson,                           // 4: Sales Rep(s) Involved (AE)
      entry.initialJobPrice,                       // 5: Initial/Job 1X Price (AE)
      entry.contractValue,                         // 6: Maintenance (Contract) Price (AE)
      entry.serviceTypeName,                       // 7: Type (Contract or Job 1x) (AE)
      '',                                          // 8: Frequency (# of annual visits) (AE) - not in BigQuery
      '',                                          // 9: Log Book Needed (AE) - not in BigQuery
      '',                                          // 10: TAP Lead / Specialist Name (AE) - not in BigQuery
      entry.pestPacId || '',                       // 11: PestPac Entry (AE) - from BigQuery
      '',                                          // 12: Customer Requested Start Month (AE) - not in BigQuery
      '',                                          // 13: POC Name/Phone# (AE initially, Ops updates)
      '',                                          // 14: Special Notes / Equipment Overview (AE initially, Ops adds equipment)
      entry.opsManager || '',                      // 15: Operations Manager (from BigQuery DR_WorkOrders)
      entry.assignedSpecialist || '',              // 16: Assigned Specialist (from BigQuery DR_WorkOrders)
      '',                                          // 17: Materials Ordered (manual entry only)
      entry.confirmedStartDate || '',              // 18: Confirmed Start Date (from BigQuery)
      entry.installStarted || '',                  // 19: Installation Started (from BigQuery DR_WorkOrders)
      entry.status,                                // 20: Status (System/Ops)
    ])

    if (mode === 'append') {
      // Append new rows to the first blank row (never overwrites existing data)
      console.log('[Sheets Sync] Appending rows to first blank row...')

      const appendResult = await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A:U',  // A-U = 21 columns (includes Sales ID in column A)
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',  // Always insert at first blank row
        requestBody: {
          values: rows,
        },
      })

      console.log(`[Sheets Sync] ✅ Appended ${rows.length} rows successfully`)

      return NextResponse.json({
        message: 'Data synced successfully - appended to first blank row',
        mode: 'append',
        rowsSynced: rows.length,
        updatedRange: appendResult.data.updates?.updatedRange,
        updatedRows: appendResult.data.updates?.updatedRows,
      })
    } else if (mode === 'smart-sync') {
      // Smart sync: Update BigQuery columns for existing sales, append new ones
      console.log('[Sheets Sync] Fetching existing sheet data...')

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A:U',  // A-U = 21 columns
      })

      const existingData = response.data.values || []
      const headerRow = existingData[0] || []
      const dataRows = existingData.slice(1)

      console.log(`[Sheets Sync] Found ${dataRows.length} existing rows`)

      // Build a map of existing sales by Sales ID (column A)
      const existingMap = new Map<string, { row: any[], rowIndex: number }>()
      dataRows.forEach((row, index) => {
        const salesId = row[0]  // Column A = Sales ID
        if (salesId) {
          existingMap.set(salesId, { row, rowIndex: index + 2 })  // +2 because: 0-indexed + header row
        }
      })

      const updates: any[] = []
      const newRows: any[] = []

      // Process each BigQuery row
      rows.forEach(bqRow => {
        const salesId = String(bqRow[0])
        const existing = existingMap.get(salesId)

        if (existing) {
          // Row exists - update only BigQuery columns, preserve manual entries
          const updatedRow = [...existing.row]

          // Update BigQuery columns only (0-11, 15-16, 18-20)
          // Preserve manual entries: columns 12-14 (AE manual), 17 (Materials - manual)
          updatedRow[0] = bqRow[0]   // Sales ID
          updatedRow[1] = bqRow[1]   // Sold Date
          updatedRow[2] = bqRow[2]   // Account Name
          updatedRow[3] = bqRow[3]   // Service Address
          updatedRow[4] = bqRow[4]   // Sales Rep
          updatedRow[5] = bqRow[5]   // Initial Price
          updatedRow[6] = bqRow[6]   // Contract Price
          updatedRow[7] = bqRow[7]   // Type
          updatedRow[8] = bqRow[8]   // Frequency
          updatedRow[9] = bqRow[9]   // Log Book
          updatedRow[10] = bqRow[10] // TAP Lead
          updatedRow[11] = bqRow[11] // PestPac Entry
          // Skip 12-14 (Customer Start, POC, Special Notes - preserve manual entries)
          updatedRow[15] = bqRow[15] // Ops Manager (from BigQuery)
          updatedRow[16] = bqRow[16] // Specialist (from BigQuery)
          // Skip 17 (Materials - manual entry only)
          updatedRow[18] = bqRow[18] // Confirmed Start (from BigQuery)
          updatedRow[19] = bqRow[19] // Install Started (from BigQuery)
          updatedRow[20] = bqRow[20] // Status (from BigQuery)

          updates.push({
            range: `Sheet1!A${existing.rowIndex}:U${existing.rowIndex}`,
            values: [updatedRow]
          })
        } else {
          // New row - append
          newRows.push(bqRow)
        }
      })

      console.log(`[Sheets Sync] Updating ${updates.length} existing rows, appending ${newRows.length} new rows`)

      // Batch update existing rows
      if (updates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: {
            valueInputOption: 'RAW',
            data: updates
          }
        })
      }

      // Append new rows
      let appendResult
      if (newRows.length > 0) {
        appendResult = await sheets.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: 'Sheet1!A:U',
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: newRows,
          },
        })
      }

      console.log(`[Sheets Sync] ✅ Smart sync completed: ${updates.length} updated, ${newRows.length} appended`)

      return NextResponse.json({
        message: 'Smart sync completed - updated existing, appended new',
        mode: 'smart-sync',
        rowsUpdated: updates.length,
        rowsAppended: newRows.length,
        totalProcessed: rows.length,
        updatedRange: appendResult?.data?.updates?.updatedRange,
      })
    }

    // Should never reach here due to validation above
    return NextResponse.json(
      { error: 'Invalid mode' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Sheets Sync] ❌ Error:', error)

    // Enhanced error handling
    if (error instanceof Error) {
      // Check for specific Google API errors
      if (error.message.includes('Permission denied')) {
        return NextResponse.json(
          {
            error: 'Permission denied',
            details: 'Service account does not have access to the Google Sheet. Make sure you shared the sheet with the service account email.',
            serviceAccountEmail: CLIENT_EMAIL,
          },
          { status: 403 }
        )
      }

      if (error.message.includes('Invalid grant')) {
        return NextResponse.json(
          {
            error: 'Invalid credentials',
            details: 'Service account credentials are invalid or expired. Check GOOGLE_SHEETS_PRIVATE_KEY format.',
          },
          { status: 401 }
        )
      }

      if (error.message.includes('Unable to parse range')) {
        return NextResponse.json(
          {
            error: 'Invalid sheet range',
            details: 'The sheet name or range is invalid. Make sure your sheet is named "Sheet1" or update the range in the API code.',
          },
          { status: 400 }
        )
      }

      return NextResponse.json(
        {
          error: 'Failed to sync to Google Sheets',
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to sync to Google Sheets',
        details: 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler - Check configuration status
 */
export async function GET() {
  return NextResponse.json({
    configured: !!(SHEET_ID && PRIVATE_KEY && CLIENT_EMAIL),
    sheetId: SHEET_ID ? '✅ Configured' : '❌ Missing GOOGLE_SHEETS_NEW_START_LOG_ID',
    privateKey: PRIVATE_KEY ? '✅ Configured' : '❌ Missing GOOGLE_SHEETS_PRIVATE_KEY',
    clientEmail: CLIENT_EMAIL || '❌ Missing GOOGLE_SHEETS_CLIENT_EMAIL',
    instructions: 'See /docs/GOOGLE-SHEETS-INTEGRATION-GUIDE.md for setup',
  })
}
