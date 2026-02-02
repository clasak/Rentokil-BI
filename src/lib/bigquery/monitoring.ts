/**
 * BigQuery Performance Monitoring
 *
 * Tracks query performance, costs, errors, and usage patterns to:
 * - Identify slow queries (>2s response time)
 * - Monitor data costs (bytes processed per query)
 * - Detect error patterns
 * - Optimize query frequency
 *
 * Metrics tracked:
 * - Response time (ms)
 * - Bytes processed (cost indicator)
 * - Rows returned
 * - Cache hit rate
 * - Error rate
 * - Query frequency by endpoint
 */

export interface QueryMetrics {
  queryName: string
  startTime: number
  endTime: number
  durationMs: number
  bytesProcessed?: number
  rowsReturned: number
  cached: boolean
  error?: string
  userId?: string
  role?: string
  filters?: Record<string, unknown>
}

export interface PerformanceSummary {
  totalQueries: number
  avgResponseTime: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  slowQueries: QueryMetrics[] // >2s
  totalBytesProcessed: number
  estimatedCostUSD: number // $6.25 per TB
  cacheHitRate: number
  errorRate: number
  topQueries: Array<{ query: string; count: number; avgTime: number }>
}

// In-memory storage (for dev/demo - in production, use a time-series DB or logging service)
const queryMetricsStore: QueryMetrics[] = []
const MAX_STORED_METRICS = 1000 // Keep last 1000 queries

/**
 * Record query metrics for monitoring and optimization
 */
export function recordQueryMetrics(metrics: QueryMetrics): void {
  queryMetricsStore.push(metrics)

  // Trim to max size (FIFO)
  if (queryMetricsStore.length > MAX_STORED_METRICS) {
    queryMetricsStore.shift()
  }

  // Log warnings for slow queries or high costs
  if (metrics.durationMs > 2000) {
    console.warn(`[BigQuery] Slow query detected: ${metrics.queryName} (${metrics.durationMs}ms)`)
  }

  if (metrics.bytesProcessed && metrics.bytesProcessed > 100_000_000) {
    // > 100MB
    const costUSD = (metrics.bytesProcessed / 1_000_000_000_000) * 6.25
    console.warn(
      `[BigQuery] High-cost query: ${metrics.queryName} (${(metrics.bytesProcessed / 1_000_000).toFixed(2)}MB, ~$${costUSD.toFixed(4)})`
    )
  }

  if (metrics.error) {
    console.error(`[BigQuery] Query error: ${metrics.queryName}`, metrics.error)
  }
}

/**
 * Start tracking a query (returns end function)
 */
export function startQueryTracking(
  queryName: string,
  userId?: string,
  role?: string,
  filters?: Record<string, unknown>
): (result: { rowsReturned: number; bytesProcessed?: number; cached?: boolean; error?: string }) => void {
  const startTime = Date.now()

  return (result) => {
    const endTime = Date.now()
    recordQueryMetrics({
      queryName,
      startTime,
      endTime,
      durationMs: endTime - startTime,
      bytesProcessed: result.bytesProcessed,
      rowsReturned: result.rowsReturned,
      cached: result.cached || false,
      error: result.error,
      userId,
      role,
      filters,
    })
  }
}

/**
 * Get performance summary for all recorded queries
 */
export function getPerformanceSummary(
  timeWindowMs: number = 3600000 // Last 1 hour by default
): PerformanceSummary {
  const cutoffTime = Date.now() - timeWindowMs
  const recentMetrics = queryMetricsStore.filter((m) => m.startTime >= cutoffTime)

  if (recentMetrics.length === 0) {
    return {
      totalQueries: 0,
      avgResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      slowQueries: [],
      totalBytesProcessed: 0,
      estimatedCostUSD: 0,
      cacheHitRate: 0,
      errorRate: 0,
      topQueries: [],
    }
  }

  // Calculate response time percentiles
  const sortedTimes = recentMetrics.map((m) => m.durationMs).sort((a, b) => a - b)
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)]
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)]
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)]

  // Calculate averages
  const avgResponseTime = sortedTimes.reduce((sum, t) => sum + t, 0) / sortedTimes.length
  const totalBytesProcessed = recentMetrics.reduce((sum, m) => sum + (m.bytesProcessed || 0), 0)
  const estimatedCostUSD = (totalBytesProcessed / 1_000_000_000_000) * 6.25

  // Cache hit rate
  const cachedCount = recentMetrics.filter((m) => m.cached).length
  const cacheHitRate = cachedCount / recentMetrics.length

  // Error rate
  const errorCount = recentMetrics.filter((m) => m.error).length
  const errorRate = errorCount / recentMetrics.length

  // Slow queries (>2s)
  const slowQueries = recentMetrics.filter((m) => m.durationMs > 2000).sort((a, b) => b.durationMs - a.durationMs)

  // Top queries by frequency
  const queryFrequency = new Map<string, { count: number; totalTime: number }>()
  recentMetrics.forEach((m) => {
    const existing = queryFrequency.get(m.queryName) || { count: 0, totalTime: 0 }
    queryFrequency.set(m.queryName, {
      count: existing.count + 1,
      totalTime: existing.totalTime + m.durationMs,
    })
  })

  const topQueries = Array.from(queryFrequency.entries())
    .map(([query, stats]) => ({
      query,
      count: stats.count,
      avgTime: stats.totalTime / stats.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalQueries: recentMetrics.length,
    avgResponseTime: Math.round(avgResponseTime),
    p50ResponseTime: Math.round(p50),
    p95ResponseTime: Math.round(p95),
    p99ResponseTime: Math.round(p99),
    slowQueries: slowQueries.slice(0, 10), // Top 10 slowest
    totalBytesProcessed,
    estimatedCostUSD,
    cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    errorRate: Math.round(errorRate * 100) / 100,
    topQueries,
  }
}

/**
 * Get query metrics for a specific query name
 */
export function getQueryMetrics(queryName: string, limit: number = 50): QueryMetrics[] {
  return queryMetricsStore.filter((m) => m.queryName === queryName).slice(-limit)
}

/**
 * Get all error metrics
 */
export function getErrorMetrics(): QueryMetrics[] {
  return queryMetricsStore.filter((m) => m.error)
}

/**
 * Clear all stored metrics (for testing/reset)
 */
export function clearMetrics(): void {
  queryMetricsStore.length = 0
}

/**
 * Export metrics to JSON (for analysis or backup)
 */
export function exportMetrics(): string {
  return JSON.stringify(queryMetricsStore, null, 2)
}

/**
 * Get real-time stats for monitoring dashboard
 */
export function getRealtimeStats() {
  const last5min = getPerformanceSummary(300000) // Last 5 minutes
  const last1hour = getPerformanceSummary(3600000) // Last 1 hour

  return {
    last5min,
    last1hour,
    health: {
      status: last5min.avgResponseTime < 1000 && last5min.errorRate < 0.05 ? 'healthy' :
              last5min.avgResponseTime < 2000 && last5min.errorRate < 0.1 ? 'degraded' : 'critical',
      avgResponseTime: last5min.avgResponseTime,
      errorRate: last5min.errorRate,
      cacheHitRate: last5min.cacheHitRate,
    },
  }
}
