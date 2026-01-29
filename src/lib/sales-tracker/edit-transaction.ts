/**
 * Transaction Edit Handler
 *
 * Handles add/edit/delete operations for transactions.
 * Writes changes to Google Sheets as backup (BigQuery remains read-only).
 */

import { Transaction, TransactionFormData } from '@/types/sales-tracker'

// =============================================================================
// Edit Operations
// =============================================================================

/**
 * Add a new transaction
 *
 * Creates a manual transaction and writes to Google Sheets.
 * Returns the new transaction with generated ID.
 */
export async function handleTransactionAdd(
  formData: TransactionFormData,
  editor: string
): Promise<Transaction> {
  // Generate unique ID for manual transaction
  const id = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const transaction: Transaction = {
    id,
    date: formData.date,
    companyName: formData.companyName,
    leadType: formData.leadType,
    service: formData.service,
    jobType: formData.jobType,
    type: formData.type,
    sold: formData.sold,
    dead: formData.dead,
    jobWorkPrice: formData.jobWorkPrice,
    termitePrice: formData.termitePrice,
    contractPrice: formData.contractPrice,
    started: formData.started,
    paid: formData.paid,
    source: 'manual',
  }

  // Write to Google Sheets (backup only)
  await writeToSheets(transaction, 'add', editor)

  return transaction
}

/**
 * Edit an existing transaction
 *
 * Applies updates and writes to Google Sheets.
 * Returns the updated transaction.
 */
export async function handleTransactionEdit(
  transaction: Transaction,
  updates: Partial<TransactionFormData>,
  editor: string
): Promise<Transaction> {
  const updated: Transaction = {
    ...transaction,
    ...updates,
  }

  // Write to Google Sheets (backup only)
  await writeToSheets(updated, 'edit', editor)

  return updated
}

/**
 * Delete a transaction
 *
 * Marks transaction as deleted in Google Sheets.
 * Note: Only manual transactions can be deleted (BigQuery data is read-only).
 */
export async function handleTransactionDelete(
  transaction: Transaction,
  editor: string
): Promise<void> {
  if (transaction.source !== 'manual') {
    throw new Error('Cannot delete BigQuery transactions - mark as incorrect instead')
  }

  // Write delete action to Google Sheets
  await writeToSheets(transaction, 'delete', editor)
}

// =============================================================================
// Google Sheets Integration
// =============================================================================

/**
 * Write transaction action to Google Sheets
 */
async function writeToSheets(
  transaction: Transaction,
  action: 'add' | 'edit' | 'delete',
  editor: string
): Promise<void> {
  try {
    const response = await fetch('/api/sheets/write-transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction,
        action,
        editor,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      console.warn('[Transaction Edit] Google Sheets write failed:', result.error)
      // Don't throw - Sheets is backup only, shouldn't block UI
    }
  } catch (error) {
    console.error('[Transaction Edit] Failed to write to Sheets:', error)
    // Don't throw - Sheets is backup only
  }
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate transaction form data
 */
export function validateTransactionForm(data: Partial<TransactionFormData>): {
  valid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}

  // Date required and valid
  if (!data.date) {
    errors.date = 'Date is required'
  } else {
    const date = new Date(data.date)
    if (isNaN(date.getTime())) {
      errors.date = 'Invalid date format'
    }
  }

  // Company name required (min 2 chars)
  if (!data.companyName || data.companyName.trim().length < 2) {
    errors.companyName = 'Company name required (min 2 characters)'
  }

  // Lead type required
  if (!data.leadType) {
    errors.leadType = 'Lead type is required'
  }

  // Service required
  if (!data.service) {
    errors.service = 'Service type is required'
  }

  // Job type required
  if (!data.jobType) {
    errors.jobType = 'Job type is required'
  }

  // At least one price must be > 0
  const hasPrice = (data.jobWorkPrice || 0) > 0 ||
                  (data.termitePrice || 0) > 0 ||
                  (data.contractPrice || 0) > 0
  if (!hasPrice) {
    errors.price = 'At least one price must be greater than 0'
  }

  // Type required
  if (!data.type) {
    errors.type = 'Type is required'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
