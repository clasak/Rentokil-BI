/**
 * Test ReDoS vulnerability fix
 * Ensures email validation completes quickly even with malicious inputs
 */

import { validateEmail, ValidationError } from '../src/lib/bigquery/validation'

console.log('Testing ReDoS fix...\n')

// Test 1: Valid emails (should be fast)
console.log('Test 1: Valid emails')
const validEmails = [
  'user@example.com',
  'john.doe@company.co.uk',
  'test+tag@domain.com',
  'a'.repeat(64) + '@example.com', // Max length local part
]

validEmails.forEach((email) => {
  const start = performance.now()
  try {
    const result = validateEmail(email)
    const duration = performance.now() - start
    console.log(`✓ ${email.substring(0, 30)}... - ${duration.toFixed(2)}ms`)
    if (duration > 10) {
      console.warn(`  WARNING: Took longer than expected (${duration.toFixed(2)}ms)`)
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(`✗ ${email} - FAILED: ${error.message}`)
    }
  }
})

// Test 2: Malicious inputs (should be fast and reject)
console.log('\nTest 2: Malicious inputs (ReDoS attempts)')
const maliciousInputs = [
  'a'.repeat(1000) + '@example.com', // Very long local part
  'user@' + 'a'.repeat(1000) + '.com', // Very long domain
  'a'.repeat(100) + '@' + 'a'.repeat(100) + '.com', // Long both parts
]

maliciousInputs.forEach((email) => {
  const start = performance.now()
  try {
    validateEmail(email)
    const duration = performance.now() - start
    console.log(
      `✗ ${email.substring(0, 30)}... - Should have been rejected (${duration.toFixed(2)}ms)`
    )
  } catch (error) {
    const duration = performance.now() - start
    if (error instanceof ValidationError) {
      console.log(`✓ ${email.substring(0, 30)}... - Rejected in ${duration.toFixed(2)}ms`)
      if (duration > 10) {
        console.error(
          `  ERROR: Took too long (${duration.toFixed(2)}ms) - Still vulnerable to ReDoS!`
        )
      }
    } else if (error instanceof Error) {
      console.log(`✗ ${email.substring(0, 30)}... - Unexpected error: ${error.message}`)
    }
  }
})

// Test 3: Invalid formats (should reject)
console.log('\nTest 3: Invalid formats')
const invalidEmails = [
  'invalid-email',
  '@example.com',
  'user@',
  'user..name@example.com', // Consecutive dots
  '.user@example.com', // Leading dot
  'user.@example.com', // Trailing dot
  'user@-example.com', // Leading hyphen in domain
  'user@example-.com', // Trailing hyphen in domain
]

invalidEmails.forEach((email) => {
  const start = performance.now()
  try {
    validateEmail(email)
    const duration = performance.now() - start
    console.log(`✗ ${email} - Should have been rejected`)
  } catch (error) {
    const duration = performance.now() - start
    if (error instanceof ValidationError) {
      console.log(`✓ ${email} - Correctly rejected in ${duration.toFixed(2)}ms`)
    }
  }
})

// Test 4: Edge cases (RFC 5321 limits)
console.log('\nTest 4: RFC 5321 edge cases')
const edgeCases = [
  {
    email: 'a'.repeat(64) + '@example.com',
    shouldPass: true,
    description: 'Max local part (64 chars)',
  },
  {
    email: 'a'.repeat(65) + '@example.com',
    shouldPass: false,
    description: 'Over max local part (65 chars)',
  },
  {
    email: 'user@' + 'a'.repeat(240) + '.com',
    shouldPass: true,
    description: 'Max domain (253 chars)',
  },
  {
    email: 'user@' + 'a'.repeat(250) + '.com',
    shouldPass: false,
    description: 'Over max domain (254 chars)',
  },
  {
    email: 'a'.repeat(50) + '@' + 'a'.repeat(250) + '.com',
    shouldPass: false,
    description: 'Over max total (320 chars)',
  },
]

edgeCases.forEach(({ email, shouldPass, description }) => {
  const start = performance.now()
  try {
    validateEmail(email)
    const duration = performance.now() - start
    if (shouldPass) {
      console.log(`✓ ${description} - Passed in ${duration.toFixed(2)}ms`)
    } else {
      console.log(`✗ ${description} - Should have been rejected`)
    }
  } catch (error) {
    const duration = performance.now() - start
    if (error instanceof ValidationError) {
      if (!shouldPass) {
        console.log(`✓ ${description} - Correctly rejected in ${duration.toFixed(2)}ms`)
      } else {
        console.log(`✗ ${description} - Should have passed: ${error.message}`)
      }
    }
  }
})

console.log('\nAll tests complete!')
