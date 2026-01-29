/**
 * Manual Test: Error Sanitization (VULN-003 Fix Verification)
 *
 * Tests that sensitive information is properly redacted from error messages
 * in production mode while preserving details in development.
 */

import { sanitizeErrorMessage, sanitizeLogData, sanitizeStackTrace, getErrorCode } from '../src/lib/bigquery/error-sanitizer'

console.log('='.repeat(80))
console.log('ERROR SANITIZATION TEST SUITE (VULN-003 FIX)')
console.log('='.repeat(80))
console.log()

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`)
    passedTests++
  } else {
    console.log(`❌ FAIL: ${testName}`)
    if (details) console.log(`   Details: ${details}`)
    failedTests++
  }
}

// Test 1: Project ID Redaction
console.log('Test 1: Project ID Redaction')
console.log('-'.repeat(40))
const error1 = new Error('Not found: Table `bidata-sharedus-production.S4.Fact_Leads`')
const sanitized1 = sanitizeErrorMessage(error1, 'production')
assert(
  !sanitized1.includes('bidata-sharedus-production'),
  'Project ID is redacted in production',
  `Sanitized message: "${sanitized1}"`
)
assert(
  !sanitized1.includes('S4'),
  'Dataset name is redacted in production',
  `Sanitized message: "${sanitized1}"`
)
assert(
  !sanitized1.includes('Fact_Leads'),
  'Table name is redacted in production',
  `Sanitized message: "${sanitized1}"`
)
assert(
  sanitized1.includes('could not be found') || sanitized1.includes('contact support'),
  'Shows user-friendly message',
  `Sanitized message: "${sanitized1}"`
)
console.log()

// Test 2: Development vs Production Behavior
console.log('Test 2: Development vs Production Behavior')
console.log('-'.repeat(40))
const error2 = new Error('Query error in BCG_RTD_DB.DR_ContractSales')
const devMessage = sanitizeErrorMessage(error2, 'development')
const prodMessage = sanitizeErrorMessage(error2, 'production')
assert(
  devMessage.includes('BCG_RTD_DB'),
  'Development mode shows full details',
  `Dev message: "${devMessage}"`
)
assert(
  !prodMessage.includes('BCG_RTD_DB'),
  'Production mode redacts table names',
  `Prod message: "${prodMessage}"`
)
console.log()

// Test 3: PII Redaction in Log Data
console.log('Test 3: PII Redaction in Log Data')
console.log('-'.repeat(40))
const logData = {
  market: 'NE',
  region: 'NYC',
  salesPerson: 'John Doe',
  email: 'john@example.com',
  customerName: 'ABC Company',
  daysBack: 30
}
const sanitizedLog = sanitizeLogData(logData) as Record<string, unknown>
assert(
  sanitizedLog.market === 'NE',
  'Non-sensitive data preserved (market)',
  `market: ${sanitizedLog.market}`
)
assert(
  sanitizedLog.salesPerson === '[REDACTED]',
  'Sales person name redacted',
  `salesPerson: ${sanitizedLog.salesPerson}`
)
assert(
  sanitizedLog.email === '[REDACTED]',
  'Email redacted',
  `email: ${sanitizedLog.email}`
)
assert(
  sanitizedLog.customerName === '[REDACTED]',
  'Customer name redacted',
  `customerName: ${sanitizedLog.customerName}`
)
assert(
  sanitizedLog.daysBack === 30,
  'Non-sensitive numeric data preserved',
  `daysBack: ${sanitizedLog.daysBack}`
)
console.log()

// Test 4: Stack Trace Handling
console.log('Test 4: Stack Trace Handling')
console.log('-'.repeat(40))
const sampleStack = `Error: Query failed
    at Object.query (/Users/admin/app/lib/bigquery.ts:123:45)
    at async getLeads (/Users/admin/app/queries/leads.ts:67:12)`
const devStack = sanitizeStackTrace(sampleStack, 'development')
const prodStack = sanitizeStackTrace(sampleStack, 'production')
assert(
  devStack === sampleStack,
  'Development mode preserves stack trace',
  `Stack length: ${devStack?.length || 0}`
)
assert(
  prodStack === undefined,
  'Production mode removes stack trace',
  `Stack: ${prodStack}`
)
console.log()

// Test 5: Error Code Mapping
console.log('Test 5: Error Code Mapping')
console.log('-'.repeat(40))
const quotaError = new Error('Exceeded quota for query')
const accessError = new Error('Access Denied: Permission denied')
const timeoutError = new Error('Query exceeded timeout limit')
const notFoundError = new Error('Table not found in dataset')

assert(getErrorCode(quotaError) === 'QUOTA_EXCEEDED', 'Quota error mapped correctly')
assert(getErrorCode(accessError) === 'ACCESS_DENIED', 'Access error mapped correctly')
assert(getErrorCode(timeoutError) === 'TIMEOUT', 'Timeout error mapped correctly')
assert(getErrorCode(notFoundError) === 'DATA_NOT_FOUND', 'Not found error mapped correctly')
console.log()

// Test 6: Nested Object Sanitization
console.log('Test 6: Nested Object Sanitization')
console.log('-'.repeat(40))
const nestedData = {
  filters: {
    market: 'PA',
    user: {
      email: 'test@example.com',
      employeeName: 'Jane Smith'
    }
  },
  metadata: {
    timestamp: '2026-01-25T10:00:00Z'
  }
}
const sanitizedNested = sanitizeLogData(nestedData) as any
assert(
  sanitizedNested.filters.market === 'PA',
  'Nested non-sensitive data preserved'
)
assert(
  sanitizedNested.filters.user.email === '[REDACTED]',
  'Nested email redacted'
)
assert(
  sanitizedNested.filters.user.employeeName === '[REDACTED]',
  'Nested employee name redacted'
)
assert(
  sanitizedNested.metadata.timestamp === '2026-01-25T10:00:00Z',
  'Nested timestamp preserved'
)
console.log()

// Test 7: Sensitive Pattern Detection
console.log('Test 7: Sensitive Pattern Detection')
console.log('-'.repeat(40))
const pathError1 = new Error('Failed to load /Users/john/project/config.json')
const pathError2 = new Error('Failed to load C:\\Users\\admin\\app\\config.json')
const sanitizedPath1 = sanitizeErrorMessage(pathError1, 'production')
const sanitizedPath2 = sanitizeErrorMessage(pathError2, 'production')
assert(
  !sanitizedPath1.includes('/Users/john'),
  'Unix file path redacted'
)
assert(
  !sanitizedPath2.includes('C:\\Users\\admin'),
  'Windows file path redacted'
)
console.log()

// Test 8: Permission Error Sanitization
console.log('Test 8: Permission Error Sanitization')
console.log('-'.repeat(40))
const permError = new Error('Permission bigquery.tables.get denied on table bidata-sharedus-production.S4.Fact_Leads')
const sanitizedPerm = sanitizeErrorMessage(permError, 'production')
assert(
  !sanitizedPerm.includes('bidata-sharedus-production'),
  'Project ID redacted from permission error'
)
assert(
  !sanitizedPerm.includes('bigquery.tables.get'),
  'Permission details redacted'
)
assert(
  sanitizedPerm.includes('Access denied') || sanitizedPerm.includes('not have permission'),
  'User-friendly permission message shown'
)
console.log()

// Summary
console.log('='.repeat(80))
console.log('TEST SUMMARY')
console.log('='.repeat(80))
console.log(`Total Tests: ${passedTests + failedTests}`)
console.log(`Passed: ${passedTests}`)
console.log(`Failed: ${failedTests}`)
console.log()

if (failedTests === 0) {
  console.log('✅ ALL TESTS PASSED - Error sanitization is working correctly!')
  console.log()
  console.log('SECURITY VERIFICATION:')
  console.log('- Project IDs are redacted in production')
  console.log('- Dataset and table names are redacted')
  console.log('- PII (names, emails) is redacted from logs')
  console.log('- Stack traces are removed in production')
  console.log('- File paths are redacted')
  console.log('- User-friendly error messages are shown')
  process.exit(0)
} else {
  console.log(`❌ ${failedTests} TEST(S) FAILED - Review error sanitization implementation`)
  process.exit(1)
}
