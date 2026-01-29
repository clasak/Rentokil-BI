/**
 * Sales Tracker Google Sheets Operations
 *
 * Read/write operations for sales tracker monthly tabs.
 * Structure: Separate tabs per month for proposals and sales
 * Example tabs: "Jan 2026 Proposals", "Jan 2026 Sales"
 */

import {
  getSheetsClient,
  getSpreadsheetId,
  formatSheetTimestamp,
  isSheetsConfigured,
} from './client'
import type { Transaction, LeadType, ServiceType, JobType } from '@/types/sales-tracker'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get sheet name for a specific month/year and type
 * Format: "Jan 2026 Proposals" or "Jan 2026 Sales"
 */
function getMonthSheetName(month: number, year: number, type: 'proposals' | 'sales'): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = monthNames[month - 1]
  const typeName = type === 'proposals' ? 'Proposals' : 'Sales'
  return `${monthName} ${year} ${typeName}`
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Read transactions from monthly sheet
 * Returns all transactions for the specified month/year and type
 */
export async function readMonthlyTransactions(
  month: number,
  year: number,
  type: 'proposals' | 'sales'
): Promise<Transaction[]> {
  if (!isSheetsConfigured()) {
    return []
  }

  try {
    const { sheets, auth } = getSheetsClient()
    const spreadsheetId = getSpreadsheetId()
    const sheetName = getMonthSheetName(month, year, type)

    const response = await sheets.spreadsheets.values.get({
      auth: auth as any,
      spreadsheetId,
      range: `${sheetName}!A2:K`,  // Skip header row
    })

    const rows = response.data.values || []

    // Parse rows into Transaction objects
    return rows.map((row, index) => {
      const [
        date,
        companyName,
        leadType,
        service,
        jobType,
        sold_dead_or_jobwork,
        termitePrice_or_started,
        contractPrice_or_paid,
        pestPacId_extra1,
        extra2,
        extra3
      ] = row

      if (type === 'proposals') {
        // Proposal format: Date, Company, Lead Type, Service, Job Type, Sold, Dead, Job Work, Termite, Contract
        return {
          id: `sheets-${year}-${month}-${type}-${index}`,
          date: date || '',
          companyName: companyName || '',
          leadType: (leadType || 'Inbound') as LeadType,
          service: (service || 'Pest Control') as ServiceType,
          jobType: (jobType || 'One-Time') as JobType,
          type: 'proposal' as const,
          sold: sold_dead_or_jobwork === 'TRUE' || sold_dead_or_jobwork === 'Yes',
          dead: termitePrice_or_started === 'TRUE' || termitePrice_or_started === 'Yes',
          jobWorkPrice: parseFloat(contractPrice_or_paid) || 0,
          termitePrice: parseFloat(pestPacId_extra1) || 0,
          contractPrice: parseFloat(extra2) || 0,
          source: 'manual' as const,
        }
      } else {
        // Sales format: Date, Company, Lead Type, Service, Job Type, Job Work, Termite, Contract, Started, Paid, PestPac ID
        return {
          id: `sheets-${year}-${month}-${type}-${index}`,
          date: date || '',
          companyName: companyName || '',
          leadType: (leadType || 'Inbound') as LeadType,
          service: (service || 'Pest Control') as ServiceType,
          jobType: (jobType || 'One-Time') as JobType,
          type: 'sale' as const,
          jobWorkPrice: parseFloat(sold_dead_or_jobwork) || 0,
          termitePrice: parseFloat(termitePrice_or_started) || 0,
          contractPrice: parseFloat(contractPrice_or_paid) || 0,
          started: pestPacId_extra1 === 'TRUE' || pestPacId_extra1 === 'Yes',
          paid: extra2 === 'TRUE' || extra2 === 'Yes',
          pestPacId: extra3 || null,
          source: 'manual' as const,
        }
      }
    })
  } catch (error) {
    console.error('[Google Sheets] Failed to read monthly transactions:', error)
    return []
  }
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Write transaction to monthly sheet
 * Appends a new transaction to the appropriate monthly tab
 */
export async function writeTransaction(
  transaction: Transaction
): Promise<void> {
  if (!isSheetsConfigured()) {
    console.warn('[Google Sheets] Not configured - skipping write')
    return
  }

  try {
    const { sheets, auth } = getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    // Extract month/year from transaction date
    const date = new Date(transaction.date)
    const month = date.getMonth() + 1
    const year = date.getFullYear()

    const sheetName = getMonthSheetName(month, year, transaction.type === 'proposal' ? 'proposals' : 'sales')

    // Prepare row data based on type
    let row: (string | number | boolean)[]

    if (transaction.type === 'proposal') {
      // Proposal format: Date, Company, Lead Type, Service, Job Type, Sold, Dead, Job Work, Termite, Contract
      row = [
        transaction.date,
        transaction.companyName,
        transaction.leadType,
        transaction.service,
        transaction.jobType,
        transaction.sold ? 'Yes' : '',
        transaction.dead ? 'Yes' : '',
        transaction.jobWorkPrice,
        transaction.termitePrice,
        transaction.contractPrice,
      ]
    } else {
      // Sales format: Date, Company, Lead Type, Service, Job Type, Job Work, Termite, Contract, Started, Paid, PestPac ID
      row = [
        transaction.date,
        transaction.companyName,
        transaction.leadType,
        transaction.service,
        transaction.jobType,
        transaction.jobWorkPrice,
        transaction.termitePrice,
        transaction.contractPrice,
        transaction.started ? 'Yes' : '',
        transaction.paid ? 'Yes' : '',
        transaction.pestPacId || '',
      ]
    }

    // Append to monthly sheet
    await sheets.spreadsheets.values.append({
      auth: auth as any,
      spreadsheetId,
      range: `${sheetName}!A:K`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    })

    console.log('[Google Sheets] Transaction written:', transaction.type, transaction.companyName)
  } catch (error) {
    console.error('[Google Sheets] Failed to write transaction:', error)
    // Don't throw - Sheets is backup, shouldn't block UI
  }
}

/**
 * Initialize monthly sheet with headers if it doesn't exist
 * Creates sheet for specific month/year and type (proposals or sales)
 */
export async function initializeMonthlySheet(
  month: number,
  year: number,
  type: 'proposals' | 'sales'
): Promise<void> {
  if (!isSheetsConfigured()) {
    console.warn('[Google Sheets] Not configured - skipping init')
    return
  }

  try {
    const { sheets, auth } = getSheetsClient()
    const spreadsheetId = getSpreadsheetId()
    const sheetName = getMonthSheetName(month, year, type)

    // Check if sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      auth: auth as any,
      spreadsheetId,
    })

    const sheetExists = spreadsheet.data.sheets?.some(
      sheet => sheet.properties?.title === sheetName
    )

    if (!sheetExists) {
      // Create sheet
      await sheets.spreadsheets.batchUpdate({
        auth: auth as any,
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 500,
                    columnCount: 11,
                    frozenRowCount: 1,
                  },
                },
              },
            },
          ],
        },
      })

      // Add headers based on type
      const proposalHeaders = [
        'Date',
        'Company Name',
        'Lead Type',
        'Service',
        'Job Type',
        'Sold',
        'Dead',
        'Job Work Price',
        'Termite Price',
        'Contract Price',
      ]

      const salesHeaders = [
        'Date',
        'Company Name',
        'Lead Type',
        'Service',
        'Job Type',
        'Job Work Price',
        'Termite Price',
        'Contract Price',
        'Started',
        'Paid',
        'PestPac ID',
      ]

      const headers = type === 'proposals' ? proposalHeaders : salesHeaders

      await sheets.spreadsheets.values.update({
        auth: auth as any,
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      })

      console.log('[Google Sheets] Monthly sheet initialized:', sheetName)
    }
  } catch (error) {
    console.error('[Google Sheets] Failed to initialize monthly sheet:', error)
  }
}

// =============================================================================
// Exports
// =============================================================================

export { isSheetsConfigured }
