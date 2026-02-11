/**
 * Demo Pre-Warm Script
 *
 * Hits each demo route to pre-cache BigQuery queries.
 * Run 10 minutes before the Krishna Jha demo.
 *
 * Usage: npm run demo:warmup
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'

const DEMO_ROUTES = [
  '/platform-health',
  '/governance/data-dictionary',
  '/governance/data-quality',
  '/lead-flows',
  '/lead-service-engine',
  '/sales',
  '/platform-admin',
]

const API_ENDPOINTS = [
  '/api/bigquery/health',
  '/api/bigquery/health-check',
]

async function warmRoute(route: string): Promise<{ route: string; status: number; time: number }> {
  const start = Date.now()
  try {
    const response = await fetch(`${BASE_URL}${route}`)
    const time = Date.now() - start
    return { route, status: response.status, time }
  } catch (error) {
    const time = Date.now() - start
    return { route, status: 0, time }
  }
}

async function main() {
  console.log('=== Demo Pre-Warm Script ===')
  console.log(`Target: ${BASE_URL}`)
  console.log(`Routes: ${DEMO_ROUTES.length} pages + ${API_ENDPOINTS.length} API endpoints`)
  console.log('')

  // First warm up the API health endpoints
  console.log('--- API Health Warm-up ---')
  for (const endpoint of API_ENDPOINTS) {
    const result = await warmRoute(endpoint)
    const status = result.status === 200 ? 'OK' : `FAIL (${result.status})`
    console.log(`  ${status} ${result.route} (${result.time}ms)`)
  }
  console.log('')

  // Then warm up the demo routes
  console.log('--- Demo Route Warm-up ---')
  const results: { route: string; status: number; time: number }[] = []

  for (const route of DEMO_ROUTES) {
    const result = await warmRoute(route)
    results.push(result)
    const status = result.status === 200 ? 'OK' : `FAIL (${result.status})`
    console.log(`  ${status} ${result.route} (${result.time}ms)`)
  }

  console.log('')
  console.log('--- Summary ---')
  const successful = results.filter(r => r.status === 200)
  const failed = results.filter(r => r.status !== 200)
  const avgTime = successful.length > 0
    ? Math.round(successful.reduce((sum, r) => sum + r.time, 0) / successful.length)
    : 0

  console.log(`  Successful: ${successful.length}/${results.length}`)
  console.log(`  Failed: ${failed.length}/${results.length}`)
  console.log(`  Average response time: ${avgTime}ms`)

  if (failed.length > 0) {
    console.log('')
    console.log('  Failed routes:')
    failed.forEach(r => console.log(`    - ${r.route} (status: ${r.status})`))
  }

  console.log('')
  console.log(successful.length === results.length ? 'All routes warmed successfully!' : 'Some routes failed - check server status')
}

main().catch(console.error)
