/**
 * Phase 1 QA - API Integration Tests
 *
 * Tests:
 * - Validation rejection at API level
 * - SQL injection protection
 * - Error response formats
 * - Query execution with valid filters
 *
 * Prerequisites: Dev server must be running (npm run dev)
 * Usage: npx tsx scripts/qa-phase1-api-tests.ts
 */

const API_BASE = 'http://localhost:3000'

interface TestResult {
  testName: string
  category: string
  status: 'PASS' | 'FAIL' | 'ERROR'
  expected: string
  actual: string
  errorMessage?: string
  duration: number
}

const results: TestResult[] = []

async function runAPITest(
  category: string,
  testName: string,
  testFn: () => Promise<void>,
  expectedOutcome: string
): Promise<void> {
  const startTime = Date.now()
  try {
    await testFn()
    results.push({
      testName,
      category,
      status: 'PASS',
      expected: expectedOutcome,
      actual: expectedOutcome,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    results.push({
      testName,
      category,
      status: 'FAIL',
      expected: expectedOutcome,
      actual: error instanceof Error ? error.message : String(error),
      errorMessage: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    })
  }
}

async function expectAPIError(
  query: string,
  filters: Record<string, unknown>,
  expectedStatus: number,
  expectedErrorSubstring: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/bigquery/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, filters }),
  })

  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`)
  }

  const data = await response.json()

  if (data.success !== false) {
    throw new Error('Expected success: false in response')
  }

  if (!data.error || !data.error.includes(expectedErrorSubstring)) {
    throw new Error(`Expected error containing "${expectedErrorSubstring}", got "${data.error}"`)
  }
}

async function expectAPISuccess(
  query: string,
  filters: Record<string, unknown>
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/bigquery/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, filters }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(`API request failed: ${data.error || response.statusText}`)
  }

  const data = await response.json()

  if (data.success !== true) {
    throw new Error(`Expected success: true, got ${data.success}`)
  }

  if (!data.metadata || !data.metadata.source) {
    throw new Error('Expected metadata with source')
  }
}

async function runTests(): Promise<void> {
  console.log('Starting API Integration Tests...\n')

  // =============================================================================
  // Test Suite 1: Query Registry
  // =============================================================================

  console.log('Running Test Suite 1: Query Registry...\n')

  await runAPITest('QueryRegistry', 'GET /api/bigquery/query - list queries', async () => {
    const response = await fetch(`${API_BASE}/api/bigquery/query`, { method: 'GET' })
    if (!response.ok) throw new Error('GET request failed')
    const data = await response.json()
    if (!data.availableQueries || data.availableQueries.length < 50) {
      throw new Error('Expected at least 50 registered queries')
    }
    if (data.totalQueries !== data.availableQueries.length) {
      throw new Error('totalQueries mismatch')
    }
  }, 'Returns query registry')

  await runAPITest('QueryRegistry', 'Invalid query name', async () => {
    await expectAPIError('non-existent-query', {}, 400, 'Unknown query')
  }, 'Returns 400 with error')

  await runAPITest('QueryRegistry', 'Missing query parameter', async () => {
    const response = await fetch(`${API_BASE}/api/bigquery/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters: {} }),
    })
    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`)
    }
  }, 'Returns 400')

  // =============================================================================
  // Test Suite 2: Validation Errors
  // =============================================================================

  console.log('\nRunning Test Suite 2: Validation Errors...\n')

  await runAPITest('Validation', 'Invalid market code', async () => {
    await expectAPIError('leads-by-pest-type', { market: 'INVALID123' }, 400, 'Invalid market code')
  }, 'Rejects invalid market')

  await runAPITest('Validation', 'SQL injection in market', async () => {
    await expectAPIError('leads-by-pest-type', { market: "'; DROP TABLE --" }, 400, 'Invalid market code')
  }, 'Blocks SQL injection')

  await runAPITest('Validation', 'Invalid daysBack (negative)', async () => {
    await expectAPIError('leads-by-pest-type', { daysBack: -50 }, 400, 'Must be integer between')
  }, 'Rejects negative daysBack')

  await runAPITest('Validation', 'Invalid daysBack (too large)', async () => {
    await expectAPIError('leads-by-pest-type', { daysBack: 500 }, 400, 'Must be integer between')
  }, 'Rejects daysBack > 365')

  await runAPITest('Validation', 'SQL injection in salesPerson', async () => {
    await expectAPIError('ae-tracker', { salesPerson: "'; DROP TABLE contracts; --" }, 400, 'disallowed characters')
  }, 'Blocks SQL injection')

  await runAPITest('Validation', 'XSS attempt in salesPerson', async () => {
    await expectAPIError('ae-tracker', { salesPerson: '<script>alert(1)</script>' }, 400, 'disallowed characters')
  }, 'Blocks XSS')

  await runAPITest('Validation', 'Invalid date format', async () => {
    await expectAPIError('sales-today', { startDate: '24-01-15' }, 400, 'Expected YYYY-MM-DD')
  }, 'Rejects wrong date format')

  await runAPITest('Validation', 'Invalid date value', async () => {
    await expectAPIError('sales-today', { startDate: '2024-02-30' }, 400, 'day must be')
  }, 'Rejects invalid date')

  // =============================================================================
  // Test Suite 3: Valid Queries
  // =============================================================================

  console.log('\nRunning Test Suite 3: Valid Queries...\n')

  await runAPITest('ValidQuery', 'Leads by pest type (no filters)', async () => {
    await expectAPISuccess('leads-by-pest-type', {})
  }, 'Returns success')

  await runAPITest('ValidQuery', 'Leads by pest type (with daysBack)', async () => {
    await expectAPISuccess('leads-by-pest-type', { daysBack: 30 })
  }, 'Returns success')

  await runAPITest('ValidQuery', 'AE tracker with valid filters', async () => {
    await expectAPISuccess('ae-tracker', { daysBack: 30, limit: 50 })
  }, 'Returns success')

  await runAPITest('ValidQuery', 'Organization markets', async () => {
    await expectAPISuccess('organization-markets', {})
  }, 'Returns success')

  await runAPITest('ValidQuery', 'Data freshness', async () => {
    await expectAPISuccess('data-freshness', {})
  }, 'Returns success')

  // =============================================================================
  // Test Suite 4: Error Response Format
  // =============================================================================

  console.log('\nRunning Test Suite 4: Error Response Format...\n')

  await runAPITest('ErrorFormat', 'Validation error includes errorType', async () => {
    const response = await fetch(`${API_BASE}/api/bigquery/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'leads-by-pest-type', filters: { market: 'INVALID' } }),
    })
    const data = await response.json()
    if (data.errorType !== 'validation') {
      throw new Error(`Expected errorType: validation, got ${data.errorType}`)
    }
    if (!data.timestamp) {
      throw new Error('Missing timestamp')
    }
  }, 'Has correct error structure')

  await runAPITest('ErrorFormat', 'Unknown query includes availableQueries', async () => {
    const response = await fetch(`${API_BASE}/api/bigquery/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'invalid-query-name', filters: {} }),
    })
    const data = await response.json()
    if (!data.availableQueries || data.availableQueries.length === 0) {
      throw new Error('Expected availableQueries in error response')
    }
  }, 'Includes query suggestions')

  // =============================================================================
  // Test Suite 5: Performance
  // =============================================================================

  console.log('\nRunning Test Suite 5: Performance...\n')

  await runAPITest('Performance', 'Query response includes timing', async () => {
    const response = await fetch(`${API_BASE}/api/bigquery/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'organization-markets', filters: {} }),
    })
    const data = await response.json()
    if (!data.metadata || typeof data.metadata.responseTime !== 'number') {
      throw new Error('Missing responseTime in metadata')
    }
    if (data.metadata.responseTime > 10000) {
      throw new Error(`Query too slow: ${data.metadata.responseTime}ms`)
    }
  }, 'Returns timing metadata')

  // =============================================================================
  // Generate Report
  // =============================================================================

  console.log('\n' + '='.repeat(80))
  console.log('PHASE 1 API INTEGRATION TEST REPORT')
  console.log('='.repeat(80) + '\n')

  const totalTests = results.length
  const passedTests = results.filter(r => r.status === 'PASS').length
  const failedTests = results.filter(r => r.status === 'FAIL').length
  const errorTests = results.filter(r => r.status === 'ERROR').length
  const passRate = ((passedTests / totalTests) * 100).toFixed(1)

  console.log('TEST SUMMARY')
  console.log('-'.repeat(80))
  console.log(`Total Tests:       ${totalTests}`)
  console.log(`Passed:            ${passedTests} (${passRate}%)`)
  console.log(`Failed:            ${failedTests}`)
  console.log(`Errors:            ${errorTests}`)
  console.log(`Pass Rate:         ${passRate}%`)
  console.log()

  // Category breakdown
  const categories = [...new Set(results.map(r => r.category))]
  console.log('CATEGORY BREAKDOWN')
  console.log('-'.repeat(80))
  categories.forEach(category => {
    const categoryTests = results.filter(r => r.category === category)
    const categoryPassed = categoryTests.filter(r => r.status === 'PASS').length
    const categoryTotal = categoryTests.length
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(0)
    console.log(`${category.padEnd(20)} ${categoryPassed}/${categoryTotal} (${categoryRate}%)`)
  })
  console.log()

  // Failed tests detail
  if (failedTests > 0 || errorTests > 0) {
    console.log('FAILED TESTS')
    console.log('-'.repeat(80))
    results.filter(r => r.status !== 'PASS').forEach(result => {
      console.log(`\n[${result.status}] ${result.category} - ${result.testName}`)
      console.log(`  Expected: ${result.expected}`)
      console.log(`  Actual:   ${result.actual}`)
      if (result.errorMessage) {
        console.log(`  Error:    ${result.errorMessage}`)
      }
      console.log(`  Duration: ${result.duration}ms`)
    })
    console.log()
  }

  // Performance stats
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
  const maxDuration = Math.max(...results.map(r => r.duration))
  console.log('PERFORMANCE')
  console.log('-'.repeat(80))
  console.log(`Average response:  ${avgDuration.toFixed(0)}ms`)
  console.log(`Slowest test:      ${maxDuration.toFixed(0)}ms`)
  console.log()

  // Success criteria
  console.log('SUCCESS CRITERIA')
  console.log('-'.repeat(80))
  const criteria = [
    { name: 'All API tests pass', passed: passRate === '100.0', required: true },
    { name: 'Validation errors return 400', passed: failedTests === 0, required: true },
    { name: 'SQL injection blocked', passed: failedTests === 0, required: true },
    { name: 'Error responses include errorType', passed: failedTests === 0, required: true },
    { name: 'Average response < 3000ms', passed: avgDuration < 3000, required: false },
  ]

  criteria.forEach(c => {
    const status = c.passed ? 'PASS' : c.required ? 'FAIL' : 'WARN'
    const symbol = c.passed ? '✓' : c.required ? '✗' : '⚠'
    console.log(`${symbol} ${status.padEnd(6)} ${c.name}`)
  })
  console.log()

  const allCriteriaPassed = criteria.filter(c => c.required).every(c => c.passed)
  if (allCriteriaPassed) {
    console.log('✓ API INTEGRATION TESTS: PASSED')
    process.exit(0)
  } else {
    console.log('✗ API INTEGRATION TESTS: FAILED')
    process.exit(1)
  }
}

// Wait for server to be ready
setTimeout(() => {
  runTests().catch(error => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })
}, 3000) // Give server 3 seconds to start
