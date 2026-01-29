/**
 * Test script for error sanitization
 * Verifies that production errors don't leak sensitive information
 */

import {
  sanitizeErrorMessage,
  sanitizeStackTrace,
  sanitizeLogData,
  getErrorCode
} from '../src/lib/bigquery/error-sanitizer'

// Colors for console output
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'
const RESET = '\x1b[0m'

interface TestCase {
  name: string
  error: Error
  expectedCode: string
  shouldNotContainInProduction: string[]
  shouldContainInDevelopment?: string[]
}

const testCases: TestCase[] = [
  {
    name: 'BigQuery Table Not Found',
    error: new Error('Not found: Table `bidata-sharedus-production.S4.Fact_Leads_Acc_Daily_Dtls_Snp`'),
    expectedCode: 'DATA_NOT_FOUND',
    shouldNotContainInProduction: [
      'bidata-sharedus-production',
      'S4',
      'Fact_Leads_Acc_Daily_Dtls_Snp'
    ],
    shouldContainInDevelopment: [
      'bidata-sharedus-production',
      'S4'
    ]
  },
  {
    name: 'Access Denied Error',
    error: new Error('Access Denied: dataset:bidata-sharedus-production:BCG_RTD_DB: Permission bigquery.tables.get denied'),
    expectedCode: 'ACCESS_DENIED',
    shouldNotContainInProduction: [
      'bidata-sharedus-production',
      'BCG_RTD_DB',
      'bigquery.tables.get'
    ]
  },
  {
    name: 'SQL Syntax Error',
    error: new Error('Syntax error: Expected end of input but got keyword SELECT at [15:45]'),
    expectedCode: 'INVALID_QUERY',
    shouldNotContainInProduction: [
      'Syntax error',
      '[15:45]'
    ]
  },
  {
    name: 'Timeout Error',
    error: new Error('Query execution exceeded timeout limit of 30 seconds'),
    expectedCode: 'TIMEOUT',
    shouldNotContainInProduction: []
  },
  {
    name: 'Quota Exceeded',
    error: new Error('Quota exceeded: Your project has exceeded the BigQuery quota'),
    expectedCode: 'QUOTA_EXCEEDED',
    shouldNotContainInProduction: []
  }
]

function testErrorSanitization() {
  console.log(`\n${BLUE}=== Testing Error Sanitization ===${RESET}\n`)

  let passed = 0
  let failed = 0

  testCases.forEach((testCase, index) => {
    console.log(`${YELLOW}Test ${index + 1}:${RESET} ${testCase.name}`)

    // Test production sanitization
    const prodMessage = sanitizeErrorMessage(testCase.error, 'production')
    const errorCode = getErrorCode(testCase.error)

    // Check error code
    if (errorCode === testCase.expectedCode) {
      console.log(`  ${GREEN}✓${RESET} Error code: ${errorCode}`)
      passed++
    } else {
      console.log(`  ${RED}✗${RESET} Error code mismatch. Expected: ${testCase.expectedCode}, Got: ${errorCode}`)
      failed++
    }

    // Check that sensitive info is NOT in production message
    let hasSensitiveInfo = false
    testCase.shouldNotContainInProduction.forEach(sensitiveString => {
      if (prodMessage.includes(sensitiveString)) {
        console.log(`  ${RED}✗${RESET} Production message contains sensitive data: "${sensitiveString}"`)
        hasSensitiveInfo = true
        failed++
      }
    })

    if (!hasSensitiveInfo && testCase.shouldNotContainInProduction.length > 0) {
      console.log(`  ${GREEN}✓${RESET} Production message sanitized (no sensitive data)`)
      passed++
    }

    // Test development mode
    const devMessage = sanitizeErrorMessage(testCase.error, 'development')
    if (testCase.shouldContainInDevelopment) {
      let hasExpectedInfo = true
      testCase.shouldContainInDevelopment.forEach(expectedString => {
        if (!devMessage.includes(expectedString)) {
          console.log(`  ${RED}✗${RESET} Development message missing expected data: "${expectedString}"`)
          hasExpectedInfo = false
          failed++
        }
      })
      if (hasExpectedInfo) {
        console.log(`  ${GREEN}✓${RESET} Development message contains full details`)
        passed++
      }
    }

    console.log(`  Production: ${prodMessage}`)
    console.log(`  Development: ${devMessage}`)
    console.log('')
  })

  return { passed, failed }
}

function testStackTraceSanitization() {
  console.log(`\n${BLUE}=== Testing Stack Trace Sanitization ===${RESET}\n`)

  const error = new Error('Test error')
  const stack = error.stack

  let passed = 0
  let failed = 0

  // Production should remove stack trace
  const prodStack = sanitizeStackTrace(stack, 'production')
  if (prodStack === undefined) {
    console.log(`${GREEN}✓${RESET} Stack trace removed in production`)
    passed++
  } else {
    console.log(`${RED}✗${RESET} Stack trace leaked in production`)
    failed++
  }

  // Development should keep stack trace
  const devStack = sanitizeStackTrace(stack, 'development')
  if (devStack === stack) {
    console.log(`${GREEN}✓${RESET} Stack trace preserved in development`)
    passed++
  } else {
    console.log(`${RED}✗${RESET} Stack trace missing in development`)
    failed++
  }

  return { passed, failed }
}

function testPIISanitization() {
  console.log(`\n${BLUE}=== Testing PII Sanitization ===${RESET}\n`)

  const testData = {
    market: 'NE',
    region: 'New England',
    branch: '001',
    salesPerson: 'John Doe',
    email: 'john.doe@example.com',
    customerName: 'Acme Corp',
    employeeName: 'Jane Smith',
    nested: {
      token: 'secret-api-key',
      normalData: 'safe-value'
    }
  }

  const sanitized = sanitizeLogData(testData) as Record<string, unknown>

  let passed = 0
  let failed = 0

  // Check that PII is redacted
  const piiFields = ['salesPerson', 'email', 'customerName', 'employeeName']
  piiFields.forEach(field => {
    if (sanitized[field] === '[REDACTED]') {
      console.log(`${GREEN}✓${RESET} ${field} redacted`)
      passed++
    } else {
      console.log(`${RED}✗${RESET} ${field} NOT redacted: ${sanitized[field]}`)
      failed++
    }
  })

  // Check that safe data is preserved
  if (sanitized.market === 'NE') {
    console.log(`${GREEN}✓${RESET} Safe field 'market' preserved`)
    passed++
  } else {
    console.log(`${RED}✗${RESET} Safe field 'market' incorrectly modified`)
    failed++
  }

  // Check nested sanitization
  const nested = sanitized.nested as Record<string, unknown>
  if (nested && nested.token === '[REDACTED]') {
    console.log(`${GREEN}✓${RESET} Nested PII field 'token' redacted`)
    passed++
  } else {
    console.log(`${RED}✗${RESET} Nested PII field 'token' NOT redacted`)
    failed++
  }

  if (nested && nested.normalData === 'safe-value') {
    console.log(`${GREEN}✓${RESET} Nested safe field 'normalData' preserved`)
    passed++
  } else {
    console.log(`${RED}✗${RESET} Nested safe field incorrectly modified`)
    failed++
  }

  console.log('\nSanitized output:')
  console.log(JSON.stringify(sanitized, null, 2))

  return { passed, failed }
}

// Run all tests
function runAllTests() {
  console.log(`${BLUE}╔════════════════════════════════════════════╗${RESET}`)
  console.log(`${BLUE}║  Error Sanitization Test Suite           ║${RESET}`)
  console.log(`${BLUE}╚════════════════════════════════════════════╝${RESET}`)

  const errorResults = testErrorSanitization()
  const stackResults = testStackTraceSanitization()
  const piiResults = testPIISanitization()

  const totalPassed = errorResults.passed + stackResults.passed + piiResults.passed
  const totalFailed = errorResults.failed + stackResults.failed + piiResults.failed
  const total = totalPassed + totalFailed

  console.log(`\n${BLUE}=== Test Summary ===${RESET}`)
  console.log(`Total Tests: ${total}`)
  console.log(`${GREEN}Passed: ${totalPassed}${RESET}`)
  console.log(`${RED}Failed: ${totalFailed}${RESET}`)

  if (totalFailed === 0) {
    console.log(`\n${GREEN}✓ All tests passed!${RESET}`)
    console.log(`${GREEN}Error sanitization is working correctly.${RESET}\n`)
    process.exit(0)
  } else {
    console.log(`\n${RED}✗ Some tests failed!${RESET}`)
    console.log(`${RED}Please fix the failing tests before deploying.${RESET}\n`)
    process.exit(1)
  }
}

runAllTests()
