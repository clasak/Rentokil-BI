#!/usr/bin/env tsx
/**
 * Add SQL injection protection to all AE query functions
 * This script adds validation blocks to each function that accepts user input
 */

import fs from 'fs'
import path from 'path'

const AE_FILE = path.join(__dirname, '../src/lib/bigquery/queries/ae.ts')

// Read the file
let content = fs.readFileSync(AE_FILE, 'utf-8')

// List of functions that need validation (function name -> validation code)
const validationBlocks: Record<string, string> = {
  getAETracker: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
    validateString(options.aeId, 'aeId', 50)
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.limit, 'limit', 1, 1000)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getAETracker validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getTechTickets: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
    validateString(options.technicianId, 'technicianId', 50)
    validateOrgCode(options.branch, 'branch')
    validateNumeric(options.limit, 'limit', 1, 1000)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getTechTickets validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getTechDispatch: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
    validateString(options.technicianId, 'technicianId', 50)
    validateOrgCode(options.branch, 'branch')
    validateNumeric(options.limit, 'limit', 1, 1000)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getTechDispatch validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getAECategoryBreakdown: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.year, 'year', 2020, 2100)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getAECategoryBreakdown validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getAEMonthlyProgression: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.year, 'year', 2020, 2100)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getAEMonthlyProgression validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getAECompensationSummary: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.year, 'year', 2020, 2100)
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getAECompensationSummary validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getAESalesDetails: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
    validateNumeric(options.limit, 'limit', 1, 1000)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getAESalesDetails validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getAESalesPersonList: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.search, 'search', 100)
    validateNumeric(options.limit, 'limit', 1, 1000)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getAESalesPersonList validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getAEMonthlyCompensation: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.year, 'year', 2020, 2100)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getAEMonthlyCompensation validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getNewStartLogEntries: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
    validateNumeric(options.limit, 'limit', 1, 1000)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getNewStartLogEntries validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getNewStartLogSummary: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getNewStartLogSummary validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getSalesforceOpportunities: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
    validateNumeric(options.limit, 'limit', 1, 1000)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getSalesforceOpportunities validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getSalesforceQuotes: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
    validateNumeric(options.limit, 'limit', 1, 1000)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getSalesforceQuotes validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getAEIntegratedDashboard: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getAEIntegratedDashboard validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getMonthlyTotalsDetail: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateOrgCode(options.branch, 'branch')
    validateOrgCode(options.region, 'region')
    validateOrgCode(options.market, 'market')
    validateNumeric(options.year, 'year', 2020, 2100)
    validateNumeric(options.month, 'month', 1, 12)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getMonthlyTotalsDetail validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getIRISNationalAccounts: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
    validateNumeric(options.limit, 'limit', 1, 1000)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getIRISNationalAccounts validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
  getIRISNationalAccountSummary: `
  // INPUT VALIDATION - Prevent SQL injection
  try {
    validateString(options.salesPerson, 'salesPerson', 100)
    validateNumeric(options.daysBack, 'daysBack', 1, 365)
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('[AE] getIRISNationalAccountSummary validation failed:', error.message)
      throw error
    }
    throw error
  }
`,
}

// Add validation to each function
for (const [funcName, validationCode] of Object.entries(validationBlocks)) {
  // Find the function and add validation after the options destructuring
  const funcPattern = new RegExp(
    `(export async function ${funcName}\\([^)]+\\)[^{]+\\{[^{]*?)(const \\{)`,
    's'
  )

  if (funcPattern.test(content)) {
    content = content.replace(funcPattern, `$1${validationCode}\n\n  $2`)
    console.log(`✅ Added validation to ${funcName}`)
  } else {
    console.log(`⚠️  Could not find insertion point for ${funcName}`)
  }
}

// Write the updated file
fs.writeFileSync(AE_FILE, content)
console.log('\n✅ AE query file updated with SQL injection protection')
