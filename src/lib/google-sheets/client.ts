/**
 * Google Sheets API Client
 *
 * Provides authenticated access to Google Sheets API for write operations.
 * Used for backup/audit trail of sales tracker edits.
 */

import { google } from 'googleapis'

// =============================================================================
// Configuration
// =============================================================================

const SHEETS_CONFIG = {
  apiKey: process.env.GOOGLE_SHEETS_API_KEY,
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1kmmCdHM3rw1Ni3IKv7k3SfZmAVFT62jPQELyoIUQzuE',
  // Optional: Service account credentials (if using OAuth2)
  clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

// =============================================================================
// Client Initialization
// =============================================================================

/**
 * Get authenticated Sheets API client
 *
 * Authentication options (in priority order):
 * 1. Service Account (recommended for production)
 * 2. API Key (simpler, but limited to public spreadsheets)
 */
export function getSheetsClient() {
  const sheets = google.sheets('v4')

  // Option 1: Service Account (OAuth2)
  if (SHEETS_CONFIG.clientEmail && SHEETS_CONFIG.privateKey) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: SHEETS_CONFIG.clientEmail,
        private_key: SHEETS_CONFIG.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    return { sheets, auth }
  }

  // Option 2: API Key (fallback)
  if (SHEETS_CONFIG.apiKey) {
    return { sheets, auth: { key: SHEETS_CONFIG.apiKey } }
  }

  throw new Error(
    'Google Sheets authentication not configured. ' +
    'Set GOOGLE_SHEETS_API_KEY or service account credentials.'
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the spreadsheet ID from config
 */
export function getSpreadsheetId(): string {
  if (!SHEETS_CONFIG.spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured')
  }
  return SHEETS_CONFIG.spreadsheetId
}

/**
 * Convert month number to sheet name
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Sheet name (e.g., "Jan 2026")
 */
export function getMonthSheetName(year: number, month: number): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  return `${monthNames[month - 1]} ${year}`
}

/**
 * Format date for Google Sheets
 */
export function formatSheetDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * Format timestamp for Google Sheets
 */
export function formatSheetTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').split('.')[0] // YYYY-MM-DD HH:mm:ss
}

/**
 * Check if Google Sheets is configured
 */
export function isSheetsConfigured(): boolean {
  return !!(SHEETS_CONFIG.apiKey || (SHEETS_CONFIG.clientEmail && SHEETS_CONFIG.privateKey))
}

// =============================================================================
// Exports
// =============================================================================

export { SHEETS_CONFIG }
