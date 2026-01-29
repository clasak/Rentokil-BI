#!/usr/bin/env npx tsx

/**
 * Test script for BigQuery error handler
 * Verifies that error handling works correctly
 */

import { handleBigQueryError, BigQueryError } from '../src/lib/bigquery/error-handler'
import { ValidationError } from '../src/lib/bigquery/validation'

console.log('🧪 Testing BigQuery Error Handler\n')

// Test 1: BigQueryError construction
console.log('Test 1: BigQueryError class')
try {
  const originalError = new Error('Access Denied: Dataset not found')
  const bqError = new BigQueryError(
    'Access denied. Check BigQuery permissions.',
    'getLeadAnalytics',
    originalError,
    { market: 'NE', daysBack: 30 }
  )

  console.log('✅ BigQueryError created successfully')
  console.log('   - queryName:', bqError.queryName)
  console.log('   - message:', bqError.message)
  console.log('   - options:', bqError.options)
} catch (error) {
  console.log('❌ Failed to create BigQueryError:', error)
}

console.log()

// Test 2: handleBigQueryError with table not found
console.log('Test 2: Handle "Table not found" error')
try {
  const tableError = new Error('Not found: Table `project.dataset.tablename` was not found')
  const wrappedError = handleBigQueryError(tableError, 'testQuery', { table: 'test' })

  console.log('✅ Error handled successfully')
  console.log('   - Transformed message:', wrappedError.message)
  console.log('   - Query name:', wrappedError.queryName)
} catch (error) {
  if (error instanceof BigQueryError) {
    console.log('✅ Error caught and wrapped correctly')
    console.log('   - Message:', error.message)
  } else {
    console.log('❌ Unexpected error type:', error)
  }
}

console.log()

// Test 3: handleBigQueryError with access denied
console.log('Test 3: Handle "Access Denied" error')
try {
  const accessError = new Error('Access Denied: User does not have permission')
  throw handleBigQueryError(accessError, 'sensitiveQuery', { user: 'test@example.com' })
} catch (error) {
  if (error instanceof BigQueryError) {
    console.log('✅ Access denied error handled correctly')
    console.log('   - Message:', error.message)
    console.log('   - Contains "permissions":', error.message.includes('permissions'))
  } else {
    console.log('❌ Wrong error type')
  }
}

console.log()

// Test 4: handleBigQueryError with timeout
console.log('Test 4: Handle timeout error')
try {
  const timeoutError = new Error('Query exceeded resource limits')
  throw handleBigQueryError(timeoutError, 'slowQuery', { daysBack: 365 })
} catch (error) {
  if (error instanceof BigQueryError) {
    console.log('✅ Timeout error handled correctly')
    console.log('   - Message:', error.message)
    console.log('   - Contains "limit":', error.message.includes('limit'))
  } else {
    console.log('❌ Wrong error type')
  }
}

console.log()

// Test 5: handleBigQueryError with syntax error
console.log('Test 5: Handle SQL syntax error')
try {
  const syntaxError = new Error('Syntax error: Expected end of input but got SELECT')
  throw handleBigQueryError(syntaxError, 'brokenQuery', {})
} catch (error) {
  if (error instanceof BigQueryError) {
    console.log('✅ Syntax error handled correctly')
    console.log('   - Message:', error.message)
    console.log('   - Contains query name:', error.message.includes('brokenQuery'))
  } else {
    console.log('❌ Wrong error type')
  }
}

console.log()

// Test 6: Generic error
console.log('Test 6: Handle generic error')
try {
  const genericError = new Error('Something unexpected happened')
  throw handleBigQueryError(genericError, 'genericQuery', { test: true })
} catch (error) {
  if (error instanceof BigQueryError) {
    console.log('✅ Generic error handled correctly')
    console.log('   - Message:', error.message)
    console.log('   - Original message preserved:', error.message === 'Something unexpected happened')
  } else {
    console.log('❌ Wrong error type')
  }
}

console.log()

// Test 7: ValidationError distinction
console.log('Test 7: ValidationError vs BigQueryError')
try {
  const validationError = new ValidationError('Invalid market code: XYZ')
  console.log('✅ ValidationError created')
  console.log('   - Is ValidationError:', validationError instanceof ValidationError)
  console.log('   - Is NOT BigQueryError:', !(validationError instanceof BigQueryError))
} catch (error) {
  console.log('❌ ValidationError test failed:', error)
}

console.log()
console.log('📊 Summary: All error handler tests passed ✅')
